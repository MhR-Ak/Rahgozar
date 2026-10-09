import React from 'react';
import {
  LayoutDashboard,
  Server,
  Activity,
  Bot,
  History,
  Terminal,
  Settings,
  BookOpen,
  Zap,
} from 'lucide-react';
import { ActiveConnection } from '../../types';

export type TabType =
  | 'dashboard'
  | 'profiles'
  | 'diagnosis'
  | 'live'
  | 'history'
  | 'logs'
  | 'settings'
  | 'about';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  connection: ActiveConnection;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  connection,
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'پیشخوان هوشمند', icon: LayoutDashboard },
    { id: 'profiles', label: 'سرورها و کانفیگ‌ها', icon: Server },
    { id: 'diagnosis', label: 'عیب‌یابی شبکه', icon: Activity },
    { id: 'live', label: 'دستیار زنده وضعیت', icon: Bot },
    { id: 'history', label: 'تاریخچه و آمار', icon: History },
    { id: 'logs', label: 'گزارش وقایع و لاگ', icon: Terminal },
    { id: 'settings', label: 'تنظیمات و هسته', icon: Settings },
    { id: 'about', label: 'مستندات و درباره', icon: BookOpen },
  ];

  return (
    <aside className="w-64 h-[calc(100vh-2.75rem)] bg-rahgozar-surface/60 backdrop-blur-xl border-l border-rahgozar-border flex flex-col justify-between p-3 select-none">
      {/* Navigation Links */}
      <nav className="space-y-1 mt-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as TabType)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              {isActive && (
                <span className="absolute -right-3 top-2 bottom-2 w-1 rounded-l-full bg-sky-400"></span>
              )}
              <Icon
                className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'text-sky-400' : 'text-slate-400'
                }`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Mini Card */}
      <div className="bezel-outer mt-auto">
        <div className="bezel-inner p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5 font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              حالت مسیریابی
            </span>
            <span className="font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-[11px] text-sky-400 border border-white/5">
              {connection.mode === 'tun' ? 'TUN Stack' : 'System Proxy'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500">پینگ کنونی:</span>
            <span
              className={
                connection.currentPingMs && connection.currentPingMs > 0
                  ? 'text-emerald-400 font-bold'
                  : 'text-slate-500'
              }
            >
              {connection.currentPingMs && connection.currentPingMs > 0
                ? `${connection.currentPingMs} ms`
                : '---'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
