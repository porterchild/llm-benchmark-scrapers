async function livecodebenchScraper(browser, count = 10, navigationTimeout = 60000, selectorTimeout = 30000) {
  try {
    const page = await browser.newPage();

    console.log('Navigating to LiveCodeBench page...');
    await page.goto('https://livecodebench.github.io/leaderboard.html', {
      waitUntil: 'networkidle2', // Wait for network to be idle
      timeout: navigationTimeout
    });

    // Add a small fixed delay to allow JS rendering to complete after network idle
    console.log('Waiting a few seconds for dynamic content to render...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds delay

    console.log('Waiting for AG Grid leaderboard rows to load...');
    const agGridRowSelector = 'div.ag-center-cols-container div[role="row"]';
    try {
      await page.waitForSelector(agGridRowSelector, { timeout: selectorTimeout });
      console.log('AG Grid rows found.');
    } catch (e) {
      console.error('Error waiting for AG Grid rows:', e.message);
      // Optionally, log more page context here if needed for debugging
      // const bodyHTML = await page.evaluate(() => document.body.innerHTML);
      // console.log("Body HTML on error:", bodyHTML.substring(0, 2000));
      throw e; 
    }

    const allModels = await page.evaluate((rowSelector) => {
      const models = [];
      const rowElements = Array.from(document.querySelectorAll(rowSelector));

      rowElements.forEach((row) => {
        const modelCell = row.querySelector('div[col-id="Model"] span.ag-cell-value');
        const scoreCell = row.querySelector('div[col-id="Pass@1"] span.ag-cell-value');

        if (modelCell && scoreCell) {
          // Model name might be directly in span or inside an <a> tag within the span
          const modelNameElement = modelCell.querySelector('a') || modelCell;
          const modelName = modelNameElement.textContent ? modelNameElement.textContent.trim() : '';
          
          const scoreText = scoreCell.textContent ? scoreCell.textContent.trim() : '';
          
          const cleanedScoreText = scoreText.replace(/[^0-9.-]+/g, "");
          if (modelName === "" && cleanedScoreText === "") {
            return; 
          }
          if (cleanedScoreText === "") {
            return; 
          }

          const score = parseFloat(cleanedScoreText);

          if (modelName && !isNaN(score)) {
            models.push({ model: modelName, score: score });
          }
        }
      });
      return models;
    }, agGridRowSelector); // Pass selector to page.evaluate

    // Sort by score (descending) and take top N
    const topN = allModels
      .sort((a, b) => b.score - a.score)
      .slice(0, count);

    if (topN.length === 0) {
      console.warn('No valid models found or parsed from LiveCodeBench AG Grid leaderboard. Returning empty array.');
      return [];
    }
    console.log(`Successfully scraped ${topN.length} models.`);
    return topN;
  } catch (error) {
    console.error('Error scraping LiveCodeBench:', error.message);
    // To prevent one scraper failure from stopping all, return empty array on error.
    // The main script can then decide how to handle partial results.
    return [];
  }
}

module.exports = livecodebenchScraper;

// To test this scraper individually:
// node src/scrapers/livecodebench-scraper.js
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

      const numResults = process.argv[2] ? parseInt(process.argv[2], 10) : 10; // Allow passing count via CLI
      const navTimeout = process.argv[3] ? parseInt(process.argv[3], 10) : 60000;
      const selTimeout = process.argv[4] ? parseInt(process.argv[4], 10) : 30000;
      console.log(`Running LiveCodeBench scraper directly (top ${numResults}, navTimeout: ${navTimeout}, selTimeout: ${selTimeout})...`);
      const results = await livecodebenchScraper(browserInstance, numResults, navTimeout, selTimeout);
      console.log(`LiveCodeBench Scraper Results (Top ${numResults}):`);
      console.table(results);
    } catch (error) {
      console.error("Failed to run LiveCodeBench scraper individually:", error);
    } finally {
      if (browserInstance) {
        await browserInstance.close();
      }
    }
  })();
}
