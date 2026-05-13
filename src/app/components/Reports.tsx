"use client";
import React, { useState, useMemo } from 'react';
import { FileText, Printer, Search } from 'lucide-react';

// Ikon Medsos Resmi
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

  // 1. FILTER KONTEN BERDASARKAN PENCARIAN, TAHUN & BULAN
  const filteredContents = useMemo(() => {
    return contents.filter(item => {
      const matchesSearch = (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.pillar || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!item.publish_date) {
        return matchesSearch && selectedYear === 'All' && selectedMonth === 'All';
      }
      
      // Memecah string tanggal secara aman (Format: YYYY-MM-DD)
      const dateParts = item.publish_date.split('-');
      const itemYear = dateParts[0];
      // Mengonversi bulan "05" menjadi indeks 4 (Mei) agar sinkron dengan value dropdown
      const itemMonthIndex = String(parseInt(dateParts[1], 10) - 1); 

      const matchesYear = selectedYear === 'All' || itemYear === selectedYear;
      const matchesMonth = selectedMonth === 'All' || itemMonthIndex === selectedMonth;

      return matchesSearch && matchesYear && matchesMonth;
    });
  }, [contents, searchQuery, selectedYear, selectedMonth]);

  // 2. RUMUS KALKULASI MURNI (IDENTIK DENGAN RUMUS DASHBOARD)
  const summaryMetrics = useMemo(() => {
    // Kita langsung jumlahkan seluruh item yang lolos filter tanpa memedulikan status Posted/Draft
    const totalReach = filteredContents.reduce((sum, item) => sum + (parseInt(item.views) || 0), 0);
    const totalEng = filteredContents.reduce((sum, item) => sum + (parseInt(item.engagement) || 0), 0);
    const postedCount = filteredContents.length;
    
    // Mencari pilar terbanyak
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

  // Teks Cetak PDF
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
      {/* GAYA CETAK */}
      <style>{`@media print { aside, header, nav, button, .print\\:hidden { display: none !important; } body, html, main { background-color: #ffffff !important; color: #000000 !important; padding: 0 !important; margin: 0 !important; width: 100% !important; } .border { border-color: #e5e7eb !important; box-shadow: none !important; } }`}</style>

      {/* KOP CETAK PDF */}
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
      
      {/* HEADER UTAMA */}
      <div className={`p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${bgCard} print:hidden`}>
        <div>
          <h2 className={`text-xl font-black tracking-tight ${textTitle} flex items-center gap-2`}>
            <FileText className="text-emerald-500" size={22} /> LAPORAN PERFORMA STRATEGIS
          </h2>
          <p className="text-xs text-gray-500 mt-1">Periode Strategis: 2026 — 2031 • Akumulasi Tersinkronisasi</p>
        </div>
        <button onClick={() => window.print()} className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-sm active:scale-95 transition-all">
          <Printer size={14} className="inline mr-1.5" /> EKSPOR PDF
        </button>
      </div>

      {/* KARTU ATAS (DIJAMIN SINKRON DENGAN DASHBOARD) */}
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

      {/* FILTER TAHUN & BULAN */}
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

      {/* DAFTAR RINCIAN KONTEN BAWAH */}
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
            // Ekstraksi nilai murni menggunakan parseInt persis seperti Dashboard
            const reachVal = parseInt(item.views) || 0;
            const metaVal = parseInt(item.meta) || 0;
            const tiktokVal = parseInt(item.tiktok) || 0;
            const xVal = parseInt(item.x) || 0;
            const ytVal = parseInt(item.yt) || 0;
            const totalVal = parseInt(item.engagement) || 0;

            return (
              <div key={item.id || index} className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${bgCard} print:bg-white print:border-gray-200 print:py-3 print:px-4`}>
                <div className="space-y-1 max-w-md">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-black border border-emerald-500/20 uppercase print:border-none print:px-0 print:text-gray-900">
                      {item.pub_status || 'Draft'}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">• {item.pillar || 'Strategic'}</span>
                  </div>
                  <h4 className={`text-sm font-bold line-clamp-1 ${textTitle} print:text-gray-900`}>{item.title}</h4>
                  <p className="text-[10px] text-gray-500">📅 {item.publish_date}</p>
                </div>

                {/* Deretan Metrik dengan Ikon Asli */}
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
    </div>
  );
}