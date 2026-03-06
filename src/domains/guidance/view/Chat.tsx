import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';
import { Send } from 'lucide-react';
import type { ChatMessage } from '@/lib/llm/llmClient';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChatPrimers from './ChatPrimers';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchExercisesFromDB } from '@/lib/integrations/supabase/exercises';
import type { Exercise } from '@/lib/types/workout';
import { fetchMovementArchetypes } from '../model/guidanceRepository';
import { useWorkoutGenerator } from '../controller/useWorkoutGenerator';

interface ChatProps {
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: (textOrEvent?: string | React.FormEvent<HTMLFormElement>) => void;
  className?: string;
}

const Chat: React.FC<ChatProps> = ({
  messages,
  input,
  isLoading,
  onInputChange,
  onSendMessage,
  className = ''
}) => {
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch exercises and archetypes
  const { data: baseExercises, isLoading: isLoadingExercises } = useQuery<Exercise[], Error>({
    queryKey: ['exercises'],
    queryFn: async () => (await fetchExercisesFromDB()) as Exercise[],
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const { data: movementArchetypes, isLoading: isLoadingMovementArchetypes } = useQuery({
    queryKey: ['movementArchetypes'],
    queryFn: fetchMovementArchetypes,
    staleTime: Infinity,
    enabled: !!baseExercises,
  });

  const { generateWorkout } = useWorkoutGenerator(baseExercises, movementArchetypes);

  // Handler for the primer button
  const handleGenerateWorkout = () => {
    try {
      generateWorkout();
      navigate('/workout');
    } catch (error) {
      console.error("Chat: Workout generation failed:", error);
    }
  };

  // Only show primers if there are no user messages yet
  const hasUserMessages = messages.some(msg => msg.role === 'user');

  // Helper to simulate user prompt and send
  const simulatePrompt = (prompt: string) => {
    onInputChange({ target: { value: prompt } } as React.ChangeEvent<HTMLInputElement>);
    onSendMessage(prompt);
  };

  useEffect(() => {
    const container = messageContainerRef.current;
    if (!container) return;

    // Filter out system messages to align with rendered messages
    const actualMessages = messages.filter(msg => msg.role !== 'system');
    if (actualMessages.length === 0) {
      container.scrollTop = 0; // No messages, scroll to top
      return;
    }

    const lastMessage = actualMessages[actualMessages.length - 1];

    // Get rendered message elements (excluding the 'Thinking...' indicator)
    const messageElements = Array.from(container.children).filter(
      el => !el.querySelector('span.italic') // Filter out the 'Thinking...' div
    );

    if (lastMessage.role === 'user' && messageElements.length > 0) {
      // If the last message was from the user, scroll it to the top
      const lastMessageElement = messageElements[messageElements.length - 1] as HTMLElement;
      if (lastMessageElement) {
        // Scroll the container so the top of the element aligns with the top of the container
        container.scrollTop = lastMessageElement.offsetTop;
      } else {
        // Fallback: scroll to bottom if element not found somehow
        container.scrollTop = container.scrollHeight;
      }
    } else {
      // If last message is from assistant or initial load, scroll to bottom
      container.scrollTop = container.scrollHeight;
    }
    // Depend on messages and isLoading (as it affects the DOM structure)
  }, [messages, isLoading]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div
        ref={messageContainerRef}
        className="flex-grow overflow-y-auto mb-4 p-4 space-y-4 min-h-0"
      >
        {[...messages]
          .filter(msg => msg.role !== 'system')
          .map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg shadow ${message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 dark:text-white prose prose-sm dark:prose-invert prose-p:m-0 prose-headings:my-1 prose-ul:my-1 prose-li:my-0'
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
            <div className="px-4 py-2 rounded-lg shadow bg-gray-100 dark:bg-gray-700 dark:text-white prose prose-sm dark:prose-invert">
              <span className="italic">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        {!hasUserMessages && (
          <div className="mb-2">
            <ChatPrimers
              buttons={[{
                label: 'Generate Strength Workout',
                onClick: handleGenerateWorkout,
                disabled: isLoadingExercises || isLoadingMovementArchetypes || !baseExercises || !movementArchetypes,
              }, {
                label: 'How can I get max swol?',
                onClick: () => simulatePrompt('How can I get max swol?'),
              }, {
                label: 'What can I do for post-workout recovery?',
                onClick: () => simulatePrompt('What can I do for post-workout recovery?'),
              }]}
            />
          </div>
        )}
        <form onSubmit={onSendMessage} className="flex items-center space-x-2">
          <Input
            type="text"
            value={input}
            onChange={onInputChange}
            placeholder="Ask your coach anything..."
            className="flex-grow"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} size="icon" className="">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
