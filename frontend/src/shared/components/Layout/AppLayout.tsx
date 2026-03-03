import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />
      <Sidebar />
      <main className="ml-[210px] mt-[54px] p-6 min-h-[calc(100vh-54px)]">
        <Outlet />
      </main>
    </div>
  );
}
