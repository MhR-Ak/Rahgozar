import dgram from 'dgram';

export interface UdpProbeResult {
  packetLossRate: number; // 0.0 to 1.0
  udpBlocked: boolean;
  details: string;
}

/**
 * Probes UDP connectivity and measures packet loss rate across international endpoints
 */
export async function runUdpProbe(): Promise<UdpProbeResult> {
  const targets = [
    { host: '1.1.1.1', port: 53 },
    { host: '8.8.8.8', port: 53 },
    { host: '9.9.9.9', port: 53 },
  ];

  // DNS query packet for "." (root)
  const dnsQueryPacket = Buffer.from([
    0xaa, 0xbb, // Transaction ID
    0x01, 0x00, // Standard query
    0x00, 0x01, // Questions: 1
    0x00, 0x00, // Answer RRs: 0
    0x00, 0x00, // Authority RRs: 0
    0x00, 0x00, // Additional RRs: 0
    0x00,       // Root domain
    0x00, 0x01, // Type A
    0x00, 0x01  // Class IN
  ]);

  let sent = 0;
  let received = 0;

  const testPromises = targets.map((target) => {
    return new Promise<boolean>((resolve) => {
      const client = dgram.createSocket('udp4');
      let gotResponse = false;

      const timer = setTimeout(() => {
        if (!gotResponse) {
          client.close();
          resolve(false);
        }
      }, 2000);

      client.on('message', () => {
        gotResponse = true;
        clearTimeout(timer);
        client.close();
        resolve(true);
      });

      client.on('error', () => {
        clearTimeout(timer);
        client.close();
        resolve(false);
      });

      sent++;
      client.send(dnsQueryPacket, target.port, target.host, (err) => {
        if (err) {
          clearTimeout(timer);
          client.close();
          resolve(false);
        }
      });
    });
  });

  const results = await Promise.all(testPromises);
  received = results.filter(Boolean).length;

  const packetLossRate = sent > 0 ? (sent - received) / sent : 1.0;
  const udpBlocked = packetLossRate >= 0.99;

  let details = 'تبادل بسته‌های UDP بین‌الملل پایدار است.';
  if (udpBlocked) {
    details = 'بسته‌های UDP بین‌الملل به طور کامل مسدود یا فیلتر شده‌اند (پروتکل‌های مبتنی بر UDP مانند WireGuard و TUIC کارایی نخواهند داشت).';
  } else if (packetLossRate > 0.4) {
    details = `افت شدید بسته‌های UDP (${Math.round(packetLossRate * 100)}% پکت‌لاس) ناشی از محدودسازی ترافیک اپراتور.`;
  }

  return {
    packetLossRate,
    udpBlocked,
    details,
  };
}
