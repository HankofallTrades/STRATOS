import { Suspense, lazy, useState } from "react";
import { X } from "lucide-react";

import { Sheet, SheetContent } from "@/components/core/sheet";
import { Button } from "@/components/core/button";
import { Input } from "@/components/core/input";
import UnicodeSpinner from "@/components/core/UnicodeSpinner";
import { usePresenceAgent } from "@/domains/guidance/hooks/usePresenceAgent";
import { cn } from "@/lib/utils/cn";

const ArtifactRenderer = lazy(
  () => import("@/domains/guidance/ui/ArtifactRenderer")
);
const ChangeLogPanel = lazy(
  () => import("@/domains/guidance/ui/ChangeLogPanel")
);
const CoachMarkdown = lazy(
  () => import("@/domains/guidance/ui/CoachMarkdown")
);
const DevToolsPanel = lazy(
  () => import("@/domains/guidance/ui/coach/DevToolsPanel")
);

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
    proactiveInsights,
    engageInsight,
    dismissInsight,
    devTriggerInsight,
    devResetCooldowns,
    devToolsEnabled,
  } = usePresenceAgent();

  const [showChanges, setShowChanges] = useState(false);
  const [showDev, setShowDev] = useState(false);
  const activeInsight = proactiveInsights[0] ?? null;

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
            onClick={() => {
              setShowDev(false);
              setShowChanges((open) => !open);
            }}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs transition-colors",
              showChanges
                ? "border border-[rgba(21,79,71,0.5)] bg-[rgba(21,79,71,0.3)] text-[#dff3ec]"
                : "stone-chip text-foreground/85 hover:bg-white/[0.05] hover:text-foreground"
            )}
          >
            Changes
          </button>
          {devToolsEnabled ? (
            <button
              type="button"
              onClick={() => {
                setShowChanges(false);
                setShowDev((open) => !open);
              }}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs transition-colors",
                showDev
                  ? "border border-amber-500/50 bg-amber-500/20 text-amber-200"
                  : "stone-chip text-foreground/85 hover:bg-white/[0.05] hover:text-foreground"
              )}
            >
              Dev
            </button>
          ) : null}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {showChanges ? (
            <Suspense fallback={<p className="px-1 pt-4 text-sm text-muted-foreground">Loading changes…</p>}>
              <ChangeLogPanel />
            </Suspense>
          ) : showDev ? (
            <Suspense fallback={<p className="px-1 pt-4 text-sm text-muted-foreground">Loading dev tools…</p>}>
              <DevToolsPanel
                devResetCooldowns={devResetCooldowns}
                devTriggerInsight={devTriggerInsight}
                onTriggered={() => setShowDev(false)}
              />
            </Suspense>
          ) : conversation.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-5 pb-8">
              <p className="text-sm text-muted-foreground">
                Ask anything about your training.
              </p>
              <div className="flex w-full max-w-xs flex-col items-stretch gap-2">
                {activeInsight ? (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => engageInsight(activeInsight)}
                    className="flex items-start gap-2.5 rounded-[16px] border border-[#2c6b60] bg-[#154f47] px-4 py-2.5 text-left text-sm text-[#eafff8] transition-colors hover:bg-[#1a5d53] motion-safe:animate-fade-rise"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7ea99c] shadow-[0_0_8px_rgba(126,169,156,0.8)]"
                    />
                    {activeInsight.line}
                  </button>
                ) : null}
                {conversationStarters
                  .slice(0, activeInsight ? 2 : 3)
                  .map((starter, index) => (
                    <button
                      key={starter}
                      type="button"
                      disabled={isLoading}
                      onClick={() => void send(starter)}
                      style={{
                        animationDelay: `${(index + (activeInsight ? 1 : 0)) * 60}ms`,
                      }}
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
                        <Suspense fallback={<p className="text-sm text-foreground/92">{message.content}</p>}>
                          <CoachMarkdown content={message.content} />
                        </Suspense>
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
                      <Suspense fallback={<div className="stone-chip rounded-[20px] p-4 text-sm text-muted-foreground">Loading artifact…</div>}>
                        <ArtifactRenderer artifact={message.output.artifact} />
                      </Suspense>
                    </div>
                  </div>
                );
              }
              return null;
            })
          )}
          {!showChanges && !showDev && statusMessage ? (
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

        {activeInsight && conversation.length > 0 ? (
          <div className="mx-3 mb-1 flex items-center gap-2 rounded-[14px] border border-[#2c6b60] bg-[#154f47] px-3 py-2 text-xs text-[#eafff8] motion-safe:animate-fade-rise">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#7ea99c] shadow-[0_0_8px_rgba(126,169,156,0.8)]"
            />
            <button
              type="button"
              disabled={isLoading}
              onClick={() => engageInsight(activeInsight)}
              className="flex-1 text-left leading-snug"
            >
              {activeInsight.line}
            </button>
            <button
              type="button"
              aria-label="Dismiss suggestion"
              onClick={() => dismissInsight(activeInsight)}
              className="rounded-full p-1 text-[#dff3ec]/70 transition-colors hover:bg-white/10 hover:text-[#dff3ec]"
            >
              <X size={13} />
            </button>
          </div>
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
