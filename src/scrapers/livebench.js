async function livebenchScraper(browser, count = 10, navigationTimeout = 60000, selectorTimeout = 30000) {
  try {
    const page = await browser.newPage();
    
    console.log('Navigating to LiveBench page...');
    await page.goto('https://livebench.ai/#/', {
      waitUntil: 'networkidle2',
      timeout: navigationTimeout
    });

    console.log('Waiting for leaderboard to load...');
    await page.waitForSelector('table', { timeout: selectorTimeout });

    const allModels = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      return rows.map(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length < 3) return null;
        
        const model = cols[0].textContent.trim();
        const score = cols[2].textContent.trim(); // Global Average is 3rd column
        
        if (isNaN(parseFloat(score))) return null;
        
        return {
          model: model,
          score: parseFloat(score)
        };
      }).filter(Boolean);
    });

    // Sort by score (descending) and take top N
    const topN = allModels
      .sort((a, b) => b.score - a.score)
      .slice(0, count);

    if (topN.length === 0) {
      throw new Error('No valid rows found in leaderboard');
    }

    return topN;
  } catch (error) {
    console.error('Error scraping LiveBench:', error.message);
    throw error;
  }
}

module.exports = livebenchScraper;
