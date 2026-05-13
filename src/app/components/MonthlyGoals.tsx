'use client';

import React from 'react';
import { Trophy, Users, MousePointerClick, Flame, FileCheck } from 'lucide-react';

interface Goal {
  label: string;
  current: number;
  target: string;
  icon: React.ReactNode;
  color: string;
}

export default function MonthlyGoals() {
  const goals: Goal[] = [
    { label: 'Pengikut Baru', current: 0, target: '+500 - +1.000', icon: <Users size={16} />, color: 'text-blue-600' },
    { label: 'Kunjungan Website', current: 0, target: '1.000 - 2.000', icon: <MousePointerClick size={16} />, color: 'text-emerald-600' },
    { label: 'Konten Mega-Hit', current: 0, target: '2 konten', icon: <Flame size={16} />, color: 'text-orange-600' },
    { label: 'Laporan AI', current: 0, target: '1 laporan', icon: <FileCheck size={16} />, color: 'text-purple-600' },
  ];

  return (
    <div className="p-5 rounded-xl border bg-gradient-to-br from-emerald-50 to-white border-emerald-100 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800">Target Bulanan</h4>
        <Trophy size={16} className="text-emerald-600" />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {goals.map((g, i) => (
          <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm space-y-1.5">
            <div className={g.color}>{g.icon}</div>
            <p className="text-[10px] font-bold text-gray-500">{g.label}</p>
            <p className="text-lg font-black text-gray-800">{g.current}</p>
            <p className="text-[9px] text-gray-400 font-medium">Target: {g.target}</p>
          </div>
        ))}
      </div>
    </div>
  );
}