import type { DefaultOptions, QueryKey, UseQueryOptions } from '@tanstack/react-query';

export type LoadingIntent = 'static' | 'session' | 'background';

const MINUTE = 60 * 1000;

const staleTimeByIntent: Record<LoadingIntent, number> = {
  static: Infinity,
  session: 5 * MINUTE,
  background: 60 * 1000,
};

export const queryClientDefaultOptions: DefaultOptions = {
  queries: {
    staleTime: 60 * 1000,
    gcTime: 30 * MINUTE,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },
};

type AppQueryOptionsInput<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey' | 'queryFn'> & {
  intent?: LoadingIntent;
};

export const createAppQueryOptions = <
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: AppQueryOptionsInput<TQueryFnData, TError, TData, TQueryKey> = {}
): AppQueryOptionsInput<TQueryFnData, TError, TData, TQueryKey> => {
  const { intent = 'background', staleTime, gcTime, ...rest } = options;

  return {
    staleTime: staleTime ?? staleTimeByIntent[intent],
    gcTime: gcTime ?? queryClientDefaultOptions.queries?.gcTime,
    ...rest,
  };
};
