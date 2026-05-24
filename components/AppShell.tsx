'use client';

import { GameProvider } from '@/lib/store';
import NavigationBar from '@/components/NavigationBar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="min-h-screen text-white">
        {children}
      </main>
      <NavigationBar />
    </>
  );
}
