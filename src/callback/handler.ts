import type { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';
import { verifyCallbackParams } from './signature.js';
import { decodeEncodingAESKey, decryptMessage } from './crypto.js';
import { parseCallbackXml, extractEncryptField, type WeComCallbackMessage } from './parser.js';
import { convertCallbackToMsgContext, isCallbackProcessable, isCallbackEventMessage } from './message-adapter.js';
import { sendCallbackReply } from './reply-sender.js';
import type { RuntimeEnv } from 'openclaw/plugin-sdk/runtime-env';

const MESSAGE_DEDUP_TTL_MS = 5 * 60 * 1000;
const processedMessages = new Map<string, number>();
const replyAccumulators = new Map<string, { text: string }>();

function isDuplicateMessage(msgId: string | undefined): boolean {
  if (!msgId) return false;
  
  const now = Date.now();
  const lastProcessed = processedMessages.get(msgId);
  
  if (lastProcessed && (now - lastProcessed) < MESSAGE_DEDUP_TTL_MS) {
    return true;
  }
  
  processedMessages.set(msgId, now);
  
  for (const [key, timestamp] of processedMessages) {
    if (now - timestamp > MESSAGE_DEDUP_TTL_MS) {
      processedMessages.delete(key);
    }
  }
  
  return false;
}

interface ReplyPayload {
  text?: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  interactive?: any;
  replyToId?: string;
  audioAsVoice?: boolean;
  isError?: boolean;
  isReasoning?: boolean;
}

interface ReplyDispatchInfo {
  kind: 'tool' | 'block' | 'final';
}

export interface WeComCallbackConfig {
  path?: string;
  token: string;
  encodingAESKey: string;
  corpId: string;
}

export interface CallbackHandlerContext {
  callback: WeComCallbackConfig;
  runtime: RuntimeEnv;
  accountId: string;
  corpId: string;
  agentId?: number;
  agentSecret?: string;
  config?: any;
}

export async function handleWeComCallback(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: CallbackHandlerContext
): Promise<boolean> {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const query = {
    msg_signature: url.searchParams.get('msg_signature') || '',
    timestamp: url.searchParams.get('timestamp') || '',
    nonce: url.searchParams.get('nonce') || '',
    echostr: url.searchParams.get('echostr') || ''
  };

  if (req.method === 'GET') {
    return handleUrlVerification(req, res, ctx, query);
  }

  if (req.method === 'POST') {
    return handleMessageCallback(req, res, ctx, query);
  }

  res.statusCode = 405;
  res.end('Method Not Allowed');
  return true;
}

async function handleUrlVerification(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: CallbackHandlerContext,
  query: { msg_signature: string; timestamp: string; nonce: string; echostr: string }
): Promise<boolean> {
  const { callback, runtime, accountId } = ctx;

  runtime.log?.(`[wecom][callback][${accountId}] URL verification request received`);

  const verification = verifyCallbackParams({
    signature: query.msg_signature,
    timestamp: query.timestamp,
    nonce: query.nonce,
    msgEncrypt: query.echostr,
    token: callback.token,
    maxAgeSeconds: 300
  });

  if (!verification.valid) {
    runtime.error?.(`[wecom][callback][${accountId}] Verification failed: ${verification.error}`);
    res.statusCode = 403;
    res.end(verification.error || 'Verification failed');
    return true;
  }

  try {
    const aesKey = decodeEncodingAESKey(callback.encodingAESKey);
    const { msg } = decryptMessage(query.echostr, aesKey);

    runtime.log?.(`[wecom][callback][${accountId}] URL verification successful`);

    res.statusCode = 200;
    res.end(msg);
    return true;

  } catch (err) {
    runtime.error?.(`[wecom][callback][${accountId}] Decrypt echostr failed: ${String(err)}`);
    res.statusCode = 500;
    res.end('Decrypt failed');
    return true;
  }
}

async function handleMessageCallback(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: CallbackHandlerContext,
  query: { msg_signature: string; timestamp: string; nonce: string; echostr: string }
): Promise<boolean> {
  const { callback, runtime, accountId } = ctx;

  runtime.log?.(`[wecom][callback][${accountId}] Message callback received`);

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString('utf8');

  const msgEncrypt = extractEncryptField(body);
  if (!msgEncrypt) {
    runtime.error?.(`[wecom][callback][${accountId}] No Encrypt field in XML`);
    res.statusCode = 400;
    res.end('Invalid XML format');
    return true;
  }

  const verification = verifyCallbackParams({
    signature: query.msg_signature,
    timestamp: query.timestamp,
    nonce: query.nonce,
    msgEncrypt,
    token: callback.token,
    maxAgeSeconds: 300
  });

  if (!verification.valid) {
    runtime.error?.(`[wecom][callback][${accountId}] Verification failed: ${verification.error}`);
    res.statusCode = 403;
    res.end(verification.error || 'Verification failed');
    return true;
  }

  try {
    const aesKey = decodeEncodingAESKey(callback.encodingAESKey);
    const { msg, receiveId } = decryptMessage(msgEncrypt, aesKey);

    if (receiveId !== callback.corpId) {
      runtime.error?.(
        `[wecom][callback][${accountId}] receiveId mismatch: expected=${callback.corpId}, got=${receiveId}`
      );
      res.statusCode = 400;
      res.end('receiveId mismatch');
      return true;
    }

    const parsed = await parseCallbackXml(msg);
    runtime.log?.(
      `[wecom][callback][${accountId}] Message received: MsgType=${parsed.MsgType}, From=${parsed.FromUserName}, MsgId=${parsed.MsgId}`
    );

    // 立即返回成功响应，避免企业微信 5 秒超时重试
    // 然后异步处理消息
    res.statusCode = 200;
    res.end('success');

    // 异步处理消息（fire and forget）
    dispatchMessage(parsed, ctx).catch((err) => {
      runtime.error?.(`[wecom][callback][${accountId}] Async dispatch failed: ${String(err)}`);
    });

    return true;

  } catch (err) {
    runtime.error?.(`[wecom][callback][${accountId}] Process message failed: ${String(err)}`);
    res.statusCode = 500;
    res.end('Process failed');
    return true;
  }
}

// Generate a unique message ID for callback requests
function generateMessageId(): string {
  return `callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function dispatchMessage(
  msg: WeComCallbackMessage,
  ctx: CallbackHandlerContext
): Promise<void> {
  const { runtime, accountId, corpId, agentId, agentSecret, config } = ctx;
  
  if (isDuplicateMessage(msg.MsgId)) {
    runtime.log?.(`[wecom][callback][${accountId}] Skipping duplicate message: MsgId=${msg.MsgId}`);
    return;
  }
  
  runtime.log?.(`[wecom][callback][${accountId}] Received ${msg.MsgType} message from ${msg.FromUserName}`);

  if (isCallbackEventMessage(msg)) {
    runtime.log?.(`[wecom][callback][${accountId}] Received event: ${msg.Event}, skipping dispatch`);
    return;
  }

  if (!isCallbackProcessable(msg)) {
    runtime.log?.(`[wecom][callback][${accountId}] Unsupported message type: ${msg.MsgType}`);
    return;
  }

  if (!agentId || !agentSecret) {
    runtime.error?.(
      `[wecom][callback][${accountId}] Missing agentId or agentSecret for callback mode`
    );
    return;
  }

  try {
    const channelRuntime = (runtime as any).channel;
    
    if (!channelRuntime) {
      runtime.error?.(`[wecom][callback][${accountId}] Channel runtime not available`);
      return;
    }

    const msgContext = convertCallbackToMsgContext(msg, accountId);
    
    const messageId = generateMessageId();
    const ctxPayload = channelRuntime.reply.finalizeInboundContext({
      ...msgContext,
      MessageSid: messageId,
      MessageSidFirst: messageId,
      Timestamp: Date.now(),
    });
    
    const loadedConfig = config || (runtime as any).config?.loadConfig?.() || {};

    await channelRuntime.reply.dispatchReplyWithBufferedBlockDispatcher({
      ctx: ctxPayload,
      cfg: loadedConfig,
      replyOptions: { disableBlockStreaming: false },
      dispatcherOptions: {
        deliver: async (payload: ReplyPayload, info: ReplyDispatchInfo) => {
          const fromUser = ctxPayload.From?.replace('wecom:', '') || '';

          if (!fromUser) {
            runtime.error?.(`[wecom][callback][${accountId}] Missing From user in context`);
            return;
          }

          const sessionKey = ctxPayload.SessionKey || `wecom:${fromUser}`;
          
          if (payload.text) {
            const accumulator = replyAccumulators.get(sessionKey) || { text: '' };
            accumulator.text += payload.text;
            replyAccumulators.set(sessionKey, accumulator);
          }
        },
        onError: (err: unknown, info: ReplyDispatchInfo) => {
          runtime.error?.(`[wecom][callback][${accountId}] ${info.kind} reply failed: ${String(err)}`);
        },
        onIdle: async () => {
          const sessionKey = ctxPayload.SessionKey || `wecom:${ctxPayload.From?.replace('wecom:', '')}`;
          const accumulator = replyAccumulators.get(sessionKey);
          
          if (accumulator && accumulator.text) {
            // 立即删除，防止 onIdle 被多次调用时重复发送
            const textToSend = accumulator.text;
            replyAccumulators.delete(sessionKey);
            
            const fromUser = ctxPayload.From?.replace('wecom:', '') || '';
            
            runtime.log?.(
              `[wecom][callback][${accountId}] Sending reply (${textToSend.length} chars)`
            );
            
            try {
              await sendCallbackReply({
                corpId,
                agentId,
                runtime,
                accountId,
                toUser: fromUser,
                content: textToSend,
                msgType: 'markdown'
              });
              runtime.log?.(`[wecom][callback][${accountId}] Reply sent successfully`);
            } catch (err) {
              runtime.error?.(
                `[wecom][callback][${accountId}] Reply send failed: ${String(err)}`
              );
            }
          }
        },
      }
    });

    runtime.log?.(`[wecom][callback][${accountId}] Message dispatched successfully`);

  } catch (err) {
    runtime.error?.(
      `[wecom][callback][${accountId}] Dispatch failed: ${String(err)}`
    );
  }
}
