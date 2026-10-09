import React from 'react';
import { Minus, Square, X, ShieldCheck, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { ActiveConnection } from '../../types';

interface TitleBarProps {
  connection: ActiveConnection;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  connection,
  onMinimize,
  onMaximize,
  onClose,
}) => {
  const getStatusBadge = () => {
    switch (connection.state) {
      case 'connected':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <Wifi className="w-3.5 h-3.5" />
            <span>متصل ({connection.activeProfileName || 'مسیر فعال'})</span>
          </div>
        );
      case 'connecting':
      case 'verifying':
      case 'selecting_route':
      case 'diagnosing':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span>{connection.statusMessage}</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>خطا در برقراری اتصال</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700/50 text-xs font-medium">
            <WifiOff className="w-3.5 h-3.5" />
            <span>اتصال غیرفعال</span>
          </div>
        );
    }
  };

  return (
    <div className="h-11 w-full bg-rahgozar-surface/90 backdrop-blur-md border-b border-rahgozar-border flex items-center justify-between px-3 select-none app-drag z-50">
      {/* App branding */}
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center p-1 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
          رهگذر | Rahgozar
        </span>
        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
          v1.0.0-RC
        </span>
      </div>

      {/* Middle status pill */}
      <div className="flex items-center">{getStatusBadge()}</div>

      {/* Window Controls */}
      <div className="flex items-center gap-1 app-no-drag">
        <button
          onClick={onMinimize}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="کوچک‌نمایی"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={onMaximize}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="بزرگ‌نمایی"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-600 transition-colors"
          title="بستن برنامه"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
