import { Sidebar } from '@/components/Sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#050505] text-slate-200 selection:bg-indigo-500/30">
      <Sidebar />
      <main className="flex-1 lg:pl-64 flex flex-col min-h-screen relative">
        {/* Ambient Background Glows */}
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -z-10" />
        <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px] -z-10" />
        
        <div className="p-4 lg:p-8 max-w-7xl mx-auto w-full relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
