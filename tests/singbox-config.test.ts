import { describe, it, expect } from 'vitest';
import { SingBoxConfigGenerator } from '../electron/core/engines/singbox-config';
import { ProxyProfile, AppSettings } from '../src/types';

describe('SingBox Config Generator Tests', () => {
  const sampleSettings: AppSettings = {
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
  };

  it('generates valid mixed inbound configuration on port 2080', () => {
    const profile: ProxyProfile = {
      id: 'test-1',
      name: 'VLESS Reality Server',
      protocol: 'vless',
      category: 'vps',
      server: '1.2.3.4',
      port: 443,
      uuid: 'a68ef30f-2f83-4a57-b08e-8a16dbd78fa1',
      security: 'reality',
      sni: 'www.microsoft.com',
      publicKey: 'sample_pbk',
      fingerprint: 'chrome',
      failureCount: 0,
      successRate: 100,
      createdAt: Date.now(),
    };

    const config = SingBoxConfigGenerator.generate(profile, sampleSettings);

    expect(config.inbounds).toBeDefined();
    expect(config.inbounds[0].type).toBe('mixed');
    expect(config.inbounds[0].listen_port).toBe(2080);

    const proxyOutbound = config.outbounds.find((o: any) => o.tag === 'proxy');
    expect(proxyOutbound).toBeDefined();
    expect(proxyOutbound.type).toBe('vless');
    expect(proxyOutbound.tls.reality.enabled).toBe(true);
    expect(proxyOutbound.tls.utls.fingerprint).toBe('chrome');
  });

  it('adds TUN interface when routingMode is set to tun', () => {
    const profile: ProxyProfile = {
      id: 'test-2',
      name: 'Hysteria2 Server',
      protocol: 'hysteria2',
      category: 'vps',
      server: '5.6.7.8',
      port: 8443,
      password: 'mypass',
      failureCount: 0,
      successRate: 100,
      createdAt: Date.now(),
    };

    const tunSettings: AppSettings = { ...sampleSettings, routingMode: 'tun' };
    const config = SingBoxConfigGenerator.generate(profile, tunSettings);

    const tunInbound = config.inbounds.find((i: any) => i.type === 'tun');
    expect(tunInbound).toBeDefined();
    expect(tunInbound.interface_name).toBe('rahgozar-tun');
    expect(tunInbound.auto_route).toBe(true);
  });

  it('includes domestic domain (.ir) bypass rules in routing', () => {
    const profile: ProxyProfile = {
      id: 'test-3',
      name: 'Trojan Server',
      protocol: 'trojan',
      category: 'vps',
      server: '9.9.9.9',
      port: 443,
      password: 'pass',
      failureCount: 0,
      successRate: 100,
      createdAt: Date.now(),
    };

    const config = SingBoxConfigGenerator.generate(profile, sampleSettings);
    const irRule = config.route.rules.find((r: any) => r.domain_suffix && r.domain_suffix.includes('.ir'));

    expect(irRule).toBeDefined();
    expect(irRule.outbound).toBe('direct');
  });
});
