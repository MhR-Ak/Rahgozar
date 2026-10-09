import tls from 'tls';

export interface TlsProbeResult {
  sniBlocked: boolean;
  handshakeTimeout: boolean;
  cleanHandshakeOk: boolean;
  details: string;
}

/**
 * TLS Handshake probe analyzing SNI filtering and ClientHello DPI inspection
 */
export async function runTlsProbe(): Promise<TlsProbeResult> {
  // We use Cloudflare edge IP 1.1.1.1 or 104.16.132.229 as the remote TCP server
  const testHost = '1.1.1.1';
  const port = 443;

  // 1. Try with an unblocked/clean SNI
  const cleanResult = await attemptTlsHandshake(testHost, port, 'cloudflare.com');

  // 2. Try with a conventionally filtered SNI
  const filteredResult = await attemptTlsHandshake(testHost, port, 'twitter.com');

  const cleanHandshakeOk = cleanResult.success;
  const sniBlocked = cleanResult.success && !filteredResult.success && filteredResult.rstReceived;
  const handshakeTimeout = filteredResult.timedOut || (!cleanResult.success && cleanResult.timedOut);

  let details = 'فاز دست‌دهی امن TLS بدون تداخل SNI انجام شد.';
  if (sniBlocked) {
    details = 'فیلترینگ هوشمند SNI شناسایی شد؛ دست‌دهی با دامنه‌های فیلترشده توسط DPI ریست می‌شود.';
  } else if (!cleanHandshakeOk && handshakeTimeout) {
    details = 'تایم‌اوت در هندشیک TLS به مقاصد خارجی (احتمال اختلال یا افت پهنای باند).';
  } else if (!cleanHandshakeOk) {
    details = 'ارتباط TLS بین‌الملل با خطای ناشناخته مواجه شد.';
  }

  return {
    sniBlocked,
    handshakeTimeout,
    cleanHandshakeOk,
    details,
  };
}

function attemptTlsHandshake(
  host: string,
  port: number,
  servername: string
): Promise<{ success: boolean; rstReceived: boolean; timedOut: boolean; error?: string }> {
  return new Promise((resolve) => {
    let finished = false;

    const socket = tls.connect(
      {
        host,
        port,
        servername,
        rejectUnauthorized: false,
        timeout: 3000,
      },
      () => {
        if (!finished) {
          finished = true;
          socket.destroy();
          resolve({ success: true, rstReceived: false, timedOut: false });
        }
      }
    );

    socket.on('error', (err: any) => {
      if (!finished) {
        finished = true;
        const rstReceived = err.code === 'ECONNRESET';
        socket.destroy();
        resolve({ success: false, rstReceived, timedOut: false, error: err.code });
      }
    });

    socket.on('timeout', () => {
      if (!finished) {
        finished = true;
        socket.destroy();
        resolve({ success: false, rstReceived: false, timedOut: true });
      }
    });
  });
}
