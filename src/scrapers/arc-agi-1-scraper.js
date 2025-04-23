// Import the shared CSV fetching and parsing function
const { fetchAndParseArcCsv } = require('./arc-agi-2-scraper');

/**
 * Scrapes the ARC-AGI-1 leaderboard data.
 * Uses the shared fetchAndParseArcCsv function with the v1 score column.
 * @returns {Promise<Array<{model: string, score: string}>>} - A promise that resolves to the top 10 models formatted for display.
 */
async function arcAgi1Scraper() {
  try {
    // Fetch and parse using the v1 score column
    const records = await fetchAndParseArcCsv('v1_Semi_Private_Score', 'ARC-AGI-1');

    // Sort by score (descending) based on the fetched v1 scores
    const top10 = records
      .sort((a, b) => b.score - a.score) // Sort by raw score number
      .slice(0, 10)
      .map(record => {
        // Score is already normalized (0-100 scale) by fetchAndParseArcCsv
        // Just format it to one decimal place and add '%'
        return {
          model: record.model,
          score: `${record.score.toFixed(1)}%`,
        };
      });

    console.log(`Successfully scraped ${top10.length} entries from ARC-AGI-1 (excluding Human Panel, Stem Grad, Avg. Mturker).`); // Updated log
    return top10;

  } catch (error) {
    console.error('Error scraping ARC-AGI-1 leaderboard:', error.message);
    // Re-throw the error to be caught by the main script (index.js)
    throw error;
  }
}

// Export the specific scraper function
module.exports = arcAgi1Scraper;

// Allow running the scraper directly for testing
if (require.main === module) {
  (async () => {
    console.log("Running ARC-AGI-1 scraper directly...");
    try {
      const results = await arcAgi1Scraper();
      console.log("\n--- ARC-AGI-1 Scraper Results (Top 10) ---");
      results.forEach((item, index) => {
        console.log(`${index + 1}. ${item.model} - ${item.score}`);
      });
      console.log("--------------------------------------------------\n");
    } catch (error) {
      console.error("Failed to run ARC-AGI-1 scraper directly:", error);
    }
  })();
}
