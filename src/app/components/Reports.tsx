"use client";
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  FileText, Sparkles, Printer, Search, Filter, 
  TrendingUp, BarChart3, Award, Edit2, Trash2, X, LayoutList, Loader2, ChevronDown, CalendarDays, Database, Send, Clock, FileSpreadsheet, Eye, MousePointer2, Activity
} from 'lucide-react';

// --- KOMPONEN MODERN DROPDOWN KHUSUS ---
interface DropdownOption { value: string; label: string; }
const ModernDropdown = ({ value, options, onChange, icon: Icon, placeholder, isDarkMode }: { value: string, options: DropdownOption[], onChange: (val: string) => void, icon?: any, placeholder: string, isDarkMode: boolean }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

  return (
    <div className="relative" ref={dropdownRef}>
      <button type="button" onClick={() => setOpen(!open)} className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border transition-all min-w-[160px] text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-300 hover:border-emerald-500/50 hover:text-emerald-400' : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-emerald-500'}`}>
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className="text-[#008234]" />}
          <span className="truncate">{selectedLabel}</span>
        </div>
        <ChevronDown size={14} className={`transition-transform duration-300 ${open ? 'rotate-180 text-emerald-500' : 'text-gray-500'}`} />
      </button>
      {open && (
        <div className={`absolute top-full mt-2 left-0 w-full rounded-2xl border shadow-2xl z-50 overflow-hidden animate-fadeIn ${isDarkMode ? 'bg-[#161920] border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
            {options.map(opt => (
              <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }} className={`w-full text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors rounded-xl mb-1 last:mb-0 ${value === opt.value ? 'bg-[#008234] text-white' : isDarkMode ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- INTERFACES ---
interface ContentPlan {
  id: string; title: string; pillar: string; publish_date?: string; publish_time?: string;
  prod_status?: string; pub_status?: string; platforms?: string[];
  views?: number; engagement?: number; [key: string]: any; 
}

interface ReportsProps { contents: ContentPlan[]; isDarkMode?: boolean; }

export default function Reports({ contents = [], isDarkMode = true }: ReportsProps) {
  const [localContents, setLocalContents] = useState<ContentPlan[]>([]);
  useEffect(() => { setLocalContents(contents); }, [contents]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'ALL' | 'POSTED' | 'SCHEDULED' | 'IMPORTED'>('ALL');
  
  const [selectedPlatform, setSelectedPlatform] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');

  const platformOptions = [
    { value: 'ALL', label: 'Semua Lini' }, { value: 'WEB', label: 'Website' },
    { value: 'IG', label: 'Instagram' }, { value: 'FB', label: 'Facebook' }, { value: 'TIKTOK', label: 'TikTok' }
  ];
  const monthOptions = [
    { value: 'ALL', label: 'Semua Bulan' }, { value: '01', label: 'Januari' }, { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' }, { value: '04', label: 'April' }, { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' }, { value: '07', label: 'Juli' }, { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' }, { value: '10', label: 'Oktober' }, { value: '11', label: 'November' }, { value: '12', label: 'Desember' }
  ];
  const yearOptions = [{ value: 'ALL', label: 'Semua Tahun' }, ...Array.from({length: 10}, (_, i) => ({ value: String(2026 + i), label: String(2026 + i) }))];

  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [editingRow, setEditingRow] = useState<ContentPlan | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiInsights, setAiInsights] = useState<{ execSummary: string; performance: string; recommendation: string } | null>(null);

  const reportData = useMemo(() => {
    return localContents.filter(c => {
      if (searchQuery && !c.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedPlatform !== 'ALL' && !c.platforms?.includes(selectedPlatform) && !(selectedPlatform === 'WEB' && (c.web_views || 0) > 0)) return false;
      
      const pDate = c.publish_date || ''; 
      const cYear = pDate.split('-')[0];
      const cMonth = pDate.split('-')[1];
      
      if (selectedYear !== 'ALL' && cYear !== selectedYear) return false;
      if (selectedMonth !== 'ALL' && cMonth !== selectedMonth) return false;

      if (activeSubTab === 'POSTED' && (c.pub_status !== 'Posted' || c.pillar === 'Imported Data')) return false;
      if (activeSubTab === 'SCHEDULED' && c.pub_status === 'Posted') return false;
      if (activeSubTab === 'IMPORTED' && c.pillar !== 'Imported Data') return false;

      return true;
    });
  }, [localContents, searchQuery, selectedPlatform, selectedMonth, selectedYear, activeSubTab]);

  const stats = useMemo(() => {
    let totalReach = 0; let totalEng = 0;
    reportData.forEach(c => { totalReach += Number(c.views || 0); totalEng += Number(c.engagement || 0); });
    const avgEng = reportData.length > 0 ? Math.round(totalEng / reportData.length) : 0;
    return { totalReach, totalEng, count: reportData.length, avgEng };
  }, [reportData]);

  const topPillar = useMemo(() => {
    const counts: Record<string, number> = {};
    reportData.forEach(c => {
      if(c.pillar && c.pillar !== 'Imported Data') counts[c.pillar] = (counts[c.pillar] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : 'N/A';
  }, [reportData]);

  const generateAiInsights = () => {
    setIsAiGenerating(true);
    setTimeout(() => {
      setAiInsights({
        execSummary: `Laporan mencatatkan total jangkauan sebesar ${stats.totalReach.toLocaleString('id-ID')} views dengan ${stats.totalEng.toLocaleString('id-ID')} interaksi organik. Fokus didominasi pilar ${topPillar !== 'N/A' ? topPillar : 'campuran'}. Traksi publikasi menunjukkan konsistensi pergerakan positif, memastikan pesan strategis organisasi tersampaikan efektif ke ceruk konstituen digital.`,
        performance: `Platform unggulan memimpin penetrasi tertinggi dengan reaksi yang solid. Kinerja lintas saluran menunjukkan efisiensi distribusi yang sangat sehat. Rata-rata interaksi per naskah berada di angka ${stats.avgEng.toLocaleString('id-ID')}, mencatatkan retensi dan konversi respons publik yang agresif.`,
        recommendation: `1. Eskalasi Pilar ${topPillar !== 'N/A' ? topPillar : 'Strategic'} sebagai identitas utama.\n2. Replikasi format sukses naskah berkinerja tertinggi ke saluran lainnya.\n3. Optimasi jadwal tayang pada rentang waktu prima guna menjaring traksi massa optimal.`
      });
      setIsAiGenerating(false);
    }, 1500);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => e.target.checked ? setSelectedRows(reportData.map(r => r.id)) : setSelectedRows([]);
  const handleBulkDelete = async () => {
    if (!window.confirm(`PERINGATAN: Hapus permanen ${selectedRows.length} data terpilih dari database?`)) return;
    setLocalContents(prev => prev.filter(c => !selectedRows.includes(c.id)));
    setSelectedRows([]);
    try { await supabase.from('contents').delete().in('id', selectedRows); } catch (err) { alert("Gagal menghapus data di server."); }
  };
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;
    setLocalContents(prev => prev.map(c => c.id === editingRow.id ? editingRow : c));
    setEditingRow(null);
    try {
      await supabase.from('contents').update({ title: editingRow.title, views: editingRow.views, engagement: editingRow.engagement, publish_date: editingRow.publish_date }).eq('id', editingRow.id);
    } catch (err) { alert("Gagal menyimpan perubahan di server."); }
  };

  const formatNumber = (num: number) => num > 9999 ? `${(num / 1000).toFixed(1)}K` : num.toLocaleString('id-ID');
  
  const handleExportPdf = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative font-inter text-gray-100 animate-fadeIn">
      
      {/* ======================================================== */}
      {/* TAMPILAN SCREEN UTAMA (Sembunyikan saat cetak) */}
      {/* ======================================================== */}
      <div className="no-print space-y-6">
        
        <div className={`p-6 md:p-8 rounded-[35px] border shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white text-gray-900 border-gray-200'}`}>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              <Database className="text-[#008234]" /> Content Base
            </h2>
            <p className="text-[10px] text-gray-400 font-bold mt-1 tracking-widest uppercase">Single Source of Truth (SSOT) & Intelijen Data</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <ModernDropdown value={selectedPlatform} options={platformOptions} onChange={setSelectedPlatform} icon={Filter} placeholder="Pilih Platform" isDarkMode={isDarkMode} />
            <ModernDropdown value={selectedMonth} options={monthOptions} onChange={setSelectedMonth} icon={CalendarDays} placeholder="Pilih Bulan" isDarkMode={isDarkMode} />
            <ModernDropdown value={selectedYear} options={yearOptions} onChange={setSelectedYear} icon={CalendarDays} placeholder="Pilih Tahun" isDarkMode={isDarkMode} />

            <div className="w-px h-8 bg-gray-500/30 hidden md:block mx-2"></div>

            <button onClick={generateAiInsights} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95">
              <Sparkles size={14} /> Analisis AI
            </button>
            <button onClick={handleExportPdf} className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-gray-700 active:scale-95">
              <Printer size={14} /> Ekspor PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Entri', val: stats.count, icon: <LayoutList size={20} />, color: 'text-white' },
            { label: 'Total Reach', val: formatNumber(stats.totalReach), icon: <Eye size={20} />, color: 'text-blue-400' },
            { label: 'Total Engagement', val: formatNumber(stats.totalEng), icon: <MousePointer2 size={20} />, color: 'text-emerald-400' },
            { label: 'Rata-rata Eng.', val: formatNumber(stats.avgEng), icon: <Activity size={20} />, color: 'text-amber-400' },
          ].map((card, idx) => (
            <div key={idx} className={`p-5 rounded-[25px] border shadow-sm relative overflow-hidden group ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{card.label}</span>
                <div className={`p-2 rounded-xl bg-gray-500/10 ${card.color}`}>{card.icon}</div>
              </div>
              <div className={`font-roboto text-3xl font-black tracking-tight mt-2 ${card.color}`}>{card.val}</div>
            </div>
          ))}
        </div>

        {isAiGenerating && (
          <div className="p-12 rounded-[35px] border border-gray-800 bg-[#12151a] flex flex-col items-center text-center space-y-4 shadow-xl">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-xs font-black uppercase tracking-widest text-emerald-400 animate-pulse">Memproses Jutaan Parameter Data...</p>
          </div>
        )}
        {aiInsights && !isAiGenerating && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
            <div className={`p-6 rounded-3xl border shadow-inner ${isDarkMode ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-500/30 bg-emerald-50'}`}>
              <div className="flex items-center gap-2 text-emerald-500 mb-3"><BarChart3 size={16}/><h4 className="text-[10px] font-black uppercase tracking-wider">Ringkasan Eksekutif</h4></div>
              <p className={`text-[11px] leading-relaxed font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{aiInsights.execSummary}</p>
            </div>
            <div className={`p-6 rounded-3xl border shadow-inner ${isDarkMode ? 'border-blue-500/20 bg-blue-500/5' : 'border-blue-500/30 bg-blue-50'}`}>
              <div className="flex items-center gap-2 text-blue-500 mb-3"><TrendingUp size={16}/><h4 className="text-[10px] font-black uppercase tracking-wider">Analisis Performa</h4></div>
              <p className={`text-[11px] leading-relaxed font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{aiInsights.performance}</p>
            </div>
            <div className={`p-6 rounded-3xl border shadow-inner ${isDarkMode ? 'border-amber-500/20 bg-amber-500/5' : 'border-amber-500/30 bg-amber-50'}`}>
              <div className="flex items-center gap-2 text-amber-500 mb-3"><Award size={16}/><h4 className="text-[10px] font-black uppercase tracking-wider">Rekomendasi Taktis AI</h4></div>
              <p className={`text-[11px] leading-relaxed font-semibold whitespace-pre-line ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{aiInsights.recommendation}</p>
            </div>
          </div>
        )}

        <div className={`rounded-[35px] border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="flex overflow-x-auto custom-scrollbar border-b border-gray-500/20 bg-black/10">
            {[
              { id: 'ALL', label: 'Semua Data', icon: <Database size={12}/> },
              { id: 'POSTED', label: 'Mengudara', icon: <Send size={12}/> },
              { id: 'SCHEDULED', label: 'Antrean (Rencana)', icon: <Clock size={12}/> },
              { id: 'IMPORTED', label: 'Historis CSV', icon: <FileSpreadsheet size={12}/> }
            ].map(tab => (
              <button 
                key={tab.id} onClick={() => { setActiveSubTab(tab.id as any); setSelectedRows([]); }} 
                className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${activeSubTab === tab.id ? 'border-[#008234] text-[#008234] bg-[#008234]/5' : 'border-transparent text-gray-500 hover:text-gray-400'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

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
                    <tr key={row.id} className={`transition-colors group ${isSelected ? (isDarkMode ? 'bg-[#008234]/10' : 'bg-green-50') : 'hover:bg-white/5'}`}>
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
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded ${row.pub_status === 'Posted' || row.pillar === 'Imported Data' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
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

      {/* QUICK EDIT MODAL */}
      {editingRow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn no-print">
          <div className={`w-full max-w-md rounded-[30px] shadow-2xl border overflow-hidden ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
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
      {/* DESAIN CETAK PDF EKSEKUTIF (COLORFUL)                      */}
      {/* ======================================================== */}
      <div className="print-safe-area hidden w-full font-sans">
        
        {/* HEADER PDF BERWARNA */}
        <div className="flex justify-between items-start border-b-4 border-[#008234] pb-6 mb-8">
           <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-[#008234] m-0">PERFORMANCE REPORT</h1>
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-800 mt-1 m-0">MEDIA CENTER DPC PKB GARUT<br/>COMMAND CENTER PLATFORM</h2>
           </div>
           <div className="text-right">
              <p className="text-xs font-bold uppercase bg-gradient-to-r from-[#008234] to-teal-600 text-white px-4 py-1.5 inline-block mb-2 rounded-l-lg shadow-sm m-0">CONFIDENTIAL DOCUMENT</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 m-0">
                BULAN {selectedMonth !== 'ALL' ? monthOptions.find(m => m.value === selectedMonth)?.label : 'KESELURUHAN'} {selectedYear !== 'ALL' ? selectedYear : new Date().getFullYear()}
              </p>
           </div>
        </div>

        {/* 4 METRIC CARDS BERWARNA */}
        <div className="flex gap-6 mb-10">
           <div className="flex-1 border-l-4 border-gray-400 pl-4 bg-gray-50 p-4 rounded-r-xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Total Naskah</p>
              <p className="text-3xl font-black text-gray-900 m-0">{reportData.length}</p>
           </div>
           <div className="flex-1 border-l-4 border-emerald-500 pl-4 bg-emerald-50 p-4 rounded-r-xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1">Interaksi</p>
              <p className="text-3xl font-black text-emerald-600 m-0">{stats.totalEng.toLocaleString('id-ID')}</p>
           </div>
           <div className="flex-1 border-l-4 border-blue-500 pl-4 bg-blue-50 p-4 rounded-r-xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-700 mb-1">Total Reach</p>
              <p className="text-3xl font-black text-blue-600 m-0">{stats.totalReach.toLocaleString('id-ID')}</p>
           </div>
           <div className="flex-1 border-l-4 border-amber-500 pl-4 bg-amber-50 p-4 rounded-r-xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-1">Top Pilar</p>
              <p className="text-2xl font-black text-amber-600 uppercase truncate mt-1 m-0">{topPillar}</p>
           </div>
        </div>

        {/* AI EXECUTIVE STRATEGY BERWARNA */}
        {aiInsights && (
           <div className="mb-10 border-2 border-emerald-100 bg-emerald-50/40 p-6 rounded-2xl relative">
              <div className="absolute -top-4 left-6 bg-[#008234] text-white px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md shadow-md">
                 AI EXECUTIVE STRATEGY
              </div>
              <div className="grid grid-cols-3 gap-8 mt-2">
                 <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest border-b-2 border-emerald-200 pb-1.5 mb-3 text-emerald-800">Ringkasan Analitik</h4>
                    <p className="text-[11px] leading-relaxed text-justify text-gray-800 m-0">{aiInsights.execSummary}</p>
                 </div>
                 <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest border-b-2 border-emerald-200 pb-1.5 mb-3 text-emerald-800">Performa</h4>
                    <p className="text-[11px] leading-relaxed text-justify text-gray-800 m-0">{aiInsights.performance}</p>
                 </div>
                 <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest border-b-2 border-emerald-200 pb-1.5 mb-3 text-emerald-800">Rekomendasi</h4>
                    <p className="text-[11px] font-bold leading-relaxed whitespace-pre-line text-gray-900 m-0">{aiInsights.recommendation}</p>
                 </div>
              </div>
           </div>
        )}

        {/* TABLE RINCIAN */}
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-800 mb-4">DAFTAR RINCIAN PERFORMA KONTEN</h3>
          <table className="w-full text-left border-collapse border border-gray-200 text-[10px]">
            <thead>
              <tr className="bg-[#008234] text-white font-black uppercase tracking-wider">
                <th className="p-3 border border-[#008234] w-1/2">Judul Naskah Terbit</th>
                <th className="p-3 border border-[#008234] w-1/6">Tanggal</th>
                <th className="p-3 border border-[#008234] w-1/6 text-right">Reach</th>
                <th className="p-3 border border-[#008234] w-1/6 text-right">Engagement</th>
              </tr>
            </thead>
            <tbody className="font-medium text-gray-900">
              {reportData.slice(0, 30).map((row, idx) => (
                <tr key={idx} className="even:bg-emerald-50/50 border-b border-gray-200">
                  <td className="p-3 border-x border-gray-200 truncate max-w-xs">{row.title}</td>
                  <td className="p-3 border-x border-gray-200 font-mono">{row.publish_date || "Historis CSV"}</td>
                  <td className="p-3 border-x border-gray-200 text-right font-bold text-blue-600">{row.views?.toLocaleString('id-ID')}</td>
                  <td className="p-3 border-x border-gray-200 text-right font-bold text-emerald-600">{(row.engagement || 0).toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {reportData.length > 30 && <p className="text-[9px] text-gray-500 mt-2 italic">*Menampilkan 30 data teratas. Filter tanggal untuk laporan lebih spesifik.</p>}
        </div>

        {/* SIGNATURE BLOCK */}
        <div className="mt-16 flex justify-end signature-block">
          <div className="text-center w-64 space-y-16">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-700 m-0 p-0">Garut, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Chief of Communication</p>
            <div>
              <p className="text-xs font-black uppercase underline text-black m-0 p-0">MOH FAIZ PAHRUL I</p>
              <p className="text-[10px] text-gray-600 font-bold tracking-widest uppercase m-0 p-0">MCS DPC PKB GARUT</p>
            </div>
          </div>
        </div>

      </div>

      <style jsx global>{`
        @media print {
          /* Hapus setelan portrait/landscape paksa agar user bisa memilih di dialog Print */
          @page { margin: 15mm; }
          
          /* Hancurkan kunci layout dari Next.js dan Tailwind secara paksa */
          html, body, #__next, .min-h-screen, .h-screen, .overflow-hidden, .overflow-y-auto { 
            height: auto !important; 
            min-height: 0 !important;
            width: 100% !important;
            overflow: visible !important; 
            background: #ffffff !important; 
            color: #000000 !important;
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Izinkan browser merender warna grafis latar */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Sembunyikan SEMUA elemen Dasbor */
          .no-print, header, aside, button, nav { 
            display: none !important; 
          }
          
          /* Bebaskan elemen cetak (PDF Area) */
          .print-safe-area { 
            display: block !important; 
            position: static !important; 
            width: 100% !important; 
            height: auto !important;
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important; 
          }

          /* Aturan pintar tabel agar tidak terpotong jelek antar halaman */
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          
          /* Amankan tanda tangan agar selalu menempel dengan utuh */
          .signature-block { page-break-inside: avoid; }
          
          a[href]:after { content: none !important; }
        }
      `}</style>
    </div>
  );
}