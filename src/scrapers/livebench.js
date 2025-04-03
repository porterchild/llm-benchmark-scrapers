const puppeteer = require('puppeteer');

async function livebenchScraper() {
  let browser;
  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    console.log('Navigating to LiveBench page...');
    await page.goto('https://livebench.ai/#/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('Waiting for leaderboard to load...');
    await page.waitForSelector('table', { timeout: 30000 });

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

    // Sort by score (descending) and take top 5
    const top5 = allModels
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (top5.length === 0) {
      throw new Error('No valid rows found in leaderboard');
    }

    return top5;
  } catch (error) {
    console.error('Error scraping LiveBench:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = livebenchScraper;
