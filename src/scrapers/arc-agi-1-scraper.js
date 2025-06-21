// Import the shared JSON fetching and parsing function
const { fetchAndParseArcJson } = require('./arc-agi-2-scraper');

/**
 * Scrapes the ARC-AGI-1 leaderboard data.
 * Uses the shared fetchAndParseArcJson function with the v1 semi-private dataset ID.
 * @param {number} count - The number of top models to return.
 * @returns {Promise<Array<{model: string, score: string}>>} - A promise that resolves to the top N models formatted for display.
 */
async function arcAgi1Scraper(count = 10) {
  try {
    // Fetch and parse using the v1 semi-private dataset ID
    const records = await fetchAndParseArcJson('v1_Semi_Private', 'ARC-AGI-1');

    // Sort by score (descending) based on the fetched v1 scores
    const topN = records
      .sort((a, b) => b.score - a.score) // Sort by raw score number
      .slice(0, count)
      .map(record => {
        // Score is already normalized (0-100 scale) by fetchAndParseArcJson
        // Just format it to one decimal place and add '%'
        return {
          model: record.model,
          score: `${record.score.toFixed(1)}%`,
        };
      });

    console.log(`Successfully scraped ${topN.length} entries from ARC-AGI-1.`);
    return topN;

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
    const numResults = process.argv[2] ? parseInt(process.argv[2], 10) : 10; // Allow passing count via CLI
    console.log(`Running ARC-AGI-1 scraper directly (top ${numResults})...`);
    try {
      const results = await arcAgi1Scraper(numResults);
      console.log(`\n--- ARC-AGI-1 Scraper Results (Top ${numResults}) ---`);
      results.forEach((item, index) => {
        console.log(`${index + 1}. ${item.model} - ${item.score}`);
      });
      console.log("--------------------------------------------------\n");
    } catch (error) {
      console.error("Failed to run ARC-AGI-1 scraper directly:", error);
    }
  })();
}
