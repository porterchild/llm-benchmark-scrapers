/**
 * Scrapes benchmark leaderboard data from artificialanalysis.ai using Puppeteer.
 * Extracts model-score pairs from the recharts SVG bar chart structure.
 * @param {object} browser - Puppeteer browser instance.
 * @param {string} evalSlug - The evaluation slug (e.g., 'terminalbench-v2-1').
 * @param {number} svgIndex - Index of the score chart SVG among all <svg> elements on the page.
 * @param {number} topCount - The number of top models to return.
 * @param {number} navigationTimeout - Navigation timeout in ms.
 * @param {number} selectorTimeout - Selector timeout in ms.
 * @returns {Promise<Array<{model: string, score: string}>>} - A promise that resolves to the top N models.
 */
async function artificialAnalysisScraper(browser, evalSlug, svgIndex, topCount = 10, navigationTimeout = 60000, selectorTimeout = 30000) {
  try {
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(navigationTimeout);
    await page.setDefaultTimeout(selectorTimeout);

    await page.goto(`https://artificialanalysis.ai/evaluations/${evalSlug}`, {
      waitUntil: 'networkidle0',
      timeout: navigationTimeout
    });

    // Wait for the recharts SVG to render
    await new Promise(r => setTimeout(r, 5000));

    const data = await page.evaluate(({ svgIndex: idx }) => {
      const svgs = Array.from(document.querySelectorAll('svg'));
      const svg = svgs[idx];
      if (!svg) return [];

      // Get model names from links to /models/
      const modelNames = Array.from(svg.querySelectorAll('a[href*="/models/"]'))
        .map(a => a.innerText.trim())
        .filter(name => name);

      // Get score percentages from text elements in the SVG
      const scores = Array.from(svg.querySelectorAll('text'))
        .map(t => t.textContent?.trim() || '')
        .filter(text => /^[\d.]+\%$/.test(text));

      // Zip model names with scores (same order)
      return modelNames.map((name, i) => ({
        model: name,
        score: scores[i] || 'N/A'
      }));
    }, { svgIndex });

    const result = data.slice(0, topCount);
    await page.close();
    return result;
  } catch (error) {
    console.error(`Error scraping ${evalSlug}:`, error.message || error);
    return [];
  }
}

module.exports = artificialAnalysisScraper;
