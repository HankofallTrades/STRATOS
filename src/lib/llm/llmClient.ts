export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

// Environment variables for NON-SECRET values
const localLlmUrl = import.meta.env.VITE_LOCAL_LLM_URL;
const openaiApiUrl = import.meta.env.VITE_OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const openRouterApiUrl = 'https://openrouter.ai/api/v1/chat/completions';
const openRouterReferer = import.meta.env.VITE_APP_URL || 'http://localhost:5173';
const openRouterAppName = import.meta.env.VITE_APP_NAME || 'STRATOS';

// The main getLlmResponse function is removed as the logic now lives in the API route.
// Specific provider functions are kept and modified to accept keys.

// --- Local LLM (Example: Ollama / LM Studio OpenAI Compatible) ---
export async function getLocalLlmResponse(messages: ChatMessage[]): Promise<ChatMessage> {
  if (!localLlmUrl) {
    throw new Error('VITE_LOCAL_LLM_URL is not defined in environment variables.');
  }

  const payload = {
    model: 'local-model',
    messages: messages,
    stream: false,
  };

  const response = await fetch(localLlmUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Local LLM API request failed with status ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
    throw new Error('Invalid response structure from local LLM API (Expected OpenAI format)');
  }

  return {
    role: 'assistant',
    content: data.choices[0].message.content.trim(),
  };
}

// --- OpenAI LLM ---
// Accepts apiKey as an argument now
export async function getOpenAiResponse(messages: ChatMessage[], apiKey: string): Promise<ChatMessage> {
  if (!apiKey) {
    throw new Error('OpenAI API Key was not provided.');
  }

  const payload = {
    model: 'gpt-3.5-turbo', // Or your desired OpenAI model
    messages: messages,
  };

  const response = await fetch(openaiApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`, // Use the provided apiKey
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API request failed with status ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
    throw new Error('Invalid response structure from OpenAI API');
  }

  return {
    role: 'assistant',
    content: data.choices[0].message.content.trim(),
  };
}

// --- OpenRouter LLM ---
// Accepts apiKey as an argument now
export async function getOpenRouterResponse(
  messages: ChatMessage[],
  apiKey: string,
  model: string
): Promise<ChatMessage> {
  if (!apiKey) {
    throw new Error('OpenRouter API Key was not provided.');
  }

  const payload = {
    model: model, // Use the specific model passed in
    messages: messages,
  };

  const response = await fetch(openRouterApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`, // Use the provided apiKey
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
  if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
    throw new Error('Invalid response structure from OpenRouter API');
  }

  return {
    role: 'assistant',
    content: data.choices[0].message.content.trim(),
  };
}