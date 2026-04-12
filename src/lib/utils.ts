import { type ClassValue, clsx } from "clsx";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeightRule,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlignTable,
  WidthType,
} from "docx";
import { twMerge } from "tailwind-merge";
import type { Schedule, User } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function exportToCSV(data: string[][]): string {
  return data.map(row => 
    row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
  ).join('\n');
}

export interface ConflictWarning {
  day: number;
  periods: number[];
  userName: string;
}

export function detectConflicts(
  schedule: Schedule[],
  users: User[]
): ConflictWarning[] {
  const warnings: ConflictWarning[] = [];
  
  // Group by user + day
  const userDayMap = new Map<string, number[]>();
  
  schedule.forEach(item => {
    const key = `${item.userId}-${item.dayOfWeek}`;
    const existing = userDayMap.get(key) || [];
    existing.push(item.period);
    userDayMap.set(key, existing);
  });
  
  // Detect conflicts (more than 1 period per day)
  userDayMap.forEach((periods, key) => {
    if (periods.length > 1) {
      const [userId, dayStr] = key.split('-');
      const day = parseInt(dayStr);
      const user = users.find(u => u.id === userId);
      warnings.push({
        day,
        periods: periods.sort((a, b) => a - b),
        userName: user?.name || 'Unknown',
      });
    }
  });
  
  return warnings;
}

export interface HoursStats {
  userId: string;
  name: string;
  hours: number;
}

export type ScheduleExportLanguage = 'zh' | 'en';

export interface ScheduleExportCell {
  dayOfWeek: number;
  period: number;
  userName: string;
}

export interface ScheduleExportRow {
  period: number;
  periodLabel: string;
  cells: ScheduleExportCell[];
}

export interface ScheduleExportContact {
  userId: string;
  name: string;
  phone: string;
}

export interface ScheduleExportContactRow {
  left: ScheduleExportContact | null;
  right: ScheduleExportContact | null;
}

export interface ScheduleExportTableData {
  title: string;
  updatedAtLabel: string;
  days: string[];
  rows: ScheduleExportRow[];
  contactRows: ScheduleExportContactRow[];
  contactsTitle: string;
  missingPhoneText: string;
  periodLabel: string;
}

export interface WeeklyScheduleGridCell {
  key: string;
  dayOfWeek: number;
  period: number;
  assigned: boolean;
  userId: string | null;
  userName: string;
  userInitial: string;
}

export interface WeeklyScheduleOverviewData {
  cells: WeeklyScheduleGridCell[];
  assignedSlotsCount: number;
  participantCount: number;
}

export function calculateHoursPerUser(
  schedule: Schedule[],
  users: User[]
): HoursStats[] {
  const hoursMap = new Map<string, number>();
  
  schedule.forEach(item => {
    const current = hoursMap.get(item.userId) || 0;
    hoursMap.set(item.userId, current + 1);
  });
  
  return users.map(user => ({
    userId: user.id,
    name: user.name,
    hours: hoursMap.get(user.id) || 0,
  })).sort((a, b) => b.hours - a.hours);
}

const SCHEDULE_EXPORT_DAYS = ['周一', '周二', '周三', '周四', '周五'] as const;

const SCHEDULE_EXPORT_PERIODS = [
  { num: 1, label: '第1节' },
  { num: 2, label: '第2节' },
  { num: 3, label: '第3节' },
  { num: 4, label: '第4节' },
  { num: 5, label: '第5节' },
  { num: 6, label: '第6节' },
  { num: 7, label: '第7节' },
  { num: 8, label: '第8节' },
] as const;

function formatScheduleExportDate(date: Date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

export function buildScheduleExportTableData(
  schedule: Schedule[],
  users: User[],
  phoneMap: Map<string, string> = new Map(),
  _language: ScheduleExportLanguage = 'zh',
  exportDate: Date = new Date(),
): ScheduleExportTableData {
  const userMap = new Map(users.map((user) => [user.id, user]));
  const scheduleMap = new Map<string, Schedule>(
    schedule
      .filter((item) => item.dayOfWeek >= 0 && item.dayOfWeek <= 4 && item.period >= 1 && item.period <= 8)
      .map((item) => [`${item.dayOfWeek}-${item.period}`, item] as const),
  );

  const templateText = {
    title: '国际商学院学生助理值班表',
    updatedAtLabel: `更新日期：${formatScheduleExportDate(exportDate)}`,
    contactsTitle: '值班人员联系电话',
    missingPhoneText: '未设置',
    unknownText: '未知',
    periodLabel: '节次',
  };

  const rows = SCHEDULE_EXPORT_PERIODS.map((period) => ({
    period: period.num,
    periodLabel: period.label,
    cells: SCHEDULE_EXPORT_DAYS.map((_, dayOfWeek) => {
      const assignment = scheduleMap.get(`${dayOfWeek}-${period.num}`);
      const user = assignment ? userMap.get(assignment.userId) : undefined;
      return {
        dayOfWeek,
        period: period.num,
        userName: assignment ? user?.name || templateText.unknownText : '',
      };
    }),
  }));

  const contacts: ScheduleExportContact[] = users.map((user) => ({
    userId: user.id,
    name: user.name,
    phone: phoneMap.get(user.id) || templateText.missingPhoneText,
  }));

  const contactRows: ScheduleExportContactRow[] = [];
  for (let index = 0; index < contacts.length; index += 2) {
    contactRows.push({
      left: contacts[index],
      right: contacts[index + 1] || null,
    });
  }

  return {
    ...templateText,
    days: [...SCHEDULE_EXPORT_DAYS],
    rows,
    contactRows,
  };
}

const wordTableBorder = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: 'auto',
};

const WORD_TEMPLATE_FONT = {
  ascii: 'FangSong',
  eastAsia: 'FangSong',
  hAnsi: 'FangSong',
  hint: 'eastAsia',
} as const;

function createWordParagraph(
  text: string,
  options: {
    bold?: boolean;
    size?: number;
    color?: string;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    spacing?: { before?: number; after?: number };
  } = {},
) {
  return new Paragraph({
    alignment: options.alignment,
    spacing: options.spacing,
    children: [
      new TextRun({
        text,
        bold: options.bold,
        size: options.size || 22,
        color: options.color || '0F172A',
        font: WORD_TEMPLATE_FONT,
      }),
    ],
  });
}

function createWordCell(
  children: Paragraph[],
  options: { shading?: string; width?: number } = {},
) {
  return new TableCell({
    children,
    verticalAlign: VerticalAlignTable.CENTER,
    width: options.width ? { size: options.width, type: WidthType.DXA } : undefined,
    shading: options.shading ? { fill: options.shading } : undefined,
    margins: {
      top: 90,
      bottom: 90,
      left: 120,
      right: 120,
    },
  });
}

function createScheduleWordTable(data: ScheduleExportTableData) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [950, 1550, 1550, 1550, 1550, 1550],
    layout: TableLayoutType.FIXED,
    borders: {
      top: wordTableBorder,
      bottom: wordTableBorder,
      left: wordTableBorder,
      right: wordTableBorder,
      insideHorizontal: wordTableBorder,
      insideVertical: wordTableBorder,
    },
    rows: [
      new TableRow({
        tableHeader: true,
        height: { value: 720, rule: HeightRule.ATLEAST },
        children: [
          createWordCell([createWordParagraph(data.periodLabel, {
            bold: true,
            size: 24,
            alignment: AlignmentType.CENTER,
          })], {
            shading: 'AEBBCD',
            width: 950,
          }),
          ...data.days.map((day) =>
            createWordCell([createWordParagraph(day, {
              bold: true,
              size: 24,
              alignment: AlignmentType.CENTER,
            })], { shading: 'AEBBCD', width: 1550 }),
          ),
        ],
      }),
      ...data.rows.map((row) =>
        new TableRow({
          height: { value: 820, rule: HeightRule.ATLEAST },
          children: [
            createWordCell([
              createWordParagraph(row.periodLabel, {
                bold: true,
                size: 21,
                alignment: AlignmentType.CENTER,
              }),
            ], { shading: 'E8EEF5', width: 950 }),
            ...row.cells.map((cell) =>
              createWordCell(
                cell.userName
                  ? [
                      createWordParagraph(cell.userName, {
                        bold: true,
                        size: 24,
                        alignment: AlignmentType.CENTER,
                      }),
                    ]
                  : [new Paragraph({ text: '' })],
                cell.userName ? { shading: 'F7FAFF', width: 1550 } : { width: 1550 },
              ),
            ),
          ],
        }),
      ),
    ],
  });
}

function formatContact(contact: ScheduleExportContact | null) {
  return contact ? `${contact.name}：${contact.phone}` : '';
}

function createContactsWordTable(data: ScheduleExportTableData) {
  const rows = data.contactRows.length > 0
    ? data.contactRows
    : [{ left: null, right: null }];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [4350, 4350],
    layout: TableLayoutType.FIXED,
    borders: {
      top: wordTableBorder,
      bottom: wordTableBorder,
      left: wordTableBorder,
      right: wordTableBorder,
      insideHorizontal: wordTableBorder,
      insideVertical: wordTableBorder,
    },
    rows: rows.map((row) =>
      new TableRow({
        children: [
          createWordCell([createWordParagraph(formatContact(row.left), { size: 20 })], { width: 4350 }),
          createWordCell([createWordParagraph(formatContact(row.right), { size: 20 })], { width: 4350 }),
        ],
      }),
    ),
  });
}

export function createScheduleWordDocument(
  schedule: Schedule[],
  users: User[],
  phoneMap: Map<string, string> = new Map(),
  language: ScheduleExportLanguage = 'zh',
  exportDate: Date = new Date(),
) {
  const data = buildScheduleExportTableData(schedule, users, phoneMap, language, exportDate);
  const wordDocument = new Document({
    title: data.title,
    creator: 'IBC Scheduler',
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: data.title,
                bold: true,
                size: 48,
                font: WORD_TEMPLATE_FONT,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: data.updatedAtLabel,
                size: 20,
                font: WORD_TEMPLATE_FONT,
              }),
            ],
          }),
          createScheduleWordTable(data),
          new Paragraph({
            spacing: { before: 420, after: 180 },
            children: [
              new TextRun({
                text: data.contactsTitle,
                bold: true,
                size: 28,
                font: WORD_TEMPLATE_FONT,
              }),
            ],
          }),
          createContactsWordTable(data),
        ],
      },
    ],
  });

  return wordDocument;
}

export async function exportScheduleToWord(
  schedule: Schedule[],
  users: User[],
  phoneMap: Map<string, string> = new Map(),
  filename: string = 'schedule.docx',
  language: ScheduleExportLanguage = 'zh',
): Promise<void> {
  const wordDocument = createScheduleWordDocument(schedule, users, phoneMap, language);
  const blob = await Packer.toBlob(wordDocument);
  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export function buildWeeklyScheduleOverview(
  schedule: Schedule[],
  users: User[]
): WeeklyScheduleOverviewData {
  const userMap = new Map(users.map((user) => [user.id, user]));
  const scheduleMap = new Map<string, Schedule>(
    schedule
      .filter((item) => item.dayOfWeek >= 0 && item.dayOfWeek <= 4 && item.period >= 1 && item.period <= 8)
      .map((item) => [`${item.dayOfWeek}-${item.period}`, item] as const),
  );

  const cells: WeeklyScheduleGridCell[] = [];
  const participantIds = new Set<string>();

  for (let period = 1; period <= 8; period += 1) {
    for (let dayOfWeek = 0; dayOfWeek < 5; dayOfWeek += 1) {
      const key = `${dayOfWeek}-${period}`;
      const assignment = scheduleMap.get(key);
      const user = assignment ? userMap.get(assignment.userId) : undefined;
      const userName = assignment ? user?.name || '未知' : '';

      if (assignment) {
        participantIds.add(assignment.userId);
      }

      cells.push({
        key,
        dayOfWeek,
        period,
        assigned: Boolean(assignment),
        userId: assignment?.userId || null,
        userName,
        userInitial: userName ? userName.charAt(0) : '',
      });
    }
  }

  return {
    cells,
    assignedSlotsCount: scheduleMap.size,
    participantCount: participantIds.size,
  };
}

export interface UpcomingShift {
  userName: string;
  day: number;
  dayName: string;
  period: number;
  timeUntil: string;
}

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;

export function getUpcomingShifts(
  schedule: Schedule[],
  users: User[],
  hoursAhead: number = 24
): UpcomingShift[] {
  const now = new Date();
  const upcoming: UpcomingShift[] = [];
  
  schedule.forEach(item => {
    const nextShiftDate = getNextShiftDate(item.dayOfWeek, item.period);
    const hoursUntil = (nextShiftDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntil > 0 && hoursUntil <= hoursAhead) {
      const user = users.find(u => u.id === item.userId);
      upcoming.push({
        userName: user?.name || 'Unknown',
        day: item.dayOfWeek,
        dayName: DAYS[item.dayOfWeek] || 'Unknown',
        period: item.period,
        timeUntil: formatTimeUntil(hoursUntil),
      });
    }
  });
  
  return upcoming.sort((a, b) => {
    const dateA = getNextShiftDate(a.day, a.period);
    const dateB = getNextShiftDate(b.day, b.period);
    return dateA.getTime() - dateB.getTime();
  });
}

function getNextShiftDate(dayOfWeek: number, period: number): Date {
  const now = new Date();
  const result = new Date(now);
  
  // Adjust for Monday = 0 in our system, Sunday = 0 in Date
  const currentDay = now.getDay();
  const adjustedCurrent = currentDay === 0 ? 7 : currentDay; // Convert Sunday=0 to Sunday=7
  const daysUntil = (dayOfWeek - adjustedCurrent + 7) % 7 || 7;
  
  result.setDate(now.getDate() + daysUntil);
  result.setHours(8 + period, 0, 0, 0);
  
  return result;
}

function formatTimeUntil(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${Math.round(hours)} hours`;
  return `${Math.round(hours / 24)} days`;
}

// Enhanced CSV Export with statistics
export function exportScheduleToCSV(
  schedule: Schedule[],
  users: User[],
  filename: string = 'schedule.csv'
) {
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || '未知';
  };

  const days = ['周一', '周二', '周三', '周四', '周五'];
  const periods = [
    { num: 1, label: '第一節', time: '08:00-09:00' },
    { num: 2, label: '第二節', time: '09:00-10:00' },
    { num: 3, label: '第三節', time: '10:00-11:00' },
    { num: 4, label: '第四節', time: '11:00-12:00' },
    { num: 5, label: '第五節', time: '13:00-14:00' },
    { num: 6, label: '第六節', time: '14:00-15:00' },
    { num: 7, label: '第七節', time: '15:00-16:00' },
    { num: 8, label: '第八節', time: '16:00-17:00' },
  ];

  // Build CSV content
  const header = ['時段', ...days, '備註'];
  const rows: string[][] = [header];

  periods.forEach((period) => {
    const row: string[] = [`${period.label} (${period.time})`];
    
    [0, 1, 2, 3, 4].forEach(day => {
      const assignment = schedule.find(
        s => s.dayOfWeek === day && s.period === period.num
      );
      row.push(assignment ? getUserName(assignment.userId) : '-');
    });
    
    row.push('');
    rows.push(row);
  });

  // Add statistics at the bottom
  rows.push([]);
  rows.push(['=== 統計 ===']);
  rows.push(['姓名', '值班時段數']);
  
  const hoursMap = new Map<string, number>();
  schedule.forEach(item => {
    const current = hoursMap.get(item.userId) || 0;
    hoursMap.set(item.userId, current + 1);
  });
  
  users.forEach(user => {
    const hours = hoursMap.get(user.id) || 0;
    if (hours > 0) {
      rows.push([user.name, hours.toString()]);
    }
  });

  const csvContent = rows.map(row => 
    row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  
  // Download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
