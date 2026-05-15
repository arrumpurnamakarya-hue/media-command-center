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

interface PreviewItem {
  title: string;
  full_caption: string;
  platform: string;
  views: number;
  engagement: number;
  date: string; // Tambahan Tanggal
}

export default function RecapForm({ isDarkMode = true, onRecapSuccess }: { isDarkMode?: boolean; onRecapSuccess?: () => void }) {
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

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const parsedRows: string[][] = [];
      let currentRow: string[] = [];
      let currentVal = '';
      let insideQuote = false;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
          if (insideQuote && text[i+1] === '"') { currentVal += '"'; i++; } else { insideQuote = !insideQuote; }
        } else if (char === ',' && !insideQuote) {
          currentRow.push(currentVal.trim()); currentVal = '';
        } else if ((char === '\n' || char === '\r') && !insideQuote) {
          if (char === '\r' && text[i+1] === '\n') i++;
          currentRow.push(currentVal.trim());
          if (currentRow.some(v => v !== '')) parsedRows.push(currentRow);
          currentRow = []; currentVal = '';
        } else { currentVal += char; }
      }
      if (currentVal || currentRow.length > 0) { currentRow.push(currentVal.trim()); parsedRows.push(currentRow); }

      const headers = parsedRows[0].map(h => h.toLowerCase());
      const results: PreviewItem[] = [];

      for(let i = 1; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        const getVal = (name: string) => {
          const idx = headers.findIndex(h => h.includes(name.toLowerCase()));
          return idx !== -1 && row[idx] ? row[idx].replace(/,/g, '').replace(/\./g, '') : "0";
        };

        let cap = "", v = 0, e = 0, d = new Date().toISOString().split('T')[0];

        if (platformKey === 'web') {
          cap = getVal("top pages").replace('https://pkbgarut.id/', '').replace(/-/g, ' ').replace(/\//g, '') || "Halaman";
          v = parseInt(getVal("impressions")) || 0;
          e = parseInt(getVal("clicks")) || 0;
        } else if (platformKey === 'tiktok') {
          cap = getVal("video title");
          v = parseInt(getVal("total views")) || 0;
          e = (parseInt(getVal("total likes")) || 0) + (parseInt(getVal("total comments")) || 0) + (parseInt(getVal("total shares")) || 0);
          const rawDate = getVal("post time");
          if(rawDate.includes('April')) d = '2026-04-' + rawDate.split(' ')[0].padStart(2, '0');
          if(rawDate.includes('Mei')) d = '2026-05-' + rawDate.split(' ')[0].padStart(2, '0');
        } else {
          cap = getVal("deskripsi");
          v = parseInt(getVal("tayangan")) || parseInt(getVal("jangkauan")) || 0;
          e = (parseInt(getVal("suka")) || 0) + (parseInt(getVal("komentar")) || 0) + (parseInt(getVal("frekuensi dibagikan")) || 0) + (parseInt(getVal("frekuensi disimpan")) || 0);
          const rawDate = getVal("waktu penerbitan");
          if(rawDate !== "0") d = rawDate.split(' ')[0].split('/').reverse().join('-'); 
        }

        if(cap && cap !== "0") {
          results.push({ title: cap.substring(0, 60), full_caption: cap, platform: platformKey, views: v, engagement: e, date: d });
        }
      }

      setPreviewData(prev => [...prev.filter(p => p.platform !== platformKey), ...results]);
      setPlatformStatus(prev => ({ ...prev, [platformKey]: { status: 'success', file: file.name } }));
    };
    reader.readAsText(file);
  };

  const handleBulkSave = async () => {
    setIsSubmitting(true);
    try {
      for (const item of previewData) {
        const colMap: any = { web: 'web_engagement', ig: 'ig_engagement', fb: 'fb_engagement', tiktok: 'tiktok_engagement', x: 'x_engagement', yt: 'yt_engagement' };
        const payload: any = {
          title: item.title, caption: item.full_caption, pub_status: 'Posted', prod_status: 'Completed', pillar: 'Strategic',
          publish_date: item.date, views: item.views, engagement: item.engagement, platforms: [item.platform.toUpperCase()]
        };
        payload[colMap[item.platform]] = item.engagement;
        if(item.platform === 'web') payload.web_views = item.views;

        await supabase.from('contents').insert([payload]);
      }
      alert("✅ Sinkronisasi Berhasil!");
      onRecapSuccess?.();
      setPreviewData([]);
      setPlatformStatus({ web: {file:null, status:'idle'}, ig: {file:null, status:'idle'}, fb: {file:null, status:'idle'}, tiktok: {file:null, status:'idle'}, x: {file:null, status:'idle'}, yt: {file:null, status:'idle'} });
    } catch (e: any) { setErrorMessage(e.message); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className={`${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white'} border p-8 rounded-[35px] shadow-2xl`}>
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black uppercase text-white">Smart Bulk Sync</h2>
          <p className="text-[10px] text-gray-500 font-bold tracking-[0.2em]">PENGOLAH DATA HISTORIS OTOMATIS</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {(Object.keys(platformStatus) as Array<keyof typeof platformStatus>).map(key => (
            <div key={key} className={`p-5 rounded-2xl border ${platformStatus[key].status === 'success' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#0b0d10] border-gray-800'}`}>
               <div className="flex items-center gap-2 mb-4">
                 {PlatformIcons[key as keyof typeof PlatformIcons]()}
                 <span className="text-[10px] font-black uppercase text-gray-400">{key}</span>
               </div>
               {platformStatus[key].status === 'idle' ? (
                 <div className="border-2 border-dashed border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center relative cursor-pointer group">
                   <input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, key)} />
                   <UploadCloud size={24} className="text-gray-600 group-hover:text-emerald-500" />
                   <span className="text-[8px] font-bold text-gray-500 mt-2 uppercase">Klik/Tarik CSV</span>
                 </div>
               ) : <div className="text-center"><CheckCircle2 size={24} className="text-emerald-500 mx-auto" /><p className="text-[9px] text-emerald-400 font-bold mt-2 truncate px-2">{platformStatus[key].file}</p></div>}
            </div>
          ))}
        </div>

        {previewData.length > 0 && (
          <div className="bg-[#0b0d10] border border-gray-800 rounded-2xl p-4 mb-6 max-h-60 overflow-auto">
            <table className="w-full text-left text-[10px]">
              <thead className="text-gray-500 border-b border-gray-800 font-black">
                <tr><th className="p-2">TANGGAL</th><th className="p-2">KONTEN</th><th className="p-2 text-right">REACH</th></tr>
              </thead>
              <tbody className="text-gray-300 font-bold">
                {previewData.map((d, i) => (
                  <tr key={i} className="border-b border-gray-900/50">
                    <td className="p-2 text-gray-500 font-mono">{d.date}</td>
                    <td className="p-2 truncate max-w-[200px]">{d.title}</td>
                    <td className="p-2 text-right text-emerald-400">{d.views.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button onClick={handleBulkSave} disabled={previewData.length === 0 || isSubmitting} className="w-full py-4 bg-emerald-500 rounded-2xl font-black text-xs text-white disabled:bg-gray-800">
          {isSubmitting ? 'MENYIMPAN...' : `IMPOR ${previewData.length} DATA KE REPORTS`}
        </button>
      </div>
    </div>
  );
}