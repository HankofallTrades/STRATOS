import { useQuery } from '@tanstack/react-query'
import type { HabitRow } from '@/domains/habits/data/types'
import { ensureTriadHabits } from '@/domains/habits/data/repository'

export const useTriad = (userId: string | null | undefined) => {
  const query = useQuery<HabitRow[]>({
    queryKey: ['habits', 'triad', userId],
    queryFn: async () => {
      if (!userId) return []
      return ensureTriadHabits(userId)
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })

  return {
    habits: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    refetch: query.refetch,
  }
}
