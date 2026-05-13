'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Star, Zap, Crown, Award, Medal } from 'lucide-react';

interface Badge {
  id: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
  bgColor: string;
}

export default function AchievementBadge() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [latestBadge, setLatestBadge] = useState<Badge | null>(null);

  useEffect(() => {
    checkAchievements();
  }, []);

  const checkAchievements = () => {
    const earned: Badge[] = [];
    
    // Cek localStorage untuk progress
    const articlesCount = parseInt(localStorage.getItem('articles_weekly') || '0');
    const postsCount = parseInt(localStorage.getItem('posts_weekly') || '0');
    const reachCount = parseInt(localStorage.getItem('reach_weekly') || '0');
    const loginStreak = parseInt(localStorage.getItem('login_streak') || '1');

    if (articlesCount >= 35) {
      earned.push({
        id: 'writer-pro',
        icon: <Zap size={20} />,
        title: 'Writer Pro',
        desc: '35 Artikel dalam seminggu!',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50 border-amber-200'
      });
    }
    
    if (postsCount >= 7) {
      earned.push({
        id: 'cross-platform',
        icon: <Star size={20} />,
        title: 'Cross-Platform King',
        desc: '7 Postingan serentak!',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50 border-purple-200'
      });
    }
    
    if (reachCount >= 3500) {
      earned.push({
        id: 'viral',
        icon: <Trophy size={20} />,
        title: 'Viral Moment',
        desc: '3.500+ Reach dalam seminggu!',
        color: 'text-rose-600',
        bgColor: 'bg-rose-50 border-rose-200'
      });
    }
    
    if (loginStreak >= 7) {
      earned.push({
        id: 'consistent',
        icon: <Crown size={20} />,
        title: 'Konsisten Sepekan',
        desc: 'Login 7 hari berturut-turut!',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50 border-emerald-200'
      });
    }

    // Default badge untuk new user
    if (earned.length === 0) {
      earned.push({
        id: 'starter',
        icon: <Award size={20} />,
        title: 'Media Starter',
        desc: 'Selamat bergabung di Media Center!',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 border-blue-200'
      });
    }

    setBadges(earned);
    
    // Show toast for latest badge
    if (earned.length > 0) {
      setLatestBadge(earned[earned.length - 1]);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    }
  };

  return (
    <>
      {/* Toast Notification */}
      {showToast && latestBadge && (
        <div className="fixed top-20 right-8 z-50 animate-slideIn">
          <div className={`${latestBadge.bgColor} border rounded-2xl p-4 shadow-xl flex items-center space-x-3 max-w-xs`}>
            <div className={`${latestBadge.color} animate-bounce`}>
              {latestBadge.icon}
            </div>
            <div>
              <p className={`text-xs font-black ${latestBadge.color}`}>Achievement Unlocked!</p>
              <p className="text-sm font-bold text-gray-800">{latestBadge.title}</p>
              <p className="text-[10px] text-gray-500">{latestBadge.desc}</p>
            </div>
          </div>
        </div>
      )}

      {/* Badge Showcase */}
      <div className={`p-5 rounded-xl border ${'bg-white border-gray-200'} shadow-sm space-y-4`}>
        <div className="flex items-center justify-between border-b pb-3">
          <h4 className="text-xs font-black uppercase tracking-wider">Achievement</h4>
          <Medal size={16} className="text-amber-500" />
        </div>
        
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <div 
              key={badge.id}
              className={`${badge.bgColor} border rounded-xl px-3 py-2 flex items-center space-x-2 cursor-pointer hover:scale-105 transition-transform`}
              title={badge.desc}
            >
              <span className={badge.color}>{badge.icon}</span>
              <span className={`text-[10px] font-bold ${badge.color}`}>{badge.title}</span>
            </div>
          ))}
        </div>
        
        {badges.length < 4 && (
          <p className="text-[9px] text-gray-400 text-center">
            Capai target mingguan untuk membuka lebih banyak badge!
          </p>
        )}
      </div>
    </>
  );
}