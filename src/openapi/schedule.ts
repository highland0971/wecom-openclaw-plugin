import type { OpenApiClient } from "./request.js";

export interface CreateCalendarParams {
  calendar: {
    admins?: string[];
    set_as_default?: 0 | 1;
    summary: string;
    color: string;
    description?: string;
    shares?: Array<{
      userid: string;
      permission?: 1 | 3;
    }>;
    is_public?: 0 | 1;
    public_range?: {
      userids?: string[];
      partyids?: number[];
    };
    is_corp_calendar?: 0 | 1;
    [key: string]: unknown;
  };
  agentid?: number;
  [key: string]: unknown;
}

export interface CreateCalendarResult {
  errcode: number;
  errmsg: string;
  cal_id: string;
  fail_result?: {
    shares?: Array<{
      errcode: number;
      errmsg: string;
      userid: string;
    }>;
  };
}

export interface ScheduleAttendee {
  userid: string;
  response_status?: 0 | 1 | 2 | 3 | 4;
  [key: string]: unknown;
}

export interface ScheduleReminders {
  is_remind?: 0 | 1;
  is_repeat?: 0 | 1;
  remind_before_event_secs?: number;
  remind_time_diffs?: number[];
  repeat_type?: 0 | 1 | 2 | 5 | 7;
  repeat_until?: number;
  is_custom_repeat?: 0 | 1;
  repeat_interval?: number;
  repeat_day_of_week?: number[];
  repeat_day_of_month?: number[];
  timezone?: number;
  exclude_time_list?: Array<{
    start_time: number;
  }>;
  [key: string]: unknown;
}

export interface ScheduleInfo {
  admins?: string[];
  schedule_id?: string;
  start_time: number;
  end_time: number;
  is_whole_day?: 0 | 1;
  attendees?: ScheduleAttendee[];
  summary?: string;
  description?: string;
  reminders?: ScheduleReminders;
  location?: string;
  cal_id?: string;
  status?: number;
  sequence?: number;
  [key: string]: unknown;
}

export interface CreateScheduleParams {
  schedule: ScheduleInfo;
  agentid?: number;
  [key: string]: unknown;
}

export interface CreateScheduleResult {
  errcode: number;
  errmsg: string;
  schedule_id: string;
}

export interface UpdateScheduleParams {
  skip_attendees?: 0 | 1;
  op_mode?: 0 | 1 | 2;
  op_start_time?: number;
  schedule: ScheduleInfo;
  [key: string]: unknown;
}

export interface CancelScheduleParams {
  schedule_id: string;
  op_mode?: 0 | 1 | 2;
  op_start_time?: number;
  [key: string]: unknown;
}

export interface AddScheduleAttendeesParams {
  schedule_id: string;
  attendees: ScheduleAttendee[];
  [key: string]: unknown;
}

export interface DelScheduleAttendeesParams {
  schedule_id: string;
  attendees: ScheduleAttendee[];
  [key: string]: unknown;
}

export interface GetScheduleListByRangeParams {
  cal_id: string;
  offset?: number;
  limit?: number;
  [key: string]: unknown;
}

export interface GetScheduleDetailParams {
  schedule_id_list: string[];
  [key: string]: unknown;
}

export interface ScheduleItem {
  schedule_id: string;
  sequence?: number;
  admins?: string[];
  attendees?: ScheduleAttendee[];
  summary?: string;
  description?: string;
  reminders?: ScheduleReminders;
  location?: string;
  start_time: number;
  end_time: number;
  status?: number;
  cal_id?: string;
  is_whole_day?: 0 | 1;
  [key: string]: unknown;
}

export interface GetScheduleListByRangeResult {
  errcode: number;
  errmsg: string;
  schedule_list: ScheduleItem[];
}

export interface GetScheduleDetailResult {
  errcode: number;
  errmsg: string;
  schedule_list: ScheduleItem[];
}

export function createScheduleApi(client: OpenApiClient) {
  return {
    async createCalendar(params: CreateCalendarParams): Promise<CreateCalendarResult> {
      return client.request<CreateCalendarResult>("oa/calendar/add", params);
    },

    async getScheduleListByRange(params: GetScheduleListByRangeParams): Promise<GetScheduleListByRangeResult> {
      return client.request<GetScheduleListByRangeResult>("oa/schedule/get_by_calendar", params);
    },

    async getScheduleDetail(params: GetScheduleDetailParams): Promise<GetScheduleDetailResult> {
      return client.request<GetScheduleDetailResult>("oa/schedule/get", params);
    },

    async createSchedule(params: CreateScheduleParams): Promise<CreateScheduleResult> {
      return client.request<CreateScheduleResult>("oa/schedule/add", params);
    },

    async updateSchedule(params: UpdateScheduleParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("oa/schedule/update", params);
    },

    async cancelSchedule(params: CancelScheduleParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("oa/schedule/del", params);
    },

    async addScheduleAttendees(params: AddScheduleAttendeesParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("oa/schedule/add_attendees", params);
    },

    async delScheduleAttendees(params: DelScheduleAttendeesParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("oa/schedule/del_attendees", params);
    },
  };
}

export type ScheduleApi = ReturnType<typeof createScheduleApi>;