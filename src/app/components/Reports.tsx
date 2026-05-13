"use client";
import React, { useState, useMemo } from 'react';
import { FileText, Download, Calendar, Search, Filter } from 'lucide-react';

interface ReportsProps {
  isDarkMode?: boolean;
  contents?: any[];
}

export default function Reports({ isDarkMode = true, contents = [] }: ReportsProps) {
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Menghasilkan daftar tahun dinamis berdasarkan data yang ada di database
  const availableYears = useMemo(() => {
    const years = contents
      .map(c => c.publish_date ? new Date(c.publish_date).getFullYear() : null)
      .filter((y): y is number => y !== null);
    return ['All', ...Array.from(new Set(years)).sort((a, b) => b - a).map(String)];
  }, [contents]);

  const months = [
    { value: 'All', label: 'Semua Bulan' },
    { value: '0', label: 'Januari' },
    { value: '1', label: 'Februari' },
    { value: '2', label: 'Maret' },
    { value: '3', label: 'April' },
    { value: '4', label: 'Mei' },
    { value: '5', label: 'Juni' },
    { value: '6', label: 'Juli' },
    { value: '7', label: 'Agustus' },
    { value: '8', label: 'September' },
    { value: '9', label: 'Oktober' },
    { value: '10', label: 'November' },
    { value: '11', label: 'Desember' },
  ];

  // Logika penyaringan naskah ganda (Berdasarkan Kata Kunci + Tahun + Bulan)
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

  // Pengaturan kelas dinamis menyesuaikan tema (Dark/Light)
  const bgCard = isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200';
  const bgInput = isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white focus:border-emerald-500' : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-emerald-600';
  const textTitle = isDarkMode ? 'text-white' : 'text-gray-900';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* JUDUL HALAMAN & KENDALI PENYARINGAN */}
      <div className={`p-6 rounded-3xl border shadow-sm transition-all ${bgCard}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className={`text-xl font-black tracking-tight ${textTitle} flex items-center gap-2`}>
              <FileText className="text-emerald-500" size={22} /> LOG KATALOG & AKUMULASI PERFORMA
            </h2>
            <p className="text-xs text-gray-500 mt-1">Rincian performa interaksi mendalam di seluruh ekosistem distribusi</p>
          </div>

          {/* Tombol Ekspor Data (Opsional/Estetika Fungsional) */}
          <button 
            onClick={() => alert("Mengunduh laporan CSV...")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all active:scale-95 self-start md:self-auto shadow-sm"
          >
            <Download size={14} /> Ekspor CSV
          </button>
        </div>

        {/* BARIS DROPDOWN FILTER & PENCARIAN (Redesain Premium) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Kolom Pencarian */}
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Cari naskah atau pilar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border text-xs font-medium outline-none transition-all ${bgInput}`}
            />
          </div>

          {/* Custom Dropdown: Pilihan Tahun */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] font-bold uppercase tracking-wider pointer-events-none">
              Tahun:
            </span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className={`w-full pl-16 pr-8 py-3 rounded-xl border text-xs font-bold appearance-none outline-none cursor-pointer transition-all ${bgInput}`}
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year === 'All' ? 'Semua Tahun' : year}</option>
              ))}
            </select>
            {/* Kustom Panah Dropdown */}
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
              <Filter size={14} />
            </div>
          </div>

          {/* Custom Dropdown: Pilihan Bulan */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] font-bold uppercase tracking-wider pointer-events-none">
              Bulan:
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className={`w-full pl-16 pr-8 py-3 rounded-xl border text-xs font-bold appearance-none outline-none cursor-pointer transition-all ${bgInput}`}
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
              <Calendar size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* KATALOG DAFTAR PERFORMA NASKAH */}
      <div className="space-y-3">
        {filteredContents.length === 0 ? (
          <div className={`p-12 text-center rounded-3xl border ${bgCard}`}>
            <p className="text-sm font-semibold text-gray-500">Tidak ada arsip laporan yang cocok dengan kriteria filter.</p>
          </div>
        ) : (
          filteredContents.map((item, index) => (
            <div 
              key={item.id || index}
              className={`p-5 rounded-2xl border transition-all hover:border-emerald-500/40 flex flex-col md:flex-row md:items-center justify-between gap-4 ${bgCard}`}
            >
              {/* Sisi Kiri: Identitas Konten */}
              <div className="space-y-1 md:max-w-md">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase ${
                    item.pub_status === 'Posted' 
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  }`}>
                    {item.pub_status || 'Draft'}
                  </span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2 py-0.5 rounded bg-gray-500/10">
                    {item.pillar || 'Strategis'}
                  </span>
                  <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                    📅 {item.publish_date || 'Tanpa Tanggal'}
                  </span>
                </div>
                
                <h4 className={`text-sm font-bold tracking-tight line-clamp-1 ${textTitle}`}>
                  {item.title || 'Naskah Tanpa Judul'}
                </h4>
              </div>

              {/* Sisi Kanan: Matriks Platform Terperinci (Menerapkan Tipografi Angka Roboto) */}
              <div className="flex items-center gap-2 flex-wrap md:justify-end">
                {/* Views Global */}
                <div className="px-3 py-1.5 rounded-xl bg-gray-500/5 border border-gray-500/10 text-center">
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 block font-bold">Reach</span>
                  <span className="font-roboto text-xs font-black text-emerald-500">
                    {(Number(item.views) || 0).toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Rincian Spesifik: Meta (FB+IG) */}
                <div className="px-2.5 py-1.5 rounded-xl bg-blue-500/5 border border-blue-500/10 text-center">
                  <span className="text-[8px] uppercase tracking-wider text-blue-500 block font-extrabold">Meta</span>
                  <span className="font-roboto text-xs font-black text-white">
                    {(Number(item.meta_eng) || 0).toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Rincian Spesifik: TikTok */}
                <div className="px-2.5 py-1.5 rounded-xl bg-pink-500/5 border border-pink-500/10 text-center">
                  <span className="text-[8px] uppercase tracking-wider text-pink-500 block font-extrabold">TikTok</span>
                  <span className="font-roboto text-xs font-black text-white">
                    {(Number(item.tiktok_eng) || 0).toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Rincian Spesifik: X (Twitter) */}
                <div className="px-2.5 py-1.5 rounded-xl bg-gray-400/5 border border-gray-400/10 text-center">
                  <span className="text-[8px] uppercase tracking-wider text-gray-400 block font-extrabold">X</span>
                  <span className="font-roboto text-xs font-black text-white">
                    {(Number(item.x_eng) || 0).toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Rincian Spesifik: YT Shorts */}
                <div className="px-2.5 py-1.5 rounded-xl bg-red-500/5 border border-red-500/10 text-center">
                  <span className="text-[8px] uppercase tracking-wider text-red-500 block font-extrabold">Shorts</span>
                  <span className="font-roboto text-xs font-black text-white">
                    {(Number(item.yt_eng) || 0).toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Total Global Interaksi */}
                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-[9px] uppercase tracking-widest text-emerald-500 block font-bold">Total Eng.</span>
                  <span className="font-roboto text-xs font-black text-emerald-400">
                    {(Number(item.engagement) || 0).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}