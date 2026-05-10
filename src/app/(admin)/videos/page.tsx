'use client';

import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Clock, 
  Brain,
  CheckCircle2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Zap,
  Activity,
  Eye
} from 'lucide-react';
import { Video } from '@/types/database';

interface ExtendedVideo extends Video {
  pain_point_count: number;
  transcript_status: 'pending' | 'success' | 'failed';
  view_count?: number;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<ExtendedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  
  // Batch processing state
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchStats, setBatchStats] = useState<any>(null);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        search
      });
      const res = await fetch(`/api/videos/extended?${params}`);
      const result = await res.json();
      setVideos(result.data || []);
      setTotal(result.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [page, search]);

  const handleBatchAnalyze = async () => {
    setIsProcessingBatch(true);
    setBatchStats(null);
    try {
      const res = await fetch(`/api/videos/batch-analyze`, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        setBatchStats(result.stats);
        fetchVideos(); // Refresh videos state
      } else {
        alert(`Error en procesamiento batch: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Error crítico: ${err.message}`);
    } finally {
      setIsProcessingBatch(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
            Gestión de Videos
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Control de contenidos y triggers de extracción IA.</p>
        </div>
        
        {/* GLOBAL ANALYZE BUTTON */}
        <button 
          onClick={handleBatchAnalyze}
          disabled={isProcessingBatch}
          className={clsx(
            "flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl active:scale-95",
            isProcessingBatch
              ? "bg-indigo-600/50 text-white/70 cursor-not-allowed"
              : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/20"
          )}
        >
          {isProcessingBatch ? (
            <>
              <Loader2 size={20} className="animate-spin" /> Procesando Lote...
            </>
          ) : (
            <>
              <Zap size={20} fill="currentColor" /> Analizar Pain Points
            </>
          )}
        </button>
      </div>

      {/* Batch Stats Banner */}
      {batchStats && (
        <div className="glass-card p-6 border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-4 mb-4">
            <Activity className="text-emerald-400" size={24} />
            <h3 className="font-bold text-white text-lg">Procesamiento Batch Completado</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Procesados</p>
              <p className="text-2xl font-black text-white">{batchStats.transcripts_processed}</p>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Insights Nuevos</p>
              <p className="text-2xl font-black text-emerald-400">{batchStats.pain_points_extracted}</p>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Deduplicados</p>
              <p className="text-2xl font-black text-amber-400">{batchStats.pain_points_deduplicated}</p>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Errores</p>
              <p className="text-2xl font-black text-rose-400">{batchStats.errors}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="glass-card p-4 border-slate-800/50">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por título o ID de video..." 
            className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-800/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-white placeholder:text-slate-600"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card h-64 border-slate-800/50 animate-pulse" />
          ))
        ) : videos.length === 0 ? (
          <div className="col-span-full py-20 text-center glass-card border-dashed border-slate-800">
            <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No se encontraron videos.</p>
          </div>
        ) : videos.map((video) => (
          <div key={video.youtube_video_id} className="glass-card p-6 border-slate-800/50 transition-all duration-500 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex-1">
                  <h3 className="font-bold text-white text-lg line-clamp-2 leading-snug">
                    {video.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="font-black text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded uppercase tracking-wider border border-indigo-500/20 flex items-center gap-1">
                      <Eye size={10} /> {video.view_count?.toLocaleString() || '0'} visitas
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                       <Clock size={10} /> {new Date(video.published_at).toLocaleDateString()}
                    </span>
                    {video.channel_name && (
                      <span className="text-[10px] font-bold text-slate-400 border-l border-slate-700 pl-2">
                        {video.channel_name}
                      </span>
                    )}
                  </div>
                </div>
                <a 
                  href={video.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-3 bg-slate-800/50 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-2xl transition-all border border-slate-700/30 shrink-0"
                >
                  <ExternalLink size={18} />
                </a>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/50 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5">
                    <Brain size={12} className="text-indigo-500" /> Market Data
                  </div>
                  <p className="text-lg font-black text-white tabular-nums">
                    {video.pain_point_count} <span className="text-[10px] font-bold text-slate-500 uppercase ml-1">Insights</span>
                  </p>
                </div>
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/50 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5">
                    <CheckCircle2 size={12} className="text-emerald-500" /> Transcript
                  </div>
                  <p className={clsx(
                    "text-lg font-black uppercase text-[12px] tracking-wider",
                    video.transcript_status === 'success' ? "text-emerald-400" : "text-amber-400"
                  )}>
                    {video.transcript_status}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-6 py-8">
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="flex items-center gap-2 px-6 py-2.5 glass-card text-slate-400 hover:text-white disabled:opacity-30 transition-all font-black text-[10px] uppercase tracking-widest"
        >
          <ChevronLeft size={16} /> Anterior
        </button>
        <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Página <span className="text-white">{page}</span></span>
        <button 
          onClick={() => setPage(p => p + 1)}
          disabled={page * 15 >= total}
          className="flex items-center gap-2 px-6 py-2.5 glass-card text-slate-400 hover:text-white disabled:opacity-30 transition-all font-black text-[10px] uppercase tracking-widest"
        >
          Siguiente <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function clsx(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

