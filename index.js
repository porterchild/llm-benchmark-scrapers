const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const huggingfaceScraper = require('./src/scrapers/huggingface');
const livebenchScraper = require('./src/scrapers/livebench');
const simplebenchScraper = require('./src/scrapers/simplebench-scraper');
const swebenchScraper = require('./src/scrapers/swebench-scraper');

async function runAllScrapers() {
  try {
    console.log('Running all benchmark scrapers in parallel...\n');
    
    // Run all scrapers concurrently
    const [hfResults, lbResults, sbResults, swResults] = await Promise.all([
      huggingfaceScraper(),
      livebenchScraper(),
      simplebenchScraper(),
      swebenchScraper()
    ]);

    // Log Hugging Face results
    console.log('=== Chatbot Arena Leaderboard ===');
    hfResults.forEach((model, i) => {
      console.log(`${i+1}. ${model.model} - ${model.score.toFixed(1)}`);
    });

    // Log LiveBench results
    console.log('\n=== LiveBench Leaderboard ===');
    lbResults.forEach((model, i) => {
      console.log(`${i+1}. ${model.model} - ${model.score.toFixed(2)}`);
    });

    // Log SimpleBench results
    console.log('\n=== SimpleBench Leaderboard ===');
    sbResults.forEach((model, i) => {
      console.log(`${i+1}. ${model.model} - ${model.score.toFixed(1)}%`);
    });

    // Log SWebench results
    console.log('\n=== SWebench Leaderboard ===');
    swResults.forEach((model, i) => {
      console.log(`${i+1}. ${model.model} - ${model.score.toFixed(2)}`);
    });

  } catch (error) {
    console.error('Error running scrapers:', error);
  }
}

runAllScrapers().catch(console.error);
