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
For any leaderboard that has any changes, reproduce ALL new standings for that leaderboard. If there are no previous results for a given leaderboard, do the same. If there are no prevous results for any leaderboards (which will happen on the first post), reproduce ALL new standings in the post.
If there are no changes detected between the previous and current scores for a given leaderboard, skip it.
If the new (current) results are empty for a leaderboard, skip that leaderboard.

**Formatting Requirements:**
For each leaderboard section (e.g., "Chatbot Arena Leaderboard", "LiveBench Leaderboard") that has *any* change mentioned in your summary, include a hashtag derived from its name (e.g., #ChatbotArena, #LiveBench). 
For each *specific model name* mentioned as having changed rank or score in your summary, include a hashtag for that model (e.g., #GeminiPro for Gemini-2.5-Pro-Exp-03-25, #ClaudeSonnet for Claude 3.7 Sonnet). Use underscores instead of spaces or special characters in model name hashtags.

After this, include a funny/snarky AI progress-themed comment like "May you prosper through the singularity", or "May the future bring you many robotic e-girls", or funny obvious misquotes like "Never underestimate exponential AI improvement - Abraham Lincoln". Make up your own. 

Include the hashtags #ai and #LLM at the very end of the post.

Here is an example (note, most leaderboards are ignored because they didn't have changes on this round):

🌐 LLM Leaderboard Update 🌐  

#SimpleBench: #Gemini ninja-rolls into 10th place (31.1%), booting #qwq into the existential void.  

New Results-
=== SimpleBench Leaderboard ===
1. Gemini 2.5 Pro - 51.6%
2. Claude 3.7 Sonnet (thinking) - 46.4%
3. Claude 3.7 Sonnet - 44.9%
4. o1-preview - 41.7%
5. Claude 3.5 Sonnet 10-22 - 41.4%
6. o1-2024-12-17 (high) - 40.1%
7. o1-2024-12-17 (med) - 36.7%
8. Grok 3 - 36.1%
9. GPT-4.5 - 34.5%
10. Gemini-exp-1206 - 31.1%

"History is written by the models with the best validation scores." — A slightly confused Thucydides  

#ai #LLM #SimpleBench


End of example.

Don't include any commentary, just respond with the post alone.
`;
}

module.exports = {
  getComparisonPrompt,
};
