import styles from './page.module.css'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-zinc-950 text-white">
      <div className="z-10 w-full max-w-2xl items-center justify-center font-mono text-sm flex flex-col gap-8 text-center">
        
        <div className="space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 text-transparent bg-clip-text">
            Starter Story LATAM Engine
          </h1>
          <p className="text-xl text-zinc-400 font-light">
            Sistema inteligente de extracción, clasificación y generación de soluciones.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 px-6 py-3 rounded-full">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-emerald-400 font-semibold tracking-wide">ESTADO: En desarrollo (Sprint 1)</span>
        </div>

        <div className="mt-8 pt-8 border-t border-zinc-800/50 w-full flex flex-col items-center">
          <p className="mb-6 text-zinc-500 text-sm">Panel de Control General (Layer 2 - Interfaz de Pruebas)</p>
          <button className="px-8 py-4 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            ▶ Run Scraper (Placeholder)
          </button>
        </div>

      </div>
    </main>
  )
}
