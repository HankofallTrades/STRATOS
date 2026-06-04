import { Sparkles } from "lucide-react";

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
      className={cn(
        "fixed bottom-20 right-6 z-[45] flex h-14 w-14 items-center justify-center rounded-full",
        "bg-primary text-primary-foreground shadow-lg transition-transform",
        "hover:bg-primary/90 active:scale-95 md:bottom-6"
      )}
    >
      <Sparkles size={22} aria-hidden="true" />
    </button>
  );
};

export default PresenceMark;
