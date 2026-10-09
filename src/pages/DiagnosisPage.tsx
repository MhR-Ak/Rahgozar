import React from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Globe,
  Radio,
  Wifi,
  Lock,
  Zap,
} from 'lucide-react';
import { DiagnosisResult } from '../types';

interface DiagnosisPageProps {
  diagnosis: DiagnosisResult | null;
  isDiagnosing: boolean;
  onRunDiagnosis: () => void;
}

export const DiagnosisPage: React.FC<DiagnosisPageProps> = ({
  diagnosis,
  isDiagnosing,
  onRunDiagnosis,
}) => {
  const getSeverityBadgeColor = (severity: number) => {
    switch (severity) {
      case 0:
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 1:
        return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
      case 2:
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 3:
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 4:
      case 5:
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-2.75rem)]">
      {/* Top Header Card */}
      <div className="bezel-outer">
        <div className="bezel-inner p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-sky-400" />
              موتور تشخیص تطبیقی اختلالات و شدت فیلترینگ (ANDE)
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              این ابزار به صورت چندمرحله‌ای لایه‌های DNS، اتصالات TCP، دست‌دهی‌های امن TLS، افت بسته‌های UDP و قطع احتمالی درگاه‌های بین‌الملل را در شبکهٔ اپراتور شما می‌سنجد.
            </p>
          </div>

          <button
            onClick={onRunDiagnosis}
            disabled={isDiagnosing}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-sky-500/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RotateCw className={`w-4 h-4 ${isDiagnosing ? 'animate-spin' : ''}`} />
            {isDiagnosing ? 'در حال آزمون لایه‌های شبکه...' : 'شروع سنجش کامل شبکه'}
          </button>
        </div>
      </div>

      {diagnosis ? (
        <>
          {/* Severity Score Overview Card */}
          <div className="bezel-outer">
            <div className="bezel-inner p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                <div>
                  <span className="text-xs text-slate-400 font-medium">نتیجه ارزیابی کلی:</span>
                  <div className="flex items-center gap-3 mt-1">
                    <span
                      className={`text-sm px-3 py-1 rounded-full font-bold border ${getSeverityBadgeColor(
                        diagnosis.severity
                      )}`}
                    >
                      شدت فیلترینگ: سطح {diagnosis.severity} از ۵
                    </span>
                    <h2 className="text-base font-bold text-white">
                      {diagnosis.severityTitle}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                  <div>
                    <span>درجه اطمینان: </span>
                    <span className="font-bold text-emerald-400">{diagnosis.confidence}%</span>
                  </div>
                  <div className="h-3 w-px bg-white/10"></div>
                  <div>
                    <span>زمان آزمایش: </span>
                    <span className="text-slate-300">
                      {new Date(diagnosis.timestamp).toLocaleTimeString('fa-IR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Severity Scale Visual Meter */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                  <span>سطح ۰: پاک</span>
                  <span>سطح ۱: اختلال DNS</span>
                  <span>سطح ۲: مسدودسازی SNI</span>
                  <span>سطح ۳: بازرسی TCP/Port</span>
                  <span>سطح ۴: افت UDP/DPI</span>
                  <span>سطح ۵: اینترنت ملی</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-800 p-0.5 flex gap-1 overflow-hidden">
                  {[0, 1, 2, 3, 4, 5].map((lvl) => (
                    <div
                      key={lvl}
                      className={`h-full flex-1 rounded-sm transition-all duration-500 ${
                        diagnosis.severity >= lvl
                          ? lvl >= 4
                            ? 'bg-rose-500 shadow-glow-rose'
                            : lvl >= 2
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                          : 'bg-slate-700/50'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-300 bg-white/5 p-3 rounded-xl border border-white/5 leading-relaxed">
                {diagnosis.severityDescription}
              </p>
            </div>
          </div>

          {/* Detailed Probes Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Probe 1: Local Link */}
            <div className="bezel-outer">
              <div className="bezel-inner p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Wifi className="w-4 h-4 text-sky-400" />
                    کارت شبکه محلی و اتصال سیستم
                  </span>
                  {diagnosis.localNetwork.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  {diagnosis.localNetwork.ok
                    ? `IP فعال: ${diagnosis.localNetwork.ip || '127.0.0.1'} | اتصال محلی سالم است.`
                    : diagnosis.localNetwork.error}
                </p>
              </div>
            </div>

            {/* Probe 2: DNS Poisoning */}
            <div className="bezel-outer">
              <div className="bezel-inner p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    دستکاری و مسمومیت DNS
                  </span>
                  {diagnosis.dnsTampering.detected ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {diagnosis.dnsTampering.details}
                </p>
              </div>
            </div>

            {/* Probe 3: TCP & RST Injection */}
            <div className="bezel-outer">
              <div className="bezel-inner p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    اتصال TCP و تزریق بسته RST
                  </span>
                  {diagnosis.tcpBlocking.rstInjected || !diagnosis.tcpBlocking.port443Ok ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {diagnosis.tcpBlocking.details} (میانگین پینگ: {diagnosis.tcpBlocking.avgRttMs}ms)
                </p>
              </div>
            </div>

            {/* Probe 4: TLS & SNI */}
            <div className="bezel-outer">
              <div className="bezel-inner p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-sky-400" />
                    فیلترینگ هوشمند SNI در ClientHello
                  </span>
                  {diagnosis.tlsInterference.sniBlocked ? (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {diagnosis.tlsInterference.details}
                </p>
              </div>
            </div>

            {/* Probe 5: UDP Packet Loss */}
            <div className="bezel-outer">
              <div className="bezel-inner p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-purple-400" />
                    تبادل بسته‌های UDP و محدودسازی پورت
                  </span>
                  {diagnosis.udpDisruption.udpBlocked ? (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  ) : diagnosis.udpDisruption.packetLossRate > 0.3 ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {diagnosis.udpDisruption.details}
                </p>
              </div>
            </div>

            {/* Probe 6: National Intranet */}
            <div className="bezel-outer">
              <div className="bezel-inner p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-rose-400" />
                    پایش وضعیت اینترنت ملی (Intranet)
                  </span>
                  {diagnosis.nationalIntranet.detected ? (
                    <XCircle className="w-4 h-4 text-rose-500 font-bold" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {diagnosis.nationalIntranet.details}
                </p>
              </div>
            </div>
          </div>

          {/* Recommendations Card */}
          <div className="bezel-outer">
            <div className="bezel-inner p-5 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                اقدامات پیشنهادی برای اتصال پایدار در این شرایط:
              </h3>
              <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
                {diagnosis.recommendations.map((rec, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      ) : (
        <div className="bezel-outer text-center py-16">
          <div className="bezel-inner p-8">
            <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-300">
              هنوز آزمایشی روی اینترنت سیستم شما انجام نشده است.
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              با فشردن دکمه «شروع سنجش کامل شبکه»، وضعیت اختلالات اپراتور (همراه اول، ایرانسل یا اینترنت ثابت) به طور دقیق و علمی تحلیل می‌شود.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
