"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Lightbulb, PenTool, Palette, CheckCircle2, 
  MoreVertical, Clock, Tag, MessageSquare
} from 'lucide-react';

interface ContentPlan {
  id: string;
  title: string;
  pillar: string;
  publish_date: string;
  publish_time: string;
  prod_status: string;
  platforms: string[];
}

const COLUMNS = [
  { id: 'Ideation', title: 'Ideation / Instruksi', icon: <Lightbulb size={16} />, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { id: 'Drafting', title: 'Drafting / Naskah', icon: <PenTool size={16} />, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { id: 'Editing/Design', title: 'Editing / Visual', icon: <Palette size={16} />, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { id: 'Ready to Post', title: 'Siap Tayang', icon: <CheckCircle2 size={16} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' }
];

export default function Jobdesk({ isDarkMode = true }: { isDarkMode?: boolean }) {
  const [tasks, setTasks] = useState<ContentPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    setLoading(true);
    // Hanya ambil yang belum tayang (Posted) dan bukan data historis CSV
    const { data } = await supabase
      .from('contents')
      .select('*')
      .neq('pub_status', 'Posted')
      .neq('pillar', 'Imported Data')
      .order('publish_date', { ascending: true });
    
    if (data) setTasks(data);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, []);

  const moveTask = async (id: string, newStatus: string) => {
    // Update UI instan (Optimistic UI)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, prod_status: newStatus } : t));
    
    // Update ke Database
    await supabase.from('contents').update({ prod_status: newStatus }).eq('id', id);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-emerald-500 animate-pulse font-black tracking-widest uppercase text-xs">Memuat Papan Redaksi...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
      
      {/* HEADER JOBDESK */}
      <div className={`p-6 md:p-8 rounded-[35px] border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'}`}>
        <div>
          <h2 className={`text-2xl font-black uppercase tracking-tight flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <CheckCircle2 className="text-[#008234]" /> Papan Jobdesk Redaksi
          </h2>
          <p className="text-[10px] text-gray-500 mt-1 font-bold tracking-widest uppercase">Katalog Instruksi & Alur Eksekusi Konten</p>
        </div>
      </div>

      {/* KANBAN BOARD GRID */}
      <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.prod_status === col.id);
          
          return (
            <div key={col.id} className={`min-w-[300px] w-full flex flex-col rounded-[30px] border p-4 ${isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
              
              {/* Kolom Header */}
              <div className={`flex items-center justify-between p-3 rounded-2xl border mb-4 ${col.bg} ${col.border}`}>
                <div className="flex items-center gap-2">
                  <div className={col.color}>{col.icon}</div>
                  <h3 className={`text-[11px] font-black uppercase tracking-widest ${col.color}`}>{col.title}</h3>
                </div>
                <span className={`text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full bg-black/20 ${col.color}`}>
                  {colTasks.length}
                </span>
              </div>

              {/* Task Cards */}
              <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-1">
                {colTasks.length === 0 ? (
                  <div className="text-center py-10 text-[9px] font-bold text-gray-600 uppercase tracking-widest border-2 border-dashed border-gray-800/50 rounded-2xl">
                    Kosong
                  </div>
                ) : (
                  colTasks.map(task => (
                    <div key={task.id} className={`p-4 rounded-2xl border shadow-sm group transition-all hover:border-gray-500 ${isDarkMode ? 'bg-[#0b0d10] border-gray-800' : 'bg-white border-gray-200'}`}>
                      
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-wrap gap-1">
                          {task.platforms?.map(p => (
                            <span key={p} className="text-[8px] font-black px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{p}</span>
                          ))}
                        </div>
                        
                        {/* Dropdown Aksi Pindah Status */}
                        <div className="relative inline-block text-left group/dropdown">
                          <button className="text-gray-500 hover:text-white transition-colors">
                            <MoreVertical size={14} />
                          </button>
                          <div className={`absolute right-0 mt-1 w-36 rounded-xl shadow-2xl border opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all z-10 ${isDarkMode ? 'bg-[#161920] border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className="p-1">
                              <div className="text-[8px] font-black uppercase text-gray-500 px-2 py-1">Pindah ke:</div>
                              {COLUMNS.filter(c => c.id !== task.prod_status).map(c => (
                                <button key={c.id} onClick={() => moveTask(task.id, c.id)} className="w-full text-left px-2 py-1.5 text-[10px] font-bold text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors">
                                  {c.title}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <h4 className={`text-xs font-black leading-snug mb-3 line-clamp-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {task.title}
                      </h4>

                      <div className="flex items-center justify-between text-[9px] font-bold text-gray-500 pt-3 border-t border-gray-800">
                        <div className="flex items-center gap-1">
                          <Clock size={10} /> {task.publish_date}
                        </div>
                        <div className="flex items-center gap-1 max-w-[50%] truncate">
                          <Tag size={10} /> {task.pillar}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}