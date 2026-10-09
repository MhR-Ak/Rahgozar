import { NetworkSeverity } from '../../types';
import { DnsProbeResult } from './dns-probe';
import { TcpProbeResult } from './tcp-probe';
import { TlsProbeResult } from './tls-probe';
import { UdpProbeResult } from './udp-probe';
import { IntranetProbeResult } from './intranet-probe';

export interface ScoredDiagnosis {
  severity: NetworkSeverity;
  severityTitle: string;
  severityDescription: string;
  confidence: number;
  recommendations: string[];
}

export function computeSeverityScore(params: {
  dns: DnsProbeResult;
  tcp: TcpProbeResult;
  tls: TlsProbeResult;
  udp: UdpProbeResult;
  intranet: IntranetProbeResult;
  localOk: boolean;
}): ScoredDiagnosis {
  const { dns, tcp, tls, udp, intranet, localOk } = params;

  // If local connection is dead
  if (!localOk) {
    return {
      severity: 0,
      severityTitle: 'قطع اتصال شبکه محلی',
      severityDescription: 'سیستم به هیچ شبکه محلی یا مودم متصل نیست.',
      confidence: 95,
      recommendations: [
        'کابل شبکه یا وضعیت اتصال Wi-Fi را بررسی کنید.',
        'از دریافت آدرس IP معتبر از مودم یا روتر اطمینان حاصل کنید.',
      ],
    };
  }

  // Level 5: National Intranet / Total Foreign Gateway Blackout
  if (intranet.detected) {
    return {
      severity: 5,
      severityTitle: 'اینترنت ملی / قطعی کامل درگاه بین‌الملل',
      severityDescription: 'ارتباط به سایت‌های داخلی برقرار است ولی تبادل ترافیک با سرورهای خارجی به طور کامل مسدود شده است.',
      confidence: 98,
      recommendations: [
        'استفاده از پل‌های Snowflake با دامنه‌های فرانت‌شده داخلی.',
        'استفاده از سرورهای تونل معکوس داخل-به-خارج (Iran Relay) در صورت در دسترس بودن.',
        'کانفیگ‌های معمول VPS خارجی در این حالت بدون رله داخلی پاسخگو نیستند.',
      ],
    };
  }

  // Level 4: Heavy Protocol Fingerprinting & Severe UDP/QUIC Block
  if (udp.udpBlocked && tls.sniBlocked) {
    return {
      severity: 4,
      severityTitle: 'فیلترینگ تهاجمی پروتکل‌ها و انسداد UDP',
      severityDescription: 'سیستم‌های DPI هوشمند فعال هستند؛ پکت‌های UDP کاملاً فیلتر شده و دست‌دهی‌های TLS دستکاری می‌شوند.',
      confidence: 92,
      recommendations: [
        'پروتکل‌های UDP مانند WireGuard و TUIC در این شبکه مسدود هستند.',
        'استفاده از پروتکل VLESS با قابلیت Reality و شبیه‌سازی uTLS کروم پیشنهاد می‌شود.',
        'پل‌های WebTunnel تور یا کانفیگ‌های WebSocket روی پورت ۴۴۳ می‌توانند ارتباط را برقرار کنند.',
      ],
    };
  }

  // Level 3: Strict TCP / Port Blocking + Active Probing
  if (!tcp.port443Ok || tcp.rstInjected) {
    return {
      severity: 3,
      severityTitle: 'مسدودسازی پیشرفته پورت و بازرسی TCP',
      severityDescription: 'پورت‌های استاندارد ترافیک خارجی بسته شده‌اند یا بسته‌های TCP RST به محض برقراری اتصال ارسال می‌شوند.',
      confidence: 88,
      recommendations: [
        'از کانفیگ‌های Reality روی پورت‌های متداول با SNI دامنه‌های معتبر استفاده کنید.',
        'از انتقال‌دهنده‌های WebSocket با CDN یا کانال‌های رمزگذاری‌شده پشتیبانی‌شده در رهگذر استفاده نمایید.',
      ],
    };
  }

  // Level 2: SNI / TLS Filtering only
  if (tls.sniBlocked) {
    return {
      severity: 2,
      severityTitle: 'فیلترینگ هوشمند SNI و بازرسی ClientHello',
      severityDescription: 'اتصال لایه TCP برقرار است، اما فایروال DPI با مشاهده نام دامنه‌ها در بسته اول TLS ارتباط را قطع می‌کند.',
      confidence: 90,
      recommendations: [
        'استفاده از پروتکل VLESS-Reality یا Trojan با SNI مجاز خارجی.',
        'فعال‌سازی تکه‌تکه‌سازی پکت‌های TCP (Fragmentation) برای عبور از فایروال DPI.',
        'استفاده از وب‌سوکت با کلودفلر یا پروتکل Hysteria 2.',
      ],
    };
  }

  // Level 1: DNS Poisoning only
  if (dns.detected) {
    return {
      severity: 1,
      severityTitle: 'دستکاری و مسمومیت DNS',
      severityDescription: 'تنها لایه وضوح نام دامنه توسط اپراتور دچار جعل یا مسمومیت شده است؛ اتصالات مستقیم IP مشکلی ندارند.',
      confidence: 85,
      recommendations: [
        'فعال‌سازی ویژگی DoH (DNS over HTTPS) در تنظیمات رهگذر برای خنثی‌سازی کامل این اختلال کافی است.',
        'استفاده از DNS کلودفلر (1.1.1.1) یا گوگل (8.8.8.8) به صورت رمزگذاری‌شده.',
      ],
    };
  }

  // Level 0: Clean network
  return {
    severity: 0,
    severityTitle: 'شبکه پاک و بدون اختلال مشهود',
    severityDescription: 'تمامی آزمون‌های لایه شبکه، DNS، پروتکل‌های TCP/UDP و TLS با موفقیت انجام شدند.',
    confidence: 80,
    recommendations: [
      'می‌توانید به طور مستقیم یا با سبک‌ترین پروفایل‌های اتصال به اینترنت وصل شوید.',
      'تمام پروتکل‌های WireGuard، VLESS و Hysteria در دسترس هستند.',
    ],
  };
}
