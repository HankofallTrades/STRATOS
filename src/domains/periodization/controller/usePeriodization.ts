import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCustomMesocycleSession,
  createMesocycle,
  getActiveMesocycleProgram,
} from '@/domains/periodization/model/repository';
import type {
  ActiveMesocycleProgram,
  CreateMesocycleInput,
} from '@/domains/periodization/model/types';
import type { SessionFocus } from '@/lib/types/workout';

const ACTIVE_MESOCYCLE_QUERY_KEY = 'activeMesocycleProgram';

const formatTodayIsoDate = () => new Date().toISOString().split('T')[0];

export const usePeriodization = (userId: string | null | undefined) => {
  const queryClient = useQueryClient();

  const activeProgramQuery = useQuery<ActiveMesocycleProgram | null>({
    queryKey: [ACTIVE_MESOCYCLE_QUERY_KEY, userId],
    queryFn: async () => {
      if (!userId) return null;
      return getActiveMesocycleProgram(userId);
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  const createMesocycleMutation = useMutation({
    mutationFn: async (input: CreateMesocycleInput) => {
      if (!userId) throw new Error('User is required to create a mesocycle.');
      return createMesocycle(userId, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ACTIVE_MESOCYCLE_QUERY_KEY, userId] });
    },
  });

  const createCustomSessionMutation = useMutation({
    mutationFn: async (input: { mesocycleId: string; sessionFocus?: SessionFocus | null; name?: string }) => {
      if (!userId) throw new Error('User is required to create a custom session.');
      const program = activeProgramQuery.data;
      const nextOrder = (program?.sessions.length ?? 0) + 1;
      const defaultName = `Custom Session ${nextOrder} (${formatTodayIsoDate()})`;
      return createCustomMesocycleSession(userId, {
        mesocycle_id: input.mesocycleId,
        name: input.name?.trim() ? input.name : defaultName,
        session_focus: input.sessionFocus ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ACTIVE_MESOCYCLE_QUERY_KEY, userId] });
    },
  });

  const activeMesocycle = useMemo(() => activeProgramQuery.data?.mesocycle ?? null, [activeProgramQuery.data]);

  return {
    activeProgram: activeProgramQuery.data ?? null,
    activeMesocycle,
    isLoading: activeProgramQuery.isLoading,
    isFetching: activeProgramQuery.isFetching,
    error: activeProgramQuery.error as Error | null,
    refetch: activeProgramQuery.refetch,
    createMesocycle: createMesocycleMutation.mutateAsync,
    isCreatingMesocycle: createMesocycleMutation.isPending,
    createMesocycleError: createMesocycleMutation.error as Error | null,
    createCustomSession: createCustomSessionMutation.mutateAsync,
    isCreatingCustomSession: createCustomSessionMutation.isPending,
    createCustomSessionError: createCustomSessionMutation.error as Error | null,
  };
};
