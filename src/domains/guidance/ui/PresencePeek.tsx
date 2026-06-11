import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { usePresenceAgent } from "@/domains/guidance/hooks/usePresenceAgent";

const AUTO_HIDE_MS = 12000;

const PresencePeek = () => {
  const { proactiveInsights, engageInsight, dismissInsight, isOpen, isLoading } =
    usePresenceAgent();
  const peek = proactiveInsights.find((insight) => insight.tier === "peek");
  const peekKey = peek ? `${peek.id}:${peek.dedupeKey ?? ""}` : null;
  const [autoHidden, setAutoHidden] = useState(false);

  useEffect(() => {
    setAutoHidden(false);
    if (!peekKey) return undefined;
    const timer = window.setTimeout(() => setAutoHidden(true), AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [peekKey]);

  if (!peek || isOpen || isLoading || autoHidden) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 pb-[env(safe-area-inset-bottom)] md:bottom-6">
      <div className="pointer-events-auto flex max-w-sm items-center gap-1 rounded-full border border-[#2f3a36] bg-[#161d1a]/96 py-1.5 pl-3.5 pr-1.5 shadow-[0_14px_36px_rgba(0,0,0,0.45)] motion-safe:animate-fade-rise">
        <button
          type="button"
          onClick={() => engageInsight(peek)}
          className="flex items-center gap-2 text-left text-[13px] leading-snug text-foreground/92"
        >
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#7ea99c] shadow-[0_0_8px_rgba(126,169,156,0.8)]"
          />
          {peek.line}
        </button>
        <button
          type="button"
          aria-label="Dismiss suggestion"
          onClick={() => dismissInsight(peek)}
          className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default PresencePeek;
