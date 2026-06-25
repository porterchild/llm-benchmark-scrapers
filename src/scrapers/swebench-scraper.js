async function swebenchScraper(browser, count = 10, navigationTimeout = 60000, selectorTimeout = 30000) {
  // SWE-bench Verified data structure has changed. The site now loads data dynamically
  // from multiple GitHub sources and doesn't have a single consolidated JSON file.
  // This scraper is disabled until a reliable data source can be found.
  console.warn('SWE-bench Verified scraper disabled: site structure changed, no reliable data source available.');
  return [];
}

module.exports = swebenchScraper;
