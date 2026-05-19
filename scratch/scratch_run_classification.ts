// ============================================================
// SCRATCH: RUN CLASSIFICATION BATCH (Fixed Env Loading)
// ============================================================

import * as fs from 'fs';
import * as path from 'path';

// 1. CARGAR ENV ANTES QUE NADA
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      const value = trimmed.substring(eqIdx + 1).trim();
      process.env[key] = value;
    }
  }
}

// 2. IMPORTAR DESPUÉS DE CARGAR ENV
async function run() {
  const { videoClassificationService } = await import('../services/videoClassificationService');
  
  console.log('🚀 Iniciando lote de clasificación IA (Fase 1 - Validación)...');
  const stats = await videoClassificationService.runBatchClassification(3); // Reducido a 3 para velocidad
  
  console.log('\n═══════════════════════════════════════════');
  console.log('RESULTADOS DE CLASIFICACIÓN');
  console.log('═══════════════════════════════════════════');
  console.log(`✅ Videos procesados: ${stats.videos_processed}`);
  console.log(`✅ Análisis creados: ${stats.analyses_created}`);
  console.log(`✅ Clasificaciones creadas: ${stats.classifications_created}`);
  console.log(`📊 Tokens totales: ${stats.total_tokens}`);
  console.log(`💰 Costo estimado: $${stats.estimated_cost.toFixed(4)}`);
  
  if (stats.errors.length > 0) {
    console.log('\n❌ ERRORES DETECTADOS:');
    stats.errors.forEach((e: any) => console.log(`  - ${e}`));
  }
}

run().catch(console.error);
