async function livecodebenchScraper(browser, count = 10, navigationTimeout = 60000, selectorTimeout = 30000) {
  // LiveCodeBench at livecodebench.github.io appears to be outdated/abandoned
  // showing models from mid-2024 (O3, O4, Gemini-2.5). The official repository
  // has moved to a different structure. This scraper is disabled until
  // a reliable, up-to-date data source can be found.
  console.warn('LiveCodeBench scraper disabled: benchmark data appears outdated. Official benchmark has moved to a different structure.');
  return [];
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
