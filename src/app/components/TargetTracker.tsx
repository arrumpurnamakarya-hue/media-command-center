'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Target, TrendingUp, MessageCircle, Layers, Globe } from 'lucide-react';

interface WeeklyTarget {
  label: string;
  current: number;
  max: number;
  unit: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

export default function TargetTracker() {
  const [targets, setTargets] = useState<WeeklyTarget[]>([
    { label: 'Artikel Website', current: 0, max: 35, unit: 'artikel', icon: <Globe size={14} />, color: 'text-blue-600', bgColor: 'bg-blue-500' },
    { label: 'Cross-Post Platform', current: 0, max: 7, unit: 'post', icon: <Layers size={14} />, color: 'text-purple-600', bgColor: 'bg-purple-500' },
    { label: 'Total Reach', current: 0, max: 3500, unit: 'reach', icon: <TrendingUp size={14} />, color: 'text-emerald-600', bgColor: 'bg-emerald-500' },
    { label: 'Response Rate', current: 0, max: 100, unit: '%', icon: <MessageCircle size={14} />, color: 'text-amber-600', bgColor: 'bg-amber-500' },
    { label: 'Pilar Coverage', current: 0, max: 5, unit: 'pilar', icon: <Target size={14} />, color: 'text-rose-600', bgColor: 'bg-rose-500' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyProgress();
  }, []);

  const fetchWeeklyProgress = async () => {
    try {
      // Hitung minggu ini (Senin - Minggu)
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const mondayStr = monday.toISOString().split('T')[0];
      const sundayStr = sunday.toISOString().split('T')[0];

      // 1. Count artikel dari WordPress (articles table)
      const { count: articleCount } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .gte('synced_at', monday.toISOString());

      // 2. Count konten yang sudah Posted minggu ini
      const { count: postedCount } = await supabase
        .from('contents')
        .select('*', { count: 'exact', head: true })
        .eq('pub_status', 'Posted')
        .gte('publish_date', mondayStr)
        .lte('publish_date', sundayStr);

      // 3. Sum reach dari performance_recaps
      const { data: reachData } = await supabase
        .from('performance_recaps')
        .select('reach')
        .gte('recorded_date', mondayStr)
        .lte('recorded_date', sundayStr);

      const totalReach = reachData?.reduce((sum, r) => sum + (r.reach || 0), 0) || 0;

      // 4. Count unique pillars minggu ini
      const { data: pillarData } = await supabase
        .from('contents')
        .select('pillar')
        .gte('publish_date', mondayStr)
        .lte('publish_date', sundayStr);

      const uniquePillars = new Set(pillarData?.map(p => p.pillar) || []).size;

      setTargets([
        { label: 'Artikel Website', current: articleCount || 0, max: 35, unit: 'artikel', icon: <Globe size={14} />, color: 'text-blue-600', bgColor: 'bg-blue-500' },
        { label: 'Cross-Post Platform', current: postedCount || 0, max: 7, unit: 'post', icon: <Layers size={14} />, color: 'text-purple-600', bgColor: 'bg-purple-500' },
        { label: 'Total Reach', current: totalReach, max: 3500, unit: 'reach', icon: <TrendingUp size={14} />, color: 'text-emerald-600', bgColor: 'bg-emerald-500' },
        { label: 'Response Rate', current: 0, max: 100, unit: '%', icon: <MessageCircle size={14} />, color: 'text-amber-600', bgColor: 'bg-amber-500' },
        { label: 'Pilar Coverage', current: uniquePillars, max: 5, unit: 'pilar', icon: <Target size={14} />, color: 'text-rose-600', bgColor: 'bg-rose-500' },
      ]);
    } catch (err) {
      console.error('Gagal fetch target:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPercentage = (current: number, max: number) => Math.min(100, Math.round((current / max) * 100));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b pb-3">
        <h4 className="text-xs font-black uppercase tracking-wider">Target Mingguan</h4>
        <span className="text-[9px] text-gray-400 font-bold bg-gray-100 px-2 py-1 rounded-full">Senin - Minggu</span>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-gray-400">Loading target...</div>
      ) : (
        <div className="space-y-4">
          {targets.map((t, i) => {
            const pct = getPercentage(t.current, t.max);
            const isComplete = pct >= 100;
            
            return (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className={`${t.color}`}>{t.icon}</span>
                    <span className="text-[11px] font-bold text-gray-700">{t.label}</span>
                  </div>
                  <span className={`text-[11px] font-black ${isComplete ? 'text-emerald-600' : t.color}`}>
                    {t.current}/{t.max} {t.unit}
                  </span>
                </div>
                
                {/* Health Bar / Progress Bar */}
                <div className="relative h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-700 rounded-full ${isComplete ? 'bg-emerald-500' : t.bgColor}`}
                    style={{ width: `${pct}%` }}
                  />
                  {isComplete && (
                    <div className="absolute inset-0 flex items-center justify-end pr-1">
                      <span className="text-[7px] text-white font-black">✓</span>
                    </div>
                  )}
                </div>
                
                {/* Mini Circular Progress */}
                <div className="flex justify-end">
                  <div className="relative w-6 h-6">
                    <svg className="w-6 h-6 transform -rotate-90">
                      <circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="2" fill="none" />
                      <circle 
                        cx="12" cy="12" r="10" 
                        stroke={isComplete ? '#10b981' : t.bgColor.replace('bg-', '').replace('500', '500') === 'blue-500' ? '#3b82f6' : t.bgColor.includes('purple') ? '#a855f7' : t.bgColor.includes('emerald') ? '#10b981' : t.bgColor.includes('amber') ? '#f59e0b' : '#f43f5e'} 
                        strokeWidth="2" 
                        fill="none" 
                        strokeDasharray={`${pct * 0.628} 62.8`} 
                        className="transition-all duration-700"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-gray-600">
                      {pct}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}