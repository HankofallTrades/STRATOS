import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';
import { Send } from 'lucide-react';
import { getLlmResponse, type ChatMessage } from '@/lib/llm/llmClient';
import { coachPrompts } from '@/lib/prompts/coachPrompts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const Coach: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const systemMessage: ChatMessage = {
    role: 'system',
    content: coachPrompts.systemPromptV1,
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      const messagesToSend = [systemMessage, ...updatedMessages];
      console.log("Sending to LLM:", messagesToSend);
      const llmResponse = await getLlmResponse(messagesToSend);

      setMessages((prevMessages) => [...prevMessages, llmResponse]);
    } catch (error) {
      console.error('Error fetching LLM response:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-screen-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">STRATOS Coach</h1>
      <div className="flex-grow overflow-y-auto mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg space-y-4">
        {messages.filter(msg => msg.role !== 'system').map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg shadow ${message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-700 dark:text-white prose prose-sm dark:prose-invert prose-p:m-0 prose-headings:my-1 prose-ul:my-1 prose-li:my-0'
                }`}
            >
              {message.role === 'assistant' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="px-4 py-2 rounded-lg shadow bg-white dark:bg-gray-700 dark:text-white prose prose-sm dark:prose-invert">
              <span className="italic">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="flex items-center space-x-2">
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your coach anything..."
          className="flex-grow"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default Coach; 