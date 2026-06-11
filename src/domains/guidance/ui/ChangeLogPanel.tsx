import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/core/button";
import { useCoachChangeLog } from "@/domains/guidance/hooks/useCoachChangeLog";
import { cn } from "@/lib/utils/cn";

const ChangeLogPanel = () => {
  const { changes, isLoading, canRevert, revert, isReverting } =
    useCoachChangeLog();

  if (isLoading) {
    return (
      <p className="px-1 pt-4 text-sm text-muted-foreground">Loading changes…</p>
    );
  }

  if (changes.length === 0) {
    return (
      <p className="px-1 pt-4 text-sm text-muted-foreground">
        No coach changes yet. When the coach changes your program or workout, it
        shows up here and can be reverted.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {changes.map((entry) => (
        <li
          key={entry.id}
          className="rounded-xl border border-border bg-background p-3"
        >
          <p
            className={cn(
              "text-sm text-foreground",
              entry.reverted_at && "line-through opacity-60"
            )}
          >
            {entry.summary}
          </p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(entry.created_at), {
                addSuffix: true,
              })}
            </p>
            {entry.reverted_at ? (
              <span className="text-xs text-muted-foreground">Reverted</span>
            ) : canRevert(entry) ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isReverting}
                onClick={() => revert(entry)}
              >
                Revert
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                No longer revertible
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};

export default ChangeLogPanel;
