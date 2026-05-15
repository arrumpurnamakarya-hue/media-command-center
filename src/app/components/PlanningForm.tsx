"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  CalendarDays, Plus, Edit2, Trash2, X, Clock,
  ChevronLeft, ChevronRight, FileText, Tag
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
const DAYS_OF_WEEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function PlanningForm({ isDarkMode = true, onPlanAdded }: PlanningFormProps) {
  const [contents, setContents] = useState<ContentPlan[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // STATE KALENDER
  const [currentDate, setCurrentDate] = useState(new Date());

  // State Formulir
  const [formData, setFormData] = useState<Partial<ContentPlan>>({
    title: '', pillar: 'Strategic', publish_date: '', publish_time: '12:00',
    prod_status: 'Ideation', platforms: [], copywriting: '', caption: ''
  });

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from('contents')
      .select('*')
      .neq('pillar', 'Imported Data') // Sembunyikan data CSV dari kalender
      .order('publish_time', { ascending: true }); // Urutkan jam dalam satu hari
    
    if (data) setContents(data);
  };

  useEffect(() => { fetchPlans(); }, []);

  // LOGIKA NAVIGASI KALENDER
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // LOGIKA RENDER GRID KALENDER
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Minggu, 6 = Sabtu

  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const totalSlots = [...blanks, ...days];
  
  // Memastikan grid genap (kelipatan 7) agar baris terakhir tidak menggantung
  const tailBlanksCount = Math.ceil(totalSlots.length / 7) * 7 - totalSlots.length;
  const tailBlanks = Array.from({ length: tailBlanksCount }, (_, i) => null);
  const calendarCells = [...totalSlots, ...tailBlanks];

  // Map Data ke Tanggal
  const groupedContents = contents.reduce((acc, curr) => {
    if (!curr.publish_date) return acc;
    if (!acc[curr.publish_date]) acc[curr.publish_date] = [];
    acc[curr.publish_date].push(curr);
    return acc;
  }, {} as Record<string, ContentPlan[]>);

  // LOGIKA MODAL FORMULIR
  const handleOpenModal = (item?: ContentPlan, dateStr?: string) => {
    if (item) {
      setFormData(item);
    } else {
      setFormData({
        title: '', pillar: 'Strategic', 
        publish_date: dateStr || new Date().toISOString().split('T')[0], 
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
        const { error } = await supabase.from('contents').update(payload).eq('id', formData.id);
        if (error) throw error;
      } else {
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
      handleCloseModal(); // Tutup modal jika dihapus dari dalam modal
    } catch (error: any) {
      alert("Error deleting data: " + error.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn relative">
      
      {/* HEADER KALENDER */}
      <div className={`p-6 md:p-8 rounded-[35px] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-6">
          <div>
            <h2 className={`text-2xl font-black uppercase tracking-tight flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <CalendarDays className="text-[#008234]" /> Content Calendar
            </h2>
            <p className="text-[10px] text-gray-500 mt-1 font-bold tracking-widest uppercase">Grid Perencanaan Redaksi</p>
          </div>
        </div>

        {/* KONTROL BULAN */}
        <div className="flex items-center gap-4">
          <button onClick={goToToday} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-[#0b0d10] border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600' : 'bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200'}`}>
            Hari Ini
          </button>
          <div className={`flex items-center rounded-xl border p-1 ${isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
            <button onClick={prevMonth} className={`p-2 rounded-lg transition-all ${isDarkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-white text-gray-600'}`}><ChevronLeft size={16}/></button>
            <span className={`w-32 text-center text-xs font-black uppercase tracking-widest font-roboto ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={nextMonth} className={`p-2 rounded-lg transition-all ${isDarkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-white text-gray-600'}`}><ChevronRight size={16}/></button>
          </div>
          <button onClick={() => handleOpenModal()} className="p-3 bg-[#008234] hover:bg-green-700 text-white rounded-xl transition-all shadow-lg shadow-green-900/20 active:scale-95">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* GRID KALENDER ALA GOOGLE CALENDAR */}
      <div className={`rounded-[30px] border overflow-hidden shadow-sm ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
        
        {/* NAMA HARI */}
        <div className="grid grid-cols-7 border-b border-gray-500/20">
          {DAYS_OF_WEEK.map((day, idx) => (
            <div key={day} className={`p-3 text-center text-[10px] font-black uppercase tracking-widest ${idx === 0 || idx === 6 ? 'text-rose-500' : isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
              {day}
            </div>
          ))}
        </div>

        {/* KOTAK-KOTAK TANGGAL */}
        <div className={`grid grid-cols-7 bg-gray-500/10 gap-[1px] ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          {calendarCells.map((day, idx) => {
            if (day === null) {
              return <div key={`blank-${idx}`} className={`min-h-[120px] ${isDarkMode ? 'bg-[#161920]' : 'bg-gray-50'} opacity-50`}></div>;
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayContents = groupedContents[dateStr] || [];
            
            // Cek apakah ini hari ini
            const todayStr = new Date().toISOString().split('T')[0];
            const isToday = dateStr === todayStr;

            return (
              <div 
                key={`day-${day}`} 
                onClick={() => handleOpenModal(undefined, dateStr)} // Klik kotak kosong = tambah naskah di hari itu
                className={`min-h-[120px] p-2 flex flex-col gap-1.5 transition-colors cursor-pointer group ${isDarkMode ? 'bg-[#0b0d10] hover:bg-[#161920]' : 'bg-white hover:bg-gray-50'}`}
              >
                {/* Angka Tanggal */}
                <div className="flex justify-end mb-1">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-black font-roboto ${
                    isToday ? 'bg-[#008234] text-white shadow-md shadow-green-900/50' : 
                    isDarkMode ? 'text-gray-500 group-hover:text-white transition-colors' : 'text-gray-600'
                  }`}>
                    {day}
                  </span>
                </div>

                {/* List Naskah (Pills) */}
                <div className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar">
                  {dayContents.map((item) => {
                    // Warna berdasarkan status
                    const isReady = item.prod_status === 'Ready to Post';
                    const isEdit = item.prod_status === 'Editing/Design';
                    
                    const bgClass = isReady ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30' : 
                                    isEdit  ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30' : 
                                              'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30';
                    const textClass = isReady ? 'text-emerald-500' : isEdit ? 'text-amber-500' : 'text-blue-500';

                    return (
                      <div 
                        key={item.id}
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }} // Klik pill = Edit naskah
                        className={`p-1.5 rounded-lg border flex flex-col gap-1 transition-all active:scale-95 ${bgClass}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[8px] font-black font-roboto ${textClass}`}>{item.publish_time}</span>
                          <span className={`text-[7px] font-black px-1 rounded uppercase tracking-tighter ${isReady ? 'bg-emerald-500/20 text-emerald-400' : isEdit ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {item.platforms?.length || 0} Plat
                          </span>
                        </div>
                        <div className={`text-[9px] font-bold leading-tight line-clamp-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                          {item.title}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL POP-UP FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className={`w-full max-w-2xl rounded-[30px] border shadow-2xl flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
            
            <div className="p-6 md:p-8 flex justify-between items-center border-b border-gray-500/10">
              <div>
                <h3 className={`text-xl font-black uppercase tracking-tight flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formData.id ? <><Edit2 className="text-blue-500"/> Edit Naskah</> : <><Plus className="text-[#008234]"/> Tambah Naskah</>}
                </h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Formulir Perencanaan Redaksi</p>
              </div>
              <div className="flex items-center gap-2">
                {formData.id && (
                  <button type="button" onClick={() => handleDelete(formData.id!, formData.title || '')} className="p-2 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={20}/></button>
                )}
                <button onClick={handleCloseModal} className="p-2 rounded-full bg-gray-500/10 text-gray-400 hover:text-white transition-all"><X size={20}/></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <form id="planningForm" onSubmit={handleSave} className="space-y-6">
                
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Judul / Tema Konten</label>
                  <input type="text" required value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Contoh: Liputan Kunjungan SMAN 8..." className={`w-full p-4 rounded-xl border font-bold text-sm focus:outline-none focus:border-[#008234] transition-colors ${isDarkMode ? 'bg-[#0b0d10] border-gray-800 text-white placeholder-gray-700' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                </div>

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
                {isSubmitting ? 'Menyimpan...' : formData.id ? 'Simpan Perubahan' : 'Masukkan ke Kalender'}
              </button>
            </div>
            
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #4B5563; }
      `}</style>
    </div>
  );
}