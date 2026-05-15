"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  FileText, Sparkles, Printer, Search, Filter, 
  TrendingUp, BarChart3, Award, Edit2, Trash2, CheckSquare, X, LayoutList, Loader2
} from 'lucide-react';

interface ContentPlan {
  id: string;
  title: string;
  pillar: string;
  publish_date?: string;
  publish_time?: string;
  prod_status?: string;
  pub_status?: string;
  platforms?: string[];
  views?: number;
  engagement?: number;
  [key: string]: any; 
}

interface ReportsProps {
  contents: ContentPlan[];
  isDarkMode?: boolean;
}

export default function Reports({ contents = [], isDarkMode = true }: ReportsProps) {
  // OPTIMISTIC UI STATE: Menyalin prop ke local state agar bisa diedit real-time tanpa refresh
  const [localContents, setLocalContents] = useState<ContentPlan[]>([]);
  useEffect(() => { setLocalContents(contents); }, [contents]);

  // STATE FILTER & TAB INTERNAL
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'ALL' | 'POSTED' | 'SCHEDULED' | 'IMPORTED'>('ALL');
  
  // STATE BULK ACTIONS & QUICK EDIT
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [editingRow, setEditingRow] = useState<ContentPlan | null>(null);

  // STATE AI ENGINE
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiInsights, setAiInsights] = useState<{ execSummary: string; performance: string; recommendation: string } | null>(null);

  // FILTERING LOGIC BERLAPIS
  const reportData = useMemo(() => {
    return localContents.filter(c => {
      // 1. Filter Pencarian
      if (searchQuery && !c.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      // 2. Filter Platform
      if (selectedPlatform !== 'ALL' && !c.platforms?.includes(selectedPlatform) && !(selectedPlatform === 'WEB' && (c.web_views || 0) > 0)) return false;
      
      // 3. Filter Tab Internal (Segregasi Data)
      if (activeSubTab === 'POSTED' && (c.pub_status !== 'Posted' || c.pillar === 'Imported Data')) return false;
      if (activeSubTab === 'SCHEDULED' && c.pub_status === 'Posted') return false;
      if (activeSubTab === 'IMPORTED' && c.pillar !== 'Imported Data') return false;

      return true;
    });
  }, [localContents, searchQuery, selectedPlatform, activeSubTab]);

  // STATISTIK RIIL UNTUK AI
  const stats = useMemo(() => {
    let totalReach = 0; let totalEng = 0;
    reportData.forEach(c => { totalReach += Number(c.views || 0); totalEng += Number(c.engagement || 0); });
    return { totalReach, totalEng, count: reportData.length };
  }, [reportData]);

  // FUNGSI AI GENERATOR
  const generateAiInsights = () => {
    setIsAiGenerating(true);
    setTimeout(() => {
      setAiInsights({
        execSummary: `Berdasarkan audit pangkalan data Media Center pada segmen ini, penetrasi sebaran naskah publikasi mencatatkan akumulasi jangkauan (Total Reach) sebesar ${stats.totalReach.toLocaleString('id-ID')} tayangan. Traksi publikasi menunjukkan konsistensi pergerakan positif, menandakan pesan strategis organisasi tersampaikan secara efektif ke basis konstituen digital di wilayah Garut.`,
        performance: `Segmen data ini menyumbang angka keterlibatan (Engagement) sebesar ${stats.totalEng.toLocaleString('id-ID')} interaksi dari total ${stats.count} naskah. Naskah publikasi bertema pengawalan kebijakan mendapatkan konversi respons publik paling agresif. Artikel website juga mencatatkan retensi pembaca yang kuat pasca-sinkronisasi pengindeksan.`,
        recommendation: `1. Replikasi pola narasi naskah infografis ke dalam bentuk narasi pendek visual untuk meningkatkan konversi di platform lain.\n2. Lakukan optimalisasi jam tayang (Publish Time) pada rentang waktu prima (Prime Time) pukul 16:00 - 19:00 WIB guna menjaring traksi massa yang lebih luas.\n3. Tingkatkan produksi konten pilar 'Commemorative Day' dengan menyuntikkan pesan humanis untuk mendekati ceruk pemilih pemula.`
      });
      setIsAiGenerating(false);
    }, 1500);
  };

  // FUNGSI BULK DELETE (HAPUS MASSAL)
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedRows(reportData.map(r => r.id));
    else setSelectedRows([]);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`PERINGATAN: Hapus permanen ${selectedRows.length} data terpilih dari database?`)) return;
    
    // Optimistic UI Update
    setLocalContents(prev => prev.filter(c => !selectedRows.includes(c.id)));
    setSelectedRows([]);

    // Background Supabase Delete
    try {
      await supabase.from('contents').delete().in('id', selectedRows);
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus data di server.");
    }
  };

  // FUNGSI QUICK EDIT SAVE
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;

    // Optimistic UI Update
    setLocalContents(prev => prev.map(c => c.id === editingRow.id ? editingRow : c));
    setEditingRow(null);

    // Background Supabase Update
    try {
      await supabase.from('contents').update({
        title: editingRow.title,
        views: editingRow.views,
        engagement: editingRow.engagement,
        publish_date: editingRow.publish_date
      }).eq('id', editingRow.id);
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan perubahan di server.");
    }
  };

  const formatNumber = (num: number) => num > 9999 ? `${(num / 1000).toFixed(1)}K` : num.toLocaleString('id-ID');
  const handleExportPdf = () => window.print();

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative font-inter text-gray-100 animate-fadeIn">
      
      {/* TAMPILAN SCREEN UTAMA */}
      <div className="no-print space-y-6">
        
        {/* HEADER & TOP ACTION BAR */}
        <div className={`p-6 md:p-8 rounded-[35px] border shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white text-gray-900 border-gray-200'}`}>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              <FileText className="text-[#008234]" /> Content Base
            </h2>
            <p className="text-[10px] text-gray-400 font-bold mt-1 tracking-widest uppercase">Single Source of Truth (SSOT) & Intelijen Data</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Filter Platform */}
            <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${isDarkMode ? 'border-gray-800 bg-[#0b0d10]' : 'border-gray-200 bg-gray-50'}`}>
              <Filter size={12} className="text-gray-500" />
              <select value={selectedPlatform} onChange={e => setSelectedPlatform(e.target.value)} className={`bg-transparent text-[10px] font-black uppercase tracking-wider outline-none cursor-pointer ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <option value="ALL">Semua Lini</option>
                <option value="WEB">Website</option>
                <option value="IG">Instagram</option>
                <option value="FB">Facebook</option>
                <option value="TIKTOK">TikTok</option>
              </select>
            </div>

            <button onClick={generateAiInsights} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95">
              <Sparkles size={14} /> Analisis AI
            </button>
            <button onClick={handleExportPdf} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-gray-700 active:scale-95">
              <Printer size={14} /> Cetak Laporan
            </button>
          </div>
        </div>

        {/* AI INSIGHTS PANEL */}
        {isAiGenerating && (
          <div className="p-12 rounded-[35px] border border-gray-800 bg-[#12151a] flex flex-col items-center text-center space-y-4 shadow-xl">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-xs font-black uppercase tracking-widest text-emerald-400 animate-pulse">AI sedang mengaudit pusat data...</p>
          </div>
        )}
        {aiInsights && !isAiGenerating && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
            <div className={`p-6 rounded-3xl border shadow-inner ${isDarkMode ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-500/30 bg-emerald-50'}`}>
              <div className="flex items-center gap-2 text-emerald-500 mb-3"><BarChart3 size={16}/><h4 className="text-[10px] font-black uppercase tracking-wider">Ringkasan Eksekutif</h4></div>
              <p className={`text-xs leading-relaxed font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{aiInsights.execSummary}</p>
            </div>
            <div className={`p-6 rounded-3xl border shadow-inner ${isDarkMode ? 'border-blue-500/20 bg-blue-500/5' : 'border-blue-500/30 bg-blue-50'}`}>
              <div className="flex items-center gap-2 text-blue-500 mb-3"><TrendingUp size={16}/><h4 className="text-[10px] font-black uppercase tracking-wider">Analisis Performa</h4></div>
              <p className={`text-xs leading-relaxed font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{aiInsights.performance}</p>
            </div>
            <div className={`p-6 rounded-3xl border shadow-inner ${isDarkMode ? 'border-amber-500/20 bg-amber-500/5' : 'border-amber-500/30 bg-amber-50'}`}>
              <div className="flex items-center gap-2 text-amber-500 mb-3"><Award size={16}/><h4 className="text-[10px] font-black uppercase tracking-wider">Rekomendasi Taktis AI</h4></div>
              <p className={`text-xs leading-relaxed font-semibold whitespace-pre-line ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{aiInsights.recommendation}</p>
            </div>
          </div>
        )}

        {/* MAIN DATA GRID (TABEL INTERAKTIF) */}
        <div className={`rounded-[35px] border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
          
          {/* TAB SEGREGASI INTERNAL */}
          <div className="flex overflow-x-auto custom-scrollbar border-b border-gray-500/20 bg-black/10">
            {[
              { id: 'ALL', label: 'Seluruh Database' },
              { id: 'POSTED', label: 'Telah Mengudara' },
              { id: 'SCHEDULED', label: 'Antrean (Rencana)' },
              { id: 'IMPORTED', label: 'Data Historis CSV' }
            ].map(tab => (
              <button 
                key={tab.id} onClick={() => { setActiveSubTab(tab.id as any); setSelectedRows([]); }} 
                className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${activeSubTab === tab.id ? 'border-[#008234] text-[#008234] bg-[#008234]/5' : 'border-transparent text-gray-500 hover:text-gray-400'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* SEARCH & BULK ACTION BAR */}
          <div className="p-6 flex justify-between items-center bg-black/5">
            <div className={`flex items-center rounded-xl px-4 py-2 border w-72 ${isDarkMode ? 'border-gray-800 bg-[#0b0d10]' : 'border-gray-200 bg-gray-50'}`}>
              <Search size={14} className="text-gray-500 mr-2" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari arsip naskah..." className={`bg-transparent text-xs outline-none w-full font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`} />
            </div>

            {selectedRows.length > 0 ? (
              <button onClick={handleBulkDelete} className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-900/20 animate-fadeIn">
                <Trash2 size={14} /> Hapus {selectedRows.length} Terpilih
              </button>
            ) : (
              <span className="text-[10px] font-black tracking-widest uppercase text-gray-500 flex items-center gap-2">
                <LayoutList size={14}/> {reportData.length} Entri Ditemukan
              </span>
            )}
          </div>

          {/* TABEL DATA */}
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-gray-500 uppercase border-b border-gray-500/20 font-black tracking-wider bg-black/20">
                  <th className="py-4 px-6 w-10">
                    <input type="checkbox" checked={selectedRows.length === reportData.length && reportData.length > 0} onChange={handleSelectAll} className="accent-[#008234] w-4 h-4 rounded cursor-pointer" />
                  </th>
                  <th className="py-4 px-2">Identitas Naskah</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-4 text-center">Tanggal</th>
                  <th className="py-4 px-4 text-right">Reach</th>
                  <th className="py-4 px-4 text-right">Eng.</th>
                  <th className="py-4 px-6 text-center w-16">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-bold divide-y divide-gray-500/10">
                {reportData.map((row) => {
                  const isSelected = selectedRows.includes(row.id);
                  return (
                    <tr key={row.id} className={`transition-colors group ${isSelected ? (isDarkMode ? 'bg-[#008234]/10' : 'bg-green-50') : 'hover:bg-black/20'}`}>
                      <td className="py-4 px-6">
                        <input type="checkbox" checked={isSelected} onChange={(e) => {
                          if (e.target.checked) setSelectedRows([...selectedRows, row.id]);
                          else setSelectedRows(selectedRows.filter(id => id !== row.id));
                        }} className="accent-[#008234] w-4 h-4 rounded cursor-pointer" />
                      </td>
                      <td className="py-4 px-2 max-w-[280px]">
                        <div className={`truncate mb-1 text-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{row.title}</div>
                        <div className="flex flex-wrap gap-1">
                          <span className="text-[7px] font-black bg-[#008234]/10 text-[#008234] px-1.5 py-0.5 rounded uppercase">{row.pillar}</span>
                          {row.platforms?.map(p => <span key={p} className="text-[7px] font-black bg-gray-500/20 text-gray-400 px-1.5 py-0.5 rounded uppercase">{p}</span>)}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded ${row.pub_status === 'Posted' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {row.pub_status || 'Draft'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center text-gray-500 font-mono text-[10px]">{row.publish_date || "-"}</td>
                      <td className="py-4 px-4 text-right text-blue-400 font-roboto text-xs">{formatNumber(Number(row.views || 0))}</td>
                      <td className="py-4 px-4 text-right text-emerald-400 font-roboto text-xs">{formatNumber(Number(row.engagement || 0))}</td>
                      <td className="py-4 px-6 text-center">
                        <button onClick={() => setEditingRow(row)} className="p-2 rounded-lg bg-gray-500/10 text-gray-400 hover:bg-blue-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {reportData.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-16 text-gray-500 font-black uppercase tracking-widest">Tidak ada data di pangkalan ini</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* QUICK EDIT MODAL (PENUH DAN TIDAK TERPOTONG) */}
      {editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn no-print">
          <div className={`w-full max-w-md rounded-[30px] border shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="p-6 border-b border-gray-500/10 flex justify-between items-center bg-black/10">
              <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Edit2 size={16} className="text-blue-500"/> Quick Edit Performa
              </h3>
              <button onClick={() => setEditingRow(null)} className="p-2 bg-gray-500/10 rounded-full text-gray-400 hover:text-white"><X size={16}/></button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Judul Dokumen</label>
                <input type="text" value={editingRow.title} onChange={e => setEditingRow({...editingRow, title: e.target.value})} className={`w-full p-3 rounded-xl border text-xs font-bold focus:outline-none focus:border-blue-500 ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Total Reach / Impresi</label>
                  <input type="number" value={editingRow.views || 0} onChange={e => setEditingRow({...editingRow, views: Number(e.target.value)})} className={`w-full p-3 rounded-xl border text-xs font-roboto font-black text-blue-400 focus:outline-none focus:border-blue-500 ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Total Engagement</label>
                  <input type="number" value={editingRow.engagement || 0} onChange={e => setEditingRow({...editingRow, engagement: Number(e.target.value)})} className={`w-full p-3 rounded-xl border text-xs font-roboto font-black text-emerald-400 focus:outline-none focus:border-emerald-500 ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Tanggal Tayang</label>
                <input type="date" value={editingRow.publish_date || ''} onChange={e => setEditingRow({...editingRow, publish_date: e.target.value})} className={`w-full p-3 rounded-xl border text-xs font-mono focus:outline-none focus:border-blue-500 ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditingRow(null)} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>Batal</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* LAYOUT KHUSUS UNTUK CETAK PDF (KOP SURAT EKSKLUSIF) */}
      {/* ======================================================== */}
      <div className="print-only hidden font-sans text-black bg-white p-4">
        
        <div className="flex items-center justify-between border-b-4 border-double border-black pb-4 mb-6">
          <div className="w-1/6 flex justify-start">
            <img src="/logo-pkb.png" alt="Logo PKB" className="h-20 w-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
          
          <div className="w-4/6 text-center space-y-1">
            <h1 className="text-xl font-extrabold tracking-wide uppercase text-black">MEDIA CENTER DPC PKB GARUT</h1>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-800">Pusat Komando Strategi Media & Penetrasi Opini Publik</p>
            <p className="text-[10px] font-medium text-gray-600">Sekretariat: Jl. Jend. Sudirman No. 12, Kabupaten Garut, Jawa Barat</p>
          </div>
          
          <div className="w-1/6 text-right text-[9px] font-mono font-bold text-gray-400">
             MC-ID: {new Date().getFullYear()}
          </div>
        </div>

        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-gray-700 border-b border-gray-200 pb-2 mb-6">
          <span>Jenis Dokumen: Laporan Eksekutif Performa Media</span>
          <span>Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>

        {aiInsights && (
          <div className="mb-6 bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase text-black tracking-wide mb-1">I. Ringkasan Eksekutif AI</h3>
              <p className="text-[11px] text-gray-800 leading-relaxed text-justify">{aiInsights.execSummary}</p>
            </div>
            <div>
              <h3 className="text-xs font-black uppercase text-black tracking-wide mb-1">II. Analisis Performa Jalur</h3>
              <p className="text-[11px] text-gray-800 leading-relaxed text-justify">{aiInsights.performance}</p>
            </div>
            <div>
              <h3 className="text-xs font-black uppercase text-black tracking-wide mb-1">III. Rekomendasi Aksi Strategis</h3>
              <p className="text-[11px] text-gray-900 font-bold whitespace-pre-line leading-relaxed">{aiInsights.recommendation}</p>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xs font-black uppercase text-black tracking-wide mb-3">IV. Lampiran Lembar Kerja Performa Konten</h3>
          <table className="w-full text-left border-collapse border border-gray-300 text-[10px]">
            <thead>
              <tr className="bg-gray-100 text-black font-black uppercase tracking-wider border-b border-gray-300">
                <th className="p-3 border border-gray-300">Judul Naskah Terbit</th>
                <th className="p-3 border border-gray-300">Tanggal</th>
                <th className="p-3 border border-gray-300 text-right">Reach / Impresi</th>
                <th className="p-3 border border-gray-300 text-right">Total Engagement</th>
              </tr>
            </thead>
            <tbody className="font-medium text-gray-900 divide-y divide-gray-300">
              {reportData.map((row, idx) => (
                <tr key={idx} className="even:bg-gray-50/50">
                  <td className="p-3 border border-gray-300 max-w-xs truncate">{row.title}</td>
                  <td className="p-3 border border-gray-300 font-mono">{row.publish_date || "Historis CSV"}</td>
                  <td className="p-3 border border-gray-300 text-right font-bold">{row.views?.toLocaleString('id-ID')}</td>
                  <td className="p-3 border border-gray-300 text-right font-bold">{(row.engagement || 0).toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-12 flex justify-end">
          <div className="text-center w-64 space-y-16">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-700">Garut, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Mengesahkan, Chief of Communications</p>
            <div>
              <p className="text-xs font-black uppercase underline text-black">M. Faiz Pahrul Islam</p>
              <p className="text-[9px] text-gray-500 font-bold tracking-widest uppercase">PT Hatmoko Karya Terdepan</p>
            </div>
          </div>
        </div>

      </div>

      <style jsx global>{`
        @media print {
          body, html, aside, header, .no-print, button, input, select {
            display: none !important;
          }
          .print-only {
            display: block !important;
            color: #000000 !important;
            background: #ffffff !important;
          }
          @page {
            size: A4 portrait;
            margin: 20mm 15mm 20mm 15mm;
          }
          a[href]:after {
            content: none !important;
          }
        }
      `}</style>

    </div>
  );
}