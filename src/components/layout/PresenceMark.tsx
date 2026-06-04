import { usePresenceAgent } from "@/domains/guidance/hooks/usePresenceAgent";
import { cn } from "@/lib/utils/cn";

interface PresenceMarkVisualProps {
  size?: number;
  className?: string;
}

/**
 * The matte stone mark itself (ring + pthalo core). Calm at rest; the ring/core
 * light and the body breathes when the agent has a message or action waiting.
 * Presentational only, so it can sit inside either a standalone button (mobile
 * nav) or a labelled row button (desktop sidebar).
 */
export const PresenceMarkVisual = ({ size = 44, className }: PresenceMarkVisualProps) => {
  const { hasAttention } = usePresenceAgent();
  const ringSize = Math.round(size * 0.5);
  const coreSize = Math.max(5, Math.round(size * 0.16));

  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full",
        "transition-[background-color,box-shadow] duration-200 ease-out",
        hasAttention
          ? "bg-[#1a221f] shadow-[0_3px_10px_rgba(0,0,0,0.45)] ring-1 ring-[#2f3a36]"
          : "bg-transparent shadow-none ring-1 ring-[#2f3a36] group-hover:ring-[#46514d]",
        className
      )}
    >
      {hasAttention ? (
        <>
          <span className="pointer-events-none absolute inset-0 rounded-full border border-[#3f8a78]/70 animate-presence-ping" />
          <span
            style={{ animationDelay: "1.6s" }}
            className="pointer-events-none absolute inset-0 rounded-full border border-[#3f8a78]/70 animate-presence-ping"
          />
        </>
      ) : null}

      <span
        style={{ width: ringSize, height: ringSize, borderWidth: 1.5 }}
        className={cn(
          "flex items-center justify-center rounded-full border transition-colors duration-300",
          hasAttention ? "border-[#7ea99c]" : "border-[#3f4945]"
        )}
      >
        <span
          style={{ width: coreSize, height: coreSize }}
          className={cn(
            "rounded-full transition-colors duration-300",
            hasAttention
              ? "bg-[#dff5ed] shadow-[0_0_8px_2px_rgba(120,200,180,0.7)]"
              : "bg-[#586059]"
          )}
        />
      </span>
    </span>
  );
};

interface PresenceMarkProps {
  size?: number;
  className?: string;
}

/**
 * Standalone circular presence button for the mobile bottom nav.
 */
const PresenceMark = ({ size = 46, className }: PresenceMarkProps) => {
  const { toggle, isOpen, hasAttention } = usePresenceAgent();

  return (
    <button
      type="button"
      aria-label={hasAttention ? "Open coach, new update" : "Open coach"}
      aria-expanded={isOpen}
      onClick={toggle}
      className={cn(
        "group rounded-full transition-transform duration-200 ease-out active:translate-y-px",
        className
      )}
    >
      <PresenceMarkVisual size={size} />
    </button>
  );
};

export default PresenceMark;
