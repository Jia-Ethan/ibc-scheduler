import { describe, expect, it } from 'vitest';
import { buildWeeklyScheduleOverview } from '../src/lib/utils';
import type { Schedule, User } from '../src/types';

function createUsers(names: string[]): User[] {
  return names.map((name, index) => ({
    id: `user-${index + 1}`,
    name,
    createdAt: '2026-04-10T00:00:00.000Z',
  }));
}

function createSchedule(userId: string, dayOfWeek: number, period: number): Schedule {
  return {
    userId,
    dayOfWeek,
    period,
    assigned: true,
  };
}

describe('buildWeeklyScheduleOverview', () => {
  it('maps scheduled items into the fixed monday-to-friday, period-1-to-8 grid', () => {
    const [alice, bob] = createUsers(['Alice', 'Bob']);
    const overview = buildWeeklyScheduleOverview(
      [
        createSchedule(alice.id, 0, 1),
        createSchedule(bob.id, 4, 8),
      ],
      [alice, bob],
    );

    expect(overview.cells).toHaveLength(40);
    expect(overview.cells[0]).toMatchObject({
      key: '0-1',
      dayOfWeek: 0,
      period: 1,
      assigned: true,
      userId: alice.id,
      userName: 'Alice',
      userInitial: 'A',
    });
    expect(overview.cells[39]).toMatchObject({
      key: '4-8',
      dayOfWeek: 4,
      period: 8,
      assigned: true,
      userId: bob.id,
      userName: 'Bob',
      userInitial: 'B',
    });
  });

  it('leaves unscheduled slots empty while preserving summary counts', () => {
    const [alice, bob] = createUsers(['Alice', 'Bob']);
    const overview = buildWeeklyScheduleOverview(
      [
        createSchedule(alice.id, 2, 3),
        createSchedule(bob.id, 2, 4),
      ],
      [alice, bob],
    );

    expect(overview.assignedSlotsCount).toBe(2);
    expect(overview.participantCount).toBe(2);
    expect(overview.cells.find((cell) => cell.key === '0-1')).toMatchObject({
      assigned: false,
      userId: null,
      userName: '',
      userInitial: '',
    });
    expect(overview.cells.find((cell) => cell.key === '2-3')).toMatchObject({
      assigned: true,
      userId: alice.id,
      userName: 'Alice',
    });
  });

  it('returns a fully empty overview when no schedule exists', () => {
    const overview = buildWeeklyScheduleOverview([], []);

    expect(overview.assignedSlotsCount).toBe(0);
    expect(overview.participantCount).toBe(0);
    expect(overview.cells.every((cell) => !cell.assigned)).toBe(true);
  });

  it('falls back to unknown when a scheduled user is missing from the user list', () => {
    const [alice] = createUsers(['Alice']);
    const overview = buildWeeklyScheduleOverview(
      [
        createSchedule(alice.id, 1, 2),
        createSchedule('missing-user', 3, 6),
      ],
      [alice],
    );

    expect(overview.assignedSlotsCount).toBe(2);
    expect(overview.participantCount).toBe(2);
    expect(overview.cells.find((cell) => cell.key === '3-6')).toMatchObject({
      assigned: true,
      userId: 'missing-user',
      userName: '未知',
      userInitial: '未',
    });
  });
});
