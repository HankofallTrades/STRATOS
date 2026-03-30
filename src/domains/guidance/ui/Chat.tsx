import React, { useEffect, useMemo, useRef } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  Dumbbell,
  LoaderCircle,
  Send,
  Sparkles,
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

const welcomeItems = [
  {
    body: "Generate a session from your current block and recent movement volume.",
    icon: Dumbbell,
    title: "Programming",
  },
  {
    body: "Pressure-test recovery, pain points, or exercise substitutions before the next lift.",
    icon: BrainCircuit,
    title: "Decision support",
  },
  {
    body: "Use prompt starters or ask in plain language. Coach will pull tools when needed.",
    icon: Sparkles,
    title: "Low-friction",
  },
];

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

  const inputPlaceholder = configurationMessage
    ? "Save a provider key in Settings to start coaching."
    : "Ask Coach about programming, recovery, or your next session...";

  return (
    <div
      className={cn(
        "stone-surface flex h-full min-h-0 flex-col overflow-hidden rounded-[30px]",
        className
      )}
    >
      <div className="border-b border-white/8 px-5 py-4 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <div className="app-kicker">Coach Console</div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Conversation
            </h2>
          </div>

          <div
            className={cn(
              "inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs font-medium",
              consoleStatusClassName
            )}
          >
            {isLoading ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : configurationMessage ? (
              <AlertCircle className="h-3.5 w-3.5" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            <span>{consoleStatus}</span>
          </div>
        </div>
      </div>

      <div
        ref={messageContainerRef}
        aria-live="polite"
        role="log"
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6"
      >
        {renderItems.length === 0 ? (
          <section className="mb-6 border-b border-white/6 pb-6">
            <div className="max-w-2xl space-y-3">
              <div className="app-kicker">Start Here</div>
              <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                Use Coach like a planning console.
              </h3>
              <p className="text-sm leading-6 text-muted-foreground md:text-base">
                Ask for a session, a training adjustment, or help interpreting
                recovery and recent lifts. Coach can use your current STRATOS
                context when it needs more signal.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {welcomeItems.map(({ body, icon: Icon, title }) => (
                <div key={title} className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 verdigris-text" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {title}
                    </p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

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
        {configurationMessage ? (
          <div className="mb-4 rounded-[20px] border border-[rgba(200,160,108,0.22)] bg-[rgba(123,94,66,0.14)] px-4 py-3 text-sm text-[#f1dec0]">
            <p className="leading-6">{configurationMessage}</p>
            <Link
              to="/settings"
              className="mt-2 inline-flex items-center gap-1.5 font-medium text-[#f6e4c6] transition hover:text-white"
            >
              <span>Open Coach Settings</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : null}

        {showPrimers && primerButtons.length > 0 ? (
          <div className="mb-4">
            <div className="mb-2 app-kicker">Prompt Starters</div>
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
            className="app-primary-action h-12 w-12 rounded-[18px]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
