"use client";
import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity, Globe } from 'lucide-react';

// Mendefinisikan kontrak properti yang dipasok dari CommandCenter
interface MonthlyGoalsProps {
  isDarkMode?: boolean;
  upcomingPlans?: any[];
  wpCount?: number;
}

// Komponen Ikon Sederhana untuk Kartu Traksi (Karena kita tidak meng-import dari luar)
const BrandIcons = {
  IG: () => <svg className="w-4 h-4 text-[#E4405F]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>,
  FB: () => <svg className="w-4 h-4 text-[#1877F2] fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  TikTok: () => <svg className="w-4 h-4 text-rose-600 fill-current" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>,
};

export default function MonthlyGoals({ 
  isDarkMode = true, 
  upcomingPlans = [], 
  wpCount = 0 
}: MonthlyGoalsProps) {
  
  // --- 1. MESIN WAKTU RIIL (Kalkulasi Otomatis Bulan Berjalan) ---
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Menyaring naskah yang jadwal tayangnya jatuh pada bulan & tahun ini
  const thisMonthContents = upcomingPlans.filter(p => {
    if (!p.publish_date) return false;
    const dateObj = new Date(p.publish_date);
    return dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear;
  });

  // Menghitung Jangkauan (Views) & Interaksi khusus bulan berjalan
  const thisMonthViews = thisMonthContents.reduce((acc, curr) => acc + (Number(curr.views) || 0), 0);
  const thisMonthEng = thisMonthContents.reduce((acc, curr) => acc + (Number(curr.engagement) || 0), 0);

  // --- 2. LOGIKA MOMENTUM (Traksi Pertumbuhan Lini) ---
  const momentumStats = useMemo(() => {
    let latestDateStr = '';
    upcomingPlans.forEach(c => { if (c.publish_date && c.publish_date > latestDateStr) latestDateStr = c.publish_date; });
    if (!latestDateStr) latestDateStr = new Date().toISOString().split('T')[0];
    
    const currYear = parseInt(latestDateStr.split('-')[0]);
    const currMonth = parseInt(latestDateStr.split('-')[1]);
    
    const currMonthStr = `${currYear}-${String(currMonth).padStart(2, '0')}`;
    const prevMonthDate = new Date(currYear, currMonth - 2, 1);
    const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const getMom = (platKey: string, engKey: string) => {
      const curr = upcomingPlans.filter(c => c.platforms?.includes(platKey) && c.publish_date?.startsWith(currMonthStr)).reduce((s, c) => s + Number(c[engKey] || 0), 0);
      const prev = upcomingPlans.filter(c => c.platforms?.includes(platKey) && c.publish_date?.startsWith(prevMonthStr)).reduce((s, c) => s + Number(c[engKey] || 0), 0);
      
      let perc = 0;
      if (prev === 0) perc = curr > 0 ? 100 : 0;
      else perc = Math.round(((curr - prev) / prev) * 100);
      
      return { curr, perc };
    };

    return [
      { label: 'TikTok Traksi', icon: <BrandIcons.TikTok />, ...getMom('TIKTOK', 'tiktok_engagement') },
      { label: 'Instagram Traksi', icon: <BrandIcons.IG />, ...getMom('IG', 'ig_engagement') },
      { label: 'Facebook Traksi', icon: <BrandIcons.FB />, ...getMom('FB', 'fb_engagement') }
    ];
  }, [upcomingPlans]);

  // --- 3. SASARAN TARGET TRANSPARAN ---
  const targets = [
    { 
      label: 'Distribusi Konten (Cross-Post)', 
      current: thisMonthContents.filter(p => p.pub_status === 'Posted').length, 
      target: 30, 
      unit: 'tayang', 
      color: 'purple',
      source: 'Naskah berstatus "Posted" bulan ini' 
    },
    { 
      label: 'Jangkauan Audiens (Reach)', 
      current: thisMonthViews, 
      target: 100000, 
      unit: 'views', 
      color: 'emerald',
      source: 'Akumulasi views konten bulan ini' 
    },
    { 
      label: 'Target Interaksi (Engagement)', 
      current: thisMonthEng, 
      target: 10000, 
      unit: 'reaksi', 
      color: 'amber',
      source: 'Akumulasi likes/komen/share bulan ini' 
    }
  ];

  return (
    <div className={`p-6 rounded-[25px] border ${isDarkMode ? 'bg-[#12151a] border-gray-800/60' : 'bg-white border-gray-200'} shadow-sm`}>
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-500/10">
        <div>
          <h3 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Target Pencapaian Bulanan
          </h3>
          <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">
            Progress Publikasi & Distribusi Bulanan
          </p>
        </div>
        <Activity size={18} className="text-[#008234]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* RENDER 3 KARTU MONTHLY GOALS (BARIS ATAS) */}
        {targets.map((t, idx) => {
          const percentage = Math.min(Math.round((t.current / t.target) * 100), 100);
          return (
            <div key={`goal-${idx}`} className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-400">{t.label}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${percentage >= 100 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-400'}`}>
                    {percentage}%
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className={`font-roboto text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {t.current.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] font-bold text-gray-500">
                    / <span className="font-roboto">{t.target.toLocaleString('id-ID')}</span> {t.unit}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800/60' : 'bg-gray-200'}`}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: percentage >= 100 ? '#10B981' : t.color === 'blue' ? '#3B82F6' : t.color === 'purple' ? '#A855F7' : t.color === 'emerald' ? '#10B981' : t.color === 'amber' ? '#F59E0B' : '#EF4444' }} />
                </div>
                <span className="text-[8px] font-medium text-gray-500 italic block">💡 {t.source}</span>
              </div>
            </div>
          );
        })}

        {/* RENDER 3 KARTU PLATFORM MOMENTUM (BARIS BAWAH) */}
        {momentumStats.map((m, i) => (
          <div key={`mom-${i}`} className={`p-5 rounded-2xl border flex flex-col justify-between transition-all group ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 hover:border-gray-700' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                {m.icon} {m.label}
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-md ${m.perc >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {m.perc >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                {Math.abs(m.perc)}%
              </div>
            </div>
            <div>
              <div className={`font-roboto text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {m.curr.toLocaleString('id-ID')}
              </div>
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mt-1">Interaksi Bulan Ini</span>
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}