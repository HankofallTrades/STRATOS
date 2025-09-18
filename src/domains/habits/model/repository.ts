import { supabase } from '../../../lib/integrations/supabase/client'
import type { HabitFrequency, HabitRow } from './types'

const DEFAULT_TRIAD = [
  { title: 'Meditation', frequency: 'daily' as HabitFrequency },
  { title: 'Movement', frequency: 'daily' as HabitFrequency },
  { title: 'Writing', frequency: 'daily' as HabitFrequency },
]

export const ensureTriadHabits = async (userId: string): Promise<HabitRow[]> => {
  if (!userId) throw new Error('ensureTriadHabits requires userId')

  const { data: existing, error: fetchError } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .in('title', DEFAULT_TRIAD.map(h => h.title))
    .order('created_at', { ascending: true })

  if (fetchError) throw fetchError

  const existingTitles = new Set((existing ?? []).map(h => h.title))
  const toInsert = DEFAULT_TRIAD.filter(h => !existingTitles.has(h.title))

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('habits')
      .insert(toInsert.map(h => ({ user_id: userId, title: h.title, frequency: h.frequency, is_active: true })))
    if (insertError) throw insertError
  }

  const { data: finalList, error: finalError } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .in('title', DEFAULT_TRIAD.map(h => h.title))
    .order('created_at', { ascending: true })

  if (finalError) throw finalError
  return (finalList ?? []) as HabitRow[]
}

export const getHabitCompletionsForDate = async (userId: string, date: string): Promise<Record<string, boolean>> => {
  if (!userId) throw new Error('getHabitCompletionsForDate requires userId')
  if (!date) throw new Error('getHabitCompletionsForDate requires date')

  const { data, error } = await supabase
    .from('habit_completions')
    .select('habit_id')
    .eq('user_id', userId)
    .eq('date', date)

  if (error) throw error
  const map: Record<string, boolean> = {}
  for (const row of data ?? []) {
    map[row.habit_id as string] = true
  }
  return map
}

export const setHabitCompletion = async (userId: string, habitId: string, date: string, completed: boolean): Promise<void> => {
  if (!userId || !habitId || !date) throw new Error('setHabitCompletion requires userId, habitId, and date')

  if (completed) {
    const { error } = await supabase
      .from('habit_completions')
      .upsert({ user_id: userId, habit_id: habitId, date }, { onConflict: 'user_id,habit_id,date' })
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('habit_completions')
      .delete()
      .eq('user_id', userId)
      .eq('habit_id', habitId)
      .eq('date', date)
    if (error) throw error
  }
}
