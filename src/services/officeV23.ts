// v23 office tools: AGM (attendance, quorum, resolution votes, minutes), asset register, committee tasks.
import { apiClient as client } from './api';
import type { Portal } from './records';

async function get<T>(url: string): Promise<T> {
  const { data } = await client.get(url);
  return data.data as T;
}

async function send<T>(method: 'post' | 'put' | 'delete', url: string, body?: unknown): Promise<T> {
  const { data } = method === 'delete' ? await client.delete(url) : await client[method](url, body ?? {});
  return data.data as T;
}

export type VoteChoice = 'FOR' | 'AGAINST' | 'ABSTAIN';

export interface AgmResolution {
  id: string;
  itemNo: number;
  title: string;
  details?: string | null;
  proposedBy?: string | null;
  secondedBy?: string | null;
  status: 'DRAFT' | 'OPEN' | 'PASSED' | 'REJECTED';
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  myVote?: VoteChoice | null;
}

export interface AgmAttendanceRow {
  flatId: string;
  flatNumber: string;
  name?: string | null;
  present: boolean;
  proxyName?: string | null;
}

export interface AgmView {
  meetingId: string;
  title: string;
  status: string;
  meetingType: 'GENERAL' | 'AGM' | 'SGM';
  quorumPercent: number;
  totalFlats: number;
  presentFlats: number;
  quorumNeeded: number;
  quorumMet: boolean;
  minutes?: string | null;
  canManage: boolean;
  canVote: boolean;
  attendance?: AgmAttendanceRow[];
  resolutions: AgmResolution[];
}

export const fetchAgm = (portal: Portal, meetingId: string) => get<AgmView>(`/${portal}/meetings/${meetingId}/agm`);
export const setupAgm = (meetingId: string, meetingType: string, quorumPercent: number) =>
  send<AgmView>('put', `/society/meetings/${meetingId}/agm`, { meetingType, quorumPercent });
export const markAgmAttendance = (meetingId: string, flatId: string, present: boolean, proxyName?: string) =>
  send<AgmView>('post', `/society/meetings/${meetingId}/attendance`, { flatId, present, proxyName });
export const addAgmResolution = (
  meetingId: string,
  input: { title: string; details?: string; proposedBy?: string; secondedBy?: string }
) => send<AgmView>('post', `/society/meetings/${meetingId}/resolutions`, input);
export const openAgmResolution = (id: string) => send<AgmView>('post', `/society/resolutions/${id}/open`);
export const closeAgmResolution = (id: string) => send<AgmView>('post', `/society/resolutions/${id}/close`);
export const voteAgmResolution = (id: string, choice: VoteChoice) =>
  send<AgmView>('post', `/member/resolutions/${id}/vote`, { choice });
export const saveAgmMinutes = (meetingId: string, minutes: string) =>
  send<AgmView>('put', `/society/meetings/${meetingId}/minutes`, { minutes });
export const minutesPdfPath = (portal: Portal, meetingId: string) => `/${portal}/meetings/${meetingId}/minutes.pdf`;

export interface AssetRow {
  id: string;
  name: string;
  category: string;
  location?: string | null;
  purchaseDate?: string | null;
  purchaseValue?: number | null;
  vendor?: string | null;
  amcVendor?: string | null;
  amcEndDate?: string | null;
  serviceEveryDays?: number | null;
  nextServiceDate?: string | null;
  notes?: string | null;
  alert?: string | null;
  services?: { id: string; serviceDate: string; cost?: number | null; doneBy?: string | null; notes?: string | null }[];
}

export interface AssetList {
  items: AssetRow[];
  dueSoon: number;
  totalValue: number;
  canManage: boolean;
}

export type AssetInput = Partial<Omit<AssetRow, 'id' | 'alert' | 'services'>> & { name: string; category: string };

export const fetchAssets = () => get<AssetList>('/society/assets');
export const fetchAsset = (id: string) => get<AssetRow>(`/society/assets/${id}`);
export const createAsset = (input: AssetInput) => send<AssetRow>('post', '/society/assets', input);
export const updateAsset = (id: string, input: AssetInput) => send<AssetRow>('put', `/society/assets/${id}`, input);
export const removeAsset = (id: string) => send<AssetList>('delete', `/society/assets/${id}`);
export const addAssetService = (id: string, input: { serviceDate?: string; cost?: string; doneBy?: string; notes?: string }) =>
  send<AssetRow>('post', `/society/assets/${id}/services`, input);

export interface CommitteeTask {
  id: string;
  title: string;
  details?: string | null;
  assigneeUserId?: string | null;
  assigneeName?: string | null;
  dueDate?: string | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  overdue: boolean;
  mine: boolean;
  createdByName?: string | null;
}

export interface TaskList {
  items: CommitteeTask[];
  open: number;
  overdue: number;
  people: { userId: string; name: string; role: string }[];
  canManage: boolean;
}

export interface TaskInput {
  title: string;
  details?: string;
  assigneeUserId?: string | null;
  dueDate?: string | null;
  priority?: string;
}

export const fetchTasks = () => get<TaskList>('/society/tasks');
export const createTask = (input: TaskInput) => send<TaskList>('post', '/society/tasks', input);
export const updateTask = (id: string, input: TaskInput) => send<TaskList>('put', `/society/tasks/${id}`, input);
export const setTaskStatus = (id: string, status: CommitteeTask['status']) =>
  send<TaskList>('put', `/society/tasks/${id}/status`, { status });
export const deleteTask = (id: string) => send<TaskList>('delete', `/society/tasks/${id}`);
