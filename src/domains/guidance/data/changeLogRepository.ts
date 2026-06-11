import { supabase } from "@/lib/integrations/supabase/client";

export type CoachChangeType =
  | "program_created"
  | "program_edited"
  | "workout_edited";

export interface CoachChangeLogEntry {
  id: string;
  user_id: string;
  change_type: CoachChangeType;
  summary: string;
  payload: Record<string, unknown>;
  created_at: string;
  reverted_at: string | null;
}

export const listCoachChanges = async (
  userId: string,
  limit = 30
): Promise<CoachChangeLogEntry[]> => {
  const { data, error } = await supabase
    .from("coach_change_log" as never)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as CoachChangeLogEntry[];
};

export const insertCoachChange = async (
  userId: string,
  changeType: CoachChangeType,
  summary: string,
  payload: Record<string, unknown>
): Promise<void> => {
  const { error } = await supabase.from("coach_change_log" as never).insert({
    user_id: userId,
    change_type: changeType,
    summary,
    payload,
  } as never);
  if (error) throw error;
};

export const markCoachChangeReverted = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("coach_change_log" as never)
    .update({ reverted_at: new Date().toISOString() } as never)
    .eq("id", id);
  if (error) throw error;
};
