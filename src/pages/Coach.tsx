import React, { useState } from 'react';
import type { ChatMessage } from '@/lib/llm/llmClient';
import { coachPrompts } from '@/lib/prompts/coachPrompts';
import Chat from '@/components/features/Coach/Chat';

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
      const messagesToSend = [
        systemMessage,
        ...updatedMessages.slice(-10),
      ];

      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: messagesToSend }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const llmResponse: ChatMessage = await response.json();

      setMessages((prevMessages) => [
        ...prevMessages.slice(0, -1),
        newUserMessage,
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
      style={{ height: 'calc(100vh - 5rem)' }}
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