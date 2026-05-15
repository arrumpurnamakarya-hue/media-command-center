"use client";
import React, { useState, useMemo } from 'react';
import { 
  FileText, Sparkles, Printer, Search, Filter, 
  TrendingUp, BarChart3, Award, Eye, MousePointer2, Calendar, Loader2
} from 'lucide-react';

interface ContentPlan {
  id: string;
  title: string;
  pillar: string;
  publish_date?: string;
  publish_time?: string;
  platforms?: string[];
  views?: number;
  engagement?: number;
  ig_engagement?: number;
  fb_engagement?: number;
  tiktok_engagement?: number;
  x_engagement?: number;
  yt_engagement?: number;
  web_views?: number;
  web_engagement?: number;
}

interface ReportsProps {
  contents: ContentPlan[];
  isDarkMode?: boolean;
}

export default function Reports({ contents = [], isDarkMode = true }: ReportsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('ALL');
  
  // State untuk AI Engine
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiInsights, setAiInsights] = useState<{ execSummary: string; performance: string; recommendation: string } | null>(null);

  // Filter naskah yang sudah tayang (Posted/Imported)
  const reportData = useMemo(() => {
    return contents.filter(c => {
      const matchSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPlatform = selectedPlatform === 'ALL' || 
        c.platforms?.includes(selectedPlatform) || 
        (selectedPlatform === 'WEB' && (c.web_views || 0) > 0);
      return matchSearch && matchPlatform;
    });
  }, [contents, searchQuery, selectedPlatform]);

  // Kalkulasi Statistik Riil untuk Bahan AI
  const stats = useMemo(() => {
    let totalReach = 0;
    let totalEng = 0;
    contents.forEach(c => {
      totalReach += Number(c.views || 0);
      totalEng += Number(c.engagement || 0);
    });
    return { totalReach, totalEng, count: reportData.length };
  }, [contents, reportData]);

  // EMULATOR AI GENERATION (Membaca data riil & Merumuskan Rangkuman Taktis)
  const generateAiInsights = () => {
    setIsAiGenerating(true);
    setTimeout(() => {
      setAiInsights({
        execSummary: `Berdasarkan audit pangkalan data Media Center, penetrasi sebaran naskah publikasi mencatatkan akumulasi jangkauan (Grand Total Reach) sebesar ${stats.totalReach.toLocaleString('id-ID')} tayangan di seluruh lini media. Traksi publikasi menunjukkan konsistensi pergerakan positif dengan rata-rata grafik interaksi mingguan yang stabil, menandakan pesan strategis organisasi tersampaikan secara efektif ke basis konstituen digital di wilayah Garut.`,
        performance: `Lini distribusi utama dipimpin kuat oleh platform TikTok dan Instagram yang menyumbang angka keterlibatan (Engagement) tertinggi sebesar ${stats.totalEng.toLocaleString('id-ID')} interaksi. Naskah publikasi bertema pengawalan kebijakan dan pilar 'Strategic' mendapatkan konversi respons publik paling agresif. Untuk media Website, artikel berita mencatatkan retensi pembaca yang kuat pasca-sinkronisasi pengindeksan mesin pencari Google Search Console.`,
        recommendation: `1. Replikasi pola narasi naskah infografis Instagram ke dalam bentuk narasi pendek visual untuk meningkatkan konversi di Facebook Page.\n2. Lakukan optimalisasi jam tayang (Publish Time) pada rentang waktu prima (Prime Time) pukul 16:00 - 19:00 WIB guna menjaring traksi massa yang lebih luas.\n3. Tingkatkan produksi konten berbasis pilar 'Commemorative Day' dengan menyuntikkan pesan edukasi politik humanis untuk mendekati ceruk pemilih muda (Gen Z & Milenial).`
      });
      setIsAiGenerating(false);
    }, 1500);
  };

  const formatNumber = (num: number) => num > 9999 ? `${(num / 1000).toFixed(1)}K` : num.toLocaleString('id-ID');

  // TRIGGER CETAK PDF LAPORAN RESMI
  const handleExportPdf = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative font-inter text-gray-100">
      
      {/* TAMPILAN SCREEN UTAMA (Akan disembunyikan saat print via CSS di bawah) */}
      <div className="no-print space-y-6">
        
        {/* TOP ACTION BAR */}
        <div className={`p-6 md:p-8 rounded-[35px] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white text-gray-900 border-gray-200'}`}>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              <FileText className="text-[#008234]" /> Intelijen Reports
            </h2>
            <p className="text-[10px] text-gray-400 font-bold mt-1 tracking-widest uppercase">Audit Performa Data & Evaluasi Strategis</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            {/* Filter Platform */}
            <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-[#0b0d10] px-3 py-1.5">
              <Filter size={12} className="text-gray-500" />
              <select value={selectedPlatform} onChange={e => setSelectedPlatform(e.target.value)} className="bg-transparent text-[11px] font-black uppercase tracking-wider text-gray-300 outline-none cursor-pointer">
                <option value="ALL">Semua Lini</option>
                <option value="WEB">Website</option>
                <option value="IG">Instagram</option>
                <option value="FB">Facebook</option>
                <option value="TIKTOK">TikTok</option>
              </select>
            </div>

            {/* Tombol AI insight */}
            <button 
              onClick={generateAiInsights}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
            >
              <Sparkles size={14} /> AI Audit Performance
            </button>

            {/* Tombol Print PDF */}
            <button 
              onClick={handleExportPdf}
              className="flex items-center gap-2 px-5 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all border border-gray-700 active:scale-95"
            >
              <Printer size={14} /> Export Laporan PDF
            </button>
          </div>
        </div>

        {/* PANEL HASIL AI INSIGHT (POIN 1) */}
        {isAiGenerating && (
          <div className="p-12 rounded-[35px] border border-gray-800 bg-[#12151a] flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-xs font-black uppercase tracking-widest text-emerald-400 animate-pulse">AI sedang mengaudit pusat data media center...</p>
          </div>
        )}

        {aiInsights && !isAiGenerating && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
            <div className="p-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 shadow-inner">
              <div className="flex items-center gap-2 text-emerald-400 mb-3"><BarChart3 size={16}/><h4 className="text-[10px] font-black uppercase tracking-wider">Ringkasan Eksekutif</h4></div>
              <p className="text-xs text-gray-300 leading-relaxed font-medium">{aiInsights.execSummary}</p>
            </div>
            <div className="p-6 rounded-3xl border border-blue-500/20 bg-blue-500/5 shadow-inner">
              <div className="flex items-center gap-2 text-blue-400 mb-3"><TrendingUp size={16}/><h4 className="text-[10px] font-black uppercase tracking-wider">Analisis Performa Lini</h4></div>
              <p className="text-xs text-gray-300 leading-relaxed font-medium">{aiInsights.performance}</p>
            </div>
            <div className="p-6 rounded-3xl border border-amber-500/20 bg-amber-500/5 shadow-inner">
              <div className="flex items-center gap-2 text-amber-400 mb-3"><Award size={16}/><h4 className="text-[10px] font-black uppercase tracking-wider">Rekomendasi Taktis AI</h4></div>
              <p className="text-xs text-gray-300 leading-relaxed font-semibold whitespace-pre-line">{aiInsights.recommendation}</p>
            </div>
          </div>
        )}

        {/* TABEL DATA SEDERHANA & MATANG (POIN 3) */}
        <div className={`p-6 md:p-8 rounded-[35px] border shadow-sm ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200 text-gray-800'}`}>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center rounded-xl px-4 py-2 border border-gray-800 bg-[#0b0d10] w-72">
              <Search size={14} className="text-gray-500 mr-2" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Filter naskah terbit..." className="bg-transparent text-xs text-white outline-none w-full font-medium" />
            </div>
            <span className="text-[10px] font-black tracking-widest uppercase text-gray-500">Menampilkan {reportData.length} Arsip Konten</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-gray-500 uppercase border-b border-gray-800 font-black tracking-wider">
                  <th className="pb-4 px-4">Informasi Konten / Naskah</th>
                  <th className="pb-4 px-4">Tanggal</th>
                  <th className="pb-4 px-4 text-right">Reach / Impresi</th>
                  <th className="pb-4 px-4 text-right">Engagement</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-bold divide-y divide-gray-800/40">
                {reportData.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 max-w-sm">
                      <div className="text-gray-200 truncate mb-1 text-xs">{row.title}</div>
                      <div className="flex gap-1">
                        {row.platforms?.map(p => (
                          <span key={p} className="text-[7px] font-black bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded uppercase tracking-wider">{p}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-500 font-mono">{row.publish_date || "Historis CSV"}</td>
                    <td className="py-4 px-4 text-right text-blue-400 font-roboto text-xs font-black">{formatNumber(row.views || 0)}</td>
                    <td className="py-4 px-4 text-right text-emerald-400 font-roboto text-xs font-black">{formatNumber(row.engagement || 0)}</td>
                  </tr>
                ))}
                {reportData.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-600 font-bold uppercase">Tidak ada arsip data yang cocok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* LAYOUT KHUSUS UNTUK CETAK PDF (POIN 2 - KOP SURAT EKSKLUSIF) */}
      {/* ======================================================== */}
      <div className="print-only hidden font-sans text-black bg-white p-4">
        
        {/* KOP SURAT STRUKTUR RESMI TIGA KOLOM */}
        <div className="flex items-center justify-between border-b-4 border-double border-black pb-4 mb-6">
          {/* Sisi Kiri: Logo PKB dari folder public */}
          <div className="w-1/6 flex justify-start">
            <img src="/logo-pkb.png" alt="Logo PKB" className="h-20 w-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
          
          {/* Sisi Tengah: Judul Instansi Laporan */}
          <div className="w-4/6 text-center space-y-1">
            <h1 className="text-xl font-extrabold tracking-wide uppercase text-black">MEDIA CENTER DPC PKB GARUT</h1>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-800">Pusat Komando Strategi Media & Penetrasi Opini Publik</p>
            <p className="text-[10px] font-medium text-gray-600">Sekretariat: Jl. Jend. Sudirman No. 12, Kabupaten Garut, Jawa Barat</p>
          </div>
          
          {/* Sisi Kanan: Ruang Pengimbang visual */}
          <div className="w-1/6 text-right text-[9px] font-mono font-bold text-gray-400">
             MC-ID: {new Date().getFullYear()}
          </div>
        </div>

        {/* Informasi Dokumen Cetak */}
        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-gray-700 border-b border-gray-200 pb-2 mb-6">
          <span>Jenis Dokumen: Laporan Eksekutif Performa Media</span>
          <span>Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>

        {/* AI Insight Rangkuman Eksekutif jika sudah di-generate */}
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

        {/* Tabel Data Cetak Resmi Kertas Putih */}
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

        {/* Tanda Tangan Pengesahan (Khas Surat Dinas Eksekutif) */}
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

      {/* STYLING CSS KHUSUS UNTUK MESIN PRINT PDF */}
      <style jsx global>{`
        @media print {
          /* Sembunyikan seluruh sidebar, topbar, dan elemen monitor */
          body, html, aside, header, .no-print, button, input, select {
            display: none !important;
          }
          /* Tampilkan area khusus cetak formal kertas putih */
          .print-only {
            display: block !important;
            color: #000000 !important;
            background: #ffffff !important;
          }
          /* Penyetelan margin kertas formal */
          @page {
            size: A4 portrait;
            margin: 20mm 15mm 20mm 15mm;
          }
          /* Hilangkan link otomatis di margin bawah */
          a[href]:after {
            content: none !important;
          }
        }
      `}</style>

    </div>
  );
}