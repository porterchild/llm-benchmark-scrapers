async function aiderScraper(browser, count = 10, navigationTimeout = 60000, selectorTimeout = 30000) {
  // Aider scraper disabled: leaderboard contains outdated models (o3, Gemini 2.5 from 2024-2025)
  console.warn('Aider scraper disabled: benchmark data appears outdated.');
  return [];
}

module.exports = aiderScraper;
