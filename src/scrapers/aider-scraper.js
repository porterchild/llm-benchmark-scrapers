const puppeteer = require('puppeteer');

async function aiderScraper() {
  let browser;
  const url = 'https://aider.chat/docs/leaderboards/';
  console.log(`Navigating to Aider Leaderboard page: ${url}`);

  try {
    // Add --no-sandbox flag for cron compatibility
    browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000 // 60 seconds navigation timeout
    });

    console.log('Extracting Aider leaderboard data...');
    const allModels = await page.evaluate(() => {
      const models = [];
      try {
        // Find the main leaderboard table (assuming only one relevant table)
        const table = document.querySelector('table'); // More robust: find table containing known model names if needed
        if (!table) return []; // No table found

        let rows = Array.from(table.querySelectorAll('tbody > tr'));
        if (rows.length === 0) {
          const allRows = Array.from(table.querySelectorAll(':scope > tr, :scope > thead > tr, :scope > tbody > tr'));
          rows = (allRows.length > 0 && allRows[0].querySelector('th')) ? allRows.slice(1) : allRows;
        }

        rows.forEach((row) => {
          if (row.classList.contains('details-row')) return; // Skip details rows

          const cells = Array.from(row.querySelectorAll('td'));
          if (cells.length >= 3) { // Check for at least 3 cells
            const modelNameCell = cells[1]; // Model name is in the second cell
            const scoreCell = cells[2];     // Score is in the third cell

            const modelNameSpan = modelNameCell.querySelector('span');
            const modelName = (modelNameSpan ? modelNameSpan.textContent.trim() : modelNameCell.textContent.trim());

            const scoreSpan = scoreCell.querySelector('span');
            const scoreText = scoreSpan ? scoreSpan.textContent.trim() : '';

            if (modelName && scoreText.includes('%')) {
               const score = parseFloat(scoreText.replace('%', ''));
               if (!isNaN(score)) {
                  if (!models.some(m => m.model === modelName && m.score === score)) {
                     models.push({ model: modelName, score: score });
                  }
                }
              }
            }
          });
        // End of rows.forEach
        return models; // Return the populated models array
      } catch (e) {
        // Log error within evaluate if needed, but primarily handle outside
        console.error('Error during page evaluation:', e.message);
        return []; // Return empty array on error
      }
    });
    // Removed the extra logging related to evaluationResult

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
