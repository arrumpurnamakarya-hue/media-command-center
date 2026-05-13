"use client";
import React, { useState, useMemo } from 'react';
import { 
  FileText, Printer, Calendar, Search, Filter, 
  Sparkles, TrendingUp, Award, Zap, BarChart3 
} from 'lucide-react';

interface ReportsProps {
  isDarkMode?: boolean;
  contents?: any[];
}

export default function Reports({ isDarkMode = true, contents = [] }: ReportsProps) {
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  // --- 1. PENGATURAN PERIODE STRATEGIS 2026 - 2031 ---
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

  // --- 2. LOGIKA FILTER DATA ---
  const filteredContents = useMemo(() => {
    return contents.filter(item => {
      const matchesSearch = (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.pillar || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!item.publish_date) return matchesSearch && selectedYear === 'All' && selectedMonth === 'All';
      
      const dateObj = new Date(item.publish_date);
      const itemYear = String(dateObj.getFullYear());
      const itemMonth = String(dateObj.getMonth());

      const matchesYear = selectedYear === 'All' || itemYear === selectedYear;
      const matchesMonth = selectedMonth === 'All' || itemMonth === selectedMonth;

      return matchesSearch && matchesYear && matchesMonth;
    });
  }, [contents, searchQuery, selectedYear, selectedMonth]);

  // --- 3. KALKULASI RINGKASAN EKSEKUTIF ---
  const summaryMetrics = useMemo(() => {
    const totalReach = filteredContents.reduce((acc, curr) => acc + (Number(curr.views) || 0), 0);
    const totalEng = filteredContents.reduce((acc, curr) => acc + (Number(curr.engagement) || 0), 0);
    const postedCount = filteredContents.filter(c => c.pub_status === 'Posted').length;
    
    const pillarCounts: { [key: string]: number } = {};
    filteredContents.forEach(c => {
      const p = c.pillar || 'Umum';
      pillarCounts[p] = (pillarCounts[p] || 0) + 1;
    });
    
    let topPillar = 'Belum Ada';
    let maxPillarCount = 0;
    Object.entries(pillarCounts).forEach(([p, count]) => {
      if (count > maxPillarCount) {
        maxPillarCount = count;
        topPillar = p;
      }
    });

    return { totalReach, totalEng, postedCount, topPillar };
  }, [filteredContents]);

  // --- 4. HANDLER AI & PDF ---
  const handleGenerateAIReport = () => {
    setIsGeneratingAI(true);
    setAiInsight(null);
    setTimeout(() => {
      setAiInsight(
        `Analisis Strategis: Konten dengan pilar "${summaryMetrics.topPillar}" memberikan kontribusi jangkauan terbesar (${Math.round((summaryMetrics.totalReach / 1000))}K views). Efektivitas distribusi pada platform Meta dan TikTok menunjukkan tren positif. Disarankan untuk mempertahankan konsistensi narasi pada periode berikutnya guna menjaga momentum engagement.`
      );
      setIsGeneratingAI(false);
    }, 1500);
  };

  const handleExportPDF = () => { window.print(); };

  // Styling Dinamis
  const bgCard = isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200';
  const bgInput = isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white focus:border-emerald-500' : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-emerald-600';
  const textTitle = isDarkMode ? 'text-white' : 'text-gray-900';

  return (
    <div className="space-y-6 animate-fadeIn print:bg-white print:p-0">
      
      {/* HEADER & CONTROLS */}
      <div className={`p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${bgCard} print:hidden`}>
        <div>
          <h2 className={`text-xl font-black tracking-tight ${textTitle} flex items-center gap-2`}>
            <FileText className="text-emerald-500" size={22} /> LAPORAN PERFORMA STRATEGIS
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Periode Strategis: <span className="font-bold text-emerald-500">2026 — 2031</span> • Kendali Analitik AI
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={handleGenerateAIReport}
            disabled={isGeneratingAI}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <Sparkles size={14} className={isGeneratingAI ? 'animate-spin' : ''} /> 
            {isGeneratingAI ? 'MENGANALISIS...' : 'AI INSIGHT'}
          </button>
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all active:scale-95"
          >
            <Printer size={14} /> EKSPOR PDF
          </button>
        </div>
      </div>

      {/* AI INSIGHT BOX */}
      {aiInsight && (
        <div className="p-6 rounded-3xl bg-purple-900/10 border border-purple-500/30 animate-fadeIn print:border-gray-300 print:bg-white">
          <div className="flex items-start gap-3">
            <Sparkles className="text-purple-400 mt-1" size={18} />
            <div className="space-y-1">
              <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest">AI Executive Summary</h4>
              <p className="text-xs text-gray-300 leading-relaxed print:text-black">{aiInsight}</p>
            </div>
          </div>
        </div>
      )}

      {/* RINGKASAN EKSEKUTIF CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Konten Tayang', val: summaryMetrics.postedCount, sub: 'Naskah Terdistribusi', color: 'text-emerald-500' },
          { label: 'Akumulasi Jangkauan', val: summaryMetrics.totalReach.toLocaleString('id-ID'), sub: 'Total Views Global', color: 'text-blue-500' },
          { label: 'Total Interaksi', val: summaryMetrics.totalEng.toLocaleString('id-ID'), sub: 'Likes, Reaksi & Share', color: 'text-amber-500' },
          { label: 'Pilar Utama', val: summaryMetrics.topPillar, sub: 'Dominasi Konten', color: 'text-purple-500', isPillar: true },
        ].map((m, i) => (
          <div key={i} className={`p-5 rounded-2xl border ${bgCard}`}>
            <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">{m.label}</span>
            <div className={`font-roboto text-2xl font-black tracking-tight ${m.color} ${m.isPillar ? 'text-lg font-sans truncate' : ''}`}>
              {m.val}
            </div>
            <span className="text-[9px] text-gray-500 block mt-1 uppercase font-bold">{m.sub}</span>
          </div>
        ))}
      </div>

      {/* FILTER SEARCH & PERIOD */}
      <div className={`p-5 rounded-2xl border ${bgCard} print:hidden`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Cari performa naskah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border text-xs font-medium outline-none ${bgInput}`}
            />
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] font-bold uppercase tracking-wider">Thn:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className={`w-full pl-12 pr-4 py-3 rounded-xl border text-xs font-bold appearance-none outline-none cursor-pointer ${bgInput}`}
            >
              {availableYears.map(year => <option key={year} value={year}>{year === 'All' ? 'Semua' : year}</option>)}
            </select>
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] font-bold uppercase tracking-wider">Bln:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className={`w-full pl-12 pr-4 py-3 rounded-xl border text-xs font-bold appearance-none outline-none cursor-pointer ${bgInput}`}
            >
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* PERFORMA KONTEN LOG */}
      <div className="space-y-3">
        <h3 className={`text-sm font-bold uppercase tracking-widest px-1 ${textTitle}`}>Log Performa Konten</h3>
        {filteredContents.map((item, index) => (
          <div key={index} className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${bgCard}`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-black border border-emerald-500/20 uppercase tracking-widest">
                  {item.pub_status || 'Draft'}
                </span>
                <span className="text-[10px] font-bold text-gray-500 uppercase">{item.pillar}</span>
              </div>
              <h4 className={`text-sm font-bold tracking-tight ${textTitle}`}>{item.title}</h4>
              <p className="text-[10px] text-gray-500 font-medium">📅 {item.publish_date}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap md:justify-end">
              {[
                { label: 'Reach', val: item.views, color: 'text-emerald-500' },
                { label: 'Meta', val: item.meta_eng, color: 'text-white' },
                { label: 'TikTok', val: item.tiktok_eng, color: 'text-white' },
                { label: 'X', val: item.x_eng, color: 'text-white' },
                { label: 'Shorts', val: item.yt_eng, color: 'text-white' },
                { label: 'Total', val: item.engagement, color: 'text-emerald-400', isTotal: true },
              ].map((stat, si) => (
                <div key={si} className={`px-3 py-1.5 rounded-xl border border-gray-500/10 text-center min-w-[60px] ${stat.isTotal ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-gray-500/5'}`}>
                  <span className="text-[8px] uppercase font-bold text-gray-500 block">{stat.label}</span>
                  <span className={`font-roboto text-xs font-black ${stat.color} ${isDarkMode ? '' : 'print:text-black'}`}>
                    {(Number(stat.val) || 0).toLocaleString('id-ID')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}