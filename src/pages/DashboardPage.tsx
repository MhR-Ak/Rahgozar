import React from 'react';
import {
  Power,
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
  ShieldCheck,
  Server,
  Clock,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { ActiveConnection, DiagnosisResult, ProxyProfile } from '../types';

interface DashboardPageProps {
  connection: ActiveConnection;
  profiles: ProxyProfile[];
  latestDiagnosis: DiagnosisResult | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onNavigateToDiagnosis: () => void;
  onNavigateToProfiles: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  connection,
  profiles,
  latestDiagnosis,
  onConnect,
  onDisconnect,
  onNavigateToDiagnosis,
  onNavigateToProfiles,
}) => {
  const isConnected = connection.state === 'connected';
  const isPending =
    connection.state === 'connecting' ||
    connection.state === 'verifying' ||
    connection.state === 'selecting_route' ||
    connection.state === 'diagnosing';

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-2.75rem)]">
      {/* Top Banner / Assistant Glance */}
      <div className="bezel-outer">
        <div className="bezel-inner p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">دستیار هوشمند رهگذر</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {connection.statusMessage}
              </p>
            </div>
          </div>

          {latestDiagnosis ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">شدت فیلترینگ شناسایی‌شده:</span>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                  latestDiagnosis.severity >= 3
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : latestDiagnosis.severity >= 1
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                سطح {latestDiagnosis.severity} از ۵ ({latestDiagnosis.severityTitle})
              </span>
            </div>
          ) : (
            <button
              onClick={onNavigateToDiagnosis}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              سنجش وضعیت اینترنت
            </button>
          )}
        </div>
      </div>

      {/* Hero Section: Interactive Central Connect Button */}
      <div className="flex flex-col items-center justify-center py-6 relative">
        <div className="relative group">
          {/* Pulsing halo */}
          <div
            className={`absolute -inset-6 rounded-full blur-2xl transition-opacity duration-700 pointer-events-none ${
              isConnected
                ? 'bg-emerald-500/25 opacity-100 animate-pulse-slow'
                : isPending
                ? 'bg-amber-500/30 opacity-100 animate-ping'
                : 'bg-sky-500/10 opacity-40 group-hover:opacity-80'
            }`}
          ></div>

          {/* Double-Bezel Circular Button */}
          <div className="p-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl relative">
            <button
              onClick={isConnected ? onDisconnect : onConnect}
              disabled={isPending}
              className={`w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all duration-500 cursor-pointer shadow-inner-bezel ${
                isConnected
                  ? 'bg-gradient-to-b from-emerald-600 to-emerald-800 text-white shadow-glow-emerald active:scale-95'
                  : isPending
                  ? 'bg-gradient-to-b from-amber-600 to-amber-800 text-white cursor-wait'
                  : 'bg-gradient-to-b from-slate-800 to-slate-900 text-slate-300 hover:text-white hover:from-slate-700 hover:to-slate-800 shadow-glow-cyan active:scale-95'
              }`}
            >
              <Power
                className={`w-11 h-11 mb-2 transition-transform duration-500 ${
                  isConnected
                    ? 'scale-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]'
                    : isPending
                    ? 'animate-spin'
                    : 'group-hover:scale-110'
                }`}
              />
              <span className="text-xs font-bold tracking-wider">
                {isConnected ? 'قطع اتصال' : isPending ? 'در حال برقراری...' : 'اتصال هوشمند'}
              </span>
            </button>
          </div>
        </div>

        {/* Real-time duration & ping under the button */}
        <div className="flex items-center gap-6 mt-6">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>مدت اتصال:</span>
            <span className="text-white font-bold">
              {formatDuration(connection.durationSeconds)}
            </span>
          </div>

          <div className="h-3 w-px bg-white/10"></div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>تأخیر واقعی (RTT):</span>
            <span
              className={`font-bold ${
                connection.currentPingMs ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              {connection.currentPingMs ? `${connection.currentPingMs} ms` : '---'}
            </span>
          </div>
        </div>
      </div>

      {/* Bento Grid: Status & Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Traffic Monitor */}
        <div className="bezel-outer">
          <div className="bezel-inner p-4 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span className="font-semibold text-white">ترافیک لحظه‌ای</span>
              <span className="font-mono text-[11px] text-slate-500">Real-time</span>
            </div>

            <div className="grid grid-cols-2 gap-3 my-auto">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs mb-1">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>دانلود</span>
                </div>
                <div className="text-base font-bold font-mono text-white">
                  {formatBytes(connection.totalDownloadBytes)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-1.5 text-sky-400 text-xs mb-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>آپلود</span>
                </div>
                <div className="text-base font-bold font-mono text-white">
                  {formatBytes(connection.totalUploadBytes)}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-white/5 flex justify-between">
              <span>نرخ افت پکت:</span>
              <span className="font-mono text-slate-400">
                {connection.packetLoss}%
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Profile & Protocol */}
        <div className="bezel-outer">
          <div className="bezel-inner p-4 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span className="font-semibold text-white">مسیر و پروتکل فعال</span>
              <button
                onClick={onNavigateToProfiles}
                className="text-[11px] text-sky-400 hover:underline"
              >
                تغییر سرور
              </button>
            </div>

            <div className="my-auto space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Server className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-sm font-bold text-white truncate">
                    {connection.activeProfileName || 'مسیر پیش‌فرض هوشمند'}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 uppercase">
                    {connection.protocol ? connection.protocol.toUpperCase() : 'خودکار (ATS)'}
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-400 bg-white/5 p-2 rounded-lg border border-white/5">
                <span>تعداد سرورهای آماده: </span>
                <span className="font-bold text-white font-mono">{profiles.length}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-white/5 flex justify-between">
              <span>روش ضدسانسور:</span>
              <span className="text-emerald-400 font-medium">Adaptive uTLS + Reality</span>
            </div>
          </div>
        </div>

        {/* Card 3: Security & Recovery */}
        <div className="bezel-outer">
          <div className="bezel-inner p-4 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span className="font-semibold text-white">امنیت و پایداری</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="space-y-2 my-auto text-xs text-slate-300">
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span>محافظت رجیستری ویندوز:</span>
                <span className="text-emerald-400 font-bold">فعال (بازیابی امن)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span>رمزنگاری مخزن محلی:</span>
                <span className="text-sky-400 font-mono">AES-256-GCM</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>پاکسازی اطلاعات لاگ:</span>
                <span className="text-emerald-400">فعال (بدون افشا)</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-white/5 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>پراکسی ویندوز در صورت بروز خطا فوراً بازیابی می‌شود.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
