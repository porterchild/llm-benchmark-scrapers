const huggingfaceScraper = require('./src/scrapers/huggingface');
const livebenchScraper = require('./src/scrapers/livebench');

async function runAllScrapers() {
  try {
    console.log('Running all benchmark scrapers...\n');
    
    // Run Hugging Face scraper
    console.log('=== Chatbot Arena Leaderboard ===');
    const hfResults = await huggingfaceScraper();
    hfResults.forEach((model, i) => {
      console.log(`${i+1}. ${model.model} - ${model.score.toFixed(1)}`);
    });
    
    // Run LiveBench scraper
    console.log('\n=== LiveBench Leaderboard ===');
    const lbResults = await livebenchScraper();
    lbResults.forEach((model, i) => {
      console.log(`${i+1}. ${model.model} - ${model.score.toFixed(2)}`);
    });
    
  } catch (error) {
    console.error('Error running scrapers:', error);
  }
}

runAllScrapers().catch(console.error);
