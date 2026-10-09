import net from 'net';

export interface TcpProbeResult {
  port80Ok: boolean;
  port443Ok: boolean;
  rstInjected: boolean;
  targetsTested: number;
  avgRttMs: number;
  details: string;
}

interface Target {
  host: string;
  port: number;
  type: 'domestic' | 'international';
}

const TEST_TARGETS: Target[] = [
  { host: 'aparat.com', port: 443, type: 'domestic' },
  { host: 'digikala.com', port: 443, type: 'domestic' },
  { host: 'cloudflare.com', port: 443, type: 'international' },
  { host: '1.1.1.1', port: 443, type: 'international' },
  { host: 'google.com', port: 443, type: 'international' },
  { host: '1.1.1.1', port: 80, type: 'international' },
];

/**
 * Probes TCP layer across domestic and international control targets
 */
export async function runTcpProbe(): Promise<TcpProbeResult> {
  const results = await Promise.all(
    TEST_TARGETS.map(async (target) => {
      const start = Date.now();
      return new Promise<{ target: Target; success: boolean; rtt: number; rst: boolean }>((resolve) => {
        const socket = new net.Socket();
        let rst = false;

        socket.setTimeout(2500);

        socket.connect(target.port, target.host, () => {
          const rtt = Date.now() - start;
          socket.destroy();
          resolve({ target, success: true, rtt, rst: false });
        });

        socket.on('error', (err: any) => {
          if (err.code === 'ECONNRESET') {
            rst = true;
          }
          socket.destroy();
          resolve({ target, success: false, rtt: -1, rst });
        });

        socket.on('timeout', () => {
          socket.destroy();
          resolve({ target, success: false, rtt: -1, rst: false });
        });
      });
    })
  );

  const successful = results.filter((r) => r.success);
  const rstEvents = results.filter((r) => r.rst);
  const port80Tests = results.filter((r) => r.target.port === 80);
  const port443Tests = results.filter((r) => r.target.port === 443);

  const port80Ok = port80Tests.some((r) => r.success);
  const port443Ok = port443Tests.some((r) => r.success);
  const rstInjected = rstEvents.length > 0;

  const validRtts = successful.map((r) => r.rtt);
  const avgRttMs = validRtts.length > 0
    ? Math.round(validRtts.reduce((a, b) => a + b, 0) / validRtts.length)
    : -1;

  let details = 'لایه انتقال TCP به درستی عمل می‌کند.';
  if (rstInjected) {
    details = 'بسته‌های TCP RST تزریقی توسط فایروال میانی (DPI) شناسایی شد.';
  } else if (!port443Ok && !port80Ok) {
    details = 'اتصال به مقاصد خارجی روی پورت‌های ۸۰ و ۴۴۳ مسدود یا بی‌پاسخ است.';
  } else if (successful.length < TEST_TARGETS.length / 2) {
    details = 'ناپایداری و درصد بالای خطای Timeout در اتصالات TCP بین‌الملل.';
  }

  return {
    port80Ok,
    port443Ok,
    rstInjected,
    targetsTested: TEST_TARGETS.length,
    avgRttMs,
    details,
  };
}
