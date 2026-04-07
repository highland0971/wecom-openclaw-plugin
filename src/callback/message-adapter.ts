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
  MediaId?: string;
  MediaType?: string;
  MediaUrl?: string;
}

export function convertCallbackToMsgContext(
  msg: WeComCallbackMessage,
  accountId: string
): CallbackMsgContext {
  const channelId = 'wecom';
  const from = msg.FromUserName || '';
  const to = msg.ToUserName || '';
  const sessionKey = `wecom:${from}`;
  const chatType = 'direct';
  const fromLabel = `user:${from}`;
  
  const body = buildMessageBody(msg);
  
  return {
    Body: body,
    RawBody: body,
    CommandBody: body,
    BodyForCommands: body,
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
    
    ChatType: chatType,
    ConversationLabel: fromLabel,
    Timestamp: Date.now(),
    Provider: channelId,
    Surface: channelId,
    OriginatingChannel: channelId,
    OriginatingTo: `${channelId}:${from}`,
    CommandAuthorized: true,
    
    MediaId: msg.MediaId || msg.VoiceMediaId || msg.VideoMediaId,
    MediaType: msg.MsgType !== 'text' ? msg.MsgType : undefined,
    MediaUrl: msg.PicUrl,
  };
}

function buildMessageBody(msg: WeComCallbackMessage): string {
  switch (msg.MsgType) {
    case 'text':
      return msg.Content || '';
    
    case 'image':
      return `[用户发送了一张图片] media_id: ${msg.MediaId || 'unknown'}`;
    
    case 'voice':
      if (msg.Recognition) {
        return `[语音消息] ${msg.Recognition}`;
      }
      return `[用户发送了一段语音] media_id: ${msg.VoiceMediaId || msg.MediaId || 'unknown'}`;
    
    case 'video':
      return `[用户发送了一个视频] media_id: ${msg.VideoMediaId || msg.MediaId || 'unknown'}`;
    
    case 'location':
      const lat = msg.Location_X || 0;
      const lng = msg.Location_Y || 0;
      const label = msg.Label || `${lat}, ${lng}`;
      return `[用户发送了位置] ${label} (纬度: ${lat}, 经度: ${lng})`;
    
    case 'link':
      const title = msg.Title || '链接';
      const desc = msg.Description || '';
      const url = msg.Url || '';
      return `[用户发送了链接] ${title}\n${desc}\n${url}`;
    
    case 'event':
      return buildEventBody(msg);
    
    default:
      return `[用户发送了 ${msg.MsgType} 类型的消息]`;
  }
}

function buildEventBody(msg: WeComCallbackMessage): string {
  const event = msg.Event || '';
  
  switch (event) {
    case 'subscribe':
      return '[用户关注了应用]';
    
    case 'unsubscribe':
      return '[用户取消关注应用]';
    
    case 'enter_agent':
      return '[用户进入了应用]';
    
    case 'LOCATION':
      const lat = msg.Latitude || 0;
      const lng = msg.Longitude || 0;
      return `[用户上报了位置] 纬度: ${lat}, 经度: ${lng}`;
    
    case 'click':
      return `[用户点击了菜单] ${msg.EventKey || ''}`;
    
    default:
      return `[收到事件: ${event}] ${msg.EventKey || ''}`;
  }
}

export function isCallbackTextMessage(msg: WeComCallbackMessage): boolean {
  return msg.MsgType === 'text' && Boolean(msg.Content);
}

export function isCallbackEventMessage(msg: WeComCallbackMessage): boolean {
  return msg.MsgType === 'event';
}

export function isCallbackMediaMessage(msg: WeComCallbackMessage): boolean {
  return ['image', 'voice', 'video'].includes(msg.MsgType);
}

export function isCallbackProcessable(msg: WeComCallbackMessage): boolean {
  return ['text', 'image', 'voice', 'video', 'location', 'link'].includes(msg.MsgType);
}