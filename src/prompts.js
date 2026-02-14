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
For each *specific model name* mentioned as having changed rank or score in your summary, include a hashtag for that model (e.g., #GeminiPro for Gemini-2.5-Pro-Exp-03-25, #ClaudeSonnet for Claude 3.7 Sonnet).

Include the hashtags #ai and #LLM at the very end of the post.

Here is an example (note, most leaderboards are ignored because they didn't have changes on this round):

🌐 LLM Leaderboard Update 🌐  

#SimpleBench: #Claude4Opus storms in with 58.8% to claim the throne! #DeepSeekR1_0528 debuts at 9th.  

New Results-  
=== SimpleBench Leaderboard ===  
1. Claude 4 Opus (thinking) - 58.8%  
2. o3 (high) - 53.1%  
3. Gemini 2.5 Pro - 51.6%  
4. Claude 3.7 Sonnet (thinking) - 46.4%  
5. Claude 4 Sonnet (thinking) - 45.5%  
6. Claude 3.7 Sonnet - 44.9%  
7. o1-preview - 41.7%  
8. Claude 3.5 Sonnet 10-22 - 41.4%  
9. DeepSeek R1 05/28 - 40.8%  
10. o1-2024-12-17 (high) - 40.1%  
11. o4-mini (high) - 38.7%  
12. o1-2024-12-17 (med) - 36.7%  
13. Grok 3 - 36.1%  
14. GPT-4.5 - 34.5%  
15. Gemini-exp-1206 - 31.1%  
16. Qwen3 235B-A22B - 31.0%  
17. DeepSeek R1 - 30.9%  
18. Gemini 2.0 Flash Thinking - 30.7%  
19. Llama 4 Maverick - 27.7%  
20. Claude 3.5 Sonnet 06-20 - 27.5%  

#ai #LLM #SimpleBench


End of example.

Don't include any commentary, just respond with the post alone.
`;
}

module.exports = {
  getComparisonPrompt,
};
