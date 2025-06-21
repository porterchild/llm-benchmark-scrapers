const axios = require('axios');
const { Readable } = require('stream'); // Still needed for stream if we were parsing CSV, but not for JSON directly

// Define the base URL for the new JSON data
const BASE_DATA_URL = 'https://arcprize.org/media/data/leaderboard/';

/**
 * Fetches and parses the ARC Prize leaderboard data from JSON files.
 * @param {string} datasetIdToFilter - The dataset ID to filter evaluations by (e.g., 'v1_Semi_Private', 'v2_Semi_Private').
 * @param {string} leaderboardName - A descriptive name for logging (e.g., 'ARC-AGI-1', 'ARC-AGI-2').
 * @returns {Promise<Array<{model: string, score: number}>>} - A promise that resolves to an array of model objects with raw scores.
 */
async function fetchAndParseArcJson(datasetIdToFilter, leaderboardName) {
  console.log(`Fetching ${leaderboardName} leaderboard JSON data...`);
  try {
    // Fetch all necessary JSON files in parallel
    const [evaluationsResponse, modelsResponse] = await Promise.all([
      axios.get(`${BASE_DATA_URL}evaluations.json`),
      axios.get(`${BASE_DATA_URL}models.json`)
    ]);

    const evaluations = evaluationsResponse.data;
    const models = modelsResponse.data;

    // Create a map for quick lookup of model display names by their ID
    const modelsById = models.reduce((acc, model) => {
      acc[model.id] = model.displayName;
      return acc;
    }, {});

    const collectedRecords = [];
    const modelsToExclude = ['Human Panel', 'Stem Grad', 'Avg. Mturker']; // Models to exclude by their display name

    evaluations.forEach(record => {
      const modelDisplayName = modelsById[record.modelId];
      const score = record.score;
      // const shouldDisplay = record.display === true; // Removed as per user feedback
      const hasValidScore = typeof score === 'number' && !isNaN(score);

      // Filter based on datasetId, valid score, and exclusion list
      if (record.datasetId === datasetIdToFilter && hasValidScore && !modelsToExclude.includes(modelDisplayName)) {
        // Normalize score: If score < 1.01, assume it's a decimal ratio, multiply by 100.
        // Otherwise, assume it's already a percentage value.
        const normalizedScore = score < 1.01 ? score * 100 : score;

        collectedRecords.push({
          model: modelDisplayName,
          score: normalizedScore, // Store the NORMALIZED score (0-100 scale)
        });
      }
    });

    console.log(`JSON parsing finished for ${leaderboardName}. Found ${collectedRecords.length} valid entries.`);
    if (collectedRecords.length === 0) {
      throw new Error(`No valid entries found in ${leaderboardName} leaderboard JSON after parsing.`);
    } else {
      return collectedRecords;
    }

  } catch (error) {
    console.error(`Error fetching or parsing ARC-AGI JSON for ${leaderboardName}:`, error.message);
    throw error; // Re-throw the error to be caught by the main script
  }
}

/**
 * Scrapes the ARC-AGI-2 leaderboard data.
 * @param {number} count - The number of top models to return.
 * @returns {Promise<Array<{model: string, score: string}>>} - A promise that resolves to the top N models formatted for display.
 */
async function arcAgi2Scraper(count = 10) {
  try {
    // Use the new fetchAndParseArcJson function with the correct dataset ID
    const records = await fetchAndParseArcJson('v2_Semi_Private', 'ARC-AGI-2');

    // Sort by score (descending) and take top N
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

    console.log(`Successfully scraped ${topN.length} entries from ARC-AGI-2.`);
    return topN;

  } catch (error) {
    console.error('Error scraping ARC-AGI-2 leaderboard:', error.message);
    throw error; // Re-throw the error to be caught by the main script (index.js)
  }
}

// Export the specific scraper function and the common utility
module.exports = arcAgi2Scraper;
module.exports.fetchAndParseArcJson = fetchAndParseArcJson; // Export for reuse by arc-agi-1-scraper.js

// Allow running the scraper directly for testing
if (require.main === module) {
  (async () => {
    const numResults = process.argv[2] ? parseInt(process.argv[2], 10) : 10; // Allow passing count via CLI
    console.log(`Running ARC-AGI-2 scraper directly (top ${numResults})...`);
    try {
      const results = await arcAgi2Scraper(numResults);
      console.log(`\n--- ARC-AGI-2 Scraper Results (Top ${numResults}) ---`);
      results.forEach((item, index) => {
        console.log(`${index + 1}. ${item.model} - ${item.score}`);
      });
      console.log("--------------------------------------------------\n");
    } catch (error) {
      console.error("Failed to run ARC-AGI-2 scraper directly:", error);
    }
  })();
}
