'use client';

import React, { useEffect, useState } from 'react';
import { 
  Video, 
  FileText, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Brain,
  Zap,
  Target
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const kpis = [
    { name: 'Total Videos', value: stats?.totalVideos, icon: Video, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Dolores LATAM', value: stats?.totalPainPoints, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
    { name: 'Clasificaciones IA', value: stats?.totalClassifications, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { name: 'Fuentes (Evidence)', value: stats?.totalSources, icon: Brain, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-white tracking-tight bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
          Intelligence Dashboard
        </h1>
        <p className="text-slate-400 mt-2 font-medium">Monitoreo en tiempo real del pipeline de mercado LATAM.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <div key={kpi.name} className="glass-card p-6 border-slate-800/50 hover:border-indigo-500/30 group transition-all duration-500">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-3 rounded-2xl bg-slate-800/50 group-hover:scale-110 transition-transform duration-500", kpi.color)}>
                <kpi.icon size={24} />
              </div>
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full uppercase tracking-wider">Live</span>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{kpi.name}</p>
              <h3 className="text-3xl font-black text-white tabular-nums">{kpi.value || 0}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Stats Card */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-8 border-slate-800/50 relative overflow-hidden">
            <div className="flex items-center justify-between mb-8 relative z-10">
              <h2 className="text-xl font-bold text-white">Eficiencia del Pipeline</h2>
              <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg text-xs font-black uppercase tracking-wider border border-indigo-500/20">Producción</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10">
              <div className="p-6 bg-slate-900/40 rounded-3xl border border-slate-800/50 backdrop-blur-md">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Tasa de Éxito</p>
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-black text-white tabular-nums">{Math.round(stats?.successRate || 0)}%</span>
                  <span className="text-emerald-400 font-bold mb-1 flex items-center gap-1 text-xs uppercase">
                    <TrendingUp size={14} /> Óptimo
                  </span>
                </div>
                <div className="mt-6 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(99,102,241,0.5)]" style={{ width: `${stats?.successRate || 0}%` }} />
                </div>
              </div>

              <div className="p-6 bg-slate-900/40 rounded-3xl border border-slate-800/50 backdrop-blur-md">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Severidad Media</p>
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-black text-white tabular-nums">{stats?.avgSeverity?.toFixed(1) || 0}</span>
                  <span className="text-slate-500 font-bold mb-2 text-sm uppercase">/ 10</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-4 leading-relaxed font-medium uppercase tracking-wider">Concentración de dolores críticos detectada.</p>
              </div>
            </div>
          </div>

          {/* Recent Classifications Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white px-2">Últimos Hallazgos IA</h2>
            <div className="space-y-4">
              {stats?.recentClassifications?.map((c: any, i: number) => (
                <div key={i} className="glass-card p-6 border-slate-800/50 hover:border-indigo-500/30 transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-white text-lg">{c.videos?.title}</h3>
                      <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest mt-1">
                        Dolor: {c.pain_points?.title}
                      </p>
                    </div>
                    <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
                      {c.relevance_score}% Match
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed italic">"{c.reasoning}"</p>
                </div>
              ))}
              {(!stats?.recentClassifications || stats.recentClassifications.length === 0) && (
                <div className="glass-card p-12 border-dashed border-slate-800 text-center">
                  <p className="text-slate-500 font-medium">No hay clasificaciones recientes. Ejecuta el motor IA.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="space-y-6">
          <div className="bg-indigo-600 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
            <div className="relative z-10 flex flex-col h-full">
              <h2 className="text-xl font-bold text-white mb-8">Sistema Autónomo</h2>
              <div className="space-y-6 flex-1">
                <div className="flex items-start gap-4">
                  <div className="bg-white/20 p-2.5 rounded-2xl text-white">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest">Last Update</p>
                    <p className="font-bold text-white text-sm">{stats?.lastExecution ? new Date(stats.lastExecution).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-white/20 p-2.5 rounded-2xl text-white">
                    <Brain size={20} />
                  </div>
                  <div>
                    <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest">IA Agent</p>
                    <p className="font-bold text-white text-sm">Hito 4 — Classifier</p>
                  </div>
                </div>
              </div>

              <button className="w-full mt-10 bg-white text-indigo-600 font-black py-4 px-6 rounded-2xl transition-all active:scale-95 shadow-xl hover:bg-indigo-50 flex items-center justify-center gap-2">
                <Zap size={20} fill="currentColor" /> EJECUTAR PIPELINE
              </button>
            </div>
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000" />
          </div>

          <div className="glass-card p-6 border-slate-800/50">
             <h3 className="text-white font-bold mb-4 flex items-center gap-2">
               <Target className="text-indigo-400" size={18} />
               Foco Estratégico
             </h3>
             <p className="text-slate-400 text-xs leading-relaxed font-medium">
               El sistema está priorizando la detección de brechas tecnológicas en el sector SaaS y Fintech de la región Andina.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: (string | boolean | undefined)[]) {
  return inputs.filter(Boolean).join(' ');
}
