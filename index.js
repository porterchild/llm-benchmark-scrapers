require('dotenv').config(); // Load environment variables from .env file
const fs = require('fs').promises;
const path = require('path');
const livebenchScraper = require('./src/scrapers/livebench');
const simplebenchScraper = require('./src/scrapers/simplebench-scraper');
const swebenchScraper = require('./src/scrapers/swebench-scraper');
const aiderScraper = require('./src/scrapers/aider-scraper');
const arcAgi1Scraper = require('./src/scrapers/arc-agi-1-scraper');
const arcAgi2Scraper = require('./src/scrapers/arc-agi-2-scraper');
const OpenRouterClient = require('./src/openrouter');
const { getComparisonPrompt } = require('./src/prompts');
const { publishToNostr } = require('./src/nostr');

const stateFilePath = path.join(__dirname, 'yesterdayScores.txt');
const SCRAPER_TIMEOUT_MS = 60000; // 60 seconds timeout for each scraper

const openRouter = new OpenRouterClient(process.env.OPENROUTER_API_KEY);
const nostrSecretKeyNsec = process.env.NOSTR_BOT_NSEC; // Use NOSTR_BOT_NSEC
const actuallyPostIt = process.env.ACTUALLY_POST_IT === 'true'; // Check the debug flag

function formatResultsForStorage(results) {
  // Simple string formatting for storage and comparison
  let output = '';
  for (const key in results) {
    output += `=== ${key} ===\n`;
    results[key].forEach((model, i) => {
      let score = model.score;
      // Attempt to format score consistently, handling different types
      if (typeof score === 'number') {
         // Handle percentage formatting for SimpleBench, Aider, and ARC-AGI
         if (key === 'SimpleBench Leaderboard' || key === 'Aider Polyglot Leaderboard' || key === 'ARC-AGI-1 Leaderboard' || key === 'ARC-AGI-2 Leaderboard') {
             score = score.toFixed(1) + '%';
         } else if (key === 'LiveBench Leaderboard' || key === 'SWE-Bench Verified Leaderboard') {
             score = score.toFixed(2);
         } else { // Default for remaining leaderboards (if any added later)
             score = score.toFixed(1); // Keep a default, though currently covered
         }
      }
      output += `${i + 1}. ${model.model} - ${score}\n`;
    });
    output += '\n';
  }
  return output.trim();
}

// Helper function to add a timeout to a promise
function withTimeout(promise, ms, scraperName) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${scraperName} timed out after ${ms / 1000} seconds`));
    }, ms);
  });

  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)), // Clear timeout if original promise settles
    timeoutPromise
  ]);
}


async function runAllScrapers() {
  try {
    console.log(`Running all benchmark scrapers (timeout: ${SCRAPER_TIMEOUT_MS / 1000}s each)...\n`);

    // 1. Read previous scores
    let previousScores = '';
    try {
      previousScores = await fs.readFile(stateFilePath, 'utf-8');
      console.log('Loaded previous scores from yesterdayScores.txt');
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('yesterdayScores.txt not found. Assuming first run.');
      } else {
        console.error('Error reading previous scores:', error);
        // Decide if we should proceed or exit
      }
    }

    // 2. Run scrapers with individual timeouts
    const scraperPromises = [
      withTimeout(livebenchScraper(), SCRAPER_TIMEOUT_MS, 'LiveBench')
        .catch(e => { console.error("LiveBench Scraper failed:", e.message || e); return []; }),
      withTimeout(simplebenchScraper(), SCRAPER_TIMEOUT_MS, 'SimpleBench')
        .catch(e => { console.error("SimpleBench Scraper failed:", e.message || e); return []; }),
      withTimeout(swebenchScraper(), SCRAPER_TIMEOUT_MS, 'SWebench')
        .catch(e => { console.error("SWebench Scraper failed:", e.message || e); return []; }),
      withTimeout(aiderScraper(), SCRAPER_TIMEOUT_MS, 'Aider')
        .catch(e => { console.error("Aider Scraper failed:", e.message || e); return []; }),
      withTimeout(arcAgi1Scraper(), SCRAPER_TIMEOUT_MS, 'ARC-AGI-1')
        .catch(e => { console.error("ARC-AGI-1 Scraper failed:", e.message || e); return []; }),
      withTimeout(arcAgi2Scraper(), SCRAPER_TIMEOUT_MS, 'ARC-AGI-2')
        .catch(e => { console.error("ARC-AGI-2 Scraper failed:", e.message || e); return []; })
    ].filter(Boolean); // Filter out any explicitly undefined promises if needed (though catch handles failures)

    const allResults = await Promise.all(scraperPromises);
    const [lbResults, sbResults, swResults, aiderResults, arc1Results, arc2Results] = allResults;

    const currentResults = {
        'LiveBench Leaderboard': lbResults,
        'SimpleBench Leaderboard': sbResults,
        'SWE-Bench Verified Leaderboard': swResults,
        'Aider Polyglot Leaderboard': aiderResults,
        'ARC-AGI-1 Leaderboard': arc1Results,
        'ARC-AGI-2 Leaderboard': arc2Results
    };

    const currentScores = formatResultsForStorage(currentResults);

    // Log current results (optional, for debugging)
    console.log("\n--- Current Scraped Results ---");
    console.log(currentScores);
    console.log("-----------------------------\n");


    // 3. Compare results and generate post using OpenRouter
    if (!openRouter.apiKey || !nostrSecretKeyNsec) {
        let missingKeys = [];
        if (!openRouter.apiKey) missingKeys.push("OPENROUTER_API_KEY");
        if (!nostrSecretKeyNsec) missingKeys.push("NOSTR_BOT_NSEC");
        console.warn(`Missing environment variable(s): ${missingKeys.join(', ')}. Skipping comparison and Nostr post generation.`);
    } else if (currentScores === previousScores) {
        console.log("No changes detected since last run.");
    } else {
        console.log("Changes detected or first run. Generating summary post...");
        let postContent = '';
        try {
            const prompt = getComparisonPrompt(previousScores, currentScores);
            postContent = await openRouter.runPrompt(prompt);
            console.log("\n--- Generated Nostr Post ---");
            console.log(postContent);
            console.log("--------------------------\n");
        } catch (error) {
            console.error("Failed to generate summary post with OpenRouter:", error);
            // Optionally decide if you want to proceed without a post or exit
        }

        // 4. Publish to Nostr if post content was generated and flag is set
        if (postContent) {
            if (actuallyPostIt) {
                await publishToNostr(postContent, nostrSecretKeyNsec);
            } else {
                console.log("ACTUALLY_POST_IT flag is not 'true'. Skipping Nostr publish.");
                // Log the content that would have been posted for debugging
                console.log("\n--- Content that would be posted to Nostr ---");
                console.log(postContent);
                console.log("---------------------------------------------\n");
            }
        }
    }

    // 5. Overwrite yesterdayScores.txt with new results
    try {
        await fs.writeFile(stateFilePath, currentScores, 'utf-8');
        console.log('Successfully updated yesterdayScores.txt');
    } catch (error) {
        console.error('Error writing scores to file:', error);
    }


  } catch (error) {
    console.error('Error in main execution:', error);
  }
}

runAllScrapers().catch(console.error);
