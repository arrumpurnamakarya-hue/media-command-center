"use client";
import React, { useState, useMemo } from 'react';
import { FileText, Printer, Calendar, Search, Filter, Sparkles } from 'lucide-react';

// Ikon Medsos Resmi untuk Badge
const PlatformIcons = {
  Meta: () => <svg className="w-2.5 h-2.5 text-[#1877F2] fill-current inline-block mr-1" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  TikTok: () => <svg className="w-2.5 h-2.5 text-[#ff0050] fill-current inline-block mr-1" viewBox="0 0 24 24"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.674c0 1.913-1.554 3.467-3.467 3.467-1.914 0-3.468-1.554-3.468-3.467 0-1.914 1.554-3.468 3.468-3.468h.078V8.761h-.078c-3.824 0-6.924 3.1-6.924 6.924 0 3.823 3.1 6.923 6.924 6.923 3.823 0 6.922-3.1 6.922-6.923v-8.15a8.175 8.175 0 0 0 6.687 2.333v-3.18z"/></svg>,
  X: () => <svg className="w-2.5 h-2.5 text-gray-300 fill-current inline-block mr-1" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  YT: () => <svg className="w-2.5 h-2.5 text-[#FF0000] fill-current inline-block mr-1" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.501 5.814a3.016 3.016 0 0 0 2.122 2.136c1.872.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
};

// --- FUNGSI KRUSIAL: MENGUBAH "2.678" MENJADI 2678 AGAR BISA DIJUMLAHKAN ---
const superSafeNumber = (val: any) => {
  if (typeof val === 'number') return val;
  if (!val || val === '') return 0;
  // Buang semua karakter kecuali angka (menghapus titik, koma, spasi)
  const cleaned = String(val).replace(/[^0-9]/g, ''); 
  return parseInt(cleaned, 10) || 0;
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

  // 1. FILTER DATA
  const filteredContents = useMemo(() => {
    return contents.filter(item => {
      const matchesSearch = (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.pillar || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!item.publish_date) return matchesSearch && selectedYear === 'All' && selectedMonth === 'All';
      
      const dateObj = new Date(item.publish_date);
      const matchesYear = selectedYear === 'All' || String(dateObj.getFullYear()) === selectedYear;
      const matchesMonth = selectedMonth === 'All' || String(dateObj.getMonth()) === selectedMonth;

      return matchesSearch && matchesYear && matchesMonth;
    });
  }, [contents, searchQuery, selectedYear, selectedMonth]);

  // 2. KALKULASI RINGKASAN ATAS (AUTO-SUM)
  const summaryMetrics = useMemo(() => {
    // Pastikan kita menjumlahkan data dari naskah yang sudah di-recap (Posted)
    const postedItems = filteredContents.filter(c => c.pub_status === 'Posted' || c.prod_status === 'Posted');

    const totalReach = postedItems.reduce((acc, curr) => {
      const val = curr.views ?? curr.total_views ?? 0;
      return acc + superSafeNumber(val);
    }, 0);

    const totalEng = postedItems.reduce((acc, curr) => {
      const val = curr.engagement ?? curr.total_engagement ?? 0;
      return acc + superSafeNumber(val);
    }, 0);

    return {
      totalReach,
      totalEng,
      postedCount: postedItems.length,
      topPillar: postedItems.length > 0 ? (postedItems[0].pillar || 'Strategic') : 'N/A'
    };
  }, [filteredContents]);

  const bgCard = isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200';
  const textTitle = isDarkMode ? 'text-white' : 'text-gray-900';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER */}
      <div className={`p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${bgCard}`}>
        <div>
          <h2 className={`text-xl font-black tracking-tight ${textTitle} flex items-center gap-2`}>
            <FileText className="text-emerald-500" size={22} /> LAPORAN PERFORMA STRATEGIS
          </h2>
          <p className="text-xs text-gray-500 mt-1">Periode Strategis: 2026 — 2031 • Ringkasan Akumulasi Riil</p>
        </div>
        <button onClick={() => window.print()} className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs">
          EKSPOR PDF
        </button>
      </div>

      {/* KARTU RINGKASAN (SINKRONISASI ANGKA) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-5 rounded-2xl border ${bgCard}`}>
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Total Konten Tayang</span>
          <div className="font-roboto text-2xl font-black text-emerald-500">{summaryMetrics.postedCount}</div>
        </div>
        <div className={`p-5 rounded-2xl border ${bgCard}`}>
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Akumulasi Jangkauan</span>
          <div className="font-roboto text-2xl font-black text-blue-500">{summaryMetrics.totalReach.toLocaleString('id-ID')}</div>
        </div>
        <div className={`p-5 rounded-2xl border ${bgCard}`}>
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Total Interaksi</span>
          <div className="font-roboto text-2xl font-black text-amber-500">{summaryMetrics.totalEng.toLocaleString('id-ID')}</div>
        </div>
        <div className={`p-5 rounded-2xl border ${bgCard}`}>
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Pilar Utama</span>
          <div className="text-lg font-sans font-black text-purple-500 truncate uppercase">{summaryMetrics.topPillar}</div>
        </div>
      </div>

      {/* FILTER TAHUN & BULAN */}
      <div className={`p-5 rounded-2xl border ${bgCard}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input 
            type="text" 
            placeholder="Cari naskah..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className={`w-full px-4 py-3 rounded-xl border text-xs outline-none ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-300'}`} 
          />
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className={`w-full px-4 py-3 rounded-xl border text-xs font-bold outline-none cursor-pointer ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-300'}`}>
            {availableYears.map(y => <option key={y} value={y}>{y === 'All' ? 'Semua Tahun' : y}</option>)}
          </select>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className={`w-full px-4 py-3 rounded-xl border text-xs font-bold outline-none cursor-pointer ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-300'}`}>
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {/* DAFTAR KONTEN */}
      <div className="space-y-3">
        {filteredContents.map((item, index) => (
          <div key={index} className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${bgCard}`}>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase">• {item.pillar}</span>
              <h4 className={`text-sm font-bold ${textTitle}`}>{item.title}</h4>
              <p className="text-[10px] text-gray-500">📅 {item.publish_date}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3 py-1.5 rounded-xl border border-gray-500/10 bg-gray-500/5 text-center min-w-[70px]">
                <span className="text-[8px] font-bold text-gray-500 uppercase block">Reach</span>
                <span className="font-roboto text-xs font-black text-emerald-500">{String(item.views || 0)}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-center min-w-[70px]">
                <span className="text-[8px] font-bold text-gray-500 uppercase block">Total</span>
                <span className="font-roboto text-xs font-black text-emerald-400">{String(item.engagement || 0)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}