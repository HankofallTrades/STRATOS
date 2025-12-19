import { supabase } from '@/lib/integrations/supabase/client';

export interface MovementArchetype {
    id: string;
    name: string;
}

/**
 * Fetches the list of movement archetypes from the database.
 */
export const fetchMovementArchetypes = async (): Promise<MovementArchetype[]> => {
    console.log("guidanceRepository: Fetching movement_archetypes...");
    const { data, error } = await supabase.from('movement_archetypes').select('id, name');

    if (error) {
        console.error("guidanceRepository: Error fetching movement_archetypes:", error);
        throw new Error(`Failed to fetch movement archetypes: ${error.message}`);
    }

    return data || [];
};
