import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

// Zuverlässige mobile Erkennung via JS (kein Tailwind nötig)
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return isMobile;
}

export default function Layout() {
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar: NUR auf Desktop gerendert */}
      {!isMobile && <Sidebar />}

      {/* Hauptinhalt */}
      <main className="flex-1 overflow-y-auto">
        <div
          style={{
            padding: isMobile ? '1rem' : '1.5rem',
            paddingBottom: isMobile ? '6rem' : '1.5rem',
            maxWidth: '80rem',
            margin: '0 auto',
          }}
        >
          <Outlet />
        </div>
      </main>

      {/* BottomNav: NUR auf Mobil gerendert */}
      {isMobile && <BottomNav />}
    </div>
  );
}
