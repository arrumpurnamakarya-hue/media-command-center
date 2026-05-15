"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  CalendarDays, Plus, Edit2, Trash2, X, Clock, MapPin, 
  CheckCircle2, AlertTriangle, FileText, Type, Tag, Activity
} from 'lucide-react';

interface ContentPlan {
  id: string;
  title: string;
  pillar: string;
  publish_date: string;
  publish_time: string;
  prod_status: string;
  platforms: string[];
  copywriting: string;
  caption: string;
}

interface PlanningFormProps {
  isDarkMode?: boolean;
  onPlanAdded?: () => void;
}

const PILLARS = ['Strategic', 'Educational', 'Entertaining', 'Promotional', 'Commemorative Day'];
const STATUSES = ['Ideation', 'Drafting', 'Editing/Design', 'Ready to Post'];
const PLATFORMS_LIST = ['IG', 'FB', 'TIKTOK', 'X', 'YT', 'WEB'];

export default function PlanningForm({ isDarkMode = true, onPlanAdded }: PlanningFormProps) {
  const [contents, setContents] = useState<ContentPlan[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State untuk Form
  const [formData, setFormData] = useState<Partial<ContentPlan>>({
    title: '', pillar: 'Strategic', publish_date: '', publish_time: '12:00',
    prod_status: 'Ideation', platforms: [], copywriting: '', caption: ''
  });

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from('contents')
      .select('*')
      .neq('pillar', 'Imported Data') // Sembunyikan data CSV dari kalender
      .order('publish_date', { ascending: true })
      .order('publish_time', { ascending: true });
    
    if (data) setContents(data);
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleOpenModal = (item?: ContentPlan) => {
    if (item) {
      setFormData(item);
    } else {
      setFormData({
        title: '', pillar: 'Strategic', publish_date: new Date().toISOString().split('T')[0], 
        publish_time: '12:00', prod_status: 'Ideation', platforms: [], copywriting: '', caption: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({});
  };

  const handlePlatformToggle = (plat: string) => {
    const current = formData.platforms || [];
    if (current.includes(plat)) {
      setFormData({ ...formData, platforms: current.filter(p => p !== plat) });
    } else {
      setFormData({ ...formData, platforms: [...current, plat] });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = { ...formData, pub_status: 'Scheduled' };
      
      if (formData.id) {
        // Edit Mode
        const { error } = await supabase.from('contents').update(payload).eq('id', formData.id);
        if (error) throw error;
      } else {
        // Insert Mode
        const { error } = await supabase.from('contents').insert([payload]);
        if (error) throw error;
      }

      await fetchPlans();
      if (onPlanAdded) onPlanAdded();
      handleCloseModal();
    } catch (error: any) {
      alert("Error saving data: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Hapus naskah "${title}" dari kalender?`)) return;
    try {
      await supabase.from('contents').delete().eq('id', id);
      await fetchPlans();
      if (onPlanAdded) onPlanAdded();
    } catch (error: any) {
      alert("Error deleting data: " + error.message);
    }
  };

  // Mengelompokkan konten berdasarkan Tanggal untuk UI Kalender
  const groupedContents = contents.reduce((acc, curr) => {
    const date = curr.publish_date || 'TBA';
    if (!acc[date]) acc[date] = [];
    acc[date].push(curr);
    return acc;
  }, {} as Record<string, ContentPlan[]>);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn relative">
      
      {/* HEADER KALENDER */}
      <div className={`p-8 rounded-[35px] border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
        <div>
          <h2 className={`text-2xl font-black uppercase tracking-tight flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <CalendarDays className="text-[#008234]" /> Content Calendar
          </h2>
          <p className="text-xs text-gray-500 mt-2 font-bold tracking-widest uppercase">Agenda Publikasi & Status Produksi Redaksi</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-[#008234] hover:bg-green-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-green-900/20 active:scale-95"
        >
          <Plus size={16} /> Tambah Naskah
        </button>
      </div>

      {/* AGENDA VIEW (DAFTAR KONTEN) */}
      <div className="space-y-6">
        {Object.keys(groupedContents).length === 0 ? (
          <div className={`p-12 text-center rounded-[35px] border ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
            <FileText size={48} className="mx-auto text-gray-600 opacity-20 mb-4" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Belum ada agenda konten yang direncanakan.</p>
          </div>
        ) : (
          Object.keys(groupedContents).map((date) => (
            <div key={date} className={`p-6 md:p-8 rounded-[35px] border ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'} shadow-sm`}>
              
              {/* Separator Tanggal */}
              <div className="flex items-center gap-4 mb-6">
                <div className={`px-4 py-2 rounded-xl text-xs font-black tracking-widest font-roboto ${isDarkMode ? 'bg-[#0b0d10] border border-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                  {new Date(date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="flex-1 h-px bg-gray-500/20"></div>
              </div>

              {/* List Konten di Tanggal Tersebut */}
              <div className="space-y-4">
                {groupedContents[date].map((item) => (
                  <div key={item.id} className={`p-5 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group transition-all ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 hover:border-gray-700' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black px-2 py-1 rounded bg-gray-500/10 text-gray-400 font-roboto flex items-center gap-1">
                          <Clock size={10} /> {item.publish_time}
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${
                          item.prod_status === 'Ready to Post' ? 'bg-[#008234]/10 text-[#008234]' : 
                          item.prod_status === 'Editing/Design' ? 'bg-amber-500/10 text-amber-500' : 
                          'bg-blue-500/10 text-blue-500'
                        }`}>
                          {item.prod_status}
                        </span>
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1 border border-gray-500/20 px-2 py-1 rounded">
                           <Tag size={10}/> {item.pillar}
                        </span>
                      </div>
                      <h3 className={`text-sm font-black mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.title}</h3>
                      <div className="flex items-center gap-1.5">
                        {item.platforms?.map(p => (
                           <span key={p} className="text-[8px] font-black bg-gray-500/20 text-gray-400 px-1.5 py-0.5 rounded">{p}</span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity w-full md:w-auto justify-end mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-0 border-gray-500/20">
                      <button onClick={() => handleOpenModal(item)} className="p-2 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(item.id, item.title)} className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL POP-UP FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className={`w-full max-w-2xl rounded-[30px] border shadow-2xl flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
            
            <div className="p-6 md:p-8 flex justify-between items-center border-b border-gray-500/10">
              <div>
                <h3 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formData.id ? 'Edit Naskah' : 'Tambah Naskah Baru'}
                </h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Formulir Perencanaan Redaksi</p>
              </div>
              <button onClick={handleCloseModal} className="p-2 rounded-full bg-gray-500/10 text-gray-400 hover:text-white transition-all"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <form id="planningForm" onSubmit={handleSave} className="space-y-6">
                
                {/* Judul */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Judul / Tema Konten</label>
                  <input type="text" required value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Contoh: Liputan Kunjungan SMAN 8..." className={`w-full p-4 rounded-xl border font-bold text-sm focus:outline-none focus:border-[#008234] transition-colors ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white placeholder-gray-700' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                </div>

                {/* Tanggal & Waktu (Menggunakan font-roboto untuk angka) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Tanggal Tayang</label>
                    <input type="date" required value={formData.publish_date || ''} onChange={e => setFormData({...formData, publish_date: e.target.value})} className={`w-full p-4 rounded-xl border font-roboto font-bold text-sm focus:outline-none focus:border-[#008234] ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Jam Tayang</label>
                    <input type="time" required value={formData.publish_time || ''} onChange={e => setFormData({...formData, publish_time: e.target.value})} className={`w-full p-4 rounded-xl border font-roboto font-bold text-sm focus:outline-none focus:border-[#008234] ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                  </div>
                </div>

                {/* Pillar & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Content Pillar</label>
                    <select value={formData.pillar || ''} onChange={e => setFormData({...formData, pillar: e.target.value})} className={`w-full p-4 rounded-xl border font-bold text-sm focus:outline-none focus:border-[#008234] ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                      {PILLARS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Status Produksi</label>
                    <select value={formData.prod_status || ''} onChange={e => setFormData({...formData, prod_status: e.target.value})} className={`w-full p-4 rounded-xl border font-bold text-sm focus:outline-none focus:border-[#008234] ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Platforms (Multi-Select Pills) */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 block">Distribusi Platform</label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS_LIST.map(plat => {
                      const isSelected = formData.platforms?.includes(plat);
                      return (
                        <button type="button" key={plat} onClick={() => handlePlatformToggle(plat)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${isSelected ? 'bg-[#008234] border-[#008234] text-white shadow-lg shadow-green-900/20' : isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-500 hover:border-gray-600' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                          {plat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Naskah & Copywriting */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Draft Caption / Naskah</label>
                  <textarea rows={4} value={formData.caption || ''} onChange={e => setFormData({...formData, caption: e.target.value})} placeholder="Tuliskan draf teks untuk postingan..." className={`w-full p-4 rounded-xl border font-medium text-sm leading-relaxed focus:outline-none focus:border-[#008234] ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-300 placeholder-gray-700' : 'bg-gray-50 border-gray-200 text-gray-900'}`}></textarea>
                </div>
                
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Copywriting Visual (Teks di Gambar/Video)</label>
                  <input type="text" value={formData.copywriting || ''} onChange={e => setFormData({...formData, copywriting: e.target.value})} placeholder="Teks hook untuk desain visual..." className={`w-full p-4 rounded-xl border font-medium text-sm focus:outline-none focus:border-[#008234] ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-gray-300 placeholder-gray-700' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                </div>

              </form>
            </div>

            <div className="p-6 md:p-8 border-t border-gray-500/10">
              <button type="submit" form="planningForm" disabled={isSubmitting} className="w-full py-4 rounded-xl bg-[#008234] hover:bg-green-700 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-green-900/20 disabled:opacity-50">
                {isSubmitting ? 'Menyimpan...' : 'Simpan ke Kalender'}
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}