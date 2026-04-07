import type { OpenApiClient } from "./request.js";

export interface MeetingSettings {
  password?: string;
  enable_waiting_room?: boolean;
  allow_enter_before_host?: boolean;
  remind_scope?: 1 | 2 | 3 | 4;
  enable_enter_mute?: 0 | 1 | 2;
  enable_screen_watermark?: boolean;
  hosts?: {
    userid?: string[];
  };
  ring_users?: {
    userid?: string[];
  };
  [key: string]: unknown;
}

export interface MeetingReminders {
  is_repeat?: 0 | 1;
  repeat_type?: 0 | 1 | 2 | 7;
  repeat_until?: number;
  repeat_interval?: number;
  remind_before?: number[];
  [key: string]: unknown;
}

export interface CreateMeetingParams {
  admin_userid: string;
  title: string;
  meeting_start: number;
  meeting_duration: number;
  description?: string;
  location?: string;
  agentid?: number;
  invitees?: {
    userid?: string[];
  };
  settings?: MeetingSettings;
  cal_id?: string;
  reminders?: MeetingReminders;
  [key: string]: unknown;
}

export interface CreateMeetingResult {
  errcode: number;
  errmsg: string;
  meetingid: string;
  excess_users?: string[];
}

export interface UpdateMeetingParams {
  meetingid: string;
  title?: string;
  meeting_start?: number;
  meeting_duration?: number;
  description?: string;
  location?: string;
  remind_time?: number;
  agentid?: number;
  invitees?: {
    userid?: string[];
  };
  settings?: MeetingSettings;
  cal_id?: string;
  reminders?: MeetingReminders;
  [key: string]: unknown;
}

export interface CancelMeetingParams {
  meetingid: string;
  [key: string]: unknown;
}

export interface GetMeetingInfoParams {
  meetingid: string;
  [key: string]: unknown;
}

export interface MeetingAttendee {
  userid: string;
  status: 1 | 2;
  first_join_time?: number;
  last_quit_time?: number;
  total_join_count?: number;
  cumulative_time?: number;
}

export interface MeetingTmpExternalUser {
  tmp_external_userid: string;
  status: 1 | 2;
  first_join_time?: number;
  last_quit_time?: number;
  total_join_count?: number;
  cumulative_time?: number;
}

export interface MeetingAttendees {
  member?: MeetingAttendee[];
  tmp_external_user?: MeetingTmpExternalUser[];
}

export interface GetMeetingInfoResult {
  errcode: number;
  errmsg: string;
  admin_userid: string;
  title: string;
  meeting_start: number;
  meeting_duration: number;
  description?: string;
  location?: string;
  main_department?: number;
  status: 1 | 2 | 3 | 4 | 5;
  agentid?: number;
  attendees?: MeetingAttendees;
  settings?: MeetingSettings;
  cal_id?: string;
  reminders?: MeetingReminders;
  meeting_code?: string;
  meeting_link?: string;
}

export interface ListUserMeetingsParams {
  userid: string;
  cursor?: string;
  begin_time?: number;
  end_time?: number;
  limit?: number;
  [key: string]: unknown;
}

export interface ListUserMeetingsResult {
  errcode: number;
  errmsg: string;
  next_cursor?: string;
  meetingid_list?: string[];
}

export function createMeetingApi(client: OpenApiClient) {
  return {
    async create(params: CreateMeetingParams): Promise<CreateMeetingResult> {
      return client.request<CreateMeetingResult>("meeting/create", params);
    },

    async update(params: UpdateMeetingParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("meeting/update", params);
    },

    async cancel(params: CancelMeetingParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("meeting/cancel", params);
    },

    async getInfo(params: GetMeetingInfoParams): Promise<GetMeetingInfoResult> {
      return client.request<GetMeetingInfoResult>("meeting/get_info", params);
    },

    async listUserMeetings(params: ListUserMeetingsParams): Promise<ListUserMeetingsResult> {
      return client.request<ListUserMeetingsResult>("meeting/get_user_meetingid", params);
    },
  };
}

export type MeetingApi = ReturnType<typeof createMeetingApi>;