require('dotenv').config(); // Load environment variables from .env file
const fs = require('fs').promises;
const path = require('path');
const huggingfaceScraper = require('./src/scrapers/huggingface');
const livebenchScraper = require('./src/scrapers/livebench');
const simplebenchScraper = require('./src/scrapers/simplebench-scraper');
const swebenchScraper = require('./src/scrapers/swebench-scraper');
const OpenRouterClient = require('./src/openrouter');
const { getComparisonPrompt } = require('./src/prompts'); // Import the prompt generator
const { publishToNostr } = require('./src/nostr'); // Import the Nostr publishing function

const stateFilePath = path.join(__dirname, 'yesterdayScores.txt');
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
         if (key === 'SimpleBench Leaderboard') {
             score = score.toFixed(1) + '%';
         } else if (key === 'LiveBench Leaderboard' || key === 'SWebench Leaderboard') {
             score = score.toFixed(2);
         } else {
             score = score.toFixed(1); // Default/HuggingFace
         }
      }
      output += `${i + 1}. ${model.model} - ${score}\n`;
    });
    output += '\n';
  }
  return output.trim();
}


async function runAllScrapers() {
  try {
    console.log('Running all benchmark scrapers...\n');

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
    
    // 2. Run scrapers
    const [hfResults, lbResults, sbResults, swResults] = await Promise.all([
      huggingfaceScraper().catch(e => { console.error("HF Scraper failed:", e); return []; }),
      livebenchScraper().catch(e => { console.error("LiveBench Scraper failed:", e); return []; }),
      simplebenchScraper().catch(e => { console.error("SimpleBench Scraper failed:", e); return []; }),
      swebenchScraper().catch(e => { console.error("SWebench Scraper failed:", e); return []; })
    ]);

    const currentResults = {
        'Chatbot Arena Leaderboard': hfResults,
        'LiveBench Leaderboard': lbResults,
        'SimpleBench Leaderboard': sbResults,
        'SWE-Bench Verified Leaderboard': swResults
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
        if (!nostrSecretKeyNsec) missingKeys.push("NOSTR_BOT_NSEC"); // Corrected check
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
