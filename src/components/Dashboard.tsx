'use client';

import React, { useEffect, useState } from 'react';
import { supabaseClient } from '@lib/supabaseClient';

export default function LatamDashboard() {
  const [stats, setStats] = useState({ videos: 0, painPoints: 0, classifications: 0 });
  const [recentClassifications, setRecentClassifications] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const { count: v } = await supabaseClient.from('videos').select('*', { count: 'exact', head: true });
      const { count: p } = await supabaseClient.from('pain_points').select('*', { count: 'exact', head: true });
      const { count: c } = await supabaseClient.from('video_classifications').select('*', { count: 'exact', head: true });
      
      setStats({ videos: v || 0, painPoints: p || 0, classifications: c || 0 });

      const { data } = await supabaseClient
        .from('video_classifications')
        .select(`
          relevance_score,
          reasoning,
          videos(title),
          pain_points(title)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setRecentClassifications(data || []);
    }
    loadData();
  }, []);

  return (
    <div style={{ padding: '2rem', color: '#f8fafc', background: '#0f172a', minHeight: '100vh' }}>
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Market Intelligence Dashboard</h1>
        <p style={{ color: '#94a3b8' }}>Análisis en tiempo real de oportunidades de negocio en LATAM.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
        {[
          { label: 'Videos Analizados', value: stats.videos, color: '#6366f1' },
          { label: 'Dolores Detectados', value: stats.painPoints, color: '#a855f7' },
          { label: 'Clasificaciones IA', value: stats.classifications, color: '#ec4899' }
        ].map((stat, i) => (
          <div key={i} style={{ background: '#1e293b', padding: '2rem', borderRadius: '20px', border: '1px solid #334155' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase' }}>{stat.label}</p>
            <p style={{ fontSize: '3rem', fontWeight: 800, color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Últimas Clasificaciones</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {recentClassifications.map((c, i) => (
            <div key={i} style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '16px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{c.videos?.title}</h3>
                <span style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700 }}>
                  Match: {c.relevance_score}%
                </span>
              </div>
              <p style={{ color: '#cbd5e1', marginBottom: '0.5rem' }}><strong style={{ color: '#a855f7' }}>Pain Point:</strong> {c.pain_points?.title}</p>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic' }}>{c.reasoning}</p>
            </div>
          ))}
          {recentClassifications.length === 0 && <p style={{ color: '#64748b' }}>No hay clasificaciones recientes. Ejecuta el clasificador IA para ver resultados.</p>}
        </div>
      </section>
    </div>
  );
}
