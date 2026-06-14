import { useState } from "react";

import { Sheet, SheetContent } from "@/components/core/sheet";
import { Button } from "@/components/core/button";
import { Input } from "@/components/core/input";
import UnicodeSpinner from "@/components/core/UnicodeSpinner";
import { usePresenceAgent } from "@/domains/guidance/hooks/usePresenceAgent";
import { cn } from "@/lib/utils/cn";
import ArtifactRenderer from "@/domains/guidance/ui/ArtifactRenderer";
import ChangeLogPanel from "@/domains/guidance/ui/ChangeLogPanel";
import CoachMarkdown from "@/domains/guidance/ui/CoachMarkdown";

export interface SummonSurfaceQuickActions {
  onStartWorkout: () => void;
  onLogSingleExercise: () => void;
  onLogProtein: () => void;
  onLogSunExposure: () => void;
}

const conversationStarters = [
  "Why has my bench stalled?",
  "35 minutes and my shoulder's cranky",
  "Plan my next training block",
];

const SummonSurface = ({
  quickActions,
}: {
  quickActions: SummonSurfaceQuickActions;
}) => {
  const {
    isOpen,
    dismiss,
    conversation,
    input,
    setInput,
    send,
    isLoading,
    statusMessage,
    configurationMessage,
  } = usePresenceAgent();

  const [showChanges, setShowChanges] = useState(false);

  const chips: Array<{ label: string; onClick: () => void }> = [
    { label: "Start workout", onClick: quickActions.onStartWorkout },
    { label: "Single exercise", onClick: quickActions.onLogSingleExercise },
    { label: "Protein", onClick: quickActions.onLogProtein },
    { label: "Sun", onClick: quickActions.onLogSunExposure },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? undefined : dismiss())}>
      <SheetContent
        side="bottom"
        className="flex h-[80svh] flex-col gap-0 rounded-t-[28px] border-t border-white/10 bg-[#0e1216] p-0 shadow-[0_-28px_72px_rgba(0,0,0,0.55)]"
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/15" />

        <div className="flex flex-wrap gap-2 px-4 pb-1 pt-3">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => {
                dismiss();
                chip.onClick();
              }}
              className="stone-chip rounded-full px-3.5 py-1.5 text-xs text-foreground/85 transition-colors hover:bg-white/[0.05] hover:text-foreground"
            >
              {chip.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowChanges((open) => !open)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs transition-colors",
              showChanges
                ? "border border-[rgba(21,79,71,0.5)] bg-[rgba(21,79,71,0.3)] text-[#dff3ec]"
                : "stone-chip text-foreground/85 hover:bg-white/[0.05] hover:text-foreground"
            )}
          >
            Changes
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {showChanges ? (
            <ChangeLogPanel />
          ) : conversation.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-5 pb-8">
              <p className="text-sm text-muted-foreground">
                Ask anything about your training.
              </p>
              <div className="flex w-full max-w-xs flex-col items-stretch gap-2">
                {conversationStarters.map((starter, index) => (
                  <button
                    key={starter}
                    type="button"
                    disabled={isLoading}
                    onClick={() => void send(starter)}
                    style={{ animationDelay: `${index * 60}ms` }}
                    className="stone-chip rounded-[16px] px-4 py-2.5 text-left text-sm text-foreground/85 transition-colors hover:bg-white/[0.05] hover:text-foreground motion-safe:animate-fade-rise"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            conversation.map((message) => {
              if (message.kind === "user") {
                return (
                  <div
                    key={message.id}
                    className="flex justify-end motion-safe:animate-fade-rise"
                  >
                    <div className="max-w-[80%] rounded-2xl rounded-br-md bg-[rgba(21,79,71,0.36)] px-3.5 py-2 text-sm text-[#eef7f4] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      {message.content}
                    </div>
                  </div>
                );
              }
              if (message.kind === "assistant" || message.kind === "error") {
                return (
                  <div
                    key={message.id}
                    className="flex justify-start motion-safe:animate-fade-rise"
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl rounded-bl-md px-3.5 py-2 text-sm",
                        message.kind === "error"
                          ? "bg-rose-500/10 text-rose-200"
                          : "bg-white/[0.045] text-foreground/92"
                      )}
                    >
                      {message.kind === "assistant" ? (
                        <CoachMarkdown content={message.content} />
                      ) : (
                        message.content
                      )}
                    </div>
                  </div>
                );
              }
              if (
                message.kind === "tool_result" &&
                message.output.artifact
              ) {
                return (
                  <div
                    key={message.id}
                    className="flex justify-start motion-safe:animate-fade-rise"
                  >
                    <div className="w-[90%]">
                      <ArtifactRenderer artifact={message.output.artifact} />
                    </div>
                  </div>
                );
              }
              return null;
            })
          )}
          {!showChanges && statusMessage ? (
            <p className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
              <UnicodeSpinner className="app-accent-text text-sm" />
              {statusMessage}
            </p>
          ) : null}
        </div>

        {configurationMessage ? (
          <p className="px-4 pb-2 text-xs text-rose-300/90">
            {configurationMessage}
          </p>
        ) : null}

        <form
          className="flex items-center gap-2 border-t border-white/[0.06] p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask your coach..."
            disabled={isLoading}
            className="app-form-input stone-inset h-11 rounded-[16px] border-0 px-4 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="app-primary-action h-11 rounded-[16px] px-5 text-sm font-semibold"
          >
            Send
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default SummonSurface;
