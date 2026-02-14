const axios = require('axios');

const EVALUATIONS_URL = 'https://arcprize.org/media/data/leaderboard/evaluations.json';
const MODELS_URL = 'https://arcprize.org/media/data/models.json';

/**
 * Fetches and parses the ARC Prize leaderboard JSON.
 * @param {string} datasetId - The datasetId to filter by (e.g., 'v1_Semi_Private', 'v2_Semi_Private').
 * @param {string} leaderboardName - A descriptive name for logging (e.g., 'ARC-AGI-1', 'ARC-AGI-2').
 * @returns {Promise<Array<{model: string, score: number}>>} - A promise that resolves to an array of model objects with normalized scores (0-100).
 */
async function fetchAndParseArcJson(datasetId, leaderboardName) {
  console.log(`Fetching ${leaderboardName} leaderboard JSON...`);
  const [evaluationsRes, modelsRes] = await Promise.all([
    axios.get(EVALUATIONS_URL),
    axios.get(MODELS_URL),
  ]);
  const evaluations = evaluationsRes.data;
  const models = modelsRes.data;

  // Build modelId -> displayName lookup
  const displayNames = {};
  for (const m of models) {
    displayNames[m.id] = m.displayName || m.id;
  }

  console.log(`Parsing JSON data for ${leaderboardName} (datasetId: ${datasetId})...`);

  const modelsToExclude = ['human_panel', 'stem_grad', 'avg_mturker'];

  const records = evaluations
    .filter(entry => {
      if (entry.datasetId !== datasetId) return false;
      if (!entry.display) return false;
      if (typeof entry.score !== 'number' || isNaN(entry.score)) return false;
      const modelLower = entry.modelId.toLowerCase();
      if (modelsToExclude.some(exc => modelLower.includes(exc))) return false;
      return true;
    })
    .map(entry => ({
      model: displayNames[entry.modelId] || entry.modelId,
      score: entry.score * 100,
    }));

  console.log(`JSON parsing finished for ${leaderboardName}. Found ${records.length} valid entries.`);

  if (records.length === 0) {
    throw new Error(`No valid entries found in ${leaderboardName} leaderboard JSON after parsing.`);
  }

  return records;
}

/**
 * Scrapes the ARC-AGI-2 leaderboard data.
 * @param {number} count - The number of top models to return.
 * @returns {Promise<Array<{model: string, score: string}>>} - A promise that resolves to the top N models formatted for display.
 */
async function arcAgi2Scraper(count = 10) {
  try {
    const records = await fetchAndParseArcJson('v2_Semi_Private', 'ARC-AGI-2');

    const topN = records
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(record => ({
        model: record.model,
        score: `${record.score.toFixed(1)}%`,
      }));

    console.log(`Successfully scraped ${topN.length} entries from ARC-AGI-2.`);
    return topN;

  } catch (error) {
    console.error('Error scraping ARC-AGI-2 leaderboard:', error.message);
    throw error;
  }
}

module.exports = arcAgi2Scraper;
module.exports.fetchAndParseArcJson = fetchAndParseArcJson;

if (require.main === module) {
  (async () => {
    const numResults = process.argv[2] ? parseInt(process.argv[2], 10) : 10;
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
