export type ChatMessage = {
  role: 'user' | 'assistant' | 'system'; // Added system role
  content: string;
};

// Key must match the one used in Settings.tsx
const LLM_PROVIDER_PREF_KEY = 'llmProviderPref';

// Environment variables (ensure these are set in your .env.local file)
// Keep reading API keys/URLs from env vars
const localLlmUrl = import.meta.env.VITE_LOCAL_LLM_URL;
const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
const openaiApiUrl = import.meta.env.VITE_OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const openRouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
const openRouterApiUrl = 'https://openrouter.ai/api/v1/chat/completions';
const openRouterReferer = import.meta.env.VITE_APP_URL || 'http://localhost:5173';
const openRouterAppName = import.meta.env.VITE_APP_NAME || 'STRATOS';
const runtimeLlmProviderFallback = import.meta.env.VITE_LLM_PROVIDER || 'local'; // Fallback if localStorage is empty

/**
 * Sends a list of messages to the configured LLM provider and returns the response.
 */
export async function getLlmResponse(messages: ChatMessage[]): Promise<ChatMessage> {
  // Read provider preference from localStorage at runtime
  const selectedProvider = (localStorage.getItem(LLM_PROVIDER_PREF_KEY) || runtimeLlmProviderFallback).toLowerCase();

  // console.log(`Using LLM Provider (Runtime): ${selectedProvider}`);
  // console.log('Sending messages:', messages); // Optional: uncomment for detailed debugging

  try {
    // Use the runtime selectedProvider for the switch
    switch (selectedProvider) {
      case 'local':
        // Ensure localLlmUrl is still checked inside this function
        if (!localLlmUrl) throw new Error('VITE_LOCAL_LLM_URL not set');
        return await getLocalLlmResponse(messages);
      case 'openai':
        // Ensure openaiApiKey is still checked inside this function
        if (!openaiApiKey) throw new Error('VITE_OPENAI_API_KEY not set');
        return await getOpenAiResponse(messages);
      case 'deepseek':
        // Ensure openRouterApiKey is still checked inside this function
        if (!openRouterApiKey) throw new Error('VITE_OPENROUTER_API_KEY not set');
        return await getOpenRouterResponse(messages, 'deepseek/deepseek-chat-v3-0324:free');
      // Add cases for other providers here (anthropic, google, xai)
      // case 'anthropic':
      //   // if (!openRouterApiKey && !anthropicApiKey) throw new Error('API Key missing');
      //   throw new Error('Anthropic provider not yet implemented.');
      default:
        throw new Error(`Unsupported LLM provider selected: ${selectedProvider}`);
    }
  } catch (error) {
    // console.error(`Error getting LLM response from ${selectedProvider}:`, error);
    // Return a generic error message as an assistant response
    return {
      role: 'assistant',
      content: `Sorry, I couldn't connect to the AI Coach (${selectedProvider}). Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// --- Local LLM (Example: Ollama / LM Studio OpenAI Compatible) ---
// Ensure URL check remains or is added if removed previously
async function getLocalLlmResponse(messages: ChatMessage[]): Promise<ChatMessage> {
  if (!localLlmUrl) {
    // This check might be redundant if done in the main function, but safer to keep
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

  // console.log('Sending payload to local LLM:', JSON.stringify(payload));

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
    // console.error('Local LLM API Error Response Body:', errorBody);
    throw new Error(`Local LLM API request failed with status ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  // console.log('Received data from local LLM:', data);

  // Extract the response message using OpenAI-compatible structure
  if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
    // console.error('Invalid response structure from local LLM API:', data);
    throw new Error('Invalid response structure from local LLM API (Expected OpenAI format)');
  }

  return {
    role: 'assistant',
    content: data.choices[0].message.content.trim(),
  };
}

// --- OpenAI LLM ---
// Ensure API Key check remains or is added if removed previously
async function getOpenAiResponse(messages: ChatMessage[]): Promise<ChatMessage> {
  if (!openaiApiKey) {
    // This check might be redundant if done in the main function, but safer to keep
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

// --- OpenRouter LLM ---
// Ensure API Key check remains or is added if removed previously
async function getOpenRouterResponse(messages: ChatMessage[], model: string): Promise<ChatMessage> {
  if (!openRouterApiKey) {
    // This check might be redundant if done in the main function, but safer to keep
    throw new Error('VITE_OPENROUTER_API_KEY is not defined in environment variables.');
  }

  const payload = {
    model: model, // Use the specific model passed in
    messages: messages,
  };

  const response = await fetch(openRouterApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openRouterApiKey}`,
      // OpenRouter specific headers
      'HTTP-Referer': openRouterReferer,
      'X-Title': openRouterAppName, // Optional but recommended
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API request failed for model ${model} with status ${response.status}: ${errorBody}`);
  }

  const data = await response.json();

   // Extract the response message (OpenAI-compatible structure)
   if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
    throw new Error('Invalid response structure from OpenRouter API');
  }

  return {
    role: 'assistant',
    content: data.choices[0].message.content.trim(),
  };
} 