"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ContentPlan } from './CommandCenter';
import { Sparkles, Loader2, CheckCircle2, Eye, MousePointer2, Link2, AlertCircle } from 'lucide-react';

interface RecapProps {
  isDarkMode?: boolean;
  onRecapSuccess?: () => void;
}

export default function RecapForm({ isDarkMode = true, onRecapSuccess }: RecapProps) {
  const [completedContents, setCompletedContents] = useState<ContentPlan[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [views, setViews] = useState('');
  const [engagement, setEngagement] = useState('');
  const [liveLink, setLiveLink] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchEligibleContents() {
      try {
        setLoading(true);
        // Tarik naskah yang berstatus Completed (produksi selesai) atau Posted (sudah tayang)
        const { data, error } = await supabase
          .from('contents')
          .select('*')
          .or('prod_status.eq.Completed,pub_status.eq.Posted')
          .order('publish_date', { ascending: false });

        if (error) throw error;
        if (data) {
          setCompletedContents(data);
          // Set default isian ke item pertama jika tersedia
          if (data.length > 0) {
            setSelectedId(data[0].id);
            setViews(data[0].views?.toString() || '');
            setEngagement(data[0].engagement?.toString() || '');
            setLiveLink(data[0].live_link || '');
          }
        }
      } catch (err) {
        console.error("Gagal memuat daftar naskah pasca-tayang:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEligibleContents();
  }, []);

  // Sinkronisasi form saat memilih judul naskah lain di dropdown
  const handleSelectChange = (id: string) => {
    setSelectedId(id);
    const found = completedContents.find(item => item.id === id);
    if (found) {
      setViews(found.views?.toString() || '');
      setEngagement(found.engagement?.toString() || '');
      setLiveLink(found.live_link || '');
    }
  };

  // Simpan pembaruan angka ke database
  const handleSaveRecap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('contents')
        .update({
          views: Number(views) || 0,
          engagement: Number(engagement) || 0,
          live_link: liveLink
        })
        .eq('id', selectedId);

      if (error) throw error;

      setSuccess(true);
      if (onRecapSuccess) onRecapSuccess(); // Pemicu render ulang metrik akumulasi Dasbor
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      alert("Gagal menyimpan rekapitulasi performa.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-3">
        <Loader2 className="animate-spin text-[#008234]" size={28} />
        <span className="text-xs font-bold uppercase tracking-widest">Memuat Antrean Rekapitulasi...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-4 animate-fadeIn">
      <div className={`p-8 rounded-[40px] border ${isDarkMode ? 'bg-[#12151a] border-gray-800/60' : 'bg-white border-gray-200'} shadow-2xl space-y-8 relative overflow-hidden`}>
        
        {/* Tajuk Utama */}
        <div className="space-y-2">
          <h2 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Rekapitulasi Pasca-Tayang</h2>
          <p className="text-sm text-gray-500 font-medium">Input statistik riil dari media sosial untuk mengakumulasi performa total Command Center.</p>
        </div>

        {/* Notifikasi Sukses */}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-5 rounded-3xl flex items-center space-x-3 animate-bounce">
            <CheckCircle2 size={24} className="flex-shrink-0" />
            <span className="font-black text-sm">Statistik tersimpan! Dasbor utama telah diakumulasi ulang.</span>
          </div>
        )}

        {/* State Kosong (Jika belum ada naskah berstatus Completed/Posted) */}
        {completedContents.length === 0 ? (
          <div className={`p-8 rounded-3xl border border-dashed ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'} text-center space-y-3`}>
            <AlertCircle size={32} className="mx-auto text-amber-500" />
            <p className="font-bold text-xs uppercase tracking-wider">Belum Ada Naskah Siap Rekap</p>
            <p className="text-xs leading-relaxed max-w-md mx-auto">
              Ubah siklus status naskah Anda menjadi <strong className="text-[#008234]">Completed</strong> atau <strong className="text-blue-500">Posted</strong> melalui *pop-up* di menu Dasbor utama agar muncul di antrean ini.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSaveRecap} className="space-y-6">
            
            {/* Pilihan Judul Konten */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Pilih Naskah Mengudara</label>
              <select 
                value={selectedId}
                onChange={(e) => handleSelectChange(e.target.value)}
                className={`w-full px-6 py-4 rounded-2xl border ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-200'} font-bold text-sm outline-none focus:border-[#008234] transition-all`}
              >
                {completedContents.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.title} ({item.publish_date || 'Tanpa Tanggal'})
                  </option>
                ))}
              </select>
            </div>

            {/* Input Metrik Riil */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1 flex items-center gap-1.5">
                  <Eye size={13} className="text-blue-500" /> Total Views Riil
                </label>
                <input 
                  required
                  type="number"
                  placeholder="Contoh: 15400"
                  value={views}
                  onChange={(e) => setViews(e.target.value)}
                  className={`w-full px-6 py-4 rounded-2xl border ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-200'} outline-none focus:border-[#008234] font-bold text-sm transition-all`}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1 flex items-center gap-1.5">
                  <MousePointer2 size={13} className="text-purple-500" /> Total Engagement Riil
                </label>
                <input 
                  required
                  type="number"
                  placeholder="Likes + Komen + Share"
                  value={engagement}
                  onChange={(e) => setEngagement(e.target.value)}
                  className={`w-full px-6 py-4 rounded-2xl border ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-200'} outline-none focus:border-[#008234] font-bold text-sm transition-all`}
                />
              </div>
            </div>

            {/* Bukti Tautan URL */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1 flex items-center gap-1.5">
                <Link2 size={13} className="text-emerald-500" /> Tautan Publikasi Live (Opsional)
              </label>
              <input 
                type="url"
                placeholder="https://tiktok.com/@... atau tautan platform lainnya"
                value={liveLink}
                onChange={(e) => setLiveLink(e.target.value)}
                className={`w-full px-6 py-4 rounded-2xl border ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-200'} outline-none focus:border-[#008234] font-bold text-sm transition-all`}
              />
            </div>

            {/* Tombol Simpan */}
            <button 
              disabled={submitting} 
              type="submit" 
              className="w-full bg-[#008234] hover:bg-[#006b2a] text-white py-5 rounded-3xl font-black text-xs shadow-xl shadow-green-900/20 transition-all transform active:scale-95 flex items-center justify-center space-x-2"
            >
              {submitting ? <Loader2 className="animate-spin" size={20} /> : <><Sparkles size={18} /><span>SIMPAN METRIK PASCA-TAYANG</span></>}
            </button>

          </form>
        )}

      </div>
    </div>
  );
}