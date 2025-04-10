const puppeteer = require('puppeteer');

async function swebenchScraper() {
  let browser;
  try {
    // Add --no-sandbox flag for cron compatibility
    browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    console.log('Navigating to SWebench page...');
    await page.goto('https://www.swebench.com/#verified', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('Waiting for leaderboard to load...');
    await page.waitForSelector('table', { timeout: 30000 });

const allModels = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('table tbody tr'));
  return rows.map(row => {
    const cols = row.querySelectorAll('td');
    if (cols.length < 2) return null;
    
    const modelElement = cols[0].querySelector('p.model-type');
    const scoreElement = cols[1].querySelector('p.number');
    
    if (!modelElement || !scoreElement) return null;
    
    const model = modelElement.textContent.trim().replace(/[\n\s]+/g, ' ').replace(/^[^\w]+/, '');
    const score = parseFloat(scoreElement.textContent.trim());
    
    if (isNaN(score)) return null;
    
    return {
      model: model,
      score: score
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
    console.error('Error scraping SWebench:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = swebenchScraper;
