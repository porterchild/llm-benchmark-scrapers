/**
 * Scraper Protocol
 * 
 * Each scraper function should conform to the following protocol:
 * 
 * @typedef {Object} ScraperResult
 * @property {string} model - The name of the model.
 * @property {number} score - The score of the model.
 * 
 * @typedef {() => Promise<ScraperResult[]>} ScraperFunction
 * 
 * A scraper function should return a promise that resolves to an array of ScraperResult objects.
 * Each ScraperResult object should contain the model name and its score.
 */

module.exports = {};
