import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  QrCode,
  Check,
  Copy,
  X,
  Server,
  Radio,
  Zap,
  Shield,
  ArrowRight,
} from 'lucide-react';
import QRCode from 'qrcode';
import { ProxyProfile, ActiveConnection } from '../types';

interface ProfilesPageProps {
  profiles: ProxyProfile[];
  connection: ActiveConnection;
  onConnect: (profileId: string) => void;
  onAddProfile: (profile: ProxyProfile) => Promise<boolean>;
  onDeleteProfile: (profileId: string) => Promise<boolean>;
  onParseConfig: (input: string) => Promise<{ success: boolean; profile?: ProxyProfile; error?: string }>;
}

export const ProfilesPage: React.FC<ProfilesPageProps> = ({
  profiles,
  connection,
  onConnect,
  onAddProfile,
  onDeleteProfile,
  onParseConfig,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'no-vps' | 'vps'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [inputConfigText, setInputConfigText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedCandidate, setParsedCandidate] = useState<ProxyProfile | null>(null);
  const [selectedProfileForQr, setSelectedProfileForQr] = useState<ProxyProfile | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const filteredProfiles = profiles.filter((p) => {
    if (activeCategory === 'all') return true;
    return p.category === activeCategory;
  });

  const handleParseInput = async (text: string) => {
    setInputConfigText(text);
    setParseError(null);
    setParsedCandidate(null);

    if (!text.trim()) return;

    const result = await onParseConfig(text);
    if (result.success && result.profile) {
      setParsedCandidate(result.profile);
    } else {
      setParseError(result.error || 'ساختار کانفیگ نامعتبر است.');
    }
  };

  const handleSaveParsed = async () => {
    if (!parsedCandidate) return;
    const success = await onAddProfile(parsedCandidate);
    if (success) {
      setIsAddModalOpen(false);
      setInputConfigText('');
      setParsedCandidate(null);
    }
  };

  const handleOpenQr = async (profile: ProxyProfile) => {
    setSelectedProfileForQr(profile);
    const uri = profile.rawUri || `${profile.protocol}://${profile.server}:${profile.port}#${encodeURIComponent(profile.name)}`;
    try {
      const dataUrl = await QRCode.toDataURL(uri, {
        width: 260,
        margin: 2,
        color: {
          dark: '#080b12',
          light: '#ffffff',
        },
      });
      setQrCodeDataUrl(dataUrl);
      setIsQrModalOpen(true);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    }
  };

  const handleCopyUri = () => {
    if (!selectedProfileForQr) return;
    const uri = selectedProfileForQr.rawUri || `${selectedProfileForQr.protocol}://${selectedProfileForQr.server}:${selectedProfileForQr.port}`;
    navigator.clipboard.writeText(uri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-2.75rem)]">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-sky-400" />
            مدیریت سرورها و مسیرهای اتصال
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            پیکربندی سرورهای اختصاصی (VPS) و روش‌های ضدسانسور بدون نیاز به سرور (مانند پل‌های تور)
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-sky-500/20 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          افزودن سرور یا پل جدید
        </button>
      </div>

      {/* Category Tabs Filter */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeCategory === 'all'
              ? 'bg-white/10 text-white font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          تمام مسیرها ({profiles.length})
        </button>
        <button
          onClick={() => setActiveCategory('no-vps')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeCategory === 'no-vps'
              ? 'bg-white/10 text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          بدون VPS شخصی (پل‌ها و رله‌ها)
        </button>
        <button
          onClick={() => setActiveCategory('vps')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeCategory === 'vps'
              ? 'bg-white/10 text-sky-400 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          سرورهای شخصی (VPS)
        </button>
      </div>

      {/* Profiles Grid */}
      {filteredProfiles.length === 0 ? (
        <div className="bezel-outer text-center py-12">
          <div className="bezel-inner p-8">
            <Server className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-300">هیچ کانفیگی در این بخش یافت نشد.</p>
            <p className="text-xs text-slate-500 mt-1">
              با کلیک روی «افزودن سرور یا پل جدید» می‌توانید لینک کانفیگ خود را وارد کنید.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProfiles.map((profile) => {
            const isActive = connection.activeProfileId === profile.id;
            return (
              <div key={profile.id} className="bezel-outer group">
                <div
                  className={`bezel-inner p-4 transition-all duration-300 ${
                    isActive
                      ? 'border-sky-500/40 bg-sky-950/20'
                      : 'hover:border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-xs uppercase ${
                          profile.category === 'no-vps'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        }`}
                      >
                        {profile.protocol}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                          {profile.name}
                        </h3>
                        <p className="text-xs font-mono text-slate-400 mt-0.5">
                          {profile.server}:{profile.port}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenQr(profile)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="نمایش QR Code و کپی لینک"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteProfile(profile.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="حذف کانفیگ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Attributes Pills */}
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/5 text-[11px] font-mono">
                    {profile.security && (
                      <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-sky-400" />
                        {profile.security.toUpperCase()}
                      </span>
                    )}
                    {profile.sni && (
                      <span className="px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5 truncate max-w-[160px]">
                        SNI: {profile.sni}
                      </span>
                    )}
                    {profile.torBridgeType && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                        پل {profile.torBridgeType}
                      </span>
                    )}
                  </div>

                  {/* Action Connect Button */}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      نرخ پایداری: {profile.successRate}%
                    </span>

                    <button
                      onClick={() => onConnect(profile.id)}
                      disabled={isActive}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-400 cursor-default border border-emerald-500/30'
                          : 'bg-white/5 hover:bg-sky-500 hover:text-white text-slate-300 border border-white/10 active:scale-95'
                      }`}
                    >
                      {isActive ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          متصل
                        </>
                      ) : (
                        <>
                          اتصال مستقیم
                          <ArrowRight className="w-3 h-3 rotate-180" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Config Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bezel-outer w-full max-w-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="bezel-inner p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-sky-400" />
                  افزودن سرور اختصاصی یا پل جدید
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  متن لینک کانفیگ یا پل تور:
                </label>
                <textarea
                  value={inputConfigText}
                  onChange={(e) => handleParseInput(e.target.value)}
                  rows={4}
                  placeholder="پروتکل‌های پشتیبانی‌شده: vless://, vmess://, trojan://, hysteria2://, ss://, bridge snowflake..."
                  className="w-full rounded-xl bg-rahgozar-bg border border-white/10 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                  dir="ltr"
                />
              </div>

              {parseError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  {parseError}
                </div>
              )}

              {parsedCandidate && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-emerald-400">
                    <span>کانفیگ با موفقیت شناسایی و تایید شد</span>
                    <span className="uppercase font-mono">{parsedCandidate.protocol}</span>
                  </div>
                  <div className="text-slate-300">
                    <span>نام: </span>
                    <span className="font-bold text-white">{parsedCandidate.name}</span>
                  </div>
                  <div className="text-slate-300 font-mono">
                    <span>مقصد: </span>
                    <span>{parsedCandidate.server}:{parsedCandidate.port}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5"
                >
                  انصراف
                </button>
                <button
                  onClick={handleSaveParsed}
                  disabled={!parsedCandidate}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-sky-500/20 transition-all"
                >
                  ذخیره کانفیگ در رهگذر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Sharing Modal */}
      {isQrModalOpen && selectedProfileForQr && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bezel-outer w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="bezel-inner p-6 flex flex-col items-center text-center space-y-4">
              <div className="w-full flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-sm font-bold text-white">اشتراک‌گذاری کانفیگ</h3>
                <button
                  onClick={() => setIsQrModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {qrCodeDataUrl && (
                <div className="p-3 bg-white rounded-2xl shadow-xl">
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code"
                    className="w-56 h-56 rounded-lg"
                  />
                </div>
              )}

              <div>
                <p className="text-sm font-bold text-white">{selectedProfileForQr.name}</p>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  {selectedProfileForQr.protocol.toUpperCase()} • {selectedProfileForQr.server}
                </p>
              </div>

              <button
                onClick={handleCopyUri}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'لینک کپی شد' : 'کپی لینک کانفیگ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
