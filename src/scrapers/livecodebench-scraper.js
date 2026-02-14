async function livecodebenchScraper(browser, count = 10, navigationTimeout = 60000, selectorTimeout = 30000) {
  try {
    const page = await browser.newPage();

    console.log('Navigating to LiveCodeBench page...');
    await page.goto('https://livecodebench.github.io/leaderboard.html', {
      waitUntil: 'networkidle2',
      timeout: navigationTimeout
    });

    console.log('Waiting a few seconds for dynamic content to render...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Waiting for leaderboard table rows to load...');
    const rowSelector = '#tableBody tr';
    try {
      await page.waitForSelector(rowSelector, { timeout: selectorTimeout });
      console.log('Table rows found.');
    } catch (e) {
      console.error('Error waiting for table rows:', e.message);
      throw e;
    }

    const allModels = await page.evaluate((selector) => {
      const models = [];
      const rows = Array.from(document.querySelectorAll(selector));

      rows.forEach((row) => {
        const modelCell = row.querySelector('.model-col');
        const scoreCells = row.querySelectorAll('.score-col');

        if (modelCell && scoreCells.length > 0) {
          const modelNameElement = modelCell.querySelector('a') || modelCell;
          const modelName = modelNameElement.textContent ? modelNameElement.textContent.trim() : '';

          // First score-col is the overall Pass@1 score
          const scoreText = scoreCells[0].textContent ? scoreCells[0].textContent.trim() : '';
          const cleanedScoreText = scoreText.replace(/[^0-9.-]+/g, '');

          if (!modelName || cleanedScoreText === '') return;

          const score = parseFloat(cleanedScoreText);

          if (!isNaN(score)) {
            models.push({ model: modelName, score: score });
          }
        }
      });
      return models;
    }, rowSelector);

    const topN = allModels
      .sort((a, b) => b.score - a.score)
      .slice(0, count);

    if (topN.length === 0) {
      console.warn('No valid models found or parsed from LiveCodeBench leaderboard. Returning empty array.');
      return [];
    }
    console.log(`Successfully scraped ${topN.length} models from LiveCodeBench.`);
    return topN;
  } catch (error) {
    console.error('Error scraping LiveCodeBench:', error.message);
    return [];
  }
}

module.exports = livecodebenchScraper;

if (require.main === module) {
  const puppeteer = require('puppeteer');
  (async () => {
    let browserInstance;
    try {
      const launchOptions = {
        args: ['--no-sandbox']
      };
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      }
      browserInstance = await puppeteer.launch(launchOptions);

      const numResults = process.argv[2] ? parseInt(process.argv[2], 10) : 10;
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
