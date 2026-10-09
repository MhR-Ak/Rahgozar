import crypto from 'crypto';
import { ProxyProfile, ProfileProtocol } from '../../types';

export interface ParseResult {
  success: boolean;
  profile?: ProxyProfile;
  error?: string;
}

/**
 * Robust Multi-Protocol Config Parser & URI Generator
 * Supports VLESS, VMess, Trojan, Shadowsocks, Hysteria 2, TUIC, WireGuard, and Tor bridges.
 */
export class ConfigParser {
  /**
   * Parses arbitrary proxy link, subscription line, or bridge configuration
   */
  public static parse(input: string): ParseResult {
    const trimmed = input.trim();
    if (!trimmed) {
      return { success: false, error: 'متن کانفیگ خالی است.' };
    }

    try {
      if (trimmed.startsWith('vless://')) {
        return this.parseVless(trimmed);
      }
      if (trimmed.startsWith('vmess://')) {
        return this.parseVmess(trimmed);
      }
      if (trimmed.startsWith('trojan://')) {
        return this.parseTrojan(trimmed);
      }
      if (trimmed.startsWith('ss://')) {
        return this.parseShadowsocks(trimmed);
      }
      if (trimmed.startsWith('hysteria2://') || trimmed.startsWith('hy2://')) {
        return this.parseHysteria2(trimmed);
      }
      if (trimmed.startsWith('tuic://')) {
        return this.parseTuic(trimmed);
      }
      if (trimmed.startsWith('bridge snowflake') || trimmed.startsWith('bridge webtunnel') || trimmed.startsWith('bridge obfs4')) {
        return this.parseTorBridge(trimmed);
      }

      return {
        success: false,
        error: 'پروتکل ناشناخته است. پروتکل‌های مجاز: VLESS, VMess, Trojan, Shadowsocks, Hysteria2, TUIC, Tor Bridges',
      };
    } catch (err: any) {
      return {
        success: false,
        error: `خطا در تجزیه لینک کانفیگ: ${err.message}`,
      };
    }
  }

  // --- VLESS Parser ---
  private static parseVless(uri: string): ParseResult {
    const url = new URL(uri);
    const uuid = url.username;
    const server = url.hostname;
    const port = parseInt(url.port, 10);
    const name = decodeURIComponent(url.hash ? url.hash.substring(1) : `${server}:${port}`);

    if (!uuid || !server || isNaN(port)) {
      return { success: false, error: 'کانفیگ VLESS فاقد UUID، آدرس سرور یا پورت معتبر است.' };
    }

    const security = (url.searchParams.get('security') as any) || 'none';
    const sni = url.searchParams.get('sni') || '';
    const pbk = url.searchParams.get('pbk') || '';
    const sid = url.searchParams.get('sid') || '';
    const fp = url.searchParams.get('fp') || 'chrome';
    const type = (url.searchParams.get('type') as any) || 'tcp';
    const path = url.searchParams.get('path') || '';
    const host = url.searchParams.get('host') || '';

    const profile: ProxyProfile = {
      id: crypto.randomUUID(),
      name,
      protocol: 'vless',
      category: 'vps',
      server,
      port,
      uuid,
      security,
      sni,
      publicKey: pbk,
      shortId: sid,
      fingerprint: fp,
      transport: type,
      path,
      host,
      failureCount: 0,
      successRate: 100,
      rawUri: uri,
      createdAt: Date.now(),
    };

    return { success: true, profile };
  }

  // --- VMess Parser ---
  private static parseVmess(uri: string): ParseResult {
    const b64 = uri.replace('vmess://', '').trim();
    let jsonStr = '';
    try {
      jsonStr = Buffer.from(b64, 'base64').toString('utf8');
    } catch {
      return { success: false, error: 'کد Base64 کانفیگ VMess نامعتبر است.' };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return { success: false, error: 'ساختار JSON درون کانفیگ VMess اشتباه است.' };
    }

    const server = parsed.add;
    const port = parseInt(parsed.port, 10);
    const uuid = parsed.id;
    const name = parsed.ps || `${server}:${port}`;

    if (!server || isNaN(port) || !uuid) {
      return { success: false, error: 'فیلدهای الزامی VMess (آدرس سرور، پورت، UUID) ناقص هستند.' };
    }

    const profile: ProxyProfile = {
      id: crypto.randomUUID(),
      name,
      protocol: 'vmess',
      category: 'vps',
      server,
      port,
      uuid,
      security: parsed.tls === 'tls' ? 'tls' : 'none',
      sni: parsed.sni || parsed.host || '',
      transport: parsed.net || 'tcp',
      path: parsed.path || '',
      host: parsed.host || '',
      failureCount: 0,
      successRate: 100,
      rawUri: uri,
      createdAt: Date.now(),
    };

    return { success: true, profile };
  }

  // --- Trojan Parser ---
  private static parseTrojan(uri: string): ParseResult {
    const url = new URL(uri);
    const password = url.username;
    const server = url.hostname;
    const port = parseInt(url.port, 10);
    const name = decodeURIComponent(url.hash ? url.hash.substring(1) : `${server}:${port}`);

    if (!password || !server || isNaN(port)) {
      return { success: false, error: 'کانفیگ Trojan فاقد رمز عبور، آدرس سرور یا پورت معتبر است.' };
    }

    const sni = url.searchParams.get('sni') || server;
    const type = (url.searchParams.get('type') as any) || 'tcp';

    const profile: ProxyProfile = {
      id: crypto.randomUUID(),
      name,
      protocol: 'trojan',
      category: 'vps',
      server,
      port,
      password,
      security: 'tls',
      sni,
      transport: type,
      failureCount: 0,
      successRate: 100,
      rawUri: uri,
      createdAt: Date.now(),
    };

    return { success: true, profile };
  }

  // --- Shadowsocks Parser ---
  private static parseShadowsocks(uri: string): ParseResult {
    const stripped = uri.replace('ss://', '');
    const hashIndex = stripped.indexOf('#');
    const name = hashIndex !== -1 ? decodeURIComponent(stripped.substring(hashIndex + 1)) : 'Shadowsocks';
    const mainPart = hashIndex !== -1 ? stripped.substring(0, hashIndex) : stripped;

    let server = '';
    let port = 0;
    let password = '';

    if (mainPart.includes('@')) {
      const [auth, serverPort] = mainPart.split('@');
      let methodPassword = auth;
      try {
        methodPassword = Buffer.from(auth, 'base64').toString('utf8');
      } catch {}

      password = methodPassword;
      const [s, p] = serverPort.split(':');
      server = s;
      port = parseInt(p, 10);
    } else {
      try {
        const decoded = Buffer.from(mainPart, 'base64').toString('utf8');
        const [auth, serverPort] = decoded.split('@');
        password = auth;
        const [s, p] = serverPort.split(':');
        server = s;
        port = parseInt(p, 10);
      } catch {
        return { success: false, error: 'فرمت لینک Shadowsocks نامعتبر است.' };
      }
    }

    if (!server || isNaN(port)) {
      return { success: false, error: 'آدرس سرور یا پورت Shadowsocks نامعتبر است.' };
    }

    const profile: ProxyProfile = {
      id: crypto.randomUUID(),
      name,
      protocol: 'shadowsocks',
      category: 'vps',
      server,
      port,
      password,
      failureCount: 0,
      successRate: 100,
      rawUri: uri,
      createdAt: Date.now(),
    };

    return { success: true, profile };
  }

  // --- Hysteria 2 Parser ---
  private static parseHysteria2(uri: string): ParseResult {
    const normalized = uri.replace('hy2://', 'hysteria2://');
    const url = new URL(normalized);
    const password = url.username;
    const server = url.hostname;
    const port = parseInt(url.port, 10) || 443;
    const name = decodeURIComponent(url.hash ? url.hash.substring(1) : `Hysteria2-${server}`);
    const sni = url.searchParams.get('sni') || server;

    if (!server || !password) {
      return { success: false, error: 'کانفیگ Hysteria2 فاقد رمز عبور یا سرور است.' };
    }

    const profile: ProxyProfile = {
      id: crypto.randomUUID(),
      name,
      protocol: 'hysteria2',
      category: 'vps',
      server,
      port,
      password,
      security: 'tls',
      sni,
      transport: 'quic',
      failureCount: 0,
      successRate: 100,
      rawUri: uri,
      createdAt: Date.now(),
    };

    return { success: true, profile };
  }

  // --- TUIC Parser ---
  private static parseTuic(uri: string): ParseResult {
    const url = new URL(uri);
    const uuid = url.username;
    const password = url.password;
    const server = url.hostname;
    const port = parseInt(url.port, 10) || 443;
    const name = decodeURIComponent(url.hash ? url.hash.substring(1) : `TUIC-${server}`);
    const sni = url.searchParams.get('sni') || server;

    if (!server || !uuid) {
      return { success: false, error: 'کانفیگ TUIC فاقد UUID یا سرور است.' };
    }

    const profile: ProxyProfile = {
      id: crypto.randomUUID(),
      name,
      protocol: 'tuic',
      category: 'vps',
      server,
      port,
      uuid,
      password,
      security: 'tls',
      sni,
      transport: 'quic',
      failureCount: 0,
      successRate: 100,
      rawUri: uri,
      createdAt: Date.now(),
    };

    return { success: true, profile };
  }

  // --- Tor Bridge Parser ---
  private static parseTorBridge(line: string): ParseResult {
    let bridgeType: 'snowflake' | 'webtunnel' | 'obfs4' = 'snowflake';
    if (line.includes('webtunnel')) bridgeType = 'webtunnel';
    else if (line.includes('obfs4')) bridgeType = 'obfs4';

    const profile: ProxyProfile = {
      id: crypto.randomUUID(),
      name: `پل تور (${bridgeType.toUpperCase()})`,
      protocol: 'tor',
      category: 'no-vps',
      server: '127.0.0.1',
      port: 9050,
      torBridgeType: bridgeType,
      torBridgeString: line,
      failureCount: 0,
      successRate: 100,
      rawUri: line,
      createdAt: Date.now(),
    };

    return { success: true, profile };
  }

  /**
   * Generates a sharable URI from a ProxyProfile
   */
  public static toUri(profile: ProxyProfile): string {
    if (profile.rawUri) return profile.rawUri;

    const encodedName = encodeURIComponent(profile.name);
    if (profile.protocol === 'vless') {
      const params = new URLSearchParams();
      if (profile.security) params.set('security', profile.security);
      if (profile.sni) params.set('sni', profile.sni);
      if (profile.publicKey) params.set('pbk', profile.publicKey);
      if (profile.shortId) params.set('sid', profile.shortId);
      if (profile.fingerprint) params.set('fp', profile.fingerprint);
      if (profile.transport) params.set('type', profile.transport);
      if (profile.path) params.set('path', profile.path);
      if (profile.host) params.set('host', profile.host);
      return `vless://${profile.uuid}@${profile.server}:${profile.port}?${params.toString()}#${encodedName}`;
    }

    if (profile.protocol === 'trojan') {
      const params = new URLSearchParams();
      if (profile.sni) params.set('sni', profile.sni);
      return `trojan://${profile.password}@${profile.server}:${profile.port}?${params.toString()}#${encodedName}`;
    }

    if (profile.protocol === 'hysteria2') {
      const params = new URLSearchParams();
      if (profile.sni) params.set('sni', profile.sni);
      return `hysteria2://${profile.password}@${profile.server}:${profile.port}/?${params.toString()}#${encodedName}`;
    }

    if (profile.protocol === 'tor') {
      return profile.torBridgeString || 'bridge snowflake 192.0.2.3:1';
    }

    return `${profile.protocol}://${profile.server}:${profile.port}#${encodedName}`;
  }
}
