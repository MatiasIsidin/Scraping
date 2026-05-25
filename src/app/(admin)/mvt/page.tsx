'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  MessageSquare,
  Lightbulb,
  FlaskConical,
  BarChart3,
  Flag,
  Plus,
  Trash2,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  Zap,
  Clock,
  Users,
  Target,
  ArrowRight,
  Star
} from 'lucide-react';
import clsx from 'clsx';

// Types
interface MvtProcess {
  id: string;
  solution_title: string;
  pain_point_title: string;
  fit_score: number;
  selected_at: string;
  current_state: string;
  is_active: boolean;
}

interface Conversation {
  id: string;
  contact_name: string;
  segment: string;
  company: string;
  role: string;
  conversation_date: string;
  channel: string;
  duration_minutes: number;
  notes: string;
  problems_detected: string;
  literal_quotes: string;
  pain_level: number;
  willingness_to_pay: string;
  observations: string;
}

interface Hypothesis {
  id: string;
  hypothesis: string;
  type: string;
  risk: string;
  impact: string;
  priority: number;
  justification: string;
}

interface MvtTest {
  id: string;
  hypothesis_id: string;
  name: string;
  test_type: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  url: string;
  target_metric: string;
  expected_result: string;
}

interface MvtResult {
  id: string;
  test_id: string;
  target_metric: string;
  actual_result: string;
  difference: string;
  fulfillment_percentage: number;
  classification: string;
  reasoning: string;
}

interface MvtDecision {
  id: string;
  decision: string;
  justification: string;
  learnings: string;
  next_steps: string;
  version: number;
}

const STATES = ['INMERSION', 'HIPOTESIS', 'TESTING', 'RESULTADOS', 'DECISION'] as const;
const STATE_ICONS = {
  INMERSION: MessageSquare,
  HIPOTESIS: Lightbulb,
  TESTING: FlaskConical,
  RESULTADOS: BarChart3,
  DECISION: Flag
};

export default function MvtPage() {
  const [process, setProcess] = useState<MvtProcess | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [tests, setTests] = useState<MvtTest[]>([]);
  const [results, setResults] = useState<MvtResult[]>([]);
  const [decision, setDecision] = useState<MvtDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<string>('INMERSION');

  // Form states
  const [showConvForm, setShowConvForm] = useState(false);
  const [showHypForm, setShowHypForm] = useState(false);
  const [showTestForm, setShowTestForm] = useState(false);
  const [showResultForm, setShowResultForm] = useState(false);
  const [showDecisionForm, setShowDecisionForm] = useState(false);

  const fetchMvtData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mvt');
      const data = await res.json();
      if (data.success && data.process) {
        setProcess(data.process);
        setConversations(data.conversations || []);
        setHypotheses(data.hypotheses || []);
        setTests(data.tests || []);
        setResults(data.results || []);
        setDecision(data.decision || null);
        setActiveStep(data.process.current_state);
      }
    } catch (err) {
      console.error('Error fetching MVT data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMvtData(); }, []);

  const updateState = async (newState: string) => {
    try {
      await fetch('/api/mvt', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_state: newState })
      });
      setActiveStep(newState);
      setProcess(prev => prev ? { ...prev, current_state: newState } : null);
    } catch (err) {
      console.error('Error updating state:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando módulo MVT...</p>
      </div>
    );
  }

  if (!process) {
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <h1 className="text-4xl font-black text-white tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          MVT Validation
        </h1>
        <div className="glass-card py-24 text-center border-dashed border-slate-800 max-w-3xl mx-auto space-y-6">
          <div className="w-16 h-16 bg-slate-900/50 border border-slate-800 rounded-3xl flex items-center justify-center mx-auto text-slate-500">
            <Target size={28} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">No hay proceso MVT activo</h3>
            <p className="text-slate-400 max-w-md mx-auto text-sm">
              Para iniciar el proceso de validación MVT, primero selecciona una solución en el Solution Engine.
              La solución seleccionada se convertirá automáticamente en tu MVT Activo.
            </p>
          </div>
          <a
            href="/solutions"
            className="inline-flex items-center gap-3 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest px-8 py-4.5 rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/10 active:scale-95"
          >
            <Zap size={16} /> Ir al Solution Engine
          </a>
        </div>
      </div>
    );
  }

  const validatedTests = results.filter(r => r.classification === 'VALIDADA').length;
  const invalidatedTests = results.filter(r => r.classification === 'INVALIDADA').length;
  const criticalHypotheses = hypotheses.filter(h => h.risk === 'CRITICA').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            MVT Validation
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Proceso de validación de mercado para tu solución seleccionada.</p>
        </div>
      </div>

      {/* MVT Active Solution Card */}
      <div className="p-6 bg-gradient-to-r from-indigo-900/20 to-slate-900/40 rounded-3xl border border-indigo-500/20 space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
          <Star size={14} fill="currentColor" /> MVT Activo
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Solución</span>
            <span className="text-sm font-bold text-white">{process.solution_title}</span>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Pain Point</span>
            <span className="text-sm font-bold text-slate-300">{process.pain_point_title}</span>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Fit Score</span>
            <span className="text-sm font-bold text-emerald-400">{process.fit_score}/100</span>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Seleccionada</span>
            <span className="text-sm font-bold text-slate-300">{new Date(process.selected_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* State Progress Bar */}
      <div className="flex items-center gap-2 p-4 bg-slate-900/30 rounded-2xl border border-slate-800/50 overflow-x-auto">
        {STATES.map((state, idx) => {
          const Icon = STATE_ICONS[state];
          const isCurrent = activeStep === state;
          const stateIdx = STATES.indexOf(activeStep as typeof STATES[number]);
          const isPast = idx < stateIdx;
          return (
            <React.Fragment key={state}>
              <button
                onClick={() => { updateState(state); setActiveStep(state); }}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                  isCurrent
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : isPast
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-slate-800/50 text-slate-500 hover:text-slate-300"
                )}
              >
                <Icon size={14} />
                {state}
              </button>
              {idx < STATES.length - 1 && (
                <ChevronRight size={14} className="text-slate-700 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Dashboard Summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-800/50 text-center">
          <span className="text-2xl font-black text-white">{conversations.length}/5</span>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mt-1">Entrevistas</span>
        </div>
        <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-800/50 text-center">
          <span className="text-2xl font-black text-white">{hypotheses.length}/5</span>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mt-1">Hipótesis</span>
        </div>
        <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-800/50 text-center">
          <span className="text-2xl font-black text-amber-400">{criticalHypotheses}</span>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mt-1">Críticas</span>
        </div>
        <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-800/50 text-center">
          <span className="text-2xl font-black text-white">{tests.length}</span>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mt-1">Tests</span>
        </div>
        <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-800/50 text-center">
          <span className="text-2xl font-black text-emerald-400">{validatedTests}</span>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mt-1">Validados</span>
        </div>
        <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-800/50 text-center">
          <span className="text-2xl font-black text-rose-400">{invalidatedTests}</span>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mt-1">Invalidados</span>
        </div>
      </div>

      {/* Step Content */}
      {activeStep === 'INMERSION' && (
        <ImmersionStep
          conversations={conversations}
          showForm={showConvForm}
          setShowForm={setShowConvForm}
          onRefresh={fetchMvtData}
        />
      )}
      {activeStep === 'HIPOTESIS' && (
        <HypothesisStep
          hypotheses={hypotheses}
          showForm={showHypForm}
          setShowForm={setShowHypForm}
          onRefresh={fetchMvtData}
        />
      )}
      {activeStep === 'TESTING' && (
        <TestingStep
          tests={tests}
          hypotheses={hypotheses}
          showForm={showTestForm}
          setShowForm={setShowTestForm}
          onRefresh={fetchMvtData}
        />
      )}
      {activeStep === 'RESULTADOS' && (
        <ResultsStep
          results={results}
          tests={tests}
          showForm={showResultForm}
          setShowForm={setShowResultForm}
          onRefresh={fetchMvtData}
        />
      )}
      {activeStep === 'DECISION' && (
        <DecisionStep
          decision={decision}
          showForm={showDecisionForm}
          setShowForm={setShowDecisionForm}
          onRefresh={fetchMvtData}
        />
      )}
    </div>
  );
}


// ============================================================
// PASO 1 — INMERSIÓN (Conversaciones)
// ============================================================
function ImmersionStep({ conversations, showForm, setShowForm, onRefresh }: {
  conversations: Conversation[];
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  onRefresh: () => void;
}) {
  const [form, setForm] = useState({
    contact_name: '', segment: '', company: '', role: '',
    conversation_date: '', channel: '', duration_minutes: '',
    notes: '', problems_detected: '', literal_quotes: '',
    pain_level: '5', willingness_to_pay: '', observations: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/mvt/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
          pain_level: Number(form.pain_level)
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setForm({ contact_name: '', segment: '', company: '', role: '', conversation_date: '', channel: '', duration_minutes: '', notes: '', problems_detected: '', literal_quotes: '', pain_level: '5', willingness_to_pay: '', observations: '' });
        onRefresh();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta conversación?')) return;
    await fetch(`/api/mvt/conversations?id=${id}`, { method: 'DELETE' });
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare size={20} className="text-indigo-400" /> Paso 1: Inmersión
          </h2>
          <p className="text-sm text-slate-400 mt-1">Registra mínimo 5 entrevistas de validación con potenciales clientes.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={clsx(
            "text-sm font-black px-3 py-1.5 rounded-full border",
            conversations.length >= 5
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
          )}>
            {conversations.length}/5
          </span>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all active:scale-95"
          >
            <Plus size={14} /> Nueva Entrevista
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-6 border-indigo-500/20 space-y-4 animate-in slide-in-from-top duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none" placeholder="Nombre entrevistado *" value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} required />
            <input className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none" placeholder="Segmento" value={form.segment} onChange={e => setForm({...form, segment: e.target.value})} />
            <input className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none" placeholder="Empresa" value={form.company} onChange={e => setForm({...form, company: e.target.value})} />
            <input className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none" placeholder="Cargo" value={form.role} onChange={e => setForm({...form, role: e.target.value})} />
            <input className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none" type="date" placeholder="Fecha" value={form.conversation_date} onChange={e => setForm({...form, conversation_date: e.target.value})} />
            <select className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none" value={form.channel} onChange={e => setForm({...form, channel: e.target.value})}>
              <option value="">Canal...</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Zoom">Zoom</option>
              <option value="Presencial">Presencial</option>
              <option value="Teléfono">Teléfono</option>
              <option value="Email">Email</option>
              <option value="LinkedIn">LinkedIn</option>
            </select>
            <input className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none" type="number" placeholder="Duración (min)" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: e.target.value})} />
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 font-bold">Dolor (1-10):</label>
              <input className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white w-20 focus:border-indigo-500 outline-none" type="number" min="1" max="10" value={form.pain_level} onChange={e => setForm({...form, pain_level: e.target.value})} />
            </div>
            <input className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none" placeholder="Disposición a pagar" value={form.willingness_to_pay} onChange={e => setForm({...form, willingness_to_pay: e.target.value})} />
          </div>
          <textarea className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none min-h-[80px]" placeholder="Notas completas de la conversación..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          <textarea className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none min-h-[60px]" placeholder="Problemas detectados..." value={form.problems_detected} onChange={e => setForm({...form, problems_detected: e.target.value})} />
          <textarea className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none min-h-[60px]" placeholder="Frases textuales del entrevistado..." value={form.literal_quotes} onChange={e => setForm({...form, literal_quotes: e.target.value})} />
          <textarea className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none min-h-[60px]" placeholder="Observaciones adicionales..." value={form.observations} onChange={e => setForm({...form, observations: e.target.value})} />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar Entrevista'}
            </button>
          </div>
        </form>
      )}

      {/* Conversations List */}
      <div className="space-y-3">
        {conversations.map((conv, idx) => (
          <div key={conv.id} className="glass-card p-5 border-slate-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xs font-black">{idx + 1}</div>
                <div>
                  <h4 className="font-bold text-white text-sm">{conv.contact_name}</h4>
                  <span className="text-xs text-slate-500">{conv.company} — {conv.role} — {conv.segment}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={clsx(
                  "text-xs font-bold px-2 py-1 rounded-full border",
                  conv.pain_level >= 8 ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                  conv.pain_level >= 5 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                  "bg-slate-800 text-slate-400 border-slate-700"
                )}>
                  Dolor: {conv.pain_level}/10
                </span>
                <span className="text-xs text-slate-500">{conv.channel} • {conv.duration_minutes}min</span>
                <button onClick={() => handleDelete(conv.id)} className="text-slate-600 hover:text-rose-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {conv.notes && <p className="text-sm text-slate-400 leading-relaxed">{conv.notes}</p>}
            {conv.literal_quotes && (
              <p className="text-sm text-indigo-300 italic border-l-2 border-indigo-500/30 pl-3">"{conv.literal_quotes}"</p>
            )}
            {conv.problems_detected && (
              <p className="text-xs text-slate-500"><strong className="text-slate-400">Problemas:</strong> {conv.problems_detected}</p>
            )}
          </div>
        ))}
        {conversations.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-8">No hay entrevistas registradas aún. Agrega tu primera entrevista.</p>
        )}
      </div>
    </div>
  );
}


// ============================================================
// PASO 2 — HIPÓTESIS
// ============================================================
function HypothesisStep({ hypotheses, showForm, setShowForm, onRefresh }: {
  hypotheses: Hypothesis[];
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  onRefresh: () => void;
}) {
  const [form, setForm] = useState({
    hypothesis: '', type: '', risk: 'MEDIA', impact: 'MEDIA', priority: '0', justification: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/mvt/hypotheses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, priority: Number(form.priority) })
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setForm({ hypothesis: '', type: '', risk: 'MEDIA', impact: 'MEDIA', priority: '0', justification: '' });
        onRefresh();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta hipótesis?')) return;
    await fetch(`/api/mvt/hypotheses?id=${id}`, { method: 'DELETE' });
    onRefresh();
  };

  const riskColors: Record<string, string> = {
    BAJA: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    MEDIA: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    ALTA: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    CRITICA: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  };

  const sorted = [...hypotheses].sort((a, b) => {
    const order = { CRITICA: 4, ALTA: 3, MEDIA: 2, BAJA: 1 };
    return (order[b.risk as keyof typeof order] || 0) - (order[a.risk as keyof typeof order] || 0);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Lightbulb size={20} className="text-amber-400" /> Paso 2: Hipótesis
          </h2>
          <p className="text-sm text-slate-400 mt-1">Genera mínimo 5 hipótesis de validación ordenadas por riesgo e impacto.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={clsx(
            "text-sm font-black px-3 py-1.5 rounded-full border",
            hypotheses.length >= 5
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
          )}>
            {hypotheses.length}/5
          </span>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all active:scale-95"
          >
            <Plus size={14} /> Nueva Hipótesis
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-6 border-indigo-500/20 space-y-4 animate-in slide-in-from-top duration-300">
          <textarea className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none min-h-[80px]" placeholder="Hipótesis *" value={form.hypothesis} onChange={e => setForm({...form, hypothesis: e.target.value})} required />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none" placeholder="Tipo (ej: Demanda, Precio)" value={form.type} onChange={e => setForm({...form, type: e.target.value})} />
            <select className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none" value={form.risk} onChange={e => setForm({...form, risk: e.target.value})}>
              <option value="BAJA">Riesgo: Baja</option>
              <option value="MEDIA">Riesgo: Media</option>
              <option value="ALTA">Riesgo: Alta</option>
              <option value="CRITICA">Riesgo: Crítica</option>
            </select>
            <select className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none" value={form.impact} onChange={e => setForm({...form, impact: e.target.value})}>
              <option value="BAJA">Impacto: Baja</option>
              <option value="MEDIA">Impacto: Media</option>
              <option value="ALTA">Impacto: Alta</option>
              <option value="CRITICA">Impacto: Crítica</option>
            </select>
            <input className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none" type="number" placeholder="Prioridad (0-10)" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} />
          </div>
          <textarea className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none min-h-[60px]" placeholder="Justificación..." value={form.justification} onChange={e => setForm({...form, justification: e.target.value})} />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar Hipótesis'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {sorted.map((hyp, idx) => (
          <div key={hyp.id} className={clsx(
            "glass-card p-5 border-slate-800/60 space-y-2",
            hyp.risk === 'CRITICA' && "ring-1 ring-rose-500/30 bg-rose-950/10"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-slate-500">#{idx + 1}</span>
                <span className={clsx("text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border", riskColors[hyp.risk] || riskColors.MEDIA)}>
                  {hyp.risk}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Impacto: {hyp.impact}</span>
                {hyp.type && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{hyp.type}</span>}
              </div>
              <button onClick={() => handleDelete(hyp.id)} className="text-slate-600 hover:text-rose-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
            <p className="text-sm font-bold text-white">{hyp.hypothesis}</p>
            {hyp.justification && <p className="text-xs text-slate-400">{hyp.justification}</p>}
          </div>
        ))}
        {hypotheses.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-8">No hay hipótesis registradas. Agrega tu primera hipótesis.</p>
        )}
      </div>
    </div>
  );
}


// ============================================================
// PASO 3 — TESTING
// ============================================================
function TestingStep({ tests, hypotheses, showForm, setShowForm, onRefresh }: {
  tests: MvtTest[];
  hypotheses: Hypothesis[];
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  onRefresh: () => void;
}) {
  const [form, setForm] = useState({
    name: '', hypothesis_id: '', test_type: 'OTRO', description: '',
    start_date: '', end_date: '', url: '', target_metric: '', expected_result: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/mvt/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          hypothesis_id: form.hypothesis_id || null,
          start_date: form.start_date || null,
          end_date: form.end_date || null
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setForm({ name: '', hypothesis_id: '', test_type: 'OTRO', description: '', start_date: '', end_date: '', url: '', target_metric: '', expected_result: '' });
        onRefresh();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateTestStatus = async (id: string, status: string) => {
    await fetch('/api/mvt/tests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este test?')) return;
    await fetch(`/api/mvt/tests?id=${id}`, { method: 'DELETE' });
    onRefresh();
  };

  const testTypes: Record<string, string> = {
    LANDING_PAGE: 'Landing Page', SMOKE_TEST: 'Smoke Test', PREVENTA: 'Preventa',
    ENCUESTA: 'Encuesta', ANUNCIO: 'Anuncio', POST_REDES: 'Post Redes',
    DEMO: 'Demo', PROTOTIPO: 'Prototipo', OTRO: 'Otro'
  };

  const statusColors: Record<string, string> = {
    PENDIENTE: 'bg-slate-800 text-slate-400 border-slate-700',
    EN_CURSO: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    COMPLETADO: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    CANCELADO: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FlaskConical size={20} className="text-emerald-400" /> Paso 3: Tests
          </h2>
          <p className="text-sm text-slate-400 mt-1">Registra experimentos reales de validación.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all active:scale-95"
        >
          <Plus size={14} /> Nuevo Test
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-6 border-indigo-500/20 space-y-4 animate-in slide-in-from-top duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none" placeholder="Nombre del test *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            <select className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none" value={form.test_type} onChange={e => setForm({...form, test_type: e.target.value})}>
              {Object.entries(testTypes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none" value={form.hypothesis_id} onChange={e => setForm({...form, hypothesis_id: e.target.value})}>
              <option value="">Hipótesis asociada...</option>
              {hypotheses.map(h => <option key={h.id} value={h.id}>{h.hypothesis.slice(0, 60)}...</option>)}
            </select>
          </div>
          <textarea className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none min-h-[60px]" placeholder="Descripción del experimento..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none" type="date" placeholder="Fecha inicio" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
            <input className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none" type="date" placeholder="Fecha fin" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
            <input className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none" placeholder="URL" value={form.url} onChange={e => setForm({...form, url: e.target.value})} />
            <input className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none" placeholder="Métrica objetivo" value={form.target_metric} onChange={e => setForm({...form, target_metric: e.target.value})} />
          </div>
          <input className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none" placeholder="Resultado esperado" value={form.expected_result} onChange={e => setForm({...form, expected_result: e.target.value})} />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar Test'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {tests.map((test) => (
          <div key={test.id} className="glass-card p-5 border-slate-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700/50">
                  {testTypes[test.test_type] || test.test_type}
                </span>
                <span className={clsx("text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border", statusColors[test.status] || statusColors.PENDIENTE)}>
                  {test.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white"
                  value={test.status}
                  onChange={e => updateTestStatus(test.id, e.target.value)}
                >
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="EN_CURSO">En Curso</option>
                  <option value="COMPLETADO">Completado</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
                <button onClick={() => handleDelete(test.id)} className="text-slate-600 hover:text-rose-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <h4 className="font-bold text-white text-sm">{test.name}</h4>
            {test.description && <p className="text-xs text-slate-400">{test.description}</p>}
            <div className="flex items-center gap-4 text-xs text-slate-500">
              {test.target_metric && <span><strong className="text-slate-400">Métrica:</strong> {test.target_metric}</span>}
              {test.expected_result && <span><strong className="text-slate-400">Esperado:</strong> {test.expected_result}</span>}
              {test.url && <a href={test.url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Ver URL</a>}
            </div>
          </div>
        ))}
        {tests.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-8">No hay tests registrados. Crea tu primer experimento.</p>
        )}
      </div>
    </div>
  );
}


// ============================================================
// PASO 4 — RESULTADOS
// ============================================================
function ResultsStep({ results, tests, showForm, setShowForm, onRefresh }: {
  results: MvtResult[];
  tests: MvtTest[];
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  onRefresh: () => void;
}) {
  const [form, setForm] = useState({
    test_id: '', target_metric: '', actual_result: '', difference: '',
    fulfillment_percentage: '', classification: '', reasoning: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/mvt/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          test_id: form.test_id || null,
          fulfillment_percentage: Number(form.fulfillment_percentage) || 0
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setForm({ test_id: '', target_metric: '', actual_result: '', difference: '', fulfillment_percentage: '', classification: '', reasoning: '' });
        onRefresh();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const classColors: Record<string, string> = {
    VALIDADA: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    INVALIDADA: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    INCONCLUSA: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 size={20} className="text-indigo-400" /> Paso 4: Resultados
          </h2>
          <p className="text-sm text-slate-400 mt-1">Compara objetivo vs resultado real de cada test.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all active:scale-95"
        >
          <Plus size={14} /> Registrar Resultado
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-6 border-indigo-500/20 space-y-4 animate-in slide-in-from-top duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none" value={form.test_id} onChange={e => setForm({...form, test_id: e.target.value})}>
              <option value="">Test asociado...</option>
              {tests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none" placeholder="Métrica objetivo" value={form.target_metric} onChange={e => setForm({...form, target_metric: e.target.value})} />
            <input className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none" placeholder="Resultado obtenido" value={form.actual_result} onChange={e => setForm({...form, actual_result: e.target.value})} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none" placeholder="Diferencia" value={form.difference} onChange={e => setForm({...form, difference: e.target.value})} />
            <input className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none" type="number" min="0" max="100" placeholder="% Cumplimiento" value={form.fulfillment_percentage} onChange={e => setForm({...form, fulfillment_percentage: e.target.value})} />
            <select className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none" value={form.classification} onChange={e => setForm({...form, classification: e.target.value})}>
              <option value="">Auto-clasificar...</option>
              <option value="VALIDADA">Validada</option>
              <option value="INVALIDADA">Invalidada</option>
              <option value="INCONCLUSA">Inconclusa</option>
            </select>
          </div>
          <textarea className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none min-h-[60px]" placeholder="Razonamiento / análisis..." value={form.reasoning} onChange={e => setForm({...form, reasoning: e.target.value})} />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar Resultado'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {results.map((result) => {
          const test = tests.find(t => t.id === result.test_id);
          return (
            <div key={result.id} className="glass-card p-5 border-slate-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {test && <span className="text-xs font-bold text-slate-400">{test.name}</span>}
                  <span className={clsx("text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border", classColors[result.classification] || classColors.INCONCLUSA)}>
                    {result.classification}
                  </span>
                </div>
                <span className="text-lg font-black text-white">{result.fulfillment_percentage}%</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-[9px] font-black text-slate-500 uppercase block">Objetivo</span>
                  <span className="text-slate-300">{result.target_metric || '-'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-500 uppercase block">Resultado</span>
                  <span className="text-slate-300">{result.actual_result || '-'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-500 uppercase block">Diferencia</span>
                  <span className="text-slate-300">{result.difference || '-'}</span>
                </div>
              </div>
              {result.reasoning && <p className="text-xs text-slate-400 italic">{result.reasoning}</p>}
            </div>
          );
        })}
        {results.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-8">No hay resultados registrados. Completa tests y registra sus resultados.</p>
        )}
      </div>
    </div>
  );
}


// ============================================================
// PASO 5 — DECISIÓN FINAL
// ============================================================
function DecisionStep({ decision, showForm, setShowForm, onRefresh }: {
  decision: MvtDecision | null;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  onRefresh: () => void;
}) {
  const [form, setForm] = useState({
    decision: 'AVANZAR', justification: '', learnings: '', next_steps: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/mvt/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        onRefresh();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const decisionColors: Record<string, string> = {
    AVANZAR: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    AJUSTAR: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    DESCARTAR: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Flag size={20} className="text-rose-400" /> Paso 5: Decisión Final
          </h2>
          <p className="text-sm text-slate-400 mt-1">Registra la decisión final basada en la evidencia recopilada.</p>
        </div>
        {!decision && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all active:scale-95"
          >
            <Plus size={14} /> Registrar Decisión
          </button>
        )}
      </div>

      {showForm && !decision && (
        <form onSubmit={handleSubmit} className="glass-card p-6 border-indigo-500/20 space-y-4 animate-in slide-in-from-top duration-300">
          <div className="grid grid-cols-3 gap-4">
            {(['AVANZAR', 'AJUSTAR', 'DESCARTAR'] as const).map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setForm({...form, decision: opt})}
                className={clsx(
                  "p-4 rounded-xl border-2 text-center font-black text-sm uppercase tracking-wider transition-all",
                  form.decision === opt
                    ? decisionColors[opt] + " scale-105"
                    : "border-slate-800 text-slate-500 hover:border-slate-700"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
          <textarea className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none min-h-[80px]" placeholder="Justificación de la decisión *" value={form.justification} onChange={e => setForm({...form, justification: e.target.value})} required />
          <textarea className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none min-h-[60px]" placeholder="Aprendizajes clave..." value={form.learnings} onChange={e => setForm({...form, learnings: e.target.value})} />
          <textarea className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none min-h-[60px]" placeholder="Próximos pasos..." value={form.next_steps} onChange={e => setForm({...form, next_steps: e.target.value})} />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Confirmar Decisión'}
            </button>
          </div>
        </form>
      )}

      {decision && (
        <div className={clsx("glass-card p-8 space-y-6", decisionColors[decision.decision])}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black">{decision.decision === 'AVANZAR' ? '🚀' : decision.decision === 'AJUSTAR' ? '🔄' : '❌'}</span>
              <div>
                <h3 className="text-2xl font-black text-white">{decision.decision}</h3>
                <span className="text-xs text-slate-500">Versión {decision.version} — Decisión final registrada</span>
              </div>
            </div>
          </div>
          {decision.justification && (
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Justificación</span>
              <p className="text-sm text-slate-300 leading-relaxed">{decision.justification}</p>
            </div>
          )}
          {decision.learnings && (
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Aprendizajes</span>
              <p className="text-sm text-slate-300 leading-relaxed">{decision.learnings}</p>
            </div>
          )}
          {decision.next_steps && (
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Próximos Pasos</span>
              <p className="text-sm text-slate-300 leading-relaxed">{decision.next_steps}</p>
            </div>
          )}
        </div>
      )}

      {!decision && !showForm && (
        <p className="text-center text-slate-500 text-sm py-8">No se ha registrado una decisión final. Completa los pasos anteriores y registra tu decisión.</p>
      )}
    </div>
  );
}
