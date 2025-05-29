async function swebenchScraper(browser, count = 10, navigationTimeout = 60000, selectorTimeout = 30000) {
  try {
    const page = await browser.newPage();
    
    console.log('Navigating to SWebench page...');
    await page.goto('https://www.swebench.com/#verified', {
      waitUntil: 'networkidle2',
      timeout: navigationTimeout
    });

    console.log('Waiting for leaderboard to load...');
    // Wait for the specific table for the "Verified" leaderboard
    await page.waitForSelector('div#leaderboard-Verified table.data-table', { timeout: selectorTimeout });

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
  }
}

module.exports = swebenchScraper;

// Add this block to make the script runnable directly
if (require.main === module) {
  const puppeteer = require('puppeteer'); // Re-add puppeteer for direct execution
  (async () => {
    let browserInstance;
    try {
      // Launch a browser for direct execution
      const launchOptions = {
        args: ['--no-sandbox'] 
      };
      // Only set executablePath if PUPPETEER_EXECUTABLE_PATH is defined (e.g., for Raspberry Pi)
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      }
      browserInstance = await puppeteer.launch(launchOptions);

      const numResults = process.argv[2] ? parseInt(process.argv[2], 10) : 10; // Allow passing count via CLI for direct run
      const navTimeout = process.argv[3] ? parseInt(process.argv[3], 10) : 60000;
      const selTimeout = process.argv[4] ? parseInt(process.argv[4], 10) : 30000;
      console.log(`Running SWE-Bench scraper directly (top ${numResults}, navTimeout: ${navTimeout}, selTimeout: ${selTimeout})...`);
      const results = await swebenchScraper(browserInstance, numResults, navTimeout, selTimeout);
      console.log('\n--- SWE-Bench Scraper Results ---');
      console.log(JSON.stringify(results, null, 2));
      console.log('-------------------------------\n');
    } catch (error) {
      console.error('Error running SWE-Bench scraper directly:', error);
      process.exit(1); // Exit with error code if direct run fails
    } finally {
      if (browserInstance) {
        await browserInstance.close();
      }
    }
  })();
}
