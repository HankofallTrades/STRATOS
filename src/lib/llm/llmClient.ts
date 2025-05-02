export type ChatMessage = {
  role: 'user' | 'assistant' | 'system'; // Added system role
  content: string;
};

// Environment variables (ensure these are set in your .env.local file)
const llmProvider = import.meta.env.VITE_LLM_PROVIDER || 'local'; // Default to local
const localLlmUrl = import.meta.env.VITE_LOCAL_LLM_URL; // e.g., http://localhost:11434/api/chat for Ollama
const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
const openaiApiUrl = import.meta.env.VITE_OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';

/**
 * Sends a list of messages to the configured LLM provider and returns the response.
 */
export async function getLlmResponse(messages: ChatMessage[]): Promise<ChatMessage> {
  console.log(`Using LLM Provider: ${llmProvider}`);
  console.log('Sending messages:', messages);

  try {
    switch (llmProvider.toLowerCase()) {
      case 'local':
        return await getLocalLlmResponse(messages);
      case 'openai':
        return await getOpenAiResponse(messages);
      // Add cases for other providers here
      default:
        throw new Error(`Unsupported LLM provider: ${llmProvider}`);
    }
  } catch (error) {
    console.error(`Error getting LLM response from ${llmProvider}:`, error);
    // Return a generic error message as an assistant response
    return {
      role: 'assistant',
      content: `Sorry, I couldn't connect to the AI Coach (${llmProvider}). Please check the configuration or try again later.`,
    };
  }
}

// --- Local LLM (Example: Ollama / LM Studio OpenAI Compatible) ---
async function getLocalLlmResponse(messages: ChatMessage[]): Promise<ChatMessage> {
  if (!localLlmUrl) {
    throw new Error('VITE_LOCAL_LLM_URL is not defined in environment variables.');
  }

  // Structure the request like the OpenAI API for compatibility with LM Studio and others
  const payload = {
    // Note: LM Studio might ignore the model name if one is already loaded in the UI.
    // You might need to adjust this based on your specific local setup.
    model: 'local-model', // Placeholder, actual model often determined by the local server
    messages: messages,
    // Add other OpenAI compatible parameters if needed (temperature, max_tokens, etc.)
    // temperature: 0.7,
    stream: false, // Keep it simple for now
  };

  console.log('Sending payload to local LLM:', JSON.stringify(payload));

  const response = await fetch(localLlmUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // LM Studio/OpenAI-compatible servers might not require an API key, but add if yours does
      // 'Authorization': `Bearer YOUR_LOCAL_API_KEY`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Local LLM API Error Response Body:', errorBody);
    throw new Error(`Local LLM API request failed with status ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  console.log('Received data from local LLM:', data);

  // Extract the response message using OpenAI-compatible structure
  if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
    console.error('Invalid response structure from local LLM API:', data);
    throw new Error('Invalid response structure from local LLM API (Expected OpenAI format)');
  }

  return {
    role: 'assistant',
    content: data.choices[0].message.content.trim(),
  };
}

// --- OpenAI LLM ---
async function getOpenAiResponse(messages: ChatMessage[]): Promise<ChatMessage> {
  if (!openaiApiKey) {
    throw new Error('VITE_OPENAI_API_KEY is not defined in environment variables.');
  }

  const payload = {
    model: 'gpt-3.5-turbo', // Or your desired OpenAI model
    messages: messages,
  };

  const response = await fetch(openaiApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API request failed with status ${response.status}: ${errorBody}`);
  }

  const data = await response.json();

   // Extract the response message
   if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
    throw new Error('Invalid response structure from OpenAI API');
  }

  return {
    role: 'assistant',
    content: data.choices[0].message.content.trim(),
  };
} 