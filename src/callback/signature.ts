/**
 * WeCom Callback Signature Verification
 * 
 * 企业微信回调签名验证工具
 * 使用 SHA1 算法验证请求合法性
 * 
 * @module callback/signature
 */

import * as crypto from 'node:crypto';

/**
 * 生成企业微信回调签名
 * 
 * 签名算法：
 * 1. 将 token、timestamp、nonce、msg_encrypt 四个参数进行字典序排序
 * 2. 将四个参数字符串拼接成一个字符串
 * 3. 对拼接后的字符串进行 SHA1 加密
 * 
 * @param token - 回调配置中的 Token
 * @param timestamp - 时间戳
 * @param nonce - 随机数
 * @param msgEncrypt - 加密消息内容（或 echostr）
 * @returns 40 字符的 SHA1 签名（小写十六进制）
 */
export function generateSignature(
  token: string,
  timestamp: string,
  nonce: string,
  msgEncrypt: string
): string {
  // 1. 字典序排序
  const sorted = [token, timestamp, nonce, msgEncrypt]
    .sort()
    .join('');
  
  // 2. SHA1 加密
  return crypto
    .createHash('sha1')
    .update(sorted, 'utf8')
    .digest('hex');
}

/**
 * 验证企业微信回调签名
 * 
 * 使用常量时间比较（timingSafeEqual）防止时序攻击
 * 
 * @param signature - 企业微信发送的签名
 * @param token - 回调配置中的 Token
 * @param timestamp - 时间戳
 * @param nonce - 随机数
 * @param msgEncrypt - 加密消息内容（或 echostr）
 * @returns true 如果签名验证通过
 */
export function verifySignature(
  signature: string,
  token: string,
  timestamp: string,
  nonce: string,
  msgEncrypt: string
): boolean {
  if (!signature || !token || !timestamp || !nonce || !msgEncrypt) {
    return false;
  }
  
  const expected = generateSignature(token, timestamp, nonce, msgEncrypt);
  
  // 验证签名长度
  if (signature.length !== expected.length) {
    return false;
  }
  
  try {
    // 使用常量时间比较，防止时序攻击
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * 验证时间戳有效性
 * 
 * 防止重放攻击：检查时间戳是否在允许的时间窗口内
 * 
 * @param timestamp - Unix 时间戳（秒）
 * @param maxAgeSeconds - 最大允许的时间差（秒），默认 300 秒（5 分钟）
 * @returns true 如果时间戳有效
 */
export function verifyTimestamp(
  timestamp: string,
  maxAgeSeconds: number = 300
): boolean {
  const timestampNum = parseInt(timestamp, 10);
  
  if (isNaN(timestampNum)) {
    return false;
  }
  
  const now = Math.floor(Date.now() / 1000);
  const age = Math.abs(now - timestampNum);
  
  return age <= maxAgeSeconds;
}

/**
 * 验证随机数（nonce）
 * 
 * 确保 nonce 不为空且格式正确
 * 
 * @param nonce - 随机数字符串
 * @returns true 如果 nonce 有效
 */
export function verifyNonce(nonce: string): boolean {
  return Boolean(nonce && nonce.trim().length > 0);
}

/**
 * 验证所有回调参数
 * 
 * @param params - 回调参数
 * @param params.signature - 签名
 * @param params.timestamp - 时间戳
 * @param params.nonce - 随机数
 * @param params.msgEncrypt - 加密消息
 * @param params.token - Token
 * @param params.maxAgeSeconds - 最大时间差（秒）
 * @returns 验证结果
 */
export function verifyCallbackParams(params: {
  signature: string;
  timestamp: string;
  nonce: string;
  msgEncrypt: string;
  token: string;
  maxAgeSeconds?: number;
}): {
  valid: boolean;
  error?: string;
} {
  const { signature, timestamp, nonce, msgEncrypt, token, maxAgeSeconds } = params;
  
  // 1. 检查参数完整性
  if (!signature) {
    return { valid: false, error: 'Missing signature' };
  }
  if (!timestamp) {
    return { valid: false, error: 'Missing timestamp' };
  }
  if (!nonce) {
    return { valid: false, error: 'Missing nonce' };
  }
  if (!msgEncrypt) {
    return { valid: false, error: 'Missing msgEncrypt' };
  }
  if (!token) {
    return { valid: false, error: 'Missing token' };
  }
  
  // 2. 验证时间戳
  if (!verifyTimestamp(timestamp, maxAgeSeconds)) {
    return { valid: false, error: 'Timestamp expired' };
  }
  
  // 3. 验证签名
  if (!verifySignature(signature, token, timestamp, nonce, msgEncrypt)) {
    return { valid: false, error: 'Invalid signature' };
  }
  
  return { valid: true };
}