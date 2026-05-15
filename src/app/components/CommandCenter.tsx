"use client";
import { useAuth } from '../contexts/AuthContext';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  LayoutDashboard, UploadCloud, CalendarDays, FileText, Menu, X, 
  Globe, Sparkles, Sun, Moon, LogOut, Bell, Search, Loader2, CheckSquare,
  Eye, MousePointer2, Send, ChevronRight, Languages, Flame, Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import TargetTracker from './TargetTracker';
import MonthlyGoals from './MonthlyGoals';
import RecapForm from './RecapForm';
import Reports from './Reports';
import PlanningForm from './PlanningForm';
// Catatan: Anda perlu membuat file/komponen Jobdesk terpisah nantinya
// import Jobdesk from './Jobdesk'; 

const BrandIcons = {
  Web: () => <Globe className="w-5 h-5 text-blue-400" />,
  IG: () => <svg className="w-5 h-5 text-[#E4405F]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>,
  FB: () => <svg className="w-5 h-5 text-[#1877F2] fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  TikTok: () => <svg className="w-5 h-5 text-rose-600 fill-current" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>,
  X: () => <svg className="w-4 h-4 text-gray-200 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  YT: () => <svg className="w-5 h-5 text-[#FF0000] fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
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

const defaultChartData = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  return { day: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }), eng: 0, views: 0 };
});

export default function CommandCenter() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [lang, setLang] = useState<'ID' | 'EN'>('ID');
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [allContents, setAllContents] = useState<ContentPlan[]>([]);
  const [chartData, setChartData] = useState(defaultChartData);
  const [loadingContents, setLoadingContents] = useState(true);
  const [wpCount, setWpCount] = useState(0);
  
  // Metrik Global (4 Hero Cards)
  const [globalViews, setGlobalViews] = useState(0);
  const [globalEng, setGlobalEng] = useState(0);

  // Metrik 6 Platform (Breakdown Cards)
  const [platformStats, setPlatformStats] = useState({ web: 0, ig: 0, fb: 0, tiktok: 0, x: 0, yt: 0 });

  const fetchContentsAndStats = async () => {
    try {
      setLoadingContents(true);
      const { data: rawContents } = await supabase.from('contents').select('*');
      
      let totalV = 0; let totalE = 0;
      let pStats = { web: 0, ig: 0, fb: 0, tiktok: 0, x: 0, yt: 0 };

      if (rawContents) {
        rawContents.forEach(c => {
           totalV += Number(c.views || 0);
           totalE += Number(c.engagement || 0);

           // Mengakumulasi langsung dari kolom-kolom baru
           pStats.web += Number(c.web_views || 0); // Web dihitung berdasarkan views/impressions
           pStats.ig += Number(c.ig_engagement || 0);
           pStats.fb += Number(c.fb_engagement || 0);
           pStats.tiktok += Number(c.tiktok_engagement || 0);
           pStats.x += Number(c.x_engagement || 0);
           pStats.yt += Number(c.yt_engagement || 0);
        });
        
        // Urutkan konten agar yang terbaru di atas
        const sortedContents = rawContents.sort((a, b) => new Date(b.publish_date || '').getTime() - new Date(a.publish_date || '').getTime());
        setAllContents(sortedContents);
      }

      setGlobalViews(totalV);
      setGlobalEng(totalE);
      setPlatformStats(pStats);

    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoadingContents(false);
      try {
        const wpRes = await fetch('https://pkbgarut.id/wp-json/wp/v2/posts?per_page=1&status=publish');
        if (wpRes.ok) setWpCount(Number(wpRes.headers.get('X-WP-Total') || 0));
      } catch (e) {}
    }
  };

  useEffect(() => { fetchContentsAndStats(); }, []);

  // Filter untuk Tabel Dasbor (Hanya yang sudah tayang)
  const postedContents = allContents.filter(c => c.pub_status === 'Posted');
  
  // Status Counts untuk Notifikasi
  const statusCounts = {
    editing: allContents.filter(p => p.prod_status === 'Editing/Design').length,
    drafting: allContents.filter(p => p.prod_status === 'Drafting' || p.prod_status === 'Ideation').length,
    ready: allContents.filter(p => p.prod_status === 'Ready to Post').length
  };

  const formatNumberMax = (num: number) => num > 9999 ? `${(num/1000).toFixed(1)}K` : num.toLocaleString('id-ID');

  // KOMPONEN HISTORI PLATFORM DINAMIS
  const PlatformHistoryTable = ({ title, icon, platformKey, engagementKey }: { title: string, icon: React.ReactNode, platformKey: string, engagementKey: keyof ContentPlan }) => {
    // Ambil konten yang platformnya cocok, atau jika dari Recap (Imported Data)
    const platformContents = postedContents.filter(c => 
      c.platforms?.includes(platformKey.toUpperCase()) || 
      (c.pillar === 'Imported Data' && Number(c[engagementKey]) > 0)
    ).sort((a, b) => Number(b[engagementKey] || 0) - Number(a[engagementKey] || 0)); // Urutkan berdasarkan engagement tertinggi

    const top5Contents = platformContents.slice(0, 5);

    return (
      <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800/60' : 'bg-white border-gray-200'} shadow-sm`}>
        <div className="flex justify-between items-center mb-6 border-b border-gray-500/10 pb-4">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <h4 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h4>
              <p className="text-[10px] text-gray-400 font-bold mt-1">Top 5 Performa Tertinggi</p>
            </div>
          </div>
          <Flame size={16} className="text-emerald-500" />
        </div>

        {top5Contents.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs font-bold uppercase">Belum ada data</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-gray-400 uppercase border-b border-gray-100/10 pb-2">
                  <th className="pb-2 px-2 font-black">Naskah</th>
                  <th className="pb-2 px-2 font-black text-right">Interaksi</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-bold divide-y divide-gray-100/5">
                {top5Contents.map((p) => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                    <td className={`py-3 px-2 max-w-[150px] truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      {p.title}
                    </td>
                    <td className="py-3 px-2 text-right text-emerald-400 font-roboto text-sm">
                      {formatNumberMax(Number(p[engagementKey] || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Tombol Lihat Seluruhnya */}
        <button 
          onClick={() => setActiveTab('reports')} 
          className={`w-full mt-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-gray-800/30 text-gray-400 hover:bg-gray-800 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          Lihat Seluruhnya di Reports
        </button>
      </div>
    );
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-300 ${isDarkMode ? 'bg-[#0b0d10] text-gray-100' : 'bg-gray-50 text-gray-800'}`}>
      
      {/* SIDEBAR TETAP SAMA */}
      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-64 ${isDarkMode ? 'bg-[#12151a] border-gray-800/60' : 'bg-white border-gray-200'} border-r flex flex-col transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-200 shadow-sm`}>
        <div className={`flex items-center space-x-3 px-6 py-6 border-b border-gray-100/10 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          <div className="w-10 h-10 bg-[#008234] rounded-xl flex items-center justify-center text-white font-black text-xs shadow-lg shadow-green-900/20">PKB</div>
          <div><h1 className="font-black text-xs uppercase tracking-wider">Command Center</h1><p className="text-[9px] text-gray-400 font-bold tracking-widest uppercase">Media Strategist</p></div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'jobdesk', label: 'Jobdesk', icon: CheckSquare },
            { id: 'planning', label: 'Planning', icon: CalendarDays },
            { id: 'recap', label: 'Recap', icon: UploadCloud },
            { id: 'reports', label: 'Reports', icon: FileText },
          ].map((item) => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === item.id ? 'bg-[#008234] text-white shadow-lg shadow-green-900/20' : isDarkMode ? 'text-gray-400 hover:bg-gray-800/40' : 'text-gray-500 hover:bg-gray-100/50'}`}>
              <item.icon size={18} /><span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* TOP BAR TETAP SAMA */}
        <header className={`h-20 flex items-center justify-between px-8 border-b ${isDarkMode ? 'bg-[#12151a] border-gray-800/60' : 'bg-white border-gray-200'} sticky top-0 z-30 transition-colors`}>
          <div className="md:hidden"><Menu onClick={() => setMobileMenuOpen(true)} size={20} className="cursor-pointer" /></div>
          
          <div className={`hidden md:flex items-center rounded-2xl px-4 py-2.5 border w-80 transition-all ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 focus-within:border-[#008234]' : 'bg-gray-50 border-gray-200 focus-within:border-[#008234]'}`}>
            <Search size={15} className="text-gray-400 mr-2.5" />
            <input type="text" placeholder="Cari naskah..." className={`bg-transparent text-xs outline-none w-full font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`} />
          </div>

          <div className="flex items-center space-x-3">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2.5 rounded-xl border transition-all ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-amber-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
              {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* NOTIFIKASI REAL-TIME */}
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className={`p-2.5 rounded-xl border relative transition-all ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                <Bell size={15} />
                {(statusCounts.ready > 0 || statusCounts.editing > 0) && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#12151a] rounded-full"></span>}
              </button>

              {showNotifications && (
                <div className={`absolute right-0 mt-3 w-80 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-fadeIn ${isDarkMode ? 'bg-[#161920] border-gray-800' : 'bg-white border-gray-100'}`}>
                  <div className="p-4 border-b border-gray-100/10 flex justify-between items-center"><span className="text-xs font-black uppercase tracking-wider">Status Produksi</span><Activity size={14} className="text-emerald-500" /></div>
                  <div className="p-4 text-xs space-y-3 font-bold">
                    <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-gray-300">{statusCounts.ready} Naskah Siap Tayang</span></div>
                    <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-amber-500"></div><span className="text-gray-300">{statusCounts.editing} Naskah Sedang Diedit</span></div>
                    <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-gray-300">{statusCounts.drafting} Ide / Drafting</span></div>
                  </div>
                </div>
              )}
            </div>

            <div className={`flex items-center space-x-3 pl-2 py-1 pr-3 rounded-2xl border ${isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
              <div className="w-7 h-7 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-sm">A</div>
              <span className={`text-xs font-bold hidden sm:block pr-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Admin</span>
            </div>
          </div>
        </header>

        <main className="p-8 overflow-y-auto space-y-8">
          
          {activeTab === 'dashboard' && (
            <div className="animate-fadeIn space-y-8">
              
              {/* STRUKTUR LAMA: 3 HERO METRICS ATAS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800/80' : 'bg-white border-gray-200'} shadow-sm relative overflow-hidden group`}>
                  <div className="flex justify-between items-start"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Grand Total Reach</p><div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl"><Eye size={16} /></div></div>
                  <h3 className={`text-4xl font-black tracking-tight mt-4 italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatNumberMax(globalViews)}</h3>
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Eye size={100} /></div>
                </div>
                <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800/80' : 'bg-white border-gray-200'} shadow-sm relative overflow-hidden group`}>
                  <div className="flex justify-between items-start"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Grand Total Eng.</p><div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl"><MousePointer2 size={16} /></div></div>
                  <h3 className={`text-4xl font-black tracking-tight mt-4 italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatNumberMax(globalEng)}</h3>
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><MousePointer2 size={100} /></div>
                </div>
                <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800/80' : 'bg-white border-gray-200'} shadow-sm relative overflow-hidden group`}>
                  <div className="flex justify-between items-start"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Postingan</p><div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl"><Send size={16} /></div></div>
                  <h3 className={`text-4xl font-black tracking-tight mt-4 italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {postedContents.length + wpCount}
                  </h3>
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Send size={100} /></div>
                </div>
              </div>

              {/* STRUKTUR BARU: 6 KARTU PLATFORM BREAKDOWN AKUMULATIF */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Website', icon: <BrandIcons.Web />, val: platformStats.web, sub: 'IMPRESSIONS' },
                  { label: 'Instagram', icon: <BrandIcons.IG />, val: platformStats.ig, sub: 'ENGAGEMENT' },
                  { label: 'Facebook', icon: <BrandIcons.FB />, val: platformStats.fb, sub: 'ENGAGEMENT' },
                  { label: 'TikTok', icon: <BrandIcons.TikTok />, val: platformStats.tiktok, sub: 'ENGAGEMENT' },
                  { label: 'X (Twitter)', icon: <BrandIcons.X />, val: platformStats.x, sub: 'ENGAGEMENT' },
                  { label: 'YT Shorts', icon: <BrandIcons.YT />, val: platformStats.yt, sub: 'ENGAGEMENT' },
                ].map((p, idx) => (
                  <div key={idx} className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">{p.label}</span>
                      {p.icon}
                    </div>
                    <div>
                      <div className={`font-roboto text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatNumberMax(p.val)}</div>
                      <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mt-1">{p.sub}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* STRUKTUR LAMA: GRAFIK 30 HARI, TARGET BULANAN, & MINGGUAN */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* BAGIAN KIRI */}
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
                          <Line type="monotone" dataKey="views" stroke="#3B82F6" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <MonthlyGoals
                    isDarkMode={isDarkMode}
                    upcomingPlans={allContents} 
                    wpCount={wpCount}
                  />
                </div>

                {/* BAGIAN KANAN */}
                <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800/60' : 'bg-white border-gray-200'} shadow-sm h-fit`}>
                  <TargetTracker />
                </div>
              </div>

              {/* STRUKTUR BARU: 6 TABEL HISTORI PLATFORM MENGUDARA (TOP 5) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <PlatformHistoryTable title="Web / GSC" icon={<BrandIcons.Web />} platformKey="web" engagementKey="web_engagement" />
                <PlatformHistoryTable title="Instagram" icon={<BrandIcons.IG />} platformKey="ig" engagementKey="ig_engagement" />
                <PlatformHistoryTable title="Facebook" icon={<BrandIcons.FB />} platformKey="fb" engagementKey="fb_engagement" />
                <PlatformHistoryTable title="TikTok" icon={<BrandIcons.TikTok />} platformKey="tiktok" engagementKey="tiktok_engagement" />
                <PlatformHistoryTable title="X (Twitter)" icon={<BrandIcons.X />} platformKey="x" engagementKey="x_engagement" />
                <PlatformHistoryTable title="YT Shorts" icon={<BrandIcons.YT />} platformKey="yt" engagementKey="yt_engagement" />
              </div>

            </div>
          )}

          {activeTab === 'planning' && <PlanningForm isDarkMode={isDarkMode} onPlanAdded={fetchContentsAndStats} />}
          {activeTab === 'recap' && <RecapForm isDarkMode={isDarkMode} onRecapSuccess={fetchContentsAndStats} />}
          {activeTab === 'reports' && <Reports isDarkMode={isDarkMode} contents={allContents} />}
          {activeTab === 'jobdesk' && (
            <div className={`p-12 text-center rounded-3xl border ${isDarkMode ? 'bg-[#12151a] border-gray-800 text-gray-400' : 'bg-white border-gray-200 text-gray-600'}`}>
              <CheckSquare size={48} className="mx-auto mb-4 text-[#008234] opacity-50" />
              <h2 className="text-xl font-black uppercase tracking-widest mb-2">Papan Jobdesk Redaksi</h2>
              <p className="text-xs font-bold">Katalog Instruksi dipindahkan ke sini. Modul sedang dalam tahap perakitan.</p>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}