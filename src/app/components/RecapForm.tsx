"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Save, Loader2, BarChart3, Link } from 'lucide-react';

export default function RecapForm() {
  const [contents, setContents] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  
  // State sederhana: hanya views, engagement, dan link
  const [stats, setStats] = useState({ 
    views: 0, 
    engagement: 0, 
    link: '' 
  });

  useEffect(() => {
    async function fetchPending() {
      // Mengambil naskah yang sudah ada di database
      const { data } = await supabase
        .from('contents')
        .select('id, title, publish_date')
        .order('publish_date', { ascending: false });
      if (data) setContents(data);
    }
    fetchPending();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return alert("Pilih naskah terlebih dahulu!");
    setLoading(true);
    
    // Hanya update kolom global views dan engagement
    const { error } = await supabase
      .from('contents')
      .update({
        views: stats.views,
        engagement: stats.engagement,
        live_link: stats.link,
        pub_status: 'Posted'
      })
      .eq('id', selectedId);

    if (error) {
      alert("Gagal menyimpan: " + error.message);
    } else {
      alert("Statistik Global Berhasil Direkap!");
      setStats({ views: 0, engagement: 0, link: '' });
      setSelectedId('');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 animate-fadeIn">
      <div className="bg-[#12151a] border border-gray-800 rounded-[35px] p-8 shadow-2xl space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Rekapitulasi Konten</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Input performa global naskah mengudara</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dropdown Pilih Naskah */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Pilih Naskah</label>
            <select 
              value={selectedId} 
              onChange={(e) => setSelectedId(e.target.value)} 
              className="w-full bg-[#0b0d10] border border-gray-800 text-white p-4 rounded-2xl outline-none focus:border-[#008234] font-bold text-sm"
            >
              <option value="">-- Pilih Judul Konten --</option>
              {contents.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Views */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Total Views</label>
              <input 
                type="number" 
                value={stats.views} 
                onChange={e => setStats({...stats, views: parseInt(e.target.value) || 0})} 
                placeholder="0"
                className="w-full bg-[#0b0d10] border border-gray-800 p-4 rounded-2xl text-white font-black text-lg outline-none focus:border-[#008234]" 
              />
            </div>

            {/* Input Engagement */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Total Engagement</label>
              <input 
                type="number" 
                value={stats.engagement} 
                onChange={e => setStats({...stats, engagement: parseInt(e.target.value) || 0})} 
                placeholder="0"
                className="w-full bg-[#0b0d10] border border-gray-800 p-4 rounded-2xl text-white font-black text-lg outline-none focus:border-[#008234]" 
              />
            </div>
          </div>

          {/* Input Link */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 text-blue-500">Tautan Live (URL)</label>
            <div className="relative group">
               <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
               <input 
                type="url" 
                value={stats.link} 
                onChange={e => setStats({...stats, link: e.target.value})} 
                placeholder="https://..."
                className="w-full bg-[#0b0d10] border border-gray-800 pl-12 pr-6 py-4 rounded-2xl text-white font-bold text-xs outline-none focus:border-blue-500" 
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading || !selectedId} 
            className="w-full bg-[#008234] hover:bg-[#006b2a] text-white py-5 rounded-2xl font-black text-xs shadow-xl flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /><span>SIMPAN DATA REKAP</span></>}
          </button>
        </form>
      </div>
    </div>
  );
}