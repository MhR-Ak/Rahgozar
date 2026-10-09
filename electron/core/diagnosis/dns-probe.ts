import dns from 'dns';
import https from 'https';

export interface DnsProbeResult {
  detected: boolean;
  ispDnsOk: boolean;
  publicDnsOk: boolean;
  dohOk: boolean;
  fakeIpsFound: string[];
  details: string;
}

const KNOWN_SPOOFED_IPS = new Set([
  '10.10.34.34',
  '10.10.34.35',
  '10.10.34.36',
  '0.0.0.0',
  '127.0.0.1',
]);

/**
 * Performs DNS tampering analysis comparing local system resolver,
 * direct public resolver (8.8.8.8), and encrypted DNS-over-HTTPS (DoH).
 */
export async function runDnsProbe(targetDomain = 'twitter.com'): Promise<DnsProbeResult> {
  const fakeIpsFound: string[] = [];
  let ispDnsOk = false;
  let publicDnsOk = false;
  let dohOk = false;

  // 1. Check local/ISP DNS resolver
  try {
    const localAddresses = await new Promise<string[]>((resolve, reject) => {
      dns.resolve4(targetDomain, (err, addresses) => {
        if (err) reject(err);
        else resolve(addresses || []);
      });
    });

    for (const ip of localAddresses) {
      if (KNOWN_SPOOFED_IPS.has(ip) || ip.startsWith('10.10.')) {
        fakeIpsFound.push(ip);
      }
    }

    if (localAddresses.length > 0 && fakeIpsFound.length === 0) {
      ispDnsOk = true;
    }
  } catch (err: any) {
    if (err.code === 'ENOTFOUND' || err.code === 'ETIMEOUT') {
      // Possible DNS blackholing
    }
  }

  // 2. Check direct query via Public DNS (8.8.8.8) using custom resolver
  try {
    const resolver = new dns.Resolver({ timeout: 2500, tries: 1 });
    resolver.setServers(['8.8.8.8', '1.1.1.1']);
    const publicAddresses = await new Promise<string[]>((resolve, reject) => {
      resolver.resolve4(targetDomain, (err, addresses) => {
        if (err) reject(err);
        else resolve(addresses || []);
      });
    });

    for (const ip of publicAddresses) {
      if (KNOWN_SPOOFED_IPS.has(ip) || ip.startsWith('10.10.')) {
        fakeIpsFound.push(ip);
      }
    }

    if (publicAddresses.length > 0 && fakeIpsFound.length === 0) {
      publicDnsOk = true;
    }
  } catch {
    // Port 53 UDP to foreign resolvers blocked
    publicDnsOk = false;
  }

  // 3. Query Cloudflare DoH (Port 443 HTTPS encrypted)
  try {
    const dohResult = await queryCloudflareDoH(targetDomain);
    if (dohResult && dohResult.length > 0) {
      dohOk = true;
    }
  } catch {
    dohOk = false;
  }

  const detected = fakeIpsFound.length > 0 || (!ispDnsOk && dohOk);

  let details = 'وضوح نام دامنه‌ها بدون اختلال است.';
  if (fakeIpsFound.length > 0) {
    details = `دستکاری DNS مشاهده شد: پاسخ‌های جعلی (${fakeIpsFound.join(', ')}) بازگردانده شده است.`;
  } else if (!ispDnsOk && dohOk) {
    details = 'پورت ۵۳ یا DNS محلی مسدود شده، اما سرویس DoH رمزنگاری‌شده فعال است.';
  } else if (!ispDnsOk && !dohOk) {
    details = 'پاسخی از هیچ‌یک از سرورهای نام دریافت نشد (احتمال قطعی کامل ارتباط).';
  }

  return {
    detected,
    ispDnsOk,
    publicDnsOk,
    dohOk,
    fakeIpsFound,
    details,
  };
}

function queryCloudflareDoH(domain: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '1.1.1.1',
      port: 443,
      path: `/dns-query?name=${encodeURIComponent(domain)}&type=A`,
      method: 'GET',
      headers: {
        Accept: 'application/dns-json',
      },
      timeout: 3000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const ips: string[] = (json.Answer || [])
            .filter((a: any) => a.type === 1)
            .map((a: any) => a.data);
          resolve(ips);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('DoH Timeout'));
    });

    req.on('error', reject);
    req.end();
  });
}
