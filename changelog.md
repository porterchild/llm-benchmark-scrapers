Jun 25, 2026 - Fixed ARC-AGI-1 and ARC-AGI-2 scrapers:
- Found JSON API at arcprize.org/media/data/evaluations.json
- ARC-AGI-1 (v1_Semi_Private): GPT-5.5 Pro 96.5%, Gemini 3.1 Pro 98%, Claude 4.7 75.8%
- ARC-AGI-2 (v2_Semi_Private): GPT-5.5 85%, Gemini 3.1 Pro 77.1%, Claude 4.7 75.8%
- Scrapers now fetch directly from JSON API (no Puppeteer needed)

Disabled scrapers (outdated):
- LiveCodeBench: data outdated (O3/O4/Gemini-2.5 from mid-2024)
- SWE-Bench Verified: site structure changed
- Aider: benchmark outdated (o3, Gemini 2.5 from 2024-2025)

Active scrapers (verified working):
- LiveBench: GPT-5.5, Claude 4.8, Claude Fable 5, Gemini 3.5 (current)
- SimpleBench: Claude Fable, Gemini 3.1, GPT-5.5, Gemini 3.5 (current)
- ARC-AGI-1: GPT-5.5 Pro, Gemini 3.1 Pro (current)
- ARC-AGI-2: GPT-5.5, Gemini 3.1 Pro, Claude 4.7 (current)

Jun 1, 2026 - updated the ai model from grok 4.1 fast to deepseek v4 flash because grok was deprecated
