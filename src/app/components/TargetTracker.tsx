"use client";
import React, { useMemo } from 'react';
import { Target, TrendingUp, CheckCircle2 } from 'lucide-react';

interface ContentPlan {
  id: string;
  title: string;
  publish_date?: string;
  pub_status?: string;
  engagement?: number;
}

interface TargetTrackerProps {
  contents?: ContentPlan[];
  isDarkMode?: boolean;
}

export default function TargetTracker({ contents = [], isDarkMode = true }: TargetTrackerProps) {
  
  // Mencari tanggal hari ini
  const today = new Date();
  
  // Menghitung awal minggu (Senin)
  const startOfWeek = new Date(today);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0,0,0,0);

  // Menghitung akhir minggu (Minggu)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23,59,59,999);

  // Filter naskah yang tayang MINGGU INI
  const thisWeekContents = contents.filter(c => {
    if (c.pub_status !== 'Posted' || !c.publish_date) return false;
    const pDate = new Date(c.publish_date);
    return pDate >= startOfWeek && pDate <= endOfWeek;
  });

  // Hitung jumlah postingan minggu ini
  const currentUploads = thisWeekContents.length;
  const targetUploads = 10; 
  const uploadProgress = Math.min(100, Math.round((currentUploads / targetUploads) * 100));

  // Hitung total engagement minggu ini
  const currentEng = thisWeekContents.reduce((sum, item) => sum + Number(item.engagement || 0), 0);
  const targetEng = 50000;
  const engProgress = Math.min(100, Math.round((currentEng / targetEng) * 100));

  return (
    <div className="space-y-6 animate-fadeIn h-full flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <div>
          <h4 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Akselerasi Target</h4>
          <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-1">Performa Pekan Ini</p>
        </div>
        <div className="p-2 bg-emerald-500/10 rounded-xl">
          <Target size={16} className="text-emerald-500" />
        </div>
      </div>

      <div className="space-y-4">
        {/* Progress Upload */}
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Frekuensi Unggah</span>
            <span className="text-[10px] font-black text-emerald-400">{currentUploads} / {targetUploads}</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000 ease-out relative"
              style={{ width: `${uploadProgress}%` }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/30 blur-[1px]"></div>
            </div>
          </div>
        </div>

        {/* Progress Engagement */}
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Pertumbuhan Eng.</span>
            <span className="text-[10px] font-black text-blue-400">{currentEng.toLocaleString()} / {targetEng.toLocaleString()}</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000 ease-out relative"
              style={{ width: `${engProgress}%` }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/30 blur-[1px]"></div>
            </div>
          </div>
        </div>
      </div>

      <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#0b0d10] border-gray-800/80' : 'bg-gray-50 border-gray-200'} mt-4`}>
        <div className="flex items-start gap-3">
          <TrendingUp size={16} className={engProgress > 50 ? "text-emerald-500" : "text-amber-500"} />
          <p className="text-[10px] font-bold text-gray-400 leading-relaxed">
            {engProgress >= 100 
              ? "Luar biasa! Target interaksi mingguan telah terlampaui. Pertahankan traksi ini." 
              : engProgress > 50 
              ? "Traksi sangat baik. Eksekusi sisa kalender konten untuk menembus target mingguan."
              : "Interaksi awal pekan. Tingkatkan agresivitas distribusi pada jam-jam prima."}
          </p>
        </div>
      </div>
    </div>
  );
}