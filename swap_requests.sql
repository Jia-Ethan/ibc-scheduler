// IBC Scheduler - 調班申請功能預留
// 數據庫表結構

-- 調班申請表
CREATE TABLE IF NOT EXISTS shift_swap_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
  target_id UUID REFERENCES users(id) ON DELETE CASCADE,
  requester_day INTEGER NOT NULL,
  requester_period INTEGER NOT NULL,
  target_day INTEGER NOT NULL,
  target_period INTEGER NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 啟用 Realtime
ALTER TABLE shift_swap_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE shift_swap_requests;

-- RLS
ALTER TABLE shift_swap_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON shift_swap_requests FOR ALL USING (true) WITH CHECK (true);
