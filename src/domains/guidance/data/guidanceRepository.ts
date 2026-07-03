import {
    fetchExercises,
    fetchExerciseMuscleGroupMappings,
    fetchExercisePrimaryMuscleMap,
    fetchMovementArchetypes as fetchFitnessMovementArchetypes,
    type ExerciseMuscleGroupMapping,
} from '@/domains/fitness/data/fitnessRepository';
import type { Exercise } from '@/lib/types/workout';

export interface MovementArchetype {
    id: string;
    name: string;
}

export const fetchGuidanceExercises = async (): Promise<Exercise[]> => {
    return (await fetchExercises()) as Exercise[];
};

export const fetchGuidanceExerciseMuscleGroupMappings =
    async (): Promise<ExerciseMuscleGroupMapping> => {
        return fetchExerciseMuscleGroupMappings();
    };

export const fetchGuidancePrimaryMuscleMap =
    async (): Promise<ExerciseMuscleGroupMapping> => {
        return fetchExercisePrimaryMuscleMap();
    };

/**
 * Fetches the list of movement archetypes from the database.
 */
export const fetchMovementArchetypes = async (): Promise<MovementArchetype[]> => {
    return await fetchFitnessMovementArchetypes();
};
