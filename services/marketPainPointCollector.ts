/**
 * SERVICIO RECOLECTOR DE FUENTES (Market Pain Point Collector)
 * FASE 1: Recolección y Normalización.
 */

export interface RawSourceData {
  source: string;
  title: string;
  content: string;
  url?: string;
  date?: string;
}

export async function collectMarketData(): Promise<RawSourceData[]> {
  console.log(`[PAIN-POINT-COLLECTOR] Iniciando recolección de mercado...`);
  const allData: RawSourceData[] = [];

  // 1. RECOLECCIÓN DE REDDIT (vía JSON público sin auth)
  try {
    const subreddits = ['startups', 'entrepreneur', 'SaaS'];
    for (const sub of subreddits) {
      console.log(`[PAIN-POINT-COLLECTOR] Consultando r/${sub}...`);
      const response = await fetch(`https://www.reddit.com/r/${sub}/top.json?t=month&limit=10`);
      
      if (response.ok) {
        const json = await response.json();
        const posts = json.data?.children || [];
        
        posts.forEach((post: any) => {
          const { title, selftext, url, created_utc } = post.data;
          
          if (title && selftext && selftext.length > 50) { // Filtrar muy cortos
            allData.push({
              source: `Reddit (r/${sub})`,
              title: title,
              content: selftext,
              url: url,
              date: new Date(created_utc * 1000).toISOString()
            });
          }
        });
      }
    }
  } catch (err: any) {
    console.error(`[PAIN-POINT-COLLECTOR] Error consultando Reddit:`, err.message);
  }

  // 2. STUB PARA OTRAS FUENTES (LinkedIn, Product Hunt, etc.)
  // Aquí se podrían integrar actores de Apify (ej: apify/product-hunt-scraper)
  allData.push({
    source: 'Product Hunt (Mock)',
    title: 'Users complaining about SaaS onboarding',
    content: 'We need better onboarding tools. Everyone drops off at the sign-up phase because the friction is too high and payment integrations fail constantly in LATAM.',
    url: 'https://producthunt.com',
    date: new Date().toISOString()
  });

  console.log(`[PAIN-POINT-COLLECTOR] Recolección finalizada: ${allData.length} documentos encontrados.`);
  return allData;
}
