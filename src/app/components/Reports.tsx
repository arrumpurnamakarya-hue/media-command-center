"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  FileText, Download, Filter, CheckCircle2, 
  Loader2, Sparkles, Globe, Brain, ArrowRight, Eye, MousePointer2
} from 'lucide-react';

interface ContentItem {
  id: string;
  title: string;
  pillar: string;
  publish_date: string;
  prod_status: string;
  pub_status: string;
  views?: number;
  engagement?: number;
}

export default function Reports() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [totalArticles, setTotalArticles] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('all');
  
  const [metrics, setMetrics] = useState({ views: 0, engagement: 0 });
  const [aiStatus, setAiStatus] = useState<'idle' | 'analyzing' | 'ready'>('idle');
  const [aiReport, setAiReport] = useState<{
    summary: string;
    nextMonthStrategy: string[];
    recommendedPillar: string;
  } | null>(null);

  // 1. Generator Daftar Bulan 2026 - 2031
  const generatePeriods = () => {
    const years = [2026, 2027, 2028, 2029, 2030, 2031];
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    return years.map(year => ({
      year,
      months: monthNames.map((name, index) => ({
        label: `${name} ${year}`,
        value: `${year}-${String(index + 1).padStart(2, '0')}`
      }))
    }));
  };

  const periods = generatePeriods();

  useEffect(() => {
    async function fetchReportData() {
      setLoading(true);
      try {
        const { data: contentData } = await supabase
          .from('contents')
          .select('*')
          .order('publish_date', { ascending: false });

        if (contentData) {
          setContents(contentData);
        }

        const { count } = await supabase
          .from('articles')
          .select('*', { count: 'exact', head: true });

        if (count !== null) setTotalArticles(count);
      } catch (err) {
        console.error("Error fetching reports:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReportData();
  }, []);

  // Logika Filtering & Akumulasi Metrik Berdasarkan Pilihan
  const filteredContents = contents.filter(item => {
    if (selectedMonth === 'all') return true;
    return item.publish_date?.startsWith(selectedMonth);
  });

  useEffect(() => {
    const calcViews = filteredContents.reduce((acc, curr) => acc + (Number(curr.views) || 0), 0);
    const calcEng = filteredContents.reduce((acc, curr) => acc + (Number(curr.engagement) || 0), 0);
    setMetrics({ views: calcViews, engagement: calcEng });
    setAiStatus('idle'); // Reset AI jika filter berubah
  }, [selectedMonth, contents]);

  const postedCount = filteredContents.filter(c => c.pub_status === 'Posted').length;
  
  const generateAiAnalysis = () => {
    setAiStatus('analyzing');
    setTimeout(() => {
      setAiReport({
        summary: `Analisis strategis menunjukkan performa stabil pada periode ini. Dengan akumulasi ${metrics.views.toLocaleString()} views, fokus berikutnya adalah konversi interaksi.`,
        nextMonthStrategy: [
          "Optimalkan konten video pendek untuk meningkatkan jangkauan.",
          "Gunakan data jam tayang terpopuler untuk rilis naskah utama.",
          "Perkuat pilar edukasi untuk meningkatkan loyalitas audiens."
        ],
        recommendedPillar: "Informative"
      });
      setAiStatus('ready');
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-10 print:p-0 print:space-y-6">
      
      {/* HEADER CONTROL DENGAN DROPDOWN DINAMIS */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-white dark:bg-[#12151a] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm print:hidden">
        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tight dark:text-white text-gray-900">Laporan Strategis Eksekutif</h2>
          <p className="text-xs text-gray-500 font-bold">Periode: {selectedMonth === 'all' ? 'Semua Waktu' : selectedMonth}</p>
        </div>
        <div className="flex items-center space-x-3">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-gray-50 dark:bg-[#0b0d10] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-xs font-black outline-none cursor-pointer text-gray-700 dark:text-white focus:border-[#008234]"
          >
            <option value="all">Semua Periode</option>
            {periods.map(group => (
              <optgroup key={group.year} label={`TAHUN ${group.year}`}>
                {group.months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <button onClick={() => window.print()} className="flex items-center space-x-2 bg-[#008234] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm"><Download size={14} /><span>Cetak Laporan Resmi</span></button>
        </div>
      </div>

      <div className="hidden print:block border-b-2 border-gray-900 pb-4 mb-6">
        <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900">Laporan Komando Redaksional</h1>
        <p className="text-xs text-gray-600">Periode Laporan: {selectedMonth}</p>
      </div>

      {/* METRIK UTAMA */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:grid-cols-4 print:gap-4">
        <div className="bg-white dark:bg-[#12151a] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex justify-between items-center text-gray-400 mb-3"><span className="text-[10px] font-black uppercase">Total Views</span><Eye size={16} className="text-blue-500" /></div>
          <h3 className="text-3xl font-black dark:text-white italic">{metrics.views.toLocaleString()}</h3>
        </div>
        <div className="bg-white dark:bg-[#12151a] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex justify-between items-center text-gray-400 mb-3"><span className="text-[10px] font-black uppercase">Engagement</span><MousePointer2 size={16} className="text-purple-500" /></div>
          <h3 className="text-3xl font-black dark:text-white italic">{metrics.engagement.toLocaleString()}</h3>
        </div>
        <div className="bg-white dark:bg-[#12151a] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex justify-between items-center text-gray-400 mb-3"><span className="text-[10px] font-black uppercase">Post Terbit</span><CheckCircle2 size={16} className="text-emerald-500" /></div>
          <h3 className="text-3xl font-black dark:text-white italic">{postedCount}</h3>
        </div>
        <div className="bg-white dark:bg-[#12151a] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex justify-between items-center text-gray-400 mb-3"><span className="text-[10px] font-black uppercase">Arsip Web</span><Globe size={16} className="text-blue-600" /></div>
          <h3 className="text-3xl font-black dark:text-white italic">{totalArticles}</h3>
        </div>
      </div>

      {/* MODUL AI */}
      <div className="bg-gradient-to-br from-[#008234] to-[#004d1f] rounded-[40px] p-1 shadow-2xl print:hidden">
        <div className="bg-white dark:bg-[#12151a] rounded-[38px] p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 dark:border-gray-800 pb-5">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-[#008234]"><Brain size={24} /></div>
              <div>
                <h3 className="font-black text-base dark:text-white uppercase tracking-tight">Laporan Analisis Strategi AI</h3>
                <p className="text-xs text-gray-500 font-medium">Berdasarkan data filter yang dipilih saat ini.</p>
              </div>
            </div>
            {aiStatus !== 'ready' && (
              <button 
                onClick={generateAiAnalysis}
                disabled={aiStatus === 'analyzing'}
                className="bg-[#008234] text-white px-5 py-3 rounded-xl font-black text-xs shadow-md flex items-center space-x-2 transition-all active:scale-95"
              >
                {aiStatus === 'analyzing' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span>{aiStatus === 'analyzing' ? 'ANALYZING...' : 'GENERATE AI BLUEPRINT'}</span>
              </button>
            )}
          </div>

          {aiStatus === 'ready' && aiReport && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                <h4 className="text-[10px] font-black text-[#008234] uppercase tracking-widest mb-1.5">Executive Summary</h4>
                <p className="text-xs dark:text-gray-200 text-gray-700 leading-relaxed font-bold italic">"{aiReport.summary}"</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {aiReport.nextMonthStrategy.map((s, i) => (
                  <div key={i} className="flex items-start space-x-2.5 p-3.5 bg-gray-50 dark:bg-[#0b0d10] rounded-xl border border-gray-100 dark:border-gray-800">
                    <ArrowRight size={14} className="text-[#008234] mt-0.5 flex-shrink-0" />
                    <p className="text-xs font-bold text-gray-600 dark:text-gray-300">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KATALOG DATA */}
      <div className="bg-white dark:bg-[#12151a] rounded-[35px] border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h3 className="font-bold text-xs dark:text-white uppercase tracking-wider">Log Katalog & Akumulasi Performa</h3>
          <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg font-bold text-gray-500">{filteredContents.length} Arsip</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] text-gray-400 uppercase border-b border-gray-100 dark:border-gray-800">
                <th className="py-4 px-6">Tajuk Konten</th>
                <th className="py-4 px-6">Pilar</th>
                <th className="py-4 px-6">Views</th>
                <th className="py-4 px-6">Eng.</th>
                <th className="py-4 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="text-xs font-bold divide-y divide-gray-50 dark:divide-gray-800/50">
              {filteredContents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400 italic">Tidak ada data untuk periode ini.</td>
                </tr>
              ) : (
                filteredContents.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="py-4 px-6 dark:text-gray-200">{c.title}</td>
                    <td className="py-4 px-6"><span className="text-[9px] text-[#008234] bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded font-black uppercase">#{c.pillar}</span></td>
                    <td className="py-4 px-6 font-mono text-blue-600">{c.views?.toLocaleString() || 0}</td>
                    <td className="py-4 px-6 font-mono text-purple-600">{c.engagement?.toLocaleString() || 0}</td>
                    <td className="py-4 px-6"><span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-50 text-emerald-700">{c.pub_status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}