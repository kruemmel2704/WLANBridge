import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RPi WLAN Bridge Monitor',
  description: 'Live-Status, Ping & WLAN-Geschwindigkeit der Raspberry Pi Bridge',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

