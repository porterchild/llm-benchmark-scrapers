const puppeteer = require('puppeteer');

async function scrapeHuggingface() {
  let browser;
  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    console.log('Navigating to leaderboard page...');
    await page.goto('https://huggingface.co/spaces/lmarena-ai/chatbot-arena-leaderboard', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('Waiting for leaderboard to load...');
    await page.waitForSelector('.gradio-container table, iframe', { timeout: 30000 });

    const frameHandle = await page.$('iframe');
    const contentPage = frameHandle ? await frameHandle.contentFrame() : page;

    await contentPage.waitForSelector('table tbody tr', { timeout: 30000 });

    // Find all tables on the page
    const tableData = await contentPage.evaluate(() => {
      const tables = Array.from(document.querySelectorAll('table'));
      return tables.map((table, tableIndex) => {
        const rows = Array.from(table.querySelectorAll('tr'));
        const tableContent = rows.map(row => {
          const cols = Array.from(row.querySelectorAll('th, td'));
          return cols.map(c => c.textContent.trim());
        });
        return {
          index: tableIndex,
          content: tableContent
        };
      });
    });

    console.log('Found', tableData.length, 'tables on page');
    
    // currently hardcoded
    const targetTableIndex = 1

    console.log('Using table at index', targetTableIndex);
    
    const allModels = await contentPage.evaluate((tableIndex) => {
      const table = document.querySelectorAll('table')[tableIndex];
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      
      return rows.map(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length < 4) return null;
        
        const model = cols[2].textContent.trim();
        const score = cols[3].textContent.trim();
        
        if (isNaN(parseFloat(score))) return null;
        
        return {
          model: model,
          score: parseFloat(score)
        };
      }).filter(Boolean);
    }, targetTableIndex);

    // Sort by score (descending) and take top 5
    const top5 = allModels
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (top5.length === 0) {
      throw new Error('No valid rows found in leaderboard');
    }

    return top5;
  } catch (error) {
    console.error('Error scraping leaderboard:', error.message);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = scrapeHuggingface;

// Run directly if not required as module
if (require.main === module) {
  scrapeHuggingface()
    .then(top5 => {
      console.log('\nTop 5 LLMs by Arena ELO Score:\n');
      top5.forEach((model, i) => {
        console.log(`${i+1}. ${model.model} - ${model.score.toFixed(1)}`);
      });
    })
    .catch(console.error);
}
