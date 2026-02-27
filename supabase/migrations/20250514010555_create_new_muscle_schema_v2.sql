
CREATE TABLE public.movement_archetypes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.muscle_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT, -- Removed NULLABLE, as TEXT is nullable by default
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.archetype_muscle_map (
    archetype_id UUID REFERENCES public.movement_archetypes(id) ON DELETE CASCADE,
    muscle_id UUID REFERENCES public.muscle_definitions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (archetype_id, muscle_id)
);
;
