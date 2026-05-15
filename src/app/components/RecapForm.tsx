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

      const parsedRows: string[][] = [];
      let currentRow: string[] = [];
      let currentVal = '';
      let insideQuote = false;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
          if (insideQuote && nextChar === '"') {
            currentVal += '"';
            i++; 
          } else {
            insideQuote = !insideQuote;
          }
        } else if (char === ',' && !insideQuote) {
          currentRow.push(currentVal.trim());
          currentVal = '';
        } else if ((char === '\n' || char === '\r') && !insideQuote) {
          if (char === '\r' && nextChar === '\n') i++;
          currentRow.push(currentVal.trim());
          if (currentRow.some(val => val !== '')) parsedRows.push(currentRow);
          currentRow = [];
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      if (currentVal || currentRow.length > 0) {
        currentRow.push(currentVal.trim());
        if (currentRow.some(val => val !== '')) parsedRows.push(currentRow);
      }

      if (parsedRows.length < 2) {
         setPlatformStatus(prev => ({ ...prev, [platformKey]: { status: 'idle', file: null } }));
         return;
      }

      const headers = parsedRows[0].map(h => h.toLowerCase());
      const parsedData: PreviewItem[] = [];

      for(let i = 1; i < parsedRows.length; i++) {
        const rowValues = parsedRows[i];

        const getVal = (colName: string) => {
          const idx = headers.findIndex(h => h.includes(colName.toLowerCase()));
          if(idx === -1) return "";
          let rawVal = rowValues[idx] ? rowValues[idx] : "";
          return rawVal.replace(/,/g, '').replace(/\./g, '');
        };

        let caption = "";
        let views = 0;
        let engagement = 0;
        let pDate = new Date().toISOString().split('T')[0];

        if (platformKey === 'web') {
          let rawUrl = getVal("top pages");
          caption = rawUrl.replace('https://pkbgarut.id/', '').replace(/-/g, ' ').replace(/\//g, '') || "Halaman Utama Website";
          views = parseInt(getVal("impressions")) || 0;
          engagement = parseInt(getVal("clicks")) || 0;
          
        } else if (platformKey === 'tiktok') {
          caption = getVal("video title");
          views = parseInt(getVal("total views")) || 0;
          let likes = parseInt(getVal("total likes")) || 0;
          let comments = parseInt(getVal("total comments")) || 0;
          let shares = parseInt(getVal("total shares")) || 0;
          engagement = likes + comments + shares;
          
          let rawDate = getVal("post time");
          if(rawDate && rawDate !== "0") {
             if (rawDate.toLowerCase().includes('april')) pDate = '2026-04-' + rawDate.split(' ')[0].padStart(2, '0');
             else if (rawDate.toLowerCase().includes('mei')) pDate = '2026-05-' + rawDate.split(' ')[0].padStart(2, '0');
          }

        } else {
          // ============================================
          // PERBAIKAN: FB, IG, X, YT - Fallback nama kolom
          // ============================================
          
          // Caption - berbagai kemungkinan nama kolom
          caption = getVal("deskripsi") 
                 || getVal("caption") 
                 || getVal("description") 
                 || getVal("teks") 
                 || getVal("post") 
                 || getVal("content") 
                 || getVal("nama") 
                 || getVal("title") 
                 || "";
          
          // Views - berbagai kemungkinan nama kolom
          views = parseInt(getVal("tayangan")) 
               || parseInt(getVal("jangkauan")) 
               || parseInt(getVal("reach")) 
               || parseInt(getVal("impressions")) 
               || parseInt(getVal("views")) 
               || parseInt(getVal("penayangan")) 
               || 0;
          
          // Likes - berbagai kemungkinan nama kolom
          let likes = parseInt(getVal("suka")) 
                   || parseInt(getVal("likes")) 
                   || parseInt(getVal("like")) 
                   || parseInt(getVal("reactions")) 
                   || 0;
          
          // Comments - berbagai kemungkinan nama kolom
          let comments = parseInt(getVal("komentar")) 
                      || parseInt(getVal("comments")) 
                      || parseInt(getVal("comment")) 
                      || 0;
          
          // Shares - berbagai kemungkinan nama kolom
          let shares = parseInt(getVal("frekuensi dibagikan")) 
                    || parseInt(getVal("shares")) 
                    || parseInt(getVal("share")) 
                    || parseInt(getVal("dimediakan")) 
                    || 0;
          
          // Saves - berbagai kemungkinan nama kolom
          let saves = parseInt(getVal("frekuensi disimpan")) 
                   || parseInt(getVal("saves")) 
                   || parseInt(getVal("saved")) 
                   || parseInt(getVal("menyimpan")) 
                   || 0;
          
          engagement = likes + comments + shares + saves;

          // Tanggal - berbagai kemungkinan nama kolom dan format
          let rawDate = getVal("waktu penerbitan") 
                     || getVal("date") 
                     || getVal("tanggal") 
                     || getVal("posting date") 
                     || getVal("published") 
                     || getVal("created") 
                     || getVal("waktu") 
                     || "";
          
          if(rawDate && rawDate.trim() !== "") {
             const dateStr = rawDate.trim();
             
             // Format: MM/DD/YYYY atau DD/MM/YYYY
             const dateParts = dateStr.split(' ')[0].split('/');
             if(dateParts.length === 3) {
                const part0 = dateParts[0].trim();
                const part1 = dateParts[1].trim();
                const part2 = dateParts[2].trim();
                
                // Deteksi format berdasarkan nilai
                if(parseInt(part0) > 12) {
                   // Pasti DD/MM/YYYY
                   pDate = `${part2}-${part1.padStart(2, '0')}-${part0.padStart(2, '0')}`;
                } else if(parseInt(part1) > 12) {
                   // Pasti MM/DD/YYYY
                   pDate = `${part2}-${part0.padStart(2, '0')}-${part1.padStart(2, '0')}`;
                } else {
                   // Default: MM/DD/YYYY
                   pDate = `${part2}-${part0.padStart(2, '0')}-${part1.padStart(2, '0')}`;
                }
             } else {
                // Format: YYYY-MM-DD atau YYYY/MM/DD
                const isoParts = dateStr.split('-');
                if(isoParts.length === 3) {
                   pDate = dateStr; // sudah format ISO
                } else {
                   const slashParts = dateStr.split('/');
                   if(slashParts.length === 3) {
                      pDate = `${slashParts[2].padStart(2, '0')}-${slashParts[1].padStart(2, '0')}-${slashParts[0].padStart(2, '0')}`;
                   }
                }
             }
          }
        }

        // Hanya masukkan jika ada data yang valid
        if(caption && caption !== "" && (views > 0 || engagement > 0)) {
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
          'web': 'web_engagement', 'ig': 'ig_engagement', 'fb': 'fb_engagement',
          'tiktok': 'tiktok_engagement', 'x': 'x_engagement', 'yt': 'yt_engagement'
        };
        
        const engCol = columnMap[item.platform] || 'engagement';
        
        const payload: Record<string, any> = {
          title: item.title || "Naskah Tanpa Judul",
          caption: item.full_caption || "",
          pub_status: 'Posted',
          prod_status: 'Completed',
          pillar: 'Imported Data',
          publish_date: item.publish_date,
          publish_time: '12:00',
          views: item.views,
          engagement: item.engagement,
          platforms: [item.platform.toUpperCase()]
        };
        
        payload[engCol] = item.engagement;
        if (item.platform === 'web') payload['web_views'] = item.views;

        const { error: contentError } = await supabase.from('contents').insert([payload] as any[]);
        if (contentError) throw contentError;
      }
      
      alert("✅ Sinkronisasi Massal Berhasil! Data Historis telah masuk ke Reports.");
      if (onRecapSuccess) await onRecapSuccess();
      
      setPreviewData([]);
      setPlatformStatus({
        web: { file: null, status: 'idle' }, ig: { file: null, status: 'idle' }, fb: { file: null, status: 'idle' },
        tiktok: { file: null, status: 'idle' }, x: { file: null, status: 'idle' }, yt: { file: null, status: 'idle' }
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
      <div className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 w-full ${platData.status === 'processing' ? 'border-yellow-500 bg-yellow-50' : platData.status === 'success' ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-transparent'}`}>
        <div className="mb-2">{icon}</div>
        <span className={`text-sm font-medium ${platData.status === 'processing' ? 'text-yellow-700' : platData.status === 'success' ? 'text-green-700' : 'text-gray-500'}`}>{title}</span>
      </div>
    );
  };

  return (
    <div></div>
  );
}