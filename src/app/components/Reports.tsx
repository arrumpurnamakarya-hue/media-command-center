"use client";
import React, { useState, useMemo } from 'react';
import { FileText, Search, Sparkles, RefreshCw, CheckCircle2, TrendingUp, Lightbulb, Globe } from 'lucide-react';

const PlatformIcons = {
  Web: () => <Globe className="w-3 h-3 text-blue-400 inline-block mr-1" />,
  IG: () => <svg className="w-3 h-3 text-[#E4405F] fill-current inline-block mr-1" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
  FB: () => <svg className="w-3 h-3 text-[#1877F2] fill-current inline-block mr-1" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  TikTok: () => <svg className="w-3 h-3 text-[#ff0050] fill-current inline-block mr-1" viewBox="0 0 24 24"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.674c0 1.913-1.554 3.467-3.467 3.467-1.914 0-3.468-1.554-3.468-3.467 0-1.914 1.554-3.468 3.468-3.468h.078V8.761h-.078c-3.824 0-6.924 3.1-6.924 6.924 0 3.823 3.1 6.923 6.924 6.924 3.823 0 6.922-3.1 6.922-6.923v-8.15a8.175 8.175 0 0 0 6.687 2.333v-3.18z"/></svg>,
  X: () => <svg className="w-3 h-3 text-gray-300 fill-current inline-block mr-1" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  YT: () => <svg className="w-3 h-3 text-[#FF0000] fill-current inline-block mr-1" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.501 5.814a3.016 3.016 0 0 0 2.122 2.136c1.872.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
};

interface ReportsProps {
  isDarkMode?: boolean;
  contents?: any[];
}

export default function Reports({ isDarkMode = true, contents = [] }: ReportsProps) {
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [showAIPanel, setShowAIPanel] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiReport, setAiReport] = useState<{ exec: string; perf: string; rec: string } | null>(null);

  const availableYears = ['All', '2026', '2027', '2028', '2029', '2030', '2031'];
  const months = [
    { value: 'All', label: 'Semua Bulan' },
    { value: '0', label: 'Januari' }, { value: '1', label: 'Februari' },
    { value: '2', label: 'Maret' }, { value: '3', label: 'April' },
    { value: '4', label: 'Mei' }, { value: '5', label: 'Juni' },
    { value: '6', label: 'Juli' }, { value: '7', label: 'Agustus' },
    { value: '8', label: 'September' }, { value: '9', label: 'Oktober' },
    { value: '10', label: 'November' }, { value: '11', label: 'Desember' },
  ];

  const filteredContents = useMemo(() => {
    return contents.filter(item => {
      const matchesSearch = (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (item.pillar || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!item.publish_date) return matchesSearch && selectedYear === 'All' && selectedMonth === 'All';
      
      const dateParts = item.publish_date.split('-');
      const itemYear = dateParts[0];
      const itemMonthIndex = String(parseInt(dateParts[1], 10) - 1); 

      const matchesYear = selectedYear === 'All' || itemYear === selectedYear;
      const matchesMonth = selectedMonth === 'All' || itemMonthIndex === selectedMonth;

      return matchesSearch && matchesYear && matchesMonth;
    });
  }, [contents, searchQuery, selectedYear, selectedMonth]);

  const summaryMetrics = useMemo(() => {
    const totalReach = filteredContents.reduce((sum, item) => sum + (parseInt(item.views || 0) || 0), 0);
    const totalEng = filteredContents.reduce((sum, item) => sum + (parseInt(item.engagement || 0) || 0), 0);
    const postedCount = filteredContents.filter(item => item.pub_status === 'Posted').length;
    
    let topPlatform = 'Merata';
    let maxPlatEng = 0;
    const platSums = {
      Web: filteredContents.reduce((sum, item) => sum + (parseInt(item.web_engagement || 0) || 0), 0),
      IG: filteredContents.reduce((sum, item) => sum + (parseInt(item.ig_engagement || 0) || 0), 0),
      FB: filteredContents.reduce((sum, item) => sum + (parseInt(item.fb_engagement || 0) || 0), 0),
      TikTok: filteredContents.reduce((sum, item) => sum + (parseInt(item.tiktok_engagement || 0) || 0), 0),
      X: filteredContents.reduce((sum, item) => sum + (parseInt(item.x_engagement || 0) || 0), 0),
      Shorts: filteredContents.reduce((sum, item) => sum + (parseInt(item.yt_engagement || 0) || 0), 0),
    };
    Object.entries(platSums).forEach(([p, val]) => {
      if (val > maxPlatEng) { maxPlatEng = val; topPlatform = p; }
    });

    const pillarCounts: { [key: string]: number } = {};
    filteredContents.forEach(c => {
      const p = c.pillar || 'Strategic';
      pillarCounts[p] = (pillarCounts[p] || 0) + 1;
    });
    
    let topPillar = 'Strategic';
    let maxCount = 0;
    Object.entries(pillarCounts).forEach(([p, count]) => {
      if (count > maxCount) { maxCount = count; topPillar = p; }
    });

    return { totalReach, totalEng, postedCount, topPillar, topPlatform, maxPlatEng };
  }, [filteredContents]);

  const printPeriodText = useMemo(() => {
    const monthLabel = selectedMonth !== 'All' ? months.find(m => m.value === selectedMonth)?.label : 'Keseluruhan';
    const yearLabel = selectedYear !== 'All' ? selectedYear : '2026-2031';
    if (selectedMonth === 'All' && selectedYear === 'All') return 'Periode Aktivasi (2026 — 2031)';
    return `Bulan ${monthLabel} ${yearLabel}`;
  }, [selectedMonth, selectedYear]);

  const handleGenerateAI = () => {
    setShowAIPanel(true);
    setIsAIGenerating(true);
    setTimeout(() => {
      setAiReport({
        exec: `Laporan untuk ${printPeriodText} mencatatkan total jangkauan sebesar ${summaryMetrics.totalReach.toLocaleString('id-ID')} views dengan ${summaryMetrics.totalEng.toLocaleString('id-ID')} interaksi. Platform terkuat: ${summaryMetrics.topPlatform}.`,
        perf: `Platform ${summaryMetrics.topPlatform} memimpin penetrasi tertinggi dengan ${summaryMetrics.maxPlatEng.toLocaleString('id-ID')} reaksi. Eksposur web stabil.`,
        rec: `1. Eskalasi Pilar ${summaryMetrics.topPillar} di lintas platform.\n2. Maksimalkan distribusi video pendek.\n3. Pertahankan ritme publikasi Website untuk SEO.`
      });
      setIsAIGenerating(false);
    }, 1200);
  };

  const bgCard = isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200';
  const bgInput = isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900';
  const textTitle = isDarkMode ? 'text-white' : 'text-gray-900';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* CSS CETAK PDF */}
      <style>{`
        @page { margin: 12mm 15mm; size: A4 landscape; }
        @media print { 
          aside, header, nav, button, .print\\:hidden { display: none !important; } 
          body, html, main { 
            background-color: #ffffff !important; color: #000000 !important; 
            padding: 0 !important; margin: 0 !important; width: 100% !important; 
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
          } 
          .border { border-color: #e5e7eb !important; box-shadow: none !important; } 
        }
      `}</style>

      {/* HEADER UTAMA */}
      <div className={`p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${bgCard} print:hidden`}>
        <div>
          <h2 className={`text-xl font-black tracking-tight ${textTitle} flex items-center gap-2`}><FileText className="text-emerald-500" size={22} /> LAPORAN PERFORMA STRATEGIS</h2>
          <p className="text-xs text-gray-500 mt-1">Sistem Terintegrasi 6 Platform (Web & Medsos)</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleGenerateAI} disabled={isAIGenerating} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-black text-xs transition-all shadow-sm ${showAIPanel ? 'bg-emerald-500 text-white border-emerald-400' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'}`}>
            <Sparkles className={`w-3.5 h-3.5 ${isAIGenerating ? 'animate-spin' : 'animate-pulse'}`} /> {isAIGenerating ? 'MEMPROSES...' : 'AI GENERATION'}
          </button>
          <button onClick={() => window.print()} className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm transition-all">EKSPOR PDF</button>
        </div>
      </div>

      {/* KARTU STATISTIK */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:mt-4">
        <div className={`p-5 rounded-2xl border ${bgCard} print:bg-white`}>
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Total Naskah (Tayang)</span>
          <div className="font-roboto text-2xl font-black text-emerald-500">{summaryMetrics.postedCount}</div>
        </div>
        <div className={`p-5 rounded-2xl border ${bgCard} print:bg-white`}>
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Total Reach Global</span>
          <div className="font-roboto text-2xl font-black text-blue-500">{summaryMetrics.totalReach.toLocaleString('id-ID')}</div>
        </div>
        <div className={`p-5 rounded-2xl border ${bgCard} print:bg-white`}>
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Interaksi Global</span>
          <div className="font-roboto text-2xl font-black text-amber-500">{summaryMetrics.totalEng.toLocaleString('id-ID')}</div>
        </div>
        <div className={`p-5 rounded-2xl border ${bgCard} print:bg-white`}>
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Top Pilar</span>
          <div className="text-lg font-black text-purple-500 truncate uppercase">{summaryMetrics.topPillar}</div>
        </div>
      </div>

      <div className={`p-5 rounded-2xl border ${bgCard} print:hidden`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 text-gray-500" size={16} />
            <input type="text" placeholder="Cari..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full pl-10 pr-4 py-3 rounded-xl border text-xs outline-none ${bgInput}`} />
          </div>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className={`px-4 py-3 rounded-xl border text-xs font-bold outline-none cursor-pointer ${bgInput}`}>
            {availableYears.map(y => <option key={y} value={y}>{y === 'All' ? 'Tahun: Semua' : y}</option>)}
          </select>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className={`px-4 py-3 rounded-xl border text-xs font-bold outline-none cursor-pointer ${bgInput}`}>
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {/* TABEL DAFTAR RINCIAN DENGAN METRIK 6 PLATFORM */}
      <div className="space-y-3 print:mt-8">
        <h3 className={`text-sm font-black uppercase tracking-widest ${textTitle} px-1 print:text-gray-900`}>Distribusi Metrik Lintas Saluran</h3>
        {filteredContents.length === 0 ? (
          <div className={`p-12 text-center rounded-3xl border ${bgCard}`}><p className="text-xs font-bold text-gray-500">Belum ada data yang cocok.</p></div>
        ) : (
          filteredContents.map((item, index) => {
            const webVal    = parseInt(item.web_engagement || 0) || 0;
            const igVal     = parseInt(item.ig_engagement || 0) || 0;
            const fbVal     = parseInt(item.fb_engagement || 0) || 0;
            const tiktokVal = parseInt(item.tiktok_engagement || 0) || 0;
            const xVal      = parseInt(item.x_engagement || 0) || 0;
            const ytVal     = parseInt(item.yt_engagement || 0) || 0;
            
            // Total Engagement dari semua kolom spesifik
            const totalEngVal = webVal + igVal + fbVal + tiktokVal + xVal + ytVal;
            const reachVal = parseInt(item.views || 0) || 0;

            return (
              <div key={item.id || index} className={`p-5 rounded-2xl border flex flex-col xl:flex-row xl:items-center justify-between gap-4 ${bgCard} print:break-inside-avoid print:bg-white print:border-gray-200`}>
                <div className="space-y-1 w-full xl:w-1/3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase print:border-none ${item.pub_status === 'Posted' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>{item.pub_status || 'Draft'}</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">• {item.pillar}</span>
                  </div>
                  <h4 className={`text-sm font-bold ${textTitle} print:text-gray-900 line-clamp-1`}>{item.title}</h4>
                  <p className="text-[10px] text-gray-500">📅 {item.publish_date}</p>
                </div>

                {/* AREA METRIK 6 PLATFORM */}
                <div className="flex flex-wrap items-center gap-2 w-full xl:w-2/3 xl:justify-end">
                  
                  {/* Total Reach Paling Kiri */}
                  <div className="px-3 py-1.5 rounded-xl border border-blue-500/20 text-center min-w-[65px] bg-blue-500/5 print:bg-transparent">
                    <span className="text-[8px] uppercase font-bold text-gray-500 block">Total Reach</span>
                    <span className="font-roboto text-sm font-black text-blue-400 print:text-blue-700">{reachVal.toLocaleString('id-ID')}</span>
                  </div>

                  {/* Rincian 6 Platform (Engagement/Clicks) */}
                  {[
                    { icon: <PlatformIcons.Web />, label: 'Web', val: webVal },
                    { icon: <PlatformIcons.IG />, label: 'IG', val: igVal },
                    { icon: <PlatformIcons.FB />, label: 'FB', val: fbVal },
                    { icon: <PlatformIcons.TikTok />, label: 'TikTok', val: tiktokVal },
                    { icon: <PlatformIcons.X />, label: 'X', val: xVal },
                    { icon: <PlatformIcons.YT />, label: 'Shorts', val: ytVal },
                  ].map((plat, i) => (
                    <div key={i} className="px-2 py-1.5 rounded-xl border border-gray-500/10 text-center min-w-[55px] bg-gray-500/5 print:bg-transparent">
                      <span className="text-[8px] uppercase font-bold text-gray-500 flex items-center justify-center whitespace-nowrap">{plat.icon} {plat.label}</span>
                      <span className="font-roboto text-xs font-black text-white print:text-gray-800">{plat.val.toLocaleString('id-ID')}</span>
                    </div>
                  ))}

                  {/* Total Engagement Paling Kanan */}
                  <div className="px-3 py-1.5 rounded-xl border border-emerald-500/20 text-center min-w-[65px] bg-emerald-500/10 print:bg-transparent print:border-gray-400">
                    <span className="text-[8px] uppercase font-bold text-gray-500 block">Total Eng.</span>
                    <span className="font-roboto text-sm font-black text-emerald-400 print:text-black">{totalEngVal.toLocaleString('id-ID')}</span>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}