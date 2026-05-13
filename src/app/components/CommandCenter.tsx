"use client";
import { useAuth } from '../contexts/AuthContext';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  LayoutDashboard, UploadCloud, CalendarDays, FileText, Menu, X, 
  Globe, Sparkles, ArrowUpRight, Sun, Moon, LogOut, Bell, Search, Loader2, CheckCircle2,
  Eye, MousePointer2, Send, Info, ChevronRight, Languages
} from 'lucide-react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, AreaChart, Area, } from 'recharts';
import TargetTracker from './TargetTracker';
import MonthlyGoals from './MonthlyGoals';
import RecapForm from './RecapForm';
import Reports from './Reports';
import { Share2 } from 'lucide-react';
import { MessageSquare } from 'lucide-react';

const BrandIcons = {
  Meta: () => <svg className="w-5 h-5 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  TikTok: () => <svg className="w-5 h-5 text-rose-600" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>,
  X: () => <svg className="w-4 h-4 text-gray-800 dark:text-gray-200" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  YT: () => <svg className="w-5 h-5 text-[#FF0000]" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
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
  live_link?: string;
}

export default function CommandCenter() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [lang, setLang] = useState<'ID' | 'EN'>('ID');
  const [showNotifications, setShowNotifications] = useState(false);
  
  // States Data Riil
  const [upcomingPlans, setUpcomingPlans] = useState<ContentPlan[]>([]);
  const [loadingContents, setLoadingContents] = useState(true);
  const [wpCount, setWpCount] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [selectedContent, setSelectedContent] = useState<ContentPlan | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Metrik Akumulasi Dinamis
  const [totalViews, setTotalViews] = useState(0);
  const [totalEng, setTotalEng] = useState(0);

  // Form Planning State
  const [formTitle, setFormTitle] = useState('');
  const [formPillar, setFormPillar] = useState('Educational');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('09:00');
  const [formPlatforms, setFormPlatforms] = useState<string[]>([]);
  const [formCopywriting, setFormCopywriting] = useState('');
  const [formCaption, setFormCaption] = useState('');
  const [formProdStatus, setFormProdStatus] = useState('Drafting');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [platformStats, setPlatformStats] = useState({ meta: 0, tiktok: 0, x: 0, yt: 0 });

  const fetchContentsAndStats = async () => {
    try {
      setLoadingContents(true);
      const { data: contents } = await supabase
        .from('contents')
        .select('*')
        .order('publish_date', { ascending: false });
      
      if (contents) {
        setUpcomingPlans(contents);
        
        // 1. Akumulasi Global (Tetap Mempertahankan Fitur Asli)
        const calcViews = contents.reduce((acc: number, curr: any) => acc + (Number(curr.views) || 0), 0);
        const calcEng = contents.reduce((acc: number, curr: any) => acc + (Number(curr.engagement) || 0), 0);
        if (calcViews > 0) setTotalViews(calcViews);
        if (calcEng > 0) setTotalEng(calcEng);

        // 2. Injeksi Akumulasi Spesifik Platform (Tanpa Mengganggu Struktur Lain)
        setPlatformStats({
          meta: contents.reduce((acc: number, curr: any) => acc + (Number(curr.meta_eng) || 0), 0),
          tiktok: contents.reduce((acc: number, curr: any) => acc + (Number(curr.tiktok_eng) || 0), 0),
          x: contents.reduce((acc: number, curr: any) => acc + (Number(curr.x_eng) || 0), 0),
          yt: contents.reduce((acc: number, curr: any) => acc + (Number(curr.yt_eng) || 0), 0),
        });
      }

      const { count } = await supabase.from('articles').select('*', { count: 'exact', head: true });
      if (count !== null) setWpCount(count);

      const mockTrend = Array.from({ length: 30 }, (_, i) => ({
        day: `H${i + 1}`,
        eng: 0,
        views: 0
      }));
      setChartData(mockTrend);

      fetch('/api/sync-wordpress').catch(() => {});
    } catch (err) {
      console.error("Gagal memuat data:", err);
    } finally {
      setLoadingContents(false);
    }
  };

  useEffect(() => { fetchContentsAndStats(); }, []);

  const handleSavePlanning = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('contents').insert([{ 
        title: formTitle, pillar: formPillar, publish_date: formDate,
        publish_time: formTime, platforms: formPlatforms, copywriting: formCopywriting,
        caption: formCaption, prod_status: formProdStatus, pub_status: formProdStatus === 'Completed' ? 'Posted' : 'Ideation'
      }]);
      if (error) throw error;
      setShowSuccess(true);
      setFormTitle(''); setFormDate(''); setFormCopywriting(''); setFormCaption('');
      fetchContentsAndStats();
      setTimeout(() => { setShowSuccess(false); setActiveTab('dashboard'); }, 2000);
    } catch (err) { alert("Gagal menyimpan instruksi."); } finally { setIsSubmitting(false); }
  };

  const updateContentStatus = async (id: string, newProdStatus: string, newPubStatus: string) => {
    setStatusUpdating(true);
    try {
      const { error } = await supabase
        .from('contents')
        .update({ prod_status: newProdStatus, pub_status: newPubStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      setUpcomingPlans(prev => prev.map(item => item.id === id ? { ...item, prod_status: newProdStatus, pub_status: newPubStatus } : item));
      if (selectedContent) setSelectedContent(prev => prev ? { ...prev, prod_status: newProdStatus, pub_status: newPubStatus } : null);
    } catch (err) {
      alert("Gagal memperbarui status.");
    } finally {
      setStatusUpdating(false);
    }
  };

  // KELAS CSS BADGES YANG SUDAH DIKOREKSI PEMBUNGKUSNYA DI RENDER UTAMA
  const getPillarStyles = (pillar: string) => {
    const p = pillar?.toLowerCase() || '';
    if (p.includes('educational')) return `border font-black text-[9px] px-2.5 py-1 rounded-lg ${isDarkMode ? 'bg-blue-950/40 text-blue-400 border-blue-900' : 'bg-blue-50 text-blue-600 border-blue-100'}`;
    if (p.includes('informative')) return `border font-black text-[9px] px-2.5 py-1 rounded-lg ${isDarkMode ? 'bg-sky-950/40 text-sky-400 border-sky-900' : 'bg-sky-50 text-sky-600 border-sky-100'}`;
    if (p.includes('entertaining')) return `border font-black text-[9px] px-2.5 py-1 rounded-lg ${isDarkMode ? 'bg-rose-950/40 text-rose-400 border-rose-900' : 'bg-rose-50 text-rose-600 border-rose-100'}`;
    if (p.includes('promotional')) return `border font-black text-[9px] px-2.5 py-1 rounded-lg ${isDarkMode ? 'bg-purple-950/40 text-purple-400 border-purple-900' : 'bg-purple-50 text-purple-600 border-purple-100'}`;
    return `border font-black text-[9px] px-2.5 py-1 rounded-lg ${isDarkMode ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-gray-50 text-gray-600 border-gray-100'}`;
  };

  const getProdStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('ready')) return `border font-black text-[9px] px-2.5 py-1 rounded-full ${isDarkMode ? 'bg-blue-950/50 text-blue-300 border-blue-800' : 'bg-blue-50 text-blue-700 border-blue-200'}`;
    if (s.includes('completed') || s.includes('posted')) return `border font-black text-[9px] px-2.5 py-1 rounded-full ${isDarkMode ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`;
    if (s.includes('editing')) return `border font-black text-[9px] px-2.5 py-1 rounded-full ${isDarkMode ? 'bg-amber-950/50 text-amber-300 border-amber-800' : 'bg-amber-50 text-amber-700 border-amber-200'}`;
    return `border font-black text-[9px] px-2.5 py-1 rounded-full ${isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-50 text-gray-600 border-gray-200'}`;
  };

  const readyContentsCount = upcomingPlans.filter(p => p.prod_status === 'Ready to Post').length;
  const formatNumberMax = (num: number) => num > 9999 ? `${(num/1000).toFixed(1)}K` : num.toLocaleString();

  const t = {
    dashboard: lang === 'ID' ? 'Dashboard' : 'Dashboard',
    planning: lang === 'ID' ? 'Planning' : 'Planning',
    recap: lang === 'ID' ? 'Recap' : 'Recap',
    reports: lang === 'ID' ? 'Reports' : 'Reports',
    searchPlaceholder: lang === 'ID' ? 'Cari naskah atau brief...' : 'Search manuscripts...',
    generalPerf: lang === 'ID' ? 'PERFORMA AKUMULATIF' : 'GENERAL PERFORMANCE',
    platformInt: lang === 'ID' ? 'INTERAKSI PLATFORM' : 'PLATFORM INTERACTION',
    upcomingTitle: lang === 'ID' ? 'Katalog Instruksi Redaksi' : 'Editorial Instruction Catalog',
    upcomingSub: lang === 'ID' ? 'Klik baris untuk mengubah status atau membaca instruksi' : 'Click a row to update status or read instructions',
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-300 ${isDarkMode ? 'bg-[#0b0d10] text-gray-100' : 'bg-gray-50 text-gray-800'}`}>
      
      {/* SIDEBAR */}
      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-64 ${isDarkMode ? 'bg-[#12151a] border-gray-800/60' : 'bg-white border-gray-200'} border-r flex flex-col transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-200 shadow-sm`}>
        <div className={`flex items-center space-x-3 px-6 py-6 border-b border-gray-100/10 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          <div className="w-10 h-10 bg-[#008234] rounded-xl flex items-center justify-center text-white font-black text-xs shadow-lg shadow-green-900/20">PKB</div>
          <div><h1 className="font-black text-xs uppercase tracking-wider">Command Center</h1><p className="text-[9px] text-gray-400 font-bold tracking-widest uppercase">Media Strategist</p></div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {[
            { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
            { id: 'planning', label: t.planning, icon: CalendarDays },
            { id: 'recap', label: t.recap, icon: UploadCloud },
            { id: 'reports', label: t.reports, icon: FileText },
          ].map((item) => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === item.id ? 'bg-[#008234] text-white shadow-lg shadow-green-900/20' : isDarkMode ? 'text-gray-400 hover:bg-gray-800/40' : 'text-gray-500 hover:bg-gray-100/50'}`}>
              <item.icon size={18} /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100/10">
          <button onClick={async () => { await signOut(); }} className={`w-full flex items-center space-x-3 px-4 py-2.5 text-xs font-bold text-red-500 rounded-xl transition-all ${isDarkMode ? 'hover:bg-red-950/30' : 'hover:bg-red-50'}`}><LogOut size={18} /><span>Logout</span></button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* TOP BAR */}
        <header className={`h-20 flex items-center justify-between px-8 border-b ${isDarkMode ? 'bg-[#12151a] border-gray-800/60' : 'bg-white border-gray-200'} sticky top-0 z-30 transition-colors`}>
          <div className="md:hidden"><Menu onClick={() => setMobileMenuOpen(true)} size={20} className="cursor-pointer" /></div>
          
          <div className={`hidden md:flex items-center rounded-2xl px-4 py-2.5 border w-80 transition-all ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 focus-within:border-[#008234]' : 'bg-gray-50 border-gray-200 focus-within:border-[#008234]'}`}>
            <Search size={15} className="text-gray-400 mr-2.5" />
            <input type="text" placeholder={t.searchPlaceholder} className={`bg-transparent text-xs outline-none w-full font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`} />
          </div>

          <div className="flex items-center space-x-3">
            <button onClick={() => setLang(lang === 'ID' ? 'EN' : 'ID')} className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border font-black text-[10px] transition-all ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
              <Languages size={13} className="text-[#008234]" /><span>{lang}</span>
            </button>

            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2.5 rounded-xl border transition-all ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-amber-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
              {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className={`p-2.5 rounded-xl border relative transition-all ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                <Bell size={15} />
                {readyContentsCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>}
                {readyContentsCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full"></span>}
              </button>

              {showNotifications && (
                <div className={`absolute right-0 mt-3 w-80 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-fadeIn ${isDarkMode ? 'bg-[#161920] border-gray-800' : 'bg-white border-gray-100'}`}>
                  <div className="p-4 border-b border-gray-100/10 flex justify-between items-center"><span className="text-xs font-black uppercase tracking-wider">Pusat Informasi</span><span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-black">LIVE</span></div>
                  <div className="p-4 text-xs space-y-1">
                    <p className="font-bold text-[#008234]">{readyContentsCount} Naskah Siap Tayang</p>
                    <p className="text-gray-400 text-[11px]">Sistem cloud otomatis memutakhirkan modul rekapitulasi.</p>
                  </div>
                </div>
              )}
            </div>

            <div className={`flex items-center space-x-3 pl-2 py-1 pr-3 rounded-2xl border ${isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
              <div className="w-7 h-7 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-sm">{user?.email?.charAt(0).toUpperCase() || 'A'}</div>
              <span className={`text-xs font-bold hidden sm:block pr-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{user?.email?.split('@')[0] || 'Admin'}</span>
            </div>
          </div>
        </header>

        <main className="p-8 overflow-y-auto space-y-8">
          
          {activeTab === 'dashboard' && (
            <div className="animate-fadeIn space-y-8">
              
              {/* KARTU ATAS DIJAMIN PUTIH SAAT GELAP */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{t.generalPerf}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800/80' : 'bg-white border-gray-200'} shadow-sm relative overflow-hidden group`}>
                    <div className="flex justify-between items-start"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Views</p><div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl"><Eye size={16} /></div></div>
                    <h3 className={`text-4xl font-black tracking-tight mt-4 italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatNumberMax(totalViews)}</h3>
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Eye size={100} /></div>
                  </div>

                  <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800/80' : 'bg-white border-gray-200'} shadow-sm relative overflow-hidden group`}>
                    <div className="flex justify-between items-start"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Engagement</p><div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl"><MousePointer2 size={16} /></div></div>
                    <h3 className={`text-4xl font-black tracking-tight mt-4 italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatNumberMax(totalEng)}</h3>
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><MousePointer2 size={100} /></div>
                  </div>

                  <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800/80' : 'bg-white border-gray-200'} shadow-sm relative overflow-hidden group`}>
                    <div className="flex justify-between items-start"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Postingan</p><div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl"><Send size={16} /></div></div>
                    <h3 className={`text-4xl font-black tracking-tight mt-4 italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {upcomingPlans.filter(p => p.pub_status === 'Posted').length + wpCount}
                    </h3>
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Send size={100} /></div>
                  </div>

                </div>
              </div>

              {/* KARTU DISTRIBUSI PLATFORM MEDSOS KELAS PRO */}
<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
  {[
    { 
      label: 'Website', 
      // Vektor Kustom Globe / Web (Aman tanpa import Lucide)
      icon: (
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          <path d="M2 12h20"></path>
        </svg>
      ), 
      val: wpCount, 
      sub: 'ARTIKEL AKTIF' 
    },
    { 
      label: 'Meta', 
      // Tetap Mempertahankan Susunan Vektor Ganda Asli Meta (FB + IG)
      icon: (
        <div className="flex items-center gap-1.5">
          {/* Logo Facebook Resmi */}
          <svg className="w-4 h-4 text-[#1877F2] fill-current" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          {/* Logo Instagram Resmi */}
          <svg className="w-4 h-4 text-[#E4405F] fill-current" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        </div>
      ), 
      val: platformStats.meta, 
      sub: 'INTERAKSI' 
    },
    { 
      label: 'TikTok', 
      // Vektor Resmi TikTok (Aman tanpa import Lucide)
      icon: (
        <svg className="w-4 h-4 text-[#ff0050] fill-current" viewBox="0 0 24 24">
          <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.674c0 1.913-1.554 3.467-3.467 3.467-1.914 0-3.468-1.554-3.468-3.467 0-1.914 1.554-3.468 3.468-3.468h.078V8.761h-.078c-3.824 0-6.924 3.1-6.924 6.924 0 3.823 3.1 6.923 6.924 6.923 3.823 0 6.922-3.1 6.922-6.923v-8.15a8.175 8.175 0 0 0 6.687 2.333v-3.18z"/>
        </svg>
      ), 
      val: platformStats.tiktok, 
      sub: 'INTERAKSI' 
    },
    { 
      label: 'X (Twitter)', 
      // Vektor Resmi X / Twitter (Aman tanpa import Lucide)
      icon: (
        <svg className="w-4 h-4 text-gray-300 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ), 
      val: platformStats.x, 
      sub: 'INTERAKSI' 
    },
    { 
      label: 'YT Shorts', 
      // Vektor Resmi YouTube (Aman tanpa import Lucide)
      icon: (
        <svg className="w-4 h-4 text-[#FF0000] fill-current" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.501 5.814a3.016 3.016 0 0 0 2.122 2.136c1.872.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      ), 
      val: platformStats.yt, 
      sub: 'INTERAKSI' 
    },
  ].map((p, idx) => (
    <div 
      key={idx} 
      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
        isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-400 tracking-wide">{p.label}</span>
        {p.icon}
      </div>
      <div>
        {/* Menjaga Tipografi Angka Roboto Tetap Sempurna */}
        <div className="font-roboto text-2xl font-black tracking-tight text-white">
          {p.val.toLocaleString('id-ID')}
        </div>
        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mt-0.5">{p.sub}</span>
      </div>
    </div>
  ))}
</div>

              {/* GRAFIK & TARGETS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800/60' : 'bg-white border-gray-200'} shadow-sm`}>
                    <div className="flex justify-between items-center mb-6">
                      <h4 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Tren Interaksi (30 Hari)</h4>
                      <div className="flex items-center space-x-3 text-[10px] font-bold">
                        <span className="flex items-center text-gray-400"><div className="w-2 h-2 bg-[#008234] rounded-full mr-1.5"></div> Engagement</span>
                        <span className="flex items-center text-gray-400"><div className="w-2 h-2 bg-blue-500 rounded-full mr-1.5"></div> Views</span>
                      </div>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs><linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#008234" stopOpacity={0.15}/><stop offset="95%" stopColor="#008234" stopOpacity={0}/></linearGradient></defs>
                          <XAxis dataKey="day" stroke="#6B7280" fontSize={9} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '15px', fontSize: '11px', backgroundColor: isDarkMode ? '#161920' : '#fff', borderColor: isDarkMode ? '#2d3139' : '#eee', color: isDarkMode ? '#fff' : '#000' }} />
                          <Area type="monotone" dataKey="eng" stroke="#008234" strokeWidth={3} fillOpacity={1} fill="url(#colorEng)" />
                          <Line type="monotone" dataKey="views" stroke="#3B82F6" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <MonthlyGoals
                  isDarkMode={isDarkMode}
                  upcomingPlans={upcomingPlans}
                  wpCount={wpCount}
                  />

                </div>
                <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800/60' : 'bg-white border-gray-200'} shadow-sm h-fit`}><TargetTracker /></div>
              </div>

              {/* TABEL NASKAH MENDATANG (PEMBUNGKUS SPAN SUDAH DITEPATKAN) */}
              <div className={`p-8 rounded-3xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800/60' : 'bg-white border-gray-200'} shadow-sm`}>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h4 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t.upcomingTitle}</h4>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">{t.upcomingSub}</p>
                  </div>
                  <span className="text-[10px] font-black text-[#008234] bg-emerald-500/10 px-3 py-1.5 rounded-xl uppercase tracking-widest">CLOUD SYNCED</span>
                </div>

                {loadingContents ? (
                  <div className="flex flex-col items-center py-16 text-gray-400 space-y-3"><Loader2 className="animate-spin text-[#008234]" size={28} /><span className="text-xs font-bold tracking-widest uppercase">Memuat Arsip Redaksi...</span></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] text-gray-400 uppercase border-b border-gray-100/10 pb-4">
                          <th className="pb-4 px-4 font-black">Judul Naskah</th>
                          <th className="pb-4 px-4 font-black">Pilar</th>
                          <th className="pb-4 px-4 font-black">Jadwal Tayang</th>
                          <th className="pb-4 px-4 font-black">Status Produksi</th>
                          <th className="pb-4 px-4 font-black">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="text-[11px] font-bold divide-y divide-gray-100/5">
                        {upcomingPlans.map((p) => (
                          <tr key={p.id} onClick={() => setSelectedContent(p)} className="group cursor-pointer hover:bg-[#008234]/5 transition-all">
                            <td className={`py-5 px-4 max-w-xs truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              <div className="flex items-center space-x-2"><span className="truncate">{p.title}</span>{p.copywriting && <Sparkles size={11} className="text-[#008234] flex-shrink-0" />}</div>
                            </td>
                            {/* KOREKSI MUTLAK: Sekarang output fungsi dibungkus tag span riil */}
                            <td className="py-5 px-4">
                              <span className={getPillarStyles(p.pillar)}>{p.pillar || 'General'}</span>
                            </td>
                            <td className="py-5 px-4 text-gray-500 font-mono italic">{p.publish_date} | {p.publish_time}</td>
                            {/* KOREKSI MUTLAK: Sekarang output fungsi dibungkus tag span riil */}
                            <td className="py-5 px-4">
                              <span className={getProdStatusBadge(p.prod_status)}>{p.prod_status || 'Drafting'}</span>
                            </td>
                            <td className="py-5 px-4"><div className="w-7 h-7 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:bg-[#008234] group-hover:text-white flex items-center justify-center transition-all"><ChevronRight size={13} /></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB PLANNING */}
          {activeTab === 'planning' && (
            <div className="animate-fadeIn max-w-4xl mx-auto py-4">
              <div className={`p-8 rounded-[40px] border ${isDarkMode ? 'bg-[#12151a] border-gray-800/60' : 'bg-white border-gray-200'} shadow-2xl space-y-8 relative overflow-hidden`}>
                <div className="space-y-2"><h2 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Perencanaan Naskah</h2><p className="text-sm text-gray-500 font-medium">Instruksikan arahan kreatif dan muatan teks langsung ke cloud.</p></div>
                {showSuccess && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-5 rounded-3xl flex items-center space-x-3 animate-bounce"><CheckCircle2 size={24} /><span className="font-black text-sm">Naskah terkirim ke panel komando editor!</span></div>}
                
                <form onSubmit={handleSavePlanning} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Tanggal Rilis</label><input required type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className={`w-full px-6 py-4 rounded-2xl border ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-200'} outline-none focus:border-[#008234] font-bold text-sm`} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Waktu Penayangan</label><input required type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} className={`w-full px-6 py-4 rounded-2xl border ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-200'} outline-none focus:border-[#008234] font-bold text-sm`} /></div>
                  </div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Judul Agenda / Naskah</label><input required type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Contoh: Rilis Sikap Resmi Organisasi..." className={`w-full px-6 py-4 rounded-2xl border ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-200'} outline-none focus:border-[#008234] font-bold text-sm`} /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Pilar Muatan</label><select value={formPillar} onChange={(e) => setFormPillar(e.target.value)} className={`w-full px-6 py-4 rounded-2xl border ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-200'} font-bold text-sm outline-none`}><option value="Educational">Educational</option><option value="Informative">Informative</option><option value="Entertaining">Entertaining</option><option value="Promotional">Promotional</option></select></div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Sasaran Platform</label>
                      <div className="flex flex-wrap gap-2">
                        {['Meta', 'TikTok', 'X', 'Website', 'YT Shorts'].map(p => (
                          <button key={p} type="button" onClick={() => setFormPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} className={`px-4 py-2.5 rounded-xl text-[10px] font-black border transition-all ${formPlatforms.includes(p) ? 'bg-[#008234] text-white border-transparent' : isDarkMode ? 'bg-[#0b0d10] text-gray-400 border-gray-800' : 'bg-white text-gray-500 border-gray-200'}`}>{p}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Status Awal Rencana</label>
                    <select value={formProdStatus} onChange={(e) => setFormProdStatus(e.target.value)} className={`w-full px-6 py-4 rounded-2xl border ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-200'} font-bold text-sm outline-none`}>
                      <option value="Drafting">📝 Drafting (Kerangka Ide)</option>
                      <option value="Editing/Design">🎨 Editing/Design (Sedang Dikerjakan Tim)</option>
                      <option value="Ready to Post">🚀 Ready to Post (Siap Mengudara)</option>
                      <option value="Completed">✅ Completed (Langsung Terbit & Siap Direkap)</option>
                    </select>
                  </div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Briefing Editor (Instruksi Visual & Hook)</label><textarea rows={4} value={formCopywriting} onChange={(e) => setFormCopywriting(e.target.value)} placeholder="Berikan kerangka ide, instruksi potongan video, atau kalimat pancingan pertama..." className={`w-full px-6 py-4 rounded-2xl border ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-200'} font-bold text-sm outline-none resize-none`} /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Naskah Caption Matang</label><textarea rows={4} value={formCaption} onChange={(e) => setFormCaption(e.target.value)} placeholder="Teks publikasi final yang siap disalin oleh tim beserta tagar pelengkap..." className={`w-full px-6 py-4 rounded-2xl border ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-200'} font-bold text-sm outline-none resize-none`} /></div>
                  
                  <button disabled={isSubmitting} type="submit" className="w-full bg-[#008234] hover:bg-[#006b2a] text-white py-5 rounded-3xl font-black text-xs shadow-xl shadow-green-900/20 transition-all transform active:scale-95 flex items-center justify-center space-x-2">
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><Sparkles size={18} /><span>DISTRIBUSIKAN BLUEPRINT NASKAH</span></>}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB RECAP TERINTEGRASI */}
          {activeTab === 'recap' && <RecapForm isDarkMode={isDarkMode} onRecapSuccess={fetchContentsAndStats} />}
          {activeTab === 'reports' && ( <Reports isDarkMode={isDarkMode} contents={upcomingPlans} />
        )}

        </main>

        {/* ========================================================= */}
        {/* PANEL DRAWER / MODAL KERJA EDITOR (+ SPAN BADGE FIX)      */}
        {/* ========================================================= */}
        {selectedContent && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className={`w-full max-w-2xl ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-100'} rounded-[35px] shadow-2xl overflow-hidden relative border max-h-[90vh] flex flex-col`}>
              <button onClick={() => setSelectedContent(null)} className="absolute top-6 right-6 p-2.5 bg-gray-500/10 text-gray-400 hover:text-white rounded-full transition-all z-10"><X size={16} /></button>
              
              <div className="p-8 md:p-10 space-y-6 overflow-y-auto flex-1">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 text-[10px] font-black text-[#008234] uppercase tracking-widest"><Info size={13} /><span>Lembar Pengarahan Produksi</span></div>
                  <h2 className={`text-2xl font-black leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedContent.title}</h2>
                  
                  {/* KOREKSI BADGE DI MODAL POPUP JIKA BARIS DIKLIK */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className={getPillarStyles(selectedContent.pillar)}>{selectedContent.pillar || 'General'}</span>
                    <span className="px-3 py-1 rounded-lg text-[9px] font-black border bg-gray-500/10 text-gray-400 border-transparent">{selectedContent.publish_date} @ {selectedContent.publish_time}</span>
                    <span className={getProdStatusBadge(selectedContent.prod_status)}>{selectedContent.prod_status || 'Drafting'}</span>
                  </div>
                </div>

                {/* Seksi Poin 1: Aksi Cepat Pembaruan Status */}
                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-gray-50 border-gray-200'} space-y-2.5`}>
                  <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Pembaruan Siklus Produksi (Kondisi Terkini)</p>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      disabled={statusUpdating}
                      onClick={() => updateContentStatus(selectedContent.id, 'Editing/Design', 'Ideation')}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black border transition-all ${selectedContent.prod_status === 'Editing/Design' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'border-gray-500/20 text-gray-400 hover:border-gray-500/50'}`}
                    >
                      🎨 Sedang Diedit
                    </button>
                    <button 
                      disabled={statusUpdating}
                      onClick={() => updateContentStatus(selectedContent.id, 'Ready to Post', 'Scheduled')}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black border transition-all ${selectedContent.prod_status === 'Ready to Post' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' : 'border-gray-500/20 text-gray-400 hover:border-gray-500/50'}`}
                    >
                      🚀 Siap Tayang
                    </button>
                    <button 
                      disabled={statusUpdating}
                      onClick={() => updateContentStatus(selectedContent.id, 'Completed', 'Posted')}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black border transition-all ${selectedContent.pub_status === 'Posted' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'border-gray-500/20 text-gray-400 hover:border-gray-500/50'}`}
                    >
                      ✅ Selesai & Terbit
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-500/10 pb-2">Brief & Arahan Visual</h4>
                    <div className={`p-4 rounded-2xl text-xs font-bold leading-relaxed ${isDarkMode ? 'bg-[#0b0d10] text-gray-300 border border-gray-800/80' : 'bg-emerald-50/40 text-emerald-950'} min-h-[120px] whitespace-pre-wrap`}>
                      {selectedContent.copywriting || "Tidak ada instruksi penyuntingan khusus."}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-500/10 pb-2">Naskah Caption Matang</h4>
                    <div className={`p-4 rounded-2xl text-xs font-bold leading-relaxed ${isDarkMode ? 'bg-[#0b0d10] text-gray-300 border border-gray-800/80' : 'bg-gray-50 text-gray-800'} min-h-[120px] whitespace-pre-wrap`}>
                      {selectedContent.caption || "Teks publikasi belum dipasok."}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`p-6 border-t ${isDarkMode ? 'border-gray-800 bg-[#12151a]' : 'border-gray-100 bg-gray-50/50'} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-b-[35px]`}>
                 <div className="flex items-center space-x-2">
                   <p className="text-[9px] font-black text-gray-500 uppercase">Jalur Distribusi:</p>
                   <div className="flex flex-wrap gap-1">
                     {selectedContent.platforms?.map(p => <span key={p} className="text-[8px] font-black bg-[#008234]/10 text-[#008234] px-2 py-0.5 rounded uppercase">{p}</span>)}
                   </div>
                 </div>
                 <button onClick={() => setSelectedContent(null)} className="w-full sm:w-auto px-6 py-2.5 bg-[#008234] hover:bg-[#006b2a] text-white rounded-xl font-black text-xs transition-all">
                   TUTUP PANEL INSTRUKSI
                 </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}