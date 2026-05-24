'use client';

import React from 'react';
import { Home, Play, Trophy, User, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';

export default function NavigationBar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', icon: Home, label: 'Home' },
    { href: '/match/create', icon: Plus, label: 'Match' },
    { href: '/leaderboard', icon: Trophy, label: 'Ranks' },
    { href: '/profile', icon: User, label: 'Profile' },
  ];

  if (pathname === '/' || pathname === '/match/create' || pathname.includes('/match/scoring')) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 z-50">
      <div className="glass-dark rounded-[24px] p-2 flex items-center justify-around border-t border-white/10">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <div className="relative p-3 group">
                {isActive && (
                  <motion.div 
                    layoutId="nav-active"
                    className="absolute inset-0 bg-neon-green/10 rounded-xl"
                  />
                )}
                <Icon className={`w-6 h-6 transition-colors ${isActive ? 'text-neon-green' : 'text-gray-500 group-hover:text-white'}`} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
