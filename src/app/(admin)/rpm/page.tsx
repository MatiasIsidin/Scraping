'use client';

import React from 'react';
import RPMWizard from '@/components/rpm/RPMWizard';
import { Brain } from 'lucide-react';

export default function RPMPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
            <Brain size={24} />
          </div>
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Strategy Engine</span>
        </div>
        <h1 className="text-4xl font-black text-white tracking-tight bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
          RPM Profile Wizard
        </h1>
        <p className="text-slate-400 mt-2 font-medium">Define tus recursos, pasiones y alineación con el mercado para recibir recomendaciones personalizadas.</p>
      </div>

      {/* Wizard Container */}
      <div className="relative">
        {/* Ambient background for the wizard */}
        <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-500/5 to-purple-500/5 blur-3xl -z-10 rounded-[3rem]" />
        
        {/* Usamos el componente Wizard pero sin los estilos de fondo pesados que tenía antes 
            para que se integre con el AdminLayout */}
        <div className="glass-card p-1 border-slate-800/50 bg-slate-900/20">
          <RPMWizard />
        </div>
      </div>
    </div>
  );
}
