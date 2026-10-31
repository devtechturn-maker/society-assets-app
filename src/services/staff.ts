// Staff, attendance and salary API (society office only; roles enforced by the backend).
import { apiClient as client } from './api';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'WEEKLY_OFF' | 'HOLIDAY';

export interface Staff {
  id: string;
  name: string;
  designation: string;
  phone?: string | null;
  joiningDate?: string | null;
  leavingDate?: string | null;
  payType: 'MONTHLY' | 'DAILY';
  payRate: number;
  status: 'ACTIVE' | 'INACTIVE';
  hasPhoto: boolean;
  upiId?: string | null;
  bankAccountMasked?: string | null;
  bankIfsc?: string | null;
  salaries?: SalaryPayment[];
}

export interface StaffInput {
  name: string;
  designation: string;
  phone?: string;
  joiningDate?: string;
  payType: 'MONTHLY' | 'DAILY';
  payRate: string;
  upiId?: string;
  bankAccount?: string;
  bankIfsc?: string;
}

export interface DaySheet {
  date: string;
  weeklyOff: boolean;
  canEdit: boolean;
  staff: { staffId: string; name: string; designation: string; status: AttendanceStatus | null; note?: string | null }[];
}

export interface MonthReportRow {
  staffId: string;
  name: string;
  designation: string;
  present: number;
  absent: number;
  halfDays: number;
  leave: number;
  weeklyOff: number;
  holidays: number;
  unmarked: number;
}

export interface SalaryBreakdown {
  staffId: string;
  name: string;
  designation: string;
  month: string;
  payType: 'MONTHLY' | 'DAILY';
  payRate: number;
  workingDays: number;
  dailyRate: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  weeklyOffDays: number;
  holidayDays: number;
  unmarkedDays: number;
  daysBeforeJoining: number;
  baseAmount: number;
  attendanceDeduction: number;
  allowances: number;
  otherDeductions: number;
  netAmount: number;
  monthComplete: boolean;
  canRecord: boolean;
  payment?: SalaryPayment;
}

export interface SalaryPayment {
  id: string;
  staffId: string;
  staffName: string;
  designation: string;
  month: string;
  baseAmount: number;
  attendanceDeduction: number;
  allowances: number;
  otherDeductions: number;
  netAmount: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  paymentMethod: string;
  paymentReference?: string | null;
  paidOn: string;
  status: string;
  expenseId?: string | null;
  recordedByName: string;
  recordedAt: string;
  note?: string | null;
}

export interface SalaryPolicy {
  weeklyOffDay: string;
  paidLeaveDays: number;
  halfDayDeduction: number;
  holidaysPaid: boolean;
  deductUnmarkedDays: boolean;
  saved: boolean;
}

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await client.get(url, { params });
  return data.data as T;
}
async function send<T>(method: 'post' | 'put', url: string, body: unknown): Promise<T> {
  const { data } = await client.request({ method, url, data: body });
  return data.data as T;
}

export const fetchStaff = () => get<Staff[]>('/society/staff');
export const fetchStaffMember = (id: string) => get<Staff>(`/society/staff/${id}`);
export const createStaff = (input: StaffInput) => send<Staff>('post', '/society/staff', input);
export const updateStaff = (id: string, input: StaffInput) => send<Staff>('put', `/society/staff/${id}`, input);
/** `leavingDate` (YYYY-MM-DD) is the last working day when marking inactive; pay stops after it. */
export const setStaffActive = (id: string, active: boolean, leavingDate?: string) =>
  send<Staff>('put', `/society/staff/${id}/status`, leavingDate ? { active, leavingDate } : { active });
export const fetchDaySheet = (date?: string) => get<DaySheet>('/society/staff/attendance', date ? { date } : undefined);
export const saveDaySheet = (date: string, entries: { staffId: string; status: AttendanceStatus }[]) =>
  send<{ saved: number; corrected: number }>('put', '/society/staff/attendance', { date, entries });
export const fetchMonthReport = (month: string) => get<{ month: string; staff: MonthReportRow[] }>('/society/staff/attendance/report', { month });
export const fetchSalary = (staffId: string, month: string, allowances?: number, otherDeductions?: number) =>
  get<SalaryBreakdown>(`/society/staff/${staffId}/salary`, { month, allowances, otherDeductions });
export const recordSalary = (
  staffId: string,
  body: { month: string; confirmedAmount: number; allowances: number; otherDeductions: number; paymentMethod: string; paymentReference?: string; paidOn?: string; note?: string }
) => send<SalaryPayment>('post', `/society/staff/${staffId}/salary`, body);
export const fetchSalaryHistory = (month?: string) => get<SalaryPayment[]>('/society/staff/salaries', month ? { month } : undefined);
export const fetchSalaryPolicy = () => get<SalaryPolicy>('/society/staff/salary-policy');
export const saveSalaryPolicy = (p: Omit<SalaryPolicy, 'saved'>) => send<SalaryPolicy>('put', '/society/staff/salary-policy', p);
