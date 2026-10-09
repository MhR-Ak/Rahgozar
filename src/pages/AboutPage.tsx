import React, { useState, useEffect } from 'react';
import { BookOpen, ShieldAlert, Cpu, Award, ExternalLink, Sparkles, CheckCircle2 } from 'lucide-react';
import { ExperimentalTransportStats } from '../types';

export const AboutPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'guides' | 'matrix' | 'experimental' | 'limitations'>('guides');
  const [protocolsMatrix, setProtocolsMatrix] = useState<any[]>([]);
  const [experimentalStats, setExperimentalStats] = useState<ExperimentalTransportStats | null>(null);

  useEffect(() => {
    const loadInfo = async () => {
      try {
        if (window.rahgozarApi?.getProtocolMatrix) {
          const matrix = await window.rahgozarApi.getProtocolMatrix();
          setProtocolsMatrix(matrix);
        }
        if (window.rahgozarApi?.getExperimentalStats) {
          const stats = await window.rahgozarApi.getExperimentalStats();
          setExperimentalStats(stats);
        }
      } catch (err) {
        console.error('Failed to load about metadata:', err);
      }
    };
    loadInfo();
  }, []);

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-2.75rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sky-400" />
            راهنما، مستندات معماری و درباره رهگذر
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            پروژه متن‌باز رهگذر (Rahgozar) | نگارش مهندسی ۱.۰.۰ پایدار برای ویندوز ۱۰ و ۱۱ نسخه ۶۴ بیتی
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-white/5 text-xs">
          <button
            onClick={() => setActiveTab('guides')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'guides' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            راهنمای اتصال
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'matrix' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            مقایسه پروتکل‌ها
          </button>
          <button
            onClick={() => setActiveTab('experimental')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'experimental' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            پروتکل آزمایشی (R-XTP)
          </button>
          <button
            onClick={() => setActiveTab('limitations')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'limitations' ? 'bg-rose-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            محدودیت‌های فنی
          </button>
        </div>
      </div>

      {/* Tab Content 1: Guides */}
      {activeTab === 'guides' && (
        <div className="space-y-4 text-xs leading-relaxed">
          <div className="bezel-outer">
            <div className="bezel-inner p-5 space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                ۱. اتصال در حالت «بدون VPS شخصی» (پل‌های تور، Snowflake و WebTunnel)
              </h2>
              <p className="text-slate-300">
                در این حالت نیازی به خرید سرور خارج از کشور یا دامنه ندارید. رهگذر از پل‌های ضدسانسور رسمی پروژه تور استفاده می‌کند:
              </p>
              <ul className="space-y-1.5 text-slate-400 list-disc list-inside pr-2">
                <li><strong className="text-white">پل Snowflake:</strong> از طریق تکنولوژی WebRTC و دامنه‌های فرانت‌شده (مانند سرورهای Fastly یا AWS)، ترافیک شما را به عنوان ترافیک عادی وب منتقل می‌کند.</li>
                <li><strong className="text-white">پل WebTunnel:</strong> ارتباط پروکسی را درون یک درخواست عادی وب‌سایت با پروتکل HTTP/2 یا HTTP/3 پنهان می‌کند تا فایروال DPI متوجه تونل نشود.</li>
                <li><strong className="text-white">ورود دستی پل‌ها:</strong> می‌توانید پل‌های جدید دریافتی از ربات‌های رسمی تلگرام تور (@GetBridgesBot) را مستقیماً در بخش «مدیریت کانفیگ‌ها» وارد کنید.</li>
              </ul>
            </div>
          </div>

          <div className="bezel-outer">
            <div className="bezel-inner p-5 space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-400" />
                ۲. اتصال در حالت «با VPS شخصی» (VLESS Reality، Hysteria 2 و Trojan)
              </h2>
              <p className="text-slate-300">
                برای سرعت و پایداری حداکثری، استفاده از سرور شخصی با پروتکل‌های مدرن پیشنهاد می‌شود:
              </p>
              <ul className="space-y-1.5 text-slate-400 list-disc list-inside pr-2">
                <li><strong className="text-white">VLESS + XTLS-Reality:</strong> مقاوم‌ترین پروتکل در برابر فیلترینگ فعلی ایرانسل و همراه اول؛ این پروتکل با شبیه‌سازی مشخصات TLS مرورگر کروم و استفاده از SNI دامنه‌های بزرگ مجاز (مانند مایکروسافت، اپل یا یاهو)، امکان شناسایی را به صفر نزدیک می‌کند.</li>
                <li><strong className="text-white">Hysteria 2:</strong> پروتکل مبتنی بر UDP سفارشی‌شده با الگوریتم کنترل ازدحام Brutal؛ مناسب برای زمان‌هایی که افت پکت روی شبکه وجود دارد اما پورت‌های UDP کاملاً مسدود نشده‌اند.</li>
                <li><strong className="text-white">واردسازی سریع:</strong> کانفیگ‌های vless://، vmess://، trojan:// و hysteria2:// را با یک کلیک کپی کرده و در رهگذر جای‌گذاری کنید.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Protocol Matrix */}
      {activeTab === 'matrix' && (
        <div className="bezel-outer">
          <div className="bezel-inner p-4 overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-white/5 text-slate-400">
                  <th className="pb-3 font-semibold">پروتکل</th>
                  <th className="pb-3 font-semibold">لایه پایه</th>
                  <th className="pb-3 font-semibold">مقاومت در برابر DPI</th>
                  <th className="pb-3 font-semibold">راندمان و سرعت</th>
                  <th className="pb-3 font-semibold">وضعیت در اپراتورهای ایران</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(protocolsMatrix.length > 0 ? protocolsMatrix : [
                  { name: 'VLESS + Reality', underlyingTransport: 'TCP', dpiResistance: 'Very High', speedEfficiency: 'High', currentIranStatus: 'پایدارترین پروتکل فعلی با uTLS کروم' },
                  { name: 'Hysteria 2', underlyingTransport: 'UDP', dpiResistance: 'High', speedEfficiency: 'Very High', currentIranStatus: 'سرعت بسیار بالا مگر در صورت قطع کامل UDP' },
                  { name: 'Tor Snowflake', underlyingTransport: 'WebRTC', dpiResistance: 'Very High', speedEfficiency: 'Low', currentIranStatus: 'تنها گزینه در قطعی‌های شدید درگاه‌ها' },
                  { name: 'WireGuard', underlyingTransport: 'UDP', dpiResistance: 'Low', speedEfficiency: 'Very High', currentIranStatus: 'مسدودسازی سریع توسط DPI اپراتورها' },
                ]).map((p: any, idx: number) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 font-bold text-white">{p.name}</td>
                    <td className="py-3 font-mono text-slate-400">{p.underlyingTransport}</td>
                    <td className="py-3 font-bold text-emerald-400">{p.dpiResistance}</td>
                    <td className="py-3 font-bold text-sky-400">{p.speedEfficiency}</td>
                    <td className="py-3 text-slate-300">{p.currentIranStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 3: Experimental Transport */}
      {activeTab === 'experimental' && (
        <div className="bezel-outer">
          <div className="bezel-inner p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  تحقیق و طرح آزمایشی: انتقال‌دهنده تطبیقی R-XTP
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  ارزیابی شکاف‌های فنی پروتکل‌های مرسوم در برابر مدل‌های یادگیری ماشین DPI
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase font-bold">
                Experimental Prototype
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              تحقیقات OONI و بررسی فایروال‌های DPI نشان می‌دهد که سیستم‌های سانسور مدرن علاوه بر بررسی SNI، به ویژگی‌های آماری طول پکت‌ها (Packet Length Distribution) و فاصله زمانی بسته‌ها (Inter-Arrival Timing) حساس هستند. انتقال‌دهنده اختصاصی آزمایشی رهگذر (R-XTP) با هدف خنثی‌سازی این دو فاکتور طراحی شده است:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-slate-400 block text-[11px]">پوشش پکت‌های اولیه:</span>
                <span className="text-emerald-400 font-bold text-sm">Early TCP Fragmentation</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-slate-400 block text-[11px]">پدینگ تصادفی داده:</span>
                <span className="text-sky-400 font-bold text-sm">Chaff Padding (256-1400B)</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-slate-400 block text-[11px]">رمزنگاری استاندارد:</span>
                <span className="text-purple-400 font-bold text-sm">ChaCha20-Poly1305</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <strong className="block mb-1">یادداشت پژوهشی:</strong>
              مطابق اصول اخلاقی و استانداردهای مهندسی پروژه، پروتکل آزمایشی تا زمان استقرار سرور متقارن و ارزیابی جامع در آزمایشگاه‌های معتبر، به عنوان قابلیت پایدار اصلی فعال نخواهد شد و اولویت با پروتکل‌های تاییدشده جهانی (VLESS Reality و Tor) است.
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 4: Technical Limitations */}
      {activeTab === 'limitations' && (
        <div className="bezel-outer">
          <div className="bezel-inner p-5 space-y-4">
            <h2 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              فهرست محدودیت‌های فنی و واقعیت‌های مهندسی شبکه
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              در راستای اصل عدم جعل نتایج و شفافیت کامل مهندسی، آگاهی از این محدودیت‌ها برای هر کاربر و متخصصی الزامی است:
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <h3 className="font-bold text-white">۱. قطعی ۱۰۰٪ فیزیکی یا خاموشی سراسری اینترنت بین‌الملل:</h3>
                <p className="text-slate-400 leading-relaxed">
                  اگر شرکت زیرساخت تمام دروازه‌های BGP فیبر نوری بین‌الملل کشور را قطع کند و هیچ بسته‌ای اجازه خروج به خارج از مرزها را نداشته باشد، هیچ نرم‌افزاری بر روی کره زمین بدون وجود سخت‌افزار رادیویی ماهواره‌ای مستقیم، نمی‌تواند اینترنت جهانی تولید کند. در این وضعیت رهگذر صادقانه وضعیت «اینترنت ملی (سطح ۵)» را گزارش می‌دهد.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <h3 className="font-bold text-white">۲. مجوز مدیر ویندوز (Administrator) برای کارت شبکه TUN:</h3>
                <p className="text-slate-400 leading-relaxed">
                  حالت پیش‌فرض برنامه (System Proxy) بدون نیاز به ادمین کار می‌کند؛ اما ایجاد آداپتور مجازی Wintun برای کل سیستم مستلزم دسترسی ادمین است که یک محدودیت طبیعی امنیتی هسته سیستم‌عامل ویندوز محسوب می‌شود.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <h3 className="font-bold text-white">۳. نوسان کیفیت پل‌های عمومی رایگان در ساعات اوج مصرف:</h3>
                <p className="text-slate-400 leading-relaxed">
                  پل‌های Snowflake و رله‌های رایگان برای ارتباط متنی، پیام‌رسان‌ها و وب‌گردی اضطراری عالی هستند، اما به دلیل محدودیت داوطلبان جهانی، نباید انتظار دانلود سرعت بالا با گیگابایت‌های سنگین از آن‌ها داشت.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
