import http from 'http';
import { VerificationCanaryResult } from '../../types';

/**
 * CanaryVerifier
 * Verifies real end-to-end data transmission through the active local proxy
 * to guarantee no fake successful connections are reported.
 */
export class CanaryVerifier {
  private static readonly CANARY_ENDPOINTS = [
    { url: 'http://cp.cloudflare.com/generate_204', expectedStatus: 204 },
    { url: 'http://connectivitycheck.gstatic.com/generate_204', expectedStatus: 204 },
    { url: 'http://www.google.com/generate_204', expectedStatus: 204 },
  ];

  /**
   * Performs an actual HTTP request routed through the local proxy
   */
  public static async verifyThroughProxy(proxyPort = 2080, timeoutMs = 4500): Promise<VerificationCanaryResult> {
    for (const endpoint of this.CANARY_ENDPOINTS) {
      const result = await this.testEndpoint(endpoint.url, endpoint.expectedStatus, proxyPort, timeoutMs);
      if (result.success) {
        return result;
      }
    }

    return {
      success: false,
      latencyMs: -1,
      endpointUsed: 'All canary targets',
      error: 'هیچ داده‌ای از طریق پراکسی دریافت نشد (اتصال به اینترنت آزاد برقرار نشد).',
    };
  }

  private static testEndpoint(
    targetUrl: string,
    expectedStatus: number,
    proxyPort: number,
    timeoutMs: number
  ): Promise<VerificationCanaryResult> {
    return new Promise((resolve) => {
      const parsedUrl = new URL(targetUrl);
      const startTime = Date.now();

      // Route request to local HTTP proxy
      const req = http.request(
        {
          host: '127.0.0.1',
          port: proxyPort,
          method: 'GET',
          path: targetUrl,
          headers: {
            Host: parsedUrl.host,
            'User-Agent': 'Rahgozar-Canary/1.0',
          },
          timeout: timeoutMs,
        },
        (res) => {
          const latencyMs = Date.now() - startTime;
          const isSuccess = res.statusCode === expectedStatus || res.statusCode === 200;

          res.resume(); // Consume stream
          if (isSuccess) {
            resolve({
              success: true,
              latencyMs,
              endpointUsed: targetUrl,
            });
          } else {
            resolve({
              success: false,
              latencyMs,
              endpointUsed: targetUrl,
              error: `کد وضعیت نامنتظره ${res.statusCode} از سرور دریافت شد.`,
            });
          }
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          latencyMs: -1,
          endpointUsed: targetUrl,
          error: 'مهلت زمانی (Timeout) ارسال درخواست به پایان رسید.',
        });
      });

      req.on('error', (err: any) => {
        resolve({
          success: false,
          latencyMs: -1,
          endpointUsed: targetUrl,
          error: err.code || err.message,
        });
      });

      req.end();
    });
  }
}
