import type { WeComCallbackMessage } from './parser.js';

export interface CallbackMsgContext {
  Body: string;
  RawBody: string;
  CommandBody: string;
  BodyForCommands: string;
  From: string;
  To: string;
  SessionKey: string;
  AccountId: string;
  MessageSid: string;
  MessageSidFull: string;
  ChannelId: string;
  SenderId: string;
  ReplyToId?: string;
  RootMessageId?: string;
  InboundHistory?: Array<{
    sender: string;
    body: string;
    timestamp?: number;
  }>;
  ChatType?: string;
  ConversationLabel?: string;
  Timestamp?: number;
  Provider?: string;
  Surface?: string;
  OriginatingChannel?: string;
  OriginatingTo?: string;
  CommandAuthorized?: boolean;
}

export function convertCallbackToMsgContext(
  msg: WeComCallbackMessage,
  accountId: string
): CallbackMsgContext {
  const channelId = 'wecom';
  const from = msg.FromUserName || '';
  const to = msg.ToUserName || '';
  const sessionKey = `wecom:${from}`;
  const chatType = 'direct'; // 回调模式通常是单聊
  const fromLabel = `user:${from}`;
  
  return {
    Body: msg.Content || '',
    RawBody: msg.Content || '',
    CommandBody: msg.Content || '',
    BodyForCommands: msg.Content || '',
    From: `${channelId}:${from}`,
    To: `${channelId}:${to}`,
    SessionKey: sessionKey,
    AccountId: accountId,
    MessageSid: msg.MsgId || '',
    MessageSidFull: msg.MsgId || '',
    ChannelId: channelId,
    SenderId: from,
    ReplyToId: undefined,
    RootMessageId: undefined,
    InboundHistory: [],
    
    // 添加 OpenClaw dispatcher 所需的关键字段
    ChatType: chatType,
    ConversationLabel: fromLabel,
    Timestamp: Date.now(),
    Provider: channelId,
    Surface: channelId,
    OriginatingChannel: channelId,
    OriginatingTo: `${channelId}:${from}`,
    CommandAuthorized: true,
  };
}

export function isCallbackTextMessage(msg: WeComCallbackMessage): boolean {
  return msg.MsgType === 'text' && Boolean(msg.Content);
}

export function isCallbackEventMessage(msg: WeComCallbackMessage): boolean {
  return msg.MsgType === 'event';
}