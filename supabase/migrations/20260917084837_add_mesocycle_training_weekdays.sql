-- ISO weekdays (Monday = 1 ... Sunday = 7) a training block is trained on.
-- Sessions are a rotation; this is the calendar they are expected on. Empty
-- means no schedule, so nothing can be due or missed.
alter table public.mesocycles
  add column training_weekdays smallint[] not null default '{}',
  add constraint mesocycles_training_weekdays_valid
    check (training_weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]);
