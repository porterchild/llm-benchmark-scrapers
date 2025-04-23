const axios = require('axios');
const csvParser = require('csv-parser');
const { Readable } = require('stream');

const CSV_URL = 'https://arcprize.org/media/data/leaderboard.csv';

/**
 * Fetches and parses the ARC Prize leaderboard CSV.
 * @param {string} scoreColumnName - The name of the CSV column containing the score to use (e.g., 'v1_Semi_Private_Score', 'v2_Semi_Private_Score').
 * @param {string} leaderboardName - A descriptive name for logging (e.g., 'ARC-AGI-1', 'ARC-AGI-2').
 * @returns {Promise<Array<{model: string, score: number}>>} - A promise that resolves to an array of model objects with raw scores.
 */
async function fetchAndParseArcCsv(scoreColumnName, leaderboardName) {
  console.log(`Fetching ${leaderboardName} leaderboard CSV...`);
  const response = await axios.get(CSV_URL, { responseType: 'stream' });

  console.log(`Parsing CSV data for ${leaderboardName}...`);

  return new Promise((resolve, reject) => {
    const collectedRecords = [];
    const parser = response.data.pipe(csvParser({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }));

    parser.on('data', (record) => {
      const displayName = record.Display_Name;
      const shouldDisplay = record.display === 'true';
      const scoreString = record[scoreColumnName] || ''; // Use the dynamic score column name
      const score = parseFloat(scoreString);
      const hasValidScore = !isNaN(score);
      const modelsToExclude = ['Human Panel', 'Stem Grad', 'Avg. Mturker']; // Add new models to exclude

      // Filter out excluded models early and check display status/valid score
      if (!modelsToExclude.includes(displayName) && shouldDisplay && hasValidScore) {
        // Normalize score: If score < 1.01, assume it's a decimal ratio, multiply by 100.
        // Otherwise, assume it's already a percentage value.
        const normalizedScore = score < 1.01 ? score * 100 : score;

        collectedRecords.push({
          model: displayName,
          score: normalizedScore, // Store the NORMALIZED score (0-100 scale)
        });
      }
    });

    parser.on('end', () => {
      console.log(`CSV parsing finished for ${leaderboardName}. Found ${collectedRecords.length} valid entries (excluding Human Panel).`);
      if (collectedRecords.length === 0) {
        reject(new Error(`No valid entries found in ${leaderboardName} leaderboard CSV after parsing.`));
      } else {
        resolve(collectedRecords);
      }
    });

    parser.on('error', (err) => reject(new Error(`CSV parsing error for ${leaderboardName}: ${err.message}`)));
    response.data.on('error', (err) => reject(new Error(`HTTP stream error for ${leaderboardName}: ${err.message}`)));
  });
}

/**
 * Scrapes the ARC-AGI-2 leaderboard data.
 * @returns {Promise<Array<{model: string, score: string}>>} - A promise that resolves to the top 10 models formatted for display.
 */
async function arcAgi2Scraper() {
  try {
    const records = await fetchAndParseArcCsv('v2_Semi_Private_Score', 'ARC-AGI-2');

    // Sort by score (descending) and take top 10
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

    console.log(`Successfully scraped ${top10.length} entries from ARC-AGI-2 (excluding Human Panel, Stem Grad, Avg. Mturker).`); // Updated log
    return top10;

  } catch (error) {
    console.error('Error scraping ARC-AGI-2 leaderboard:', error.message);
    // Error details logging moved inside fetchAndParseArcCsv or handled by caller
    throw error; // Re-throw the error to be caught by the main script (index.js)
  }
}

// Export the specific scraper function and the common utility
module.exports = arcAgi2Scraper;
module.exports.fetchAndParseArcCsv = fetchAndParseArcCsv; // Export for reuse

// Allow running the scraper directly for testing
if (require.main === module) {
  (async () => {
    console.log("Running ARC-AGI-2 scraper directly...");
    try {
      const results = await arcAgi2Scraper();
      console.log("\n--- ARC-AGI-2 Scraper Results (Top 10) ---");
      results.forEach((item, index) => {
        console.log(`${index + 1}. ${item.model} - ${item.score}`);
      });
      console.log("--------------------------------------------------\n");
    } catch (error) {
      console.error("Failed to run ARC-AGI-2 scraper directly:", error);
    }
  })();
}
