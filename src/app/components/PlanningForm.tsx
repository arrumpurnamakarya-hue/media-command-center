"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Save, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  Layers 
} from 'lucide-react';

interface PlanningFormProps {
  isDarkMode?: boolean;
  onPlanAdded?: () => void;
}

export default function PlanningForm({ isDarkMode = true, onPlanAdded }: PlanningFormProps) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk mengontrol Pop-Up Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Form Input
  const [title, setTitle] = useState('');
  const [pillar, setPillar] = useState('Strategic');
  const [publishDate, setPublishDate] = useState('');
  const [publishTime, setPublishTime] = useState('09:00');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [copywriting, setCopywriting] = useState('');
  const [caption, setCaption] = useState('');
  const [prodStatus, setProdStatus] = useState('Drafting');

  // Daftar Pilar Konten Lengkap (Termasuk Commemorative Day)
  const pillarsList = [
    'Strategic',
    'Educational',
    'Informative',
    'Programmatic',
    'Commemorative Day' // <-- Pilar baru yang diinjeksi
  ];

  const availablePlatforms = ['Meta (FB/IG)', 'TikTok', 'X (Twitter)', 'Website', 'YT Shorts'];
  const statusOptions = ['Drafting', 'Scheduled', 'Posted'];

  // Mengambil daftar rencana konten dari Supabase
  const fetchPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contents')
      .select('*')
      .order('publish_date', { ascending: true }); // Diurutkan dari tanggal terdekat
    
    if (data) setPlans(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Handler Multi-select Platform
  const togglePlatform = (plat: string) => {
    setPlatforms(prev => 
      prev.includes(plat) ? prev.filter(p => p !== plat) : [...prev, plat]
    );
  };

  // Membuka Modal untuk Tambah Konten Baru
  const handleOpenAddModal = () => {
    setEditId(null);
    setTitle('');
    setPillar('Strategic');
    setPublishDate(new Date().toISOString().split('T')[0]);
    setPublishTime('09:00');
    setPlatforms(['Meta (FB/IG)']);
    setCopywriting('');
    setCaption('');
    setProdStatus('Drafting');
    setIsModalOpen(true);
  };

  // Membuka Modal dan Mengisi Data untuk Mode Edit
  const handleOpenEditModal = (item: any) => {
    setEditId(item.id);
    setTitle(item.title || '');
    setPillar(item.pillar || 'Strategic');
    setPublishDate(item.publish_date || '');
    setPublishTime(item.publish_time || '09:00');
    
    // Parse platform jika tersimpan sebagai JSON/string/array
    let parsedPlatforms: string[] = [];
    if (Array.isArray(item.platforms)) {
      parsedPlatforms = item.platforms;
    } else if (typeof item.platforms === 'string') {
      try { parsedPlatforms = JSON.parse(item.platforms); } catch { parsedPlatforms = [item.platforms]; }
    }
    setPlatforms(parsedPlatforms);
    
    setCopywriting(item.copywriting || '');
    setCaption(item.caption || '');
    setProdStatus(item.prod_status || item.pub_status || 'Drafting');
    setIsModalOpen(true);
  };

  // Eksekusi Simpan (Insert / Update) ke Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !publishDate) {
      alert("Judul dan Tanggal Tayang wajib diisi!");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      title,
      pillar,
      publish_date: publishDate,
      publish_time: publishTime,
      platforms,
      copywriting,
      caption,
      prod_status: prodStatus,
      pub_status: prodStatus === 'Posted' ? 'Posted' : 'Draft',
    };

    if (editId) {
      // MODE UPDATE
      const { error } = await supabase.from('contents').update(payload).eq('id', editId);
      if (error) alert("Gagal memperbarui: " + error.message);
      else {
        setPlans(prev => prev.map(p => p.id === editId ? { ...p, ...payload } : p));
        setIsModalOpen(false);
        if (onPlanAdded) onPlanAdded();
      }
    } else {
      // MODE INSERT BARU
      const { data, error } = await supabase.from('contents').insert([payload]).select();
      if (error) alert("Gagal menyimpan: " + error.message);
      else {
        if (data) setPlans(prev => [...prev, ...data]);
        setIsModalOpen(false);
        if (onPlanAdded) onPlanAdded();
      }
    }
    setIsSubmitting(false);
  };

  // Eksekusi Hapus Data
  const handleDelete = async (id: string, titleStr: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus rencana tayang "${titleStr}"?`)) return;

    const { error } = await supabase.from('contents').delete().eq('id', id);
    if (error) alert("Gagal menghapus: " + error.message);
    else {
      setPlans(prev => prev.filter(p => p.id !== id));
      if (onPlanAdded) onPlanAdded();
    }
  };

  // Styling Dinamis
  const bgCard = isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200';
  const bgInput = isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white focus:border-emerald-500' : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-emerald-600';
  const textTitle = isDarkMode ? 'text-white' : 'text-gray-900';

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* HEADER TAB PLANNING & TOMBOL PICU POP-UP MODAL */}
      <div className={`p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${bgCard}`}>
        <div>
          <h2 className={`text-xl font-black tracking-tight ${textTitle} flex items-center gap-2`}>
            <CalendarIcon className="text-emerald-500" size={22} /> MANAJEMEN KALENDER & JADWAL KONTEN
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Linimasa rencana produksi, pengawalan brief, dan tenggat waktu siaran media
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs tracking-wider uppercase transition-all shadow-md active:scale-95 self-start md:self-auto"
        >
          <Plus size={16} strokeWidth={3} /> TAMBAH RENCANA
        </button>
      </div>

      {/* TAMPILAN DAFTAR KALENDER / JADWAL KONTEN */}
      <div className="space-y-3">
        {loading ? (
          <div className={`p-12 text-center rounded-3xl border ${bgCard}`}>
            <Loader2 className="animate-spin mx-auto text-emerald-500 mb-2" size={24} />
            <span className="text-xs font-bold text-gray-500">Memuat linimasa kalender...</span>
          </div>
        ) : plans.length === 0 ? (
          <div className={`p-12 text-center rounded-3xl border ${bgCard}`}>
            <p className="text-sm font-semibold text-gray-500">Belum ada agenda tayang yang terdaftar.</p>
            <button 
              onClick={handleOpenAddModal} 
              className="mt-3 text-xs font-bold text-emerald-500 underline hover:text-emerald-400"
            >
              Buat jadwal pertama Anda sekarang
            </button>
          </div>
        ) : (
          plans.map((item) => {
            const isPosted = item.pub_status === 'Posted' || item.prod_status === 'Posted';
            
            return (
              <div 
                key={item.id} 
                className={`p-5 rounded-2xl border transition-all hover:border-emerald-500/40 flex flex-col md:flex-row md:items-center justify-between gap-4 ${bgCard}`}
              >
                {/* Sisi Kiri: Informasi Waktu & Detail Jadwal */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Badge Status Produksi */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border ${
                      isPosted
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                        : item.prod_status === 'Scheduled'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                      {item.prod_status || 'Drafting'}
                    </span>

                    {/* Pilar Konten */}
                    <span className="text-[10px] font-bold text-gray-400 px-2 py-0.5 rounded bg-gray-500/10 border border-gray-500/10">
                      {item.pillar || 'Strategic'}
                    </span>

                    {/* Penunjuk Waktu berbasis Font Roboto */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 bg-gray-500/5 px-2 py-0.5 rounded border border-gray-500/5">
                      <Clock size={12} className="text-emerald-500" />
                      <span className="font-roboto text-emerald-400">{item.publish_date}</span>
                      <span>•</span>
                      <span className="font-roboto">{item.publish_time || '09:00'} WIB</span>
                    </div>
                  </div>

                  <h3 className={`text-base font-bold tracking-tight ${textTitle}`}>
                    {item.title}
                  </h3>

                  {/* Kanal Distribusi Terpilih */}
                  {item.platforms && item.platforms.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[9px] font-extrabold text-gray-500 uppercase tracking-widest">Kanal:</span>
                      {(Array.isArray(item.platforms) ? item.platforms : [item.platforms]).map((plat: string, pi: number) => (
                        <span key={pi} className="text-[9px] font-black px-2 py-0.5 rounded bg-gray-500/10 text-gray-300">
                          {plat}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Cuplikan Caption/Brief jika ada */}
                  {item.caption && (
                    <p className="text-xs text-gray-400 line-clamp-1 italic border-l-2 border-gray-700 pl-2">
                      "{item.caption}"
                    </p>
                  )}
                </div>

                {/* Sisi Kanan: Tombol Aksi CRUD */}
                <div className="flex items-center gap-2 self-end md:self-center border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto justify-end border-gray-800">
                  <button
                    onClick={() => handleOpenEditModal(item)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold text-xs transition-all border border-blue-500/10"
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.title)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-xs transition-all border border-red-500/10"
                  >
                    <Trash2 size={14} /> Hapus
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ==========================================
          POP-UP MODAL OVERLAY (TAMBAH / EDIT KONTEN) 
          ========================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl p-6 md:p-8 ${bgCard} relative`}>
            
            {/* Tombol Tutup Modal */}
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 transition-all"
            >
              <X size={18} />
            </button>

            <div className="mb-6">
              <h3 className={`text-xl font-black tracking-tight ${textTitle}`}>
                {editId ? 'UBAH AGENDA JADWAL' : 'RANCANG KONTEN BARU'}
              </h3>
              <p className="text-xs text-gray-500">Isi parameter siaran dan arahan redaksi di bawah ini</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Baris 1: Judul Naskah */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Judul Naskah / Konten *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Liputan Kunjungan Kerja Daerah..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-xs font-bold outline-none transition-all ${bgInput}`}
                />
              </div>

              {/* Baris 2: Pilar Konten & Status Produksi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Pilar Strategis</label>
                  <select
                    value={pillar}
                    onChange={e => setPillar(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-xs font-bold outline-none cursor-pointer transition-all ${bgInput}`}
                  >
                    {pillarsList.map((p, idx) => (
                      <option key={idx} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Status Kesiapan</label>
                  <select
                    value={prodStatus}
                    onChange={e => setProdStatus(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-xs font-bold outline-none cursor-pointer transition-all ${bgInput}`}
                  >
                    {statusOptions.map((st, idx) => (
                      <option key={idx} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Baris 3: Tanggal & Waktu Siaran */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tanggal Rilis *</label>
                  <input
                    type="date"
                    required
                    value={publishDate}
                    onChange={e => setPublishDate(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-xs font-bold outline-none transition-all font-roboto ${bgInput}`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Waktu Siaran (WIB)</label>
                  <input
                    type="time"
                    value={publishTime}
                    onChange={e => setPublishTime(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-xs font-bold outline-none transition-all font-roboto ${bgInput}`}
                  />
                </div>
              </div>

              {/* Baris 4: Saluran Distribusi (Multi-Select Pills) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Kanal Cross-Posting</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {availablePlatforms.map((plat) => {
                    const isSelected = platforms.includes(plat);
                    return (
                      <button
                        type="button"
                        key={plat}
                        onClick={() => togglePlatform(plat)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                          isSelected 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' 
                            : 'bg-gray-500/5 text-gray-500 border-gray-500/10 hover:border-gray-500/20'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${isSelected ? 'bg-emerald-500 border-emerald-500':'border-gray-600'}`}>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                        </div>
                        {plat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Baris 5: Copywriting / Brief Arahan */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Brief / Deskripsi Naskah</label>
                <textarea
                  rows={2}
                  placeholder="Tulis arahan desain, poin naskah, atau catatan peliputan..."
                  value={copywriting}
                  onChange={e => setCopywriting(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-xs font-medium outline-none transition-all resize-none ${bgInput}`}
                />
              </div>

              {/* Baris 6: Caption Siaran */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Caption Media Sosial</label>
                <textarea
                  rows={2}
                  placeholder="Tulis draf takarir (caption) lengkap dengan tagar..."
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-xs font-medium outline-none transition-all resize-none ${bgInput}`}
                />
              </div>

              {/* Tombol Simpan Form Modal */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs tracking-wider uppercase transition-all shadow-lg active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> MENYIMPAN JADWAL...
                    </>
                  ) : (
                    <>
                      <Save size={16} /> {editId ? 'SIMPAN PERUBAHAN AGENDA' : 'TERBITKAN RENCANA KONTEN'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}