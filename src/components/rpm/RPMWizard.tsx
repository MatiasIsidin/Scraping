'use client';

import React, { useState } from 'react';
import '@/styles/rpm-wizard.css';

// --- TYPES ---
export interface RPMData {
  resources: {
    skills: string[];
    experience: string;
    timeAvailable: string;
    capital: string;
    tools: string[];
  };
  passions: {
    interests: string[];
    motivations: string;
    preferredIndustries: string[];
  };
  market: {
    targetMarket: string;
    knownProblems: string;
    businessCapabilities: string;
  };
}

const INITIAL_DATA: RPMData = {
  resources: {
    skills: [],
    experience: 'beginner',
    timeAvailable: 'part-time',
    capital: 'low',
    tools: []
  },
  passions: {
    interests: [],
    motivations: '',
    preferredIndustries: []
  },
  market: {
    targetMarket: 'LATAM',
    knownProblems: '',
    businessCapabilities: ''
  }
};

export default function RPMWizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<RPMData>(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
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
        alert('Perfil RPM generado con éxito');
        // Redirigir a vista de perfil
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rpm-wizard-container">
      <div className="rpm-progress-bar">
        <div className="rpm-progress-fill" style={{ width: `${progress}%` }}></div>
      </div>

      {step === 1 && (
        <div className="rpm-step-content">
          <div className="rpm-step-header">
            <h2 className="rpm-step-title">Resources (R)</h2>
            <p className="rpm-step-description">Define tus activos, habilidades y recursos disponibles para emprender.</p>
          </div>
          
          <div className="rpm-form-group">
            <label className="rpm-label">Experiencia previa</label>
            <select 
              className="rpm-select" 
              value={data.resources.experience}
              onChange={(e) => setData({...data, resources: {...data.resources, experience: e.target.value}})}
            >
              <option value="beginner">Principiante (0-2 años)</option>
              <option value="intermediate">Intermedio (2-5 años)</option>
              <option value="expert">Experto (5+ años)</option>
            </select>
          </div>

          <div className="rpm-form-group">
            <label className="rpm-label">Capital disponible para inversión (USD)</label>
            <div className="rpm-options-grid">
              {['$0 - $500', '$500 - $2000', '$2000 - $10000', '$10000+'].map(cap => (
                <div 
                  key={cap}
                  className={`rpm-option-card ${data.resources.capital === cap ? 'selected' : ''}`}
                  onClick={() => setData({...data, resources: {...data.resources, capital: cap}})}
                >
                  {cap}
                </div>
              ))}
            </div>
          </div>
          
          <div className="rpm-form-group">
            <label className="rpm-label">Habilidades Clave (Separadas por coma)</label>
            <textarea 
              className="rpm-textarea" 
              placeholder="Ej: Marketing Digital, Python, Ventas B2B..."
              value={data.resources.skills.join(', ')}
              onChange={(e) => setData({...data, resources: {...data.resources, skills: e.target.value.split(',').map(s => s.trim())}})}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rpm-step-content">
          <div className="rpm-step-header">
            <h2 className="rpm-step-title">Passions (P)</h2>
            <p className="rpm-step-description">¿Qué te mueve? La pasión es el combustible para superar los valles de desesperación.</p>
          </div>

          <div className="rpm-form-group">
            <label className="rpm-label">Industrias de interés</label>
            <div className="rpm-options-grid">
              {['Fintech', 'EdTech', 'SaaS', 'E-commerce', 'HealthTech', 'AgroTech'].map(ind => (
                <div 
                  key={ind}
                  className={`rpm-option-card ${data.passions.preferredIndustries.includes(ind) ? 'selected' : ''}`}
                  onClick={() => {
                    const current = data.passions.preferredIndustries;
                    const next = current.includes(ind) ? current.filter(i => i !== ind) : [...current, ind];
                    setData({...data, passions: {...data.passions, preferredIndustries: next}});
                  }}
                >
                  {ind}
                </div>
              ))}
            </div>
          </div>

          <div className="rpm-form-group">
            <label className="rpm-label">¿Qué te motiva a emprender?</label>
            <textarea 
              className="rpm-textarea" 
              rows={4}
              placeholder="Ej: Libertad financiera, resolver la falta de crédito en mi país, pasión por la tecnología..."
              value={data.passions.motivations}
              onChange={(e) => setData({...data, passions: {...data.passions, motivations: e.target.value}})}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rpm-step-content">
          <div className="rpm-step-header">
            <h2 className="rpm-step-title">Market (M)</h2>
            <p className="rpm-step-description">Alineación con el mercado. ¿Qué problemas ves y cómo planeas atacarlos?</p>
          </div>

          <div className="rpm-form-group">
            <label className="rpm-label">Mercado objetivo principal</label>
            <select 
              className="rpm-select"
              value={data.market.targetMarket}
              onChange={(e) => setData({...data, market: {...data.market, targetMarket: e.target.value}})}
            >
              <option value="LATAM">Latinoamérica (Regional)</option>
              <option value="Mexico">México</option>
              <option value="Colombia">Colombia</option>
              <option value="Argentina">Argentina</option>
              <option value="Global">Global / US</option>
            </select>
          </div>

          <div className="rpm-form-group">
            <label className="rpm-label">Problemas específicos que has detectado</label>
            <textarea 
              className="rpm-textarea" 
              rows={4}
              placeholder="Ej: Las pymes no tienen acceso a CRM fácil, la logística de última milla es cara..."
              value={data.market.knownProblems}
              onChange={(e) => setData({...data, market: {...data.market, knownProblems: e.target.value}})}
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
          Anterior
        </button>
        
        {step < totalSteps ? (
          <button className="rpm-btn rpm-btn-primary" onClick={handleNext}>
            Siguiente
          </button>
        ) : (
          <button 
            className="rpm-btn rpm-btn-primary" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Procesando...' : 'Finalizar Perfil'}
          </button>
        )}
      </div>
    </div>
  );
}
