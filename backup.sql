// IBC Scheduler Database Backup Script
// Run this in Supabase SQL Editor or as a cron job

-- Create backup table
CREATE TABLE IF NOT EXISTS schedule_backup (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  backup_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Function to backup a table
CREATE OR REPLACE FUNCTION backup_table(table_name TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('INSERT INTO schedule_backup (table_name, backup_data)
    SELECT %L, to_jsonb(%I) FROM %I', 
    table_name, table_name, table_name);
END;
$$;

-- Manual backup procedure
CREATE OR REPLACE PROCEDURE full_backup()
LANGUAGE plpgsql
AS $$
BEGIN
  -- Backup users
  INSERT INTO schedule_backup (table_name, backup_data)
    SELECT 'users', to_jsonb(users) FROM users;
  
  -- Backup availability
  INSERT INTO schedule_backup (table_name, backup_data)
    SELECT 'availability', to_jsonb(availability) FROM availability;
  
  -- Backup schedule
  INSERT INTO schedule_backup (table_name, backup_data)
    SELECT 'schedule', to_jsonb(schedule) FROM schedule;
  
  -- Backup leave_requests
  INSERT INTO schedule_backup (table_name, backup_data)
    SELECT 'leave_requests', to_jsonb(leave_requests) FROM leave_requests;
  
  -- Backup schedule_history
  INSERT INTO schedule_backup (table_name, backup_data)
    SELECT 'schedule_history', to_jsonb(schedule_history) FROM schedule_history;
  
  RAISE NOTICE 'Full backup completed at %', NOW();
END;
$$;

-- To run backup:
-- CALL full_backup();

-- To view backups:
-- SELECT * FROM schedule_backup ORDER BY created_at DESC LIMIT 10;

-- To restore from backup (example for users):
-- INSERT INTO users (id, name, created_at)
-- SELECT (backup_data->>'id')::uuid, backup_data->>'name', (backup_data->>'created_at')::timestamp
-- FROM schedule_backup 
-- WHERE table_name = 'users' 
-- AND created_at = (SELECT MAX(created_at) FROM schedule_backup WHERE table_name = 'users');
