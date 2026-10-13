// Meetings and Digital Tharav API calls. Office screens use /society/..., member screens /member/...;
// the backend checks the role and society on every call.
import { apiClient as client } from './api';

export type Portal = 'member' | 'society';

export interface RecordFile {
  id: string;
  name: string;
  contentType: string;
  page: number;
  uploadedAt?: string;
}

export interface MeetingSummary {
  id: string;
  title: string;
  meetingDate: string;
  meetingTime: string;
  location?: string | null;
  onlineLink?: string | null;
  agenda: string;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
  createdByName?: string | null;
}

export interface MeetingDetail extends MeetingSummary {
  description?: string | null;
  cancelReason?: string | null;
  files: RecordFile[];
  canManage: boolean;
  tharavs: { id: string; tharavNumber?: number | null; title: string; status: string }[];
}

export interface MeetingInput {
  title: string;
  meetingDate: string;
  meetingTime: string;
  location?: string;
  onlineLink?: string;
  agenda: string;
  description?: string;
}

export interface TharavSummary {
  id: string;
  tharavNumber?: number | null;
  title: string;
  summary?: string | null;
  category?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED';
  resolutionDate: string;
  meetingDate?: string | null;
  publishedAt?: string | null;
  acknowledgeBy?: string | null;
  myStatus?: 'NOT_OPENED' | 'OPENED' | 'SIGNED';
  eligibleCount?: number;
  openedCount?: number;
  signedCount?: number;
}

export interface TharavTrackingMember {
  memberId: string;
  memberName: string;
  flatNumber: string;
  status: 'NOT_OPENED' | 'OPENED' | 'SIGNED';
  openedAt?: string | null;
  signedAt?: string | null;
  hasSignature: boolean;
}

export interface TharavDetail extends TharavSummary {
  fullText?: string | null;
  files: RecordFile[];
  createdByName?: string;
  publishedByName?: string | null;
  meeting?: { id: string; title: string; meetingDate: string };
  supersedes?: { id: string; title: string; tharavNumber: number };
  supersededBy?: { id: string; title: string; tharavNumber: number };
  canEdit?: boolean;
  canPublish?: boolean;
  canAmend?: boolean;
  tracking?: {
    eligibleCount: number;
    openedCount: number;
    signedCount: number;
    pendingCount: number;
    notOpenedCount: number;
    members: TharavTrackingMember[];
  };
  statement?: string;
  canSign?: boolean;
  signNote?: string | null;
  signedAt?: string | null;
  memberId?: string | null;
}

export interface TharavInput {
  title: string;
  meetingId?: string | null;
  meetingDate?: string | null;
  resolutionDate: string;
  summary?: string;
  fullText?: string;
  category?: string;
  acknowledgeBy?: string | null;
  supersedesId?: string | null;
}

export interface Paged<T> {
  items: T[];
  page: number;
  totalItems: number;
  totalPages: number;
  canManage?: boolean;
  canCreate?: boolean;
  canPublish?: boolean;
}

export interface HistoryEntry {
  id: string;
  action: string;
  actorLabel?: string;
  summary?: string;
  createdAt: string;
}

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await client.get(url, { params });
  return data.data as T;
}
async function send<T>(method: 'post' | 'put' | 'delete', url: string, body?: unknown): Promise<T> {
  const { data } = await client.request({ method, url, data: body });
  return data.data as T;
}
async function upload<T>(url: string, file: { uri: string; name: string; mimeType?: string | null }): Promise<T> {
  const form = new FormData();
  form.append('file', { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/octet-stream' } as unknown as Blob);
  const { data } = await client.post(url, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
  return data.data as T;
}

// Meetings
export const fetchMeetings = (portal: Portal, page = 0) => get<Paged<MeetingSummary>>(`/${portal}/meetings`, { page, size: 30 });
export const fetchMeeting = (portal: Portal, id: string) => get<MeetingDetail>(`/${portal}/meetings/${id}`);
export const createMeeting = (input: MeetingInput) => send<MeetingSummary>('post', '/society/meetings', input);
export const updateMeeting = (id: string, input: MeetingInput) => send<MeetingSummary>('put', `/society/meetings/${id}`, input);
export const cancelMeeting = (id: string, reason?: string) => send<MeetingSummary>('put', `/society/meetings/${id}/cancel`, { reason });
export const completeMeeting = (id: string) => send<MeetingSummary>('put', `/society/meetings/${id}/complete`);
export const uploadMeetingFile = (id: string, file: { uri: string; name: string; mimeType?: string | null }) =>
  upload<{ files: RecordFile[] }>(`/society/meetings/${id}/files`, file);
export const meetingFilePath = (portal: Portal, id: string, fileId: string) => `/${portal}/meetings/${id}/files/${fileId}`;

// Tharav
export const fetchTharavs = (portal: Portal, filters: { q?: string; status?: string; category?: string } = {}, page = 0) =>
  get<Paged<TharavSummary>>(`/${portal}/tharavs`, { ...filters, page, size: 30 });
export const fetchTharav = (portal: Portal, id: string, status?: string) =>
  get<TharavDetail>(`/${portal}/tharavs/${id}`, status ? { status } : undefined);
export const createTharav = (input: TharavInput) => send<TharavDetail>('post', '/society/tharavs', input);
export const updateTharav = (id: string, input: TharavInput) => send<TharavDetail>('put', `/society/tharavs/${id}`, input);
export const deleteTharavDraft = (id: string) => send<{ id: string }>('delete', `/society/tharavs/${id}`);
export const publishTharav = (id: string) => send<TharavDetail>('put', `/society/tharavs/${id}/publish`);
export const uploadTharavFile = (id: string, file: { uri: string; name: string; mimeType?: string | null }) =>
  upload<{ files: RecordFile[] }>(`/society/tharavs/${id}/files`, file);
export const removeTharavFile = (id: string, fileId: string) => send<{ files: RecordFile[] }>('delete', `/society/tharavs/${id}/files/${fileId}`);
export const fetchTharavHistory = (id: string) => get<{ items?: HistoryEntry[]; content?: HistoryEntry[] }>(`/society/tharavs/${id}/history`);
export const signTharav = (id: string, signaturePng: string) =>
  send<{ status: string; signedAt: string; alreadySigned: boolean }>('post', `/member/tharavs/${id}/sign`, { signaturePng, readConfirmed: true });
export const tharavFilePath = (portal: Portal, id: string, fileId: string) => `/${portal}/tharavs/${id}/files/${fileId}`;
export const tharavSignaturePath = (portal: Portal, id: string, memberId: string) => `/${portal}/tharavs/${id}/signatures/${memberId}`;
