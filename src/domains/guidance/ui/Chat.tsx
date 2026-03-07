import React, { useEffect, useMemo, useRef } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, Send, Wrench } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/core/button";
import { Input } from "@/components/core/input";
import type { CoachConversationMessage } from "@/domains/guidance/agent/contracts";
import { getCoachToolLabel } from "@/domains/guidance/agent/tools";
import type { ChatMessage } from "@/lib/llm/llmClient";

import ChatPrimers from "./ChatPrimers";
import type { PrimerButton } from "./ChatPrimers";

interface ChatProps {
  className?: string;
  conversation?: CoachConversationMessage[];
  input: string;
  isLoading: boolean;
  messages: ChatMessage[];
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: (
    textOrEvent?: string | React.FormEvent<HTMLFormElement>
  ) => void;
  primerButtons?: PrimerButton[];
  showPrimers?: boolean;
  statusMessage?: string | null;
}

interface WorkoutToolPreview {
  currentWeek?: number;
  mesocycleName?: string;
  selectedExercises: string[];
  sessionName?: string;
  targetedArchetypes: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === "string");

const extractWorkoutToolPreview = (value: unknown): WorkoutToolPreview | null => {
  if (!isRecord(value)) {
    return null;
  }

  const mesocycle = isRecord(value.mesocycle) ? value.mesocycle : null;

  return {
    currentWeek:
      mesocycle && typeof mesocycle.currentWeek === "number"
        ? mesocycle.currentWeek
        : undefined,
    mesocycleName:
      mesocycle && typeof mesocycle.name === "string" ? mesocycle.name : undefined,
    selectedExercises: isStringArray(value.selectedExercises)
      ? value.selectedExercises
      : [],
    sessionName:
      mesocycle && typeof mesocycle.sessionName === "string"
        ? mesocycle.sessionName
        : undefined,
    targetedArchetypes: isStringArray(value.targetedArchetypes)
      ? value.targetedArchetypes
      : [],
  };
};

const Chat: React.FC<ChatProps> = ({
  conversation = [],
  input,
  isLoading,
  messages,
  onInputChange,
  onSendMessage,
  primerButtons = [],
  showPrimers = false,
  statusMessage,
  className = "",
}) => {
  const messageContainerRef = useRef<HTMLDivElement>(null);

  const renderItems = useMemo<CoachConversationMessage[]>(() => {
    if (conversation.length > 0) {
      return conversation;
    }

    return messages
      .filter(message => message.role !== "system")
      .map((message, index) => ({
        content: message.content,
        id: `legacy-${index}`,
        kind: message.role === "user" ? "user" : "assistant",
      }));
  }, [conversation, messages]);

  useEffect(() => {
    const container = messageContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [renderItems, isLoading, statusMessage]);

  return (
    <div className={`flex h-full flex-col ${className}`}>
      <div
        ref={messageContainerRef}
        className="mb-4 min-h-0 flex-grow space-y-4 overflow-y-auto p-4"
      >
        {renderItems.map(message => {
          if (message.kind === "user") {
            return (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-xs rounded-lg bg-blue-500 px-4 py-2 text-white shadow md:max-w-md lg:max-w-lg">
                  {message.content}
                </div>
              </div>
            );
          }

          if (message.kind === "assistant") {
            return (
              <div key={message.id} className="flex justify-start">
                <div className="prose prose-sm max-w-xs rounded-lg bg-gray-100 px-4 py-2 shadow prose-p:m-0 prose-headings:my-1 prose-ul:my-1 prose-li:my-0 dark:bg-gray-700 dark:text-white dark:prose-invert md:max-w-md lg:max-w-lg">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            );
          }

          if (message.kind === "error") {
            return (
              <div key={message.id} className="flex justify-start">
                <div className="max-w-xs rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 shadow dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100 md:max-w-md lg:max-w-lg">
                  {message.content}
                </div>
              </div>
            );
          }

          if (message.kind === "tool_call") {
            const hasResult = renderItems.some(
              item =>
                item.kind === "tool_result" &&
                item.toolCallId === message.toolCallId
            );

            return (
              <div key={message.id} className="flex justify-start">
                <div className="max-w-xs rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:max-w-md lg:max-w-lg">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {hasResult ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <LoaderCircle className="h-4 w-4 animate-spin text-sky-500" />
                    )}
                    <span>{getCoachToolLabel(message.toolName)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {hasResult ? "Tool completed" : "Tool requested by Coach"}
                  </p>
                </div>
              </div>
            );
          }

          const preview = extractWorkoutToolPreview(message.output.data);

          return (
            <div key={message.id} className="flex justify-start">
              <div
                className={`max-w-xs rounded-xl border px-4 py-3 shadow-sm md:max-w-md lg:max-w-lg ${
                  message.isError
                    ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100"
                    : "border-emerald-200 bg-emerald-50 text-slate-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-slate-100"
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {message.isError ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <Wrench className="h-4 w-4" />
                  )}
                  <span>{getCoachToolLabel(message.toolName)}</span>
                </div>
                <p className="mt-2 text-sm">{message.output.message}</p>
                {preview?.mesocycleName ? (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    Week {preview.currentWeek ?? "?"} of {preview.mesocycleName}
                    {preview.sessionName ? ` · ${preview.sessionName}` : ""}
                  </p>
                ) : null}
                {preview?.targetedArchetypes.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {preview.targetedArchetypes.map(archetype => (
                      <span
                        key={archetype}
                        className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-white/10 dark:text-slate-200"
                      >
                        {archetype}
                      </span>
                    ))}
                  </div>
                ) : null}
                {preview?.selectedExercises.length ? (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    Exercises: {preview.selectedExercises.join(", ")}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm text-slate-700 shadow dark:bg-gray-700 dark:text-white">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              <span>{statusMessage || "Coach is thinking..."}</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        {showPrimers && primerButtons.length > 0 && (
          <div className="mb-2">
            <ChatPrimers buttons={primerButtons} />
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
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
