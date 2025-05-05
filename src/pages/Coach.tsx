import React, { useState } from 'react';
import type { ChatMessage } from '@/lib/llm/llmClient';
import { coachPrompts } from '@/lib/prompts/coachPrompts';
import Chat from '@/components/features/Coach/Chat';

// Keys for localStorage (Import or define them here if not using a shared config/state manager)
const LLM_PROVIDER_PREF_KEY = 'llmProviderPref';
const LLM_MODEL_PREF_KEY = 'llmModelPref';

const Coach: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const systemMessage: ChatMessage = {
    role: 'system',
    content: coachPrompts.systemPromptV1,
  };

  const handleSend = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const newUserMessage: ChatMessage = { role: 'user', content: trimmedInput };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      // 1. Get provider and model preferences from localStorage
      const provider = localStorage.getItem(LLM_PROVIDER_PREF_KEY) || 'local'; // Use fallback if needed
      const model = localStorage.getItem(LLM_MODEL_PREF_KEY) || ''; // Get model, fallback to empty string if none saved

      const messagesToSend = [
        systemMessage,
        ...updatedMessages.slice(-10), // Keep only last 10 messages + system prompt
      ];

      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // 2. Include provider and model in the request body
        body: JSON.stringify({
            messages: messagesToSend,
            provider: provider,
            model: model // Send the model, even if it's an empty string for providers that don't need it
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const llmResponse: ChatMessage = await response.json();

      setMessages((prevMessages) => [
        ...prevMessages,
        llmResponse,
      ]);

    } catch (error) {
      console.error('Error fetching LLM response via API:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  return (
    <div 
      className="flex flex-col max-w-screen-md mx-auto pt-4 overflow-hidden"
      style={{ height: 'calc(100vh - 3rem)' }}
    >
      <Chat
        messages={messages}
        input={input}
        isLoading={isLoading}
        onInputChange={handleInputChange}
        onSendMessage={handleSend}
        className="flex-grow min-h-0"
      />
    </div>
  );
};

export default Coach; 