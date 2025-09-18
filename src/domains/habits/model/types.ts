export type HabitFrequency = 'daily' | 'weekly'

export interface HabitRow {
  id: string
  user_id: string
  title: string
  frequency: HabitFrequency
  is_active: boolean
  created_at: string
}

export interface HabitCompletionRow {
  id: string
  habit_id: string
  user_id: string
  date: string
  created_at: string
}
