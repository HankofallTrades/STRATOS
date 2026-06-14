import { memo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils/cn";

interface CoachMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Renders Coach assistant text as Markdown, styled to sit inside the compact
 * chat bubble (no `prose` plugin — its vertical rhythm is too heavy here).
 * react-markdown ignores raw HTML by default, so there is no injection surface.
 */
function CoachMarkdown({ content, className }: CoachMarkdownProps) {
  return (
    <div
      className={cn(
        "space-y-2 text-sm leading-relaxed [&>:first-child]:mt-0 [&>:last-child]:mb-0",
        className
      )}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="my-1 list-disc space-y-0.5 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-1 list-decimal space-y-0.5 pl-5">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-emerald-300 underline underline-offset-2 hover:text-emerald-200"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-white/[0.07] px-1 py-0.5 font-mono text-[0.85em] text-foreground">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-1.5 overflow-x-auto rounded-lg bg-black/30 p-2.5 font-mono text-[0.8rem] leading-snug [&_code]:bg-transparent [&_code]:p-0">
              {children}
            </pre>
          ),
          h1: ({ children }) => (
            <h1 className="mb-1 mt-2 text-[0.95rem] font-semibold text-foreground">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-1 mt-2 text-[0.9rem] font-semibold text-foreground">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-0.5 mt-1.5 text-sm font-semibold text-foreground">
              {children}
            </h3>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-white/15 pl-3 text-foreground/80">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-2 border-white/10" />,
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}

export default memo(CoachMarkdown);
