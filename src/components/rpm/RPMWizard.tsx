'use client';

import React, { useState, useEffect } from 'react';
import '@/styles/rpm-wizard.css';

// --- TYPES ---
// --- TYPES ---
export interface RPMData {
  results: {
    incomeGoal: string;
    timeline: string;
    clarityScore: number;
    successIndicator: string;
    preferredModel: string;
    hoursPerWeek: string;
  };
  purpose: {
    financialFreedomMeaning: string;
    lossConsequence: string;
    emotionalUrgency: number;
    lifestyleGoal: string;
    targetImpact: string;
    currentFrustration: string;
    selfProof: string;
  };
  map: { // Massive Action Plan
    currentSkills: string;
    salesSkill: number;
    techSkill: number;
    availableResources: string;
    currentConstraints: string;
    riskTolerance: number;
    immediateActions: string;
    executionAvailability: string;
  };
}

const INITIAL_DATA: RPMData = {
  results: {
    incomeGoal: '1.000–3.000',
    timeline: '12 months',
    clarityScore: 3,
    successIndicator: '',
    preferredModel: 'SaaS',
    hoursPerWeek: '10-20'
  },
  purpose: {
    financialFreedomMeaning: '',
    lossConsequence: '',
    emotionalUrgency: 3,
    lifestyleGoal: '',
    targetImpact: '',
    currentFrustration: '',
    selfProof: ''
  },
  map: {
    currentSkills: '',
    salesSkill: 1,
    techSkill: 1,
    availableResources: '',
    currentConstraints: '',
    riskTolerance: 1,
    immediateActions: '',
    executionAvailability: 'medium'
  }
};

import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Rocket, 
  Target, 
  TrendingUp, 
  Zap, 
  Users, 
  DollarSign, 
  Clock, 
  Briefcase,
  Heart,
  Globe,
  Shield,
  Lightbulb
} from 'lucide-react';

// --- HELPER COMPONENTS ---

const ScaleInput = ({ 
  label, 
  value, 
  onChange, 
  minLabel = "Bajo", 
  maxLabel = "Experto",
  description
}: { 
  label: string; 
  value: number; 
  onChange: (val: number) => void;
  minLabel?: string;
  maxLabel?: string;
  description?: string;
}) => (
  <div className="rpm-form-group">
    <label className="rpm-label">
      {label}
      <span className="rpm-label-tag">Escala 1-5</span>
    </label>
    {description && <p className="rpm-step-description" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>{description}</p>}
    <div className="rpm-scale-container">
      <input 
        type="range" 
        min="1" 
        max="5" 
        step="1"
        value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="rpm-range-input"
      />
      <div className="rpm-scale-labels">
        {[1, 2, 3, 4, 5].map((num) => (
          <div key={num} className={`rpm-scale-label ${value === num ? 'active' : ''}`}>
            {num === 1 ? minLabel : num === 5 ? maxLabel : num}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const OptionGrid = ({ 
  label, 
  options, 
  selected, 
  onChange, 
  multiple = false 
}: { 
  label: string; 
  options: string[]; 
  selected: any; 
  onChange: (val: any) => void;
  multiple?: boolean;
}) => (
  <div className="rpm-form-group">
    <label className="rpm-label">{label}</label>
    <div className="rpm-options-grid">
      {options.map((opt) => {
        const isSelected = multiple ? selected.includes(opt) : selected === opt;
        return (
          <div 
            key={opt}
            className={`rpm-option-card ${isSelected ? 'selected' : ''}`}
            onClick={() => {
              if (multiple) {
                const next = selected.includes(opt) 
                  ? selected.filter((i: string) => i !== opt) 
                  : [...selected, opt];
                onChange(next);
              } else {
                onChange(opt);
              }
            }}
          >
            {isSelected && <Check size={14} style={{ marginRight: '8px', display: 'inline' }} />}
            {opt}
          </div>
        );
      })}
    </div>
  </div>
);

export default function RPMWizard() {
  const [view, setView] = useState<'wizard' | 'summary'>('wizard');
  const [step, setStep] = useState(1);
  const [data, setData] = useState<RPMData>(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  // --- HYDRATION: Fetch persistent profile on mount ---
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/rpm/profile');
        const result = await res.json();
        if (result.success && result.profile) {
          setProfile(result.profile);
          setData(result.profile.rawData || INITIAL_DATA);
          setView('summary');
        }
      } catch (err) {
        console.error('Error loading persistent profile:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, []);

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/rpm/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (result.success) {
        setProfile(result.profile);
        setView('summary');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (err) {
      console.error(err);
      alert('Error al procesar el perfil. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    console.log('[RPM-WIZARD] Click en Resetear Todo detected');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/rpm/reset', { method: 'POST' });
      const result = await res.json();
      
      if (result.success) {
        console.log('[RPM-WIZARD] Reset exitoso en DB');
        setData(INITIAL_DATA);
        setStep(1);
        setView('wizard');
        setProfile(null);
      } else {
        throw new Error(result.error || 'Fallo el reset en el servidor');
      }
    } catch (err: any) {
      console.error('[RPM-WIZARD] Error en reset:', err);
      alert(`Error al resetear perfil: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rpm-wizard-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div className="animate-pulse text-center">
          <Rocket size={48} className="text-indigo-500 mb-4 mx-auto" />
          <p className="text-slate-400">Sincronizando perfil estratégico...</p>
        </div>
      </div>
    );
  }

  if (view === 'summary' && profile) {
    const ai = profile.aiAnalysis || {};
    const displayData = profile.rawData || data;
    return (
      <div className="rpm-wizard-container">
        <div className="rpm-step-content summary-view">
          <div className="rpm-step-header">
            <h2 className="rpm-step-title"><Rocket style={{ display: 'inline', marginRight: '12px' }} /> Tu Perfil RPM Procesado</h2>
            <p className="rpm-step-description">Análisis estratégico basado en el método Robbins.</p>
          </div>

          <div className="rpm-summary-grid">
            {/* AI Insights Card */}
            <div className="rpm-card-premium ai-insights">
              <div className="ai-badge"><Zap size={14} /> IA Strategic Analysis</div>
              <h3 className="archetype-title">{ai.entrepreneur_archetype}</h3>
              <p className="strategic-summary">{ai.strategic_summary}</p>
              
              <div className="scores-row">
                <div className="score-item">
                  <span className="score-label">Ejecución</span>
                  <div className="score-value">{ai.scores?.execution_readiness || 0}%</div>
                </div>
                <div className="score-item">
                  <span className="score-label">Claridad</span>
                  <div className="score-value">{ai.scores?.strategic_clarity || 0}%</div>
                </div>
                <div className="score-item">
                  <span className="score-label">Urgencia</span>
                  <div className="score-value">{ai.scores?.emotional_urgency || 0}%</div>
                </div>
              </div>
            </div>

            {/* Sugerencias IA */}
            <div className="rpm-grid-2">
              <div className="rpm-card-premium">
                <h4><Lightbulb size={18} /> Categorías Sugeridas</h4>
                <ul className="summary-list">
                  {ai.recommended_business_types?.map((t: string) => <li key={t}>{t}</li>) || <li>No disponible</li>}
                </ul>
              </div>
              <div className="rpm-card-premium">
                <h4><Heart size={18} /> Drivers Emocionales</h4>
                <ul className="summary-list">
                  {ai.emotional_drivers?.map((d: string) => <li key={d}>{d}</li>) || <li>No disponible</li>}
                </ul>
              </div>
            </div>

            {/* Results Summary */}
            <div className="rpm-section-divider">Results (R) <button onClick={() => { setView('wizard'); setStep(1); }} className="edit-btn">Editar</button></div>
            <div className="rpm-summary-details">
              <div className="detail-item"><strong>Meta Mensual:</strong> {displayData.results.incomeGoal} USD</div>
              <div className="detail-item"><strong>Horizonte:</strong> {displayData.results.timeline}</div>
              <div className="detail-item"><strong>Horas/Semana:</strong> {displayData.results.hoursPerWeek}</div>
              <div className="detail-item"><strong>Modelo:</strong> {displayData.results.preferredModel}</div>
              <div className="detail-item full"><strong>Indicador de Éxito:</strong> {displayData.results.successIndicator}</div>
            </div>

            {/* Purpose Summary */}
            <div className="rpm-section-divider">Purpose (P) <button onClick={() => { setView('wizard'); setStep(2); }} className="edit-btn">Editar</button></div>
            <div className="rpm-summary-details">
              <div className="detail-item full"><strong>Libertad Financiera:</strong> {displayData.purpose.financialFreedomMeaning}</div>
              <div className="detail-item full"><strong>Consecuencia del No-Logro:</strong> {displayData.purpose.lossConsequence}</div>
              <div className="detail-item"><strong>Estilo de Vida:</strong> {displayData.purpose.lifestyleGoal}</div>
              <div className="detail-item"><strong>Urgencia:</strong> {displayData.purpose.emotionalUrgency}/5</div>
            </div>

            {/* MAP Summary */}
            <div className="rpm-section-divider">Action Plan (M) <button onClick={() => { setView('wizard'); setStep(3); }} className="edit-btn">Editar</button></div>
            <div className="rpm-summary-details">
              <div className="detail-item"><strong>Habilidades:</strong> {displayData.map.currentSkills}</div>
              <div className="detail-item"><strong>Recursos:</strong> {displayData.map.availableResources}</div>
              <div className="detail-item"><strong>Restricciones:</strong> {displayData.map.currentConstraints}</div>
              <div className="detail-item"><strong>Riesgo:</strong> {displayData.map.riskTolerance}/5</div>
              <div className="detail-item full"><strong>Acciones 72h:</strong> {displayData.map.immediateActions}</div>
            </div>
          </div>

          <div className="rpm-navigation summary-nav">
            <button 
              className="rpm-btn rpm-btn-secondary" 
              onClick={handleReset} 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Reseteando...' : 'Resetear Todo'}
            </button>
            <button className="rpm-btn rpm-btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Reprocesando...' : 'Reprocesar con IA'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rpm-wizard-container">
      <div className="rpm-progress-bar">
        <div className="rpm-progress-fill" style={{ width: `${progress}%` }}></div>
      </div>

      {step === 1 && (
        <div className="rpm-step-content">
          <div className="rpm-step-header">
            <h2 className="rpm-step-title"><Target style={{ display: 'inline', marginRight: '12px' }} /> Results (R)</h2>
            <p className="rpm-step-description">Define exactamente qué quieres lograr. Resultados medibles y claros.</p>
          </div>

          <div className="rpm-grid-2">
            <OptionGrid 
              label="Ingreso mensual objetivo (USD)"
              options={['< 1.000', '1.000–3.000', '3.000–10.000', '10.000+']}
              selected={data.results.incomeGoal}
              onChange={(val) => setData({...data, results: {...data.results, incomeGoal: val}})}
            />
            <OptionGrid 
              label="Horizonte de tiempo"
              options={['3 meses', '6 meses', '12 meses', '24 meses']}
              selected={data.results.timeline}
              onChange={(val) => setData({...data, results: {...data.results, timeline: val}})}
            />
          </div>

          <ScaleInput 
            label="Nivel de claridad de tu meta actual"
            value={data.results.clarityScore}
            onChange={(val) => setData({...data, results: {...data.results, clarityScore: val}})}
            minLabel="Confuso"
            maxLabel="Cristalino"
          />

          <div className="rpm-form-group">
            <label className="rpm-label">¿Cómo sabrás que lo lograste? (Indicador de éxito)</label>
            <textarea 
              className="rpm-textarea" 
              placeholder="Ej: Veré $5,000 en mi cuenta bancaria, tendré 10 clientes recurrentes..."
              value={data.results.successIndicator}
              onChange={(e) => setData({...data, results: {...data.results, successIndicator: e.target.value}})}
            />
          </div>

          <div className="rpm-grid-2">
            <div className="rpm-form-group">
              <label className="rpm-label">Tipo de modelo preferido</label>
              <select 
                className="rpm-select" 
                value={data.results.preferredModel}
                onChange={(e) => setData({...data, results: {...data.results, preferredModel: e.target.value}})}
              >
                <option value="SaaS">SaaS (Software as a Service)</option>
                <option value="Services">Servicios / Agencia</option>
                <option value="E-commerce">E-commerce</option>
                <option value="Education">Educación / Info-productos</option>
                <option value="Automation">Automatización B2B</option>
              </select>
            </div>
            <div className="rpm-form-group">
              <label className="rpm-label">Horas reales disponibles por semana</label>
              <select 
                className="rpm-select" 
                value={data.results.hoursPerWeek}
                onChange={(e) => setData({...data, results: {...data.results, hoursPerWeek: e.target.value}})}
              >
                <option value="<10">Menos de 10 horas</option>
                <option value="10-20">10 – 20 horas</option>
                <option value="20-40">20 – 40 horas</option>
                <option value="full-time">Full-time</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rpm-step-content">
          <div className="rpm-step-header">
            <h2 className="rpm-step-title"><Heart style={{ display: 'inline', marginRight: '12px' }} /> Purpose (P)</h2>
            <p className="rpm-step-description">Extraigamos tu motivación profunda. ¿Por qué es OBLIGATORIO para ti lograr esto?</p>
          </div>

          <div className="rpm-form-group">
            <label className="rpm-label">¿Qué significa libertad financiera para ti?</label>
            <textarea 
              className="rpm-textarea" 
              rows={3}
              placeholder="Describe tu visión de libertad..."
              value={data.purpose.financialFreedomMeaning}
              onChange={(e) => setData({...data, purpose: {...data.purpose, financialFreedomMeaning: e.target.value}})}
            />
          </div>

          <div className="rpm-form-group">
            <label className="rpm-label">¿Qué perderías si NO lo logras en 12–24 meses?</label>
            <textarea 
              className="rpm-textarea" 
              rows={3}
              placeholder="Ej: Perdería tiempo valioso con mis hijos, seguiría atrapado en un empleo que odio..."
              value={data.purpose.lossConsequence}
              onChange={(e) => setData({...data, purpose: {...data.purpose, lossConsequence: e.target.value}})}
            />
          </div>

          <ScaleInput 
            label="Nivel de urgencia emocional"
            value={data.purpose.emotionalUrgency}
            onChange={(val) => setData({...data, purpose: {...data.purpose, emotionalUrgency: val}})}
            minLabel="Deseo"
            maxLabel="Obsesión/Necesidad"
          />

          <div className="rpm-grid-2">
            <div className="rpm-form-group">
              <label className="rpm-label">Tipo de vida que quieres construir</label>
              <textarea 
                className="rpm-textarea" 
                placeholder="Ej: Trabajar desde la playa, tener un equipo de 5 personas..."
                value={data.purpose.lifestyleGoal}
                onChange={(e) => setData({...data, purpose: {...data.purpose, lifestyleGoal: e.target.value}})}
              />
            </div>
            <div className="rpm-form-group">
              <label className="rpm-label">¿A quién quieres impactar o ayudar?</label>
              <textarea 
                className="rpm-textarea" 
                placeholder="Ej: A mis padres, a 1000 emprendedores locales..."
                value={data.purpose.targetImpact}
                onChange={(e) => setData({...data, purpose: {...data.purpose, targetImpact: e.target.value}})}
              />
            </div>
          </div>

          <div className="rpm-form-group">
            <label className="rpm-label">¿Qué te está frustrando actualmente en tu vida laboral?</label>
            <textarea 
              className="rpm-textarea" 
              rows={3}
              placeholder="Saca lo que sientes ahora..."
              value={data.purpose.currentFrustration}
              onChange={(e) => setData({...data, purpose: {...data.purpose, currentFrustration: e.target.value}})}
            />
          </div>

          <div className="rpm-form-group">
            <label className="rpm-label">¿Qué te gustaría demostrarte a ti mismo?</label>
            <input 
              className="rpm-input"
              placeholder="Ej: Que soy capaz de construir algo propio, que puedo ser libre..."
              value={data.purpose.selfProof}
              onChange={(e) => setData({...data, purpose: {...data.purpose, selfProof: e.target.value}})}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rpm-step-content">
          <div className="rpm-step-header">
            <h2 className="rpm-step-title"><Rocket style={{ display: 'inline', marginRight: '12px' }} /> Massive Action Plan (M)</h2>
            <p className="rpm-step-description">Convirtamos la intención en ejecución real. ¿Qué harás masivamente?</p>
          </div>

          <div className="rpm-form-group">
            <label className="rpm-label">Habilidades actuales principales</label>
            <textarea 
              className="rpm-textarea" 
              placeholder="Ej: Programación, Ventas directas, Gestión de proyectos..."
              value={data.map.currentSkills}
              onChange={(e) => setData({...data, map: {...data.map, currentSkills: e.target.value}})}
            />
          </div>

          <div className="rpm-grid-2">
            <ScaleInput 
              label="Habilidad en Ventas"
              value={data.map.salesSkill}
              onChange={(val) => setData({...data, map: {...data.map, salesSkill: val}})}
            />
            <ScaleInput 
              label="Tecnología / Automatización"
              value={data.map.techSkill}
              onChange={(val) => setData({...data, map: {...data.map, techSkill: val}})}
            />
          </div>

          <div className="rpm-grid-2">
            <div className="rpm-form-group">
              <label className="rpm-label">Recursos disponibles</label>
              <textarea 
                className="rpm-textarea" 
                placeholder="Dinero, contactos, herramientas..."
                value={data.map.availableResources}
                onChange={(e) => setData({...data, map: {...data.map, availableResources: e.target.value}})}
              />
            </div>
            <div className="rpm-form-group">
              <label className="rpm-label">Restricciones actuales</label>
              <textarea 
                className="rpm-textarea" 
                placeholder="Falta de capital, falta de tiempo, miedo..."
                value={data.map.currentConstraints}
                onChange={(e) => setData({...data, map: {...data.map, currentConstraints: e.target.value}})}
              />
            </div>
          </div>

          <div className="rpm-grid-2">
            <ScaleInput 
              label="Tolerancia al Riesgo"
              minLabel="Baja"
              maxLabel="Total"
              value={data.map.riskTolerance}
              onChange={(val) => setData({...data, map: {...data.map, riskTolerance: val}})}
            />
            <OptionGrid 
              label="Disponibilidad real de ejecución diaria"
              options={['Baja', 'Media', 'Alta']}
              selected={data.map.executionAvailability}
              onChange={(val) => setData({...data, map: {...data.map, executionAvailability: val}})}
            />
          </div>

          <div className="rpm-form-group">
            <label className="rpm-label">3 Acciones inmediatas (Próximas 24–72h)</label>
            <textarea 
              className="rpm-textarea" 
              rows={3}
              placeholder="1. Crear landing page, 2. Llamar a 3 contactos, 3. Definir nicho..."
              value={data.map.immediateActions}
              onChange={(e) => setData({...data, map: {...data.map, immediateActions: e.target.value}})}
            />
          </div>
        </div>
      )}

      <div className="rpm-navigation">
        <button 
          className="rpm-btn rpm-btn-secondary" 
          onClick={handlePrev} 
          disabled={step === 1 || isSubmitting}
        >
          <ChevronLeft size={20} /> Anterior
        </button>
        
        {step < totalSteps ? (
          <button className="rpm-btn rpm-btn-primary" onClick={handleNext}>
            Siguiente <ChevronRight size={20} />
          </button>
        ) : (
          <button 
            className="rpm-btn rpm-btn-primary" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>Procesando <Zap size={20} className="animate-pulse" /></>
            ) : (
              <>Finalizar Perfil RPM <Rocket size={20} /></>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

