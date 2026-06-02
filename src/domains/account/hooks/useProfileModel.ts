import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchUserProfile,
  updateUserProfile,
  type ProfileRow,
  type ProfileUpdateData,
} from '@/domains/account/data/accountRepository';
import {
  createUserFact,
  deleteUserFact,
  listActiveUserFacts,
  updateUserFactContent,
  type CreateUserFactInput,
  type UserFactRow,
} from '@/domains/account/data/userFactsRepository';

const factsKey = (userId: string | null | undefined) => ['user_facts', userId];
const profileKey = (userId: string | null | undefined) => ['profile', userId];

export const useProfileModel = (userId: string | null | undefined) => {
  const queryClient = useQueryClient();

  const factsQuery = useQuery<UserFactRow[]>({
    queryKey: factsKey(userId),
    queryFn: () => (userId ? listActiveUserFacts(userId) : Promise.resolve([])),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const profileQuery = useQuery<ProfileRow | null>({
    queryKey: profileKey(userId),
    queryFn: () => (userId ? fetchUserProfile(userId) : Promise.resolve(null)),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const invalidateFacts = () =>
    queryClient.invalidateQueries({ queryKey: factsKey(userId) });
  const invalidateProfile = () =>
    queryClient.invalidateQueries({ queryKey: profileKey(userId) });

  const createFact = useMutation({
    mutationFn: (input: CreateUserFactInput) => {
      if (!userId) throw new Error('Not authenticated');
      return createUserFact(userId, input);
    },
    onSuccess: invalidateFacts,
  });

  const updateFact = useMutation({
    mutationFn: ({ factId, content }: { factId: string; content: string }) =>
      updateUserFactContent(factId, content),
    onSuccess: invalidateFacts,
  });

  const removeFact = useMutation({
    mutationFn: (factId: string) => deleteUserFact(factId),
    onSuccess: invalidateFacts,
  });

  const updateProfile = useMutation({
    mutationFn: (data: ProfileUpdateData) => {
      if (!userId) throw new Error('Not authenticated');
      return updateUserProfile(userId, data);
    },
    onSuccess: invalidateProfile,
  });

  return {
    facts: factsQuery.data ?? [],
    profile: profileQuery.data ?? null,
    isLoading: factsQuery.isLoading || profileQuery.isLoading,
    error: (factsQuery.error ?? profileQuery.error) as Error | null,
    createFact,
    updateFact,
    removeFact,
    updateProfile,
  };
};
