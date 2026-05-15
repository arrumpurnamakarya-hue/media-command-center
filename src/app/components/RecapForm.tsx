"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UploadCloud, FileSpreadsheet, CheckCircle2, Save, AlertCircle, RefreshCw, Globe } from 'lucide-react';

const PlatformIcons = {
  Web: () => <Globe className="w-5 h-5 text-blue-400" />,
  IG: () => <svg className="w-5 h-5 text-[#E4405F] fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z"/></svg>,
  FB: () => <svg className="w-5 h-5 text-[#1877F2] fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  TikTok: () => <svg className="w-5 h-5 text-[#ff0050] fill-current" viewBox="0 0 24 24"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.674c0 1.913-1.554 3.467-3.467 3.467-1.914 0-3.468-1.554-3.468-3.467 0-1.914 1.554-3.468 3.468-3.468h.078V8.761h-.078c-3.824 0-6.924 3.1-6.924 6.924 0 3.823 3.1 6.923 6.924 6.924 3.823 0 6.922-3.1 6.922-6.923v-8.15a8.175 8.175 0 0 0 6.687 2.333v-3.18z"/></svg>,
  X: () => <svg className="w-4 h-4 text-gray-300 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  YT: () => <svg className="w-5 h-5 text-[#FF0000] fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.501 5.814a3.016 3.016 0 0 0 2.122 2.136c1.872.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
};

interface RecapFormProps {
  isDarkMode?: boolean;
  onRecapSuccess?: () => void | Promise<void>;
}

export default function RecapForm({ isDarkMode = true, onRecapSuccess }: RecapFormProps) {
  const [dbContents, setDbContents] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [platformStatus, setPlatformStatus] = useState({
    web: { file: null, status: 'idle' },
    ig: { file: null, status: 'idle' },
    fb: { file: null, status: 'idle' },
    tiktok: { file: null, status: 'idle' },
    x: { file: null, status: 'idle' },
    yt: { file: null, status: 'idle' }
  });

  // Ambil naskah dari database untuk pencocokan
  useEffect(() => {
    const fetchDB = async () => {
      const { data } = await supabase.from('contents').select('id, title, caption, pub_status').eq('pub_status', 'Posted');
      if (data) setDbContents(data);
    };
    fetchDB();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, platformKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPlatformStatus(prev => ({ ...prev, [platformKey]: { status: 'processing', file: file.name as any } }));

    // Simulasi Smart Sync (Mencocokkan baris CSV dengan Database)
    // Di produksi nyata, kita akan menggunakan FileReader() + PapaParse di sini
    setTimeout(() => {
      // Mockup Data yang "Berhasil Ditemukan"
      const matchedMocks = dbContents.slice(0, 3).map(dbItem => ({
        content_id: dbItem.id,
        title: dbItem.title,
        platform: platformKey,
        views: Math.floor(Math.random() * 50000) + 1000,
        engagement: Math.floor(Math.random() * 5000) + 100,
      }));

      setPreviewData(prev => {
        // Hapus data lama dari platform yang sama jika upload ulang
        const filtered = prev.filter(p => p.platform !== platformKey);
        return [...filtered, ...matchedMocks];
      });

      setPlatformStatus(prev => ({ ...prev, [platformKey]: { status: 'success', file: file.name as any } }));
    }, 1500);
  };

  const handleRemoveFile = (platformKey: string) => {
    setPlatformStatus(prev => ({ ...prev, [platformKey]: { file: null, status: 'idle' } }));
    setPreviewData(prev => prev.filter(p => p.platform !== platformKey));
  };

  const handleBulkSave = async () => {
    if (previewData.length === 0) return;
    setIsSubmitting(true);
    try {
      // Menyimpan data massal ke tabel 'platform_metrics'
      const { error } = await supabase.from('platform_metrics').upsert(
        previewData.map(d => ({
          content_id: d.content_id,
          platform: d.platform,
          views: d.views,
          engagement: d.engagement,
          updated_at: new Date().toISOString()
        })),
        { onConflict: 'content_id, platform' } // Pastikan ada Unique Constraint di DB
      );

      if (error) throw error;
      
      alert("✅ Sinkronisasi Massal Berhasil!");
      if (onRecapSuccess) await onRecapSuccess();
      
      // Reset State
      setPreviewData([]);
      setPlatformStatus({
        web: { file: null, status: 'idle' }, ig: { file: null, status: 'idle' },
        fb: { file: null, status: 'idle' }, tiktok: { file: null, status: 'idle' },
        x: { file: null, status: 'idle' }, yt: { file: null, status: 'idle' }
      });

    } catch (error) {
      console.error(error);
      alert("Gagal melakukan sinkronisasi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const CSVUploadZone = ({ title, icon, dataKey }: { title: string, icon: React.ReactNode, dataKey: keyof typeof platformStatus }) => {
    const platData = platformStatus[dataKey];

    return (
      <div className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
        platData.status === 'success' ? 'bg-emerald-500/10 border-emerald-500/30' : 
        isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {icon}
            <h4 className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h4>
          </div>
          {platData.status === 'success' && (
            <button onClick={() => handleRemoveFile(dataKey)} className="text-gray-500 hover:text-red-400 p-1 rounded transition-colors"><XIcon size={14}/></button>
          )}
        </div>

        {platData.status === 'idle' ? (
          <div className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group relative ${isDarkMode ? 'border-gray-700 hover:border-emerald-500/50' : 'border-gray-300 hover:border-emerald-500/50'}`}>
            <input type="file" accept=".csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => handleFileUpload(e, dataKey)} />
            <UploadCloud className="w-8 h-8 text-gray-600 group-hover:text-emerald-400 mb-2 transition-colors" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Unggah CSV {title}</span>
          </div>
        ) : platData.status === 'processing' ? (
          <div className="p-6 flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin mb-3" />
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">Mengekstraksi & Mencocokkan...</span>
          </div>
        ) : (
          <div className="p-4 bg-black/20 rounded-xl border border-emerald-500/20 flex flex-col items-center text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
            <span className="text-[10px] text-emerald-400 font-bold truncate max-w-full px-2">{platData.file}</span>
            <span className="text-[8px] text-gray-500 uppercase mt-1">Data Siap Disinkronkan</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className={`${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'} border p-8 md:p-10 rounded-[35px] shadow-2xl`}>
        
        <div className="text-center mb-10">
          <h2 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Smart Bulk Sync Engine</h2>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">Unggah CSV, Sistem Akan Mencocokkan Otomatis ke Database</p>
        </div>

        {/* 6 ZONA UPLOAD */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          <CSVUploadZone title="Website (GSC)" icon={<PlatformIcons.Web />} dataKey="web" />
          <CSVUploadZone title="Instagram" icon={<PlatformIcons.IG />} dataKey="ig" />
          <CSVUploadZone title="Facebook" icon={<PlatformIcons.FB />} dataKey="fb" />
          <CSVUploadZone title="TikTok" icon={<PlatformIcons.TikTok />} dataKey="tiktok" />
          <CSVUploadZone title="X (Twitter)" icon={<PlatformIcons.X />} dataKey="x" />
          <CSVUploadZone title="YT Shorts" icon={<PlatformIcons.YT />} dataKey="yt" />
        </div>

        {/* TABEL PREVIEW HASIL PENCOCOKAN */}
        {previewData.length > 0 && (
          <div className={`p-6 rounded-3xl border animate-fadeIn mb-8 ${isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Preview Sinkronisasi</h4>
                <p className="text-[10px] text-gray-500 mt-1 font-bold">Memuat {previewData.length} entri metrik baru siap diproses</p>
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-left">
                <thead className={`sticky top-0 z-10 ${isDarkMode ? 'bg-[#0b0d10]' : 'bg-gray-50'}`}>
                  <tr className="text-[10px] text-gray-400 uppercase border-b border-gray-500/20 pb-2">
                    <th className="pb-3 px-4 font-black">Naskah Ditemukan</th>
                    <th className="pb-3 px-4 font-black">Sumber CSV</th>
                    <th className="pb-3 px-4 font-black text-right">Reach Extracted</th>
                    <th className="pb-3 px-4 font-black text-right">Eng. Extracted</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] font-bold divide-y divide-gray-500/10">
                  {previewData.map((d, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className={`py-3 px-4 max-w-[200px] truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{d.title}</td>
                      <td className="py-3 px-4 uppercase text-[#008234]">{d.platform}</td>
                      <td className="py-3 px-4 text-right text-blue-400 font-roboto">{d.views.toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-roboto">{d.engagement.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button 
          onClick={handleBulkSave}
          disabled={previewData.length === 0 || isSubmitting}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
            previewData.length === 0
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
              : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-900/50 active:scale-[0.98]'
          }`}
        >
          {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Save size={16} /> KONFIRMASI & SIMPAN MASSAL</>}
        </button>

      </div>
    </div>
  );
}

// Icon helper
function XIcon(props: any) {
  return <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>;
}