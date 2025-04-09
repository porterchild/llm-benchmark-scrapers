const puppeteer = require('puppeteer');

async function aiderScraper() {
  let browser;
  const url = 'https://aider.chat/docs/leaderboards/';
  console.log(`Navigating to Aider Leaderboard page: ${url}`);

  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000 // 60 seconds navigation timeout
    });

    console.log('Waiting for Aider leaderboard table to load...');
    // Target the first table within the main content area
    await page.waitForSelector('main table', { timeout: 30000 }); // 30 seconds wait for table

    console.log('Extracting Aider leaderboard data...');
    const allModels = await page.evaluate(() => {
      // Select the first table within the main content area
      const table = document.querySelector('main table');
      if (!table) return [];

      const rows = Array.from(table.querySelectorAll('tbody tr'));
      return rows.map(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length < 2) return null; // Need at least Model and Score columns

        const modelElement = cols[0]; // First column for model name
        const scoreElement = cols[1]; // Second column for score

        if (!modelElement || !scoreElement) return null;

        const model = modelElement.textContent.trim();
        // Extract percentage, remove '%', and convert to float
        const scoreText = scoreElement.textContent.trim().replace('%', '');
        const score = parseFloat(scoreText);

        if (!model || isNaN(score)) return null; // Skip if model name is empty or score is not a number

        return {
          model: model,
          score: score // Store score as a number
        };
      }).filter(Boolean); // Remove any null entries
    });

    if (allModels.length === 0) {
      throw new Error('No valid rows found in Aider leaderboard table');
    }

    // Sort by score (descending) and take top 5
    const top5 = allModels
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    console.log(`Successfully scraped ${top5.length} models from Aider Leaderboard.`);
    return top5;

  } catch (error) {
    console.error(`Error scraping Aider Leaderboard (${url}):`, error.message);
    // Re-throw the error so the main script knows it failed
    throw new Error(`Aider scraper failed: ${error.message}`);
  } finally {
    if (browser) {
      console.log('Closing browser for Aider scraper.');
      await browser.close();
    }
  }
}

module.exports = aiderScraper;

// Add this block to make the script runnable directly
if (require.main === module) {
  (async () => {
    try {
      console.log('Running Aider scraper directly...');
      const results = await aiderScraper();
      console.log('\n--- Aider Scraper Results ---');
      console.log(JSON.stringify(results, null, 2));
      console.log('---------------------------\n');
    } catch (error) {
      console.error('Error running Aider scraper directly:', error);
      process.exit(1); // Exit with error code if direct run fails
    }
  })();
}
