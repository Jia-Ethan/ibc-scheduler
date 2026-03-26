import { describe, expect, it } from 'vitest';
import {
  MAX_STANDARD_HOURS,
  calculateSubsidyAmount,
  calculateSubsidyTotals,
  createEditableSubsidyRow,
  createManualEditableSubsidyRow,
  getSubsidyRecordPeriod,
  restoreEditableSubsidyRows,
  updateEditableSubsidyRowHours,
  validateApprovedHours,
  type SubsidyRow,
} from '../src/lib/subsidy';
import type { User, UserProfile } from '../src/types';

const baseRow: SubsidyRow = {
  userId: 'user-1',
  name: '曾心越',
  studentId: '20233637045',
  department: '国际商学院',
  major: '金融学',
  studentType: '本科',
  grade: '2023',
  hours: 12,
  amount: calculateSubsidyAmount(12),
  requiresNote: false,
  missingFields: [],
};

describe('subsidy export helpers', () => {
  it('validates approved hours against numeric, negative, and max limits', () => {
    expect(validateApprovedHours(Number.NaN)).toBe('invalid');
    expect(validateApprovedHours(-1)).toBe('negative');
    expect(validateApprovedHours(MAX_STANDARD_HOURS + 0.1)).toBe('over_limit');
    expect(validateApprovedHours(18.5)).toBeNull();
  });

  it('creates editable rows while preserving system hours', () => {
    const editable = createEditableSubsidyRow(baseRow);

    expect(editable.systemHours).toBe(12);
    expect(editable.hours).toBe(12);
    expect(editable.source).toBe('schedule');
  });

  it('updates editable rows with recalculated amount and keeps original system hours', () => {
    const editable = createEditableSubsidyRow(baseRow);
    const updated = updateEditableSubsidyRowHours(editable, 10.5);

    expect(updated.systemHours).toBe(12);
    expect(updated.hours).toBe(10.5);
    expect(updated.amount).toBe(calculateSubsidyAmount(10.5));
  });

  it('creates manual rows for existing users with zero default hours', () => {
    const user: User = {
      id: 'user-2',
      name: '李贤',
      createdAt: '2026-03-23T00:00:00.000Z',
    };
    const profiles = new Map<string, UserProfile>([
      [
        user.id,
        {
          id: user.id,
          studentId: '20233501037',
          department: '国际商学院',
          major: '文化产业管理',
          studentType: '本科',
          grade: '2023',
        },
      ],
    ]);

    const row = createManualEditableSubsidyRow(user, profiles);

    expect(row.source).toBe('manual');
    expect(row.systemHours).toBe(0);
    expect(row.hours).toBe(0);
    expect(row.amount).toBe(0);
    expect(row.missingFields).toEqual([]);
  });

  it('calculates totals from editable rows', () => {
    const total = calculateSubsidyTotals([
      createEditableSubsidyRow(baseRow),
      updateEditableSubsidyRowHours(createEditableSubsidyRow(baseRow), 5.5),
    ]);

    expect(total.totalHours).toBe(17.5);
    expect(total.totalAmount).toBe(
      Number((calculateSubsidyAmount(12) + calculateSubsidyAmount(5.5)).toFixed(2)),
    );
  });

  it('restores persisted rows with normalized amount and note state', () => {
    const restored = restoreEditableSubsidyRows([
      {
        ...createEditableSubsidyRow(baseRow),
        hours: 30.05,
        amount: 1,
        requiresNote: false,
      },
    ]);

    expect(restored[0].hours).toBe(30.1);
    expect(restored[0].amount).toBe(calculateSubsidyAmount(30.1));
    expect(restored[0].requiresNote).toBe(true);
  });

  it('derives a stable subsidy record period from a reference date', () => {
    expect(getSubsidyRecordPeriod(new Date('2026-03-26T08:00:00.000Z'))).toEqual({
      recordMonth: '2026-03',
      monthStart: '2026-03-01',
      monthEnd: '2026-03-31',
    });
  });
});
