import type { OpenApiClient } from "./request.js";

// ============================================================================
// getMsgChatList - 获取会话列表
// ============================================================================

export interface GetMsgChatListParams {
  begin_time: string;
  end_time: string;
  cursor?: string;
  [key: string]: unknown;
}

export interface ChatInfo {
  chat_id: string;
  chat_name: string;
  last_msg_time: string;
  msg_count: number;
}

export interface GetMsgChatListResult {
  errcode: number;
  errmsg: string;
  chats?: ChatInfo[];
  has_more?: boolean;
  next_cursor?: string;
}

// ============================================================================
// getMessage - 获取消息详情
// ============================================================================

export interface GetMessageParams {
  chat_type: 1 | 2;
  chatid: string;
  begin_time: string;
  end_time: string;
  cursor?: string;
  [key: string]: unknown;
}

export interface TextMessage {
  content: string;
}

export interface ImageMessage {
  media_id: string;
  name?: string;
}

export interface FileMessage {
  media_id: string;
  name?: string;
}

export interface VoiceMessage {
  media_id: string;
}

export interface VideoMessage {
  media_id: string;
}

export interface MessageItem {
  userid: string;
  send_time: string;
  msgtype: "text" | "image" | "file" | "voice" | "video";
  text?: TextMessage;
  image?: ImageMessage;
  file?: FileMessage;
  voice?: VoiceMessage;
  video?: VideoMessage;
}

export interface GetMessageResult {
  errcode: number;
  errmsg: string;
  messages?: MessageItem[];
  next_cursor?: string;
}

// ============================================================================
// getMsgMedia - 获取媒体文件
// ============================================================================

export interface GetMsgMediaParams {
  media_id: string;
  [key: string]: unknown;
}

export interface MediaItem {
  media_id: string;
  name?: string;
  type?: "image" | "voice" | "video" | "file";
  local_path?: string;
  size?: number;
  content_type?: string;
  base64_data?: string; // 原始响应包含 base64，拦截器会转换为 local_path
}

export interface GetMsgMediaResult {
  errcode: number;
  errmsg: string;
  media_item?: MediaItem;
}

// ============================================================================
// sendMessage - 发送消息（补充到群聊）
// ============================================================================

export interface SendMessageParams {
  chat_type: 1 | 2;
  chatid: string;
  msgtype: string;
  text?: { content: string };
  [key: string]: unknown;
}

export interface SendMessageResult {
  errcode: number;
  errmsg: string;
}

// ============================================================================
// API 实现
// ============================================================================

export function createMsgApi(client: OpenApiClient) {
  return {
    /**
     * 获取会话列表
     * 获取指定时间范围内有消息的会话列表，支持分页查询
     */
    async getMsgChatList(params: GetMsgChatListParams): Promise<GetMsgChatListResult> {
      return client.request<GetMsgChatListResult>("msgchat/get_chat_list", params);
    },

    /**
     * 获取消息详情
     * 根据会话类型和会话 ID，拉取指定时间范围内的消息记录
     */
    async getMessage(params: GetMessageParams): Promise<GetMessageResult> {
      return client.request<GetMessageResult>("msgchat/get_message", params);
    },

    /**
     * 获取媒体文件
     * 根据文件 ID 自动下载文件到本地，返回本地文件路径、文件名称、类型、大小及内容类型
     * 注意：此接口返回 base64 数据，可能需要设置较长超时时间（120s）
     */
    async getMsgMedia(params: GetMsgMediaParams): Promise<GetMsgMediaResult> {
      // 媒体文件下载可能需要较长超时时间（base64 数据可达 ~27MB）
      const MEDIA_DOWNLOAD_TIMEOUT_MS = 120_000;
      return client.request<GetMsgMediaResult>("msgchat/get_media", params, {
        timeout: MEDIA_DOWNLOAD_TIMEOUT_MS,
      });
    },

    /**
     * 发送消息（补充到群聊）
     * 向单聊或群聊发送文本消息
     */
    async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
      return client.request<SendMessageResult>("msgchat/send_message", params);
    },
  };
}

export type MsgApi = ReturnType<typeof createMsgApi>;