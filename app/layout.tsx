import type {Metadata} from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { GameProvider } from '@/lib/store';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'KirKit | Gully cricket scoring',
  description: 'Fast-paced gully cricket scoring for your squad. Last rank sponsors the Treat.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} dark`}>
      <body className="bg-[#0a0a0c] text-white font-inter" suppressHydrationWarning>
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(57,255,20,0.05)_0%,transparent_50%)] pointer-events-none" />
        <GameProvider>
          {children}
        </GameProvider>
      </body>
    </html>
  );
}
