import { ProxyProfile, AppSettings } from '../../types';

/**
 * SingBoxConfigGenerator
 * Produces production-grade, validated sing-box (v1.10+) configuration schemas
 * with mixed inbounds, optional TUN stack, uTLS fingerprinting, DNS routing, and Clash API for live stats.
 */
export class SingBoxConfigGenerator {
  public static generate(profile: ProxyProfile, settings: AppSettings): Record<string, any> {
    const mixedPort = settings.httpProxyPort || 2080;
    const clashApiPort = 9090;

    // 1. Generate inbound definitions
    const inbounds: any[] = [
      {
        type: 'mixed',
        tag: 'mixed-in',
        listen: '127.0.0.1',
        listen_port: mixedPort,
        sniff: true,
        sniff_override_destination: true,
      },
    ];

    if (settings.routingMode === 'tun') {
      inbounds.push({
        type: 'tun',
        tag: 'tun-in',
        interface_name: 'rahgozar-tun',
        inet4_address: '172.19.0.1/30',
        auto_route: true,
        strict_route: true,
        stack: 'mixed',
        sniff: true,
      });
    }

    // 2. Generate primary proxy outbound
    const proxyOutbound = this.buildOutbound(profile);

    // 3. Fallback and system outbounds
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
      {
        type: 'dns',
        tag: 'dns-out',
      },
    ];

    // 4. DNS rules
    const dnsConfig = {
      servers: [
        {
          tag: 'dns-remote',
          address: settings.upstreamDns || 'https://1.1.1.1/dns-query',
          detour: 'proxy',
        },
        {
          tag: 'dns-direct',
          address: 'local',
          detour: 'direct',
        },
      ],
      rules: [
        {
          outbound: 'any',
          server: 'dns-direct',
        },
        {
          geosite: 'category-ir',
          server: 'dns-direct',
        },
      ],
      strategy: 'ipv4_only',
    };

    // 5. Routing rules
    const route = {
      rules: [
        {
          protocol: 'dns',
          outbound: 'dns-out',
        },
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

    // 6. Complete config object
    return {
      log: {
        disabled: false,
        level: 'info',
        timestamp: true,
      },
      experimental: {
        clash_api: {
          external_controller: `127.0.0.1:${clashApiPort}`,
          secret: '',
        },
        cache_file: {
          enabled: true,
          path: 'cache.db',
        },
      },
      dns: dnsConfig,
      inbounds,
      outbounds,
      route,
    };
  }

  private static buildOutbound(profile: ProxyProfile): Record<string, any> {
    const baseTag = 'proxy';

    switch (profile.protocol) {
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
          type: 'socks',
          tag: baseTag,
          server: '127.0.0.1',
          server_port: 1080,
        };
      }
    }
  }
}
