/**
 * WeCom Callback Encryption/Decryption Utilities
 * 
 * 企业微信回调消息加密/解密工具
 * 使用 AES-256-CBC 算法，PKCS#7 填充
 * 
 * @module callback/crypto
 */

import * as crypto from 'node:crypto';

/**
 * 解码 EncodingAESKey 为 AESKey (32 字节)
 * 
 * EncodingAESKey 是 43 字符的 Base64 字符串
 * 解码时需要在末尾追加 "=" 再进行 Base64 解码
 * 
 * @param encodingAESKey - 43 字符的 Base64 编码密钥
 * @returns 32 字节的 AES 密钥
 * @throws Error 如果密钥长度不正确
 */
export function decodeEncodingAESKey(encodingAESKey: string): Buffer {
  if (encodingAESKey.length !== 43) {
    throw new Error(`Invalid EncodingAESKey length: expected 43, got ${encodingAESKey.length}`);
  }
  
  const padded = encodingAESKey + "=";
  const key = Buffer.from(padded, 'base64');
  
  if (key.length !== 32) {
    throw new Error(`Invalid AESKey length after decoding: expected 32, got ${key.length}`);
  }
  
  return key;
}

/**
 * AES-256-CBC 解密企业微信回调消息
 * 
 * 解密后的消息格式：
 * random(16 字节) + msg_len(4 字节，网络字节序) + msg + receiveId
 * 
 * @param encryptedBase64 - Base64 编码的加密消息
 * @param aesKey - 32 字节的 AES 密钥
 * @returns 解密后的消息内容和 receiveId
 * @throws Error 如果解密失败
 */
export function decryptMessage(
  encryptedBase64: string,
  aesKey: Buffer
): { msg: string; receiveId: string } {
  try {
    // 1. Base64 解码
    const encrypted = Buffer.from(encryptedBase64, 'base64');
    
    // 2. AES-256-CBC 解密
    // IV 是 AESKey 的前 16 字节
    const iv = aesKey.slice(0, 16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
    decipher.setAutoPadding(false); // 企业微信使用自定义 PKCS#7
    
    let decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    // 3. 移除 PKCS#7 填充
    const padLen = decrypted[decrypted.length - 1];
    if (padLen < 1 || padLen > 32) {
      throw new Error(`Invalid PKCS#7 padding: ${padLen}`);
    }
    decrypted = decrypted.slice(0, decrypted.length - padLen);
    
    // 4. 解析消息格式
    // random(16) + msg_len(4) + msg + receiveId
    if (decrypted.length < 20) {
      throw new Error('Decrypted message too short');
    }
    
    const randomBytes = decrypted.slice(0, 16);
    const msgLen = decrypted.readUInt32BE(16);
    
    if (decrypted.length < 20 + msgLen) {
      throw new Error(`Invalid message length: expected ${20 + msgLen}, got ${decrypted.length}`);
    }
    
    const msg = decrypted.slice(20, 20 + msgLen).toString('utf8');
    const receiveId = decrypted.slice(20 + msgLen).toString('utf8');
    
    return { msg, receiveId };
    
  } catch (err) {
    throw new Error(`Decrypt message failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * AES-256-CBC 加密消息（用于被动回复）
 * 
 * 加密后的消息格式：
 * random(16 字节) + msg_len(4 字节，网络字节序) + msg + receiveId
 * 然后进行 PKCS#7 填充和 AES 加密
 * 
 * @param msg - 明文消息内容
 * @param aesKey - 32 字节的 AES 密钥
 * @param receiveId - 接收方 ID（通常是 CorpId）
 * @returns Base64 编码的加密消息
 */
export function encryptMessage(
  msg: string,
  aesKey: Buffer,
  receiveId: string
): string {
  // 1. 构造明文消息
  // random(16) + msg_len(4) + msg + receiveId
  const randomBytes = crypto.randomBytes(16);
  const msgBuffer = Buffer.from(msg, 'utf8');
  const msgLenBuffer = Buffer.alloc(4);
  msgLenBuffer.writeUInt32BE(msgBuffer.length, 0);
  const receiveIdBuffer = Buffer.from(receiveId, 'utf8');
  
  const plaintext = Buffer.concat([
    randomBytes,
    msgLenBuffer,
    msgBuffer,
    receiveIdBuffer
  ]);
  
  // 2. PKCS#7 填充到 32 字节边界
  const blockSize = 32;
  const padLen = blockSize - (plaintext.length % blockSize);
  const padded = Buffer.concat([
    plaintext,
    Buffer.alloc(padLen, padLen)
  ]);
  
  // 3. AES-256-CBC 加密
  const iv = aesKey.slice(0, 16);
  const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
  cipher.setAutoPadding(false);
  
  const encrypted = Buffer.concat([
    cipher.update(padded),
    cipher.final()
  ]);
  
  // 4. Base64 编码
  return encrypted.toString('base64');
}

/**
 * 验证 AESKey 是否有效
 * 
 * @param encodingAESKey - EncodingAESKey 字符串
 * @returns true 如果密钥有效
 */
export function isValidAESKey(encodingAESKey: string): boolean {
  try {
    const key = decodeEncodingAESKey(encodingAESKey);
    return key.length === 32;
  } catch {
    return false;
  }
}