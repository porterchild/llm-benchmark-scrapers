const cheerio = require('cheerio');

async function simplebenchScraper(browser, count = 10, navigationTimeout = 60000, selectorTimeout = 30000) {
  try {
    const page = await browser.newPage();
    
    console.log('Navigating to SimpleBench page...');
    await page.goto('https://simple-bench.com/', {
      waitUntil: 'networkidle2',
      timeout: navigationTimeout
    });

    console.log('Waiting for content to load...');
    await page.waitForSelector('body', { timeout: selectorTimeout });

    // Load the HTML content into a variable
    const htmlContent = await page.content();

    // Load the HTML content with Cheerio
    const $ = cheerio.load(htmlContent);

    const leaderboardData = [];

    // Select the table rows, excluding the header row
    const rows = $('#leaderboardTable tbody tr:not(:first-child)');

    rows.each((index, element) => {
      const model = $(element).find('td:nth-child(2)').text().trim();
      const score = parseFloat($(element).find('td:nth-child(3)').text().trim().replace('%', ''));

      if (model !== 'Human Baseline*') {
        leaderboardData.push({ model, score });
      }
    });

    // Sort by score (descending) and take top N
    const topN = leaderboardData
      .sort((a, b) => b.score - a.score)
      .slice(0, count);

    return topN;
  } catch (error) {
    console.error('Error fetching SimpleBench page:', error.message);
    throw error;
  }
}

module.exports = simplebenchScraper;
