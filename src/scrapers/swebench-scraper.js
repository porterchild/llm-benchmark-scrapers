const puppeteer = require('puppeteer');

async function swebenchScraper(count = 10) {
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
    // Wait for the specific table for the "Verified" leaderboard
    await page.waitForSelector('div#leaderboard-Verified table.data-table', { timeout: 30000 });

    const allModels = await page.evaluate(() => {
      // Select rows from the "Verified" leaderboard table
      const rows = Array.from(document.querySelectorAll('div#leaderboard-Verified table.data-table tbody tr'));
      return rows.map(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length < 2) return null; // Ensure at least two columns (Model and Score)

        // Model name is in the first column, within a span with class 'model-name'
        const modelElement = cols[0].querySelector('span.model-name');
        // Score is in the second column, within a span with class 'number'
        const scoreElement = cols[1].querySelector('span.number');

        if (!modelElement || !scoreElement) return null;

        const model = modelElement.textContent.trim();
        const scoreText = scoreElement.textContent.trim();
        const score = parseFloat(scoreText);

        if (isNaN(score)) return null;

        return {
          model: model,
          score: score
        };
      }).filter(Boolean); // Filter out any null entries (e.g., if parsing failed for a row)
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
    console.error('Error scraping SWebench:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = swebenchScraper;

// Add this block to make the script runnable directly
if (require.main === module) {
  (async () => {
    try {
      const numResults = process.argv[2] ? parseInt(process.argv[2], 10) : 10; // Allow passing count via CLI for direct run
      console.log(`Running SWE-Bench scraper directly (top ${numResults})...`);
      const results = await swebenchScraper(numResults);
      console.log('\n--- SWE-Bench Scraper Results ---');
      console.log(JSON.stringify(results, null, 2));
      console.log('-------------------------------\n');
    } catch (error) {
      console.error('Error running SWE-Bench scraper directly:', error);
      process.exit(1); // Exit with error code if direct run fails
    }
  })();
}
