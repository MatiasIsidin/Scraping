'use client';

import { useState, useEffect } from 'react';

interface Video {
  id: string;
  youtube_video_id: string;
  title: string;
  url: string;
  view_count: number;
  likes: number;
  channel_name: string;
  published_at: string;
}

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingVideos, setFetchingVideos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scraperResult, setScraperResult] = useState<any>(null);

  const fetchVideos = async () => {
    setFetchingVideos(true);
    try {
      const response = await fetch('/api/videos');
      const data = await response.json();
      if (data.success) {
        setVideos(data.data || []);
      } else {
        console.error('Error fetching videos:', data.error);
      }
    } catch (err) {
      console.error('Failed to fetch videos:', err);
    } finally {
      setFetchingVideos(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const runScraper = async () => {
    setLoading(true);
    setScraperResult(null);
    setError(null);
    try {
      const response = await fetch('/api/run-scraper');
      const data = await response.json();
      if (data.success) {
        setScraperResult(data);
        await fetchVideos(); // Refrescar automáticamente la lista
      } else {
        setError(data.message || data.error || 'Error desconocido');
      }
    } catch (err: any) {
      setError(err.message || 'Error en la petición');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-black text-white p-6 md:p-12">
      <div className="w-full max-w-6xl flex flex-col gap-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-zinc-800 pb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 text-transparent bg-clip-text">
              Starter Story LATAM
            </h1>
            <p className="text-zinc-400 mt-2 font-light">
              Explora las últimas oportunidades de negocio validadas.
            </p>
          </div>
          
          <button 
            onClick={runScraper}
            disabled={loading}
            className={`flex items-center gap-2 px-6 py-3 ${loading ? 'bg-zinc-800 text-zinc-500' : 'bg-white text-black hover:bg-zinc-200'} font-bold rounded-full transition-all hover:scale-105 disabled:cursor-not-allowed shadow-lg`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-zinc-500 border-t-white rounded-full animate-spin"></div>
                Ejecutando...
              </>
            ) : (
              <>
                <span className="text-lg">▶</span>
                Run Scraper
              </>
            )}
          </button>
        </div>

        {/* Feedback de Scraper */}
        {scraperResult && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="flex items-center gap-3">
               <span className="text-emerald-400 font-bold text-lg">✓</span>
               <div className="flex flex-col">
                 <span className="text-emerald-400 text-sm font-semibold">Scraping completado con éxito.</span>
                 <span className="text-emerald-500/70 text-xs">
                   Resultados: {scraperResult.inserted} nuevos, {scraperResult.skipped} omitidos, {scraperResult.snapshots_created} métricas capturadas.
                 </span>
               </div>
             </div>
             <button onClick={() => setScraperResult(null)} className="text-zinc-500 hover:text-white text-xs">Cerrar</button>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Lista de Videos */}
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold text-zinc-300">Últimos Videos Scrapeados</h2>
          
          {fetchingVideos ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
              <div className="w-8 h-8 border-2 border-zinc-800 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <p className="animate-pulse">Cargando videos...</p>
            </div>
          ) : videos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <a 
                  key={video.id} 
                  href={video.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 hover:bg-zinc-900 transition-all duration-300 flex flex-col justify-between gap-4 h-full"
                >
                  <div className="space-y-3">
                    <h3 className="font-bold text-zinc-100 group-hover:text-blue-400 transition-colors line-clamp-2">
                      {video.title}
                    </h3>
                    <p className="text-zinc-500 text-xs font-mono">{video.channel_name || 'YouTube'}</p>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-800/50">
                    <div className="flex gap-4">
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[10px] uppercase tracking-wider">Vistas</span>
                        <span className="text-zinc-300 text-sm font-bold">{(video.view_count || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[10px] uppercase tracking-wider">Likes</span>
                        <span className="text-zinc-300 text-sm font-bold">{(video.likes || 0).toLocaleString()}</span>
                      </div>
                    </div>
                    <span className="bg-zinc-800 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    </span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-600 bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800">
              <span className="text-4xl mb-4">📭</span>
              <p>No hay videos aún.</p>
              <button 
                onClick={runScraper}
                className="mt-4 text-blue-500 hover:underline text-sm font-medium"
              >
                Ejecutar primer scraping →
              </button>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
