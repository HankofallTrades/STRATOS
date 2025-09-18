import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getHabitCompletionsForDate, setHabitCompletion } from '@/domains/habits/model/repository'

export const useHabitCompletions = (
  userId: string | null | undefined,
  date: string | null | undefined
) => {
  const queryClient = useQueryClient()
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({})

  const query = useQuery<Record<string, boolean>>({
    queryKey: ['habitCompletions', userId, date],
    queryFn: async () => {
      if (!userId || !date) return {}
      return getHabitCompletionsForDate(userId, date)
    },
    enabled: !!userId && !!date,
    staleTime: 60 * 1000,
  })

  const mutation = useMutation({
    mutationFn: async ({ habitId, completed }: { habitId: string; completed: boolean }) => {
      if (!userId || !date) throw new Error('Missing userId or date')
      await setHabitCompletion(userId, habitId, date, completed)
      return { habitId, completed }
    },
    onMutate: async ({ habitId, completed }) => {
      setPendingIds(prev => ({ ...prev, [habitId]: true }))
      await queryClient.cancelQueries({ queryKey: ['habitCompletions', userId, date] })
      const prev = queryClient.getQueryData<Record<string, boolean>>([
        'habitCompletions',
        userId,
        date,
      ])
      const next = { ...(prev ?? {}) }
      next[habitId] = completed
      queryClient.setQueryData(['habitCompletions', userId, date], next)
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(['habitCompletions', userId, date], ctx.prev)
      }
    },
    onSettled: (_data, _error, variables) => {
      if (variables?.habitId) {
        setPendingIds(prev => {
          const next = { ...prev }
          delete next[variables.habitId]
          return next
        })
      }
      // Refetch in background to reconcile with server state
      queryClient.fetchQuery({ queryKey: ['habitCompletions', userId, date] })
    },
  })

  return {
    completions: query.data ?? {},
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    toggleCompletion: (habitId: string, completed: boolean) => mutation.mutate({ habitId, completed }),
    isToggling: mutation.isPending,
    pendingIds,
  }
}
