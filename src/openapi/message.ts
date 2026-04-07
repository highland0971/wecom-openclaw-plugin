import type { OpenApiClient } from "./request.js";

export interface SendMessageParams {
  touser?: string;
  toparty?: string;
  totag?: string;
  msgtype: string;
  agentid: number;
  text?: { content: string };
  image?: { media_id: string };
  voice?: { media_id: string };
  video?: { media_id: string; title?: string; description?: string };
  file?: { media_id: string };
  textcard?: {
    title: string;
    description: string;
    url: string;
    btntxt?: string;
  };
  news?: {
    articles: Array<{
      title: string;
      description?: string;
      url: string;
      picurl?: string;
    }>;
  };
  markdown?: { content: string };
  safe?: 0 | 1;
  enable_id_trans?: 0 | 1;
  enable_duplicate_check?: 0 | 1;
  duplicate_check_interval?: number;
  [key: string]: unknown;
}

export interface SendMessageResult {
  errcode: number;
  errmsg: string;
  invaliduser?: string;
  invalidparty?: string;
  invalidtag?: string;
  unlicenseduser?: string;
  msgid: string;
  response_code?: string;
}

export interface RecallMessageParams {
  msgid: string;
  [key: string]: unknown;
}

export interface CreateAppChatParams {
  name?: string;
  owner?: string;
  userlist: string[];
  chatid?: string;
  [key: string]: unknown;
}

export interface CreateAppChatResult {
  errcode: number;
  errmsg: string;
  chatid: string;
}

export interface UpdateAppChatParams {
  chatid: string;
  name?: string;
  owner?: string;
  add_user_list?: string[];
  del_user_list?: string[];
  [key: string]: unknown;
}

export interface GetAppChatResult {
  errcode: number;
  errmsg: string;
  chat_info: {
    chatid: string;
    name: string;
    owner: string;
    userlist: string[];
    chat_type: number;
  };
}

export interface SendAppChatMessageParams {
  chatid: string;
  msgtype: string;
  text?: { content: string };
  image?: { media_id: string };
  voice?: { media_id: string };
  video?: { media_id: string; title?: string; description?: string };
  file?: { media_id: string };
  news?: {
    articles: Array<{
      title: string;
      description?: string;
      url: string;
      picurl?: string;
    }>;
  };
  markdown?: { content: string };
  safe?: 0 | 1;
  [key: string]: unknown;
}

export function createMessageApi(client: OpenApiClient) {
  return {
    async send(params: SendMessageParams): Promise<SendMessageResult> {
      return client.request<SendMessageResult>("message/send", params);
    },

    async recall(params: RecallMessageParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("message/recall", params);
    },

    async createAppChat(params: CreateAppChatParams): Promise<CreateAppChatResult> {
      return client.request<CreateAppChatResult>("appchat/create", params);
    },

    async updateAppChat(params: UpdateAppChatParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("appchat/update", params);
    },

    async getAppChat(chatid: string): Promise<GetAppChatResult> {
      return client.get<GetAppChatResult>("appchat/get", { chatid });
    },

    async sendAppChatMessage(params: SendAppChatMessageParams): Promise<{ errcode: number; errmsg: string; msgid?: string }> {
      return client.request("appchat/send", params);
    },
  };
}

export type MessageApi = ReturnType<typeof createMessageApi>;