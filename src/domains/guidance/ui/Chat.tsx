import React, { useEffect, useMemo, useRef } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Key,
  LoaderCircle,
  Send,
  Wrench,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";

import { Button } from "@/components/core/button";
import { Input } from "@/components/core/input";
import type { CoachConversationMessage } from "@/domains/guidance/agent/contracts";
import { getCoachToolLabel } from "@/domains/guidance/agent/tools";
import { cn } from "@/lib/utils/cn";
import type { ChatMessage } from "@/lib/llm/llmClient";

import ChatPrimers from "./ChatPrimers";
import type { PrimerButton } from "./ChatPrimers";

interface ChatProps {
  className?: string;
  configurationMessage?: string | null;
  conversation?: CoachConversationMessage[];
  input: string;
  isLoading: boolean;
  messages: ChatMessage[];
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInputFocus?: () => void;
  onSendMessage: (textOrEvent?: string | React.FormEvent<HTMLFormElement>) => void;
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

const bubbleClassName =
  "max-w-[85%] rounded-[22px] px-4 py-3 text-sm shadow-[0_16px_36px_rgba(0,0,0,0.16)] md:max-w-[72%]";

const Chat: React.FC<ChatProps> = ({
  conversation = [],
  configurationMessage,
  input,
  isLoading,
  messages,
  onInputChange,
  onInputFocus,
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

  const consoleStatus = isLoading
    ? statusMessage || "Coach is working..."
    : configurationMessage
      ? "Setup required"
      : "Ready";

  const consoleStatusClassName = isLoading
    ? "border-[rgba(var(--stone-accent-rgb),0.2)] bg-[rgba(var(--stone-accent-rgb),0.12)] text-foreground"
    : configurationMessage
      ? "border-[rgba(200,160,108,0.22)] bg-[rgba(123,94,66,0.14)] text-[#f1dec0]"
      : "border-[rgba(var(--stone-accent-rgb),0.2)] bg-[rgba(var(--stone-accent-rgb),0.12)] text-[#dff3ec]";
  const coachSettingsHref = "/settings#coach-settings";

  const inputPlaceholder = configurationMessage
    ? "Save a provider key in Settings to start coaching."
    : "Ask for a workout, adjustment, or recovery check.";

  return (
    <div
      className={cn(
        "stone-surface flex h-full min-h-0 flex-col overflow-hidden rounded-[30px]",
        className
      )}
    >
      <div className="border-b border-white/8 px-5 py-4 md:px-6">
        <div className="flex justify-end">
          {isLoading ? (
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
                consoleStatusClassName
              )}
            >
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              <span>{consoleStatus}</span>
            </div>
          ) : configurationMessage ? (
            <Link
              to={coachSettingsHref}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:text-white",
                consoleStatusClassName
              )}
            >
              <Key className="h-3.5 w-3.5" />
              <span>Add API key</span>
            </Link>
          ) : null}
        </div>
      </div>

      <div
        ref={messageContainerRef}
        aria-live="polite"
        role="log"
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6"
      >
        <div className="space-y-4">
          {renderItems.map(message => {
            if (message.kind === "user") {
              return (
                <div key={message.id} className="flex justify-end">
                  <div
                    className={cn(
                      bubbleClassName,
                      "border border-[rgba(var(--stone-accent-rgb),0.2)] bg-[rgba(var(--stone-accent-rgb),0.18)] text-foreground"
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              );
            }

            if (message.kind === "assistant") {
              return (
                <div key={message.id} className="flex justify-start">
                  <div
                    className={cn(
                      bubbleClassName,
                      "stone-chip prose prose-sm border-white/10 text-foreground prose-headings:my-1 prose-headings:text-foreground prose-p:my-0 prose-p:text-foreground prose-strong:text-foreground prose-ul:my-2 prose-li:my-0 prose-a:text-[var(--stone-accent-text)] prose-a:no-underline"
                    )}
                  >
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
                  <div
                    className={cn(
                      bubbleClassName,
                      "border border-red-500/20 bg-red-500/10 text-red-100"
                    )}
                  >
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
                  <div
                    className={cn(
                      bubbleClassName,
                      "stone-chip border-white/10 text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {hasResult ? (
                        <CheckCircle2 className="h-4 w-4 verdigris-text" />
                      ) : (
                        <LoaderCircle className="h-4 w-4 animate-spin verdigris-text" />
                      )}
                      <span>{getCoachToolLabel(message.toolName)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
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
                  className={cn(
                    bubbleClassName,
                    message.isError
                      ? "border border-red-500/20 bg-red-500/10 text-red-100"
                      : "border border-[rgba(var(--stone-accent-rgb),0.18)] bg-[rgba(var(--stone-accent-rgb),0.1)] text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {message.isError ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <Wrench className="h-4 w-4 verdigris-text" />
                    )}
                    <span>{getCoachToolLabel(message.toolName)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6">{message.output.message}</p>
                  {preview?.mesocycleName ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Week {preview.currentWeek ?? "?"} of {preview.mesocycleName}
                      {preview.sessionName ? ` · ${preview.sessionName}` : ""}
                    </p>
                  ) : null}
                  {preview?.targetedArchetypes.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {preview.targetedArchetypes.map(archetype => (
                        <span
                          key={archetype}
                          className="rounded-full border border-[rgba(var(--stone-accent-rgb),0.16)] bg-[rgba(var(--stone-accent-rgb),0.12)] px-2.5 py-1 text-[11px] font-medium text-[#dff3ec]"
                        >
                          {archetype}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {preview?.selectedExercises.length ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Exercises: {preview.selectedExercises.join(", ")}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}

          {isLoading ? (
            <div className="flex justify-start">
              <div
                className={cn(
                  bubbleClassName,
                  "stone-chip flex items-center gap-2 border-white/10 text-foreground"
                )}
              >
                <LoaderCircle className="h-4 w-4 animate-spin verdigris-text" />
                <span>{statusMessage || "Coach is thinking..."}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-white/8 px-4 py-4 md:px-6 md:py-5">
        {showPrimers && primerButtons.length > 0 ? (
          <div className="mb-4">
            <ChatPrimers buttons={primerButtons} />
          </div>
        ) : null}

        <form onSubmit={onSendMessage} className="flex items-center gap-3">
          <Input
            type="text"
            value={input}
            onChange={onInputChange}
            onFocus={onInputFocus}
            placeholder={inputPlaceholder}
            aria-label="Message Coach"
            className="app-form-input stone-inset h-12 rounded-[18px] border-0 px-4 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={isLoading}
          />
          <Button
            type="submit"
            aria-label="Send message"
            disabled={isLoading || !input.trim()}
            size="icon"
            className="h-12 w-12 rounded-full border-0 bg-transparent p-0 text-[var(--stone-accent)] shadow-none transition hover:bg-[rgba(var(--stone-accent-rgb),0.08)] hover:text-[var(--stone-accent-text)] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:bg-transparent disabled:text-[rgba(214,223,218,0.28)]"
          >
            <Send className="h-4.5 w-4.5" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
