import React, { useState, useEffect } from 'react';
import { History as HistoryIcon, Clock, ArrowDownLeft, ArrowUpRight, CheckCircle2, RotateCw } from 'lucide-react';

interface HistoryRecord {
  id: string;
  profileId: string | null;
  profileName: string | null;
  protocol: string | null;
  connectedAt: number;
  disconnectedAt: number;
  durationSeconds: number;
  bytesUploaded: number;
  bytesDownloaded: number;
  avgPingMs: number;
  disconnectReason: string;
}

export const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    setLoading(true);
    try {
      if (window.rahgozarApi?.getHistory) {
        const records = await window.rahgozarApi.getHistory();
        setHistory(records || []);
      } else {
        // Mock fallback
        setHistory([
          {
            id: '1',
            profileId: 'demo-1',
            profileName: 'سرور اختصاصی VLESS Reality (آلمان)',
            protocol: 'vless',
            connectedAt: Date.now() - 3600000,
            disconnectedAt: Date.now() - 1800000,
            durationSeconds: 1800,
            bytesUploaded: 45000000,
            bytesDownloaded: 280000000,
            avgPingMs: 78,
            disconnectReason: 'درخواست کاربر',
          },
          {
            id: '2',
            profileId: 'demo-2',
            profileName: 'پل تور Snowflake (بدون VPS)',
            protocol: 'tor',
            connectedAt: Date.now() - 7200000,
            disconnectedAt: Date.now() - 5400000,
            durationSeconds: 1800,
            bytesUploaded: 8000000,
            bytesDownloaded: 32000000,
            avgPingMs: 195,
            disconnectReason: 'درخواست کاربر',
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load connection history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const totalBytes = history.reduce((acc, h) => acc + h.bytesUploaded + h.bytesDownloaded, 0);
  const totalDuration = history.reduce((acc, h) => acc + h.durationSeconds, 0);

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-2.75rem)]">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-sky-400" />
            تاریخچه اتصالات و آمار مصرف
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            گزارش نشست‌های اتصال قبلی و حجم ترافیک تبادل‌شده در شبکه
          </p>
        </div>

        <button
          onClick={loadHistory}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title="تازه‌سازی"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bezel-outer">
          <div className="bezel-inner p-4">
            <span className="text-xs text-slate-400">تعداد نشست‌های اتصال:</span>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {history.length}
            </div>
          </div>
        </div>

        <div className="bezel-outer">
          <div className="bezel-inner p-4">
            <span className="text-xs text-slate-400">مجموع ترافیک مصرفی:</span>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {formatBytes(totalBytes)}
            </div>
          </div>
        </div>

        <div className="bezel-outer">
          <div className="bezel-inner p-4">
            <span className="text-xs text-slate-400">مجموع زمان آنلاین:</span>
            <div className="text-xl font-bold font-mono text-sky-400 mt-1">
              {Math.floor(totalDuration / 60)} دقیقه
            </div>
          </div>
        </div>
      </div>

      {/* History Table */}
      {history.length === 0 ? (
        <div className="bezel-outer text-center py-16">
          <div className="bezel-inner p-8">
            <HistoryIcon className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-300">هنوز سابقه اتصالی ثبت نشده است.</p>
          </div>
        </div>
      ) : (
        <div className="bezel-outer">
          <div className="bezel-inner p-4 overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-white/5 text-slate-400">
                  <th className="pb-3 font-semibold">سرور و مسیر</th>
                  <th className="pb-3 font-semibold">پروتکل</th>
                  <th className="pb-3 font-semibold">مدت اتصال</th>
                  <th className="pb-3 font-semibold">آپلود / دانلود</th>
                  <th className="pb-3 font-semibold">میانگین پینگ</th>
                  <th className="pb-3 font-semibold">علت قطع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 font-sans font-medium text-white">
                      {record.profileName || 'مسیر نامشخص'}
                    </td>
                    <td className="py-3 uppercase text-sky-400">
                      {record.protocol || '---'}
                    </td>
                    <td className="py-3 text-slate-300">
                      {Math.floor(record.durationSeconds / 60)}m {record.durationSeconds % 60}s
                    </td>
                    <td className="py-3 text-slate-300">
                      {formatBytes(record.bytesUploaded)} / {formatBytes(record.bytesDownloaded)}
                    </td>
                    <td className="py-3 text-emerald-400">
                      {record.avgPingMs > 0 ? `${record.avgPingMs} ms` : '---'}
                    </td>
                    <td className="py-3 font-sans text-slate-400">
                      {record.disconnectReason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
