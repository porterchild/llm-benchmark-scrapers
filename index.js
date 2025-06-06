require('dotenv').config(); // Load environment variables from .env file
const fs = require('fs').promises;
const path = require('path');
const livebenchScraper = require('./src/scrapers/livebench');
const simplebenchScraper = require('./src/scrapers/simplebench-scraper');
const swebenchScraper = require('./src/scrapers/swebench-scraper');
const aiderScraper = require('./src/scrapers/aider-scraper');
const arcAgi1Scraper = require('./src/scrapers/arc-agi-1-scraper');
const arcAgi2Scraper = require('./src/scrapers/arc-agi-2-scraper');
const livecodebenchScraper = require('./src/scrapers/livecodebench-scraper');
const OpenRouterClient = require('./src/openrouter');
const { getComparisonPrompt } = require('./src/prompts');
const { publishToNostr } = require('./src/nostr');
const os = require('os'); // Import the 'os' module
const puppeteer = require('puppeteer'); // Import puppeteer

// Determine if running on a Raspberry Pi (this is approximate)
const mightBeRaspberryPi = os.platform() === 'linux' && (os.arch() === 'arm' || os.arch() === 'arm64');

if (mightBeRaspberryPi) {
  // not sure why the rpi needs this, but puppeteer won't work without it
  process.env.PUPPETEER_EXECUTABLE_PATH = '/usr/bin/chromium-browser';
  console.log('Set PUPPETEER_EXECUTABLE_PATH for Raspberry Pi:', process.env.PUPPETEER_EXECUTABLE_PATH);
}

const TIMEOUT_MULTIPLIER = mightBeRaspberryPi ? 10 : 1; // 10x timeout for Raspberry Pi, 1x for others

const stateFilePath = path.join(__dirname, 'yesterdayScores.txt');
const SCRAPER_TIMEOUT_MS = 60000 * TIMEOUT_MULTIPLIER; // 60 seconds timeout for each scraper
const SCRAPER_NAVIGATION_TIMEOUT_MS = 60000 * TIMEOUT_MULTIPLIER; // 60 seconds navigation timeout for puppeteer
const SCRAPER_SELECTOR_TIMEOUT_MS = 30000 * TIMEOUT_MULTIPLIER; // 30 seconds selector timeout for puppeteer

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
         } else if (key === 'LiveBench Leaderboard' || key === 'SWE-Bench Verified Leaderboard' || key === 'LiveCodeBench Leaderboard') {
             score = score.toFixed(2);
         } else { // Default for remaining leaderboards (if any added later)
             score = score.toFixed(1);
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


const http = require('http'); // Import http module for network check

async function checkNetwork() {
  return new Promise((resolve) => {
    http.get('http://www.google.com', (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function runAllScrapersAndMakePost() {
  let browser;
  try {
    console.log(`Detected environment: ${os.platform()} ${os.arch()}. Raspberry Pi detected: ${mightBeRaspberryPi}. Timeout multiplier: ${TIMEOUT_MULTIPLIER}x.`);
    console.log(`Running all benchmark scrapers (scraper timeout: ${SCRAPER_TIMEOUT_MS / 1000}s, navigation timeout: ${SCRAPER_NAVIGATION_TIMEOUT_MS / 1000}s, selector timeout: ${SCRAPER_SELECTOR_TIMEOUT_MS / 1000}s)...\n`);

    // Launch browser once
    console.log('Launching Puppeteer browser...');
    const launchOptions = {
      args: ['--no-sandbox'] 
    };
    if (mightBeRaspberryPi) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    browser = await puppeteer.launch(launchOptions);
    console.log('Puppeteer browser launched.');

    // Network check with retries
    const maxRetries = 20; // 10 minutes / 30 seconds = 20 retries
    const retryIntervalMs = 30000; // 30 seconds
    let retries = 0;
    let networkUp = false;

    while (!networkUp && retries < maxRetries) {
      console.log(`Checking network connection (Attempt ${retries + 1}/${maxRetries})...`);
      networkUp = await checkNetwork();
      if (networkUp) {
        console.log('Network is up. Proceeding with scrapers.');
        break;
      } else {
        retries++;
        if (retries < maxRetries) {
          console.log(`Network down. Retrying in ${retryIntervalMs / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryIntervalMs));
        } else {
          console.error('Network remained down after multiple retries. Exiting.');
          process.exit(1); // Exit if network is down after max retries
        }
      }
    }

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
    const numResults = 20; // Define the number of results to fetch
    const scraperPromises = [
      withTimeout(livebenchScraper(browser, numResults, SCRAPER_NAVIGATION_TIMEOUT_MS, SCRAPER_SELECTOR_TIMEOUT_MS), SCRAPER_TIMEOUT_MS, 'LiveBench')
        .catch(e => { console.error("LiveBench Scraper failed:", e.message || e); return []; }),
      withTimeout(simplebenchScraper(browser, numResults, SCRAPER_NAVIGATION_TIMEOUT_MS, SCRAPER_SELECTOR_TIMEOUT_MS), SCRAPER_TIMEOUT_MS, 'SimpleBench')
        .catch(e => { console.error("SimpleBench Scraper failed:", e.message || e); return []; }),
      withTimeout(swebenchScraper(browser, numResults, SCRAPER_NAVIGATION_TIMEOUT_MS, SCRAPER_SELECTOR_TIMEOUT_MS), SCRAPER_TIMEOUT_MS, 'SWebench')
        .catch(e => { console.error("SWebench Scraper failed:", e.message || e); return []; }),
      withTimeout(aiderScraper(browser, numResults, SCRAPER_NAVIGATION_TIMEOUT_MS, SCRAPER_SELECTOR_TIMEOUT_MS), SCRAPER_TIMEOUT_MS, 'Aider')
        .catch(e => { console.error("Aider Scraper failed:", e.message || e); return []; }),
      withTimeout(arcAgi1Scraper(numResults, SCRAPER_NAVIGATION_TIMEOUT_MS, SCRAPER_SELECTOR_TIMEOUT_MS), SCRAPER_TIMEOUT_MS, 'ARC-AGI-1')
        .catch(e => { console.error("ARC-AGI-1 Scraper failed:", e.message || e); return []; }), // ARC-AGI scrapers don't use Puppeteer
      withTimeout(arcAgi2Scraper(numResults, SCRAPER_NAVIGATION_TIMEOUT_MS, SCRAPER_SELECTOR_TIMEOUT_MS), SCRAPER_TIMEOUT_MS, 'ARC-AGI-2')
        .catch(e => { console.error("ARC-AGI-2 Scraper failed:", e.message || e); return []; }), // ARC-AGI scrapers don't use Puppeteer
      withTimeout(livecodebenchScraper(browser, numResults, SCRAPER_NAVIGATION_TIMEOUT_MS, SCRAPER_SELECTOR_TIMEOUT_MS), SCRAPER_TIMEOUT_MS, 'LiveCodeBench')
        .catch(e => { console.error("LiveCodeBench Scraper failed:", e.message || e); return []; })
    ].filter(Boolean); // Filter out any explicitly undefined promises if needed (though catch handles failures)

    const allResults = await Promise.all(scraperPromises);

    // Check if all scraper results are empty
    const allScrapersEmpty = allResults.every(resultArray => resultArray.length === 0);

    if (allScrapersEmpty) {
        console.warn('All scrapers returned empty results. Skipping update of yesterdayScores.txt to preserve previous valid results.');
        // Optionally, you might want to exit or skip further processing
        return; // Exit the function early
    }

    const [lbResults, sbResults, swResults, aiderResults, arc1Results, arc2Results, lcbResults] = allResults; 

    const currentResults = {
        'LiveBench Leaderboard': lbResults,
        'SimpleBench Leaderboard': sbResults,
        'SWE-Bench Verified Leaderboard': swResults,
        'Aider Polyglot Leaderboard': aiderResults,
        'ARC-AGI-1 Leaderboard': arc1Results,
        'ARC-AGI-2 Leaderboard': arc2Results,
        'LiveCodeBench Leaderboard': lcbResults 
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
    // The check for allScrapersEmpty above ensures we don't reach here if results were empty.
    try {
        await fs.writeFile(stateFilePath, currentScores, 'utf-8');
        console.log('Successfully updated yesterdayScores.txt');
    } catch (error) {
        console.error('Error writing scores to file:', error);
    }


  } catch (error) {
    console.error('Error in main execution:', error);
  } finally {
    if (browser) {
      console.log('Closing Puppeteer browser...');
      await browser.close();
      console.log('Puppeteer browser closed.');
    }
  }
}

runAllScrapersAndMakePost().catch(console.error);
