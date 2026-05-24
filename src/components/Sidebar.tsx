'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Video, 
  AlertCircle, 
  Terminal, 
  Menu,
  X,
  Zap,
  Brain,
  CheckCircle2,
  Settings
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: 'Logs Scraper', href: '/logs', icon: Terminal },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Videos', href: '/videos', icon: Video },
  { name: 'Pain Points', href: '/pain-points', icon: AlertCircle },
  { name: 'RPM Wizard', href: '/rpm', icon: Brain },
  { name: 'Solution Engine', href: '/solutions', icon: Zap },
  { name: 'MVT Validation', href: '/mvt', icon: CheckCircle2, soon: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-indigo-600 text-white rounded-lg shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="text-white fill-white" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">LATAM Engine</h1>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Sprint 3 — Market IA</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1 py-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.soon ? '#' : item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                    isActive 
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                      : "text-slate-400 hover:bg-slate-800 hover:text-white",
                    item.soon && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <item.icon size={20} className={cn(
                    "transition-colors",
                    isActive ? "text-white" : "text-slate-500 group-hover:text-white"
                  )} />
                  <span className="font-medium">{item.name}</span>
                  {item.soon && (
                    <span className="absolute right-4 text-[8px] font-black uppercase tracking-tighter bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-slate-700">Soon</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer Info */}
          <div className="p-6 mt-auto border-t border-slate-800">
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm text-slate-300 font-medium">Pipeline Activo</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
