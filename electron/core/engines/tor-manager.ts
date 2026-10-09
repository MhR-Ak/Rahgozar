import fs from 'fs';
import path from 'path';
import os from 'os';
import { ProxyProfile } from '../../types';

export interface TorBootstrapStatus {
  progress: number; // 0 - 100
  phase: string;
  isReady: boolean;
  error?: string;
}

/**
 * TorManager
 * Generates valid torrc configurations for circumvention bridges
 * (Snowflake, WebTunnel, obfs4) for Mode A (Without Personal VPS).
 */
export class TorManager {
  private static instance: TorManager | null = null;
  private torrcPath: string;

  private constructor() {
    const dataDir = path.join(os.homedir(), '.rahgozar');
    this.torrcPath = path.join(dataDir, 'torrc');
  }

  public static getInstance(): TorManager {
    if (!TorManager.instance) {
      TorManager.instance = new TorManager();
    }
    return TorManager.instance;
  }

  /**
   * Generates a valid torrc file using selected bridge options
   */
  public generateTorrc(profile: ProxyProfile, socksPort = 9050, httpTunnelPort = 9080): string {
    const bridgeType = profile.torBridgeType || 'snowflake';
    let bridgeLines = '';

    if (profile.torBridgeString) {
      bridgeLines = profile.torBridgeString;
    } else if (bridgeType === 'snowflake') {
      bridgeLines = `bridge snowflake 192.0.2.3:1 2B280B23E1107BB62B72614776F1E274DD9C0A0C\nClientTransportPlugin snowflake exec ./snowflake-client -url https://snowflake-broker.torproject.net.global.prod.fastly.net/ -front cdn.sstatic.net -ice stun:stun.l.google.com:19302`;
    } else if (bridgeType === 'webtunnel') {
      bridgeLines = `ClientTransportPlugin webtunnel exec ./webtunnel-client`;
    }

    const torrcContent = `
# Rahgozar Tor Anti-Censorship Configuration
SocksPort 127.0.0.1:${socksPort}
HTTPTunnelPort 127.0.0.1:${httpTunnelPort}
UseBridges 1
Log notice stdout

${bridgeLines}
    `.trim();

    fs.writeFileSync(this.torrcPath, torrcContent, 'utf8');
    return torrcContent;
  }

  /**
   * Parses Tor standard bootstrap log lines:
   * e.g., "Bootstrapped 80% (ap_conn): Connecting to a relay"
   */
  public static parseBootstrapLine(line: string): TorBootstrapStatus | null {
    const match = line.match(/Bootstrapped\s+(\d+)%\s+\(([^)]+)\):\s+(.*)/i);
    if (!match) return null;

    const progress = parseInt(match[1], 10);
    const phase = match[2];
    const isReady = progress >= 100;

    return {
      progress,
      phase,
      isReady,
    };
  }
}
