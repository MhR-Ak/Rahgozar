import React, { useState } from 'react';
import {
  Bot,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Terminal,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { LiveEvent } from '../types';

interface LiveStatusPageProps {
  events: LiveEvent[];
}

export const LiveStatusPage: React.FC<LiveStatusPageProps> = ({ events }) => {
  const [explanationLevel, setExplanationLevel] = useState<'simple' | 'detailed' | 'expert'>('simple');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredEvents = events.filter((e) => {
    if (selectedCategory === 'all') return true;
    return e.category === selectedCategory;
  });

  const getEventIcon = (level: LiveEvent['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-rose-400" />;
      default:
        return <Info className="w-5 h-5 text-sky-400" />;
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-2.75rem)]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-sky-400" />
            دستیار زنده و گزارش وضعیت لحظه‌ای
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            پایش دقیق تمامی اقدامات رهگذر با ۳ سطح توضیح متفاوت (از کاربر عادی تا متخصص شبکه)
          </p>
        </div>

        {/* Level Selector Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-white/5">
          <button
            onClick={() => setExplanationLevel('simple')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              explanationLevel === 'simple'
                ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            کاربر مبتدی
          </button>
          <button
            onClick={() => setExplanationLevel('detailed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              explanationLevel === 'detailed'
                ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            درک علت و جزئیات
          </button>
          <button
            onClick={() => setExplanationLevel('expert')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              explanationLevel === 'expert'
                ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            گزارش تخصصی
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-2 text-xs">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-2.5 py-1 rounded-lg ${
            selectedCategory === 'all' ? 'bg-white/10 text-white font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          همه وقایع ({events.length})
        </button>
        <button
          onClick={() => setSelectedCategory('routing')}
          className={`px-2.5 py-1 rounded-lg ${
            selectedCategory === 'routing' ? 'bg-white/10 text-sky-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          مسیریابی و اتصال
        </button>
        <button
          onClick={() => setSelectedCategory('diagnosis')}
          className={`px-2.5 py-1 rounded-lg ${
            selectedCategory === 'diagnosis' ? 'bg-white/10 text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          عیب‌یابی شبکه
        </button>
        <button
          onClick={() => setSelectedCategory('engine')}
          className={`px-2.5 py-1 rounded-lg ${
            selectedCategory === 'engine' ? 'bg-white/10 text-purple-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          موتور و هسته
        </button>
        <button
          onClick={() => setSelectedCategory('system')}
          className={`px-2.5 py-1 rounded-lg ${
            selectedCategory === 'system' ? 'bg-white/10 text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          سیستم و رجیستری
        </button>
      </div>

      {/* Events Timeline */}
      {filteredEvents.length === 0 ? (
        <div className="bezel-outer text-center py-16">
          <div className="bezel-inner p-8">
            <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-300">هیچ رویدادی در این دسته‌بندی ثبت نشده است.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <div key={event.id} className="bezel-outer">
              <div className="bezel-inner p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {getEventIcon(event.level)}
                    <div>
                      <h3 className="text-sm font-bold text-white">{event.title}</h3>
                      <p className="text-[11px] font-mono text-slate-500">
                        {new Date(event.timestamp).toLocaleTimeString('fa-IR')} • دسته‌بندی: {event.category}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase border ${
                      event.level === 'error'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : event.level === 'warning'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}
                  >
                    {event.level}
                  </span>
                </div>

                {/* Level 1: Simple (Beginner) */}
                {explanationLevel === 'simple' && (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-200 leading-relaxed">
                    {event.explanationSimple}
                  </div>
                )}

                {/* Level 2: Detailed (Cause & Mechanism) */}
                {explanationLevel === 'detailed' && (
                  <div className="space-y-2 text-xs">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-slate-200 leading-relaxed">
                      <p className="font-semibold text-sky-400 mb-1">علت و سازوکار رویداد:</p>
                      <p>{event.explanationDetailed}</p>
                    </div>
                    {event.actionTaken && (
                      <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300">
                        <span className="font-semibold">اقدام خودکار برنامه: </span>
                        {event.actionTaken}
                      </div>
                    )}
                    {event.userRemedy && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 flex-shrink-0" />
                        <span>راهکار کاربر: {event.userRemedy}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Level 3: Expert (Raw log & socket data) */}
                {explanationLevel === 'expert' && (
                  <div className="p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-emerald-400 leading-relaxed overflow-x-auto" dir="ltr">
                    <p className="text-slate-500 text-[10px] mb-1">RAW EVENT PAYLOAD & SOCKET STATUS:</p>
                    <p>{event.explanationExpert}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
