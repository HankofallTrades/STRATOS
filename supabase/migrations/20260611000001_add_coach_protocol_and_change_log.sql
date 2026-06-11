-- Coach acting layer: 'coach' mesocycle protocol + coach_change_log audit table.

-- 1. Allow Coach-drafted programs. 'coach' programs are agent-authored and are
--    never re-seeded from fixed templates on load.
ALTER TABLE public.mesocycles DROP CONSTRAINT mesocycles_protocol_check;
ALTER TABLE public.mesocycles ADD CONSTRAINT mesocycles_protocol_check
  CHECK (protocol IN ('occams','custom','coach'));

-- 2. Change log: one row per applied Coach mutation, revertible.
CREATE TABLE public.coach_change_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('program_created','program_edited','workout_edited')),
  summary TEXT NOT NULL CHECK (length(trim(summary)) > 0),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  reverted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.coach_change_log IS 'Audit log of Coach-applied training mutations; payload carries what revert needs.';
COMMENT ON COLUMN public.coach_change_log.payload IS 'program_created: {mesocycleId, previousActiveMesocycleId}. program_edited: {mesocycleId, ops, snapshot, protocolBefore}. workout_edited: {workoutId, inverseActions}.';

ALTER TABLE public.coach_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coach changes"
  ON public.coach_change_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own coach changes"
  ON public.coach_change_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own coach changes"
  ON public.coach_change_log FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_coach_change_log_user_created
  ON public.coach_change_log(user_id, created_at DESC);
