import React, { useState } from 'react';
import { Terminal, Download, Search, Trash2, Filter } from 'lucide-react';
import { LiveEvent } from '../types';

interface LogsPageProps {
  events: LiveEvent[];
}

export const LogsPage: React.FC<LogsPageProps> = ({ events }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const filteredLogs = events.filter((e) => {
    if (selectedLevel !== 'all' && e.level !== selectedLevel) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        e.title.toLowerCase().includes(term) ||
        e.explanationSimple.toLowerCase().includes(term) ||
        e.explanationExpert.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `rahgozar_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-2.75rem)]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-sky-400" />
            گزارش رویدادها و لاگ‌های سیستمی
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            لاگ‌های زمان‌دار، قابل جست‌وجو و کاملاً پاکسازی‌شده (بدون افشای رمزها یا اطلاعات حساس)
          </p>
        </div>

        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center gap-2 border border-white/10 transition-colors"
        >
          <Download className="w-4 h-4 text-sky-400" />
          خروجی لاگ‌ها (JSON)
        </button>
      </div>

      {/* Search & Level Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جست‌وجو در لاگ‌ها و خطاها..."
            className="w-full rounded-xl bg-rahgozar-surface border border-white/10 pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs w-full sm:w-auto justify-end">
          {['all', 'info', 'success', 'warning', 'error'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`px-2.5 py-1.5 rounded-lg uppercase font-mono text-[11px] transition-colors ${
                selectedLevel === lvl
                  ? 'bg-sky-500 text-white font-bold'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal View Container */}
      <div className="bezel-outer">
        <div className="bezel-inner p-4 bg-black/70 font-mono text-xs overflow-x-auto space-y-2.5 max-h-[500px]">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-500 text-center py-10">
              هیچ لاگی منطبق با جست‌وجوی شما پیدا نشد.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const timeStr = new Date(log.timestamp).toLocaleTimeString('fa-IR');
              let color = 'text-slate-300';
              if (log.level === 'error') color = 'text-rose-400';
              if (log.level === 'warning') color = 'text-amber-400';
              if (log.level === 'success') color = 'text-emerald-400';
              if (log.level === 'info') color = 'text-sky-300';

              return (
                <div key={log.id} className="leading-relaxed border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-500">[{timeStr}]</span>
                    <span className={`uppercase font-bold ${color}`}>[{log.level}]</span>
                    <span className="text-slate-400">[{log.category}]</span>
                    <span className="font-sans font-medium text-white">{log.title}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 font-sans pl-4">
                    {log.explanationSimple}
                  </div>
                  {log.explanationExpert && (
                    <div className="text-[10px] text-slate-500 pl-4 mt-0.5 truncate" dir="ltr">
                      &gt; {log.explanationExpert}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
