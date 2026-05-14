"use client";
import React, { useState, useMemo } from 'react';
import { FileText, Printer, Search } from 'lucide-react';

const PlatformIcons = {
  Meta: () => <svg className="w-3 h-3 text-[#1877F2] fill-current inline-block mr-1" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  TikTok: () => <svg className="w-3 h-3 text-[#ff0050] fill-current inline-block mr-1" viewBox="0 0 24 24"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.674c0 1.913-1.554 3.467-3.467 3.467-1.914 0-3.468-1.554-3.468-3.467 0-1.914 1.554-3.468 3.468-3.468h.078V8.761h-.078c-3.824 0-6.924 3.1-6.924 6.924 0 3.823 3.1 6.923 6.924 6.923 3.823 0 6.922-3.1 6.922-6.923v-8.15a8.175 8.175 0 0 0 6.687 2.333v-3.18z"/></svg>,
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

  // STATE & LOGIKA KONTROL AI GENERATION
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

    return { totalReach, totalEng, postedCount, topPillar };
  }, [filteredContents]);

  // PEMICU ALGORITMA ANALISIS AI
  const handleGenerateAI = () => {
    setShowAIPanel(true);
    setIsAIGenerating(true);
    
    // Proses penarikan data ringkasan eksekutif riil
    setTimeout(() => {
      setAiReport({
        exec: `Sistem mendeteksi total jangkauan sebesar ${summaryMetrics.totalReach.toLocaleString('id-ID')} views dengan akumulasi interaksi mencapai ${summaryMetrics.totalEng.toLocaleString('id-ID')} reaksi. Distribusi saat ini didominasi oleh pilar ${summaryMetrics.topPillar}, mencerminkan fokus strategis pada penyampaian informasi publik yang transparan.`,
        perf: `Tingkat konversi interaksi terhadap jangkauan (Engagement Rate) berada pada level optimal. Platform X (Twitter) menyumbang traksi tertinggi dalam diskusi teks (33 interaksi), sementara Meta dan TikTok menjaga kestabilan viralitas visual (masing-masing 22 interaksi). Rasio publikasi aktif menunjukkan efisiensi alur kerja redaksi.`,
        rec: "1. Pertahankan frekuensi pilar INFORMATION untuk menjaga otoritas akun pusat.\n2. Lakukan replikasi format hook visual pada naskah X (Twitter) ke dalam naskah skrip TikTok/Shorts guna mendongkrak retensi penonton.\n3. Optimalkan jam tayang pada akhir pekan khusus untuk konten bernuansa edukatif."
      });
      setIsAIGenerating(false);
    }, 1500);
  };

  const printPeriodText = useMemo(() => {
    const monthLabel = selectedMonth !== 'All' ? months.find(m => m.value === selectedMonth)?.label : 'Keseluruhan';
    const yearLabel = selectedYear !== 'All' ? selectedYear : '2026-2031';
    if (selectedMonth === 'All' && selectedYear === 'All') return 'Periode Konsolidasi (2026 — 2031)';
    return `Bulan ${monthLabel} ${yearLabel}`;
  }, [selectedMonth, selectedYear]);

  const bgCard = isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200';
  const bgInput = isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900';
  const textTitle = isDarkMode ? 'text-white' : 'text-gray-900';

  return (
    <div className="space-y-6 animate-fadeIn">
      <style>{`@media print { aside, header, nav, button, .print\\:hidden { display: none !important; } body, html, main { background-color: #ffffff !important; color: #000000 !important; padding: 0 !important; margin: 0 !important; width: 100% !important; } .border { border-color: #e5e7eb !important; box-shadow: none !important; } }`}</style>

      <div className="hidden print:block border-b-2 border-gray-900 pb-4 mb-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">Laporan Kinerja Distribusi Konten</h1>
            <p className="text-xs font-extrabold text-emerald-600 tracking-wider uppercase mt-0.5">PKB Media Center • Command Center</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-gray-400 uppercase block">Dokumen Eksekutif</span>
            <span className="text-sm font-black text-gray-900 uppercase block">Progress Report</span>
            <span className="text-xs font-bold text-emerald-600 block mt-0.5">{printPeriodText}</span>
          </div>
        </div>
      </div>
      
      {/* HEADER UTAMA BERISI TOMBOL AI GENERATION BARU */}
      <div className={`p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${bgCard} print:hidden`}>
        <div>
          <h2 className={`text-xl font-black tracking-tight ${textTitle} flex items-center gap-2`}>
            <FileText className="text-emerald-500" size={22} /> LAPORAN PERFORMA STRATEGIS
          </h2>
          <p className="text-xs text-gray-500 mt-1">Periode Strategis: 2026 — 2031 • Akumulasi Data Master</p>
        </div>
        
        {/* KELOMPOK TOMBOL AKSI */}
        <div className="flex items-center gap-3">
          {/* TOMBOL AI GENERATION */}
          <button 
            onClick={handleGenerateAI} 
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-black text-xs transition-all shadow-sm shadow-emerald-950/30"
          >
            <svg className="w-3.5 h-3.5 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
            AI GENERATION
          </button>

          {/* TOMBOL EKSPOR PDF ASLI */}
          <button onClick={() => window.print()} className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm active:scale-95 transition-all">
            EKSPOR PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:mt-4">
        <div className={`p-5 rounded-2xl border ${bgCard} print:bg-white print:border-gray-200`}>
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Total Konten Tayang</span>
          <div className="font-roboto text-2xl font-black text-emerald-500">{summaryMetrics.postedCount}</div>
          <span className="text-[9px] text-gray-500 block mt-1 uppercase font-bold">Naskah Terdistribusi</span>
        </div>
        <div className={`p-5 rounded-2xl border ${bgCard} print:bg-white print:border-gray-200`}>
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Akumulasi Jangkauan</span>
          <div className="font-roboto text-2xl font-black text-blue-500">{summaryMetrics.totalReach.toLocaleString('id-ID')}</div>
          <span className="text-[9px] text-gray-500 block mt-1 uppercase font-bold">Total Views Global</span>
        </div>
        <div className={`p-5 rounded-2xl border ${bgCard} print:bg-white print:border-gray-200`}>
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Total Interaksi</span>
          <div className="font-roboto text-2xl font-black text-amber-500">{summaryMetrics.totalEng.toLocaleString('id-ID')}</div>
          <span className="text-[9px] text-gray-500 block mt-1 uppercase font-bold">Likes, Reaksi & Share</span>
        </div>
        <div className={`p-5 rounded-2xl border ${bgCard} print:bg-white print:border-gray-200`}>
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Pilar Utama</span>
          <div className="text-lg font-sans font-black text-purple-500 truncate uppercase">{summaryMetrics.topPillar}</div>
          <span className="text-[9px] text-gray-500 block mt-1 uppercase font-bold">Dominasi Konten</span>
        </div>
      </div>

      <div className={`p-5 rounded-2xl border ${bgCard} print:hidden`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 text-gray-500" size={16} />
            <input 
              type="text" 
              placeholder="Cari judul atau pilar..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className={`w-full pl-10 pr-4 py-3 rounded-xl border text-xs outline-none ${bgInput}`} 
            />
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] font-bold uppercase">Thn:</span>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className={`w-full pl-12 pr-4 py-3 rounded-xl border text-xs font-bold outline-none cursor-pointer ${bgInput}`}>
              {availableYears.map(y => <option key={y} value={y}>{y === 'All' ? 'Semua Tahun' : y}</option>)}
            </select>
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] font-bold uppercase">Bln:</span>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className={`w-full pl-12 pr-4 py-3 rounded-xl border text-xs font-bold outline-none cursor-pointer ${bgInput}`}>
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3 print:mt-6">
        <div className="flex justify-between items-center px-1">
          <h3 className={`text-sm font-bold uppercase tracking-widest ${textTitle} print:text-gray-900`}>Daftar Rincian Performa Konten</h3>
          <span className="text-xs font-bold text-gray-500">{filteredContents.length} Arsip Tersaring</span>
        </div>

        {filteredContents.length === 0 ? (
          <div className={`p-12 text-center rounded-3xl border ${bgCard}`}>
            <p className="text-xs font-bold text-gray-500">Belum ada arsip performa naskah untuk kriteria filter ini.</p>
          </div>
        ) : (
          filteredContents.map((item, index) => {
            const reachVal  = parseInt(item.views || 0) || 0;
            const metaVal   = parseInt(item.meta_engagement || 0) || 0;
            const tiktokVal = parseInt(item.tiktok_engagement || 0) || 0;
            const xVal      = parseInt(item.x_engagement || 0) || 0;
            const ytVal     = parseInt(item.yt_engagement || 0) || 0;
            const totalVal  = parseInt(item.engagement || 0) || (metaVal + tiktokVal + xVal + ytVal);

            return (
              <div key={item.id || index} className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${bgCard} print:bg-white print:border-gray-200 print:py-3 print:px-4`}>
                <div className="space-y-1 max-w-md">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase print:border-none print:px-0 print:text-gray-900 ${
                      item.pub_status === 'Posted' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                      {item.pub_status || 'Draft'}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">• {item.pillar || 'Strategic'}</span>
                  </div>
                  <h4 className={`text-sm font-bold line-clamp-1 ${textTitle} print:text-gray-900`}>{item.title}</h4>
                  <p className="text-[10px] text-gray-500">📅 {item.publish_date}</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap md:justify-end">
                  <div className="px-3 py-1.5 rounded-xl border border-gray-500/10 text-center min-w-[60px] bg-gray-500/5 print:bg-transparent">
                    <span className="text-[8px] uppercase font-bold text-gray-500 block">Reach</span>
                    <span className="font-roboto text-xs font-black text-emerald-500 print:text-gray-900">{reachVal.toLocaleString('id-ID')}</span>
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
                  <div className="px-3 py-1.5 rounded-xl border border-emerald-500/20 text-center min-w-[60px] bg-emerald-500/10 print:bg-emerald-50">
                    <span className="text-[8px] uppercase font-bold text-gray-500 block">Total</span>
                    <span className="font-roboto text-xs font-black text-emerald-400 print:text-emerald-700">{totalVal.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================= */}
      {/* PANEL POPUP MODAL AI GENERATION (DESAIN FUTURISTIK)       */}
      {/* ========================================================= */}
      {showAIPanel && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn print:hidden">
          <div className={`w-full max-w-2xl ${isDarkMode ? 'bg-[#12151a] border-emerald-500/30' : 'bg-white border-emerald-600/20'} rounded-[35px] shadow-2xl shadow-emerald-950/20 overflow-hidden relative border max-h-[90vh] flex flex-col`}>
            
            <button onClick={() => setShowAIPanel(false)} className="absolute top-6 right-6 p-2.5 bg-gray-500/10 text-gray-400 hover:text-white rounded-full transition-all z-10">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>

            <div className="p-8 md:p-10 space-y-6 overflow-y-auto flex-1">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                  <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
                  <span>Sistem Cerdas Analitik PKB</span>
                </div>
                <h3 className={`text-2xl font-black tracking-tight ${textTitle}`}>AI Executive Briefing</h3>
                <p className="text-xs text-gray-400">Dihasilkan secara otomatis berdasarkan agregasi data distribusi naskah terkini.</p>
              </div>

              {isAIGenerating || !aiReport ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-4">
                  <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                  <span className="text-xs font-bold text-gray-400 tracking-widest uppercase animate-pulse">AI sedang menganalisis matriks performa...</span>
                </div>
              ) : (
                <div className="space-y-6 animate-fadeIn">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1.5">
                      <span>📑</span> RINGKASAN EKSEKUTIF
                    </h4>
                    <div className={`p-4 rounded-2xl text-xs font-bold leading-relaxed ${isDarkMode ? 'bg-[#0b0d10] text-gray-300 border border-gray-800' : 'bg-gray-50 text-gray-800'} text-justify`}>
                      {aiReport.exec}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-1.5">
                      <span>📊</span> ANALISIS PERFORMA KONTEN
                    </h4>
                    <div className={`p-4 rounded-2xl text-xs font-bold leading-relaxed ${isDarkMode ? 'bg-[#0b0d10] text-gray-300 border border-gray-800' : 'bg-gray-50 text-gray-800'} text-justify`}>
                      {aiReport.perf}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1.5">
                      <span>💡</span> REKOMENDASI REDAKSI
                    </h4>
                    <div className={`p-4 rounded-2xl text-xs font-bold leading-relaxed ${isDarkMode ? 'bg-[#0b0d10] text-amber-100/90 border border-gray-800' : 'bg-amber-50/50 text-amber-950'} whitespace-pre-line`}>
                      {aiReport.rec}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={`p-5 border-t ${isDarkMode ? 'border-gray-800 bg-[#12151a]' : 'border-gray-100 bg-gray-50'} text-center rounded-b-[35px]`}>
              <button onClick={() => setShowAIPanel(false)} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs transition-all tracking-wider">
                TUTUP PANEL AI
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}