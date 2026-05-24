'use client';

import React, { useEffect, useState } from 'react';
import { 
  Zap, 
  Brain, 
  Clock, 
  DollarSign, 
  AlertTriangle, 
  TrendingUp, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink, 
  Sparkles, 
  Layers, 
  Video, 
  AlertCircle,
  Play,
  Award,
  ShieldAlert,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import clsx from 'clsx';

interface FactorBreakdown {
  skill_match: number;
  capital_match: number;
  time_match: number;
  pain_strength: number;
  market_validation: number;
  strategic_match: number;
  latam_viability: number;
}

interface SolutionProposal {
  id: string;
  rpm_profile_id: string;
  matched_pain_point_id: string;
  matched_video_ids: string[];
  criteria_hash: string;
  tracking_version: number;
  fit_score: number;
  detailed_fit_scores: {
    fit_score: number;
    factor_breakdown: FactorBreakdown;
  };
  difficulty_level: 'LOW' | 'MEDIUM' | 'HIGH';
  generation_model: string;
  generated_at: string;
  is_active: boolean;

  // Detalles de la propuesta generada
  title: string;
  latam_problem_addressed: string;
  proposed_viable_solution: string;
  explanation_latam_context: string;
  required_skills: string[];
  estimated_cost_range: string;
  rpm_alignment_score: number;
  feasibility_score: number;
  ai_rationale: string;

  // Detalles enriquecidos de backend
  pain_point: {
    id: string;
    title: string;
    category: string;
    severity_score: number;
    description: string;
  };
  videos: {
    youtube_video_id: string;
    title: string;
    url: string;
    reasoning: string;
    latam_relevance_score: number;
  }[];
}

export default function SolutionsPage() {
  const [solutions, setSolutions] = useState<SolutionProposal[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isOutdated, setIsOutdated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTabs, setActiveTabs] = useState<Record<string, 'details' | 'score' | 'evidence'>>({});

  const fetchSolutions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/solutions');
      const data = await res.json();
      if (data.success) {
        setSolutions(data.solutions || []);
        setProfile(data.profile);
        setIsOutdated(data.isOutdated);
        
        // Inicializar pestañas activas para cada card
        const tabs: Record<string, 'details' | 'score' | 'evidence'> = {};
        data.solutions.forEach((sol: SolutionProposal) => {
          tabs[sol.id] = 'details';
        });
        setActiveTabs(tabs);
      }
    } catch (err) {
      console.error('Error fetching solutions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolutions();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerationStep(0);
    
    // Intervalo visual de progreso del pipeline del Sprint 5
    const interval = setInterval(() => {
      setGenerationStep(prev => {
        if (prev < 3) return prev + 1;
        return prev;
      });
    }, 4500);

    try {
      const res = await fetch('/api/solutions', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSolutions(data.solutions || []);
        setProfile(data.profile);
        setIsOutdated(false);
        setExpandedId(null);
        
        // Inicializar pestañas
        const tabs: Record<string, 'details' | 'score' | 'evidence'> = {};
        data.solutions.forEach((sol: SolutionProposal) => {
          tabs[sol.id] = 'details';
        });
        setActiveTabs(tabs);
      } else {
        alert(`Error al generar propuestas: ${data.error || 'Error desconocido'}`);
      }
    } catch (err: any) {
      console.error('Error generating solutions:', err);
      alert(`Error al contactar al motor de soluciones: ${err.message}`);
    } finally {
      clearInterval(interval);
      setGenerating(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const setTab = (solId: string, tab: 'details' | 'score' | 'evidence') => {
    setActiveTabs(prev => ({
      ...prev,
      [solId]: tab
    }));
  };

  // Renderizador del progreso de la generación del Hito 5
  if (generating) {
    const steps = [
      { t: 'Ejecutando Matching y Auditoría de Evidencias', d: 'Filtrando dolores mediante Gatekeepers estrictos (Capital, Horas y Habilidades).' },
      { t: 'Evaluando Ajuste del Fit Score en 7 Factores', d: 'Ponderando Skill Match, Capital, Tiempo, Pain Strength, Market Validation, etc.' },
      { t: 'Formulando Propuestas de Negocio en Paralelo', d: 'Conectando a OpenRouter para tropicalizar MVPs al mercado latinoamericano.' },
      { t: 'Consolidando Trazabilidad y Persistencia', d: 'Vinculando perfiles RPM, IDs de Pain Points y citando videos reales en base de datos.' }
    ];

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center px-4 animate-in fade-in duration-500">
        <div className="relative mb-12">
          {/* Glowing loader */}
          <div className="w-24 h-24 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap className="text-indigo-400 animate-pulse" size={32} fill="currentColor" />
          </div>
          <div className="absolute -inset-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl animate-pulse" />
        </div>
        
        <h2 className="text-3xl font-black text-white tracking-tight bg-gradient-to-r from-white to-indigo-400 bg-clip-text text-transparent mb-2">
          Ejecutando Motor de Soluciones Sprint 5
        </h2>
        <p className="text-slate-400 max-w-md font-medium text-sm mb-10">
          La inteligencia artificial está cruzando tus recursos RPM con los dolores validados en YouTube.
        </p>

        {/* Pasos interactivos */}
        <div className="glass-card max-w-lg w-full p-6 text-left border-slate-800/80 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600/30" />
          {steps.map((st, idx) => {
            const isActive = idx === generationStep;
            const isCompleted = idx < generationStep;
            return (
              <div 
                key={idx} 
                className={clsx(
                  "flex items-start gap-4 transition-all duration-500 pl-4",
                  isActive ? "opacity-100 scale-100" : isCompleted ? "opacity-60 scale-95" : "opacity-30 scale-95"
                )}
              >
                <div className={clsx(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0 border mt-0.5 transition-colors duration-500",
                  isCompleted 
                    ? "bg-indigo-600 border-indigo-500 text-white" 
                    : isActive 
                      ? "bg-slate-800 border-indigo-400 text-indigo-400 animate-pulse" 
                      : "bg-slate-900 border-slate-800 text-slate-600"
                )}>
                  {isCompleted ? <CheckCircle2 size={14} /> : <span>{idx + 1}</span>}
                </div>
                <div className="space-y-0.5">
                  <h4 className={clsx("font-bold text-sm", isActive ? "text-indigo-400" : "text-white")}>{st.t}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">{st.d}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando propuestas del motor...</p>
      </div>
    );
  }

  // --- RENDER RPM PROFILE CONTEXT HEADER ---
  const rpmData = profile?.raw_data || {};
  const map = rpmData.map || {};
  const results = rpmData.results || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Header & RPM Sync indicator */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Solutions Engine
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Motor de soluciones Sprint 5 y formulación estratégica para Latinoamérica.</p>
        </div>

        {profile && (
          <div className="flex items-center gap-4 bg-slate-900/60 p-4 rounded-3xl border border-slate-800/80 backdrop-blur-md">
            <div className="shrink-0 w-10 h-10 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Brain size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active RPM Profile</p>
              <h4 className="font-bold text-white text-sm line-clamp-1">{profile.profile_name}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className={clsx(
                  "w-2 h-2 rounded-full",
                  isOutdated ? "bg-amber-500 animate-pulse" : "bg-emerald-500 animate-pulse"
                )} />
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  {isOutdated ? 'Requiere Sincronización' : 'Perfil Sincronizado'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- RPM METADATA QUICK BAR --- */}
      {profile && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-slate-900/30 rounded-3xl border border-slate-800/50 backdrop-blur-md">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Capital Disponible</span>
            <div className="flex items-center gap-1.5 text-white font-bold text-sm">
              <DollarSign size={14} className="text-emerald-400" />
              <span>{profile.capital_range || '1.000–3.000'} USD</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Tiempo Semanal</span>
            <div className="flex items-center gap-1.5 text-white font-bold text-sm">
              <Clock size={14} className="text-indigo-400" />
              <span>{results.hoursPerWeek || '10-20'} Horas</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Habilidades Técnicas</span>
            <div className="flex items-center gap-1 text-white font-bold text-sm">
              <Award size={14} className="text-amber-400" />
              <span>Nivel {map.techSkill || 3} / 5</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Habilidades Ventas</span>
            <div className="flex items-center gap-1 text-white font-bold text-sm">
              <TrendingUp size={14} className="text-indigo-400" />
              <span>Nivel {map.salesSkill || 3} / 5</span>
            </div>
          </div>
        </div>
      )}

      {/* --- DINAMISMO RPM: INVALIDATION WARNING BANNER --- */}
      {isOutdated && profile && (
        <div className="p-6 bg-gradient-to-r from-amber-900/20 to-orange-900/10 rounded-3xl border border-amber-500/30 relative overflow-hidden animate-in slide-in-from-top duration-500">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -z-10" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl shrink-0">
                <ShieldAlert size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-amber-200 text-lg">Perfil RPM Modificado o Desactualizado</h3>
                <p className="text-slate-300 text-sm leading-relaxed max-w-3xl">
                  Detectamos que has modificado tu perfil de acción masiva (habilidades, capital, o metas) y el hash de criterios SHA-256 cambió. Las propuestas activas en base de datos ya no están alineadas.
                </p>
              </div>
            </div>
            <button 
              onClick={handleGenerate}
              className="flex items-center gap-2 shrink-0 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest px-6 py-4 rounded-2xl shadow-lg shadow-amber-500/10 active:scale-95 transition-all"
            >
              <RefreshCw size={14} className="animate-spin-slow" /> Regenerar Soluciones
            </button>
          </div>
        </div>
      )}

      {/* --- EMPTY STATE --- */}
      {solutions.length === 0 ? (
        <div className="glass-card py-24 text-center border-dashed border-slate-800 max-w-3xl mx-auto space-y-6">
          <div className="w-16 h-16 bg-slate-900/50 border border-slate-800 rounded-3xl flex items-center justify-center mx-auto text-slate-500">
            <Layers size={28} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">No se han generado propuestas de negocio</h3>
            <p className="text-slate-400 max-w-md mx-auto text-sm">
              El motor cruzará tu perfil RPM actual con los dolores críticos de mercado validados en YouTube para formular tus propuestas de valor.
            </p>
          </div>
          <button 
            onClick={handleGenerate}
            className="inline-flex items-center gap-3 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest px-8 py-4.5 rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/10 active:scale-95"
          >
            <Sparkles size={16} /> Generar Propuestas de Negocio
          </button>
        </div>
      ) : (
        
        // --- PROPOSALS GRID PANEL ---
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="text-indigo-400" size={20} fill="currentColor" />
              Propuestas Formuladas para {profile?.profile_name?.split(':')[1]?.trim() || 'Matias'}
            </h2>
            <button 
              onClick={handleGenerate}
              className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <RefreshCw size={14} /> Regenerar Todo
            </button>
          </div>

          <div className="space-y-6">
            {solutions.map((sol, index) => {
              const isExpanded = expandedId === sol.id;
              const activeTab = activeTabs[sol.id] || 'details';
              const breakdown = sol.detailed_fit_scores?.factor_breakdown || {};

              return (
                <div 
                  key={sol.id}
                  className={clsx(
                    "glass-card border-slate-800/60 transition-all duration-500 overflow-hidden group",
                    isExpanded 
                      ? "ring-2 ring-indigo-500/20 border-indigo-500/20 bg-[#07080b]/90 shadow-2xl" 
                      : "hover:border-slate-700 hover:bg-slate-900/20"
                  )}
                >
                  
                  {/* --- CARD SUMMARY HEAD ROW --- */}
                  <div 
                    onClick={() => toggleExpand(sol.id)}
                    className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer select-none"
                  >
                    <div className="flex items-start gap-5 flex-1">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                        <span className="text-lg font-black">{index + 1}</span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={clsx(
                            "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border",
                            sol.difficulty_level === 'LOW' 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                              : sol.difficulty_level === 'MEDIUM'
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          )}>
                            Dificultad {sol.difficulty_level}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider bg-slate-800/80 text-slate-400 px-2.5 py-1 rounded-full border border-slate-700/50">
                            {sol.pain_point?.category || 'General'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Sprint 5 Delivery
                          </span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-black text-white group-hover:text-indigo-400 transition-colors leading-snug">
                          {sol.title}
                        </h3>
                        <p className="text-slate-400 text-sm line-clamp-1 font-medium leading-relaxed mt-1">
                          {sol.latam_problem_addressed}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 justify-between md:justify-end border-t md:border-0 border-slate-800/40 pt-4 md:pt-0">
                      
                      {/* Radial / Box Fit Score Indicator */}
                      <div className="text-right space-y-0.5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Fit Score Total</span>
                        <div className="flex items-end gap-1 shrink-0">
                          <span className="text-3xl font-black text-white tabular-nums leading-none">{sol.fit_score}</span>
                          <span className="text-slate-500 font-bold text-xs uppercase">/ 100</span>
                        </div>
                      </div>

                      <div className="w-10 h-10 rounded-full bg-slate-800/50 hover:bg-slate-800 text-slate-300 flex items-center justify-center transition-colors">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </div>

                  {/* --- CARD ACCORDION EXPANDED BODY --- */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/60 bg-[#050608]/95 animate-in slide-in-from-top duration-500">
                      
                      {/* Tabs Navigation */}
                      <div className="flex border-b border-slate-800/60 px-6 bg-slate-900/10">
                        {[
                          { id: 'details', label: 'Estructura & MVP' },
                          { id: 'score', label: 'Desglose del Fit Score' },
                          { id: 'evidence', label: 'Dolor & Evidencia Mapped' }
                        ].map(tb => (
                          <button
                            key={tb.id}
                            onClick={() => setTab(sol.id, tb.id as any)}
                            className={clsx(
                              "px-5 py-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all relative",
                              activeTab === tb.id 
                                ? "text-indigo-400 border-indigo-500 bg-indigo-500/[0.02]" 
                                : "text-slate-500 border-transparent hover:text-slate-300"
                            )}
                          >
                            {tb.label}
                          </button>
                        ))}
                      </div>

                      {/* --- TAB CONTENT: DETAILS & MVP --- */}
                      {activeTab === 'details' && (
                        <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-300">
                          
                          {/* Core pillars grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            <div className="p-5 bg-slate-900/40 rounded-3xl border border-slate-800/40 space-y-3">
                              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                <AlertCircle size={14} className="text-amber-400" /> Problema Detectado (LATAM)
                              </h4>
                              <p className="text-sm text-slate-300 leading-relaxed">
                                {sol.latam_problem_addressed}
                              </p>
                            </div>

                            <div className="p-5 bg-slate-900/40 rounded-3xl border border-slate-800/40 space-y-3">
                              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                <Zap size={14} className="text-indigo-400" fill="currentColor" /> Propuesta Viable (MVP)
                              </h4>
                              <p className="text-sm text-slate-300 leading-relaxed">
                                {sol.proposed_viable_solution}
                              </p>
                            </div>

                            <div className="p-5 bg-slate-900/40 rounded-3xl border border-slate-800/40 space-y-3">
                              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                <Sparkles size={14} className="text-indigo-400" /> Tropicalización LATAM
                              </h4>
                              <p className="text-sm text-slate-300 leading-relaxed">
                                {sol.explanation_latam_context}
                              </p>
                            </div>

                          </div>

                          {/* Secondary attributes grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            
                            {/* Estrategia de negocio list */}
                            <div className="space-y-4">
                              <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-2">
                                Estrategia & Viabilidad Comercial
                              </h4>
                              <div className="space-y-3.5">
                                <div className="flex items-start gap-3">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                                  <div className="text-sm">
                                    <strong className="text-white block mb-0.5">Modelo de ingresos:</strong>
                                    <span className="text-slate-400">Generación comercial viable y monetizable en LATAM.</span>
                                  </div>
                                </div>
                                <div className="flex items-start gap-3">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                                  <div className="text-sm">
                                    <strong className="text-white block mb-0.5">Canales de adquisición:</strong>
                                    <span className="text-slate-400">Captación de clientes apalancada en WhatsApp, comunidades y orgánico.</span>
                                  </div>
                                </div>
                                <div className="flex items-start gap-3">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                                  <div className="text-sm">
                                    <strong className="text-white block mb-0.5">Riesgos Principales:</strong>
                                    <span className="text-slate-400">Fricción de onboarding local y necesidad de validación inmediata.</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Recursos requeridos panel */}
                            <div className="p-6 bg-slate-900/20 rounded-3xl border border-slate-800/50 space-y-4">
                              <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                                Recursos & Habilidades Estimados
                              </h4>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Inversión Estimada</span>
                                  <span className="text-sm font-bold text-emerald-400 block">{sol.estimated_cost_range}</span>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Tiempo Recomendado</span>
                                  <span className="text-sm font-bold text-indigo-300 block">10-20 horas/semana</span>
                                </div>
                              </div>

                              <div className="space-y-2 pt-2">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Habilidades Requeridas</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {sol.required_skills?.map((sk, idx) => (
                                    <span 
                                      key={idx}
                                      className="text-xs bg-slate-850 text-slate-300 border border-slate-800 px-2.5 py-1 rounded-lg"
                                    >
                                      {sk}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                          </div>

                          {/* AI Rationale explicabilidad */}
                          <div className="p-5 bg-indigo-650/5 border border-indigo-500/20 rounded-3xl space-y-2">
                            <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                              <Sparkles size={14} /> Análisis de Ajuste Explícito (Razonamiento IA)
                            </h5>
                            <p className="text-sm text-indigo-200/90 leading-relaxed italic">
                              "{sol.ai_rationale}"
                            </p>
                          </div>
                        </div>
                      )}

                      {/* --- TAB CONTENT: FIT SCORE BREAKDOWN --- */}
                      {activeTab === 'score' && (
                        <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
                          <div className="max-w-3xl space-y-2 mb-6">
                            <h4 className="text-lg font-bold text-white">Consolidación del Ajuste Estratégico (Fit Score)</h4>
                            <p className="text-slate-400 text-sm leading-relaxed">
                              El Fit Score se calcula de manera matemática y determinista en el backend a través de tres pilares macro, divididos en siete factores individuales.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            
                            {/* Factores de Viabilidad (Skills, Capital, Time) */}
                            <div className="space-y-5">
                              <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1.5 flex items-center gap-2">
                                <Award size={14} className="text-indigo-400" /> Pilar 1: Factibilidad & Recursos (35%)
                              </h5>

                              <div className="space-y-4">
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                                    <span>Skill Match (Habilidades)</span>
                                    <span className="text-indigo-400 tabular-nums">{breakdown.skill_match || 0}%</span>
                                  </div>
                                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${breakdown.skill_match || 0}%` }} />
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                                    <span>Capital Match (Inversión inicial)</span>
                                    <span className="text-indigo-400 tabular-nums">{breakdown.capital_match || 0}%</span>
                                  </div>
                                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${breakdown.capital_match || 0}%` }} />
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                                    <span>Time Match (Disponibilidad horaria)</span>
                                    <span className="text-indigo-400 tabular-nums">{breakdown.time_match || 0}%</span>
                                  </div>
                                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${breakdown.time_match || 0}%` }} />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Factores de Oportunidad y Estrategia */}
                            <div className="space-y-5">
                              <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1.5 flex items-center gap-2">
                                <TrendingUp size={14} className="text-indigo-400" /> Pilares 2 y 3: Oportunidad & Estrategia (65%)
                              </h5>

                              <div className="space-y-4">
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                                    <span>Pain Strength (Severidad del dolor)</span>
                                    <span className="text-indigo-400 tabular-nums">{breakdown.pain_strength || 0}%</span>
                                  </div>
                                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${breakdown.pain_strength || 0}%` }} />
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                                    <span>Market Validation (Volumen de evidencias)</span>
                                    <span className="text-indigo-400 tabular-nums">{breakdown.market_validation || 0}%</span>
                                  </div>
                                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${breakdown.market_validation || 0}%` }} />
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                                    <span>Strategic Match (Preferencia de modelo)</span>
                                    <span className="text-indigo-400 tabular-nums">{breakdown.strategic_match || 0}%</span>
                                  </div>
                                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${breakdown.strategic_match || 0}%` }} />
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                                    <span>LATAM Viability (Ajuste regional Andino)</span>
                                    <span className="text-indigo-400 tabular-nums">{breakdown.latam_viability || 0}%</span>
                                  </div>
                                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${breakdown.latam_viability || 0}%` }} />
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      )}

                      {/* --- TAB CONTENT: EVIDENCE & CITATIONS --- */}
                      {activeTab === 'evidence' && (
                        <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
                          
                          {/* Indicator of generation base */}
                          <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-3xl flex items-center justify-between gap-4">
                            <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                              <Award size={14} fill="currentColor" /> Trazabilidad de Decisión IA
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-200 border border-indigo-500/40 px-3 py-1 rounded-full">
                              RPM + Pain Points + Evidencia de Videos
                            </span>
                          </div>

                          {/* Pain Point Source Card */}
                          <div className="glass-card p-5 border-slate-800/80 bg-slate-950/20 space-y-3">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pain Point Mapeado</span>
                              <span className="bg-rose-500/10 text-rose-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border border-rose-500/20">
                                Severidad: {sol.pain_point?.severity_score || 7} / 10
                              </span>
                            </div>
                            <h4 className="font-bold text-white text-lg">{sol.pain_point?.title}</h4>
                            <p className="text-sm text-slate-400 leading-relaxed">{sol.pain_point?.description}</p>
                          </div>

                          {/* Video Citations */}
                          <div className="space-y-4">
                            <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              <Video size={14} className="text-indigo-400" /> Videos Reales en YouTube como Evidencia
                            </h5>
                            
                            <div className="grid grid-cols-1 gap-4">
                              {sol.videos?.map((vid, idx) => (
                                <div 
                                  key={idx}
                                  className="p-5 bg-[#090b0e] border border-slate-850 rounded-3xl hover:border-slate-800 transition-colors flex flex-col md:flex-row gap-5 items-start justify-between"
                                >
                                  <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-3">
                                      <div className="w-7 h-7 rounded-lg bg-rose-600/15 text-rose-500 flex items-center justify-center shrink-0">
                                        <Play size={12} fill="currentColor" className="ml-0.5" />
                                      </div>
                                      <h6 className="font-bold text-white text-sm line-clamp-1">{vid.title}</h6>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed italic pl-10">
                                      "{vid.reasoning}"
                                    </p>
                                  </div>

                                  <a 
                                    href={vid.url || `https://youtube.com/watch?v=${vid.youtube_video_id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white shrink-0 active:scale-95 transition-all self-end md:self-center"
                                  >
                                    <ExternalLink size={12} /> Ver Video
                                  </a>
                                </div>
                              ))}

                              {(!sol.videos || sol.videos.length === 0) && (
                                <p className="text-xs text-slate-500 italic">No se recuperaron detalles de video directamente en base de datos. IDs: {sol.matched_video_ids?.join(', ')}</p>
                              )}
                            </div>
                          </div>

                        </div>
                      )}

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
