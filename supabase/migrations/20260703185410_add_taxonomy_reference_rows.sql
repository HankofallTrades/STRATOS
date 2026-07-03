INSERT INTO public.muscle_definitions (name)
SELECT v.name
FROM (VALUES ('Rotator Cuff'), ('Adductors'), ('Lateral Deltoid'), ('Grip/Forearms')) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.muscle_definitions m WHERE m.name = v.name
);

INSERT INTO public.equipment_types (name)
SELECT 'Pull-up Bar'
WHERE NOT EXISTS (
  SELECT 1 FROM public.equipment_types e WHERE e.name = 'Pull-up Bar' AND e.user_id IS NULL
);
