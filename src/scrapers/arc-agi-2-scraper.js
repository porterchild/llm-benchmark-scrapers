const axios = require('axios');
const csvParser = require('csv-parser'); // Import the module directly
const { Readable } = require('stream');

const CSV_URL = 'https://arcprize.org/media/data/leaderboard.csv';

async function arcAgi2Scraper() { // Renamed function
  try {
    console.log('Fetching ARC-AGI-2 leaderboard CSV...'); // Updated log message
    const response = await axios.get(CSV_URL, { responseType: 'stream' });

    console.log('Parsing CSV data...');

    // Use Promise to handle stream events, piping and attaching listeners inside
    const records = await new Promise((resolve, reject) => {
      const collectedRecords = [];

      const parser = response.data.pipe(csvParser({ // Define parser inside promise
        columns: true, // Use the first row as header
        skip_empty_lines: true,
        trim: true,
      }));

      parser.on('data', (record) => {
        // Filter out entries that shouldn't be displayed or lack a valid score
        const displayName = record.Display_Name; // Get name for filtering
        const shouldDisplay = record.display === 'true';
        // Use v2_Semi_Private_Score as the target score (ARC-AGI-2)
        const scoreString = record.v2_Semi_Private_Score || '';
        const score = parseFloat(scoreString);
        const hasValidScore = !isNaN(score);

        if (shouldDisplay && hasValidScore) {
          collectedRecords.push({
            model: displayName,
            // Format score as percentage string with one decimal place
            score: `${(score * 100).toFixed(1)}%`,
          });
        }
      });

      parser.on('end', () => {
        console.log(`CSV parsing finished. Found ${collectedRecords.length} valid entries.`);
        if (collectedRecords.length === 0) {
          // Reject if no valid records found after successful parsing
          return reject(new Error('No valid entries found in ARC Prize leaderboard CSV after parsing.'));
        }
        // Resolve with the collected records on successful end
        resolve(collectedRecords);
      });

      parser.on('error', (err) => {
        // Reject on parser error
        reject(new Error(`CSV parsing error: ${err.message}`));
      });

      // Still handle potential errors on the response stream itself
      response.data.on('error', (err) => {
         // Reject on underlying stream error
         reject(new Error(`HTTP stream error: ${err.message}`));
      });
    }); // End of new Promise executor

    // Filter out "Human Panel" AFTER collecting all valid records
    const filteredRecords = records.filter(record => record.model !== 'Human Panel');

    // Sort by score (descending, parsing the percentage string back to float) and take top 10 of the filtered list
    const top10 = filteredRecords
      .sort((a, b) => parseFloat(b.score.replace('%','')) - parseFloat(a.score.replace('%','')))
      .slice(0, 10);

    console.log(`Successfully scraped ${top10.length} entries from ARC Prize (excluding Human Panel).`);
    return top10;

  } catch (error) {
    console.error('Error scraping ARC Prize leaderboard:', error.message);
    // Check if it's an axios error for more details
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('Request Error:', error.request);
    }
    throw error; // Re-throw the error to be caught by the main script
  }
}

module.exports = arcAgi2Scraper; // Export renamed function

// Allow running the scraper directly for testing
if (require.main === module) {
  (async () => {
    console.log("Running ARC-AGI-2 scraper directly..."); // Updated log message
    try {
      const results = await arcAgi2Scraper(); // Call renamed function
      console.log("\n--- ARC-AGI-2 Scraper Results (Top 10) ---"); // Updated title
      results.forEach((item, index) => {
        console.log(`${index + 1}. ${item.model} - ${item.score}`); // Keep simple format
      });
      console.log("--------------------------------------------------\n"); // Adjusted separator
    } catch (error) {
      console.error("Failed to run ARC-AGI-2 scraper directly:", error); // Updated error message
    }
  })();
}
