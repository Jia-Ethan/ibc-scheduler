import type { Schedule, User, UserProfile } from '../types';

const TEMPLATE_URL = `${import.meta.env.BASE_URL}subsidy-template.xlsx`;
export const HOURLY_RATE = 23.7;
export const MAX_STANDARD_HOURS = 30;
export const MAX_STANDARD_AMOUNT = Math.round(HOURLY_RATE * MAX_STANDARD_HOURS);
const DATA_START_ROW = 6;
const TOTAL_LABEL = '合计：';

export interface SubsidyRow {
  userId: string;
  name: string;
  studentId: string;
  department: string;
  major: string;
  studentType: string;
  grade: string;
  hours: number;
  amount: number;
  requiresNote: boolean;
  missingFields: string[];
}

export interface EditableSubsidyRow extends SubsidyRow {
  systemHours: number;
  source: 'schedule' | 'manual';
}

export type SubsidyRecordStatus = 'draft' | 'exported';
export type SubsidyRecordSourceType = 'schedule' | 'record_copy';

export interface SubsidyRecord {
  id: string;
  status: SubsidyRecordStatus;
  sourceType: SubsidyRecordSourceType;
  recordMonth: string;
  monthStart: string;
  monthEnd: string;
  preparerName: string;
  preparerPhone: string;
  preparedDate: string;
  rows: EditableSubsidyRow[];
  overLimitNotes: Record<string, string>;
  totalHours: number;
  totalAmount: number;
  exportedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubsidyExportOptions {
  preparerName: string;
  preparerPhone: string;
  preparedDate: string;
  overLimitNotes: Record<string, string>;
  filename?: string;
}

type PartialProfile = Partial<UserProfile>;

const SUBSIDY_PROFILE_SEEDS: Record<string, PartialProfile> = {
  '毛紫薇': {
    studentId: '20233502092',
    department: '国际商学院',
    major: '网络与新媒体',
    studentType: '本科',
    grade: '2023',
  },
  '李贤': {
    studentId: '20233501037',
    department: '国际商学院',
    major: '文化产业管理',
    studentType: '本科',
    grade: '2023',
  },
  '廖诚俊': {
    studentId: '20233503058',
    department: '国际商学院',
    major: '网络与新媒体',
    studentType: '本科',
    grade: '2023',
  },
  '曾心越': {
    studentId: '20233637045',
    department: '国际商学院',
    major: '金融学（中外合作办学）',
    studentType: '本科',
    grade: '2023',
  },
};

const REQUIRED_FIELDS: Array<keyof Pick<
  UserProfile,
  'studentId' | 'department' | 'major' | 'studentType' | 'grade'
>> = ['studentId', 'department', 'major', 'studentType', 'grade'];

function cleanText(value?: string): string {
  return value?.trim() || '';
}

export function calculateSubsidyAmount(hours: number): number {
  return Number((hours * HOURLY_RATE).toFixed(2));
}

export function validateApprovedHours(hours: number): string | null {
  if (!Number.isFinite(hours)) {
    return 'invalid';
  }

  if (hours < 0) {
    return 'negative';
  }

  if (hours > MAX_STANDARD_HOURS) {
    return 'over_limit';
  }

  return null;
}

export function createEditableSubsidyRow(row: SubsidyRow): EditableSubsidyRow {
  const amount = calculateSubsidyAmount(row.hours);
  return {
    ...row,
    systemHours: row.hours,
    amount,
    requiresNote: amount > MAX_STANDARD_AMOUNT,
    source: 'schedule',
  };
}

export function createManualEditableSubsidyRow(
  user: User,
  profiles: Map<string, UserProfile>,
): EditableSubsidyRow {
  const profile = mergeUserProfileWithSeed(user, profiles.get(user.id));
  return {
    userId: user.id,
    name: user.name,
    studentId: cleanText(profile.studentId),
    department: cleanText(profile.department),
    major: cleanText(profile.major),
    studentType: cleanText(profile.studentType),
    grade: cleanText(profile.grade),
    systemHours: 0,
    hours: 0,
    amount: 0,
    requiresNote: false,
    missingFields: getMissingSubsidyFields(profile),
    source: 'manual',
  };
}

export function updateEditableSubsidyRowHours(
  row: EditableSubsidyRow,
  hours: number,
): EditableSubsidyRow {
  const normalizedHours = Number(hours.toFixed(1));
  const amount = calculateSubsidyAmount(normalizedHours);
  return {
    ...row,
    hours: normalizedHours,
    amount,
    requiresNote: amount > MAX_STANDARD_AMOUNT,
  };
}

export function calculateSubsidyTotals(
  rows: Array<Pick<EditableSubsidyRow, 'hours' | 'amount'>>,
): { totalHours: number; totalAmount: number } {
  return {
    totalHours: Number(rows.reduce((sum, row) => sum + row.hours, 0).toFixed(1)),
    totalAmount: Number(rows.reduce((sum, row) => sum + row.amount, 0).toFixed(2)),
  };
}

export function getRecordMonth(referenceDate: Date = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getSubsidyRecordPeriod(referenceDate: Date = new Date()): {
  recordMonth: string;
  monthStart: string;
  monthEnd: string;
} {
  const { start, end } = getMonthlyRange(referenceDate);
  return {
    recordMonth: getRecordMonth(referenceDate),
    monthStart: formatDateInputValue(start),
    monthEnd: formatDateInputValue(end),
  };
}

export function getMonthlyRange(referenceDate: Date = new Date()) {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  return { start, end };
}

export function getDefaultSubsidyFilename(referenceDate: Date = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}_补助明细表.xlsx`;
}

export function getDefaultPreparedDate(referenceDate: Date = new Date()): string {
  return formatDateInputValue(referenceDate);
}

export function mergeUserProfileWithSeed(user: User, profile?: UserProfile): UserProfile {
  const seed = SUBSIDY_PROFILE_SEEDS[user.name] || {};
  return {
    id: user.id,
    phone: cleanText(profile?.phone || seed.phone),
    studentId: cleanText(profile?.studentId || seed.studentId),
    department: cleanText(profile?.department || seed.department),
    major: cleanText(profile?.major || seed.major),
    studentType: cleanText(profile?.studentType || seed.studentType),
    grade: cleanText(profile?.grade || seed.grade),
    updatedAt: profile?.updatedAt,
  };
}

export function restoreEditableSubsidyRows(rows: EditableSubsidyRow[]): EditableSubsidyRow[] {
  return rows.map((row) => {
    const normalizedHours = Number.isFinite(row.hours) ? Number(row.hours.toFixed(1)) : 0;
    const normalizedSystemHours = Number.isFinite(row.systemHours)
      ? Number(row.systemHours.toFixed(1))
      : 0;
    const amount = calculateSubsidyAmount(normalizedHours);

    return {
      userId: row.userId,
      name: cleanText(row.name),
      studentId: cleanText(row.studentId),
      department: cleanText(row.department),
      major: cleanText(row.major),
      studentType: cleanText(row.studentType),
      grade: cleanText(row.grade),
      hours: normalizedHours,
      systemHours: normalizedSystemHours,
      amount,
      requiresNote: amount > MAX_STANDARD_AMOUNT,
      missingFields: Array.isArray(row.missingFields) ? row.missingFields.filter(Boolean) : [],
      source: row.source === 'manual' ? 'manual' : 'schedule',
    };
  });
}

export function getMissingSubsidyFields(profile?: UserProfile): string[] {
  return REQUIRED_FIELDS.filter((field) => !cleanText(profile?.[field]));
}

function getMonthWeekdayCounts(referenceDate: Date): Map<number, number> {
  const { start, end } = getMonthlyRange(referenceDate);
  const counts = new Map<number, number>([
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
  ]);

  for (const day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    const weekday = day.getDay();
    if (weekday >= 1 && weekday <= 5) {
      counts.set(weekday - 1, (counts.get(weekday - 1) || 0) + 1);
    }
  }

  return counts;
}

export function calculateMonthlySubsidyRows(
  schedule: Schedule[],
  users: User[],
  profiles: Map<string, UserProfile>,
  referenceDate: Date = new Date(),
): SubsidyRow[] {
  const weekdayCounts = getMonthWeekdayCounts(referenceDate);
  const hoursByUser = new Map<string, number>();

  schedule.forEach((item) => {
    const recurringCount = weekdayCounts.get(item.dayOfWeek) || 0;
    if (!recurringCount) {
      return;
    }

    hoursByUser.set(item.userId, (hoursByUser.get(item.userId) || 0) + recurringCount);
  });

  return users
    .map((user) => {
      const hours = hoursByUser.get(user.id) || 0;
      if (hours <= 0) {
        return null;
      }

      const profile = mergeUserProfileWithSeed(user, profiles.get(user.id));
      const amount = calculateSubsidyAmount(hours);

      return {
        userId: user.id,
        name: user.name,
        studentId: cleanText(profile.studentId),
        department: cleanText(profile.department),
        major: cleanText(profile.major),
        studentType: cleanText(profile.studentType),
        grade: cleanText(profile.grade),
        hours,
        amount,
        requiresNote: amount > MAX_STANDARD_AMOUNT,
        missingFields: getMissingSubsidyFields(profile),
      } satisfies SubsidyRow;
    })
    .filter((row): row is SubsidyRow => row !== null);
}

function formatPreparedDate(preparedDate: string): string {
  const [year, month, day] = preparedDate.split('-');
  if (!year || !month || !day) {
    const fallback = new Date();
    return `${fallback.getFullYear()}年${fallback.getMonth() + 1}月${fallback.getDate()}日`;
  }

  return `${Number(year)}年${Number(month)}月${Number(day)}日`;
}

type RichTextSegment = {
  text: string;
  font?: {
    bold?: boolean;
    underline?: boolean;
    size?: number;
    name?: string;
    charset?: number;
  };
};

function buildReasonRichText(referenceDate: Date): { richText: RichTextSegment[] } {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1;

  return {
    richText: [
      { text: '发放事由：' },
      {
        font: { bold: true, underline: true, size: 14, name: '宋体', charset: 134 },
        text: String(year),
      },
      {
        font: { bold: true, size: 14, name: '宋体', charset: 134 },
        text: '年',
      },
      {
        font: { bold: true, underline: true, size: 14, name: '宋体', charset: 134 },
        text: String(month),
      },
      {
        font: { bold: true, size: 14, name: '宋体', charset: 134 },
        text: '月 ',
      },
      {
        font: { bold: true, size: 14, name: '宋体-简', charset: 134 },
        text: '☑',
      },
      {
        font: { bold: true, size: 14, name: '宋体', charset: 134 },
        text: '管理工作助理 ',
      },
      {
        font: { bold: true, size: 14, name: 'Wingdings', charset: 134 },
        text: '¨',
      },
      {
        font: { bold: true, size: 14, name: '宋体', charset: 134 },
        text: '学生兼职辅导员 ',
      },
      {
        font: { bold: true, size: 14, name: 'Wingdings', charset: 134 },
        text: '¨',
      },
      {
        font: { bold: true, size: 14, name: '宋体', charset: 134 },
        text: '教学助理 ',
      },
      {
        font: { bold: true, size: 14, name: 'Wingdings', charset: 134 },
        text: '¨',
      },
      {
        font: { bold: true, size: 14, name: '宋体', charset: 134 },
        text: '科研助理   ',
      },
      {
        font: { bold: true, size: 14, name: 'Wingdings', charset: 134 },
        text: '¨',
      },
      {
        font: { bold: true, size: 14, name: '宋体', charset: 134 },
        text: '临时岗位（名称）：',
      },
      {
        font: { bold: true, underline: true, size: 14, name: '宋体', charset: 134 },
        text: '                   ',
      },
      {
        font: { bold: true, size: 14, name: '宋体', charset: 134 },
        text: '                                                   ',
      },
    ],
  };
}

function cloneRichTextSegments(segments: RichTextSegment[]): RichTextSegment[] {
  return segments.map((segment) => ({
    ...segment,
    font: segment.font ? { ...segment.font } : undefined,
  }));
}

function buildReasonValue(templateValue: unknown, referenceDate: Date): { richText: RichTextSegment[] } {
  if (
    templateValue &&
    typeof templateValue === 'object' &&
    'richText' in templateValue &&
    Array.isArray(templateValue.richText)
  ) {
    const richText = cloneRichTextSegments(templateValue.richText as RichTextSegment[]);
    if (richText[1]) {
      richText[1].text = String(referenceDate.getFullYear());
    }
    if (richText[3]) {
      richText[3].text = String(referenceDate.getMonth() + 1);
    }
    return { richText };
  }

  return buildReasonRichText(referenceDate);
}

function findTotalRow(worksheet: { rowCount: number; getCell: (ref: string) => { value: unknown } }): number {
  for (let row = DATA_START_ROW; row <= worksheet.rowCount + 5; row += 1) {
    const value = worksheet.getCell(`A${row}`).value?.toString() || '';
    if (value.includes(TOTAL_LABEL)) {
      return row;
    }
  }

  throw new Error('未找到补助模板中的合计行');
}

function clearDataRow(
  worksheet: { getCell: (row: number, col: number) => { value: unknown } },
  rowNumber: number,
) {
  for (let col = 1; col <= 10; col += 1) {
    worksheet.getCell(rowNumber, col).value = col === 10 ? '' : null;
  }
}

export async function exportSubsidyDetailsToExcel(
  rows: SubsidyRow[],
  options: SubsidyExportOptions,
  referenceDate: Date = new Date(),
) {
  const ExcelJS = await import('exceljs');
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) {
    throw new Error('无法加载补助明细模板');
  }

  const workbook = new ExcelJS.Workbook();
  const buffer = await response.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('补助明细模板缺少工作表');
  }

  let totalRow = findTotalRow(worksheet);
  const baseCapacity = totalRow - DATA_START_ROW;
  if (rows.length > baseCapacity) {
    const extraRows = rows.length - baseCapacity;
    worksheet.duplicateRow(totalRow - 1, extraRows, true);
    totalRow += extraRows;
  }

  const footerRow = totalRow + 1;
  const reasonCell = worksheet.getCell('A4');
  reasonCell.value = buildReasonValue(reasonCell.value, referenceDate);

  for (let rowNumber = DATA_START_ROW; rowNumber < totalRow; rowNumber += 1) {
    clearDataRow(worksheet, rowNumber);
  }

  rows.forEach((row, index) => {
    const rowNumber = DATA_START_ROW + index;
    worksheet.getCell(`A${rowNumber}`).value = index + 1;
    worksheet.getCell(`B${rowNumber}`).value = row.studentId;
    worksheet.getCell(`C${rowNumber}`).value = row.name;
    worksheet.getCell(`D${rowNumber}`).value = row.hours;
    worksheet.getCell(`E${rowNumber}`).value = row.department;
    worksheet.getCell(`F${rowNumber}`).value = row.major;
    worksheet.getCell(`G${rowNumber}`).value = row.studentType;
    worksheet.getCell(`H${rowNumber}`).value = row.grade;
    worksheet.getCell(`I${rowNumber}`).value = row.amount;
    worksheet.getCell(`J${rowNumber}`).value = options.overLimitNotes[row.userId] || '';
  });

  worksheet.getCell(`I${totalRow}`).value = { formula: `SUM(I${DATA_START_ROW}:I${totalRow - 1})` };

  worksheet.getCell(`A${footerRow}`).value =
    `设岗单位负责人签字：                制表人签字：${options.preparerName || ''}` +
    `                制表人电话：${options.preparerPhone || ''}` +
    `              制表日期：${formatPreparedDate(options.preparedDate)}`;

  const output = await workbook.xlsx.writeBuffer();
  const blob = new Blob([output], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = options.filename || getDefaultSubsidyFilename(referenceDate);
  link.click();
}
