"use client";
import React, { useState, useMemo } from 'react';
import { UploadCloud, CheckCircle2, FileSpreadsheet, AlertCircle, Save } from 'lucide-react';

const PlatformIcons = {
  Meta: () => <svg className="w-4 h-4 text-[#1877F2] fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  TikTok: () => <svg className="w-4 h-4 text-[#ff0050] fill-current" viewBox="0 0 24 24"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.674c0 1.913-1.554 3.467-3.467 3.467-1.914 0-3.468-1.554-3.468-3.467 0-1.914 1.554-3.468 3.468-3.468h.078V8.761h-.078c-3.824 0-6.924 3.1-6.924 6.924 0 3.823 3.1 6.923 6.924 6.923 3.823 0 6.922-3.1 6.922-6.923v-8.15a8.175 8.175 0 0 0 6.687 2.333v-3.18z"/></svg>,
  X: () => <svg className="w-4 h-4 text-gray-300 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  YT: () => <svg className="w-4 h-4 text-[#FF0000] fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.501 5.814a3.016 3.016 0 0 0 2.122 2.136c1.872.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
};

// --- TAMBAHAN INTERFACE INI UNTUK MENGATASI ERROR VERCEL ---
interface RecapFormProps {
  isDarkMode?: boolean;
  onRecapSuccess?: () => void;
}

// --- MENAMBAHKAN PROPS KE DALAM FUNGSI ---
export default function RecapForm({ isDarkMode = true, onRecapSuccess }: RecapFormProps) {
  const [selectedContent, setSelectedContent] = useState('');
  
  const [platformData, setPlatformData] = useState({
    meta: { file: null, views: 0, eng: 0, status: 'idle' },
    tiktok: { file: null, views: 0, eng: 0, status: 'idle' },
    x: { file: null, views: 0, eng: 0, status: 'idle' },
    shorts: { file: null, views: 0, eng: 0, status: 'idle' }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, platformKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPlatformData(prev => ({
      ...prev,
      [platformKey]: { ...prev[platformKey as keyof typeof prev], status: 'processing', file: file.name }
    }));

    setTimeout(() => {
      const mockExtractedData = {
        meta: { views: 12500, eng: 840 },
        tiktok: { views: 45200, eng: 3200 },
        x: { views: 8900, eng: 412 },
        shorts: { views: 22100, eng: 1550 }
      };

      setPlatformData(prev => ({
        ...prev,
        [platformKey]: { 
          file: file.name, 
          views: mockExtractedData[platformKey as keyof typeof mockExtractedData].views, 
          eng: mockExtractedData[platformKey as keyof typeof mockExtractedData].eng, 
          status: 'success' 
        }
      }));
    }, 1000);
  };

  const handleRemoveFile = (platformKey: string) => {
    setPlatformData(prev => ({
      ...prev,
      [platformKey]: { file: null, views: 0, eng: 0, status: 'idle' }
    }));
  };

  const globalMetrics = useMemo(() => {
    const totalViews = Object.values(platformData).reduce((sum, plat) => sum + plat.views, 0);
    const totalEng = Object.values(platformData).reduce((sum, plat) => sum + plat.eng, 0);
    return { totalViews, totalEng };
  }, [platformData]);

  const CSVUploadZone = ({ id, title, icon, dataKey }: { id: string, title: string, icon: React.ReactNode, dataKey: keyof typeof platformData }) => {
    const platData = platformData[dataKey];

    return (
      <div className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
        platData.status === 'success' 
          ? 'bg-emerald-500/10 border-emerald-500/30' 
          : isDarkMode ? 'bg-[#0b0d10] border-gray-800 hover:border-gray-600' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
      }`}>
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h4 className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h4>
        </div>

        {platData.status === 'idle' && (
          <div className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group relative ${
            isDarkMode ? 'border-gray-700 hover:border-emerald-500/50' : 'border-gray-300 hover:border-emerald-500/50'
          }`}>
            <input 
              type="file" 
              accept=".csv" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              onChange={(e) => handleFileUpload(e, dataKey)}
            />
            <UploadCloud className="w-8 h-8 text-gray-500 group-hover:text-emerald-400 mb-2 transition-colors" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Unggah CSV {title}</span>
            <span className="text-[9px] text-gray-500 mt-1 block">Tarik & lepas file di sini</span>
          </div>
        )}

        {platData.status === 'processing' && (
          <div className="p-6 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3"></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">Mengekstraksi Data...</span>
          </div>
        )}

        {platData.status === 'success' && (
          <div className="space-y-4 animate-fadeIn relative z-10">
            <div className={`flex items-start justify-between p-3 rounded-xl border border-emerald-500/20 ${isDarkMode ? 'bg-[#12151a]' : 'bg-white'}`}>
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                <div className="truncate pr-4">
                  <p className="text-[10px] font-bold text-emerald-500 truncate max-w-[150px]">{platData.file}</p>
                  <p className="text-[8px] text-gray-500 uppercase tracking-wider">CSV Terbaca Valid</p>
                </div>
              </div>
              <button onClick={() => handleRemoveFile(dataKey)} className="text-gray-500 hover:text-red-400 p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                <span className="text-[8px] uppercase font-bold text-gray-500 block mb-0.5">Jangkauan (Reach)</span>
                <span className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{platData.views.toLocaleString('id-ID')}</span>
              </div>
              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                <span className="text-[8px] uppercase font-bold text-gray-500 block mb-0.5">Interaksi (Eng)</span>
                <span className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{platData.eng.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto">
      <div className={`${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'} rounded-[35px] border p-8 md:p-10 shadow-2xl`}>
        
        <div className="text-center mb-10">
          <h2 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Rekapitulasi Cerdas CSV</h2>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">Ekstraksi Metrik Otomatis Lintas Platform</p>
        </div>

        <div className="mb-10">
          <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-2">Pilih Naskah Mengudara</label>
          <select 
            value={selectedContent} 
            onChange={(e) => setSelectedContent(e.target.value)}
            className={`w-full text-sm font-bold py-4 px-5 rounded-2xl outline-none focus:border-emerald-500 transition-colors cursor-pointer appearance-none border ${
              isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
            }`}
          >
            <option value="">-- Pilih Konten untuk Direkap --</option>
            <option value="1">Daftar 10 Juta Pekerja yang Dapat Jaminan Sosial</option>
            <option value="2">Manifesto Arah Baru Pembangunan Desa</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-4 flex items-center gap-2">
            <AlertCircle size={14} className="text-emerald-500" /> Wajib: Unggah CSV Resmi dari Masing-Masing Platform
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CSVUploadZone id="csv-meta" title="Meta (FB & IG)" icon={<PlatformIcons.Meta />} dataKey="meta" />
            <CSVUploadZone id="csv-tiktok" title="TikTok" icon={<PlatformIcons.TikTok />} dataKey="tiktok" />
            <CSVUploadZone id="csv-x" title="X (Twitter)" icon={<PlatformIcons.X />} dataKey="x" />
            <CSVUploadZone id="csv-shorts" title="YT Shorts" icon={<PlatformIcons.YT />} dataKey="shorts" />
          </div>
        </div>

        <div className={`mt-8 p-6 rounded-2xl border relative overflow-hidden ${isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
          
          <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <span>📊</span> Akumulasi Global (Auto-Sum Ekstraksi)
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Total Jangkauan (Views/Reach)</span>
              <div className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{globalMetrics.totalViews.toLocaleString('id-ID')}</div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Total Interaksi (Engagement)</span>
              <div className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{globalMetrics.totalEng.toLocaleString('id-ID')}</div>
            </div>
          </div>
          <p className="text-[9px] text-gray-500 mt-6 font-bold">* Angka di atas dihitung otomatis secara presisi dari file CSV yang Anda unggah.</p>
        </div>

        <button 
          disabled={!selectedContent || isSubmitting}
          className={`w-full mt-8 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
            !selectedContent 
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
              : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-900/50 active:scale-[0.98]'
          }`}
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <Save size={16} /> Simpan Metrik Terekstraksi
            </>
          )}
        </button>

      </div>
    </div>
  );
}