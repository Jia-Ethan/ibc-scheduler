import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  getSupabasePublicConfigError,
  mapDbScheduleRow,
  toDbScheduleRow,
} from '../src/lib/storage';
import type { ScheduleExplanation } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const explanation: ScheduleExplanation = {
  source: 'auto',
  assignedUserId: 'user-1',
  assignedUserName: 'Alice',
  config: {
    weeklySoftLimitHours: 4,
    closeHoursThreshold: 1,
  },
  badges: ['single_candidate'],
  ruleHits: ['single_candidate'],
  candidates: [],
  rejectionReasons: [],
};

describe('supabase public config validation', () => {
  it('rejects missing public runtime configuration', () => {
    expect(getSupabasePublicConfigError('', '')).toContain('VITE_SUPABASE_URL');
  });

  it('rejects placeholder public runtime configuration', () => {
    expect(
      getSupabasePublicConfigError(
        'https://your-project-url.supabase.co',
        'your-anon-key',
      ),
    ).toContain('示例占位值');
  });

  it('accepts concrete public runtime configuration', () => {
    expect(
      getSupabasePublicConfigError(
        'https://demo-project.supabase.co',
        'demo-anon-key',
      ),
    ).toBeNull();
  });
});

describe('schedule persistence mapping', () => {
  it('maps explanation from database rows into frontend schedule items', () => {
    expect(mapDbScheduleRow({
      user_id: 'user-1',
      day_of_week: 2,
      period: 5,
      assigned: true,
      explanation,
    })).toEqual({
      userId: 'user-1',
      dayOfWeek: 2,
      period: 5,
      assigned: true,
      explanation,
    });
  });

  it('falls back to legacy cached explanations only when the database row is empty', () => {
    expect(mapDbScheduleRow({
      user_id: 'user-2',
      day_of_week: 1,
      period: 3,
      assigned: true,
      explanation: null,
    }, explanation).explanation).toEqual(explanation);
  });

  it('serializes schedule explanations back to the database payload', () => {
    expect(toDbScheduleRow({
      userId: 'user-3',
      dayOfWeek: 4,
      period: 8,
      assigned: true,
      explanation,
    })).toEqual({
      user_id: 'user-3',
      day_of_week: 4,
      period: 8,
      assigned: true,
      explanation,
    });
  });
});

describe('subsidy template asset', () => {
  it('keeps the subsidy export template in both bundled and public assets', () => {
    const templatePaths = [
      path.resolve(__dirname, '../src/assets/subsidy-template.xlsx'),
      path.resolve(__dirname, '../public/subsidy-template.xlsx'),
    ];

    templatePaths.forEach((templatePath) => {
      expect(fs.existsSync(templatePath)).toBe(true);
      expect(fs.statSync(templatePath).size).toBeGreaterThan(0);
    });
  });
});
