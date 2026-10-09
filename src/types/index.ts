export type NetworkSeverity = 0 | 1 | 2 | 3 | 4 | 5;

export interface DiagnosisResult {
  timestamp: number;
  severity: NetworkSeverity;
  severityTitle: string;
  severityDescription: string;
  confidence: number; // 0 - 100%
  localNetwork: {
    ok: boolean;
    gateway?: string;
    ip?: string;
    error?: string;
  };
  dnsTampering: {
    detected: boolean;
    ispDnsOk: boolean;
    publicDnsOk: boolean;
    dohOk: boolean;
    fakeIpsFound: string[];
    details: string;
  };
  tcpBlocking: {
    port80Ok: boolean;
    port443Ok: boolean;
    rstInjected: boolean;
    targetsTested: number;
    avgRttMs: number;
    details: string;
  };
  tlsInterference: {
    sniBlocked: boolean;
    handshakeTimeout: boolean;
    cleanHandshakeOk: boolean;
    details: string;
  };
  udpDisruption: {
    packetLossRate: number; // 0.0 - 1.0
    udpBlocked: boolean;
    details: string;
  };
  nationalIntranet: {
    detected: boolean;
    domesticOk: boolean;
    foreignOk: boolean;
    details: string;
  };
  recommendations: string[];
  rawEvidence: Record<string, unknown>;
}

export type ProfileProtocol =
  | 'direct'
  | 'vless'
  | 'vmess'
  | 'trojan'
  | 'shadowsocks'
  | 'hysteria2'
  | 'tuic'
  | 'wireguard'
  | 'tor'
  | 'socks5'
  | 'http';

export type ProfileCategory = 'vps' | 'no-vps';

export interface ProxyProfile {
  id: string;
  name: string;
  protocol: ProfileProtocol;
  category: ProfileCategory;
  server: string;
  port: number;
  uuid?: string;
  password?: string;
  security?: 'none' | 'tls' | 'reality';
  sni?: string;
  publicKey?: string;
  shortId?: string;
  fingerprint?: string;
  transport?: 'tcp' | 'ws' | 'grpc' | 'http' | 'quic';
  path?: string;
  host?: string;
  torBridgeType?: 'snowflake' | 'webtunnel' | 'obfs4';
  torBridgeString?: string;
  isBuiltin?: boolean;
  pingMs?: number;
  lastTested?: number;
  failureCount: number;
  successRate: number; // 0 - 100
  rawUri?: string;
  createdAt: number;
}

export type ConnectionState =
  | 'disconnected'
  | 'diagnosing'
  | 'selecting_route'
  | 'connecting'
  | 'verifying'
  | 'connected'
  | 'reconnecting'
  | 'disconnecting'
  | 'failed';

export interface ActiveConnection {
  state: ConnectionState;
  activeProfileId: string | null;
  activeProfileName: string | null;
  protocol: ProfileProtocol | null;
  connectedAt: number | null;
  durationSeconds: number;
  uploadSpeedBps: number;
  downloadSpeedBps: number;
  totalUploadBytes: number;
  totalDownloadBytes: number;
  currentPingMs: number | null;
  packetLoss: number;
  mode: 'system-proxy' | 'tun';
  statusMessage: string;
}

export interface LiveEvent {
  id: string;
  timestamp: number;
  level: 'info' | 'success' | 'warning' | 'error' | 'expert';
  category: 'engine' | 'diagnosis' | 'routing' | 'security' | 'system';
  title: string;
  explanationSimple: string;
  explanationDetailed: string;
  explanationExpert: string;
  actionTaken?: string;
  userRemedy?: string;
}

export interface AppSettings {
  routingMode: 'system-proxy' | 'tun';
  autoSelectBest: boolean;
  autoDiagnosisOnConnect: boolean;
  healthCheckIntervalSeconds: number;
  httpProxyPort: number;
  socksProxyPort: number;
  enableDnsHijack: boolean;
  upstreamDns: string;
  theme: 'dark' | 'light';
  language: 'fa';
  killSwitch: boolean;
  minimizeToTray: boolean;
  startWithWindows: boolean;
}

export interface VerificationCanaryResult {
  success: boolean;
  latencyMs: number;
  ip?: string;
  country?: string;
  endpointUsed: string;
  error?: string;
}

export interface ExperimentalTransportStats {
  name: string;
  status: 'experimental' | 'evaluating' | 'ready';
  packetOverheadBytes: number;
  dpiResistanceScore: number; // 0 - 10
  latencyPenaltyMs: number;
  fragmentationEnabled: boolean;
  chaffNoiseRatio: number;
  description: string;
}
