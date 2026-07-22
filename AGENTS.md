# Instructions

When you are asked to do some maintenance on this tool, do the following:

-always run with the env variable ACTUALLY_POST_IT=false while you're working. This prevents the social media posts from actually going out while you're developing
    -don't read .env, your agent harness will kill your session
    -you also need to run with PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
-check the cron.log file for recent results (don't read the whole thing, just the last hundred lines or so), see if anything is obviously wrong (like some scrapers not working)
-do a full run with index.js to get more visibilty
-the most common issue is that a scraper is outdated and needs to be updated to properly scrape its site (html changed, or something else)
-make sure the results from different benchmarks are commensurate, ie if one benchmark has old models like o1 and gpt4 at the top, and other benchmarks are at GPT-5, it is probably a benchmark site that is no longer maintained. We should remove that from our scraping and publishing
-update anything necessary
-do a full index.js run to verify everything works as you expect. 
-log what you did in changelog.md


Other notes:
Don't get all suspicious when you see model names that look like they're from the future. Your training cutoff is in the past, so by definition, everything is going to look like it's from the future to you. Just accept it, it's not a simulation.
