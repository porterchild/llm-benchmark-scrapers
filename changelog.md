Jul 11, 2026 - Fixed LiveBench scraper: updated column index for model name from `cols[0]` to `cols[1]`. The LiveBench website added an expand icon column (▸) as the first column, shifting model names to column 1. 
-Fixed maintenance detection in `ai_agent_maintenance.py` to check for replacement characters (U+FFFD), missing alphabetic content in model names, and invalid scores. All 9 scrapers verified working.

Jul 1, 2026 - Fixed CRIPt scraper: removed `foreignObject` parent selector from model link query (`artificial-analysis-scraper.js`). The site's SVG structure changed and model links are no longer wrapped in foreignObject elements. All 9 scrapers verified working.

Jun 30, 2026 - Fixed CRIPt leaderboard in yesterdayScores.txt (was empty due to transient cron failure, full re-run restored all 20 entries). All scrapers verified working.

Jun 28, 2026 - Verified CRIPt scraper still working correctly (transient failure during cron run, all scrapers now verified).

Jun 25, 2026 - Refactored HLE scraper to use generic artificialAnalysisScraper.
Added TerminalBench v2.1, CRIPt, and MMMU-Pro scrapers using same recharts SVG extraction pattern.
Added 3s delays between artificialanalysis.ai scrapers to avoid rate limiting.
Removed disabled scrapers (SWE-Bench Verified, Aider, LiveCodeBench): cleaned up code, config, and changelog references.

Fixed Humanity's Last Exam scraper:
- Extracts all 27 models from recharts SVG chart on artificialanalysis.ai
- Scrapes model names from foreignObject links and scores from SVG text elements
- Top models: Claude Fable 5 (53.3%), Opus 4.8 (45.7%), Gemini 3.1 Pro (44.7%)

Fixed ARC-AGI-1 and ARC-AGI-2 scrapers:
- Found JSON API at arcprize.org/media/data/evaluations.json
- ARC-AGI-1 (v1_Semi_Private): GPT-5.5 Pro 96.5%, Gemini 3.1 Pro 98%, Claude 4.7 75.8%
- ARC-AGI-2 (v2_Semi_Private): GPT-5.5 85%, Gemini 3.1 Pro 77.1%, Claude 4.7 75.8%
- Scrapers now fetch directly from JSON API (no Puppeteer needed)

Active scrapers (verified working):
- LiveBench: GPT-5.5, Claude 4.8, Claude Fable 5, Gemini 3.5 (current)
- SimpleBench: Claude Fable, Gemini 3.1, GPT-5.5, Gemini 3.5 (current)
- ARC-AGI-1: GPT-5.5 Pro, Gemini 3.1 Pro (current)
- ARC-AGI-2: GPT-5.5, Gemini 3.1 Pro, Claude 4.7 (current)
- DeepSWE: Claude Fable 5 (69.9%), GPT-5.5 (67.0%) (current)
- Humanity's Last Exam: Claude Fable 5 (53.3%), Opus 4.8 (45.7%), Gemini 3.1 Pro (44.7%) (current)
- TerminalBench v2.1: Claude Fable 5 (84.6%), GPT-5.5 xhigh (84.3%), Opus 4.8 (84.6%) (current)
- CRIPt: GPT-5.5 Pro (30.6%), GPT-5.4 Pro (30.0%), Claude Fable 5 (28.6%) (current)
- MMMU-Pro: Gemini 3.5 Flash (84%), Gemini 3.1 Pro (82%), GPT-5.5 (81%) (current)

Jun 1, 2026 - updated the ai model from grok 4.1 fast to deepseek v4 flash because grok was deprecated
