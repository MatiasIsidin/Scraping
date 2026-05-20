'use client';

import React, { useEffect, useState } from 'react';
import { 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft,
  ChevronRight,
  Search, 
  Video,
  ExternalLink,
  Edit2,
  Trash2,
  Plus,
  Check,
  TrendingUp,
  Globe2,
  Briefcase,
  Brain
} from 'lucide-react';
import { PainPoint, PainPointSource } from '@/types/database';

interface FullPainPoint extends PainPoint {
  pain_point_sources: PainPointSource[];
  videos?: {
    title: string;
    youtube_video_id: string;
  };
  video_classifications?: {
    reasoning: string;
  }[];
  latam_classification?: any[];
  business_type?: string;
}

export default function PainPointsPage() {
  const [painPoints, setPainPoints] = useState<FullPainPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PainPoint>>({});
  
  // Filters
  const [category, setCategory] = useState('');
  const [minSeverity, setMinSeverity] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchPainPoints = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        category,
        min_severity: minSeverity
      });
      const res = await fetch(`/api/pain-points/full?${params}`);
      const result = await res.json();
      setPainPoints(result.data || []);
      setTotal(result.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPainPoints();
  }, [page, category, minSeverity]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleEdit = (pp: FullPainPoint) => {
    setEditingId(pp.id);
    setEditForm({
      title: pp.title,
      description: pp.description,
      severity_score: pp.severity_score,
      category: pp.category
    });
  };

  const handleSave = async (id: string) => {
    try {
      const res = await fetch(`/api/pain-points/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setEditingId(null);
        fetchPainPoints();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de desactivar este pain point?')) return;
    try {
      const res = await fetch(`/api/pain-points/${id}`, { method: 'DELETE' });
      if (res.ok) fetchPainPoints();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
            Pain Points
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Plataforma de inteligencia de mercado y generador de oportunidades LATAM.</p>
        </div>
        <button className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-95">
          <Plus size={20} /> Nuevo Insight
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 border-slate-800/50 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Filtrar por palabra clave..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-800/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-medium text-white placeholder:text-slate-600"
          />
        </div>
        
        <select 
          className="bg-slate-900/50 border border-slate-800/50 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 focus:outline-none"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Categorías</option>
          <option value="Fintech">Fintech</option>
          <option value="SaaS">SaaS</option>
          <option value="E-commerce">E-commerce</option>
          <option value="Logística">Logística</option>
        </select>

        <select 
          className="bg-slate-900/50 border border-slate-800/50 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 focus:outline-none"
          value={minSeverity}
          onChange={(e) => setMinSeverity(e.target.value)}
        >
          <option value="">Severidad</option>
          <option value="7">Severidad &gt; 7</option>
          <option value="8">Severidad &gt; 8</option>
          <option value="9">Severidad &gt; 9</option>
        </select>
      </div>

      {/* Pain Points List */}
      <div className="space-y-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card h-32 animate-pulse border-slate-800/50" />
          ))
        ) : painPoints.length === 0 ? (
          <div className="glass-card py-24 text-center border-dashed border-slate-800">
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No se encontraron insights.</p>
          </div>
        ) : painPoints.map((pp) => {
          // Parsing classifications using the new relational table from Sprint 4
          const latamReasoning = pp.video_classifications && pp.video_classifications.length > 0
            ? pp.video_classifications[0].reasoning
            : (pp.pain_point_sources?.find(s => s.source_type === 'report' || s.country === 'LATAM')?.evidence || 'Applicabilidad a verificar.');

          return (
            <div 
              key={pp.id} 
              className={clsx(
                "glass-card border-slate-800/50 transition-all duration-500 overflow-hidden group",
                expandedId === pp.id ? "ring-2 ring-indigo-500/30 border-indigo-500/30 bg-slate-900/80" : "hover:border-slate-700 hover:bg-slate-900/40"
              )}
            >
              {/* Summary Row */}
              <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-5 flex-1">
                  <div className={clsx(
                    "p-4 rounded-[1.25rem] shrink-0 shadow-lg transition-transform duration-500 group-hover:scale-110",
                    pp.severity_score >= 8 
                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  )}>
                    <AlertTriangle size={24} />
                  </div>
                  
                  {editingId === pp.id ? (
                    <div className="flex-1 space-y-4">
                      <input 
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                        value={editForm.title}
                        onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                      />
                      <textarea 
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500/50 outline-none"
                        rows={2}
                        value={editForm.description}
                        onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                      />
                    </div>
                  ) : (
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className="text-xs font-medium bg-slate-800/80 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/20 flex items-center gap-1.5">
                          <Brain size={12} /> extraído IA
                        </span>
                        <span className="text-xs font-medium bg-slate-800/80 text-slate-300 px-3 py-1 rounded-full border border-slate-700/50">
                          {pp.category?.toLowerCase() || 'general'}
                        </span>
                        <span className={clsx(
                          "text-xs font-medium px-3 py-1 rounded-full border flex items-center gap-1.5",
                          pp.severity_score >= 8 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-slate-800/80 text-slate-300 border-slate-700/50"
                        )}>
                          severidad {pp.severity_score}/10
                        </span>
                        {pp.pain_point_sources && pp.pain_point_sources.length > 0 && (
                          <span className="text-xs font-medium bg-slate-800/80 text-slate-300 px-3 py-1 rounded-full border border-slate-700/50">
                            {pp.pain_point_sources.length} videos
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-white text-xl tracking-tight leading-snug group-hover:text-indigo-300 transition-colors">{pp.title}</h3>
                      <p className="text-slate-400 text-sm line-clamp-2 mt-2 leading-relaxed">{pp.description}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 pl-8">
                  {editingId === pp.id ? (
                    <button 
                      onClick={() => handleSave(pp.id)}
                      className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-400 transition-all"
                    >
                      <Check size={18} />
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={() => handleEdit(pp)}
                        className="p-2 text-slate-500 hover:text-white transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => toggleExpand(pp.id)}
                        className="p-2 text-slate-500 hover:text-white transition-colors"
                      >
                        {expandedId === pp.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {expandedId === pp.id && (
                <div className="border-t border-slate-800/50 bg-[#0f1115] p-6 space-y-6 animate-in slide-in-from-top duration-500 rounded-b-2xl">
                  
                  {/* Detailed Description */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">{pp.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{pp.description}</p>
                  </div>

                  {/* LATAM Applicability */}
                  <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800/50">
                    <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Globe2 size={14} /> Aplicabilidad LATAM (Razonamiento IA)
                    </h5>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {latamReasoning}
                    </p>
                  </div>

                  {/* Ajustes LATAM */}
                  <div>
                    <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                      Ajustes para LATAM
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {["integración con WhatsApp y herramientas locales", "onboarding sin código y en español", "precio ajustado a pymes", "compatibilidad con conectividad inestable"].map((tag, i) => (
                        <span key={i} className="text-xs text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/30">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Evidence Section */}
                  <div className="space-y-2">
                    <button className="flex items-center gap-2 text-sm font-bold text-slate-300 w-full text-left">
                      <ChevronDown size={16} /> Evidencia ({pp.pain_point_sources?.filter(s => s.source_name !== 'YouTube Transcript').length || 0})
                    </button>
                    {pp.pain_point_sources && pp.pain_point_sources.filter(s => s.source_name !== 'YouTube Transcript').length > 0 ? (
                      <ul className="list-disc list-outside pl-8 space-y-2 text-sm text-slate-300 mt-2">
                        {pp.pain_point_sources.filter(s => s.source_name !== 'YouTube Transcript').map(source => (
                          <li key={source.id} className="leading-relaxed">
                            <strong className="text-white">{source.source_name}:</strong> {source.evidence}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500 italic pl-8 mt-2">
                        Analiza nuevamente este video para que la IA extraiga evidencia externa de reportes.
                      </p>
                    )}
                  </div>

                  {/* Videos Section */}
                  <div className="space-y-3 pt-2">
                    <button className="flex items-center gap-2 text-sm font-bold text-slate-300 w-full text-left">
                      <ChevronDown size={16} /> Videos fuente ({pp.videos ? '1' : '0'})
                    </button>
                    
                    {pp.videos && (
                      <div className="w-full overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800">
                              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">Score</th>
                              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Video</th>
                              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">Negocio</th>
                              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Razonamiento</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                              <td className="py-4 px-4 align-top">
                                <span className="bg-slate-800 text-slate-300 text-xs font-bold px-2 py-1 rounded">
                                  {Math.round((pp.final_score || 8) / 10 * 100)}%
                                </span>
                              </td>
                              <td className="py-4 px-4 align-top min-w-[200px]">
                                <a href={`https://youtube.com/watch?v=${pp.videos.youtube_video_id}`} target="_blank" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">
                                  {pp.videos.title}
                                </a>
                              </td>
                              <td className="py-4 px-4 text-slate-300 text-sm align-top">—</td>
                              <td className="py-4 px-4 text-slate-400 text-sm italic align-top max-w-md">
                                "{pp.pain_point_sources?.find(s => s.source_name === 'YouTube Transcript')?.evidence || 'Pain point extraído directamente desde el análisis de este video.'}"
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
