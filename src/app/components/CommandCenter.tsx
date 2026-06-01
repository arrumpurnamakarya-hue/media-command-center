"use client";
import { useAuth } from '../contexts/AuthContext';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  LayoutDashboard, UploadCloud, CalendarDays, FileText, Menu, X, FolderOpen, Plug,
  Globe, Sparkles, Sun, Moon, LogOut, Bell, Search, Loader2, CheckSquare,
  Eye, MousePointer2, Send, ChevronRight, Languages, Flame, Activity, TrendingUp, TrendingDown, Edit2, Trash2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import TargetTracker from './TargetTracker';
import MonthlyGoals from './MonthlyGoals';
import RecapForm from './RecapForm';
import Reports from './Reports';
import PlanningForm from './PlanningForm';
import Jobdesk from './Jobdesk';
import DesktopNotificationBridge from './DesktopNotificationBridge';
import ContentLibrary from './ContentLibrary';
import PlatformIntegration from './PlatformIntegration';

const BrandIcons = {
  Web: () => <Globe className="w-5 h-5 text-blue-400" />,
  IG: () => <svg className="w-5 h-5 text-[#E4405F]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>,
  FB: () => <svg className="w-5 h-5 text-[#1877F2] fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  TikTok: () => <svg className="w-5 h-5 text-rose-600 fill-current" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>,
  X: () => <svg className="w-4 h-4 text-gray-200 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  YT: () => <svg className="w-5 h-5 text-[#FF0000] fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
};

const META_DATA_START_DATE = '2026-04-06';
const META_TIMEZONE = 'Asia/Jakarta';
const OFFICIAL_API_SOURCES = ['meta_api', 'tiktok_api', 'x_api', 'youtube_api'];
const SOCIAL_PLATFORM_VALUES = [
  'FB', 'fb', 'FACEBOOK', 'Facebook', 'facebook',
  'IG', 'ig', 'INSTAGRAM', 'Instagram', 'instagram',
  'TIKTOK', 'TikTok', 'tiktok',
  'X', 'x', 'TWITTER', 'Twitter', 'twitter', 'X/Twitter', 'X / Twitter',
  'YT', 'yt', 'YOUTUBE', 'YouTube', 'youtube', 'YOUTUBE SHORTS', 'YouTube Shorts', 'youtube shorts', 'YOUTUBE_SHORTS', 'YT SHORTS', 'YT Shorts',
];

type SocialPlatformKey = 'fb' | 'ig' | 'tiktok' | 'x' | 'yt';

const getSocialPlatformKey = (platform?: string | null): SocialPlatformKey | null => {
  const cleanPlatform = String(platform || '').trim().toUpperCase();

  if (cleanPlatform === 'FB' || cleanPlatform === 'FACEBOOK') return 'fb';
  if (cleanPlatform === 'IG' || cleanPlatform === 'INSTAGRAM') return 'ig';
  if (cleanPlatform === 'TIKTOK') return 'tiktok';
  if (cleanPlatform === 'X' || cleanPlatform === 'TWITTER' || cleanPlatform === 'X/TWITTER' || cleanPlatform === 'X / TWITTER') return 'x';
  if (cleanPlatform === 'YT' || cleanPlatform === 'YOUTUBE' || cleanPlatform === 'YOUTUBE SHORTS' || cleanPlatform === 'YOUTUBE_SHORTS' || cleanPlatform === 'YT SHORTS') return 'yt';

  return null;
};

const getMetricViewsValue = (row: PlatformMetricRow) => Number(row.impressions || 0);
const getMetricReachValue = (row: PlatformMetricRow) => Number(row.reach || 0);

const getDateInTimezone = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: META_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find(part => part.type === 'year')?.value || '2026';
  const month = parts.find(part => part.type === 'month')?.value || '01';
  const day = parts.find(part => part.type === 'day')?.value || '01';

  return `${year}-${month}-${day}`;
};

const getMetaDataRange = () => {
  const todayDate = getDateInTimezone();
  const start = new Date(`${META_DATA_START_DATE}T00:00:00+07:00`);
  const end = new Date(`${todayDate}T23:59:59.999+07:00`);

  return {
    todayDate,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
};

export interface ContentPlan {
  id: string;
  title: string;
  pillar: string;
  publish_time: string;
  prod_status: string;
  publish_date?: string;
  platforms?: string[];
  copywriting?: string;
  caption?: string;
  pub_status?: string;
  views?: number;
  engagement?: number;
  ig_engagement?: number;
  fb_engagement?: number;
  tiktok_engagement?: number;
  x_engagement?: number;
  yt_engagement?: number;
  web_views?: number;
  web_engagement?: number;
}

type UserProfile = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  status?: string | null;
};

type ProfileFormState = {
  full_name: string;
  phone: string;
};

type PlatformMetricRow = {
  platform?: string | null;
  source?: string | null;
  metric_date?: string | null;
  reach?: number | string | null;
  impressions?: number | string | null;
  engagement?: number | string | null;
  followers?: number | string | null;
  posts_count?: number | string | null;
};

type SocialPostInsightRow = {
  id?: string | null;
  platform?: string | null;
  source?: string | null;
  external_post_id?: string | null;
  published_url?: string | null;
  post_message?: string | null;
  post_created_time?: string | null;
  views?: number | string | null;
  reach?: number | string | null;
  impressions?: number | string | null;
  engagement?: number | string | null;
  likes?: number | string | null;
  comments?: number | string | null;
  shares?: number | string | null;
};

export default function CommandCenter() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [activeLang, setActiveLang] = useState('ID');
  const langRef = useRef<HTMLDivElement>(null);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const [allContents, setAllContents] = useState<ContentPlan[]>([]);
  const [loadingContents, setLoadingContents] = useState(true);
  const [wpCount, setWpCount] = useState(0);
  
  const [globalViews, setGlobalViews] = useState(0);
  const [globalReach, setGlobalReach] = useState(0);
  const [globalEng, setGlobalEng] = useState(0);
  const [platformStats, setPlatformStats] = useState({ web: 0, ig: 0, fb: 0, tiktok: 0, x: 0, yt: 0 });
  const [platformMetricRows, setPlatformMetricRows] = useState<PlatformMetricRow[]>([]);
  const [facebookPostInsights, setFacebookPostInsights] = useState<SocialPostInsightRow[]>([]);
  const [instagramPostInsights, setInstagramPostInsights] = useState<SocialPostInsightRow[]>([]);
  const [tiktokPostInsights, setTikTokPostInsights] = useState<SocialPostInsightRow[]>([]);
  const [socialPostCount, setSocialPostCount] = useState(0);

  const [selectedPlatformModal, setSelectedPlatformModal] = useState<{ title: string, key: string, engKey: keyof ContentPlan, icon: React.ReactNode } | null>(null);
  
  // STATE UNTUK EDIT DATA LANGSUNG DI DASHBOARD (TOP 5)
  const [editingContent, setEditingContent] = useState<{ data: ContentPlan, engKey: keyof ContentPlan } | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({ full_name: '', phone: '' });
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get('tab');

    if (requestedTab === 'integrations') {
      setActiveTab('integrations');
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setShowNotifications(false);
      if (langRef.current && !langRef.current.contains(event.target as Node)) setShowLangMenu(false);
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setShowProfileMenu(false);
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setShowSearch(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, phone, role, avatar_url, status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Gagal mengambil profil:', error);
        return;
      }

      setProfile(data);
    };

    fetchProfile();
  }, [user?.id]);

  useEffect(() => {
    const fallbackProfileName = user?.email
      ? user.email.split('@')[0].replace(/[._-]/g, ' ')
      : '';

    setProfileForm({
      full_name: profile?.full_name || fallbackProfileName,
      phone: profile?.phone || '',
    });
  }, [profile?.full_name, profile?.phone, user?.email]);

  const fetchContentsAndStats = async () => {
    try {
      setLoadingContents(true);
      const metaRange = getMetaDataRange();
      const { data: rawContents } = await supabase.from('contents').select('*');
      const { data: rawPlatformMetrics, error: platformMetricsError } = await supabase
        .from('platform_metrics')
        .select('platform, source, metric_date, reach, impressions, engagement, followers, posts_count')
        .in('source', OFFICIAL_API_SOURCES)
        .in('platform', SOCIAL_PLATFORM_VALUES)
        .gte('metric_date', META_DATA_START_DATE)
        .lte('metric_date', metaRange.todayDate)
        .order('metric_date', { ascending: true });
      const { data: rawFacebookPosts, error: facebookPostsError } = await supabase
        .from('post_insights')
        .select('id, platform, source, external_post_id, published_url, post_message, post_created_time, reach, impressions, engagement, likes, comments, shares')
        .eq('platform', 'FB')
        .eq('source', 'meta_api')
        .gte('post_created_time', metaRange.startIso)
        .lte('post_created_time', metaRange.endIso)
        .order('engagement', { ascending: false })
        .limit(5);
      const { data: rawInstagramPosts, error: instagramPostsError } = await supabase
        .from('post_insights')
        .select('id, platform, source, external_post_id, published_url, post_message, post_created_time, views, reach, impressions, engagement, likes, comments, shares')
        .eq('platform', 'IG')
        .eq('source', 'meta_api')
        .gte('post_created_time', metaRange.startIso)
        .lte('post_created_time', metaRange.endIso)
        .order('engagement', { ascending: false })
        .limit(5);
      const { data: rawTikTokPosts, error: tiktokPostsError } = await supabase
        .from('post_insights')
        .select('id, platform, source, external_post_id, published_url, post_message, post_created_time, views, reach, impressions, engagement, likes, comments, shares')
        .eq('platform', 'TIKTOK')
        .eq('source', 'tiktok_api')
        .gte('post_created_time', metaRange.startIso)
        .lte('post_created_time', metaRange.endIso)
        .order('engagement', { ascending: false })
        .limit(5);
      const { count: rawSocialPostCount, error: socialPostCountError } = await supabase
        .from('post_insights')
        .select('id', { count: 'exact', head: true })
        .in('platform', SOCIAL_PLATFORM_VALUES)
        .in('source', OFFICIAL_API_SOURCES)
        .gte('post_created_time', metaRange.startIso)
        .lte('post_created_time', metaRange.endIso);

      const metricRows = platformMetricsError
        ? []
        : ((rawPlatformMetrics || []) as PlatformMetricRow[]);
      const fbPostRows = facebookPostsError
        ? []
        : ((rawFacebookPosts || []) as SocialPostInsightRow[]);
      const igPostRows = instagramPostsError
        ? []
        : ((rawInstagramPosts || []) as SocialPostInsightRow[]);
      const tiktokPostRows = tiktokPostsError
        ? []
        : ((rawTikTokPosts || []) as SocialPostInsightRow[]);

      if (platformMetricsError) {
        console.warn('Platform metrics API resmi belum tersedia. Dashboard menampilkan angka 0:', platformMetricsError.message);
      }

      if (facebookPostsError) {
        console.warn('Post insights Facebook Meta API belum tersedia. Dashboard menampilkan empty state:', facebookPostsError.message);
      }

      if (instagramPostsError) {
        console.warn('Post insights Instagram Meta API belum tersedia. Dashboard menampilkan empty state:', instagramPostsError.message);
      }

      if (tiktokPostsError) {
        console.warn('Post insights TikTok API belum tersedia. Dashboard menampilkan empty state:', tiktokPostsError.message);
      }

      if (socialPostCountError) {
        console.warn('Total postingan medsos API resmi belum tersedia. Dashboard menampilkan angka 0:', socialPostCountError.message);
      }

      setPlatformMetricRows(metricRows);
      setFacebookPostInsights(fbPostRows);
      setInstagramPostInsights(igPostRows);
      setTikTokPostInsights(tiktokPostRows);
      setSocialPostCount(socialPostCountError ? 0 : Number(rawSocialPostCount || 0));
      
      if (rawContents) {
        const sortedContents = rawContents.sort((a, b) => new Date(b.publish_date || '').getTime() - new Date(a.publish_date || '').getTime());
        setAllContents(sortedContents);
      }

      const pStats = { web: 0, ig: 0, fb: 0, tiktok: 0, x: 0, yt: 0 };
      metricRows.forEach(row => {
        const platformKey = getSocialPlatformKey(row.platform);
        const engagement = Number(row.engagement || 0);

        if (platformKey) pStats[platformKey] += engagement;
      });

      const totalV = metricRows.reduce((sum, row) => sum + getMetricViewsValue(row), 0);
      const totalR = metricRows.reduce((sum, row) => sum + getMetricReachValue(row), 0);
      const metricEngagementTotal = metricRows.reduce((sum, row) => sum + Number(row.engagement || 0), 0);
      const totalE = metricEngagementTotal;

      setGlobalViews(totalV); setGlobalReach(totalR); setGlobalEng(totalE); setPlatformStats(pStats);
    } catch (err) { console.error("Error fetching data:", err); } finally {
      setLoadingContents(false);
      try {
        const wpRes = await fetch('https://pkbgarut.id/wp-json/wp/v2/posts?per_page=1&status=publish');
        if (wpRes.ok) setWpCount(Number(wpRes.headers.get('X-WP-Total') || 0));
      } catch (e) {}
    }
  };

  useEffect(() => { fetchContentsAndStats(); }, []);

  // FUNGSI UPDATE DATA (EDIT TOP 5)
  const handleUpdateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContent) return;
    
    // Update lokal (Optimistic)
    setAllContents(prev => prev.map(c => c.id === editingContent.data.id ? editingContent.data : c));
    
    // Update Supabase
    try {
      const payload: any = {
        title: editingContent.data.title,
        publish_date: editingContent.data.publish_date
      };
      
      if (editingContent.engKey === 'web_engagement') {
        payload.web_views = editingContent.data.web_views;
        payload.web_engagement = editingContent.data.web_engagement;
      } else {
        payload.views = editingContent.data.views;
        payload.engagement = editingContent.data.engagement;
        payload[editingContent.engKey] = editingContent.data[editingContent.engKey];
      }

      await supabase.from('contents').update(payload).eq('id', editingContent.data.id);
      setEditingContent(null);
      fetchContentsAndStats(); // Refresh statistik global
    } catch (error) {
      alert("Gagal memperbarui data");
    }
  };

  // FUNGSI HAPUS DATA (EDIT TOP 5)
  const handleDeleteContent = async (id: string) => {
    if (!window.confirm("Hapus permanen histori laporan ini?")) return;
    setAllContents(prev => prev.filter(c => c.id !== id));
    try {
      await supabase.from('contents').delete().eq('id', id);
      setEditingContent(null);
      fetchContentsAndStats();
    } catch (error) {
      alert("Gagal menghapus data");
    }
  };

  const dynamicChartData = useMemo(() => {
    const metricsByDate = platformMetricRows.reduce((acc, row) => {
      if (!row.metric_date) return acc;

      if (!acc[row.metric_date]) {
        acc[row.metric_date] = { engagement: 0, reach: 0 };
      }

      acc[row.metric_date].engagement += Number(row.engagement || 0);
      acc[row.metric_date].reach += getMetricReachValue(row);
      return acc;
    }, {} as Record<string, { engagement: number; reach: number }>);

    const data = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const metric = metricsByDate[dateStr];
      const eng = Number(metric?.engagement || 0);
      const reach = Number(metric?.reach || 0);
      data.push({ day: dayLabel, eng, reach });
    }
    return data;
  }, [platformMetricRows]);

  const dashboardContentPool = allContents.filter(c => c.pillar !== 'Imported Data');
  const postedContents = dashboardContentPool.filter(c => c.pub_status === 'Posted');
  const totalDashboardPosts = socialPostCount;
  const totalDashboardPostsLabel = 'Total Postingan Medsos';
  const upcomingRunway = allContents.filter(c => (c.prod_status === 'Ready to Post' || c.prod_status === 'Editing/Design') && c.pub_status !== 'Posted').slice(0, 4);

  const statusCounts = {
    editing: allContents.filter(p => p.prod_status === 'Editing/Design'),
    ready: allContents.filter(p => p.prod_status === 'Ready to Post' && p.pub_status !== 'Posted')
  };

  const formatNumberMax = (num: number) => num > 9999 ? `${(num/1000).toFixed(1)}K` : num.toLocaleString('id-ID');

  const fallbackName = user?.email ? user.email.split('@')[0].replace(/[._-]/g, ' ') : 'Admin';
  const displayName = profile?.full_name || fallbackName;
  const displayEmail = profile?.email || user?.email || 'admin@commandcenter.local';
  const displayRole = profile?.role || 'Mediacenter';
  const displayInitial = displayName.charAt(0).toUpperCase();
  const avatarUrl = profile?.avatar_url || '';

  const resetProfileFeedback = () => {
    setProfileError(null);
    setProfileSuccess(null);
  };

  const openProfileSettings = () => {
    resetProfileFeedback();
    setSelectedAvatarFile(null);
    setShowProfileMenu(false);
    setShowProfileSettings(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      setProfileError('Sesi login tidak ditemukan. Silakan login ulang.');
      return;
    }

    const cleanName = profileForm.full_name.trim();
    if (!cleanName) {
      setProfileError('Nama lengkap wajib diisi.');
      return;
    }

    setProfileSaving(true);
    resetProfileFeedback();

    try {
      let nextAvatarUrl = profile?.avatar_url || '';

      if (selectedAvatarFile) {
        const safeFileName = selectedAvatarFile.name
          .toLowerCase()
          .replace(/[^a-z0-9.]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        const filePath = `${user.id}/${Date.now()}-${safeFileName || 'avatar.jpg'}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, selectedAvatarFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        nextAvatarUrl = publicUrlData.publicUrl;
      }

      const payload = {
        user_id: user.id,
        full_name: cleanName,
        email: user.email || profile?.email || '',
        phone: profileForm.phone.trim(),
        role: profile?.role || 'Viewer',
        avatar_url: nextAvatarUrl,
        status: profile?.status || 'pending',
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select('full_name, email, phone, role, avatar_url, status')
        .single();

      if (error) throw error;

      setProfile(data);
      setSelectedAvatarFile(null);
      setProfileSuccess('Profil berhasil diperbarui.');
    } catch (err: any) {
      setProfileError(err?.message || 'Gagal memperbarui profil.');
    } finally {
      setProfileSaving(false);
    }
  };

  const PlatformHistoryTable = ({ title, icon, platformKey, engagementKey }: { title: string, icon: React.ReactNode, platformKey: string, engagementKey: keyof ContentPlan }) => {
    const isApiPostTable = platformKey === 'fb' || platformKey === 'ig' || platformKey === 'tiktok';
    const apiPostInsights = platformKey === 'fb'
      ? facebookPostInsights
      : platformKey === 'ig' ? instagramPostInsights : tiktokPostInsights;
    const apiSourceLabel = platformKey === 'tiktok' ? 'TIKTOK API' : 'META API';

    if (isApiPostTable) {
      return (
        <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800/60' : 'bg-white border-gray-200'} shadow-sm flex flex-col h-full`}>
          <div className="flex justify-between items-center mb-6 border-b border-gray-500/10 pb-4">
            <div className="flex items-center gap-3">
              {icon}
              <div>
                <h4 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h4>
                <p className="text-[10px] text-gray-400 font-bold mt-1">Top 5 Engagement</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[8px] font-black uppercase tracking-widest">
                SUMBER DATA: {apiSourceLabel}
              </span>
              <Flame size={16} className="text-emerald-500" />
            </div>
          </div>
          <div className="flex-1">
            {apiPostInsights.length === 0 ? <div className="text-center py-8 text-gray-500 text-xs font-bold uppercase">Belum ada data API</div> : (
              <div className="space-y-4">
                {apiPostInsights.map((post) => {
                  const postDate = post.post_created_time
                    ? new Date(post.post_created_time).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '-';

                  return (
                    <div key={post.id || post.external_post_id || post.post_created_time || post.post_message || 'fb-post'} className="flex flex-col border-b border-gray-500/5 pb-3 last:border-0">
                      <div className={`text-[11px] font-bold line-clamp-2 mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                        {post.post_message || '(Tanpa caption)'}
                      </div>
                      <div className="flex justify-between items-center gap-3 text-[9px] text-gray-500">
                        <span className="font-mono whitespace-nowrap">{postDate}</span>
                        <div className="flex flex-wrap justify-end gap-2">
                          <span>Like {formatNumberMax(Number(post.likes || 0))}</span>
                          <span>Com {formatNumberMax(Number(post.comments || 0))}</span>
                          {platformKey === 'fb' && <span>Share {formatNumberMax(Number(post.shares || 0))}</span>}
                          {platformKey === 'tiktok' && <span>View {formatNumberMax(Number(post.views || post.impressions || 0))}</span>}
                          {platformKey === 'tiktok' && <span>Share {formatNumberMax(Number(post.shares || 0))}</span>}
                          <span className="font-black text-emerald-400">
                            <MousePointer2 size={10} className="inline mr-1"/>
                            {formatNumberMax(Number(post.engagement || 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className={`w-full mt-6 py-3 rounded-xl text-center text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-[#0b0d10] border border-gray-800 text-gray-500' : 'bg-gray-50 border border-gray-200 text-gray-500'}`}>
            Top 5 {title} dari {apiSourceLabel}
          </div>
        </div>
      );
    }

    if (platformKey !== 'web') {
      return (
        <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800/60' : 'bg-white border-gray-200'} shadow-sm flex flex-col h-full`}>
          <div className="flex justify-between items-center mb-6 border-b border-gray-500/10 pb-4">
            <div className="flex items-center gap-3">
              {icon}
              <div>
                <h4 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h4>
                <p className="text-[10px] text-gray-400 font-bold mt-1">Top 5 Engagement</p>
              </div>
            </div>
            <Flame size={16} className="text-emerald-500" />
          </div>
          <div className="flex-1 flex items-center justify-center py-8 text-center text-gray-500 text-xs font-bold uppercase">
            Belum ada data API
          </div>
        </div>
      );
    }

    const platformContents = postedContents.filter(c => c.platforms?.includes(platformKey.toUpperCase())).sort((a, b) => Number(b[engagementKey] || 0) - Number(a[engagementKey] || 0));
    const top5Contents = platformContents.slice(0, 5);

    return (
      <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800/60' : 'bg-white border-gray-200'} shadow-sm flex flex-col h-full`}>
        <div className="flex justify-between items-center mb-6 border-b border-gray-500/10 pb-4">
          <div className="flex items-center gap-3">{icon}<div><h4 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h4><p className="text-[10px] text-gray-400 font-bold mt-1">Top 5 Engagement</p></div></div>
          <Flame size={16} className="text-emerald-500" />
        </div>
        <div className="flex-1">
          {top5Contents.length === 0 ? <div className="text-center py-8 text-gray-500 text-xs font-bold uppercase">Belum ada data</div> : (
            <div className="space-y-4">
              {top5Contents.map((p) => (
                <div key={p.id} className="flex flex-col group border-b border-gray-500/5 pb-2 last:border-0 relative">
                  <div className={`text-[11px] font-bold truncate pr-6 mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>{p.title}</div>
                  <div className="flex justify-between items-center text-[9px] text-gray-500">
                    <span>{p.publish_date}</span>
                    <div className="flex gap-2">
                      <span><Eye size={10} className="inline mr-1"/>{formatNumberMax(Number(platformKey === 'web' ? p.web_views : p.views || 0))}</span>
                      <span className="font-black text-emerald-400"><MousePointer2 size={10} className="inline mr-1"/>{formatNumberMax(Number(p[engagementKey] || 0))}</span>
                    </div>
                  </div>
                  {/* TOMBOL EDIT MUNCUL SAAT DI-HOVER */}
                  <button onClick={() => setEditingContent({ data: p, engKey: engagementKey })} className="absolute top-0 right-0 p-1.5 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all">
                    <Edit2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => setSelectedPlatformModal({ title, key: platformKey, engKey: engagementKey, icon })} className={`w-full mt-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-[#0b0d10] border border-gray-800 text-gray-400 hover:border-emerald-500/50 hover:text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-emerald-500/50'}`}>Lihat Seluruh {title}</button>
      </div>
    );
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-300 ${isDarkMode ? 'bg-[#0b0d10] text-gray-100' : 'bg-gray-50 text-gray-800'}`}>
      <DesktopNotificationBridge />
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-[35] bg-black/60 backdrop-blur-[2px] md:hidden"
        />
      )}

      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-64 ${isDarkMode ? 'bg-[#12151a] border-gray-800/60' : 'bg-white border-gray-200'} border-r flex flex-col transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-200 shadow-sm`}>
        <div className={`flex items-center space-x-3 px-6 py-6 border-b border-gray-100/10 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          <img src="/logo.png" alt="Logo PKB" className="w-10 h-10 object-contain drop-shadow-lg" />
          <div><h1 className="font-black text-xs uppercase tracking-wider">Command Center</h1><p className="text-[9px] text-gray-400 font-bold tracking-widest uppercase">Media Strategist</p></div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'jobdesk', label: 'Jobdesk', icon: CheckSquare },
            { id: 'planning', label: 'Planning', icon: CalendarDays },
            { id: 'recap', label: 'Recap', icon: UploadCloud },
            { id: 'library', label: 'Asset Konten', icon: FolderOpen },
            { id: 'integrations', label: 'Integrasi', icon: Plug },
            { id: 'reports', label: 'Reports', icon: FileText },
          ].map((item) => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === item.id ? 'bg-[#008234] text-white shadow-lg shadow-green-900/20' : isDarkMode ? 'text-gray-400 hover:bg-gray-800/40' : 'text-gray-500 hover:bg-gray-100/50'}`}>
              <item.icon size={18} /><span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        <header className={`h-20 md:h-24 flex items-center justify-between px-4 md:px-8 border-b ${isDarkMode ? 'bg-[#12151a] border-gray-800/60' : 'bg-white border-gray-200'} sticky top-0 z-30 transition-colors`}>
          <div className="md:hidden flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className={`p-2.5 rounded-xl border transition-all ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
              aria-label="Buka menu"
            >
              <Menu size={19} />
            </button>
            <div className="min-w-0">
              <h2 className={`text-[11px] font-black uppercase tracking-wider truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Command Center</h2>
              <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest truncate">Media Strategist</p>
            </div>
          </div>
          
          <div ref={searchRef} className="relative hidden md:block w-80">
            <div className={`flex items-center rounded-2xl px-4 py-2 border transition-all ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 focus-within:border-[#008234]' : 'bg-gray-50 border-gray-200 focus-within:border-[#008234]'}`}>
              <Search size={15} className="text-gray-400 mr-2.5" />
              <input type="text" value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setShowSearch(true);}} onFocus={() => setShowSearch(true)} placeholder="Quick Spotlight..." className={`bg-transparent text-xs outline-none w-full font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`} />
            </div>
            
            {showSearch && searchQuery && (
              <div className={`absolute top-full mt-3 w-full rounded-2xl shadow-2xl border overflow-hidden z-50 animate-fadeIn ${isDarkMode ? 'bg-[#161920] border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="max-h-64 overflow-y-auto p-2 custom-scrollbar">
                  <div className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-500/20 mb-1">Hasil Pencarian Cepat</div>
                  {allContents.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5).map(c => (
                    <div key={c.id} onClick={() => setShowSearch(false)} className="p-3 rounded-xl cursor-pointer hover:bg-emerald-500/10 transition-colors mb-1">
                      <div className={`text-xs font-bold truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{c.title}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${c.pub_status === 'Posted' ? 'bg-gray-500/20 text-gray-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{c.prod_status}</span>
                        <span className="text-[8px] text-gray-500 font-mono">{c.publish_date}</span>
                      </div>
                    </div>
                  ))}
                  {allContents.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <div className="p-4 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tidak ada hasil</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <div ref={langRef} className="relative hidden md:block">
              <button onClick={() => setShowLangMenu(!showLangMenu)} className={`p-2.5 flex items-center gap-2 rounded-xl border transition-all ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                <Languages size={15} /> <span className="text-[10px] font-black">{activeLang}</span>
              </button>
              {showLangMenu && (
                <div className={`absolute right-0 top-full mt-2 w-28 rounded-xl border shadow-2xl z-50 animate-fadeIn overflow-hidden ${isDarkMode ? 'bg-[#161920] border-gray-800' : 'bg-white border-gray-200'}`}>
                  <button onClick={() => {setActiveLang('ID'); setShowLangMenu(false)}} className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${activeLang === 'ID' ? 'bg-[#008234] text-white' : isDarkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}>🇮🇩 Indo</button>
                  <button onClick={() => {setActiveLang('EN'); setShowLangMenu(false)}} className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${activeLang === 'EN' ? 'bg-[#008234] text-white' : isDarkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}>🇺🇸 Eng</button>
                </div>
              )}
            </div>

            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`hidden md:flex p-2.5 rounded-xl border transition-all ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-amber-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
              {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <div ref={notifRef} className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className={`p-2.5 rounded-xl border relative transition-all ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                <Bell size={15} />
                {(statusCounts.ready.length > 0 || statusCounts.editing.length > 0) && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#12151a] rounded-full"></span>}
              </button>

              {showNotifications && (
                <div className={`fixed left-4 right-4 top-[88px] z-[9999] max-h-[70dvh] rounded-2xl shadow-2xl border overflow-hidden animate-fadeIn md:absolute md:left-auto md:right-0 md:top-full md:mt-3 md:w-96 md:max-h-none ${isDarkMode ? 'bg-[#161920] border-gray-800' : 'bg-white border-gray-200'}`}>
                  <div className="p-4 border-b border-gray-500/20 flex justify-between items-center bg-black/10">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Papan Peringatan Redaksi</span>
                    <Activity size={14} className="text-emerald-500" />
                  </div>
                  <div className="p-4 space-y-5 max-h-[55dvh] md:max-h-80 overflow-y-auto custom-scrollbar">
                    <div>
                      <div className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-2 border-b border-gray-500/20 pb-1">Antrean Tayang Terdekat</div>
                      {statusCounts.ready.length === 0 ? <div className="text-gray-600 text-[10px] font-bold">Semua naskah telah mengudara.</div> : statusCounts.ready.map(c => (
                        <div key={c.id} className={`mb-3 p-3 rounded-xl border ${isDarkMode ? 'bg-[#0b0d10] border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                          <div className="flex items-center gap-2 mb-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div><span className={`text-[11px] font-bold truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{c.title}</span></div>
                          <div className="text-[9px] font-black tracking-wide text-emerald-500 ml-4">⚠️ Peringatan ke Ikhdam: Jangan lupa upload jam {c.publish_time || '12:00'} WIB!</div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-2 border-b border-gray-500/20 pb-1">Masuk Dapur Visual</div>
                      {statusCounts.editing.length === 0 ? <div className="text-gray-600 text-[10px] font-bold">Tidak ada antrean desain.</div> : statusCounts.editing.map(c => (
                        <div key={c.id} className={`mb-3 p-3 rounded-xl border ${isDarkMode ? 'bg-[#0b0d10] border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                          <div className="flex items-center gap-2 mb-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div><span className={`text-[11px] font-bold truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{c.title}</span></div>
                          <div className="text-[9px] font-black tracking-wide text-amber-500 ml-4">🎨 Semangat Desandi, ditunggu visualnya!</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`flex items-center md:space-x-3 p-1 md:pl-2 md:py-1 md:pr-3 rounded-2xl border transition-all ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 hover:border-[#008234]/50' : 'bg-gray-50 border-gray-200 hover:border-[#008234]/50'}`}
                aria-label="Buka menu profil"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-7 h-7 rounded-xl object-cover border border-emerald-500/30 shadow-sm"
                  />
                ) : (
                  <div className="w-7 h-7 bg-[#008234] rounded-xl flex items-center justify-center text-white font-black text-xs shadow-sm uppercase">
                    {displayInitial}
                  </div>
                )}
                <span className={`text-xs font-bold hidden sm:block pr-1 capitalize ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  {displayName}
                </span>
              </button>

              {showProfileMenu && (
                <div className={`fixed left-4 right-4 top-[88px] z-[9999] rounded-2xl shadow-2xl border overflow-hidden animate-fadeIn md:absolute md:left-auto md:right-0 md:top-full md:mt-3 md:w-72 ${isDarkMode ? 'bg-[#161920] border-gray-800' : 'bg-white border-gray-200'}`}>
                  <div className="p-4 border-b border-gray-500/20 bg-black/10">
                    <div className="flex items-center gap-3">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="w-10 h-10 rounded-2xl object-cover border border-emerald-500/30 shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-[#008234] rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-sm uppercase">
                          {displayInitial}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className={`text-xs font-black truncate capitalize ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {displayName}
                        </div>
                        <div className="text-[9px] text-gray-500 font-bold truncate mt-0.5">
                          {displayEmail}
                        </div>
                        <div className="text-[8px] font-black uppercase tracking-widest text-[#008234] mt-1">
                          {displayRole}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <div className="md:hidden grid grid-cols-2 gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => { setActiveLang(activeLang === 'ID' ? 'EN' : 'ID'); setShowProfileMenu(false); }}
                        className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-[#0b0d10] text-gray-300 hover:bg-gray-800' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                      >
                        <Languages size={14} /> {activeLang}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsDarkMode(!isDarkMode); setShowProfileMenu(false); }}
                        className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-[#0b0d10] text-amber-400 hover:bg-gray-800' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                      >
                        {isDarkMode ? <Sun size={14} /> : <Moon size={14} />} Tema
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={openProfileSettings}
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all ${isDarkMode ? 'text-gray-300 hover:bg-gray-800/70' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      <span>Profil Saya</span>
                      <ChevronRight size={14} className="text-gray-500" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        signOut();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-black transition-all ${isDarkMode ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-500 hover:bg-rose-50'}`}
                    >
                      <span className="flex items-center gap-2"><LogOut size={14} /> Keluar</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-8 overflow-y-auto space-y-8 relative">
          
          {activeTab === 'dashboard' && (
            <div className="animate-fadeIn space-y-8">
              <div className={`inline-flex px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest ${
                isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}>
                SUMBER DATA: API RESMI PLATFORM
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
                <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800/80' : 'bg-white border-gray-200'} shadow-sm relative overflow-hidden group`}>
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Grand Total Views</p>
                    <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl"><Eye size={16} /></div>
                  </div>
                  <h3 className="text-4xl font-black tracking-tight mt-4 italic text-blue-400">{formatNumberMax(globalViews)}</h3>
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-2">Tayangan / views</p>
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Eye size={100} /></div>
                </div>

                <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800/80' : 'bg-white border-gray-200'} shadow-sm relative overflow-hidden group`}>
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Grand Total Reach</p>
                    <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl"><TrendingUp size={16} /></div>
                  </div>
                  <h3 className="text-4xl font-black tracking-tight mt-4 italic text-cyan-400">{formatNumberMax(globalReach)}</h3>
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-2">Jangkauan unik</p>
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><TrendingUp size={100} /></div>
                </div>

                <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800/80' : 'bg-white border-gray-200'} shadow-sm relative overflow-hidden group`}>
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Grand Total Eng.</p>
                    <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl"><MousePointer2 size={16} /></div>
                  </div>
                  <h3 className="text-4xl font-black tracking-tight mt-4 italic text-emerald-400">{formatNumberMax(globalEng)}</h3>
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-2">Interaksi total</p>
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><MousePointer2 size={100} /></div>
                </div>

                <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800/80' : 'bg-white border-gray-200'} shadow-sm relative overflow-hidden group`}>
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{totalDashboardPostsLabel}</p>
                    <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl"><Send size={16} /></div>
                  </div>
                  <h3 className={`text-4xl font-black tracking-tight mt-4 italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalDashboardPosts}</h3>
                  <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mt-2">SUMBER DATA: API RESMI PLATFORM</p>
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Send size={100} /></div>
                </div>

                <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800/80' : 'bg-white border-gray-200'} shadow-sm relative overflow-hidden group`}>
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Artikel Web</p>
                    <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl"><Globe size={16} /></div>
                  </div>
                  <h3 className={`text-4xl font-black tracking-tight mt-4 italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{wpCount}</h3>
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-2">pkbgarut.id</p>
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Globe size={100} /></div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[ { label: 'Website', icon: <BrandIcons.Web />, val: platformStats.web, sub: 'IMPRESSIONS' }, { label: 'Instagram', icon: <BrandIcons.IG />, val: platformStats.ig, sub: 'ENGAGEMENT' }, { label: 'Facebook', icon: <BrandIcons.FB />, val: platformStats.fb, sub: 'ENGAGEMENT' }, { label: 'TikTok', icon: <BrandIcons.TikTok />, val: platformStats.tiktok, sub: 'ENGAGEMENT' }, { label: 'X (Twitter)', icon: <BrandIcons.X />, val: platformStats.x, sub: 'ENGAGEMENT' }, { label: 'YT Shorts', icon: <BrandIcons.YT />, val: platformStats.yt, sub: 'ENGAGEMENT' } ].map((p, idx) => (
                  <div key={idx} className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-3"><span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">{p.label}</span>{p.icon}</div>
                    <div><div className={`font-roboto text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatNumberMax(p.val)}</div><span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mt-1">{p.sub}</span>{p.label === 'Facebook' && <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest block mt-1">SUMBER DATA: META API</span>}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <div className="lg:col-span-2 space-y-6">
                  
                  <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800/60' : 'bg-white border-gray-200'} shadow-sm`}>
                    <div className="flex justify-between items-center mb-6">
                      <h4 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Tren Interaksi (30 Hari)</h4>
                      <div className="flex items-center space-x-3 text-[10px] font-bold">
                        <span className="flex items-center text-gray-400"><div className="w-2 h-2 bg-[#008234] rounded-full mr-1.5"></div> Engagement</span>
                        <span className="flex items-center text-gray-400"><div className="w-2 h-2 bg-blue-500 rounded-full mr-1.5"></div> Reach</span>
                      </div>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dynamicChartData}>
                          <defs>
                            <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#008234" stopOpacity={0.15}/>
                              <stop offset="95%" stopColor="#008234" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="day" stroke="#6B7280" fontSize={9} tickLine={false} axisLine={false} />
                          <YAxis domain={[0, 'auto']} hide={true} />
                          <Tooltip contentStyle={{ borderRadius: '15px', fontSize: '11px', backgroundColor: isDarkMode ? '#161920' : '#fff', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }} />
                          <Area type="monotone" dataKey="eng" stroke="#008234" strokeWidth={3} fillOpacity={1} fill="url(#colorEng)" />
                          <Line type="monotone" dataKey="reach" stroke="#3B82F6" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <MonthlyGoals isDarkMode={isDarkMode} upcomingPlans={dashboardContentPool} wpCount={wpCount} />
                  </div>

                </div>

                <div className="flex flex-col gap-6">
                  
                  <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800/60' : 'bg-white border-gray-200'} shadow-sm`}>
                    <TargetTracker contents={dashboardContentPool} isDarkMode={isDarkMode} />
                  </div>
                  
                  <div className={`flex-1 p-6 rounded-3xl border relative overflow-hidden ${isDarkMode ? 'bg-[#12151a] border-gray-800/60' : 'bg-white border-gray-200'} shadow-sm`}>
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h4 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Upcoming Runway</h4>
                        <p className="text-[9px] text-gray-500 font-bold uppercase mt-1">Antrean Tayang Terdekat</p>
                      </div>
                      <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500"><Activity size={16} className="animate-pulse" /></div>
                    </div>
                    <div className="space-y-4">
                      {upcomingRunway.length === 0 ? (
                        <div className="py-10 text-center opacity-20"><Sparkles size={24} className="mx-auto text-gray-700 mb-2" /><p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Semua naskah telah tayang</p></div>
                      ) : upcomingRunway.map((item, idx) => (
                        <div key={item.id || idx} className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-gray-50 border-gray-100'} group hover:border-[#008234]/50 transition-all`}>
                          <div className="flex justify-between items-start mb-1">
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter ${item.prod_status === 'Ready to Post' ? 'bg-[#008234]/10 text-[#008234]' : 'bg-amber-500/10 text-amber-500'}`}>
                              {item.prod_status === 'Ready to Post' ? 'Ready' : 'Editing'}
                            </span>
                            <span className="text-[9px] font-mono text-gray-500 italic">{item.publish_time || "09:00"}</span>
                          </div>
                          <h5 className={`text-[10px] font-bold line-clamp-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>{item.title}</h5>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setActiveTab('planning')} className="w-full mt-6 py-2.5 rounded-xl border border-dashed border-gray-700 text-[9px] font-black text-gray-500 uppercase hover:text-[#008234] hover:border-[#008234]/50 transition-all">
                      Buka Kalender Content
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <PlatformHistoryTable title="TikTok" icon={<BrandIcons.TikTok />} platformKey="tiktok" engagementKey="tiktok_engagement" />
                <PlatformHistoryTable title="Instagram" icon={<BrandIcons.IG />} platformKey="ig" engagementKey="ig_engagement" />
                <PlatformHistoryTable title="Facebook" icon={<BrandIcons.FB />} platformKey="fb" engagementKey="fb_engagement" />
                <PlatformHistoryTable title="Web / GSC" icon={<BrandIcons.Web />} platformKey="web" engagementKey="web_engagement" />
                <PlatformHistoryTable title="X (Twitter)" icon={<BrandIcons.X />} platformKey="x" engagementKey="x_engagement" />
                <PlatformHistoryTable title="YT Shorts" icon={<BrandIcons.YT />} platformKey="yt" engagementKey="yt_engagement" />
              </div>

            </div>
          )}

          {activeTab === 'planning' && <PlanningForm isDarkMode={isDarkMode} onPlanAdded={fetchContentsAndStats} />}
          {activeTab === 'recap' && <RecapForm isDarkMode={isDarkMode} onRecapSuccess={fetchContentsAndStats} />}
          {activeTab === 'library' && <ContentLibrary isDarkMode={isDarkMode} onContentSaved={fetchContentsAndStats} />}
          {activeTab === 'integrations' && <PlatformIntegration isDarkMode={isDarkMode} onInsightsSynced={fetchContentsAndStats} />}
          {activeTab === 'reports' && <Reports isDarkMode={isDarkMode} contents={allContents} />}
          {activeTab === 'jobdesk' && (
            <div className={`p-12 text-center rounded-3xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800 text-gray-400' : 'bg-white border-gray-200 text-gray-600'}`}>
              <CheckSquare size={48} className="mx-auto mb-4 text-[#008234] opacity-50" />
              <h2 className="text-xl font-black uppercase tracking-widest mb-2">Papan Jobdesk Redaksi</h2>
              <p className="text-xs font-bold">{activeTab === 'jobdesk' && <Jobdesk isDarkMode={isDarkMode} />}.</p>
            </div>
          )}

          {selectedPlatformModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn p-4">
              <div className={`w-full max-w-3xl rounded-[35px] shadow-2xl border flex flex-col max-h-[85vh] overflow-hidden ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
                <div className="p-6 md:p-8 flex justify-between items-center border-b border-gray-500/10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-500/10 rounded-2xl">{selectedPlatformModal.icon}</div>
                    <div>
                      <h2 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Histori {selectedPlatformModal.title}
                      </h2>
                      <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mt-1">Daftar Arsip Seluruh Konten Mengudara</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedPlatformModal(null)} className="p-2 bg-gray-500/10 rounded-full hover:bg-gray-500/20 transition-all text-gray-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-opacity-90 backdrop-blur-md z-10">
                      <tr className={`text-[10px] uppercase font-black tracking-widest border-b ${isDarkMode ? 'text-gray-500 border-gray-800 bg-[#12151a]' : 'text-gray-400 border-gray-100 bg-white'}`}>
                        <th className="pb-4 px-2">Tanggal</th>
                        <th className="pb-4 px-2">Judul Konten</th>
                        <th className="pb-4 px-2 text-right">Reach</th>
                        <th className="pb-4 px-2 text-right">Engagement</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] font-bold divide-y divide-gray-500/10">
                      {postedContents
                        .filter(c => c.platforms?.includes(selectedPlatformModal.key.toUpperCase()))
                        .sort((a, b) => new Date(b.publish_date || '').getTime() - new Date(a.publish_date || '').getTime()) 
                        .map(p => (
                          <tr key={p.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-4 px-2 text-gray-500 font-mono whitespace-nowrap">{p.publish_date}</td>
                            <td className={`py-4 px-2 max-w-[250px] truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{p.title}</td>
                            <td className="py-4 px-2 text-right text-blue-400 font-roboto">{formatNumberMax(Number(selectedPlatformModal.key === 'web' ? p.web_views : p.views || 0))}</td>
                            <td className="py-4 px-2 text-right text-emerald-400 font-roboto">{formatNumberMax(Number(p[selectedPlatformModal.engKey] || 0))}</td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                  {postedContents.filter(c => c.platforms?.includes(selectedPlatformModal.key.toUpperCase())).length === 0 && (
                    <div className="text-center py-12 text-gray-500 text-xs font-bold uppercase tracking-widest">
                      Tidak ada data yang ditemukan
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {showProfileSettings && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
              <div className={`w-full max-w-lg rounded-[30px] shadow-2xl border overflow-hidden ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
                <div className="p-5 md:p-6 border-b border-gray-500/10 flex justify-between items-center bg-black/10">
                  <div>
                    <h3 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Profil Saya
                    </h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                      Atur identitas dan foto profil tim
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileSettings(false);
                      setSelectedAvatarFile(null);
                      resetProfileFeedback();
                    }}
                    className="p-2 bg-gray-500/10 text-gray-400 rounded-full hover:text-white transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveProfile} className="p-5 md:p-6 space-y-5 max-h-[80dvh] overflow-y-auto custom-scrollbar">
                  <div className={`p-4 rounded-2xl border flex items-center gap-4 ${isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-16 h-16 rounded-2xl object-cover border border-emerald-500/30 shadow-sm"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-[#008234] rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-sm uppercase">
                        {displayInitial}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-black truncate capitalize ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{displayName}</div>
                      <div className="text-[10px] text-gray-500 font-bold truncate mt-1">{displayEmail}</div>
                      <label className="inline-flex items-center gap-2 mt-3 px-3 py-2 rounded-xl bg-[#008234]/10 text-[#008234] hover:bg-[#008234]/20 cursor-pointer text-[10px] font-black uppercase tracking-widest transition-all">
                        <UploadCloud size={14} />
                        Ganti Foto
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            resetProfileFeedback();
                            setSelectedAvatarFile(e.target.files?.[0] || null);
                          }}
                        />
                      </label>
                      {selectedAvatarFile && (
                        <p className="text-[9px] text-emerald-400 font-bold mt-2 truncate">
                          Foto baru: {selectedAvatarFile.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {profileError && (
                    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold">
                      {profileError}
                    </div>
                  )}
                  {profileSuccess && (
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                      {profileSuccess}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Nama Lengkap</label>
                    <input
                      type="text"
                      value={profileForm.full_name}
                      onChange={(e) => {
                        resetProfileFeedback();
                        setProfileForm((prev) => ({ ...prev, full_name: e.target.value }));
                      }}
                      className={`w-full p-4 rounded-2xl border text-sm font-bold focus:outline-none focus:border-[#008234] ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      placeholder="Nama lengkap"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Nomor WhatsApp</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => {
                        resetProfileFeedback();
                        setProfileForm((prev) => ({ ...prev, phone: e.target.value }));
                      }}
                      className={`w-full p-4 rounded-2xl border text-sm font-bold focus:outline-none focus:border-[#008234] ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Email</label>
                      <input
                        type="email"
                        value={displayEmail}
                        readOnly
                        className={`w-full p-4 rounded-2xl border text-xs font-bold cursor-not-allowed opacity-70 ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-500'}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Role / Jabatan</label>
                      <input
                        type="text"
                        value={displayRole}
                        readOnly
                        className={`w-full p-4 rounded-2xl border text-xs font-black uppercase tracking-widest cursor-not-allowed opacity-80 ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-[#008234]' : 'bg-gray-100 border-gray-200 text-[#008234]'}`}
                      />
                    </div>
                  </div>

                  <div className={`p-3 rounded-2xl text-[10px] font-bold leading-relaxed ${isDarkMode ? 'bg-amber-500/10 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
                    Email dan role hanya dapat diubah oleh koordinator/admin agar akses tim tetap aman.
                  </div>

                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="w-full py-4 rounded-2xl bg-[#008234] hover:bg-[#006b2a] disabled:opacity-60 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-green-900/20 flex items-center justify-center gap-2"
                  >
                    {profileSaving ? <Loader2 className="animate-spin" size={16} /> : <CheckSquare size={15} />}
                    Simpan Profil
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* MODAL QUICK EDIT DATA (UNTUK TOP 5 ENGAGEMENT) */}
          {editingContent && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
              <div className={`w-full max-w-md rounded-[30px] shadow-2xl border overflow-hidden ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
                <div className="p-6 border-b border-gray-500/10 flex justify-between items-center bg-black/10">
                  <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    <Edit2 size={16} className="text-blue-500"/> Edit Data Historis
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={() => handleDeleteContent(editingContent.data.id)} className="p-2 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>
                    <button onClick={() => setEditingContent(null)} className="p-2 bg-gray-500/10 text-gray-400 rounded-full hover:text-white transition-all"><X size={16}/></button>
                  </div>
                </div>
                <form onSubmit={handleUpdateContent} className="p-6 space-y-4">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Judul Dokumen</label>
                    <input type="text" value={editingContent.data.title} onChange={e => setEditingContent({...editingContent, data: {...editingContent.data, title: e.target.value}})} className={`w-full p-3 rounded-xl border text-xs font-bold focus:outline-none focus:border-blue-500 ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Total Reach / Impresi</label>
                      <input type="number" value={editingContent.engKey === 'web_engagement' ? (editingContent.data.web_views || 0) : (editingContent.data.views || 0)} onChange={e => {
                        const val = Number(e.target.value);
                        if (editingContent.engKey === 'web_engagement') {
                          setEditingContent({...editingContent, data: {...editingContent.data, web_views: val}});
                        } else {
                          setEditingContent({...editingContent, data: {...editingContent.data, views: val}});
                        }
                      }} className={`w-full p-3 rounded-xl border text-xs font-roboto font-black text-blue-400 focus:outline-none focus:border-blue-500 ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Spesifik Engagement</label>
                      <input type="number" value={editingContent.data[editingContent.engKey] || 0} onChange={e => {
                        const val = Number(e.target.value);
                        if (editingContent.engKey === 'web_engagement') {
                          setEditingContent({...editingContent, data: {...editingContent.data, web_engagement: val}});
                        } else {
                          setEditingContent({...editingContent, data: {...editingContent.data, engagement: val, [editingContent.engKey]: val}});
                        }
                      }} className={`w-full p-3 rounded-xl border text-xs font-roboto font-black text-emerald-400 focus:outline-none focus:border-emerald-500 ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Tanggal Tayang</label>
                    <input type="date" value={editingContent.data.publish_date || ''} onChange={e => setEditingContent({...editingContent, data: {...editingContent.data, publish_date: e.target.value}})} className={`w-full p-3 rounded-xl border text-xs font-mono focus:outline-none focus:border-blue-500 ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                  </div>
                  <button type="submit" className="w-full mt-2 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20">
                    Simpan Perubahan
                  </button>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
