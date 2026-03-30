import React from "react";

import { cn } from "@/lib/utils/cn";

export interface PrimerButton {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface ChatPrimersProps {
  buttons: PrimerButton[];
  className?: string;
}

const ChatPrimers: React.FC<ChatPrimersProps> = ({ buttons, className = "" }) => {
  return (
    <div
      className={cn(
        "scrollbar-hidden flex w-full flex-row gap-2 overflow-x-auto px-1 py-1",
        className
      )}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {buttons.map((btn, idx) => (
        <button
          key={btn.label + idx}
          type="button"
          onClick={btn.onClick}
          disabled={btn.disabled}
          className="stone-chip flex min-h-[44px] flex-shrink-0 items-center rounded-full border-white/10 px-4 py-2 text-sm font-medium text-foreground/76 transition hover:border-[rgba(var(--stone-accent-rgb),0.18)] hover:bg-[rgba(var(--stone-accent-rgb),0.08)] hover:text-foreground active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
          style={{ touchAction: "manipulation" }}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
};

export default ChatPrimers;
