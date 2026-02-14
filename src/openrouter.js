const axios = require('axios');

class OpenRouterClient {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('OpenRouter API key is required.');
    }
    this.apiKey = apiKey;
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  }

  /**
   * Executes a given prompt using the specified OpenRouter model.
   * @param {string} promptContent - The content of the prompt to send to the LLM.
   * @param {string} [model='x-ai/grok-4.1-fast'] - The OpenRouter model identifier.
   * @returns {Promise<string>} - A promise that resolves to the LLM's response content.
   */
  async runPrompt(promptContent, model = 'x-ai/grok-4.1-fast') {
    if (!promptContent) {
      throw new Error('Prompt content cannot be empty.');
    }

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: model,
          messages: [{ role: 'user', content: promptContent }],
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content.trim();
      } else {
        throw new Error('No response choices received from OpenRouter.');
      }
    } catch (error) {
      console.error('Error calling OpenRouter API:', error.response ? error.response.data : error.message);
      throw new Error('Failed to get response from OpenRouter.');
    }
  }
}

module.exports = OpenRouterClient;
