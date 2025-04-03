const axios = require('axios');

async function scrapeHuggingface() {
  try {
    console.log('Fetching leaderboard data from API...');
    const response = await axios.get('https://huggingface.co/api/spaces/lmarena-ai/chatbot-arena-leaderboard', {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid API response format');
    }

    const top5 = response.data
      .map(item => ({
        model: item.model,
        score: parseFloat(item.score)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (top5.length === 0) {
      throw new Error('No valid models found in API response');
    }

    console.log('\nTop 5 Models from Hugging Face Leaderboard:');
    top5.forEach((model, i) => {
      console.log(`${i+1}. ${model.model} - ${model.score.toFixed(1)}`);
    });
    return top5;
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.statusText);
    } else {
      console.error('Error:', error.message);
    }
    return [];
  }
}

module.exports = scrapeHuggingface;

// Run directly if not required as module
if (require.main === module) {
  scrapeHuggingface().catch(console.error);
}
