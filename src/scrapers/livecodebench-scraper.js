async function livecodebenchScraper(browser, count = 10, navigationTimeout = 60000, selectorTimeout = 30000) {
  try {
    const page = await browser.newPage();

    console.log('Navigating to LiveCodeBench page...');
    await page.goto('https://livecodebench.github.io/leaderboard.html', {
      waitUntil: 'networkidle2', // Wait for network to be idle
      timeout: navigationTimeout
    });

    console.log('Waiting for leaderboard table body to load...');
    const tableBodySelector = 'tbody#tableBody';
    try {
      await page.waitForSelector(tableBodySelector, { timeout: selectorTimeout });
      console.log('Leaderboard table body found. Now evaluating rows...');
    } catch (e) {
      console.error('Error waiting for leaderboard table body:', e.message);
      throw e; 
    }

    const allModels = await page.evaluate(() => {
      const models = [];
      // Query for rows within the table body
      const rowElements = Array.from(document.querySelectorAll('tbody#tableBody tr'));

      rowElements.forEach((row) => {
        // Model name is in the second td (index 1)
        const modelCell = row.children[1];
        // Score (Pass@1) is in the third td (index 2)
        const scoreCell = row.children[2];

        if (modelCell && scoreCell) {
          // Model name might be directly in td or inside an <a> tag within the td
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
    }); 

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
  const os = require('os'); // Import os module for direct execution

  // Determine if running on a Raspberry Pi (this is approximate)
  const mightBeRaspberryPi = os.platform() === 'linux' && (os.arch() === 'arm' || os.arch() === 'arm64');

  if (mightBeRaspberryPi) {
    // not sure why the rpi needs this, but puppeteer won't work without it
    process.env.PUPPETEER_EXECUTABLE_PATH = '/usr/bin/chromium-browser';
    console.log('Set PUPPETEER_EXECUTABLE_PATH for Raspberry Pi:', process.env.PUPPETEER_EXECUTABLE_PATH);
  }

  (async () => {
    let browserInstance;
    try {
      // Launch a browser for direct execution
      const launchOptions = {
        args: ['--no-sandbox'] 
      };
      // Set executablePath if PUPPETEER_EXECUTABLE_PATH is defined (e.g., for Raspberry Pi)
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
