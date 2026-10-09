import { describe, it, expect } from 'vitest';
import { computeSeverityScore } from '../electron/core/diagnosis/severity-scorer';

describe('Severity Scorer Unit Tests', () => {
  const baseDns = { detected: false, ispDnsOk: true, publicDnsOk: true, dohOk: true, fakeIpsFound: [], details: '' };
  const baseTcp = { port80Ok: true, port443Ok: true, rstInjected: false, targetsTested: 6, avgRttMs: 70, details: '' };
  const baseTls = { sniBlocked: false, handshakeTimeout: false, cleanHandshakeOk: true, details: '' };
  const baseUdp = { packetLossRate: 0.05, udpBlocked: false, details: '' };
  const baseIntranet = { detected: false, domesticOk: true, foreignOk: true, details: '' };

  it('evaluates Level 0 (Clean network) when all probes succeed', () => {
    const result = computeSeverityScore({
      dns: baseDns,
      tcp: baseTcp,
      tls: baseTls,
      udp: baseUdp,
      intranet: baseIntranet,
      localOk: true,
    });

    expect(result.severity).toBe(0);
    expect(result.severityTitle).toContain('شبکه پاک');
  });

  it('evaluates Level 1 (DNS Poisoning) when only DNS tampering is detected', () => {
    const result = computeSeverityScore({
      dns: { ...baseDns, detected: true, fakeIpsFound: ['10.10.34.34'] },
      tcp: baseTcp,
      tls: baseTls,
      udp: baseUdp,
      intranet: baseIntranet,
      localOk: true,
    });

    expect(result.severity).toBe(1);
    expect(result.severityTitle).toContain('مسمومیت DNS');
  });

  it('evaluates Level 2 (SNI Blocking) when TLS handshake with banned domain is reset', () => {
    const result = computeSeverityScore({
      dns: baseDns,
      tcp: baseTcp,
      tls: { ...baseTls, sniBlocked: true },
      udp: baseUdp,
      intranet: baseIntranet,
      localOk: true,
    });

    expect(result.severity).toBe(2);
    expect(result.severityTitle).toContain('فیلترینگ هوشمند SNI');
  });

  it('evaluates Level 3 (TCP & Port Block) when port 443 fails or RST is actively injected', () => {
    const result = computeSeverityScore({
      dns: baseDns,
      tcp: { ...baseTcp, port443Ok: false, rstInjected: true },
      tls: baseTls,
      udp: baseUdp,
      intranet: baseIntranet,
      localOk: true,
    });

    expect(result.severity).toBe(3);
    expect(result.severityTitle).toContain('مسدودسازی پیشرفته پورت');
  });

  it('evaluates Level 4 (Severe UDP drop & aggressive DPI) when UDP is blocked and SNI is filtered', () => {
    const result = computeSeverityScore({
      dns: baseDns,
      tcp: baseTcp,
      tls: { ...baseTls, sniBlocked: true },
      udp: { ...baseUdp, udpBlocked: true, packetLossRate: 1.0 },
      intranet: baseIntranet,
      localOk: true,
    });

    expect(result.severity).toBe(4);
    expect(result.severityTitle).toContain('انسداد UDP');
  });

  it('evaluates Level 5 (National Intranet) when foreign gateways are completely severed', () => {
    const result = computeSeverityScore({
      dns: { ...baseDns, detected: true },
      tcp: { ...baseTcp, port443Ok: false },
      tls: { ...baseTls, cleanHandshakeOk: false },
      udp: { ...baseUdp, udpBlocked: true },
      intranet: { detected: true, domesticOk: true, foreignOk: false, details: 'قطع درگاه بین‌الملل' },
      localOk: true,
    });

    expect(result.severity).toBe(5);
    expect(result.severityTitle).toContain('اینترنت ملی');
    expect(result.confidence).toBeGreaterThanOrEqual(95);
  });
});
