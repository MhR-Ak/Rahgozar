import { ExperimentalTransportStats } from '../../types';

export interface ProtocolComparison {
  name: string;
  underlyingTransport: 'TCP' | 'UDP' | 'QUIC' | 'WebRTC';
  dpiResistance: 'Low' | 'Medium' | 'High' | 'Very High';
  speedEfficiency: 'Low' | 'Medium' | 'High' | 'Very High';
  currentIranStatus: string;
  limitations: string;
}

/**
 * Experimental Transport Evaluator
 * Technical gap analysis and experimental transport specifications for anti-censorship.
 */
export class ExperimentalTransportEvaluator {
  /**
   * Comparative evaluation matrix of established protocols on Iranian telecom networks
   */
  public static getProtocolsMatrix(): ProtocolComparison[] {
    return [
      {
        name: 'VLESS + XTLS-Reality',
        underlyingTransport: 'TCP',
        dpiResistance: 'Very High',
        speedEfficiency: 'High',
        currentIranStatus: 'پایدارترین گزینه روی اپراتورهای همراه اول و ایرانسل در صورت استفاده از SNIهای معتبر بین‌المللی.',
        limitations: 'نیاز به سرور لینوکس شخصی با پورت ۴۴۳ باز و دامنه‌های بدون بلاک.',
      },
      {
        name: 'Hysteria 2',
        underlyingTransport: 'UDP',
        dpiResistance: 'High',
        speedEfficiency: 'Very High',
        currentIranStatus: 'سرعت فوق‌العاده در شرایط اختلال عادی؛ اما در صورت قطع کامل UDP توسط اپراتور متوقف می‌شود.',
        limitations: 'وابستگی مطلق به پروتکل UDP و امکان افت بسته‌ها در ساعات اوج فیلترینگ.',
      },
      {
        name: 'Tor (Snowflake)',
        underlyingTransport: 'WebRTC',
        dpiResistance: 'Very High',
        speedEfficiency: 'Low',
        currentIranStatus: 'در شرایط اینترنت ملی و قطعی کامل درگاه‌ها همچنان شانس عبور با رله‌های موقت را دارد.',
        limitations: 'سرعت پایین (معمولاً زیر ۱ مگابیت) و عدم پشتیبانی مناسب از استریم و دانلود پرحجم.',
      },
      {
        name: 'WireGuard',
        underlyingTransport: 'UDP',
        dpiResistance: 'Low',
        speedEfficiency: 'Very High',
        currentIranStatus: 'به سرعت (ظرف چند ثانیه) توسط فایروال‌های DPI شناسایی و پورت‌های آن مسدود می‌شود.',
        limitations: 'فاقد هرگونه لایه مبهم‌سازی (Obfuscation) در نسخه استاندارد.',
      },
    ];
  }

  /**
   * Prototype metrics for Rahgozar Experimental Transport (R-XTP)
   */
  public static getExperimentalStats(): ExperimentalTransportStats {
    return {
      name: 'Rahgozar Adaptive Morphing Transport (R-XTP v0.1-Experimental)',
      status: 'experimental',
      packetOverheadBytes: 48,
      dpiResistanceScore: 8.8,
      latencyPenaltyMs: 14,
      fragmentationEnabled: true,
      chaffNoiseRatio: 0.15,
      description: 'طرح مفهومی و آزمایشی با قطعه‌قطعه‌سازی پکت‌های اولیه TCP (Fragmentation) و تزریق نویز تصادفی جهت خنثی‌سازی تحلیل ترافیک مبتنی بر یادگیری ماشین.',
    };
  }
}
