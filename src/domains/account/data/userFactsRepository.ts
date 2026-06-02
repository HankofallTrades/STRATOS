import { supabase } from '@/lib/integrations/supabase/client';
import type { Database } from '@/lib/integrations/supabase/types';

export type UserFactRow = Database['public']['Tables']['user_facts']['Row'];
export type UserFactCategory =
  | 'goal'
  | 'constraint'
  | 'schedule'
  | 'preference'
  | 'equipment';

export interface CreateUserFactInput {
  category: UserFactCategory;
  content: string;
}

/** Active facts for a user, oldest first. RLS restricts rows to the caller. */
export const listActiveUserFacts = async (userId: string): Promise<UserFactRow[]> => {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('user_facts')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to load profile facts: ${error.message}`);
  return (data ?? []) as UserFactRow[];
};

export const createUserFact = async (
  userId: string,
  input: CreateUserFactInput
): Promise<UserFactRow> => {
  if (!userId) throw new Error('createUserFact requires userId');

  const { data, error } = await supabase
    .from('user_facts')
    .insert({
      user_id: userId,
      category: input.category,
      content: input.content.trim(),
      source: 'user',
      status: 'active',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add fact: ${error.message}`);
  return data as UserFactRow;
};

export const updateUserFactContent = async (
  factId: string,
  content: string
): Promise<UserFactRow> => {
  if (!factId) throw new Error('updateUserFactContent requires factId');

  const { data, error } = await supabase
    .from('user_facts')
    .update({ content: content.trim(), updated_at: new Date().toISOString() })
    .eq('id', factId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update fact: ${error.message}`);
  return data as UserFactRow;
};

export const deleteUserFact = async (factId: string): Promise<void> => {
  if (!factId) throw new Error('deleteUserFact requires factId');

  const { error } = await supabase.from('user_facts').delete().eq('id', factId);
  if (error) throw new Error(`Failed to remove fact: ${error.message}`);
};
