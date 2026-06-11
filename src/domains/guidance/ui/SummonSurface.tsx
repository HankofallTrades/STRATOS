import { useState } from "react";

import { Sheet, SheetContent } from "@/components/core/sheet";
import { Button } from "@/components/core/button";
import { Input } from "@/components/core/input";
import { usePresenceAgent } from "@/domains/guidance/hooks/usePresenceAgent";
import { cn } from "@/lib/utils/cn";
import ArtifactRenderer from "@/domains/guidance/ui/ArtifactRenderer";
import ChangeLogPanel from "@/domains/guidance/ui/ChangeLogPanel";

export interface SummonSurfaceQuickActions {
  onStartWorkout: () => void;
  onLogSingleExercise: () => void;
  onLogProtein: () => void;
  onLogSunExposure: () => void;
}

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
        className="flex h-[80svh] flex-col gap-0 rounded-t-2xl border-border bg-card p-0"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted" />

        <div className="flex flex-wrap gap-2 px-4 pb-1 pt-3">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => {
                dismiss();
                chip.onClick();
              }}
              className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-foreground hover:bg-accent"
            >
              {chip.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowChanges((open) => !open)}
            className={cn(
              "rounded-full border border-border px-3 py-1 text-xs hover:bg-accent",
              showChanges
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-foreground"
            )}
          >
            Changes
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {showChanges ? (
            <ChangeLogPanel />
          ) : conversation.length === 0 ? (
            <p className="px-1 pt-4 text-sm text-muted-foreground">
              Ask about your training, or request an adapted session.
            </p>
          ) : (
            conversation.map((message) => {
              if (message.kind === "user") {
                return (
                  <div key={message.id} className="flex justify-end motion-safe:animate-fade-rise">
                    <div className="max-w-[80%] rounded-2xl bg-accent px-3 py-2 text-sm text-accent-foreground">
                      {message.content}
                    </div>
                  </div>
                );
              }
              if (message.kind === "assistant" || message.kind === "error") {
                return (
                  <div key={message.id} className="flex justify-start motion-safe:animate-fade-rise">
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                        message.kind === "error"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-foreground"
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                );
              }
              if (
                message.kind === "tool_result" &&
                message.output.artifact
              ) {
                return (
                  <div key={message.id} className="flex justify-start motion-safe:animate-fade-rise">
                    <div className="w-[90%]">
                      <ArtifactRenderer artifact={message.output.artifact} />
                    </div>
                  </div>
                );
              }
              return null;
            })
          )}
          {statusMessage ? (
            <p className="px-1 text-xs text-muted-foreground">{statusMessage}</p>
          ) : null}
        </div>

        {configurationMessage ? (
          <p className="px-4 pb-2 text-xs text-destructive">
            {configurationMessage}
          </p>
        ) : null}

        <form
          className="flex items-center gap-2 border-t border-border p-3"
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
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            Send
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default SummonSurface;
