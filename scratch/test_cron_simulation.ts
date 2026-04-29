import { runIncrementalScrape } from '../services/incrementalScraperService';

async function testWeeklyCronSimulation() {
  console.log("--- SIMULACIÓN DE EJECUCIÓN SEMANAL ---");
  
  // Simulamos una ejecución de cron con run_type específico
  const results = await runIncrementalScrape(5, 10, 'weekly_cron_test');
  
  console.log("Resultados de Simulación:");
  console.log(JSON.stringify(results, null, 2));
  
  if (results.success) {
    console.log("✔ Simulación exitosa. Revisa scraping_logs para confirmar el registro.");
  } else {
    console.error("✖ Fallo en la simulación.");
  }
}

testWeeklyCronSimulation();
