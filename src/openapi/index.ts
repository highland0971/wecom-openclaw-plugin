import type { RuntimeEnv } from "openclaw/plugin-sdk/runtime-env";
import { createTokenManager, type TokenManager } from "./token-manager.js";
import { createOpenApiClient, type OpenApiClient } from "./request.js";
import { createMessageApi, type MessageApi } from "./message.js";
import { createSmartsheetApi, type SmartsheetApi } from "./smartsheet.js";
import { createContactApi, type ContactApi } from "./contact.js";
import { createDocApi, type DocApi } from "./doc.js";
import { createTodoApi, type TodoApi } from "./todo.js";
import { createScheduleApi, type ScheduleApi } from "./schedule.js";
import { createMsgApi, type MsgApi } from "./msg.js";
import { createMeetingApi, type MeetingApi } from "./meeting.js";

export interface OpenApiConfig {
  getCorpId: () => string | undefined;
  getAgentId: () => number | undefined;
  getAgentSecret: () => string | undefined;
}

export interface OpenApiService {
  token: TokenManager;
  client: OpenApiClient;
  message: MessageApi;
  smartsheet: SmartsheetApi;
  contact: ContactApi;
  doc: DocApi;
  todo: TodoApi;
  schedule: ScheduleApi;
  msg: MsgApi;
  meeting: MeetingApi;
}

let openApiServiceInstance: OpenApiService | null = null;

export function createOpenApiService(config: OpenApiConfig, runtime: RuntimeEnv): OpenApiService {
  const token = createTokenManager(config.getCorpId, config.getAgentSecret, runtime);
  const client = createOpenApiClient(token);

  return {
    token,
    client,
    message: createMessageApi(client),
    smartsheet: createSmartsheetApi(client),
    contact: createContactApi(client),
    doc: createDocApi(client),
    todo: createTodoApi(client),
    schedule: createScheduleApi(client),
    msg: createMsgApi(client),
    meeting: createMeetingApi(client),
  };
}

export function initOpenApiService(config: OpenApiConfig, runtime: RuntimeEnv): OpenApiService {
  if (!openApiServiceInstance) {
    openApiServiceInstance = createOpenApiService(config, runtime);
  }
  return openApiServiceInstance;
}

export function getOpenApiService(): OpenApiService | null {
  return openApiServiceInstance;
}

export function clearOpenApiService(): void {
  if (openApiServiceInstance) {
    openApiServiceInstance.token.clearCache();
    openApiServiceInstance = null;
  }
}

export { OpenApiError } from "./request.js";
export type { MessageApi, SendMessageParams, SendMessageResult } from "./message.js";
export type { SmartsheetApi, AddViewParams, AddViewResult, ViewType, ViewProperty } from "./smartsheet.js";
export type { ContactApi, UserInfo, DepartmentInfo, CreateUserParams } from "./contact.js";
export type { DocApi, RenameDocParams, DeleteDocParams, ShareDocParams } from "./doc.js";
export type { TodoApi, GetTodoListParams, GetTodoListResult, GetTodoDetailParams, GetTodoDetailResult, CreateTodoParams, CreateTodoResult, UpdateTodoParams, DeleteTodoParams, ChangeTodoUserStatusParams } from "./todo.js";
export type { ScheduleApi, CreateCalendarParams, CreateCalendarResult, CreateScheduleParams, CreateScheduleResult, GetScheduleListByRangeParams, GetScheduleListByRangeResult, GetScheduleDetailParams, GetScheduleDetailResult, UpdateScheduleParams, CancelScheduleParams, AddScheduleAttendeesParams, DelScheduleAttendeesParams } from "./schedule.js";
export type { MsgApi, GetMsgChatListParams, GetMsgChatListResult, GetMessageParams, GetMessageResult, GetMsgMediaParams, GetMsgMediaResult, SendMessageParams as MsgSendMessageParams, SendMessageResult as MsgSendMessageResult } from "./msg.js";
export type { MeetingApi, CreateMeetingParams, CreateMeetingResult, GetMeetingInfoParams, GetMeetingInfoResult, CancelMeetingParams, ListUserMeetingsParams, ListUserMeetingsResult, UpdateMeetingParams } from "./meeting.js";