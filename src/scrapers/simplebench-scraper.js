const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

async function simplebenchScraper() {
  let browser;
  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    console.log('Navigating to SimpleBench page...');
    await page.goto('https://simple-bench.com/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('Waiting for content to load...');
    await page.waitForSelector('body', { timeout: 30000 });

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

    // Sort by score (descending) and take top 5
    const top5 = leaderboardData
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return top5;
  } catch (error) {
    console.error('Error fetching SimpleBench page:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = simplebenchScraper;
