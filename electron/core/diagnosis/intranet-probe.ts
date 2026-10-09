import http from 'http';
import https from 'https';

export interface IntranetProbeResult {
  detected: boolean;
  domesticOk: boolean;
  foreignOk: boolean;
  details: string;
}

/**
 * Checks if the system is isolated within the National Information Network (Intranet/شبکه ملی)
 */
export async function runIntranetProbe(): Promise<IntranetProbeResult> {
  const domesticHosts = ['aparat.com', 'digikala.com'];
  const foreignHosts = ['1.1.1.1', 'cloudflare.com'];

  const domesticChecks = await Promise.all(
    domesticHosts.map((host) => pingHost(host, 443))
  );

  const foreignChecks = await Promise.all(
    foreignHosts.map((host) => pingHost(host, 443))
  );

  const domesticOk = domesticChecks.some(Boolean);
  const foreignOk = foreignChecks.some(Boolean);

  // If domestic services respond with zero issues, but foreign connections are 100% dead:
  const detected = domesticOk && !foreignOk;

  let details = 'مسیردهی به اینترنت بین‌الملل برقرار است.';
  if (detected) {
    details = 'وضعیت «اینترنت ملی» شناسایی شد: ترافیک به سمت سرورهای داخلی برقرار است، اما دروازه‌های خروجی بین‌الملل قطع یا مسدود هستند.';
  } else if (!domesticOk && !foreignOk) {
    details = 'کل ارتباط اینترنت و شبکه محلی قطع است؛ کابل شبکه یا اتصال Wi-Fi را بررسی کنید.';
  }

  return {
    detected,
    domesticOk,
    foreignOk,
    details,
  };
}

function pingHost(hostname: string, port = 443): Promise<boolean> {
  return new Promise((resolve) => {
    const isHttps = port === 443;
    const req = (isHttps ? https : http).request(
      {
        hostname,
        port,
        path: '/',
        method: 'HEAD',
        timeout: 2500,
        rejectUnauthorized: false,
      },
      (res) => {
        resolve(res.statusCode !== undefined);
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.end();
  });
}
