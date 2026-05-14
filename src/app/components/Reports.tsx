"use client";
import React, { useState, useMemo } from 'react';
import { FileText, Printer, Search, Sparkles, RefreshCw, CheckCircle2, TrendingUp, Award, Lightbulb } from 'lucide-react';

// Vektor SVG Resmi Platform
const PlatformIcons = {
  Meta: () => <svg className="w-3 h-3 text-[#1877F2] fill-current inline-block mr-1" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
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

  // AI State
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
      const matchesSearch = (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.pillar || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!item.publish_date) {
        return matchesSearch && selectedYear === 'All' && selectedMonth === 'All';
      }
      
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
      Meta: filteredContents.reduce((sum, item) => sum + (parseInt(item.meta_engagement || 0) || 0), 0),
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
      const periodLabel = selectedMonth !== 'All' || selectedYear !== 'All' ? printPeriodText : 'keseluruhan akumulasi';
      setAiReport({
        exec: `Laporan untuk ${periodLabel} mencatatkan total jangkauan sebesar ${summaryMetrics.totalReach.toLocaleString('id-ID')} views dengan ${summaryMetrics.totalEng.toLocaleString('id-ID')} interaksi organik. Fokus didominasi pilar ${summaryMetrics.topPillar}.`,
        perf: `Platform ${summaryMetrics.topPlatform} memimpin penetrasi tertinggi dengan ${summaryMetrics.maxPlatEng.toLocaleString('id-ID')} reaksi. Kinerja lintas saluran menunjukkan efisiensi distribusi yang sangat sehat.`,
        rec: `1. Eskalasi Pilar ${summaryMetrics.topPillar} sebagai identitas utama.\n2. Replikasi format sukses platform ${summaryMetrics.topPlatform} ke saluran lainnya.\n3. Optimasi jadwal tayang di akhir pekan.`
      });
      setIsAIGenerating(false);
    }, 1200);
  };

  const bgCard = isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200';
  const bgInput = isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900';
  const textTitle = isDarkMode ? 'text-white' : 'text-gray-900';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* CSS CETAK PDF PREMIUM & COLORFUL */}
      <style>{`
        @page { margin: 12mm 15mm; size: A4 portrait; }
        @media print { 
          aside, header, nav, button, .print\\:hidden { display: none !important; } 
          body, html, main { 
            background-color: #ffffff !important; color: #000000 !important; 
            padding: 0 !important; margin: 0 !important; width: 100% !important; 
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
          } 
          .border { border-color: #e5e7eb !important; box-shadow: none !important; } 
          .print\\:break-inside-avoid { break-inside: avoid !important; }
          .print\\:bg-emerald-50 { background-color: #ecfdf5 !important; }
          .print\\:bg-blue-50 { background-color: #eff6ff !important; }
          .print\\:bg-amber-50 { background-color: #fffbeb !important; }
          .print\\:text-emerald-700 { color: #047857 !important; }
          .print\\:text-blue-700 { color: #1d4ed8 !important; }
          .print\\:text-amber-700 { color: #b45309 !important; }
          .print\\:border-gray-200 { border-color: #e5e7eb !important; }
        }
      `}</style>

      {/* KOP PDF */}
      <div className="hidden print:block border-b-4 border-gray-900 pb-4 mb-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-gray-900 uppercase">Performance Report</h1>
            <p className="text-xs font-black text-emerald-600 tracking-widest uppercase mt-0.5">Media Center DPC PKB GARUT • Command Center Platform</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Confidential Document</span>
            <span className="text-sm font-black text-gray-900 uppercase block mt-1">{printPeriodText}</span>
          </div>
        </div>
      </div>
      
      {/* HEADER UTAMA */}
      <div className={`p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${bgCard} print:hidden`}>
        <div>
          <h2 className={`text-xl font-black tracking-tight ${textTitle} flex items-center gap-2`}>
            <FileText className="text-emerald-500" size={22} /> LAPORAN PERFORMA STRATEGIS
          </h2>
          <p className="text-xs text-gray-500 mt-1">Periode Strategis: 2026 — 2031 • Akumulasi Data Master</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleGenerateAI} disabled={isAIGenerating} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-black text-xs transition-all shadow-sm ${showAIPanel ? 'bg-emerald-500 text-white border-emerald-400' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'}`}>
            <Sparkles className={`w-3.5 h-3.5 ${isAIGenerating ? 'animate-spin' : 'animate-pulse'}`} />
            {isAIGenerating ? 'MEMPROSES...' : 'AI GENERATION'}
          </button>
          <button onClick={() => window.print()} className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm active:scale-95 transition-all">
            EKSPOR PDF
          </button>
        </div>
      </div>

      {/* KARTU STATISTIK (Colorful in Print) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:mt-4">
        <div className={`p-5 rounded-2xl border ${bgCard} print:bg-white print:border-gray-200`}>
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1 print:text-gray-400">Total Naskah</span>
          <div className="font-roboto text-2xl font-black text-emerald-500 print:text-emerald-600">{summaryMetrics.postedCount}</div>
        </div>
        <div className={`p-5 rounded-2xl border ${bgCard} print:bg-white print:border-gray-200`}>
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1 print:text-gray-400">Total Reach</span>
          <div className="font-roboto text-2xl font-black text-blue-500 print:text-blue-600">{summaryMetrics.totalReach.toLocaleString('id-ID')}</div>
        </div>
        <div className={`p-5 rounded-2xl border ${bgCard} print:bg-white print:border-gray-200`}>
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1 print:text-gray-400">Interaksi</span>
          <div className="font-roboto text-2xl font-black text-amber-500 print:text-amber-600">{summaryMetrics.totalEng.toLocaleString('id-ID')}</div>
        </div>
        <div className={`p-5 rounded-2xl border ${bgCard} print:bg-white print:border-gray-200`}>
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1 print:text-gray-400">Top Pilar</span>
          <div className="text-lg font-black text-purple-500 truncate uppercase print:text-purple-600">{summaryMetrics.topPillar}</div>
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

      {/* AI PANEL INLINE */}
      {showAIPanel && (
        <div className={`p-8 rounded-3xl border transition-all duration-500 print:break-inside-avoid print:mt-6 print:p-6 print:border-2 ${isDarkMode ? 'bg-[#12151a] border-emerald-500/30' : 'bg-white border-emerald-600/20'} print:bg-white print:border-emerald-200`}>
          <div className="flex justify-between items-start border-b border-gray-500/10 pb-4 mb-6 print:border-emerald-100">
            <div>
              <div className="flex items-center space-x-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest print:text-emerald-600">
                <Sparkles size={13} /> <span>AI EXECUTIVE STRATEGY • {printPeriodText}</span>
              </div>
              <h3 className={`text-xl font-black tracking-tight mt-1 ${textTitle} print:text-gray-900`}>Ringkasan Analitik Distribusi</h3>
            </div>
            <button onClick={() => setShowAIPanel(false)} className="text-gray-500 text-xs font-bold px-2 py-1 print:hidden">✕</button>
          </div>
          {isAIGenerating || !aiReport ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3"><RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" /><span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Generating...</span></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-gray-50'} print:bg-emerald-50 print:border-emerald-100`}>
                <div className="text-emerald-500 font-black text-[10px] uppercase mb-3 flex items-center gap-2 print:text-emerald-700"><CheckCircle2 size={14} /> Eksekutif</div>
                <p className="font-medium text-gray-300 leading-relaxed text-justify print:text-gray-800">{aiReport.exec}</p>
              </div>
              <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-gray-50'} print:bg-blue-50 print:border-blue-100`}>
                <div className="text-blue-500 font-black text-[10px] uppercase mb-3 flex items-center gap-2 print:text-blue-700"><TrendingUp size={14} /> Performa</div>
                <p className="font-medium text-gray-300 leading-relaxed text-justify print:text-gray-800">{aiReport.perf}</p>
              </div>
              <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#0b0d10] border-amber-500/10' : 'bg-amber-50'} print:bg-amber-50 print:border-amber-100`}>
                <div className="text-amber-500 font-black text-[10px] uppercase mb-3 flex items-center gap-2 print:text-amber-700"><Lightbulb size={14} /> Rekomendasi</div>
                <div className="font-medium text-amber-100/90 leading-relaxed print:text-amber-900">{aiReport.rec}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TABEL DAFTAR RINCIAN DENGAN METRIK PLATFORM LENGKAP */}
      <div className="space-y-3 print:mt-8">
        <h3 className={`text-sm font-black uppercase tracking-widest ${textTitle} px-1 print:text-gray-900`}>Daftar Rincian Performa Konten</h3>
        {filteredContents.length === 0 ? (
          <div className={`p-12 text-center rounded-3xl border ${bgCard}`}><p className="text-xs font-bold text-gray-500">Belum ada data.</p></div>
        ) : (
          filteredContents.map((item, index) => {
            const reachVal  = parseInt(item.views || 0) || 0;
            const metaVal   = parseInt(item.meta_engagement || 0) || 0;
            const tiktokVal = parseInt(item.tiktok_engagement || 0) || 0;
            const xVal      = parseInt(item.x_engagement || 0) || 0;
            const ytVal     = parseInt(item.yt_engagement || 0) || 0;
            const totalVal  = parseInt(item.engagement || 0) || (metaVal + tiktokVal + xVal + ytVal);

            return (
              <div key={item.id || index} className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${bgCard} print:break-inside-avoid print:bg-white print:border-gray-200`}>
                <div className="space-y-1 max-w-md">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase print:border-none ${item.pub_status === 'Posted' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{item.pub_status || 'Draft'}</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">• {item.pillar}</span>
                  </div>
                  <h4 className={`text-sm font-bold ${textTitle} print:text-gray-900 line-clamp-1`}>{item.title}</h4>
                  <p className="text-[10px] text-gray-500">📅 {item.publish_date}</p>
                </div>

                {/* AREA METRIK LENGKAP DENGAN LOGO */}
                <div className="flex items-center gap-2 flex-wrap md:justify-end">
                  <div className="px-3 py-1.5 rounded-xl border border-gray-500/10 text-center min-w-[60px] bg-gray-500/5 print:bg-transparent">
                    <span className="text-[8px] uppercase font-bold text-gray-500 block">Reach</span>
                    <span className="font-roboto text-xs font-black text-emerald-500 print:text-emerald-700">{reachVal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl border border-gray-500/10 text-center min-w-[60px] bg-gray-500/5 print:bg-transparent">
                    <span className="text-[8px] uppercase font-bold text-gray-500 block"><PlatformIcons.Meta /> Meta</span>
                    <span className="font-roboto text-xs font-black text-white print:text-gray-800">{metaVal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl border border-gray-500/10 text-center min-w-[60px] bg-gray-500/5 print:bg-transparent">
                    <span className="text-[8px] uppercase font-bold text-gray-500 block"><PlatformIcons.TikTok /> TikTok</span>
                    <span className="font-roboto text-xs font-black text-white print:text-gray-800">{tiktokVal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl border border-gray-500/10 text-center min-w-[60px] bg-gray-500/5 print:bg-transparent">
                    <span className="text-[8px] uppercase font-bold text-gray-500 block"><PlatformIcons.X /> X</span>
                    <span className="font-roboto text-xs font-black text-white print:text-gray-800">{xVal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl border border-gray-500/10 text-center min-w-[60px] bg-gray-500/5 print:bg-transparent">
                    <span className="text-[8px] uppercase font-bold text-gray-500 block"><PlatformIcons.YT /> Shorts</span>
                    <span className="font-roboto text-xs font-black text-white print:text-gray-800">{ytVal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl border border-emerald-500/20 text-center min-w-[60px] bg-emerald-500/10 print:bg-transparent print:border-gray-400">
                    <span className="text-[8px] uppercase font-bold text-gray-500 block">Total</span>
                    <span className="font-roboto text-xs font-black text-emerald-400 print:text-black">{totalVal.toLocaleString('id-ID')}</span>
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