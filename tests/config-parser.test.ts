import { describe, it, expect } from 'vitest';
import { ConfigParser } from '../electron/core/engines/config-parser';

describe('ConfigParser Unit Tests', () => {
  it('correctly parses VLESS Reality URI', () => {
    const uri = 'vless://a68ef30f-2f83-4a57-b08e-8a16dbd78fa1@185.220.101.5:443?security=reality&sni=www.microsoft.com&pbk=6XzM_o52q2Yj_aXpU1Z_Y68E8F30F2F834A57B08E8A&sid=6ba85b54&fp=chrome&type=tcp#Sample-VLESS';
    const result = ConfigParser.parse(uri);

    expect(result.success).toBe(true);
    expect(result.profile).toBeDefined();
    if (result.profile) {
      expect(result.profile.protocol).toBe('vless');
      expect(result.profile.server).toBe('185.220.101.5');
      expect(result.profile.port).toBe(443);
      expect(result.profile.uuid).toBe('a68ef30f-2f83-4a57-b08e-8a16dbd78fa1');
      expect(result.profile.security).toBe('reality');
      expect(result.profile.sni).toBe('www.microsoft.com');
      expect(result.profile.publicKey).toBe('6XzM_o52q2Yj_aXpU1Z_Y68E8F30F2F834A57B08E8A');
      expect(result.profile.name).toBe('Sample-VLESS');
    }
  });

  it('correctly parses Trojan URI', () => {
    const uri = 'trojan://secure_password_123@ams.example.org:443?sni=ams.example.org#Trojan-Node';
    const result = ConfigParser.parse(uri);

    expect(result.success).toBe(true);
    expect(result.profile).toBeDefined();
    if (result.profile) {
      expect(result.profile.protocol).toBe('trojan');
      expect(result.profile.password).toBe('secure_password_123');
      expect(result.profile.server).toBe('ams.example.org');
      expect(result.profile.port).toBe(443);
      expect(result.profile.name).toBe('Trojan-Node');
    }
  });

  it('correctly parses Hysteria 2 URI', () => {
    const uri = 'hysteria2://mypassword@fast.hysteria.net:8443/?sni=fast.hysteria.net#Hysteria2-Fast';
    const result = ConfigParser.parse(uri);

    expect(result.success).toBe(true);
    expect(result.profile).toBeDefined();
    if (result.profile) {
      expect(result.profile.protocol).toBe('hysteria2');
      expect(result.profile.port).toBe(8443);
      expect(result.profile.transport).toBe('quic');
    }
  });

  it('correctly parses Tor Snowflake Bridge line', () => {
    const bridgeLine = 'bridge snowflake 192.0.2.3:1 2B280B23E1107BB62B72614776F1E274DD9C0A0C';
    const result = ConfigParser.parse(bridgeLine);

    expect(result.success).toBe(true);
    expect(result.profile).toBeDefined();
    if (result.profile) {
      expect(result.profile.protocol).toBe('tor');
      expect(result.profile.torBridgeType).toBe('snowflake');
      expect(result.profile.category).toBe('no-vps');
    }
  });

  it('rejects empty or malformed config with informative Persian error', () => {
    const emptyResult = ConfigParser.parse('');
    expect(emptyResult.success).toBe(false);
    expect(emptyResult.error).toContain('خالی است');

    const invalidResult = ConfigParser.parse('unknownprotocol://xyz');
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.error).toContain('پروتکل ناشناخته');
  });
});
