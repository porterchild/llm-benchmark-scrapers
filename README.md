# LLM Benchmark Scraper

A simple scraper that extracts the top 5 LLMs from the Hugging Face Chatbot Arena Leaderboard.

## Installation

1. Clone this repository
2. Install dependencies:
```bash
npm install
```

## Usage

Run the scraper:
```bash
node index.js
```

## Output Format

The script outputs a table with the following columns:
- Rank
- Model Name
- Score

Example:
```
Top 5 LLMs on Chatbot Arena Leaderboard:
┌─────────┬──────────────────────────────┬─────────┐
│ (index) │            model             │  score  │
├─────────┼──────────────────────────────┼─────────┤
│    0    │ 'GPT-4'                      │ '1250'  │
│    1    │ 'Claude 2'                   │ '1200'  │
│    2    │ 'GPT-3.5 Turbo'              │ '1150'  │
│    3    │ 'Llama 2 70B'                │ '1100'  │
│    4    │ 'Claude Instant'             │ '1050'  │
└─────────┴──────────────────────────────┴─────────┘

# Future Direction
Could use mcp-browser-use mcp to make the scrapers more resilient and flexible, and eliminate code-based scrapers altogether.