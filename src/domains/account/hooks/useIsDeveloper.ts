import { useQuery } from "@tanstack/react-query";

import {
  fetchUserProfile,
  type ProfileRow,
} from "@/domains/account/data/accountRepository";
import { useAuth } from "@/state/auth/AuthProvider";

const DEV_ROLES = new Set(["developer", "admin"]);

/**
 * Whether the current user holds a dev/admin role. The role is a
 * server-controlled column on `profiles` (not self-grantable), so this gates
 * dev-only UI such as the Coach dev tools. Reuses the shared `['profile', id]`
 * query so it doesn't add a fetch.
 */
export const useIsDeveloper = (): boolean => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data } = useQuery<ProfileRow | null>({
    queryKey: ["profile", userId],
    queryFn: () => (userId ? fetchUserProfile(userId) : Promise.resolve(null)),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  return data ? DEV_ROLES.has(data.role) : false;
};
