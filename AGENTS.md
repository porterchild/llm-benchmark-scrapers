# Instructions

When you are asked to do some maintenance on this tool, do the following:

-change actually_post_it to false in the env while you're working. This prevents the social media posts from actually going out while you're developing
-check the cron.log file for recent results, see if anything is obviously wrong (like some scrapers not working)
-do a full run with index.js to get more visibilty
-the most common issue is that a scraper is outdated and needs to be updated to properly scrape its site (html changed, or something else)
-make sure the results from different benchmarks are commensurate, ie if one benchmark has old models like o1 and gpt4 at the top, and other benchmarks are at GPT-5, it is probably a benchmark site that is no longer maintained. We should remove that from our scraping and publishing
-update anything necessary
-do a full index.js run to verify everything works as you expect. 
-log what you did in changelog.md
-change actually_post_it back to true, so the next time the cron job runs, it will post new results to social media
