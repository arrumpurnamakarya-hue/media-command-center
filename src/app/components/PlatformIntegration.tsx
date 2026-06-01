"use client";
import React, { useEffect, useMemo, useState } from 'react';
import {
  Link,
  Loader2,
  Plug,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

type SocialAccount = {
  id: string;
  platform: string;
  open_id?: string | null;
  account_name?: string | null;
  account_id?: string | null;
  token_expires_at?: string | null;
  refresh_token_expires_at?: string | null;
  source?: string | null;
  permissions?: string[] | null;
  status?: string | null;
  connected_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type PlatformIntegrationProps = {
  isDarkMode?: boolean;
  onInsightsSynced?: () => void | Promise<void>;
};

type PlatformCardConfig = {
  platform: string;
  name: string;
  provider: 'meta' | 'tiktok' | 'coming-soon';
  accent: string;
};

type TikTokSummary = {
  totalVideos: number;
  totalViews: number;
  totalEngagement: number;
  lastSync: string | null;
};

const PLATFORM_CARDS: PlatformCardConfig[] = [
  { platform: 'IG', name: 'Instagram Business', provider: 'meta', accent: 'text-pink-400' },
  { platform: 'FB', name: 'Facebook Page', provider: 'meta', accent: 'text-blue-400' },
  { platform: 'TIKTOK', name: 'TikTok', provider: 'tiktok', accent: 'text-rose-400' },
  { platform: 'X', name: 'X / Twitter', provider: 'coming-soon', accent: 'text-gray-300' },
  { platform: 'YT', name: 'YouTube Shorts', provider: 'coming-soon', accent: 'text-red-400' },
];

const getStatusLabel = (account: SocialAccount | undefined, provider: PlatformCardConfig['provider']) => {
  if (provider === 'coming-soon') return 'Coming Soon';
  if (account?.status === 'connected') return 'Connected';
  return 'Not Connected';
};

const getStatusClass = (status: string, isDarkMode: boolean) => {
  if (status === 'Connected') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (status === 'Coming Soon') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  return isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-600 border-gray-200';
};

const buildSyncErrorMessage = (payload: Record<string, any> | null, rawText: string) => {
  if (!payload || Object.keys(payload).length === 0) {
    return rawText
      ? `API route error. Cek terminal Next.js.\n${rawText}`
      : 'API route error. Cek terminal Next.js.';
  }

  const parts = [
    payload.message,
    payload.failed_step ? `Step: ${payload.failed_step}` : '',
    payload.error_message ? `Error: ${payload.error_message}` : '',
    payload.meta_error_message ? `Meta: ${payload.meta_error_message}` : '',
    payload.debug ? `Debug: ${payload.debug}` : '',
  ].filter(Boolean);

  return parts.join('\n') || 'Sync insight gagal.';
};

export default function PlatformIntegration({ isDarkMode = true, onInsightsSynced }: PlatformIntegrationProps) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isSyncingInsights, setIsSyncingInsights] = useState(false);
  const [isSyncingInstagramInsights, setIsSyncingInstagramInsights] = useState(false);
  const [isSyncingTikTokInsights, setIsSyncingTikTokInsights] = useState(false);
  const [isRefreshingTikTokToken, setIsRefreshingTikTokToken] = useState(false);
  const [tiktokSummary, setTikTokSummary] = useState<TikTokSummary>({
    totalVideos: 0,
    totalViews: 0,
    totalEngagement: 0,
    lastSync: null,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cardClass = isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200';
  const innerClass = isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900';
  const titleText = isDarkMode ? 'text-white' : 'text-gray-900';
  const mutedText = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  const accountsByPlatform = useMemo(() => {
    return accounts.reduce((acc, account) => {
      acc[account.platform] = account;
      return acc;
    }, {} as Record<string, SocialAccount>);
  }, [accounts]);

  const fetchAccounts = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from('social_accounts')
        .select('id, platform, open_id, account_name, account_id, token_expires_at, refresh_token_expires_at, source, permissions, status, connected_at, created_at, updated_at')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAccounts((data || []) as SocialAccount[]);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Gagal memuat data integrasi platform.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTikTokSummary = async () => {
    try {
      const { data, error, count } = await supabase
        .from('post_insights')
        .select('views, impressions, engagement, synced_at', { count: 'exact' })
        .eq('platform', 'TIKTOK')
        .eq('source', 'tiktok_api');

      if (error) throw error;

      const rows = data || [];
      const totalViews = rows.reduce((sum, row: any) => sum + Number(row.views || row.impressions || 0), 0);
      const totalEngagement = rows.reduce((sum, row: any) => sum + Number(row.engagement || 0), 0);
      const lastSync = rows
        .map((row: any) => row.synced_at)
        .filter(Boolean)
        .sort()
        .at(-1) || null;

      setTikTokSummary({
        totalVideos: Number(count || rows.length || 0),
        totalViews,
        totalEngagement,
        lastSync,
      });
    } catch (error) {
      console.warn('Ringkasan TikTok belum tersedia:', error);
      setTikTokSummary({
        totalVideos: 0,
        totalViews: 0,
        totalEngagement: 0,
        lastSync: null,
      });
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchTikTokSummary();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const metaStatus = params.get('meta');
    const metaMessage = params.get('message');

    if (metaStatus === 'success') {
      setMessage('Meta OAuth berhasil. Akun Facebook/Instagram diperbarui.');
      return;
    }

    if (metaStatus === 'success_fb_publish') {
      setMessage('Facebook Page siap untuk publish otomatis.');
      return;
    }

    if (metaStatus === 'success_fb_only') {
      setMessage('Facebook Page berhasil terhubung. Instagram akan dikonfigurasi setelah permission IG aktif.');
      return;
    }

    if (metaStatus === 'error') {
      setErrorMessage(metaMessage || 'Meta OAuth gagal.');
    }

    const tiktokStatus = params.get('tiktok');
    const tiktokMessage = params.get('message');

    if (tiktokStatus === 'success') {
      setMessage(tiktokMessage || 'TikTok berhasil terhubung.');
    }

    if (tiktokStatus === 'error') {
      setErrorMessage(tiktokMessage || 'TikTok OAuth gagal.');
    }
  }, []);

  const handleConnectPlaceholder = (platform: PlatformCardConfig) => {
    setErrorMessage(null);
    setMessage(null);

    if (platform.provider === 'meta') {
      window.location.href = '/api/auth/meta/start';
      return;
    }

    if (platform.provider === 'tiktok') {
      window.location.href = '/api/tiktok/oauth/start';
      return;
    }

    setMessage('Coming Soon.');
  };

  const handleSyncFacebookInsights = async () => {
    setIsSyncingInsights(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await fetch('/api/meta/sync/facebook-insights', {
        method: 'POST',
      });
      const responseText = await response.text();
      let payload: Record<string, any> | null = null;

      try {
        payload = responseText ? JSON.parse(responseText) : null;
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.ok) {
        setErrorMessage(buildSyncErrorMessage(payload, responseText));
        return;
      }

      setMessage(payload?.warning
        ? `${payload?.message || 'Data Facebook berhasil disinkronkan.'} Catatan: ${payload.warning}`
        : payload?.message || 'Insight Facebook berhasil disinkronkan.');
      await fetchAccounts();
      await onInsightsSynced?.();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Sync insight Facebook gagal.');
    } finally {
      setIsSyncingInsights(false);
    }
  };

  const handleSyncInstagramInsights = async () => {
    setIsSyncingInstagramInsights(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await fetch('/api/meta/sync/instagram-insights', {
        method: 'POST',
      });
      const responseText = await response.text();
      let payload: Record<string, any> | null = null;

      try {
        payload = responseText ? JSON.parse(responseText) : null;
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.ok) {
        setErrorMessage(buildSyncErrorMessage(payload, responseText));
        return;
      }

      setMessage(payload?.message || 'Insight Instagram berhasil disinkronkan.');
      await fetchAccounts();
      await onInsightsSynced?.();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Sync insight Instagram gagal.');
    } finally {
      setIsSyncingInstagramInsights(false);
    }
  };

  const handleSyncTikTokInsights = async () => {
    setIsSyncingTikTokInsights(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await fetch('/api/tiktok/sync-insights', {
        method: 'POST',
      });
      const responseText = await response.text();
      let payload: Record<string, any> | null = null;

      try {
        payload = responseText ? JSON.parse(responseText) : null;
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.ok) {
        setErrorMessage(buildSyncErrorMessage(payload, responseText));
        return;
      }

      setMessage(`${payload?.message || 'Insight TikTok berhasil disinkronkan.'} Video: ${payload?.videos_synced || 0}.`);
      await fetchAccounts();
      await fetchTikTokSummary();
      await onInsightsSynced?.();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Sync insight TikTok gagal.');
    } finally {
      setIsSyncingTikTokInsights(false);
    }
  };

  const handleRefreshTikTokToken = async () => {
    setIsRefreshingTikTokToken(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await fetch('/api/tiktok/oauth/refresh', {
        method: 'POST',
      });
      const responseText = await response.text();
      let payload: Record<string, any> | null = null;

      try {
        payload = responseText ? JSON.parse(responseText) : null;
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.ok) {
        setErrorMessage(buildSyncErrorMessage(payload, responseText));
        return;
      }

      setMessage(payload?.message || 'Token TikTok berhasil direfresh.');
      await fetchAccounts();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Refresh token TikTok gagal.');
    } finally {
      setIsRefreshingTikTokToken(false);
    }
  };

  const handleDisconnect = async (account: SocialAccount) => {
    if (!window.confirm(`Putuskan integrasi ${account.account_name || account.platform}?`)) return;

    setIsUpdating(account.platform);
    setErrorMessage(null);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('social_accounts')
        .update({
          account_name: null,
          account_id: null,
          open_id: null,
          access_token: null,
          refresh_token: null,
          token_expires_at: null,
          refresh_token_expires_at: null,
          source: null,
          metadata: {},
          permissions: [],
          status: 'not_connected',
          connected_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', account.id);

      if (error) throw error;

      setAccounts(prev => prev.map(item => item.id === account.id ? {
        ...item,
        account_name: null,
        account_id: null,
        open_id: null,
        token_expires_at: null,
        refresh_token_expires_at: null,
        source: null,
        permissions: [],
        status: 'not_connected',
        connected_at: null,
        updated_at: new Date().toISOString(),
      } : item));
      setMessage('Integrasi berhasil diputus.');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Gagal memutus integrasi.');
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn relative font-inter">
      <div className={`p-6 md:p-8 rounded-[35px] border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${cardClass}`}>
        <div>
          <h2 className={`text-2xl font-black uppercase tracking-tight flex items-center gap-3 ${titleText}`}>
            <Plug className="text-[#008234]" size={26} />
            Integrasi Platform
          </h2>
          <p className={`text-[10px] font-black uppercase tracking-widest mt-2 ${mutedText}`}>
            Fondasi koneksi API sosial media
          </p>
        </div>
        <div className={`px-4 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${innerClass}`}>
          <ShieldCheck size={14} className="text-[#008234]" />
          Token disembunyikan
        </div>
      </div>

      {(message || errorMessage) && (
        <div className={`p-4 rounded-2xl border text-[11px] font-bold leading-relaxed whitespace-pre-line ${
          errorMessage
            ? isDarkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
            : isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {errorMessage || message}
        </div>
      )}

      {isLoading ? (
        <div className={`h-80 rounded-[30px] border flex items-center justify-center ${cardClass}`}>
          <Loader2 size={28} className="animate-spin text-[#008234]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {PLATFORM_CARDS.map(platform => {
            const account = accountsByPlatform[platform.platform];
            const statusLabel = getStatusLabel(account, platform.provider);
            const isConnected = statusLabel === 'Connected';
            const isComingSoon = statusLabel === 'Coming Soon';
            const isFacebook = platform.platform === 'FB';
            const isInstagram = platform.platform === 'IG';
            const isTikTok = platform.platform === 'TIKTOK';
            const canSyncInstagram = isInstagram && (
              isConnected || accountsByPlatform.FB?.status === 'connected'
            );

            return (
              <article key={platform.platform} className={`rounded-[30px] border shadow-sm overflow-hidden ${cardClass}`}>
                <div className="p-5 border-b border-gray-500/10 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className={`text-sm font-black uppercase tracking-widest ${titleText}`}>{platform.name}</h3>
                    <p className={`text-[10px] font-bold mt-1 ${mutedText}`}>
                      {platform.provider === 'meta'
                        ? 'Meta API siap dikonfigurasi'
                        : platform.provider === 'tiktok' ? 'TikTok Display API untuk insight publik' : 'Coming Soon'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-2xl bg-black/10 ${platform.accent}`}>
                    <Link size={18} />
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest ${getStatusClass(statusLabel, isDarkMode)}`}>
                    {statusLabel}
                  </span>

                  <div className={`p-4 rounded-2xl border ${innerClass}`}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Account</p>
                    <p className={`mt-1 text-xs font-bold truncate ${titleText}`}>{account?.account_name || '-'}</p>
                  </div>

                  {isTikTok && (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Videos', value: tiktokSummary.totalVideos.toLocaleString('id-ID') },
                        { label: 'Views', value: tiktokSummary.totalViews.toLocaleString('id-ID') },
                        { label: 'Eng.', value: tiktokSummary.totalEngagement.toLocaleString('id-ID') },
                      ].map(item => (
                        <div key={item.label} className={`p-3 rounded-2xl border text-center ${innerClass}`}>
                          <p className={`text-sm font-black ${titleText}`}>{item.value}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-gray-500">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className={`p-4 rounded-2xl border ${innerClass}`}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{isTikTok ? 'Last Sync / Token Expires' : 'Token Expires'}</p>
                    <p className={`mt-1 text-xs font-bold ${titleText}`}>
                      {isTikTok && tiktokSummary.lastSync
                        ? `Sync: ${new Date(tiktokSummary.lastSync).toLocaleString('id-ID')}`
                        : account?.token_expires_at ? new Date(account.token_expires_at).toLocaleString('id-ID') : '-'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleConnectPlaceholder(platform)}
                      disabled={isComingSoon}
                      className="py-3 rounded-xl bg-[#008234] hover:bg-[#006b2a] disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-70 text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <Plug size={14} />
                      Connect
                    </button>
                    <button
                      type="button"
                      onClick={() => account && handleDisconnect(account)}
                      disabled={!isConnected || !account || isUpdating === platform.platform}
                      className={`py-3 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                        isConnected
                          ? isDarkMode ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10' : 'border-rose-200 text-rose-600 hover:bg-rose-50'
                          : isDarkMode ? 'border-gray-800 text-gray-600 cursor-not-allowed' : 'border-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isUpdating === platform.platform ? <Loader2 size={14} className="animate-spin" /> : <Unplug size={14} />}
                      Disconnect
                    </button>
                  </div>

                  {isFacebook && (
                    <button
                      type="button"
                      onClick={handleSyncFacebookInsights}
                      disabled={!isConnected || isSyncingInsights}
                      className={`w-full py-3 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                        isConnected
                          ? isDarkMode ? 'border-blue-500/30 text-blue-300 hover:bg-blue-500/10' : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                          : isDarkMode ? 'border-gray-800 text-gray-600 cursor-not-allowed' : 'border-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isSyncingInsights ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Sync Insight Facebook
                    </button>
                  )}

                  {isInstagram && (
                    <button
                      type="button"
                      onClick={handleSyncInstagramInsights}
                      disabled={!canSyncInstagram || isSyncingInstagramInsights}
                      className={`w-full py-3 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                        canSyncInstagram
                          ? isDarkMode ? 'border-pink-500/30 text-pink-300 hover:bg-pink-500/10' : 'border-pink-200 text-pink-700 hover:bg-pink-50'
                          : isDarkMode ? 'border-gray-800 text-gray-600 cursor-not-allowed' : 'border-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isSyncingInstagramInsights ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Sync Insight Instagram
                    </button>
                  )}

                  {isTikTok && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={handleSyncTikTokInsights}
                        disabled={!isConnected || isSyncingTikTokInsights}
                        className={`py-3 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                          isConnected
                            ? isDarkMode ? 'border-rose-500/30 text-rose-300 hover:bg-rose-500/10' : 'border-rose-200 text-rose-700 hover:bg-rose-50'
                            : isDarkMode ? 'border-gray-800 text-gray-600 cursor-not-allowed' : 'border-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {isSyncingTikTokInsights ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Sync TikTok Insights
                      </button>
                      <button
                        type="button"
                        onClick={handleRefreshTikTokToken}
                        disabled={!isConnected || isRefreshingTikTokToken}
                        className={`py-3 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                          isConnected
                            ? isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                            : isDarkMode ? 'border-gray-800 text-gray-600 cursor-not-allowed' : 'border-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {isRefreshingTikTokToken ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Refresh Token
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
