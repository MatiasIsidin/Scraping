'use client';

import React, { useEffect, useState } from 'react';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  XCircle,
  Calendar,
  ExternalLink,
  Activity
} from 'lucide-react';
import { ScrapingLog } from '@/types/database';

export default function LogsPage() {
  const [logs, setLogs] = useState<ScrapingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      const res = await fetch(`/api/logs?${params}`);
      const result = await res.json();
      setLogs(result.data || []);
      setTotal(result.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-white tracking-tight bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
          Scraper & Logs
        </h1>
        <p className="text-slate-400 mt-2 font-medium">Configura el schedule, gestiona canales y revisa el historial</p>
      </div>

      {/* Canales Section */}
      <div className="glass-card border-slate-800/50 p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Canales</h2>
          <p className="text-slate-400 text-sm mt-1">El esquema soporta múltiples canales. Añade otro si quieres comparar Starter Story con un segundo canal.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-800/50">
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">HANDLE</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">NOMBRE</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">VIDEOS</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-4 font-bold text-white">@starterstory</td>
                <td className="px-4 py-4 text-slate-300">Starter Story</td>
                <td className="px-4 py-4 text-slate-300">10</td>
                <td className="px-4 py-4">
                  <a href="https://youtube.com/@starterstory" target="_blank" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-sm font-medium">
                    abrir <ExternalLink size={14} />
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex flex-col md:flex-row gap-4 border-t border-slate-800/50 pt-6">
          <div className="flex-1">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Handle (@nombre)</label>
            <input 
              type="text" 
              placeholder="@otrocanal" 
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-medium text-white placeholder:text-slate-600"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Nombre (opcional)</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-medium text-white placeholder:text-slate-600"
            />
          </div>
          <div className="flex items-end">
            <button className="px-6 py-3 bg-indigo-500 text-white font-bold text-sm rounded-xl hover:bg-indigo-400 transition-colors shadow-lg shadow-indigo-500/20 w-full md:w-auto whitespace-nowrap">
              Añadir canal
            </button>
          </div>
        </div>
      </div>

      {/* Historial de ejecuciones Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight">Historial de ejecuciones</h2>
        
        <div className="glass-card border-slate-800/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-800/50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">INICIO</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">CANAL</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">TRIGGER</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">ESTADO</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">ENCONTRADOS</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">NUEVOS</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">ACTUALIZADOS</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30 text-sm">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={8} className="px-6 py-6">
                        <div className="h-4 bg-slate-800/50 rounded w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
                      No se encontraron registros.
                    </td>
                  </tr>
                ) : logs.map((log) => {
                  const dateObj = new Date(log.executed_at);
                  const isScheduled = log.run_type?.toLowerCase().includes('cron') || log.run_type?.toLowerCase().includes('scheduled');
                  
                  return (
                    <tr key={log.log_id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-300 font-medium">
                        {dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}, {dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        @starterstory
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/50">
                          {isScheduled ? 'scheduled' : 'manual'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {log.status === 'success' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]">
                            success
                          </span>
                        ) : (log.status as string) === 'running' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.1)]">
                            running
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.1)]">
                            error
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {log.videos_found || 0}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {log.new_videos || 0}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {log.transcripts_created || 0}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-500 font-medium text-sm hover:text-white transition-colors">
                          ver &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-slate-900/50 px-6 py-5 border-t border-slate-800/50 flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
              Página <span className="text-white">{page}</span> — <span className="text-white">{total}</span> Total
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2.5 bg-slate-800 text-slate-400 rounded-xl hover:text-white disabled:opacity-30 transition-all border border-slate-700/50"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= total}
                className="p-2.5 bg-slate-800 text-slate-400 rounded-xl hover:text-white disabled:opacity-30 transition-all border border-slate-700/50"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
