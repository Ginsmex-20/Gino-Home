import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar — nur auf Desktop sichtbar */}
      <Sidebar />

      {/* Hauptinhalt */}
      <main className="flex-1 overflow-y-auto">
        {/* pb-24 auf Mobil → Platz für die untere Nav-Leiste */}
        <div className="p-4 md:p-6 max-w-7xl mx-auto pb-24 md:pb-6">
          <Outlet />
        </div>
      </main>

      {/* Bottom-Navigation — nur auf Mobil sichtbar */}
      <BottomNav />
    </div>
  );
}
