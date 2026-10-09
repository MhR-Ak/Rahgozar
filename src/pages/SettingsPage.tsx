import React from 'react';
import { Settings as SettingsIcon, Shield, Radio, Globe, Sliders, Check } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsPageProps {
  settings: AppSettings | null;
  onSaveSetting: (key: string, value: any) => Promise<boolean>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onSaveSetting,
}) => {
  if (!settings) {
    return <div className="p-6 text-slate-400">در حال بارگذاری تنظیمات...</div>;
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-2.75rem)]">
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-sky-400" />
          تنظیمات سیستم و هسته اتصال
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          پیکربندی حالت‌های مسیریابی، پورت‌های محلی، DNS رمزنگاری‌شده و پایش سلامت اتصال
        </p>
      </div>

      <div className="space-y-4">
        {/* Section 1: Routing Mode */}
        <div className="bezel-outer">
          <div className="bezel-inner p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-sky-400" />
              حالت مسیریابی ترافیک ویندوز
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => onSaveSetting('routingMode', 'system-proxy')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  settings.routingMode === 'system-proxy'
                    ? 'bg-sky-500/10 border-sky-500/40 text-white'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">پراکسی سیستمی (System Proxy)</span>
                  {settings.routingMode === 'system-proxy' && (
                    <Check className="w-4 h-4 text-sky-400" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  تنظیم خودکار پراکسی ویندوز برای مرورگرها و نرم‌افزارهای استاندارد؛ با قابلیت بازیابی ۱۰۰٪ ایمن رجیستری.
                </p>
              </div>

              <div
                onClick={() => onSaveSetting('routingMode', 'tun')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  settings.routingMode === 'tun'
                    ? 'bg-sky-500/10 border-sky-500/40 text-white'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">کارت شبکه مجازی (TUN Mode)</span>
                  {settings.routingMode === 'tun' && (
                    <Check className="w-4 h-4 text-sky-400" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  هدایت کامل ترافیک کلیه برنامه‌ها، بازی‌ها و ترمینال از طریق کارت شبکه مجازی Wintun در سطح هسته ویندوز.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Automation & Health Checks */}
        <div className="bezel-outer">
          <div className="bezel-inner p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              رفتار هوشمند و تعویض خودکار مسیر
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <div>
                  <p className="font-bold text-white">انتخاب خودکار بهترین سرور (ATS)</p>
                  <p className="text-[11px] text-slate-400">
                    موتور انتخاب تطبیقی سرورها را بر اساس پینگ و نوع فیلترینگ اولویت‌بندی کند.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoSelectBest}
                  onChange={(e) => onSaveSetting('autoSelectBest', e.target.checked)}
                  className="w-4 h-4 rounded text-sky-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <div>
                  <p className="font-bold text-white">عیب‌یابی خودکار قبل از اتصال</p>
                  <p className="text-[11px] text-slate-400">
                    در صورت قطع ارتباط طولانی، وضعیت اپراتور قبل از اتصال مجدد بررسی شود.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoDiagnosisOnConnect}
                  onChange={(e) => onSaveSetting('autoDiagnosisOnConnect', e.target.checked)}
                  className="w-4 h-4 rounded text-sky-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-bold text-white">فاصله بررسی سلامت مسیر (ثانیه)</p>
                  <p className="text-[11px] text-slate-400">
                    ارسال پینگ نامحسوس به منظور پیشگیری از قطع ناگهانی و اجرای Failover
                  </p>
                </div>
                <span className="font-mono font-bold text-sky-400">
                  {settings.healthCheckIntervalSeconds} ثانیه
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: DNS & Local Ports */}
        <div className="bezel-outer">
          <div className="bezel-inner p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              سرورهای DNS و پورت‌های محلی
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  پورت پراکسی محلی (Mixed HTTP/SOCKS5):
                </label>
                <input
                  type="number"
                  value={settings.httpProxyPort}
                  onChange={(e) => onSaveSetting('httpProxyPort', parseInt(e.target.value, 10))}
                  className="w-full rounded-xl bg-rahgozar-bg border border-white/10 p-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  سرور DoH رمزگذاری‌شده بالادستی:
                </label>
                <select
                  value={settings.upstreamDns}
                  onChange={(e) => onSaveSetting('upstreamDns', e.target.value)}
                  className="w-full rounded-xl bg-rahgozar-bg border border-white/10 p-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                >
                  <option value="https://1.1.1.1/dns-query">Cloudflare DoH (1.1.1.1)</option>
                  <option value="https://8.8.8.8/dns-query">Google DoH (8.8.8.8)</option>
                  <option value="https://dns.adguard.com/dns-query">AdGuard DoH</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
