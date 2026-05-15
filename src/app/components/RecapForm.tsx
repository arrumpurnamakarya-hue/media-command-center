"use client";
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UploadCloud, CheckCircle2, Save, RefreshCw, Globe, AlertTriangle } from 'lucide-react';

const PlatformIcons = {
  Web: () => <Globe className="w-5 h-5 text-blue-400" />,
  IG: () => <svg className="w-5 h-5 text-[#E4405F]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>,
  FB: () => <svg className="w-5 h-5 text-[#1877F2] fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  TikTok: () => <svg className="w-5 h-5 text-[#ff0050] fill-current" viewBox="0 0 24 24"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.674c0 1.913-1.554 3.467-3.467 3.467-1.914 0-3.468-1.554-3.468-3.467 0-1.914 1.554-3.468 3.468-3.468h.078V8.761h-.078c-3.824 0-6.924 3.1-6.924 6.924 0 3.823 3.1 6.923 6.924 6.924 3.823 0 6.922-3.1 6.922-6.923v-8.15a8.175 8.175 0 0 0 6.687 2.333v-3.18z"/></svg>,
  X: () => <svg className="w-4 h-4 text-gray-300 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  YT: () => <svg className="w-5 h-5 text-[#FF0000] fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.501 5.814a3.016 3.016 0 0 0 2.122 2.136c1.872.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
};

interface RecapFormProps {
  isDarkMode?: boolean;
  onRecapSuccess?: () => void | Promise<void>;
}

interface PreviewItem {
  title: string;
  full_caption: string;
  platform: string;
  views: number;
  engagement: number;
  publish_date: string;
}

export default function RecapForm({ isDarkMode = true, onRecapSuccess }: RecapFormProps) {
  const [previewData, setPreviewData] = useState<PreviewItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [platformStatus, setPlatformStatus] = useState({
    web: { file: null as string | null, status: 'idle' },
    ig: { file: null as string | null, status: 'idle' },
    fb: { file: null as string | null, status: 'idle' },
    tiktok: { file: null as string | null, status: 'idle' },
    x: { file: null as string | null, status: 'idle' },
    yt: { file: null as string | null, status: 'idle' }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, platformKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPlatformStatus(prev => ({ ...prev, [platformKey]: { status: 'processing', file: file.name } }));
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const rows = text.split(/\r?\n/);
      if (rows.length < 2) return;

      const headers = rows[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
      const parsedData: PreviewItem[] = [];

      for(let i = 1; i < rows.length; i++) {
        const rowString = rows[i];
        if(!rowString.trim()) continue;

        const rowValues: string[] = [];
        let insideQuote = false;
        let currentVal = '';
        
        for(let j = 0; j < rowString.length; j++) {
          const char = rowString[j];
          if(char === '"') {
            insideQuote = !insideQuote;
          } else if(char === ',' && !insideQuote) {
            rowValues.push(currentVal.trim());
            currentVal = '';
          } else {
            currentVal += char;
          }
        }
        rowValues.push(currentVal.trim());

        // LOGIKA PENCOCOKAN KOLOM PRESISI (ANTI-SALAH BACA)
        const getVal = (colName: string) => {
          let idx = headers.findIndex(h => h === colName.toLowerCase());
          if (idx === -1) idx = headers.findIndex(h => h.includes(colName.toLowerCase()));
          if (idx === -1) return "";
          let rawVal = rowValues[idx] ? rowValues[idx].replace(/"/g, '') : "";
          return rawVal.trim();
        };

        // FILTER ANTI-NaN UNTUK SEMUA ANGKA
        const getNum = (colName: string) => {
          const val = getVal(colName).replace(/,/g, '').replace(/\./g, '').replace(/-/g, '').trim();
          const parsed = parseInt(val, 10);
          return isNaN(parsed) ? 0 : parsed;
        };

        let caption = "";
        let views = 0;
        let engagement = 0;
        let pDate = new Date().toISOString().split('T')[0];

        if (platformKey === 'web') {
          let rawUrl = getVal("top pages");
          caption = rawUrl.replace('https://pkbgarut.id/', '').replace(/-/g, ' ').replace(/\//g, '') || "Halaman Utama Website";
          views = getNum("impressions");
          engagement = getNum("clicks");
          
        } else if (platformKey === 'tiktok') {
          caption = getVal("video title");
          views = getNum("total views");
          engagement = getNum("total likes") + getNum("total comments") + getNum("total shares");
          
          let rawDate = getVal("post time");
          if(rawDate) {
             if (rawDate.toLowerCase().includes('april')) pDate = '2026-04-' + rawDate.split(' ')[0].padStart(2, '0');
             else if (rawDate.toLowerCase().includes('mei')) pDate = '2026-05-' + rawDate.split(' ')[0].padStart(2, '0');
          }
          
        } else {
          // FACEBOOK & IG (Menggunakan getNum agar kebal simbol -- )
          caption = getVal("deskripsi") || getVal("judul") || getVal("title") || "";
          views = getNum("tayangan") || getNum("jangkauan") || getNum("impresi");
          
          let likes = getNum("suka") || getNum("tanggapan");
          let comments = getNum("komentar");
          let shares = getNum("frekuensi dibagikan") || getNum("bagikan");
          let saves = getNum("frekuensi disimpan") || getNum("penyimpanan");
          let interaksi = getNum("interaksi");
          
          engagement = interaksi > 0 ? interaksi : (likes + comments + shares + saves);

          let rawDate = getVal("waktu penerbitan") || getVal("tanggal");
          if(rawDate && rawDate.includes('/')) {
             const parts = rawDate.split(' ')[0].split('/');
             if(parts.length === 3) pDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          }
        }

        if(caption && (views > 0 || engagement > 0)) {
          parsedData.push({
            title: caption.substring(0, 65) + (caption.length > 65 ? '...' : ''), 
            full_caption: caption,
            platform: platformKey,
            views: views,
            engagement: engagement,
            publish_date: pDate
          });
        }
      }

      setPreviewData(prev => {
        const filtered = prev.filter(p => p.platform !== platformKey);
        return [...filtered, ...parsedData];
      });

      setPlatformStatus(prev => ({ ...prev, [platformKey]: { status: 'success', file: file.name } }));
    };
    
    reader.readAsText(file);
  };

  const handleRemoveFile = (platformKey: string) => {
    setPlatformStatus(prev => ({ ...prev, [platformKey]: { file: null, status: 'idle' } }));
    setPreviewData(prev => prev.filter(p => p.platform !== platformKey));
    setErrorMessage(null);
  };

  const handleBulkSave = async () => {
    if (previewData.length === 0) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      for (const item of previewData) {
        const columnMap: Record<string, string> = {
          'web': 'web_engagement',
          'ig': 'ig_engagement',
          'fb': 'fb_engagement',
          'tiktok': 'tiktok_engagement',
          'x': 'x_engagement',
          'yt': 'yt_engagement'
        };
        
        const engCol = columnMap[item.platform] || 'engagement';
        
        // PAYLOAD DIJAMIN BERSIH DARI NaN
        const safeViews = isNaN(Number(item.views)) ? 0 : Number(item.views);
        const safeEngagement = isNaN(Number(item.engagement)) ? 0 : Number(item.engagement);

        const payload: Record<string, any> = {
          title: item.title || "Konten Impor",
          caption: item.full_caption || "",
          pub_status: 'Posted',
          prod_status: 'Completed',
          pillar: 'Imported Data',
          publish_date: item.publish_date || new Date().toISOString().split('T')[0],
          views: safeViews,
          engagement: safeEngagement,
          platforms: [item.platform.toUpperCase()]
        };
        
        payload[engCol] = safeEngagement;
        if (item.platform === 'web') payload['web_views'] = safeViews;

        const { error: contentError } = await supabase
          .from('contents')
          .insert([payload] as any[]);

        if (contentError) throw contentError;
      }
      
      alert("✅ Sinkronisasi Massal Berhasil! Data Historis telah masuk ke Reports.");
      if (onRecapSuccess) await onRecapSuccess();
      
      setPreviewData([]);
      setPlatformStatus({
        web: { file: null, status: 'idle' }, ig: { file: null, status: 'idle' },
        fb: { file: null, status: 'idle' }, tiktok: { file: null, status: 'idle' },
        x: { file: null, status: 'idle' }, yt: { file: null, status: 'idle' }
      });

    } catch (error: any) {
      console.error("Supabase Error:", error);
      setErrorMessage(error.message || "Gagal menyimpan ke database Supabase.");
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
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">Membaca File CSV...</span>
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
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">Unggah CSV, Sistem Akan Mengimpor Data Historis Secara Otomatis</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          <CSVUploadZone title="Website (GSC)" icon={<PlatformIcons.Web />} dataKey="web" />
          <CSVUploadZone title="Instagram" icon={<PlatformIcons.IG />} dataKey="ig" />
          <CSVUploadZone title="Facebook" icon={<PlatformIcons.FB />} dataKey="fb" />
          <CSVUploadZone title="TikTok" icon={<PlatformIcons.TikTok />} dataKey="tiktok" />
          <CSVUploadZone title="X (Twitter)" icon={<PlatformIcons.X />} dataKey="x" />
          <CSVUploadZone title="YT Shorts" icon={<PlatformIcons.YT />} dataKey="yt" />
        </div>

        {previewData.length > 0 && (
          <div className={`p-6 rounded-3xl border animate-fadeIn mb-8 ${isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Data Asli dari CSV</h4>
                <p className="text-[10px] text-gray-500 mt-1 font-bold">Memuat {previewData.length} baris data historis yang siap diimpor ke Reports</p>
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className={`sticky top-0 z-10 ${isDarkMode ? 'bg-[#0b0d10]' : 'bg-gray-50'}`}>
                  <tr className="text-[10px] text-gray-400 uppercase border-b border-gray-500/20 pb-2">
                    <th className="pb-3 px-4 font-black">Tanggal</th>
                    <th className="pb-3 px-4 font-black">Teks / Caption</th>
                    <th className="pb-3 px-4 font-black text-right">Tayangan (Reach)</th>
                    <th className="pb-3 px-4 font-black text-right">Total Interaksi</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] font-bold divide-y divide-gray-500/10">
                  {previewData.map((d, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4 font-mono text-gray-500">{d.publish_date}</td>
                      <td className={`py-4 px-4 max-w-[300px] leading-relaxed ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{d.title}</td>
                      <td className="py-4 px-4 text-right text-blue-400 font-roboto text-sm">{d.views.toLocaleString('id-ID')}</td>
                      <td className="py-4 px-4 text-right text-emerald-400 font-roboto text-sm">{d.engagement.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 animate-fadeIn">
            <AlertTriangle className="text-red-500 flex-shrink-0" size={18} />
            <div>
              <h4 className="text-xs font-black text-red-500 uppercase tracking-widest">Koneksi Database Ditolak</h4>
              <p className="text-[10px] text-red-400/80 mt-1 font-mono">{errorMessage}</p>
            </div>
          </div>
        )}

        <button 
          onClick={handleBulkSave}
          disabled={previewData.length === 0 || isSubmitting}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
            previewData.length === 0 || isSubmitting
              ? 'bg-[#12151a] border border-gray-800 text-gray-600 cursor-not-allowed' 
              : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-900/50 cursor-pointer active:scale-[0.98]'
          }`}
        >
          {isSubmitting ? (
             <><RefreshCw className="w-4 h-4 animate-spin" /> MENYIMPAN DATA...</>
          ) : previewData.length === 0 ? (
             <><AlertTriangle size={14} /> TOMBOL TERKUNCI (UNGGAH CSV DULU)</>
          ) : (
             <><Save size={16} /> IMPOR MASSAL KE REPORTS</>
          )}
        </button>

      </div>
    </div>
  );
}

function XIcon(props: any) {
  return <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>;
}