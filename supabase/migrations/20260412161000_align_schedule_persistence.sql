-- Align remote schema with the current GitHub Pages app contract.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

UPDATE public.users
SET role = 'user'
WHERE role IS NULL;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (role = ANY (ARRAY['admin'::text, 'user'::text]));

ALTER TABLE public.schedule
  ADD COLUMN IF NOT EXISTS assigned boolean NOT NULL DEFAULT true;

ALTER TABLE public.schedule
  ADD COLUMN IF NOT EXISTS explanation jsonb;

UPDATE public.schedule
SET assigned = true
WHERE assigned IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.availability
    WHERE day_of_week < 0 OR day_of_week > 4
  ) THEN
    RAISE EXCEPTION 'public.availability contains weekend day_of_week values; clean the data before applying the alignment migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.schedule
    WHERE day_of_week < 0 OR day_of_week > 4
  ) THEN
    RAISE EXCEPTION 'public.schedule contains weekend day_of_week values; clean the data before applying the alignment migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.leave_requests
    WHERE day_of_week < 0 OR day_of_week > 4
  ) THEN
    RAISE EXCEPTION 'public.leave_requests contains weekend day_of_week values; clean the data before applying the alignment migration.';
  END IF;
END
$$;

ALTER TABLE public.availability DROP CONSTRAINT IF EXISTS availability_day_of_week_check;
ALTER TABLE public.availability
  ADD CONSTRAINT availability_day_of_week_check CHECK (day_of_week >= 0 AND day_of_week <= 4);

ALTER TABLE public.schedule DROP CONSTRAINT IF EXISTS schedule_day_of_week_check;
ALTER TABLE public.schedule
  ADD CONSTRAINT schedule_day_of_week_check CHECK (day_of_week >= 0 AND day_of_week <= 4);

ALTER TABLE public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_day_of_week_check;
ALTER TABLE public.leave_requests
  ADD CONSTRAINT leave_requests_day_of_week_check CHECK (day_of_week >= 0 AND day_of_week <= 4);
