"use client";
import React from 'react';

// Mendefinisikan kontrak properti yang dipasok dari CommandCenter
interface MonthlyGoalsProps {
  isDarkMode?: boolean;
  upcomingPlans?: any[];
  wpCount?: number;
}

export default function MonthlyGoals({ 
  isDarkMode = true, 
  upcomingPlans = [], 
  wpCount = 0 
}: MonthlyGoalsProps) {
  
  // --- 1. MESIN WAKTU RIIL (Kalkulasi Otomatis Bulan Berjalan) ---
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Menyaring naskah yang jadwal tayangnya jatuh pada bulan & tahun ini
  const thisMonthContents = upcomingPlans.filter(p => {
    if (!p.publish_date) return false;
    const dateObj = new Date(p.publish_date);
    return dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear;
  });

  // Menghitung Jangkauan (Views) & Interaksi khusus bulan berjalan
  const thisMonthViews = thisMonthContents.reduce((acc, curr) => acc + (Number(curr.views) || 0), 0);
  const thisMonthEng = thisMonthContents.reduce((acc, curr) => acc + (Number(curr.engagement) || 0), 0);

  // --- 2. SASARAN TARGET TRANSPARAN ---
  const targets = [
    { 
      label: 'Produksi Artikel Web', 
      current: wpCount, 
      target: 30, 
      unit: 'artikel', 
      color: 'blue',
      source: 'Total naskah aktif di database website' 
    },
    { 
      label: 'Distribusi Konten (Cross-Post)', 
      current: thisMonthContents.filter(p => p.pub_status === 'Posted').length, 
      target: 15, 
      unit: 'tayang', 
      color: 'purple',
      source: 'Naskah berstatus "Posted" bulan ini' 
    },
    { 
      label: 'Jangkauan Audiens (Reach)', 
      current: thisMonthViews, 
      target: 10000, 
      unit: 'views', 
      color: 'emerald',
      source: 'Akumulasi views konten bulan ini' 
    },
    { 
      label: 'Target Interaksi (Engagement)', 
      current: thisMonthEng, 
      target: 2500, 
      unit: 'reaksi', 
      color: 'amber',
      source: 'Akumulasi likes/komen/share bulan ini' 
    },
    { 
      label: 'Cakupan Pilar Strategis', 
      current: new Set(thisMonthContents.map(p => p.pillar)).size, 
      target: 5, 
      unit: 'pilar', 
      color: 'red',
      source: 'Variasi pilar terdistribusi bulan ini' 
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className={`text-base font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Target Pencapaian Bulanan
        </h3>
        <p className="text-xs text-gray-500">
          Pemantauan metrik dan sasaran distribusi khusus periode bulan berjalan
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {targets.map((t, idx) => {
          // Menjaga batas persentase maksimal 100% demi kerapian pengisian visual bar
          const percentage = Math.min(Math.round((t.current / t.target) * 100), 100);
          
          return (
            <div 
              key={idx} 
              className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                isDarkMode ? 'bg-[#12151a] border-gray-800' : 'bg-white border-gray-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-400">{t.label}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    percentage >= 100 
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                      : 'bg-gray-500/10 text-gray-400'
                  }`}>
                    {percentage}%
                  </span>
                </div>

                {/* Penerapan Hirarki Tipografi: Roboto khusus mengawal Angka Metrik */}
                <div className="flex items-baseline gap-1 mb-3">
                  <span className={`font-roboto text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {t.current.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs font-bold text-gray-500">
                    / <span className="font-roboto">{t.target.toLocaleString('id-ID')}</span> {t.unit}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {/* Progress Bar Dinamis */}
                <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800/60' : 'bg-gray-100'}`}>
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: percentage >= 100 ? '#10B981' : t.color === 'blue' ? '#3B82F6' : t.color === 'purple' ? '#A855F7' : t.color === 'emerald' ? '#10B981' : t.color === 'amber' ? '#F59E0B' : '#EF4444' 
                    }}
                  />
                </div>

                {/* Transparansi Penjelasan Sumber Asal Data */}
                <span className="text-[9px] font-medium text-gray-500 italic block">
                  💡 {t.source}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}