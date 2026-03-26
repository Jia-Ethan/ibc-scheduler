-- IBC 排班系統 - Supabase 數據庫初始化腳本
-- 在 Supabase SQL Editor 中執行此文件

-- 用戶表
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 給班表（使用者標記的可排班時間）
CREATE TABLE IF NOT EXISTS availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  period INTEGER NOT NULL CHECK (period >= 1 AND period <= 8),
  UNIQUE(user_id, day_of_week, period)
);

-- 排班表（管理員安排的最終排班）
CREATE TABLE IF NOT EXISTS schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  period INTEGER NOT NULL CHECK (period >= 1 AND period <= 8),
  UNIQUE(day_of_week, period)
);

-- 啟用 Realtime 同步
ALTER TABLE schedule REPLICA IDENTITY FULL;
ALTER TABLE availability REPLICA IDENTITY FULL;
ALTER TABLE users REPLICA IDENTITY FULL;

-- 創建 publication（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

-- 添加表到 publication
ALTER PUBLICATION supabase_realtime ADD TABLE schedule;
ALTER PUBLICATION supabase_realtime ADD TABLE availability;
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- 創建 RLS 策略（允許匿名訪問）
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;

-- 允許所有人讀取和寫入
CREATE POLICY "Allow all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON availability FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON schedule FOR ALL USING (true) WITH CHECK (true);

-- 插入測試數據（可選）
-- INSERT INTO users (name) VALUES ('Ethan'), ('Alice'), ('Bob');

-- 用戶資料表（手機號）
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone TEXT,
  student_id TEXT,
  department TEXT,
  major TEXT,
  student_type TEXT,
  grade TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS major TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS student_type TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 啟用 Realtime 同步
ALTER TABLE user_profiles REPLICA IDENTITY FULL;

-- 添加到 publication
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;

-- RLS 策略
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON user_profiles FOR ALL USING (true) WITH CHECK (true);

-- 补贴记录表（草稿 / 已导出）
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
CREATE POLICY "Allow all" ON subsidy_records FOR ALL USING (true) WITH CHECK (true);
