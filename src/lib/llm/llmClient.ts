export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

// --- Environment Variable Reading Moved to Caller (api/coach.ts) ---
// const localLlmUrl = import.meta.env.VITE_LOCAL_LLM_URL;
// const openaiApiUrl = import.meta.env.VITE_OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
// const openRouterApiUrl = 'https://openrouter.ai/api/v1/chat/completions';
// const openRouterReferer = import.meta.env.VITE_APP_URL || 'http://localhost:5173';
// const openRouterAppName = import.meta.env.VITE_APP_NAME || 'STRATOS';

// Specific provider functions are kept and modified to accept keys and configs.

// --- Local LLM ---
export async function getLocalLlmResponse(
  messages: ChatMessage[],
  localLlmUrl: string // Accept URL as argument
): Promise<ChatMessage> {
  if (!localLlmUrl) {
    throw new Error('Local LLM URL was not provided.');
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
export async function getOpenAiResponse(
  messages: ChatMessage[],
  apiKey: string,
  openaiApiUrl: string // Accept URL as argument
): Promise<ChatMessage> {
  if (!apiKey) {
    throw new Error('OpenAI API Key was not provided.');
  }
  if (!openaiApiUrl) {
    throw new Error('OpenAI API URL was not provided.');
  }

  const payload = {
    model: 'gpt-3.5-turbo', // Or your desired OpenAI model
    messages: messages,
  };

  const response = await fetch(openaiApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
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
export async function getOpenRouterResponse(
  messages: ChatMessage[],
  apiKey: string,
  model: string,
  openRouterApiUrl: string, // Accept URL as argument
  openRouterReferer: string, // Accept Referer as argument
  openRouterAppName: string // Accept App Name as argument
): Promise<ChatMessage> {
  if (!apiKey) {
    throw new Error('OpenRouter API Key was not provided.');
  }
  if (!openRouterApiUrl) {
    throw new Error('OpenRouter API URL was not provided.');
  }
  if (!openRouterReferer) {
    // Note: OpenRouter might work without these, but it's recommended
    console.warn('OpenRouter Referer (VITE_APP_URL) was not provided.');
  }
  if (!openRouterAppName) {
    console.warn('OpenRouter App Name (VITE_APP_NAME) was not provided.');
  }


  const payload = {
    model: model,
    messages: messages,
  };

  const response = await fetch(openRouterApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': openRouterReferer, // Use provided value
      'X-Title': openRouterAppName, // Use provided value
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