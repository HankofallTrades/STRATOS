import { Sheet, SheetContent } from "@/components/core/sheet";
import { Button } from "@/components/core/button";
import { Input } from "@/components/core/input";
import { usePresenceAgent } from "@/domains/guidance/hooks/usePresenceAgent";
import { cn } from "@/lib/utils/cn";

const SummonSurface = () => {
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

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? undefined : dismiss())}>
      <SheetContent
        side="bottom"
        className="flex h-[80svh] flex-col gap-0 rounded-t-2xl border-border bg-card p-0"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted" />

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {conversation.length === 0 ? (
            <p className="px-1 pt-4 text-sm text-muted-foreground">
              Ask about your training, or request an adapted session.
            </p>
          ) : (
            conversation.map((message) => {
              if (message.kind === "user") {
                return (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl bg-accent px-3 py-2 text-sm text-accent-foreground">
                      {message.content}
                    </div>
                  </div>
                );
              }
              if (message.kind === "assistant" || message.kind === "error") {
                return (
                  <div key={message.id} className="flex justify-start">
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
