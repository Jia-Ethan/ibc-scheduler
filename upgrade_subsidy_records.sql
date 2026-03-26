-- IBC Scheduler - 补贴记录功能升级
-- 在 Supabase SQL Editor 中执行一次即可

CREATE TABLE IF NOT EXISTS subsidy_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('draft', 'exported')),
  source_type TEXT NOT NULL CHECK (source_type IN ('schedule', 'record_copy')),
  record_month TEXT NOT NULL,
  month_start DATE NOT NULL,
  month_end DATE NOT NULL,
  preparer_name TEXT,
  preparer_phone TEXT,
  prepared_date DATE NOT NULL,
  rows_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  over_limit_notes_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_hours NUMERIC(10, 1) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  exported_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE subsidy_records ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE subsidy_records ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE subsidy_records ADD COLUMN IF NOT EXISTS record_month TEXT;
ALTER TABLE subsidy_records ADD COLUMN IF NOT EXISTS month_start DATE;
ALTER TABLE subsidy_records ADD COLUMN IF NOT EXISTS month_end DATE;
ALTER TABLE subsidy_records ADD COLUMN IF NOT EXISTS preparer_name TEXT;
ALTER TABLE subsidy_records ADD COLUMN IF NOT EXISTS preparer_phone TEXT;
ALTER TABLE subsidy_records ADD COLUMN IF NOT EXISTS prepared_date DATE;
ALTER TABLE subsidy_records ADD COLUMN IF NOT EXISTS rows_json JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE subsidy_records ADD COLUMN IF NOT EXISTS over_limit_notes_json JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE subsidy_records ADD COLUMN IF NOT EXISTS total_hours NUMERIC(10, 1) NOT NULL DEFAULT 0;
ALTER TABLE subsidy_records ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE subsidy_records ADD COLUMN IF NOT EXISTS exported_at TIMESTAMP;
ALTER TABLE subsidy_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE subsidy_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

UPDATE subsidy_records
SET
  status = COALESCE(status, 'draft'),
  source_type = COALESCE(source_type, 'schedule'),
  record_month = COALESCE(record_month, TO_CHAR(COALESCE(prepared_date, CURRENT_DATE), 'YYYY-MM')),
  month_start = COALESCE(month_start, DATE_TRUNC('month', COALESCE(prepared_date, CURRENT_DATE))::date),
  month_end = COALESCE(month_end, (DATE_TRUNC('month', COALESCE(prepared_date, CURRENT_DATE)) + INTERVAL '1 month - 1 day')::date),
  prepared_date = COALESCE(prepared_date, CURRENT_DATE),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE
  status IS NULL
  OR source_type IS NULL
  OR record_month IS NULL
  OR month_start IS NULL
  OR month_end IS NULL
  OR prepared_date IS NULL
  OR created_at IS NULL
  OR updated_at IS NULL;

ALTER TABLE subsidy_records
  ALTER COLUMN status SET DEFAULT 'draft',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN source_type SET DEFAULT 'schedule',
  ALTER COLUMN source_type SET NOT NULL,
  ALTER COLUMN record_month SET NOT NULL,
  ALTER COLUMN month_start SET NOT NULL,
  ALTER COLUMN month_end SET NOT NULL,
  ALTER COLUMN prepared_date SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subsidy_records_status_check'
  ) THEN
    ALTER TABLE subsidy_records
      ADD CONSTRAINT subsidy_records_status_check
      CHECK (status IN ('draft', 'exported'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subsidy_records_source_type_check'
  ) THEN
    ALTER TABLE subsidy_records
      ADD CONSTRAINT subsidy_records_source_type_check
      CHECK (source_type IN ('schedule', 'record_copy'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_subsidy_records_status_updated_at
  ON subsidy_records (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_subsidy_records_record_month
  ON subsidy_records (record_month);

ALTER TABLE subsidy_records REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'subsidy_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE subsidy_records;
  END IF;
END
$$;

ALTER TABLE subsidy_records ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subsidy_records'
      AND policyname = 'Allow all'
  ) THEN
    CREATE POLICY "Allow all" ON subsidy_records FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;
