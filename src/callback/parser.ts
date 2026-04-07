/**
 * WeCom Callback XML Parser
 * 
 * 企业微信回调 XML 消息解析工具
 * 
 * @module callback/parser
 */

import * as xml2js from 'xml2js';

/**
 * 企业微信回调消息类型
 */
export interface WeComCallbackMessage {
  /** 接收方 ID（通常是 CorpID） */
  ToUserName: string;
  
  /** 发送方 ID（用户 ID） */
  FromUserName: string;
  
  /** 消息创建时间（Unix 时间戳） */
  CreateTime: number;
  
  /** 消息类型 */
  MsgType: 'text' | 'image' | 'voice' | 'video' | 'location' | 'link' | 'event';
  
  /** 消息 ID */
  MsgId?: string;
  
  /** 应用 ID */
  AgentID?: string;
  
  // 文本消息
  /** 文本消息内容 */
  Content?: string;
  
  // 图片消息
  /** 图片链接 */
  PicUrl?: string;
  /** 图片媒体文件 ID */
  MediaId?: string;
  
  // 语音消息
  /** 语音格式 */
  Format?: string;
  /** 语音媒体文件 ID */
  VoiceMediaId?: string;
  /** 语音识别结果（需开启语音识别） */
  Recognition?: string;
  
  // 视频消息
  /** 视频媒体文件 ID */
  VideoMediaId?: string;
  /** 视频缩略图媒体文件 ID */
  ThumbMediaId?: string;
  
  // 位置消息
  /** 纬度 */
  Location_X?: number;
  /** 经度 */
  Location_Y?: number;
  /** 地图缩放大小 */
  Scale?: number;
  /** 地理位置信息 */
  Label?: string;
  
  // 链接消息
  /** 消息标题 */
  Title?: string;
  /** 消息描述 */
  Description?: string;
  /** 消息链接 */
  Url?: string;
  
  // 事件消息
  /** 事件类型 */
  Event?: string;
  /** 事件 KEY 值 */
  EventKey?: string;
  /** 二维码的参数（扫码事件） */
  Ticket?: string;
  /** 地纬度（地理位置事件） */
  Latitude?: number;
  /** 地经度（地理位置事件） */
  Longitude?: number;
  /** 地理位置精度（地理位置事件） */
  Precision?: number;
}

/**
 * 解析企业微信回调 XML
 * 
 * @param xml - XML 字符串
 * @returns 解析后的消息对象
 * @throws Error 如果 XML 解析失败
 */
export async function parseCallbackXml(xml: string): Promise<WeComCallbackMessage> {
  const parser = new xml2js.Parser({
    explicitArray: false,      // 不将子元素转换为数组
    explicitCharkey: false,    // 不使用 $t 作为文本内容键
    normalize: true,           // 规范化空白字符
    normalizeTags: false,      // 不规范标签名（保持大小写）
    trim: true,                // 去除文本两端的空白
    attrNameProcessors: [],    // 不处理属性名
    valueProcessors: []        // 不处理值
  });
  
  try {
    const result = await parser.parseStringPromise(xml);
    
    if (!result || !result.xml) {
      throw new Error('Invalid XML structure: missing root element');
    }
    
    const parsed = result.xml;
    
    // 类型转换
    const message: WeComCallbackMessage = {
      ToUserName: String(parsed.ToUserName || ''),
      FromUserName: String(parsed.FromUserName || ''),
      CreateTime: parseInt(parsed.CreateTime || '0', 10),
      MsgType: parsed.MsgType || 'text',
      MsgId: parsed.MsgId ? String(parsed.MsgId) : undefined,
      AgentID: parsed.AgentID ? String(parsed.AgentID) : undefined,
      Content: parsed.Content ? String(parsed.Content) : undefined,
      PicUrl: parsed.PicUrl ? String(parsed.PicUrl) : undefined,
      MediaId: parsed.MediaId ? String(parsed.MediaId) : undefined,
      Format: parsed.Format ? String(parsed.Format) : undefined,
      Recognition: parsed.Recognition ? String(parsed.Recognition) : undefined,
      Event: parsed.Event ? String(parsed.Event) : undefined,
      EventKey: parsed.EventKey ? String(parsed.EventKey) : undefined
    };
    
    return message;
    
  } catch (err) {
    throw new Error(`Parse XML failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * 从加密的 XML 中提取 Encrypt 字段
 * 
 * 企业微信发送的 XML 格式：
 * <xml>
 *   <ToUserName><![CDATA[toUser]]></ToUserName>
 *   <AgentID><![CDATA[toAgentID]]></AgentID>
 *   <Encrypt><![CDATA[msg_encrypt]]></Encrypt>
 * </xml>
 * 
 * @param xml - XML 字符串
 * @returns Encrypt 字段内容，如果未找到则返回 null
 */
export function extractEncryptField(xml: string): string | null {
  // 尝试多种匹配模式
  const patterns = [
    /<Encrypt><!\[CDATA\[(.*?)\]\]><\/Encrypt>/s,
    /<Encrypt>(.*?)<\/Encrypt>/s
  ];
  
  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * 构建被动回复 XML 消息
 * 
 * 用于在企业微信回调中直接返回回复消息
 * 
 * @param toUserName - 接收方 ID
 * @param fromUserName - 发送方 ID（通常是 CorpID）
 * @param msgType - 消息类型
 * @param content - 消息内容
 * @returns XML 格式的回复消息
 */
export function buildReplyXml(
  toUserName: string,
  fromUserName: string,
  msgType: string,
  content: string
): string {
  const createTime = Math.floor(Date.now() / 1000);
  
  return `<xml>
  <ToUserName><![CDATA[${toUserName}]]></ToUserName>
  <FromUserName><![CDATA[${fromUserName}]]></FromUserName>
  <CreateTime>${createTime}</CreateTime>
  <MsgType><![CDATA[${msgType}]]></MsgType>
  <Content><![CDATA[${content}]]></Content>
</xml>`;
}

/**
 * 构建加密的回复 XML 消息
 * 
 * 用于需要加密的被动回复
 * 
 * @param toUserName - 接收方 ID
 * @param fromUserName - 发送方 ID
 * @param encryptedMsg - 加密后的消息内容
 * @param signature - 签名
 * @param timestamp - 时间戳
 * @param nonce - 随机数
 * @returns 加密的 XML 回复消息
 */
export function buildEncryptedReplyXml(
  toUserName: string,
  fromUserName: string,
  encryptedMsg: string,
  signature: string,
  timestamp: string,
  nonce: string
): string {
  return `<xml>
  <Encrypt><![CDATA[${encryptedMsg}]]></Encrypt>
  <MsgSignature><![CDATA[${signature}]]></MsgSignature>
  <TimeStamp>${timestamp}</TimeStamp>
  <Nonce><![CDATA[${nonce}]]></Nonce>
</xml>`;
}

/**
 * 验证 XML 消息格式
 * 
 * @param message - 解析后的消息对象
 * @returns true 如果消息格式有效
 */
export function isValidMessage(message: WeComCallbackMessage): boolean {
  if (!message.ToUserName || !message.FromUserName) {
    return false;
  }
  
  if (!message.MsgType) {
    return false;
  }
  
  if (message.CreateTime <= 0) {
    return false;
  }
  
  return true;
}