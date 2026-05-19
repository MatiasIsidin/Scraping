// ============================================================
// SCRATCH: INITIALIZE REAL RPM PROFILE (MATIAS)
// ============================================================

import * as fs from 'fs';
import * as path from 'path';

// Load env
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

async function main() {
  const { rpmProfileService } = await import('../services/rpmProfileService');

  const matiasData = {
    resources: {
      skills: ["TypeScript", "Python", "Web Scraping", "AI Agents", "Next.js", "Data Engineering"],
      experience: "expert",
      capital: "$2000 - $10000",
      timeAvailable: "full-time",
      tools: ["Cursor", "Supabase", "OpenRouter", "Vercel"]
    },
    passions: {
      interests: ["SaaS", "AI Automation", "Market Intelligence", "Fintech"],
      motivations: "Democratizar el acceso a inteligencia de mercado accionable para emprendedores en Latinoamérica utilizando agentes de IA.",
      preferredIndustries: ["SaaS", "Fintech", "AI"]
    },
    market: {
      targetMarket: "LATAM",
      knownProblems: "Fragmentación de datos, falta de herramientas de análisis de nichos locales y barreras tecnológicas para pymes.",
      businessCapabilities: "Alta capacidad técnica para ejecución rápida de MVPs y automatización de pipelines de datos."
    }
  };

  console.log('🚀 Generando Perfil RPM Real para: Matias...');
  const result = await rpmProfileService.processAndSaveProfile('Matias', matiasData);

  console.log('\n═══════════════════════════════════════════');
  console.log('PERFIL RPM GENERADO CON ÉXITO');
  console.log('═══════════════════════════════════════════');
  console.log(`✅ ID de Perfil: ${result.profileId}`);
  console.log(`✅ Business Fit Score: ${result.aiAnalysis.business_fit_score}%`);
  console.log(`✅ Recomendaciones: ${result.aiAnalysis.recommended_models.join(', ')}`);
  console.log('\nRESUMEN ESTRATÉGICO:');
  console.log(result.aiAnalysis.strategic_summary);
}

main().catch(console.error);
