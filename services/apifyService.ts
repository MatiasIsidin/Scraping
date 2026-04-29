export async function fetchStarterStoryVideos(maxResults: number = 20) {
  const API_TOKEN = process.env.APIFY_API_TOKEN;

  if (!API_TOKEN) {
    throw new Error('APIFY_API_TOKEN is not defined in environment variables.');
  }

  const endpoint = `https://api.apify.com/v2/acts/streamers~youtube-scraper/run-sync-get-dataset-items?token=${API_TOKEN}`;

  const payload = {
    startUrls: [{ url: 'https://www.youtube.com/@starterstory' }],
    maxResults: maxResults,
    maxResultsShorts: 0,
    downloadSubtitles: false,
    saveSnapshots: false
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Apify Request Failed: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data from Apify Service:', error);
    throw error;
  }
}
