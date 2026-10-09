import { useState, useEffect, useCallback } from 'react';
import {
  ActiveConnection,
  ProxyProfile,
  DiagnosisResult,
  AppSettings,
  LiveEvent,
  ExperimentalTransportStats,
} from '../types';

// Declare global window interface
declare global {
  interface Window {
    rahgozarApi?: any;
  }
}

// Fallback mock API for browser dev mode
const mockApi = {
  getConnectionState: async (): Promise<ActiveConnection> => ({
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
  }),
  getProfiles: async (): Promise<ProxyProfile[]> => [
    {
      id: 'builtin-direct-gateway',
      name: 'مسیر مستقیم سرور / اینترنت آزاد (Direct Gateway)',
      protocol: 'direct',
      category: 'vps',
      server: '127.0.0.1',
      port: 0,
      isBuiltin: true,
      failureCount: 0,
      successRate: 100,
      createdAt: Date.now(),
    },
    {
      id: 'demo-1',
      name: 'پل تور Snowflake (بدون VPS - سراسری)',
      protocol: 'tor',
      category: 'no-vps',
      server: '127.0.0.1',
      port: 9050,
      torBridgeType: 'snowflake',
      isBuiltin: true,
      failureCount: 0,
      successRate: 98,
      createdAt: Date.now() - 1000,
    },
    {
      id: 'demo-2',
      name: 'سرور اختصاصی VLESS Reality (آلمان)',
      protocol: 'vless',
      category: 'vps',
      server: 'fra.node.example.org',
      port: 443,
      security: 'reality',
      sni: 'www.microsoft.com',
      isBuiltin: true,
      failureCount: 0,
      successRate: 95,
      createdAt: Date.now() - 1000,
    },
    {
      id: 'demo-3',
      name: 'سرور پرسرعت Hysteria 2 (هلند)',
      protocol: 'hysteria2',
      category: 'vps',
      server: 'ams.edge.example.org',
      port: 8443,
      security: 'tls',
      sni: 'ams.edge.example.org',
      transport: 'quic',
      isBuiltin: true,
      failureCount: 0,
      successRate: 90,
      createdAt: Date.now() - 2000,
    },
  ],
  getSettings: async (): Promise<AppSettings> => ({
    routingMode: 'system-proxy',
    autoSelectBest: true,
    autoDiagnosisOnConnect: true,
    healthCheckIntervalSeconds: 20,
    httpProxyPort: 2080,
    socksProxyPort: 2081,
    enableDnsHijack: true,
    upstreamDns: 'https://1.1.1.1/dns-query',
    theme: 'dark',
    language: 'fa',
    killSwitch: false,
    minimizeToTray: true,
    startWithWindows: false,
  }),
  getEvents: async (): Promise<LiveEvent[]> => [
    {
      id: 'init-event',
      timestamp: Date.now(),
      level: 'info',
      category: 'system',
      title: 'راه‌اندازی موفقیت‌آمیز نرم‌افزار رهگذر',
      explanationSimple: 'رهگذر آماده است تا وضعیت اینترنت را بسنجد و شما را متصل کند.',
      explanationDetailed: 'ماژول‌های پایگاه داده، موتور پایش و رابط کاربری بارگذاری شدند.',
      explanationExpert: 'System initialized. Ready for diagnosis & connection commands.',
    },
  ],
  runDiagnosis: async (): Promise<DiagnosisResult> => ({
    timestamp: Date.now(),
    severity: 2,
    severityTitle: 'فیلترینگ هوشمند SNI و بازرسی ClientHello',
    severityDescription: 'اتصال لایه TCP برقرار است، اما فایروال DPI با مشاهده نام دامنه‌ها در بسته اول TLS ارتباط را قطع می‌کند.',
    confidence: 90,
    localNetwork: { ok: true, ip: '192.168.1.105', gateway: '192.168.1.1' },
    dnsTampering: {
      detected: true,
      ispDnsOk: false,
      publicDnsOk: false,
      dohOk: true,
      fakeIpsFound: ['10.10.34.35'],
      details: 'پاسخ جعلی 10.10.34.35 توسط DNS اپراتور بازگردانده شد.',
    },
    tcpBlocking: {
      port80Ok: true,
      port443Ok: true,
      rstInjected: true,
      targetsTested: 6,
      avgRttMs: 85,
      details: 'بسته‌های TCP RST تزریقی توسط فایروال میانی شناسایی شد.',
    },
    tlsInterference: {
      sniBlocked: true,
      handshakeTimeout: false,
      cleanHandshakeOk: true,
      details: 'دست‌دهی با دامنه‌های فیلترشده بلافاصله ریست می‌شود.',
    },
    udpDisruption: {
      packetLossRate: 0.35,
      udpBlocked: false,
      details: 'پکت‌لاس ۳۵ درصدی روی بسته‌های UDP خارجی ثبت شد.',
    },
    nationalIntranet: {
      detected: false,
      domesticOk: true,
      foreignOk: true,
      details: 'درگاه بین‌الملل فعال است اما بسته‌ها بازرسی می‌شوند.',
    },
    recommendations: [
      'استفاده از پروتکل VLESS با Reality و SNI دامنه‌های معتبر (مانند microsoft.com).',
      'فعال‌سازی ویژگی DoH رمزگذاری‌شده در رهگذر برای خنثی‌سازی مسمومیت DNS.',
    ],
    rawEvidence: {},
  }),
  connect: async () => true,
  disconnect: async () => true,
  addProfile: async () => true,
  deleteProfile: async () => true,
  parseConfig: async (input: string) => {
    if (input.startsWith('vless://') || input.startsWith('vmess://') || input.startsWith('trojan://') || input.startsWith('hysteria2://')) {
      return {
        success: true,
        profile: {
          id: 'imported-' + Date.now(),
          name: 'کانفیگ وارد شده',
          protocol: 'vless',
          category: 'vps',
          server: '185.220.101.5',
          port: 443,
          failureCount: 0,
          successRate: 100,
          createdAt: Date.now(),
        },
      };
    }
    return { success: false, error: 'فرمت لینک نامعتبر است.' };
  },
  exportConfigUri: async (profile: ProxyProfile) => `vless://${profile.uuid || 'sample'}@${profile.server}:${profile.port}#${encodeURIComponent(profile.name)}`,
  getHistory: async () => [],
  saveSetting: async () => true,
  getExperimentalStats: async (): Promise<ExperimentalTransportStats> => ({
    name: 'Rahgozar Adaptive Morphing Transport (R-XTP v0.1)',
    status: 'experimental',
    packetOverheadBytes: 48,
    dpiResistanceScore: 8.8,
    latencyPenaltyMs: 14,
    fragmentationEnabled: true,
    chaffNoiseRatio: 0.15,
    description: 'طرح مفهومی و آزمایشی با قطعه‌قطعه‌سازی پکت‌های اولیه TCP (Fragmentation) و تزریق نویز تصادفی.',
  }),
  getProtocolMatrix: async () => [],
  minimizeWindow: async () => {},
  maximizeWindow: async () => {},
  closeWindow: async () => {},
  onEvent: () => () => {},
  onStateChange: () => () => {},
};

export function useRahgozar() {
  const api = window.rahgozarApi || mockApi;

  const [connection, setConnection] = useState<ActiveConnection>({
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
  });

  const [profiles, setProfiles] = useState<ProxyProfile[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [latestDiagnosis, setLatestDiagnosis] = useState<DiagnosisResult | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  // Load initial data
  const refreshAll = useCallback(async () => {
    try {
      const [initialState, profileList, currentSettings, initialEvents] = await Promise.all([
        api.getConnectionState(),
        api.getProfiles(),
        api.getSettings(),
        api.getEvents(),
      ]);

      setConnection(initialState);
      setProfiles(profileList);
      setSettings(currentSettings);
      setEvents(initialEvents);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  }, [api]);

  useEffect(() => {
    refreshAll();

    // Listen to push events
    const unsubscribeEvents = api.onEvent((event: LiveEvent) => {
      setEvents((prev) => [event, ...prev.slice(0, 99)]);
    });

    const unsubscribeState = api.onStateChange((state: ActiveConnection) => {
      setConnection(state);
    });

    return () => {
      unsubscribeEvents?.();
      unsubscribeState?.();
    };
  }, [api, refreshAll]);

  // Actions
  const connect = async (profileId?: string) => {
    return await api.connect(profileId);
  };

  const disconnect = async () => {
    return await api.disconnect();
  };

  const runDiagnosis = async () => {
    setIsDiagnosing(true);
    try {
      const result = await api.runDiagnosis();
      setLatestDiagnosis(result);
      return result;
    } finally {
      setIsDiagnosing(false);
    }
  };

  const addProfile = async (profile: ProxyProfile) => {
    const success = await api.addProfile(profile);
    if (success) {
      const updated = await api.getProfiles();
      setProfiles(updated);
    }
    return success;
  };

  const deleteProfile = async (id: string) => {
    const success = await api.deleteProfile(id);
    if (success) {
      setProfiles((prev) => prev.filter((p) => p.id !== id));
    }
    return success;
  };

  const parseConfig = async (input: string) => {
    return await api.parseConfig(input);
  };

  const saveSetting = async (key: string, value: any) => {
    const success = await api.saveSetting(key, value);
    if (success) {
      const updated = await api.getSettings();
      setSettings(updated);
    }
    return success;
  };

  return {
    connection,
    profiles,
    settings,
    events,
    latestDiagnosis,
    isDiagnosing,
    connect,
    disconnect,
    runDiagnosis,
    addProfile,
    deleteProfile,
    parseConfig,
    saveSetting,
    refreshAll,
    windowControls: {
      minimize: () => api.minimizeWindow(),
      maximize: () => api.maximizeWindow(),
      close: () => api.closeWindow(),
    },
  };
}
