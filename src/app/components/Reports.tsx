"use client";
import React, { useState, useMemo } from 'react';
import { FileText, Printer, Search, Calendar, Filter } from 'lucide-react';

// Fungsi untuk membersihkan titik/koma agar angka bisa dijumlahkan
const safeParse = (val: any) => {
  if (typeof val === 'number') return val;
  if (!val || val === '') return 0;
  return parseInt(String(val).replace(/[^0-9]/g, ''), 10) || 0;
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

  // 1. FILTERING DATA (Berdasarkan Input User)
  const filteredContents = useMemo(() => {
    return contents.filter(item => {
      const matchesSearch = (item.title || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!item.publish_date) return matchesSearch && selectedYear === 'All' && selectedMonth === 'All';
      
      const dateParts = item.publish_date.split('-'); // Format YYYY-MM-DD
      const itemYear = dateParts[0];
      const itemMonthIndex = String(parseInt(dateParts[1], 10) - 1);

      const matchesYear = selectedYear === 'All' || itemYear === selectedYear;
      const matchesMonth = selectedMonth === 'All' || itemMonthIndex === selectedMonth;

      return matchesSearch && matchesYear && matchesMonth;
    });
  }, [contents, searchQuery, selectedYear, selectedMonth]);

  // 2. AUTO-SUM (Kalkulasi Berdasarkan Data Terfilter)
  const summaryMetrics = useMemo(() => {
    const totalReach = filteredContents.reduce((acc, curr) => acc + safeParse(curr.views), 0);
    const totalEng = filteredContents.reduce((acc, curr) => acc + safeParse(curr.engagement), 0);
    const postedCount = filteredContents.filter(c => c.pub_status === 'Posted' || c.prod_status === 'Posted').length;

    return { totalReach, totalEng, postedCount };
  }, [filteredContents]);

  const bgCard = isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200';
  const textTitle = isDarkMode ? 'text-white' : 'text-gray-900';

  return (
    <div className="space-y-6">
      {/* HEADER & PRINT */}
      <div className={`p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${bgCard}`}>
        <div>
          <h2 className={`text-xl font-black ${textTitle}`}>LAPORAN PERFORMA</h2>
          <p className="text-xs text-gray-500">Periode Strategis: 2026 — 2031</p>
        </div>
        <button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs">
          EKSPOR PDF
        </button>
      </div>

      {/* KARTU RINGKASAN (SINKRON DENGAN RECAP) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl border ${bgCard}`}>
          <span className="text-[10px] font-bold text-gray-500 uppercase block">Total Tayang</span>
          <div className="text-2xl font-black text-emerald-500">{summaryMetrics.postedCount}</div>
        </div>
        <div className={`p-5 rounded-2xl border ${bgCard}`}>
          <span className="text-[10px] font-bold text-gray-500 uppercase block">Total Reach</span>
          <div className="text-2xl font-black text-blue-500">{summaryMetrics.totalReach.toLocaleString('id-ID')}</div>
        </div>
        <div className={`p-5 rounded-2xl border ${bgCard}`}>
          <span className="text-[10px] font-bold text-gray-500 uppercase block">Total Engagement</span>
          <div className="text-2xl font-black text-amber-500">{summaryMetrics.totalEng.toLocaleString('id-ID')}</div>
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
            className={`px-4 py-3 rounded-xl border text-xs outline-none ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-300'}`} 
          />
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="px-4 py-3 rounded-xl border text-xs font-bold bg-transparent">
            {availableYears.map(y => <option key={y} value={y}>{y === 'All' ? 'Semua Tahun' : y}</option>)}
          </select>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-4 py-3 rounded-xl border text-xs font-bold bg-transparent">
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {/* DAFTAR RINCIAN */}
      <div className="space-y-3">
        {filteredContents.map((item, index) => (
          <div key={index} className={`p-4 rounded-2xl border flex justify-between items-center ${bgCard}`}>
            <div>
              <h4 className={`text-sm font-bold ${textTitle}`}>{item.title}</h4>
              <p className="text-[10px] text-gray-500">📅 {item.publish_date}</p>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <span className="text-[8px] text-gray-500 block">REACH</span>
                <span className="text-xs font-black text-emerald-500">{item.views || 0}</span>
              </div>
              <div className="text-right">
                <span className="text-[8px] text-gray-500 block">ENGAGEMENT</span>
                <span className="text-xs font-black text-amber-500">{item.engagement || 0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}