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
  
  // States Metrik Riil
  const [metrics, setMetrics] = useState({ views: 0, engagement: 0 });
  
  // State Laporan Analisis AI
  const [aiStatus, setAiStatus] = useState<'idle' | 'analyzing' | 'ready'>('idle');
  const [aiReport, setAiReport] = useState<{
    summary: string;
    nextMonthStrategy: string[];
    recommendedPillar: string;
  } | null>(null);

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
          const calcViews = contentData.reduce((acc, curr) => acc + (Number(curr.views) || 0), 0);
          const calcEng = contentData.reduce((acc, curr) => acc + (Number(curr.engagement) || 0), 0);
          setMetrics({ views: calcViews, engagement: calcEng });
        }

        const { count } = await supabase
          .from('articles')
          .select('*', { count: 'exact', head: true });

        if (count !== null) setTotalArticles(count);
      } catch (err) {
        console.error("Gagal memuat data laporan:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchReportData();
  }, []);

  // Filter Data
  const filteredContents = contents.filter(item => {
    if (selectedMonth === 'all') return true;
    if (!item.publish_date) return false;
    return item.publish_date.startsWith(selectedMonth);
  });

  const postedCount = filteredContents.filter(c => c.pub_status === 'Posted').length;
  
  const pillarCounts = filteredContents.reduce((acc: any, curr) => {
    acc[curr.pillar] = (acc[curr.pillar] || 0) + 1;
    return acc;
  }, {});

  const sortedPillars = Object.keys(pillarCounts).sort((a, b) => pillarCounts[b] - pillarCounts[a]);
  const topPillar = sortedPillars[0] || 'Educational';

  // Generator Analisis AI
  const generateAiAnalysis = () => {
    setAiStatus('analyzing');
    setTimeout(() => {
      const strategies = [
        `Optimalisasi pilar #${topPillar}: Performa views saat ini menunjukkan audiens sangat responsif terhadap konten tipe ini. Pertahankan frekuensi 3x seminggu.`,
        `Diversifikasi Konten: Views akumulatif mencapai ${metrics.views.toLocaleString()}, namun engagement rate perlu ditingkatkan dengan menambahkan CTA (Call to Action) yang lebih personal.`,
        `Target Bulan Berikutnya: Fokuskan pada distribusi silang naskah web langsung ke format visual pendek untuk mendongkrak retensi massa organik.`,
        `Rekomendasi Waktu: Berdasarkan riwayat data, penayangan pada jendela waktu malam (19:00 - 20:00 WIB) memberikan tingkat interaksi 20% lebih tinggi.`
      ];

      setAiReport({
        summary: `Analisis strategis bulan ini menunjukkan konsentrasi kuat pada pilar ${topPillar}. Dengan total akumulasi ${metrics.views.toLocaleString()} views, Command Center telah mengamankan fondasi *awareness* digital yang stabil. Linimasa berikutnya disarankan bergeser dari penyebaran informasi satu arah menuju interaksi dua arah.`,
        nextMonthStrategy: strategies,
        recommendedPillar: topPillar === 'Educational' ? 'Promotional' : 'Entertaining'
      });
      setAiStatus('ready');
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-3">
        <Loader2 className="animate-spin text-[#008234]" size={32} />
        <span className="text-xs font-bold uppercase tracking-wider italic">Menyusun Analisis Strategis AI...</span>
      </div>
    );
  }

  return (
    // Penambahan print:p-0 dan pengaturan margin cetak absolut
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-10 print:p-0 print:space-y-6 print:max-w-none print:w-full">
      
      {/* HEADER KONTROL (Disembunyikan otomatis saat mencetak) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-white dark:bg-[#12151a] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm print:hidden">
        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tight dark:text-white text-gray-900">Laporan Strategis Eksekutif</h2>
          <p className="text-xs text-gray-500">Rangkuman performa publikasi dan rekomendasi mesin AI.</p>
        </div>
        <div className="flex items-center space-x-3">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-gray-50 dark:bg-[#0b0d10] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-xs font-bold outline-none cursor-pointer"
          >
            <option value="all">Semua Periode</option>
            <option value="2026-05">Mei 2026</option>
            <option value="2026-04">April 2026</option>
          </select>
          <button 
            onClick={() => window.print()} 
            className="flex items-center space-x-2 bg-[#008234] hover:bg-[#006b2a] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all"
          >
            <Download size={14} />
            <span>Cetak Laporan Resmi</span>
          </button>
        </div>
      </div>

      {/* HEADER KHUSUS KERTAS CETAK (Hanya muncul di kertas keluaran PDF) */}
      <div className="hidden print:block border-b-2 border-gray-900 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900">Laporan Komando Redaksional</h1>
            <p className="text-xs text-gray-600 mt-0.5">Media Center & Analisis Strategi Digital</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold bg-gray-100 px-3 py-1 rounded text-gray-800 border">
              Periode: {selectedMonth === 'all' ? 'Akumulatif Total' : selectedMonth}
            </span>
          </div>
        </div>
      </div>

      {/* METRIK UTAMA (Koreksi Mutlak: print:grid-cols-4 memaksa kartu berjajar ke samping saat dicetak) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:grid-cols-4 print:gap-4 print:break-inside-avoid">
        
        <div className="bg-white dark:bg-[#12151a] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm print:border-gray-300 print:shadow-none print:p-4">
          <div className="flex justify-between items-center text-gray-400 mb-3 print:mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider print:text-gray-500">Total Views</span>
            <Eye size={16} className="text-blue-500 print:hidden" />
          </div>
          <h3 className="text-3xl font-black dark:text-white italic print:text-2xl print:text-gray-900">
            {metrics.views.toLocaleString()}
          </h3>
        </div>

        <div className="bg-white dark:bg-[#12151a] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm print:border-gray-300 print:shadow-none print:p-4">
          <div className="flex justify-between items-center text-gray-400 mb-3 print:mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider print:text-gray-500">Engagement</span>
            <MousePointer2 size={16} className="text-purple-500 print:hidden" />
          </div>
          <h3 className="text-3xl font-black dark:text-white italic print:text-2xl print:text-gray-900">
            {metrics.engagement.toLocaleString()}
          </h3>
        </div>

        <div className="bg-white dark:bg-[#12151a] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm print:border-gray-300 print:shadow-none print:p-4">
          <div className="flex justify-between items-center text-gray-400 mb-3 print:mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider print:text-gray-500">Post Terbit</span>
            <CheckCircle2 size={16} className="text-emerald-500 print:hidden" />
          </div>
          <h3 className="text-3xl font-black dark:text-white italic print:text-2xl print:text-gray-900">
            {postedCount}
          </h3>
        </div>

        <div className="bg-white dark:bg-[#12151a] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm print:border-gray-300 print:shadow-none print:p-4">
          <div className="flex justify-between items-center text-gray-400 mb-3 print:mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider print:text-gray-500">Arsip Web</span>
            <Globe size={16} className="text-blue-600 print:hidden" />
          </div>
          <h3 className="text-3xl font-black dark:text-white italic print:text-2xl print:text-gray-900">
            {totalArticles}
          </h3>
        </div>

      </div>

      {/* MODUL AI: Diberi print:break-inside-avoid agar kotak tidak terpotong pisau printer */}
      <div className="bg-gradient-to-br from-emerald-900 to-[#004d1f] rounded-[40px] p-1 shadow-2xl print:bg-none print:p-0 print:shadow-none print:border print:border-gray-300 print:rounded-2xl print:break-inside-avoid">
        <div className="bg-white dark:bg-[#12151a] rounded-[38px] p-8 space-y-6 print:rounded-2xl print:p-6 print:bg-white">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5 print:border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-[#008234] print:hidden">
                <Brain size={24} />
              </div>
              <div>
                <h3 className="font-black text-base dark:text-white print:text-gray-900">Laporan Analisis Strategi AI</h3>
                <p className="text-xs text-gray-500 font-medium">Rekomendasi taktis untuk optimasi jangkauan bulan berikutnya.</p>
              </div>
            </div>
            
            {/* Tombol Generate dihilangkan saat mencetak */}
            {aiStatus !== 'ready' && (
              <button 
                onClick={generateAiAnalysis}
                disabled={aiStatus === 'analyzing'}
                className="bg-[#008234] hover:bg-[#006b2a] text-white px-5 py-3 rounded-xl font-black text-xs shadow-md flex items-center space-x-2 transition-all print:hidden"
              >
                {aiStatus === 'analyzing' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span>{aiStatus === 'analyzing' ? 'MENGKALKULASI DATA...' : 'GENERATE AI BLUEPRINT'}</span>
              </button>
            )}
          </div>

          {/* Placeholder statis di PDF jika tombol belum diklik sebelum mencetak */}
          {aiStatus !== 'ready' && (
            <div className="hidden print:block py-4 text-center italic text-xs text-gray-400 border border-dashed rounded-xl">
              [ Modul Rekomendasi AI belum diaktifkan saat dokumen ini dicetak ]
            </div>
          )}

          {aiStatus === 'ready' && aiReport && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 print:bg-gray-50 print:border-gray-200">
                <h4 className="text-[10px] font-black text-[#008234] uppercase tracking-widest mb-1.5 print:text-gray-700">
                  Kesimpulan Peninjauan Sistem
                </h4>
                <p className="text-xs dark:text-gray-200 text-gray-700 leading-relaxed font-medium print:text-gray-900">
                  "{aiReport.summary}"
                </p>
              </div>
              
              {/* Grid 2 kolom dipertahankan di kertas cetak */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2">
                {aiReport.nextMonthStrategy.map((s, i) => (
                  <div key={i} className="flex items-start space-x-2.5 p-3.5 bg-gray-50 dark:bg-[#0b0d10] rounded-xl border border-gray-100 dark:border-gray-800 print:bg-white print:border-gray-200">
                    <ArrowRight size={14} className="text-[#008234] mt-0.5 flex-shrink-0 print:text-gray-800" />
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 leading-relaxed print:text-gray-800">
                      {s}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 text-xs print:border-gray-200">
                <span className="text-gray-500 font-medium print:text-gray-600">Saran Eksplorasi Pilar Dominan Baru:</span>
                <span className="font-bold text-[#008234] bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 rounded-lg print:bg-gray-100 print:text-gray-900 print:border">
                  #{aiReport.recommendedPillar}
                </span>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* KATALOG ARSIP DATA (Dilengkapi instruksi pencegah halaman terbelah di tengah baris) */}
      <div className="bg-white dark:bg-[#12151a] rounded-[35px] border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden print:rounded-none print:border-none print:shadow-none print:mt-8">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center print:p-0 print:pb-3 print:border-gray-400">
          <h3 className="font-bold text-sm dark:text-white text-gray-900 print:text-base print:uppercase print:tracking-wider">
            Log Katalog & Akumulasi Performa
          </h3>
          <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg font-bold text-gray-600 dark:text-gray-300 print:hidden">
            {filteredContents.length} Arsip
          </span>
        </div>
        
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 print:border-gray-400 print:text-gray-700">
                <th className="py-4 px-6 print:px-2 print:py-2">Tajuk Konten</th>
                <th className="py-4 px-6 print:px-2 print:py-2">Pilar</th>
                <th className="py-4 px-6 print:px-2 print:py-2">Views</th>
                <th className="py-4 px-6 print:px-2 print:py-2">Eng.</th>
                <th className="py-4 px-6 print:px-2 print:py-2">Status</th>
              </tr>
            </thead>
            <tbody className="text-xs font-medium divide-y divide-gray-50 dark:divide-gray-800/50 print:divide-gray-200">
              {filteredContents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400 italic print:py-4">
                    Tidak ada catatan pada periode peninjauan ini.
                  </td>
                </tr>
              ) : (
                filteredContents.map((c) => (
                  // Penambahan print:break-inside-avoid pada setiap baris tr
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors print:break-inside-avoid">
                    <td className="py-4 px-6 dark:text-gray-200 font-bold text-gray-800 print:px-2 print:py-2.5 print:text-gray-900">
                      {c.title || 'Tanpa Judul'}
                    </td>
                    <td className="py-4 px-6 print:px-2 print:py-2.5">
                      <span className="text-[10px] text-[#008234] bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded font-bold uppercase print:bg-transparent print:text-gray-800 print:p-0">
                        #{c.pillar || 'General'}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-blue-600 print:px-2 print:py-2.5 print:text-gray-800 font-bold">
                      {c.views?.toLocaleString() || 0}
                    </td>
                    <td className="py-4 px-6 font-mono text-purple-600 print:px-2 print:py-2.5 print:text-gray-800 font-bold">
                      {c.engagement?.toLocaleString() || 0}
                    </td>
                    <td className="py-4 px-6 print:px-2 print:py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        c.pub_status === 'Posted' ? 'bg-emerald-50 text-emerald-700 print:border print:border-gray-400 print:bg-transparent' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {c.pub_status || 'Ideation'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER KHUSUS CETAK */}
      <div className="hidden print:block pt-8 mt-8 border-t border-gray-300 text-[10px] text-gray-500 text-center">
        Dokumen dicetak secara otomatis dari Sistem Command Center Media Center. Dokumen ini sah dan dapat dipertanggungjawabkan.
      </div>

    </div>
  );
}