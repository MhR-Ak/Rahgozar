import { ProxyProfile, DiagnosisResult, AppSettings, ActiveConnection } from '../../types';
import { DatabaseManager } from '../storage/database';
import { SingBoxManager } from '../engines/singbox-manager';
import { CanaryVerifier } from './canary';
import { WindowsProxyManager } from '../proxy/windows-proxy';
import { EventBus } from '../events/event-bus';

/**
 * Adaptive Transport Selector (ATS)
 * Intelligently filters, ranks, connects, verifies, and failovers proxy routes
 * based on live network diagnosis severity and active canary probes.
 */
export class AdaptiveTransportSelector {
  private static instance: AdaptiveTransportSelector | null = null;
  private db: DatabaseManager;
  private engine: SingBoxManager;
  private proxyManager: WindowsProxyManager;
  private eventBus: EventBus;

  private activeProfile: ProxyProfile | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private consecutiveFailures = 0;
  private lastRouteSwitchTime = 0;
  private isConnecting = false;

  private currentConnectionState: ActiveConnection = {
    state: 'disconnected',
    activeProfileId: null,
    activeProfileName: null,
    protocol: null,
    connectedAt: null,
    durationSeconds: 0,
    uploadSpeedBps: 0,
    downloadSpeedBps: 0,
    totalUploadBytes: 0,
    totalDownloadBytes: 0,
    currentPingMs: null,
    packetLoss: 0,
    mode: 'system-proxy',
    statusMessage: 'آماده برای اتصال',
  };

  private constructor() {
    this.db = DatabaseManager.getInstance();
    this.engine = SingBoxManager.getInstance();
    this.proxyManager = WindowsProxyManager.getInstance();
    this.eventBus = EventBus.getInstance();
  }

  public static getInstance(): AdaptiveTransportSelector {
    if (!AdaptiveTransportSelector.instance) {
      AdaptiveTransportSelector.instance = new AdaptiveTransportSelector();
    }
    return AdaptiveTransportSelector.instance;
  }

  public getConnectionState(): ActiveConnection {
    return { ...this.currentConnectionState };
  }

  /**
   * Filters and scores available profiles against diagnostic severity
   */
  public rankCandidates(profiles: ProxyProfile[], diagnosis?: DiagnosisResult): ProxyProfile[] {
    const severity = diagnosis?.severity ?? 0;

    const filtered = profiles.filter((p) => {
      // If National Intranet: Only Tor snowflake/webtunnel or internal relays
      if (severity === 5) {
        return p.protocol === 'tor' || p.category === 'no-vps';
      }

      // If UDP is heavily blocked, eliminate pure UDP protocols
      if (severity === 4 && (p.protocol === 'tuic' || p.protocol === 'wireguard')) {
        return false;
      }

      // Deprioritize consistently failed profiles (> 5 consecutive failures)
      if (p.failureCount >= 5) {
        return false;
      }

      return true;
    });

    // Score candidates
    return filtered.sort((a, b) => {
      const scoreA = this.calculateProfileScore(a, severity);
      const scoreB = this.calculateProfileScore(b, severity);
      return scoreB - scoreA;
    });
  }

  private calculateProfileScore(profile: ProxyProfile, severity: number): number {
    let score = (profile.successRate || 100) * 1.5;

    // Ping penalty
    if (profile.pingMs && profile.pingMs > 0) {
      score -= profile.pingMs * 0.1;
    } else {
      score -= 50; // Unknown ping penalty
    }

    // Failure penalty
    score -= (profile.failureCount || 0) * 20;

    // Protocol bonus based on resistance to current severity
    if (severity >= 2) {
      if (profile.protocol === 'vless' && profile.security === 'reality') score += 40;
      if (profile.protocol === 'hysteria2') score += 25;
      if (profile.protocol === 'trojan') score += 20;
      if (profile.protocol === 'tor') score += 15;
    }

    return score;
  }

  /**
   * Main intelligent connect workflow
   */
  public async smartConnect(preferredProfileId?: string, diagnosis?: DiagnosisResult): Promise<boolean> {
    if (this.isConnecting) return false;
    this.isConnecting = true;

    const settings = this.db.getSettings();
    let candidates = this.db.getAllProfiles();

    if (candidates.length === 0) {
      this.updateState('failed', 'هیچ سرور یا کانفیگی برای اتصال تعریف نشده است.');
      this.isConnecting = false;
      return false;
    }

    // Sort or pick preferred
    if (preferredProfileId) {
      const pref = candidates.find((c) => c.id === preferredProfileId);
      if (pref) {
        candidates = [pref, ...candidates.filter((c) => c.id !== preferredProfileId)];
      }
    } else {
      candidates = this.rankCandidates(candidates, diagnosis);
    }

    this.updateState('selecting_route', `انتخاب بهترین مسیر از میان ${candidates.length} سرور در دسترس...`);

    // Limit attempts to top 3 candidates to avoid endless lag
    const maxTries = Math.min(3, candidates.length);

    for (let i = 0; i < maxTries; i++) {
      const candidate = candidates[i];
      this.updateState('connecting', `در حال برقراری ارتباط با «${candidate.name}» (${candidate.protocol.toUpperCase()})...`);

      this.eventBus.emitEvent({
        level: 'info',
        category: 'routing',
        title: `تلاش برای اتصال به سرور [${i + 1}/${maxTries}]`,
        explanationSimple: `در حال تست ارتباط با «${candidate.name}»...`,
        explanationDetailed: `پروتکل: ${candidate.protocol} | آدرس: ${candidate.server}:${candidate.port}`,
        explanationExpert: `Initiating connection attempt to candidate ID: ${candidate.id}`,
      });

      // 1. Start core engine
      const started = await this.engine.start(candidate, settings);
      if (!started) {
        this.db.updateProfileStats(candidate.id, -1, false);
        continue;
      }

      // 2. Real end-to-end data transmission verification
      this.updateState('verifying', 'در حال راستی‌آزمایی تبادل واقعی داده با اینترنت آزاد...');
      const canaryResult = await CanaryVerifier.verifyThroughProxy(settings.httpProxyPort, 4500);

      if (canaryResult.success) {
        // Success verified!
        this.activeProfile = candidate;
        this.consecutiveFailures = 0;
        this.lastRouteSwitchTime = Date.now();
        this.db.updateProfileStats(candidate.id, canaryResult.latencyMs, true);

        // Enable Windows Proxy or TUN
        if (settings.routingMode === 'system-proxy') {
          await this.proxyManager.enableSystemProxy(settings.httpProxyPort);
        }

        this.currentConnectionState = {
          state: 'connected',
          activeProfileId: candidate.id,
          activeProfileName: candidate.name,
          protocol: candidate.protocol,
          connectedAt: Date.now(),
          durationSeconds: 0,
          uploadSpeedBps: 0,
          downloadSpeedBps: 0,
          totalUploadBytes: 0,
          totalDownloadBytes: 0,
          currentPingMs: canaryResult.latencyMs,
          packetLoss: 0,
          mode: settings.routingMode,
          statusMessage: 'اتصال پایدار و امن برقرار است',
        };

        this.startHealthMonitor(settings.healthCheckIntervalSeconds);

        this.eventBus.emitEvent({
          level: 'success',
          category: 'routing',
          title: 'اتصال به اینترنت آزاد با موفقیت برقرار شد',
          explanationSimple: `ارتباط شما از طریق «${candidate.name}» برقرار و تست انتقال داده با پینگ ${canaryResult.latencyMs}ms تایید شد.`,
          explanationDetailed: `پروتکل ${candidate.protocol.toUpperCase()} روی پورت ${candidate.port} پاسخ داد. درخواست‌های خروجی ویندوز فعال شدند.`,
          explanationExpert: `Canary verified: status 204 returned in ${canaryResult.latencyMs}ms via target ${canaryResult.endpointUsed}`,
          actionTaken: 'فعال‌سازی مسیریابی ترافیک سیستم',
        });

        this.isConnecting = false;
        return true;
      } else {
        // Canary failed
        this.db.updateProfileStats(candidate.id, -1, false);
        await this.engine.stop();

        this.eventBus.emitEvent({
          level: 'warning',
          category: 'routing',
          title: `عدم پاسخ سرور «${candidate.name}»`,
          explanationSimple: 'سرور انتخابی پاسخ نداد یا بسته‌های داده بلاک شدند.',
          explanationDetailed: `علت خطا: ${canaryResult.error || 'Timeout'}`,
          explanationExpert: `Canary check failed for candidate ${candidate.id}: ${canaryResult.error}`,
          actionTaken: 'تلاش خودکار برای اتصال به سرور اولویت بعدی',
        });
      }
    }

    // All top candidates failed
    this.updateState('failed', 'هیچ‌یک از مسیرهای انتخابی در دسترس نبودند.');
    this.isConnecting = false;
    return false;
  }

  /**
   * Health monitor running in background
   */
  private startHealthMonitor(intervalSeconds = 20): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      if (this.currentConnectionState.state !== 'connected' || !this.activeProfile) {
        return;
      }

      // Increment duration
      if (this.currentConnectionState.connectedAt) {
        this.currentConnectionState.durationSeconds = Math.floor(
          (Date.now() - this.currentConnectionState.connectedAt) / 1000
        );
      }

      const settings = this.db.getSettings();
      const canary = await CanaryVerifier.verifyThroughProxy(settings.httpProxyPort, 3500);

      if (canary.success) {
        this.consecutiveFailures = 0;
        this.currentConnectionState.currentPingMs = canary.latencyMs;
        this.currentConnectionState.packetLoss = 0;
      } else {
        this.consecutiveFailures++;
        this.currentConnectionState.packetLoss = Math.min(100, this.consecutiveFailures * 33);

        this.eventBus.emitEvent({
          level: 'warning',
          category: 'routing',
          title: `افت پایداری اتصال (${this.consecutiveFailures}/3)`,
          explanationSimple: 'پاسخی از اینترنت دریافت نشد؛ در حال پایش وضعیت ارتباط...',
          explanationDetailed: `بررسی دوره‌ای سلامت مسیر با خطا مواجه شد: ${canary.error}`,
          explanationExpert: `Active health check failed. Consecutive failures: ${this.consecutiveFailures}`,
        });

        // Trigger auto failover after 3 consecutive failures (Anti-flapping protected)
        if (this.consecutiveFailures >= 3) {
          const now = Date.now();
          if (now - this.lastRouteSwitchTime > 45000) {
            this.triggerAutoFailover();
          }
        }
      }
    }, intervalSeconds * 1000);
  }

  /**
   * Controlled failover to the next healthy route
   */
  public async triggerAutoFailover(): Promise<void> {
    this.eventBus.emitEvent({
      level: 'warning',
      category: 'routing',
      title: 'آغاز تعویض خودکار مسیر (Failover)',
      explanationSimple: 'به دلیل قطع یا اختلال مکرر سرور فعلی، رهگذر در حال انتخاب خودکار سرور بعدی است.',
      explanationDetailed: 'تعداد ۳ خطای متوالی در مانیتورینگ سلامت مسیر ثبت شد. موتور انتخاب تطبیقی در حال سوئیچ است.',
      explanationExpert: 'Threshold exceeded. Invoking auto-failover without user intervention.',
      actionTaken: 'توقف سرور معیوب و جستجوی کاندیدای جایگزین',
    });

    await this.disconnect(false);
    await this.smartConnect();
  }

  /**
   * Disconnects active connection and restores system proxy
   */
  public async disconnect(userInitiated = true): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Save history
    if (this.activeProfile && this.currentConnectionState.connectedAt) {
      this.db.addHistory({
        id: crypto.randomUUID(),
        profileId: this.activeProfile.id,
        profileName: this.activeProfile.name,
        protocol: this.activeProfile.protocol,
        connectedAt: this.currentConnectionState.connectedAt,
        disconnectedAt: Date.now(),
        durationSeconds: this.currentConnectionState.durationSeconds,
        bytesUploaded: this.currentConnectionState.totalUploadBytes,
        bytesDownloaded: this.currentConnectionState.totalDownloadBytes,
        avgPingMs: this.currentConnectionState.currentPingMs || 0,
        disconnectReason: userInitiated ? 'درخواست کاربر' : 'تعویض خودکار مسیر به دلیل اختلال',
      });
    }

    await this.engine.stop();
    await this.proxyManager.restoreOriginalProxy();

    this.activeProfile = null;
    this.updateState('disconnected', 'اتصال قطع است');
  }

  private updateState(state: ActiveConnection['state'], message: string): void {
    this.currentConnectionState.state = state;
    this.currentConnectionState.statusMessage = message;
    this.eventBus.emit('connection-state-changed', this.getConnectionState());
  }
}
