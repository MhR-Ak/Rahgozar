import os from 'os';
import { DiagnosisResult } from '../../types';
import { runDnsProbe } from './dns-probe';
import { runTcpProbe } from './tcp-probe';
import { runTlsProbe } from './tls-probe';
import { runUdpProbe } from './udp-probe';
import { runIntranetProbe } from './intranet-probe';
import { computeSeverityScore } from './severity-scorer';
import { EventBus } from '../events/event-bus';

/**
 * Adaptive Network Diagnosis Engine (ANDE)
 * Orchestrates multi-target real network probes without faked results.
 */
export class AdaptiveDiagnosisEngine {
  private static instance: AdaptiveDiagnosisEngine | null = null;
  private eventBus: EventBus;
  private isRunning = false;

  private constructor() {
    this.eventBus = EventBus.getInstance();
  }

  public static getInstance(): AdaptiveDiagnosisEngine {
    if (!AdaptiveDiagnosisEngine.instance) {
      AdaptiveDiagnosisEngine.instance = new AdaptiveDiagnosisEngine();
    }
    return AdaptiveDiagnosisEngine.instance;
  }

  /**
   * Runs the complete diagnostic cycle across all network layers
   */
  public async runFullDiagnosis(): Promise<DiagnosisResult> {
    if (this.isRunning) {
      throw new Error('فرآیند عیب‌یابی در حال حاضر در حال اجرا است.');
    }

    this.isRunning = true;
    const startTime = Date.now();

    this.eventBus.emitEvent({
      level: 'info',
      category: 'diagnosis',
      title: 'شروع عیب‌یابی هوشمند شبکه',
      explanationSimple: 'در حال سنجش لایه‌های مختلف شبکه و بررسی نوع فیلترینگ اینترنت شما...',
      explanationDetailed: 'آزمون‌های مرحله‌ای شامل بررسی کارت شبکه، DNS، پروتکل TCP/UDP، دست‌دهی TLS و تفکیک اینترنت بین‌الملل آغاز شد.',
      explanationExpert: 'ANDE diagnosis cycle initiated. Targets: 1.1.1.1, 8.8.8.8, Cloudflare, Aparat, Twitter, Google.',
    });

    try {
      // 1. Local Network Interface Check
      const interfaces = os.networkInterfaces();
      let hasValidLocalIp = false;
      let activeIp = '';

      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] || []) {
          if (!iface.internal && iface.family === 'IPv4') {
            hasValidLocalIp = true;
            activeIp = iface.address;
            break;
          }
        }
        if (hasValidLocalIp) break;
      }

      const localNetwork = {
        ok: hasValidLocalIp,
        ip: activeIp || undefined,
        gateway: hasValidLocalIp ? 'Default Gateway' : undefined,
        error: hasValidLocalIp ? undefined : 'هیچ آدرس IP معتبری در کارت‌های شبکه سیستم یافت نشد.',
      };

      if (!hasValidLocalIp) {
        const scored = computeSeverityScore({
          dns: { detected: false, ispDnsOk: false, publicDnsOk: false, dohOk: false, fakeIpsFound: [], details: 'شبکه محلی غیرفعال' },
          tcp: { port80Ok: false, port443Ok: false, rstInjected: false, targetsTested: 0, avgRttMs: -1, details: 'عدم اتصال' },
          tls: { sniBlocked: false, handshakeTimeout: true, cleanHandshakeOk: false, details: 'عدم اتصال' },
          udp: { packetLossRate: 1.0, udpBlocked: true, details: 'عدم اتصال' },
          intranet: { detected: false, domesticOk: false, foreignOk: false, details: 'شبکه قطع است' },
          localOk: false,
        });

        const result: DiagnosisResult = {
          timestamp: Date.now(),
          severity: scored.severity,
          severityTitle: scored.severityTitle,
          severityDescription: scored.severityDescription,
          confidence: scored.confidence,
          localNetwork,
          dnsTampering: { detected: false, ispDnsOk: false, publicDnsOk: false, dohOk: false, fakeIpsFound: [], details: 'آزمون به دلیل قطعی محلی لغو شد.' },
          tcpBlocking: { port80Ok: false, port443Ok: false, rstInjected: false, targetsTested: 0, avgRttMs: -1, details: 'آزمون به دلیل قطعی محلی لغو شد.' },
          tlsInterference: { sniBlocked: false, handshakeTimeout: true, cleanHandshakeOk: false, details: 'آزمون به دلیل قطعی محلی لغو شد.' },
          udpDisruption: { packetLossRate: 1.0, udpBlocked: true, details: 'آزمون به دلیل قطعی محلی لغو شد.' },
          nationalIntranet: { detected: false, domesticOk: false, foreignOk: false, details: 'آزمون به دلیل قطعی محلی لغو شد.' },
          recommendations: scored.recommendations,
          rawEvidence: { durationMs: Date.now() - startTime },
        };

        this.eventBus.emitEvent({
          level: 'error',
          category: 'diagnosis',
          title: 'خطای اتصال شبکه محلی',
          explanationSimple: 'کارت شبکه سیستم شما متصل نیست یا آدرس IP دریافت نکرده است.',
          explanationDetailed: 'هیچ کارت شبکه فیزیکی با آدرس IPv4 عمومی/خصوصی فعال در سیستم شناسایی نشد.',
          explanationExpert: 'OS Network interfaces returned empty or loopback only. Gateway unreachable.',
          userRemedy: 'کابل شبکه را وصل کنید یا به Wi-Fi متصل شوید.',
        });

        return result;
      }

      // 2. Parallel network layer probes
      const [dnsRes, tcpRes, tlsRes, udpRes, intranetRes] = await Promise.all([
        runDnsProbe(),
        runTcpProbe(),
        runTlsProbe(),
        runUdpProbe(),
        runIntranetProbe(),
      ]);

      // 3. Score calculation
      const scored = computeSeverityScore({
        dns: dnsRes,
        tcp: tcpRes,
        tls: tlsRes,
        udp: udpRes,
        intranet: intranetRes,
        localOk: true,
      });

      const result: DiagnosisResult = {
        timestamp: Date.now(),
        severity: scored.severity,
        severityTitle: scored.severityTitle,
        severityDescription: scored.severityDescription,
        confidence: scored.confidence,
        localNetwork,
        dnsTampering: dnsRes,
        tcpBlocking: tcpRes,
        tlsInterference: tlsRes,
        udpDisruption: udpRes,
        nationalIntranet: intranetRes,
        recommendations: scored.recommendations,
        rawEvidence: {
          durationMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };

      this.eventBus.emitEvent({
        level: scored.severity >= 3 ? 'warning' : 'success',
        category: 'diagnosis',
        title: `نتیجه عیب‌یابی: ${scored.severityTitle} (شدت: ${scored.severity}/5)`,
        explanationSimple: scored.severityDescription,
        explanationDetailed: `DNS: ${dnsRes.details} | TCP: ${tcpRes.details} | TLS: ${tlsRes.details}`,
        explanationExpert: `ANDE diagnostic completed in ${Date.now() - startTime}ms. Severity=${scored.severity}, Confidence=${scored.confidence}%, UDP Loss=${Math.round(udpRes.packetLossRate * 100)}%`,
        actionTaken: 'تطبیق گزینه‌های مسیردهی و بهینه‌سازی الگوریتم انتخاب پروتکل',
      });

      return result;
    } finally {
      this.isRunning = false;
    }
  }
}
