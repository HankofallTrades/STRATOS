import React from 'react';

interface PrimerButton {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface ChatPrimersProps {
  buttons: PrimerButton[];
  className?: string;
}

const ChatPrimers: React.FC<ChatPrimersProps> = ({ buttons, className = '' }) => {
  return (
    <div
      className={`flex flex-row gap-2 overflow-x-auto pb-2 pt-1 px-1 w-full scrollbar-hide ${className}`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {buttons.map((btn, idx) => (
        <button
          key={btn.label + idx}
          onClick={btn.onClick}
          disabled={btn.disabled}
          className="flex-shrink-0 rounded-lg bg-slate-300 text-slate-800 hover:bg-slate-400 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 px-4 py-2 text-sm font-medium shadow transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px]"
          style={{ touchAction: 'manipulation' }}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
};

export default ChatPrimers; 