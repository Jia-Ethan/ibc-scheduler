import { describe, expect, it } from 'vitest';
import { buildScheduleExportTableData } from '../src/lib/utils';
import type { Schedule, User } from '../src/types';

const users: User[] = [
  { id: 'u-1', name: '曾心越', createdAt: '2026-04-01T00:00:00.000Z' },
  { id: 'u-2', name: '李贤', createdAt: '2026-04-01T00:00:00.000Z' },
];

describe('schedule Word export view model', () => {
  it('maps assignments into the fixed Monday-Friday and period 1-8 grid', () => {
    const schedule: Schedule[] = [
      { userId: 'u-1', dayOfWeek: 0, period: 1, assigned: true },
      { userId: 'u-2', dayOfWeek: 4, period: 8, assigned: true },
    ];
    const phoneMap = new Map([['u-1', '12345678901']]);

    const data = buildScheduleExportTableData(schedule, users, phoneMap, 'zh');

    expect(data.days).toEqual(['周一', '周二', '周三', '周四', '周五']);
    expect(data.rows).toHaveLength(8);
    expect(data.rows[0].cells[0]).toMatchObject({
      dayOfWeek: 0,
      period: 1,
      userName: '曾心越',
    });
    expect(data.rows[7].cells[4]).toMatchObject({
      dayOfWeek: 4,
      period: 8,
      userName: '李贤',
    });
    expect(data.rows[0].cells[1].userName).toBe('');
  });

  it('keeps missing users visible as unknown instead of dropping assigned slots', () => {
    const data = buildScheduleExportTableData(
      [{ userId: 'missing-user', dayOfWeek: 2, period: 4, assigned: true }],
      users,
      new Map(),
      'zh',
    );

    expect(data.rows[3].cells[2].userName).toBe('未知');
    expect(data.contactRows).toHaveLength(1);
  });

  it('builds contact rows from user profile phone numbers with missing phone fallback', () => {
    const schedule: Schedule[] = [
      { userId: 'u-1', dayOfWeek: 0, period: 1, assigned: true },
      { userId: 'u-1', dayOfWeek: 1, period: 2, assigned: true },
      { userId: 'u-2', dayOfWeek: 2, period: 3, assigned: true },
    ];

    const data = buildScheduleExportTableData(schedule, users, new Map([['u-1', '123']]), 'zh');

    expect(data.contactsTitle).toBe('值班人员联系电话');
    expect(data.contactRows).toEqual([
      {
        left: { userId: 'u-1', name: '曾心越', phone: '123' },
        right: { userId: 'u-2', name: '李贤', phone: '未设置' },
      },
    ]);
  });

  it('produces an empty but structured table when there is no schedule', () => {
    const data = buildScheduleExportTableData(
      [],
      users,
      new Map(),
      'zh',
      new Date('2026-03-29T12:00:00+08:00'),
    );

    expect(data.title).toBe('国际商学院学生助理值班表');
    expect(data.updatedAtLabel).toBe('更新日期：2026年3月29日');
    expect(data.periodLabel).toBe('节次');
    expect(data.rows).toHaveLength(8);
    expect(data.rows.every((row) => row.cells.every((cell) => cell.userName === ''))).toBe(true);
    expect(data.contactRows).toHaveLength(1);
  });
});
