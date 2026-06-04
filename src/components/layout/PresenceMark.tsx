import { usePresenceAgent } from "@/domains/guidance/hooks/usePresenceAgent";
import { cn } from "@/lib/utils/cn";

const PresenceMark = () => {
  const { toggle, isOpen, hasAttention } = usePresenceAgent();

  return (
    <button
      type="button"
      aria-label={hasAttention ? "Open coach — new update" : "Open coach"}
      aria-expanded={isOpen}
      onClick={toggle}
      style={{
        backgroundImage:
          "radial-gradient(circle at 32% 26%, #2f8f7e 0%, #1d6259 44%, #123f39 100%)",
      }}
      className={cn(
        "group fixed bottom-20 right-6 z-[45] flex h-14 w-14 items-center justify-center rounded-full md:bottom-6",
        "ring-1 ring-white/15 transition-all duration-200 ease-out",
        "shadow-[0_6px_20px_-2px_rgba(21,79,71,0.6)]",
        "hover:-translate-y-0.5 hover:ring-white/30 hover:shadow-[0_12px_30px_-2px_rgba(21,79,71,0.9)]",
        "active:translate-y-0 active:scale-95"
      )}
    >
      {/* gem sheen */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent opacity-70"
      />

      {/* breathing aura — only when the agent has a message or an action for you */}
      {hasAttention ? (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full border border-[#7ea99c]/60 animate-presence-ping"
          />
          <span
            aria-hidden="true"
            style={{ animationDelay: "1.6s" }}
            className="pointer-events-none absolute inset-0 rounded-full border border-[#7ea99c]/60 animate-presence-ping"
          />
        </>
      ) : null}

      {/* core: dim grey at rest, bright + glowing when there's attention */}
      <span
        aria-hidden="true"
        className={cn(
          "relative h-2.5 w-2.5 rounded-full transition-colors duration-300",
          hasAttention
            ? "bg-[#dff5ed] shadow-[0_0_10px_2px_rgba(205,238,226,0.85)]"
            : "bg-[#5f6764]"
        )}
      />
    </button>
  );
};

export default PresenceMark;
