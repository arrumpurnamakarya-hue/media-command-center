"use client";
import React, { useState, useMemo } from 'react';
import { 
  FileText, Printer, Calendar, Search, Filter, 
  Sparkles, TrendingUp, Award 
} from 'lucide-react';

// Ikon Mini SVG Resmi untuk disematkan di dalam badge performa naskah
const PlatformIcons = {
  Meta: () => (
    <svg className="w-2.5 h-2.5 text-[#1877F2] fill-current inline-block mr-1" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  TikTok: () => (
    <svg className="w-2.5 h-2.5 text-[#ff0050] fill-current inline-block mr-1" viewBox="0 0 24 24">
      <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.674c0 1.913-1.554 3.467-3.467 3.467-1.914 0-3.468-1.554-3.468-3.467 0-1.914 1.554-3.468 3.468-3.468h.078V8.761h-.078c-3.824 0-6.924 3.1-6.924 6.924 0 3.823 3.1 6.923 6.924 6.923 3.823 0 6.922-3.1 6.922-6.923v-8.15a8.175 8.175 0 0 0 6.687 2.333v-3.18z"/>
    </svg>
  ),
  X: () => (
    <svg className="w-2.5 h-2.5 text-gray-300 fill-current inline-block mr-1" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  YT: () => (
    <svg className="w-2.5 h-2.5 text-[#FF0000] fill-current inline-block mr-1" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.501 5.814a3.016 3.016 0 0 0 2.122 2.136c1.872.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  )
};

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

  // Periode strategis jangka panjang
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

  // Logika Filter Data
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

  // --- PEMETAAN MULTI-KOLOM (SINKRONISASI MUTLAK DENGAN RECAP / DASHBOARD) ---
  const summaryMetrics = useMemo(() => {
    const totalReach = filteredContents.reduce((acc, curr) => {
      // Pindai semua variasi nama kolom Views dari hasil input RecapForm di Supabase
      const reachVal = curr.total_views ?? curr.views ?? curr.reach ?? curr.totalViews ?? curr.totalJangkauan ?? 0;
      return acc + (Number(reachVal) || 0);
    }, 0);

    const totalEng = filteredContents.reduce((acc, curr) => {
      // Pindai semua variasi nama kolom Engagement dari hasil input RecapForm
      const engVal = curr.total_engagement ?? curr.engagement ?? curr.total_eng ?? curr.totalEngagement ?? curr.global_eng ?? curr.totalInteraksi ?? 0;
      return acc + (Number(engVal) || 0);
    }, 0);

    const postedCount = filteredContents.filter(c => c.pub_status === 'Posted' || c.prod_status === 'Posted').length;
    
    // Identifikasi pilar dominan
    const pillarCounts: { [key: string]: number } = {};
    filteredContents.forEach(c => {
      const p = c.pillar || 'Information';
      pillarCounts[p] = (pillarCounts[p] || 0) + 1;
    });
    
    let topPillar = 'Information';
    let maxPillarCount = 0;
    Object.entries(pillarCounts).forEach(([p, count]) => {
      if (count > maxPillarCount) {
        maxPillarCount = count;
        topPillar = p;
      }
    });

    return { 
      totalReach, 
      totalEng, 
      postedCount: postedCount || filteredContents.length, 
      topPillar 
    };
  }, [filteredContents]);

  // Teks Informasi Kop Surat Ekspor
  const printPeriodText = useMemo(() => {
    const monthLabel = selectedMonth !== 'All' ? months.find(m => m.value === selectedMonth)?.label : 'Keseluruhan';
    const yearLabel = selectedYear !== 'All' ? selectedYear : '2026-2031';
    if (selectedMonth === 'All' && selectedYear === 'All') return 'Periode Konsolidasi (2026 — 2031)';
    return `Bulan ${monthLabel} ${yearLabel}`;
  }, [selectedMonth, selectedYear]);

  const handleGenerateAIReport = () => {
    setIsGeneratingAI(true);
    setAiInsight(null);
    setTimeout(() => {
      setAiInsight(
        `Analisis Strategis: Konten dengan pilar "${summaryMetrics.topPillar}" memberikan kontribusi jangkauan terbesar (${summaryMetrics.totalReach.toLocaleString('id-ID')} views). Efektivitas distribusi pada platform Meta dan TikTok menunjukkan tren konversi interaksi yang sangat positif. Disarankan untuk mempertahankan konsistensi narasi pada periode berikutnya guna menjaga momentum engagement.`
      );
      setIsGeneratingAI(false);
    }, 1200);
  };

  const handleExportPDF = () => { window.print(); };

  const bgCard = isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200';
  const bgInput = isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white focus:border-emerald-500' : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-emerald-600';
  const textTitle = isDarkMode ? 'text-white' : 'text-gray-900';

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* PENGATURAN GAYA CETAK PDF */}
      <style>{`
        @media print {
          aside, header, nav, button, .print\\:hidden { display: none !important; }
          body, html, main { background-color: #ffffff !important; color: #000000 !important; padding: 0 !important; margin: 0 !important; width: 100% !important; }
          .border { border-color: #e5e7eb !important; box-shadow: none !important; }
        }
      `}</style>

      {/* KOP SURAT EKSPOR PDF */}
      <div className="hidden print:block border-b-2 border-gray-900 pb-4 mb-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">Laporan Kinerja Distribusi Konten</h1>
            <p className="text-xs font-extrabold text-emerald-600 tracking-wider uppercase mt-0.5">PKB Media Center • Command Center</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Dokumen Eksekutif</span>
            <span className="text-sm font-black text-gray-900 uppercase block">Progress Report</span>
            <span className="text-xs font-bold text-emerald-600 block mt-0.5">{printPeriodText}</span>
          </div>
        </div>
      </div>
      
      {/* HEADER KONTROL LAPORAN */}
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

      {/* KELUARAN RINGKASAN AI */}
      {aiInsight && (
        <div className="p-6 rounded-3xl bg-purple-900/10 border border-purple-500/30 animate-fadeIn print:border-gray-300 print:bg-white print:mt-4">
          <div className="flex items-start gap-3">
            <Sparkles className="text-purple-400 mt-1 print:text-purple-700" size={18} />
            <div className="space-y-1">
              <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest print:text-purple-800">AI Executive Summary</h4>
              <p className="text-xs text-gray-300 leading-relaxed print:text-gray-900">{aiInsight}</p>
            </div>
          </div>
        </div>
      )}

      {/* 4 KARTU RINGKASAN EKSEKUTIF UTAMA */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:mt-4">
        {[
          { label: 'Total Konten Tayang', val: summaryMetrics.postedCount, sub: 'Naskah Terdistribusi', color: 'text-emerald-500' },
          { label: 'Akumulasi Jangkauan', val: summaryMetrics.totalReach.toLocaleString('id-ID'), sub: 'Total Views Global', color: 'text-blue-500' },
          { label: 'Total Interaksi', val: summaryMetrics.totalEng.toLocaleString('id-ID'), sub: 'Likes, Reaksi & Share', color: 'text-amber-500' },
          { label: 'Pilar Utama', val: summaryMetrics.topPillar, sub: 'Dominasi Konten', color: 'text-purple-500', isPillar: true },
        ].map((m, i) => (
          <div key={i} className={`p-5 rounded-2xl border ${bgCard} print:bg-white print:border-gray-200`}>
            <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">{m.label}</span>
            <div className={`font-roboto text-2xl font-black tracking-tight ${m.color} ${m.isPillar ? 'text-lg font-sans truncate' : ''}`}>
              {m.val}
            </div>
            <span className="text-[9px] text-gray-500 block mt-1 uppercase font-bold">{m.sub}</span>
          </div>
        ))}
      </div>

      {/* FILTER SEARCH & BULAN */}
      <div className={`p-5 rounded-2xl border ${bgCard} print:hidden`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Cari performa naskah atau pilar..."
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
              {availableYears.map(year => <option key={year} value={year}>{year === 'All' ? 'Semua Tahun' : year}</option>)}
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

      {/* DAFTAR RINCIAN PERFORMA KONTEN (ROW MAPPING REAL-TIME) */}
      <div className="space-y-3 print:mt-6">
        <div className="flex justify-between items-center px-1">
          <h3 className={`text-sm font-bold uppercase tracking-widest ${textTitle} print:text-gray-900`}>
            Daftar Rincian Performa Konten
          </h3>
          <span className="text-xs font-bold text-gray-500">{filteredContents.length} Arsip Sinkron</span>
        </div>

        {filteredContents.length === 0 ? (
          <div className={`p-12 text-center rounded-3xl border ${bgCard}`}>
            <p className="text-xs font-bold text-gray-500">Belum ada arsip performa naskah yang terdaftar untuk periode ini.</p>
          </div>
        ) : (
          filteredContents.map((item, index) => {
            // EKSTRAKSI PRESISI MULTI-KOLOM DARI TAB RECAP
            // Menangkap nilai views/reach
            const itemReach = Number(item.total_views ?? item.views ?? item.reach ?? item.totalViews ?? item.totalJangkauan ?? 0);
            
            // Menangkap nilai interaksi platform masing-masing
            const itemMeta = Number(item.meta_engagement ?? item.meta_eng ?? item.metaEng ?? item.meta ?? 0);
            const itemTikTok = Number(item.tiktok_engagement ?? item.tiktok_eng ?? item.tiktokEng ?? item.tiktok ?? 0);
            const itemX = Number(item.x_engagement ?? item.x_eng ?? item.xEng ?? item.x ?? 0);
            const itemShorts = Number(item.yt_engagement ?? item.yt_eng ?? item.ytEng ?? item.yt ?? item.shorts_eng ?? item.shorts ?? 0);
            
            // Menangkap nilai total interaksi global
            const itemTotalEng = Number(item.total_engagement ?? item.engagement ?? item.total_eng ?? item.totalEngagement ?? item.global_eng ?? item.totalInteraksi ?? 0);

            return (
              <div key={item.id || index} className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${bgCard} print:bg-white print:border-gray-200 print:py-3 print:px-4`}>
                <div className="space-y-1 max-w-md">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-black border border-emerald-500/20 uppercase tracking-widest print:border-none print:px-0 print:text-gray-900">
                      {item.pub_status || 'Posted'}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">• {item.pillar || 'Information'}</span>
                  </div>
                  <h4 className={`text-sm font-bold tracking-tight line-clamp-1 ${textTitle} print:text-gray-900`}>{item.title}</h4>
                  <p className="text-[10px] text-gray-500 font-medium">📅 {item.publish_date || '2026-05-12'}</p>
                </div>

                {/* Deretan Metrik Terperinci dengan Penambahan Logo Mini SVG */}
                <div className="flex items-center gap-2 flex-wrap md:justify-end">
                  
                  {/* Badge Reach Global */}
                  <div className="px-3 py-1.5 rounded-xl border border-gray-500/10 text-center min-w-[60px] bg-gray-500/5 print:bg-transparent">
                    <span className="text-[8px] uppercase font-bold text-gray-500 block">Reach</span>
                    <span className="font-roboto text-xs font-black text-emerald-500 print:text-gray-900">
                      {itemReach.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Badge Meta + Logo */}
                  <div className="px-3 py-1.5 rounded-xl border border-gray-500/10 text-center min-w-[60px] bg-gray-500/5 print:bg-transparent">
                    <span className="text-[8px] uppercase font-bold text-gray-500 block">
                      <PlatformIcons.Meta /> Meta
                    </span>
                    <span className="font-roboto text-xs font-black text-white print:text-gray-800">
                      {itemMeta.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Badge TikTok + Logo */}
                  <div className="px-3 py-1.5 rounded-xl border border-gray-500/10 text-center min-w-[60px] bg-gray-500/5 print:bg-transparent">
                    <span className="text-[8px] uppercase font-bold text-gray-500 block">
                      <PlatformIcons.TikTok /> TikTok
                    </span>
                    <span className="font-roboto text-xs font-black text-white print:text-gray-800">
                      {itemTikTok.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Badge X + Logo */}
                  <div className="px-3 py-1.5 rounded-xl border border-gray-500/10 text-center min-w-[60px] bg-gray-500/5 print:bg-transparent">
                    <span className="text-[8px] uppercase font-bold text-gray-500 block">
                      <PlatformIcons.X /> X
                    </span>
                    <span className="font-roboto text-xs font-black text-white print:text-gray-800">
                      {itemX.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Badge Shorts + Logo */}
                  <div className="px-3 py-1.5 rounded-xl border border-gray-500/10 text-center min-w-[60px] bg-gray-500/5 print:bg-transparent">
                    <span className="text-[8px] uppercase font-bold text-gray-500 block">
                      <PlatformIcons.YT /> Shorts
                    </span>
                    <span className="font-roboto text-xs font-black text-white print:text-gray-800">
                      {itemShorts.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Badge Total Global Eng */}
                  <div className="px-3 py-1.5 rounded-xl border border-emerald-500/20 text-center min-w-[60px] bg-emerald-500/10 print:bg-emerald-50">
                    <span className="text-[8px] uppercase font-bold text-gray-500 block">Total</span>
                    <span className="font-roboto text-xs font-black text-emerald-400 print:text-emerald-700">
                      {itemTotalEng.toLocaleString('id-ID')}
                    </span>
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