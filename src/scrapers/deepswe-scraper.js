/**
 * Scrapes the DeepSWE leaderboard data.
 * @param {object} browser - Puppeteer browser instance (not used, direct API fetch).
 * @param {number} topCount - The number of top models to return.
 * @returns {Promise<Array<{model: string, score: string}>>} - A promise that resolves to the top N models.
 */
async function deepSWEScraper(browser, topCount = 10) {
  try {
    const html = await fetch('https://deepswe.datacurve.ai/').then(r => r.text());

    const rowsMatch = html.match(/pass_rate:([\d.]+)/g);
    const modelsMatch = html.match(/model:"([^"]+)"/g);

    if (!rowsMatch || !modelsMatch) {
      console.warn('Could not find DeepSWE data in page HTML');
      return [];
    }

    // Build model data array, keeping best score for each model
    const modelBestScores = {};
    for (let i = 0; i < modelsMatch.length && i < rowsMatch.length; i++) {
      const modelName = modelsMatch[i].match(/model:"([^"]+)"/)?.[1];
      const passRate = parseFloat(rowsMatch[i].match(/pass_rate:([\d.]+)/)?.[1]);
      if (modelName && passRate !== null) {
        if (!modelBestScores[modelName] || passRate > modelBestScores[modelName]) {
          modelBestScores[modelName] = passRate;
        }
      }
    }

    // Convert to array, sort by pass rate descending, and take top N
    return Object.entries(modelBestScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topCount)
      .map(([model, score]) => ({
        model: model,
        score: (score * 100).toFixed(1) + '%'
      }));
  } catch (error) {
    console.error('Error scraping DeepSWE:', error.message || error);
    return [];
  }
}

module.exports = deepSWEScraper;
