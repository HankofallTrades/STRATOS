import { useQuery } from "@tanstack/react-query";

import {
  fetchGuidanceExercises,
  fetchMovementArchetypes,
} from "@/domains/guidance/data/guidanceRepository";

export const useGuidanceWorkoutCatalog = () => {
  const {
    data: baseExercises,
    isLoading: isLoadingExercises,
    error: exercisesError,
  } = useQuery({
    queryKey: ["exercises"],
    queryFn: fetchGuidanceExercises,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const {
    data: movementArchetypes,
    isLoading: isLoadingMovementArchetypes,
    error: movementArchetypesError,
  } = useQuery({
    queryKey: ["movementArchetypes"],
    queryFn: fetchMovementArchetypes,
    staleTime: Infinity,
    enabled: !!baseExercises,
  });

  return {
    baseExercises,
    error: exercisesError || movementArchetypesError,
    isLoading: isLoadingExercises || isLoadingMovementArchetypes,
    isLoadingExercises,
    isLoadingMovementArchetypes,
    movementArchetypes,
  };
};
