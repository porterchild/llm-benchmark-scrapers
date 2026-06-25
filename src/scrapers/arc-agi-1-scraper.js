/**
 * Scrapes the ARC-AGI-1 leaderboard data.
 * @param {object} browser - Puppeteer browser instance (not used, direct API fetch).
 * @param {number} count - The number of top models to return.
 * @returns {Promise<Array<{model: string, score: string}>>} - A promise that resolves to the top N models.
 */
async function arcAgi1Scraper(browser, count = 10) {
  try {
    const [evalsRes, modelsRes, providersRes] = await Promise.all([
      fetch('https://arcprize.org/media/data/evaluations.json'),
      fetch('https://arcprize.org/media/data/models.json'),
      fetch('https://arcprize.org/media/data/providers.json')
    ]);

    const [evaluations, models, providers] = await Promise.all([
      evalsRes.json(),
      modelsRes.json(),
      providersRes.json()
    ]);

    const modelMap = {};
    models.forEach(m => modelMap[m.id] = { displayName: m.displayName || m.id, providerId: m.providerId });

    const providerMap = {};
    providers.forEach(p => providerMap[p.id] = p.displayName);

    const arcAgi1Data = evaluations
      .filter(d => d.datasetId === 'v1_Semi_Private' && d.display)
      .sort((a, b) => b.score - a.score)
      .slice(0, count);

    return arcAgi1Data.map(e => {
      const modelInfo = modelMap[e.modelId] || { displayName: e.modelId, providerId: '' };
      const providerName = modelInfo.providerId ? (providerMap[modelInfo.providerId] || '') : '';
      const modelName = providerName ? `${modelInfo.displayName} (${providerName})` : modelInfo.displayName;
      return {
        model: modelName,
        score: (e.score * 100).toFixed(1) + '%'
      };
    });
  } catch (error) {
    console.error('Error scraping ARC-AGI-1:', error);
    return [];
  }
}

module.exports = arcAgi1Scraper;
