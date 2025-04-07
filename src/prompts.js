/**
 * Generates the prompt for comparing LLM benchmark scores.
 * @param {string} previousScores - Stringified representation of the previous day's scores.
 * @param {string} currentScores - Stringified representation of the current day's scores.
 * @returns {string} - The formatted prompt string.
 */
function getComparisonPrompt(previousScores, currentScores) {
  // Handle the case where previousScores might be empty (first run)
  const previousScoresSection = previousScores
    ? `Previous day's LLM benchmark scores:\n---\n${previousScores}\n---`
    : "This is the first run, no previous scores available.";

  return `
${previousScoresSection}

Current day's LLM benchmark scores:
---
${currentScores}
---

Analyze the changes between the previous and new (current) scores. Generate a concise summary highlighting any movements (e.g., new models entering the top ranks, score changes, rank shifts). It should take the form of a short, friendly social media post.

**Formatting Requirements:**
For each leaderboard section (e.g., "Chatbot Arena Leaderboard", "LiveBench Leaderboard") that has *any* change mentioned in your summary, include a hashtag derived from its name (e.g., #ChatbotArena, #LiveBench). Also reproduce the new standings for that leaderboard.
For each *specific model name* mentioned as having changed rank or score in your summary, include a hashtag for that model (e.g., #Gemini2_5Pro, #Claude3_7Sonnet). Use underscores instead of spaces or special characters in model name hashtags.
After this, include a funny/snarky AI progress-themed comment like "May you prosper through the singularity", or "May the future bring you many robotic e-girls", or funny obvious misquotes like "Never underestimate exponential AI improvement - Abraham Lincoln". Make up your own. 
If there are no changes detected between the previous and current scores for a given leaderboard, skip it. If this is the first run (no previous scores provided), provide a summary of the current scores, followed by the #ai and #LLM hashtags.
Include the hashtags #ai and #LLM at the very end of the post.

For example (note, most leaderboards are ignored because they didn't have changes on this day):

🌐 LLM Leaderboard Update 🌐  

#SimpleBench: #Claude3_5Sonnet ninja-rolls into 5th place (41.4%), booting #qwq-32b into the existential void.  

New Results-
=== SimpleBench Leaderboard ===
1. Gemini 2.5 - 51.6%
2. Claude 3.7 Sonnet (thinking) - 46.4%
3. Claude 3.7 Sonnet - 44.9%
4. o1-preview - 41.7%
5. Claude 3.5 Sonnet 10-22 - 41.4%

"History is written by the models with the best validation scores." — A slightly confused Thucydides  

#ai #LLM  
`;
}

module.exports = {
  getComparisonPrompt,
};
