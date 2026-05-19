import { videoClassificationService } from '../services/videoClassificationService';

async function processSample() {
  console.log('[AUDIT-PREP] Procesando 2 videos para auditoría real...');
  const stats = await videoClassificationService.runBatchClassification(2);
  console.log('[AUDIT-PREP] Resultado:', JSON.stringify(stats, null, 2));
}

processSample();
