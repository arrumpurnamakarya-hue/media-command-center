"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  CalendarDays, Plus, Edit2, Trash2, X, Clock,
  ChevronLeft, ChevronRight, FileText, Tag, Copy, Check, Sparkles, Eye, Monitor
} from 'lucide-react';

interface ContentPlan {
  id: string;
  title: string;
  pillar: string;
  publish_date: string;
  publish_time: string;
  prod_status: string;
  pub_status?: string;
  platforms: string[];
  copywriting: string;
  caption: string;
}

interface PlanningFormProps {
  isDarkMode?: boolean;
  onPlanAdded?: () => void;
}

const PILLARS = ['Informative', 'Educational', 'Entertaining', 'Promotional', 'Commemorative Day'];
const STATUSES = ['Ideation', 'Drafting', 'Editing/Design', 'Ready to Post', 'Posted'];
const PLATFORMS_LIST = ['IG', 'FB', 'TIKTOK', 'X', 'YT', 'WEB'];
const DAYS_OF_WEEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function PlanningForm({ isDarkMode = true, onPlanAdded }: PlanningFormProps) {
  const [contents, setContents] = useState<ContentPlan[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view'); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [copiedCap, setCopiedCap] = useState(false);
  const [copiedCopy, setCopiedCopy] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [formData, setFormData] = useState<Partial<ContentPlan>>({
    title: '', pillar: 'Informative', publish_date: '', publish_time: '12:00',
    prod_status: 'Ideation', platforms: [], copywriting: '', caption: ''
  });

  const fetchPlans = async () => {
    const { data } = await supabase
      .from('contents')
      .select('*')
      .neq('pillar', 'Imported Data')
      .order('publish_time', { ascending: true });
    
    if (data) setContents(data);
  };

  useEffect(() => { fetchPlans(); }, []);

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const totalSlots = [...blanks, ...days];
  const tailBlanksCount = Math.ceil(totalSlots.length / 7) * 7 - totalSlots.length;
  const tailBlanks = Array.from({ length: tailBlanksCount }, (_, i) => null);
  const calendarCells = [...totalSlots, ...tailBlanks];

  const groupedContents = contents.reduce((acc, curr) => {
    if (!curr.publish_date) return acc;
    if (!acc[curr.publish_date]) acc[curr.publish_date] = [];
    acc[curr.publish_date].push(curr);
    return acc;
  }, {} as Record<string, ContentPlan[]>);

  const handleOpenModal = (item?: ContentPlan, dateStr?: string) => {
    if (item) {
      setFormData(item);
      setModalMode('view'); 
    } else {
      setFormData({
        title: '', pillar: 'Informative', 
        publish_date: dateStr || new Date().toISOString().split('T')[0], 
        publish_time: '12:00', prod_status: 'Ideation', platforms: [], copywriting: '', caption: ''
      });
      setModalMode('edit'); 
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({});
    setCopiedCap(false);
    setCopiedCopy(false);
  };

  const handlePlatformToggle = (plat: string) => {
    const current = formData.platforms || [];
    setFormData({
      ...formData,
      platforms: current.includes(plat) ? current.filter(p => p !== plat) : [...current, plat]
    });
  };

  const generateAutoCaption = () => {
    if (!formData.title) {
      alert("Silakan isi Judul / Tema Konten terlebih dahulu!");
      return;
    }

    const templates = [
      `Langkah nyata dan komitmen penuh dikerahkan secara konsisten dalam mengawal agenda mengenai ${formData.title}. Ini menjadi bukti dedikasi pergerakan struktur yang solid guna memastikan terwujudnya kemaslahatan, kesejahteraan, serta pelayanan terbaik yang berdampak langsung bagi seluruh lapisan masyarakat luas.`,
      `Melalui inisiatif strategis terkait ${formData.title}, kolaborasi dan sinergi kokoh terus digulirkan di lapangan. Momentum krusial ini dikawal secara optimal sebagai kompas utama perjuangan demi menjawab kebutuhan ummat serta membangun kemandirian daerah yang lebih maju dan berdaya saing.`,
      `Realisasi program pembentukan ${formData.title} kini memasuki tahapan krusial. Pengawalan ketat terus berjalan demi memastikan setiap kebijakan dan program kerja dapat diimplementasikan secara nyata serta tepat sasaran demi keadilan sosial dan kemakmuran rakyat.`
    ];

    const randomParagraph = templates[Math.floor(Math.random() * templates.length)];
    const customFooter = `\n\nBaca selengkapnya di: www.pkbgarut.id\n\nPeduli Ummat Melayani Rakyat 🇮🇩\n\n@dpp_pkb @cakiminow @dpwpkbjabar @imas_aan_ubudiah @unjang_asari @cecepmginanjar @subhan_fahmi`;

    setFormData({
      ...formData,
      caption: randomParagraph + customFooter
    });
  };

  const copyToClipboard = (text: string, type: 'cap' | 'copy') => {
    navigator.clipboard.writeText(text);
    if (type === 'cap') { setCopiedCap(true); setTimeout(() => setCopiedCap(false), 2000); }
    if (type === 'copy') { setCopiedCopy(true); setTimeout(() => setCopiedCopy(false), 2000); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = { 
        ...formData, 
        pub_status: formData.prod_status === 'Posted' ? 'Posted' : 'Scheduled' 
      };

      if (formData.id) {
        const { error } = await supabase.from('contents').update(payload).eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('contents').insert([payload]);
        if (error) throw error;
      }

      try {
        await fetch('/api/send-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'Update Jadwal Media Center!',
            message: `Konten baru: ${formData.title} telah ditambahkan ke jadwal.`,
          }),
        });
        console.log('Notifikasi berhasil dikirim ke tim!');
      } catch (notifError) {
        console.error('Gagal memicu notifikasi:', notifError);
      }
      // --- AKHIR KODE NOTIFIKASI ---

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
      handleCloseModal();
    } catch (error: any) {
      alert("Error deleting data: " + error.message);
    }
  };
  

  // --- LOGIKA DRAG AND DROP ---
  const handleDragStart = (e: React.DragEvent, item: ContentPlan) => {
    e.dataTransfer.setData('itemId', item.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Wajib agar onDrop bisa aktif
  };

  const handleDrop = async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('itemId');
    if (!itemId) return;

    // Pembaruan UI Instan (Optimistic Update) agar terasa cepat
    setContents(prev => prev.map(c => c.id === itemId ? { ...c, publish_date: targetDate } : c));

    // Proses sinkronisasi ke server Supabase
    try {
      await supabase.from('contents').update({ publish_date: targetDate }).eq('id', itemId);
      if (onPlanAdded) onPlanAdded(); // trigger statistik pembaruan di header jika diperlukan
    } catch (error) {
      alert("Gagal memindahkan jadwal. Memuat ulang data awal...");
      fetchPlans(); // kembalikan ke awal jika gagal server
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn relative font-inter">
      
      {/* HEADER KALENDER */}
      <div className={`p-6 md:p-8 rounded-[35px] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="text-center md:text-left">
          <h2 className={`text-2xl font-black uppercase tracking-tight flex items-center justify-center md:justify-start gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <CalendarDays className="text-[#008234]" /> Content Calendar
          </h2>
          <p className="text-[10px] text-gray-400 font-bold mt-1 tracking-widest uppercase">Grid Perencanaan & Manajerial Redaksi</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
          <button onClick={goToToday} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-[#0b0d10] border border-gray-800 text-gray-400 hover:text-white' : 'bg-gray-100 border border-gray-200 text-gray-600'}`}>
            Hari Ini
          </button>
          <div className={`flex items-center rounded-xl border p-1 ${isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
            <button onClick={prevMonth} className="p-2 text-gray-400 hover:text-white"><ChevronLeft size={16}/></button>
            <span className="w-28 md:w-36 text-center text-xs font-black uppercase tracking-widest font-roboto truncate">
              {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={nextMonth} className="p-2 text-gray-400 hover:text-white"><ChevronRight size={16}/></button>
          </div>
          <button onClick={() => handleOpenModal()} className="p-2.5 md:p-3 bg-[#008234] hover:bg-green-700 text-white rounded-xl shadow-lg transition-all active:scale-95">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* GRID KALENDER (REVISI RESPONSIVE MOBILE) */}
      <div className={`rounded-[30px] border shadow-sm ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="overflow-x-auto custom-scrollbar rounded-[30px]">
          <div className="min-w-[800px]"> {/* Batas minimum agar di HP bisa di-scroll ke kanan tanpa gepeng */}
            
            <div className="grid grid-cols-7 border-b border-gray-500/20 bg-black/10">
              {DAYS_OF_WEEK.map((day, idx) => (
                <div key={day} className={`p-3 text-center text-[10px] font-black uppercase tracking-widest ${idx === 0 || idx === 6 ? 'text-rose-500' : 'text-gray-500'}`}>
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 bg-gray-500/10 gap-[1px]">
              {calendarCells.map((day, idx) => {
                if (day === null) return <div key={`blank-${idx}`} className={`min-h-[125px] ${isDarkMode ? 'bg-[#161920]' : 'bg-gray-50'} opacity-40`}></div>;

                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayContents = groupedContents[dateStr] || [];
                const isToday = dateStr === new Date().toISOString().split('T')[0];

                return (
                  <div 
                    key={`day-${day}`} 
                    onClick={() => handleOpenModal(undefined, dateStr)} 
                    onDragOver={handleDragOver}     // Aktifkan area drop
                    onDrop={(e) => handleDrop(e, dateStr)} // Eksekusi saat konten dijatuhkan
                    className={`min-h-[125px] p-2 flex flex-col gap-1.5 transition-colors cursor-pointer ${isDarkMode ? 'bg-[#0b0d10] hover:bg-[#13171f]' : 'bg-white hover:bg-gray-50'}`}
                  >
                    <div className="flex justify-end">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-black font-roboto ${isToday ? 'bg-[#008234] text-white shadow-md shadow-green-900/40' : 'text-gray-500'}`}>
                        {day}
                      </span>
                    </div>

                    <div className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar pr-0.5">
                      {dayContents.map((item) => {
                        const isPosted = item.prod_status === 'Posted' || item.pub_status === 'Posted';
                        const isReady = item.prod_status === 'Ready to Post';
                        const isEdit = item.prod_status === 'Editing/Design';
                        
                        const bgClass = isPosted ? 'bg-gray-500/5 border-gray-800 opacity-40 hover:opacity-80' :
                                        isReady  ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20' : 
                                        isEdit   ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20' : 
                                                   'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20';
                        const textClass = isPosted ? 'text-gray-500 line-through' : isReady ? 'text-emerald-400' : isEdit ? 'text-amber-400' : 'text-blue-400';

                        return (
                          <div 
                            key={item.id} 
                            draggable={!isPosted} // Hanya konten belum post yang bisa di-drag
                            onDragStart={(e) => handleDragStart(e, item)}
                            onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }} 
                            className={`p-1.5 rounded-xl border flex flex-col gap-0.5 transition-all ${!isPosted && 'cursor-grab active:cursor-grabbing'} ${bgClass}`}
                            title="Klik tahan untuk menggeser jadwal"
                          >
                            <div className="flex items-center justify-between"><span className={`text-[8px] font-black font-roboto ${textClass}`}>{item.publish_time}</span><span className={`text-[7px] font-black px-1 rounded ${isPosted ? 'bg-gray-800 text-gray-500' : isReady ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>{item.platforms?.slice(0,2).join(',')}</span></div>
                            <div className={`text-[9px] font-bold leading-tight line-clamp-2 ${isPosted ? 'text-gray-600 line-through' : isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>{item.title}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>

      {/* POP-UP MODAL MULTI-FUNGSI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn">
          <div className={`w-full max-w-2xl rounded-[35px] border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
            
            {/* Header Modal */}
            <div className="p-6 md:p-8 flex justify-between items-center border-b border-gray-500/10 bg-black/10">
              <div>
                <h3 className={`text-lg font-black uppercase tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {modalMode === 'view' ? <><Eye size={18} className="text-emerald-500"/> Detail Brief Konten</> : formData.id ? <><Edit2 size={18} className="text-blue-500"/> Edit Rencana Konten</> : <><Plus size={18} className="text-[#008234]"/> Buat Agenda Baru</>}
                </h3>
                <p className="text-[9px] text-gray-500 font-bold uppercase mt-0.5 tracking-wider">Modul Pusat Kendali Distribusi Medsos</p>
              </div>
              <div className="flex items-center gap-2">
                {modalMode === 'view' && (
                  <button onClick={() => setModalMode('edit')} className="p-2 px-4 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><Edit2 size={12}/> Edit Data</button>
                )}
                {modalMode === 'edit' && formData.id && (
                  <button onClick={() => setModalMode('view')} className="p-2 px-4 rounded-xl bg-gray-500/10 text-gray-400 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><Monitor size={12}/> Buka Pop-up Copas</button>
                )}
                {formData.id && (
                  <button onClick={() => handleDelete(formData.id!, formData.title || '')} className="p-2 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 transition-all"><Trash2 size={16}/></button>
                )}
                <button onClick={handleCloseModal} className="p-2 rounded-full bg-gray-500/10 text-gray-400 hover:text-white transition-all"><X size={18}/></button>
              </div>
            </div>

            {/* INTERFACE BACA & SALiN DATA */}
            {modalMode === 'view' ? (
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                <div className="p-4 bg-black/20 rounded-2xl border border-gray-800">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#008234] bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/10">{formData.pillar}</span>
                  <h2 className="text-base font-black text-white mt-3 leading-snug">{formData.title}</h2>
                  <div className="flex gap-4 mt-3 text-[10px] text-gray-500 font-bold font-roboto">
                    <span>📅 {formData.publish_date}</span>
                    <span>⏰ {formData.publish_time} WIB</span>
                    <span className="text-amber-400 uppercase">⚡ Status: {formData.prod_status}</span>
                  </div>
                </div>

                {/* Salin Copywriting Visual */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Brief / Teks untuk Desain Visual</label>
                    <button onClick={() => copyToClipboard(formData.copywriting || '', 'copy')} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/5 px-2.5 py-1 rounded-lg border border-blue-500/10 hover:bg-blue-500 hover:text-white transition-all">
                      {copiedCopy ? <><Check size={12}/> Tersalin</> : <><Copy size={12}/> Salin Visual</>}
                    </button>
                  </div>
                  <div className="p-4 bg-[#0b0d10] border border-gray-800 rounded-xl text-xs text-gray-300 font-medium select-all leading-relaxed whitespace-pre-wrap">
                    {formData.copywriting || <span className="text-gray-700 italic">Belum ada copywriting visual</span>}
                  </div>
                </div>

                {/* Salin Caption */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Draf Caption Utama</label>
                    <button onClick={() => copyToClipboard(formData.caption || '', 'cap')} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/10 hover:bg-emerald-500 hover:text-white transition-all">
                      {copiedCap ? <><Check size={12}/> Tersalin</> : <><Copy size={12}/> Salin Caption</>}
                    </button>
                  </div>
                  <div className="p-4 bg-[#0b0d10] border border-gray-800 rounded-xl text-xs text-gray-300 font-medium select-all leading-relaxed whitespace-pre-wrap font-sans">
                    {formData.caption || <span className="text-gray-700 italic">Belum ada draf caption</span>}
                  </div>
                </div>
              </div>
            ) : (
              /* INTERFACE FORMULIR INPUT EDIT/CREATE */
              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <form id="planningForm" onSubmit={handleSave} className="space-y-5">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5 block">Judul / Tema Utama Konten</label>
                    <input type="text" required value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Contoh: Kawal Implementasi Perbup Pesantren di Garut..." className="w-full p-4 rounded-xl border font-bold text-xs bg-[#0b0d10] border-gray-800 text-white placeholder-gray-700 focus:outline-none focus:border-[#008234]" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5 block">Tanggal Tayang</label>
                      <input type="date" required value={formData.publish_date || ''} onChange={e => setFormData({...formData, publish_date: e.target.value})} className="w-full p-4 rounded-xl border font-roboto font-bold text-xs bg-[#0b0d10] border-gray-800 text-gray-300 focus:outline-none focus:border-[#008234]" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5 block">Jam Tayang</label>
                      <input type="time" required value={formData.publish_time || ''} onChange={e => setFormData({...formData, publish_time: e.target.value})} className="w-full p-4 rounded-xl border font-roboto font-bold text-xs bg-[#0b0d10] border-gray-800 text-gray-300 focus:outline-none focus:border-[#008234]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5 block">Content Pillar</label>
                      <select value={formData.pillar || ''} onChange={e => setFormData({...formData, pillar: e.target.value})} className="w-full p-4 rounded-xl border font-bold text-xs bg-[#0b0d10] border-gray-800 text-gray-300 focus:outline-none focus:border-[#008234]">
                        {PILLARS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5 block">Status Produksi</label>
                      <select value={formData.prod_status || ''} onChange={e => setFormData({...formData, prod_status: e.target.value})} className="w-full p-4 rounded-xl border font-bold text-xs bg-[#0b0d10] border-gray-800 text-gray-300 focus:outline-none focus:border-[#008234]">
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Saluran Distribusi Media</label>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORMS_LIST.map(plat => {
                        const isSelected = formData.platforms?.includes(plat);
                        return (
                          <button type="button" key={plat} onClick={() => handlePlatformToggle(plat)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${isSelected ? 'bg-[#008234] border-[#008234] text-white shadow-lg shadow-green-900/10' : 'bg-[#0b0d10] border-gray-800 text-gray-500 hover:border-gray-700'}`}>
                            {plat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Caption Utama + Fitur Smart AI Generation */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Draft Teks Caption</label>
                      
                      <button type="button" onClick={generateAutoCaption} className="flex items-center gap-1 px-3 py-1 bg-[#008234]/10 border border-[#008234]/30 hover:bg-[#008234] text-[#008234] hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all">
                        <Sparkles size={11}/> Auto-Generate Caption
                      </button>
                    </div>
                    <textarea rows={4} value={formData.caption || ''} onChange={e => setFormData({...formData, caption: e.target.value})} placeholder="Ketik caption atau klik tombol otomatis di atas..." className="w-full p-4 rounded-xl border font-medium text-xs bg-[#0b0d10] border-gray-800 text-gray-300 placeholder-gray-800 focus:outline-none focus:border-[#008234] leading-relaxed"></textarea>
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5 block">Copywriting Ringkas Visual (Teks di Banner/Video)</label>
                    <input type="text" value={formData.copywriting || ''} onChange={e => setFormData({...formData, copywriting: e.target.value})} placeholder="Masukkan teks headline visual..." className="w-full p-4 rounded-xl border font-medium text-xs bg-[#0b0d10] border-gray-800 text-gray-300 placeholder-gray-800 focus:outline-none focus:border-[#008234]" />
                  </div>
                </form>
              </div>
            )}

            {/* Footer Aksi */}
            {modalMode === 'edit' && (
              <div className="p-6 md:p-8 border-t border-gray-500/10 bg-black/10">
                <button type="submit" form="planningForm" disabled={isSubmitting} className="w-full py-4 rounded-xl bg-[#008234] hover:bg-green-700 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg disabled:opacity-40">
                  {isSubmitting ? 'Mengamankan Data...' : formData.id ? 'Simpan Perubahan Agenda' : 'Rencanakan Konten'}
                </button>
              </div>
            )}
            
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #374151; }
      `}</style>
    </div>
  );
}
