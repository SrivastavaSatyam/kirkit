'use client';

import React from 'react';
import { motion } from 'motion/react';
import { User, Award, Shield, Settings, ChevronRight, Zap } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { AvatarImg } from '@/components/AvatarImg';

export default function ProfilePage() {
  const stats = [
    { label: 'Avg Score', value: '42.5' },
    { label: 'Max Score', value: '72' },
    { label: 'Sixes', value: '128' },
    { label: 'Win Rate', value: '64%' },
  ];

  return (
    <AppShell>
      <div className="min-h-screen bg-[#0a0a0c] pt-12 pb-32">
        {/* Profile Header */}
        <div className="px-6 flex flex-col items-center mb-10">
          <div className="relative">
            <div className="w-32 h-32 rounded-[40px] border-4 border-neon-green p-1 relative z-10 overflow-hidden bg-gray-900">
               <AvatarImg
                 src="https://api.dicebear.com/7.x/avataaars/svg?seed=Satyam"
                 alt="avatar"
                 width={128}
                 height={128}
                 className="h-full w-full object-cover"
               />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-neon-green rounded-2xl p-2 z-20 shadow-lg">
               <Award className="w-6 h-6 text-black" />
            </div>
            <div className="absolute inset-0 bg-neon-green/20 blur-3xl rounded-full" />
          </div>
          
          <h2 className="text-3xl font-space font-black mt-6">Satyam S.</h2>
          <p className="text-neon-blue font-mono text-xs uppercase tracking-[0.3em] font-bold">KirKit • Gully legend</p>
        </div>

        {/* Stats Grid */}
        <div className="px-6 grid grid-cols-2 gap-4 mb-10">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              whileTap={{ scale: 0.95 }}
              className="glass rounded-2xl p-4 border border-white/5"
            >
              <p className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl font-space font-black">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Career Timeline Placeholder */}
        <div className="px-6 mb-10">
          <h3 className="text-sm font-mono text-gray-500 uppercase tracking-widest mb-4 ml-1">Career Graph</h3>
          <div className="glass rounded-3xl p-6 h-40 border border-white/5 relative overflow-x-auto no-scrollbar">
             <div className="absolute inset-0 bg-[linear-gradient(270deg,rgba(0,243,255,0.05)_0%,transparent_100%)] pointer-events-none" />
             <div className="flex items-end gap-2 min-w-max h-full pt-4">
                {[30, 50, 40, 80, 60, 90, 75, 45, 65, 85].map((h, i) => (
                  <motion.div 
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.1 }}
                    className="flex-1 bg-neon-blue/20 rounded-t-lg border-t border-neon-blue/30"
                  />
                ))}
             </div>
          </div>
        </div>

        {/* Settings/Options */}
        <div className="px-6 space-y-3">
           <button className="w-full glass rounded-2xl p-5 flex items-center justify-between border border-white/5">
              <div className="flex items-center gap-4">
                 <Shield className="w-5 h-5 text-gray-400" />
                 <span className="font-space font-bold">Privacy & Security</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600" />
           </button>
           <button className="w-full glass rounded-2xl p-5 flex items-center justify-between border border-white/5">
              <div className="flex items-center gap-4">
                 <Settings className="w-5 h-5 text-gray-400" />
                 <span className="font-space font-bold">App Settings</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600" />
           </button>
           <button className="w-full glass rounded-2xl p-5 flex items-center justify-between border border-white/5 group">
              <div className="flex items-center gap-4">
                 <Zap className="w-5 h-5 text-neon-yellow group-hover:scale-110 transition-transform" />
                 <span className="font-space font-bold">Achievements</span>
              </div>
              <div className="px-2 py-1 bg-neon-yellow/10 rounded-lg">
                 <span className="text-[10px] text-neon-yellow font-black">12 New</span>
              </div>
           </button>
        </div>
      </div>
    </AppShell>
  );
}
