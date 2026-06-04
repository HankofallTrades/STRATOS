import { MessageCircle } from "lucide-react";

import { usePresenceAgent } from "@/domains/guidance/hooks/usePresenceAgent";
import { cn } from "@/lib/utils/cn";

const PresenceMark = () => {
  const { toggle, isOpen } = usePresenceAgent();

  return (
    <button
      type="button"
      aria-label="Open coach"
      aria-expanded={isOpen}
      onClick={toggle}
      style={{
        backgroundImage:
          "radial-gradient(circle at 32% 26%, #2f8f7e 0%, #1d6259 44%, #123f39 100%)",
      }}
      className={cn(
        "group fixed bottom-20 right-6 z-[45] flex h-14 w-14 items-center justify-center rounded-full md:bottom-6",
        "text-white ring-1 ring-white/15 transition-all duration-200 ease-out",
        "shadow-[0_6px_20px_-2px_rgba(21,79,71,0.6)]",
        "hover:-translate-y-0.5 hover:ring-white/30 hover:shadow-[0_12px_30px_-2px_rgba(21,79,71,0.9)]",
        "active:translate-y-0 active:scale-95"
      )}
    >
      {/* soft top sheen for gem-like depth */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent opacity-70"
      />
      <MessageCircle
        size={22}
        strokeWidth={2.25}
        aria-hidden="true"
        className="relative drop-shadow-sm transition-transform duration-200 group-hover:scale-110"
      />
    </button>
  );
};

export default PresenceMark;
