"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Save, Loader2, BarChart3, Share2, Link } from 'lucide-react';

interface RecapFormProps {
  isDarkMode?: boolean;
  onRecapSuccess?: () => void;
}

export default function RecapForm({ isDarkMode = true, onRecapSuccess }: RecapFormProps) {
  const [contents, setContents] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [stats, setStats] = useState({
    views: 0,
    engagement: 0,
    meta: 0,
    tiktok: 0,
    x: 0,
    yt: 0,
    link: ''
  });

  useEffect(() => {
    async function fetchPublishedContents() {
      const { data } = await supabase
        .from('contents')
        .select('id, title, publish_date')
        .order('publish_date', { ascending: false });
      if (data) setContents(data);
    }
    fetchPublishedContents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return alert("Pilih naskah yang ingin direkap terlebih dahulu!");
    
    setLoading(true);
    const { error } = await supabase
      .from('contents')
      .update({
        views: stats.views,
        engagement: stats.engagement,
        meta_eng: stats.meta,
        tiktok_eng: stats.tiktok,
        x_eng: stats.x,
        yt_eng: stats.yt,
        live_link: stats.link,
        pub_status: 'Posted'
      })
      .eq('id', selectedId);

    if (error) {
      alert("Gagal menyimpan data: " + error.message);
    } else {
      alert("Statistik Interaksi Berhasil Diperbarui!");
      setStats({ views: 0, engagement: 0, meta: 0, tiktok: 0, x: 0, yt: 0, link: '' });
      setSelectedId('');
      if (onRecapSuccess) onRecapSuccess();
    }
    setLoading(false);
  };

  // Dinamisasi kelas warna berdasarkan mode
  const bgCard = isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200';
  const bgInput = isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900';
  const textTitle = isDarkMode ? 'text-white' : 'text-gray-900';

  return (
    <div className="max-w-4xl mx-auto p-4 animate-fadeIn">
      <div className={`border rounded-[30px] p-8 shadow-xl transition-all ${bgCard}`}>
        <div className="text-center space-y-1 mb-8">
          <h2 className={`text-2xl font-black tracking-tight ${textTitle}`}>REKAPITULASI PASCA-TAYANG</h2>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Akumulasi Interaksi Riil Saluran Distribusi</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pilihan Naskah */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Pilih Naskah Mengudara</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className={`w-full border p-4 rounded-xl font-semibold outline-none focus:border-[#008234] transition-all text-sm ${bgInput}`}
            >
              <option value="">-- Pilih Konten untuk Direkap --</option>
              {contents.map(c => (
                <option key={c.id} value={c.id}>{c.title} ({c.publish_date})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Metrik Global */}
            <div className={`p-5 rounded-2xl border space-y-4 ${isDarkMode ? 'bg-[#0b0d10]/50 border-gray-800/80' : 'bg-gray-50/50 border-gray-200'}`}>
              <h4 className="text-[10px] font-black text-[#008234] uppercase tracking-wider flex items-center gap-2">
                <BarChart3 size={14} /> Akumulasi Global
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Total Jangkauan (Views)</label>
                  <input
                    type="number"
                    value={stats.views || ''}
                    onChange={e => setStats({...stats, views: parseInt(e.target.value) || 0})}
                    placeholder="0"
                    style={{ fontFamily: 'var(--font-roboto), sans-serif' }}
                    className={`w-full border-b pb-2 font-black text-xl outline-none focus:border-[#008234] bg-transparent transition-all ${textTitle} ${isDarkMode ? 'border-gray-800':'border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Total Interaksi (Global Eng.)</label>
                  <input
                    type="number"
                    value={stats.engagement || ''}
                    onChange={e => setStats({...stats, engagement: parseInt(e.target.value) || 0})}
                    placeholder="0"
                    style={{ fontFamily: 'var(--font-roboto), sans-serif' }}
                    className={`w-full border-b pb-2 font-black text-xl outline-none focus:border-[#008234] bg-transparent transition-all ${textTitle} ${isDarkMode ? 'border-gray-800':'border-gray-300'}`}
                  />
                </div>
              </div>
            </div>

            {/* Rincian Platform */}
            <div className={`p-5 rounded-2xl border space-y-4 ${isDarkMode ? 'bg-[#0b0d10]/50 border-gray-800/80' : 'bg-gray-50/50 border-gray-200'}`}>
              <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-wider flex items-center gap-2">
                <Share2 size={14} /> Rincian Interaksi Platform
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Meta (FB & IG)</label>
                  <input
                    type="number"
                    value={stats.meta || ''}
                    onChange={e => setStats({...stats, meta: parseInt(e.target.value) || 0})}
                    placeholder="0"
                    style={{ fontFamily: 'var(--font-roboto), sans-serif' }}
                    className={`w-full border-b pb-1 font-bold text-base outline-none focus:border-blue-500 bg-transparent transition-all ${textTitle} ${isDarkMode ? 'border-gray-800':'border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">TikTok</label>
                  <input
                    type="number"
                    value={stats.tiktok || ''}
                    onChange={e => setStats({...stats, tiktok: parseInt(e.target.value) || 0})}
                    placeholder="0"
                    style={{ fontFamily: 'var(--font-roboto), sans-serif' }}
                    className={`w-full border-b pb-1 font-bold text-base outline-none focus:border-pink-500 bg-transparent transition-all ${textTitle} ${isDarkMode ? 'border-gray-800':'border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">X (Twitter)</label>
                  <input
                    type="number"
                    value={stats.x || ''}
                    onChange={e => setStats({...stats, x: parseInt(e.target.value) || 0})}
                    placeholder="0"
                    style={{ fontFamily: 'var(--font-roboto), sans-serif' }}
                    className={`w-full border-b pb-1 font-bold text-base outline-none focus:border-gray-400 bg-transparent transition-all ${textTitle} ${isDarkMode ? 'border-gray-800':'border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">YT Shorts</label>
                  <input
                    type="number"
                    value={stats.yt || ''}
                    onChange={e => setStats({...stats, yt: parseInt(e.target.value) || 0})}
                    placeholder="0"
                    style={{ fontFamily: 'var(--font-roboto), sans-serif' }}
                    className={`w-full border-b pb-1 font-bold text-base outline-none focus:border-red-500 bg-transparent transition-all ${textTitle} ${isDarkMode ? 'border-gray-800':'border-gray-300'}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tautan Bukti */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Tautan Bukti Publikasi (Opsional)</label>
            <div className="relative flex items-center">
              <Link className="absolute left-4 text-gray-500" size={16} />
              <input
                type="url"
                value={stats.link}
                onChange={e => setStats({...stats, link: e.target.value})}
                placeholder="https://..."
                className={`w-full border pl-11 pr-4 py-3 rounded-xl font-medium text-xs outline-none focus:border-blue-500 transition-all ${bgInput}`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !selectedId}
            className="w-full bg-[#008234] hover:bg-[#006b2a] text-white py-4 rounded-xl font-black text-xs tracking-wider shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> SIMPAN METRIK PLATFORM</>}
          </button>
        </form>
      </div>
    </div>
  );
}