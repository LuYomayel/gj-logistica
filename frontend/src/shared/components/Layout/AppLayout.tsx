import { useState, createContext, useContext, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';

interface SidebarContextType {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

export const SidebarContext = createContext<SidebarContextType>({
  isOpen: false,
  toggle: () => {},
  close: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggle = useCallback(() => setSidebarOpen((prev) => !prev), []);
  const close = useCallback(() => setSidebarOpen(false), []);

  return (
    <SidebarContext.Provider value={{ isOpen: sidebarOpen, toggle, close }}>
      <div className="min-h-screen bg-gray-50">
        <TopBar />
        <Sidebar />
        {/* Overlay when mobile sidebar is open */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={close}
          />
        )}
        <main className="mt-[54px] p-4 min-h-[calc(100vh-54px)] lg:ml-[210px] lg:p-6">
          <Outlet />
        </main>
      </div>
    </SidebarContext.Provider>
  );
}
