import { ProxyProfile, AppSettings } from '../../types';

/**
 * SingBoxConfigGenerator
 * Produces validated, modern sing-box (v1.14+) configuration schemas
 * with mixed inbounds, modern TUN stack, uTLS fingerprinting, and domestic domain bypass.
 */
export class SingBoxConfigGenerator {
  public static generate(profile: ProxyProfile, settings: AppSettings): Record<string, any> {
    const mixedPort = settings.httpProxyPort || 2080;

    // 1. Generate inbound definitions
    const inbounds: any[] = [
      {
        type: 'mixed',
        tag: 'mixed-in',
        listen: '127.0.0.1',
        listen_port: mixedPort,
        sniff: true,
      },
    ];

    if (settings.routingMode === 'tun') {
      inbounds.push({
        type: 'tun',
        tag: 'tun-in',
        interface_name: 'rahgozar-tun',
        address: ['172.19.0.1/30'],
        auto_route: true,
        strict_route: true,
        stack: 'mixed',
      });
    }

    // 2. Generate primary proxy outbound
    const proxyOutbound = this.buildOutbound(profile);

    // 3. Fallback system outbounds
    const outbounds: any[] = [
      proxyOutbound,
      {
        type: 'direct',
        tag: 'direct',
      },
      {
        type: 'block',
        tag: 'block',
      },
    ];

    // 4. Routing rules
    const route = {
      rules: [
        {
          ip_is_private: true,
          outbound: 'direct',
        },
        {
          domain_suffix: ['.ir'],
          outbound: 'direct',
        },
      ],
      auto_detect_interface: true,
    };

    return {
      log: {
        disabled: false,
        level: 'info',
        timestamp: true,
      },
      inbounds,
      outbounds,
      route,
    };
  }

  private static buildOutbound(profile: ProxyProfile): Record<string, any> {
    const baseTag = 'proxy';

    switch (profile.protocol) {
      case 'direct': {
        return {
          type: 'direct',
          tag: baseTag,
        };
      }

      case 'vless': {
        const vlessOut: any = {
          type: 'vless',
          tag: baseTag,
          server: profile.server,
          server_port: profile.port,
          uuid: profile.uuid,
          flow: '',
          tls: {
            enabled: profile.security === 'tls' || profile.security === 'reality',
            server_name: profile.sni || profile.server,
            utls: {
              enabled: true,
              fingerprint: profile.fingerprint || 'chrome',
            },
          },
        };

        if (profile.security === 'reality') {
          vlessOut.tls.reality = {
            enabled: true,
            public_key: profile.publicKey,
            short_id: profile.shortId || '',
          };
        }

        if (profile.transport === 'ws') {
          vlessOut.transport = {
            type: 'ws',
            path: profile.path || '/',
            headers: profile.host ? { Host: profile.host } : undefined,
          };
        } else if (profile.transport === 'grpc') {
          vlessOut.transport = {
            type: 'grpc',
            service_name: profile.path || '',
          };
        }

        return vlessOut;
      }

      case 'vmess': {
        return {
          type: 'vmess',
          tag: baseTag,
          server: profile.server,
          server_port: profile.port,
          uuid: profile.uuid,
          security: 'auto',
          tls: {
            enabled: profile.security === 'tls',
            server_name: profile.sni || profile.server,
          },
          transport: profile.transport === 'ws' ? {
            type: 'ws',
            path: profile.path || '/',
            headers: profile.host ? { Host: profile.host } : undefined,
          } : undefined,
        };
      }

      case 'trojan': {
        return {
          type: 'trojan',
          tag: baseTag,
          server: profile.server,
          server_port: profile.port,
          password: profile.password,
          tls: {
            enabled: true,
            server_name: profile.sni || profile.server,
            utls: {
              enabled: true,
              fingerprint: 'chrome',
            },
          },
        };
      }

      case 'shadowsocks': {
        return {
          type: 'shadowsocks',
          tag: baseTag,
          server: profile.server,
          server_port: profile.port,
          method: '2022-blake3-aes-128-gcm',
          password: profile.password,
        };
      }

      case 'hysteria2': {
        return {
          type: 'hysteria2',
          tag: baseTag,
          server: profile.server,
          server_port: profile.port,
          password: profile.password,
          tls: {
            enabled: true,
            server_name: profile.sni || profile.server,
            insecure: false,
          },
        };
      }

      case 'tuic': {
        return {
          type: 'tuic',
          tag: baseTag,
          server: profile.server,
          server_port: profile.port,
          uuid: profile.uuid,
          password: profile.password,
          congestion_control: 'bbr',
          tls: {
            enabled: true,
            server_name: profile.sni || profile.server,
          },
        };
      }

      case 'socks5':
      case 'tor': {
        return {
          type: 'socks',
          tag: baseTag,
          server: profile.server || '127.0.0.1',
          server_port: profile.port || 9050,
        };
      }

      default: {
        return {
          type: 'direct',
          tag: baseTag,
        };
      }
    }
  }
}
