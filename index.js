require('dotenv').config(); // Load environment variables from .env file
const fs = require('fs').promises;
const path = require('path');
const livebenchScraper = require('./src/scrapers/livebench');
const simplebenchScraper = require('./src/scrapers/simplebench-scraper');
const arcAgi1Scraper = require('./src/scrapers/arc-agi-1-scraper');
const arcAgi2Scraper = require('./src/scrapers/arc-agi-2-scraper');
const artificialAnalysisScraper = require('./src/scrapers/artificial-analysis-scraper');
const deepSWEScraper = require('./src/scrapers/deepswe-scraper');
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

const pastScoresDir = path.join(__dirname, 'pastScores');
const SCRAPER_TIMEOUT_MS = 60000 * TIMEOUT_MULTIPLIER; // 60 seconds timeout for each scraper

// Ensure pastScores directory exists
async function ensurePastScoresDir() {
  try {
    await fs.access(pastScoresDir);
  } catch {
    await fs.mkdir(pastScoresDir, { recursive: true });
  }
}

// Get the most recent scores file from pastScores/
// Returns the file path, or null if none found
async function getMostRecentScoresPath() {
  try {
    const files = await fs.readdir(pastScoresDir);
    const scoreFiles = files.filter(f => f.endsWith('.txt')).sort().reverse();
    if (scoreFiles.length > 0) {
      return path.join(pastScoresDir, scoreFiles[0]);
    }
  } catch (error) {
    console.log('No pastScores/ directory found or error reading it.');
  }
  return null;
}

// Get today's date string for filename
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Save scores to pastScores/ with today's date
async function saveScores(scores) {
  const todayStr = getTodayDateString();
  const filePath = path.join(pastScoresDir, `${todayStr}.txt`);
  await fs.writeFile(filePath, scores, 'utf-8');
  console.log(`Saved scores to pastScores/${todayStr}.txt`);
}

const SCRAPER_NAVIGATION_TIMEOUT_MS = 60000 * TIMEOUT_MULTIPLIER; // 60 seconds navigation timeout for puppeteer
const SCRAPER_SELECTOR_TIMEOUT_MS = 30000 * TIMEOUT_MULTIPLIER; // 30 seconds selector timeout for puppeteer

const openRouter = new OpenRouterClient(process.env.OPENROUTER_API_KEY);
const nostrSecretKeyNsec = process.env.NOSTR_BOT_NSEC; // Use NOSTR_BOT_NSEC
const actuallyPostIt = process.env.ACTUALLY_POST_IT === 'true'; // Check the debug flag

function formatResultsForStorage(results) {
  let output = '';
  for (const key in results) {
    output += `=== ${key} ===\n`;
    results[key].forEach((model, i) => {
      let score = model.score;
      if (typeof score === 'number') {
          if (key === 'ARC-AGI-1 Leaderboard' || key === 'ARC-AGI-2 Leaderboard' || 
              key === 'Humanity Last Exam Leaderboard' || key === 'DeepSWE Leaderboard' ||
              key === 'TerminalBench v2.1 Leaderboard' || key === 'CRIPt Leaderboard' || 
              key === 'MMMU-Pro Leaderboard') {
             score = score.toFixed(1) + '%';
         } else if (key === 'LiveBench Leaderboard' || key === 'SimpleBench Leaderboard') {
             score = typeof model.score === 'string' ? model.score : score.toFixed(1) + '%';
         } else {
             score = score.toFixed(2);
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

// Parse scores file into { leaderboardName: [entries], ... }
function parseScoresFile(content) {
  const sections = {};
  let currentSection = null;

  if (!content) return sections;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('=== ') && trimmed.endsWith(' ===')) {
      currentSection = trimmed.slice(4, -4);
      sections[currentSection] = [];
    } else if (currentSection && trimmed) {
      sections[currentSection].push(trimmed);
    }
  }

  return sections;
}

// Compare two leaderboards and return true if they differ
function leaderboardsChanged(prevEntries, currEntries) {
  if (!prevEntries || !currEntries) return true;
  if (prevEntries.length !== currEntries.length) return true;
  
  for (let i = 0; i < prevEntries.length; i++) {
    if (prevEntries[i] !== currEntries[i]) return true;
  }
  return false;
}

// Find which leaderboards have changed
function findChangedLeaderboards(prevScores, currScores) {
  const prev = parseScoresFile(prevScores);
  const curr = parseScoresFile(currScores);
  const changed = [];

  // Check all leaderboards that exist in current results
  for (const name in curr) {
    if (leaderboardsChanged(prev[name], curr[name])) {
      changed.push(name);
    }
  }

  // Also check if any leaderboards are new (not in prev)
  for (const name in curr) {
    if (!prev[name] || prev[name].length === 0) {
      if (!changed.includes(name)) {
        changed.push(name);
      }
    }
  }

  return changed;
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
      args: ['--no-sandbox'],
      protocolTimeout: 600000
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

    // Ensure pastScores directory exists
    await ensurePastScoresDir();

    // 1. Read most recent previous scores from pastScores/
    let previousScores = '';
    const mostRecentPath = await getMostRecentScoresPath();
    if (mostRecentPath) {
      previousScores = await fs.readFile(mostRecentPath, 'utf-8');
      console.log(`Loaded previous scores from pastScores/${path.basename(mostRecentPath)}`);
    } else {
      console.log('No previous scores found. Assuming first run.');
    }

    // Helper to add a delay before running scrapers to the same domain
    async function runWithDelay(promiseFactory, delayMs) {
      if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
      return promiseFactory().catch(e => { console.error(e); return []; });
    }

    // 2. Run scrapers with individual timeouts
    const numResults = 20; // Define the number of results to fetch
    
    // Non-artificialanalysis scrapers (can run in parallel)
    const otherScrapers = [
      withTimeout(livebenchScraper(browser, numResults, SCRAPER_NAVIGATION_TIMEOUT_MS, SCRAPER_SELECTOR_TIMEOUT_MS), SCRAPER_TIMEOUT_MS, 'LiveBench')
        .catch(e => { console.error("LiveBench Scraper failed:", e.message || e); return []; }),
      withTimeout(simplebenchScraper(browser, numResults, SCRAPER_NAVIGATION_TIMEOUT_MS, SCRAPER_SELECTOR_TIMEOUT_MS), SCRAPER_TIMEOUT_MS, 'SimpleBench')
        .catch(e => { console.error("SimpleBench Scraper failed:", e.message || e); return []; }),
      withTimeout(arcAgi1Scraper(browser, numResults, SCRAPER_NAVIGATION_TIMEOUT_MS, SCRAPER_SELECTOR_TIMEOUT_MS), SCRAPER_TIMEOUT_MS, 'ARC-AGI-1')
        .catch(e => { console.error("ARC-AGI-1 Scraper failed:", e.message || e); return []; }),
      withTimeout(arcAgi2Scraper(browser, numResults, SCRAPER_NAVIGATION_TIMEOUT_MS, SCRAPER_SELECTOR_TIMEOUT_MS), SCRAPER_TIMEOUT_MS, 'ARC-AGI-2')
        .catch(e => { console.error("ARC-AGI-2 Scraper failed:", e.message || e); return []; }),
      withTimeout(deepSWEScraper(browser, numResults, SCRAPER_NAVIGATION_TIMEOUT_MS, SCRAPER_SELECTOR_TIMEOUT_MS), SCRAPER_TIMEOUT_MS, 'DeepSWE')
        .catch(e => { console.error("DeepSWE Scraper failed:", e.message || e); return []; })
    ];

    // Artificialanalysis scrapers (sequential with delays to avoid rate limiting)
    const aaDelay = 3000;
    const [hleResults, tbv21Results, criptResults, mmmuProResults] = await Promise.all([
      runWithDelay(() => 
        withTimeout(artificialAnalysisScraper(browser, 'humanitys-last-exam', 33, numResults, SCRAPER_NAVIGATION_TIMEOUT_MS, SCRAPER_SELECTOR_TIMEOUT_MS), SCRAPER_TIMEOUT_MS, 'HumanityLastExam'), 
        0
      ).catch(e => { console.error("Humanity Last Exam Scraper failed:", e.message || e); return []; }),
      runWithDelay(() => 
        withTimeout(artificialAnalysisScraper(browser, 'terminalbench-v2-1', 32, numResults, SCRAPER_NAVIGATION_TIMEOUT_MS, SCRAPER_SELECTOR_TIMEOUT_MS), SCRAPER_TIMEOUT_MS, 'TerminalBenchV21'), 
        aaDelay
      ).catch(e => { console.error("TerminalBench v2.1 Scraper failed:", e.message || e); return []; }),
      runWithDelay(() => 
        withTimeout(artificialAnalysisScraper(browser, 'critpt', 33, numResults, SCRAPER_NAVIGATION_TIMEOUT_MS, SCRAPER_SELECTOR_TIMEOUT_MS), SCRAPER_TIMEOUT_MS, 'CRIPt'), 
        aaDelay * 2
      ).catch(e => { console.error("CRIPt Scraper failed:", e.message || e); return []; }),
      runWithDelay(() => 
        withTimeout(artificialAnalysisScraper(browser, 'mmmu-pro', 33, numResults, SCRAPER_NAVIGATION_TIMEOUT_MS, SCRAPER_SELECTOR_TIMEOUT_MS), SCRAPER_TIMEOUT_MS, 'MMMU-Pro'), 
        aaDelay * 3
      ).catch(e => { console.error("MMMU-Pro Scraper failed:", e.message || e); return []; })
    ]);

    const [lbResults, sbResults, arc1Results, arc2Results, deepSWEResults] = await Promise.all(otherScrapers);

    const allScrapersEmpty = [lbResults, sbResults, arc1Results, arc2Results, hleResults, deepSWEResults, tbv21Results, criptResults, mmmuProResults].every(r => r.length === 0);

    if (allScrapersEmpty) {
        console.warn('All scrapers returned empty results. Skipping score update to preserve previous valid results.');
        return;
    }

    const currentResults = {
        'LiveBench Leaderboard': lbResults,
        'SimpleBench Leaderboard': sbResults,
        'ARC-AGI-1 Leaderboard': arc1Results,
        'ARC-AGI-2 Leaderboard': arc2Results,
        'Humanity Last Exam Leaderboard': hleResults,
        'DeepSWE Leaderboard': deepSWEResults,
        'TerminalBench v2.1 Leaderboard': tbv21Results,
        'CRIPt Leaderboard': criptResults,
        'MMMU-Pro Leaderboard': mmmuProResults
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
    } else {
        // Check per-leaderboard changes
        const changedLeaderboards = findChangedLeaderboards(previousScores, currentScores);
        let postContent = '';
        
        if (changedLeaderboards.length === 0) {
            console.log("No changes detected since last run.");
        } else {
            console.log(`Changes detected in: ${changedLeaderboards.join(', ')}. Generating summary post...`);
            try {
                const prompt = getComparisonPrompt(previousScores, currentScores, changedLeaderboards);
                postContent = await openRouter.runPrompt(prompt);
                console.log("\n--- Generated Nostr Post ---");
                console.log(postContent);
                console.log("--------------------------\n");
            } catch (error) {
                console.error("Failed to generate summary post with OpenRouter:", error);
                // Optionally decide if you want to proceed without a post or exit
            }
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

    // 5. Save scores to pastScores/ (dated)
    // The check for allScrapersEmpty above ensures we don't reach here if results were empty.
    try {
        await saveScores(currentScores);
    } catch (error) {
        console.error('Error saving scores:', error);
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
