# 企业微信回调集成架构设计

> 基于 OpenClaw 官方 SDK 和参考项目 [YanHaidao/wecom](https://github.com/YanHaidao/wecom) 的设计方案

---

## 📋 设计目标

为 wecom-openclaw-plugin 添加企业微信回调（Webhook）支持，实现：

1. **双模式并存**：Bot WebSocket 模式 + Agent 回调模式
2. **统一 HTTP 入口**：一个路由处理所有回调请求
3. **符合 OpenClaw 规范**：使用官方 SDK 的 `registerHttpRoute` API
4. **安全可靠**：签名验证、消息解密、错误处理

---

## 🏗️ 架构设计

### 1. 双模式架构

```
┌────────────────────────────────────────────────────────────┐
│                    wecom-openclaw-plugin                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Bot WebSocket 模式 (现有)      Agent 回调模式 (新增)       │
│  ─────────────────────         ─────────────────────       │
│  WebSocket 长连接                HTTP Webhook 回调          │
│  实时消息推送                    验证 + 解密 + 分发          │
│  主动发送能力                    企业微信官方 API            │
│                                                            │
│  适用场景：                      适用场景：                  │
│  - 快速部署                      - 企业微信自定义应用        │
│  - 实时对话                      - 全功能 API 能力          │
│  - 主动推送                      - 回调事件处理              │
│                                                            │
│                    ↘        ↙                              │
│                      统一出站                                │
│                   (Outbound Adapter)                        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 2. HTTP 路由设计

#### 2.1 路由注册

```typescript
// index.ts
api.registerHttpRoute({
  path: "/wecom/callback",        // 主路径
  handler: handleWeComCallback,   // 统一处理器
  auth: "plugin",                 // 插件管理签名验证
  match: "exact"                  // 精确匹配
});

// 可选：支持多路径
api.registerHttpRoute({
  path: "/plugins/wecom/callback",
  handler: handleWeComCallback,
  auth: "plugin",
  match: "exact"
});
```

#### 2.2 URL 格式

**URL 验证（GET 请求）**：
```
GET /wecom/callback?msg_signature=xxx&timestamp=xxx&nonce=xxx&echostr=ENCRYPTED_STR
```

**消息接收（POST 请求）**：
```
POST /wecom/callback?msg_signature=xxx&timestamp=xxx&nonce=xxx
Content-Type: application/xml

<xml>
  <ToUserName><![CDATA[CorpID]]></ToUserName>
  <AgentID><![CDATA[AgentID]]></AgentID>
  <Encrypt><![CDATA[ENCRYPTED_MSG]]></Encrypt>
</xml>
```

### 3. 处理流程

```
┌─────────────────────────────────────────────────────────┐
│         handleWeComCallback (HTTP Handler)              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐    ┌──────────────┐   ┌────────────┐ │
│  │ GET 请求    │───→│ 验证签名     │──→│ 解密 echo  │ │
│  │ (URL 验证)  │    │              │   │ 返回明文   │ │
│  └─────────────┘    └──────────────┘   └────────────┘ │
│                                                         │
│  ┌─────────────┐    ┌──────────────┐   ┌────────────┐ │
│  │ POST 请求   │───→│ 验证签名     │──→│ 解密消息   │ │
│  │ (消息回调)  │    │              │   │            │ │
│  └─────────────┘    └──────────────┘   └─────┬──────┘ │
│                                                 │       │
│                                                 ↓       │
│                                         ┌────────────┐ │
│                                         │ 解析 XML   │ │
│                                         └─────┬──────┘ │
│                                                 │       │
│                                                 ↓       │
│                                         ┌────────────┐ │
│                                         │ 分发消息   │ │
│                                         │ 到核心     │ │
│                                         └────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 文件结构

### 新增文件

```
src/
├── callback/                    # 回调处理模块 (新增)
│   ├── crypto.ts               # 加密/解密工具
│   ├── signature.ts            # 签名验证
│   ├── parser.ts               # XML 解析
│   ├── handler.ts              # 回调处理器
│   └── index.ts                # 模块导出
│
├── types/
│   └── callback.ts             # 回调类型定义 (新增)
│
├── config/
│   └── accounts.ts             # 账号配置解析 (修改)
│
└── index.ts                    # 插件入口 (修改)
```

---

## 🔧 核心实现

### 1. 配置结构

#### 1.1 配置 Schema

```typescript
// src/types/callback.ts
export interface WeComCallbackConfig {
  /** 回调 URL 路径 (相对路径) */
  path?: string;  // 默认: "/wecom/callback"
  
  /** 回调验证 Token */
  token: string;
  
  /** 消息加密密钥 (43 字符 Base64) */
  encodingAESKey: string;
  
  /** 企业 ID (用于 receiveId 验证) */
  corpId: string;
}

export interface WeComAgentConfig {
  /** 应用 ID */
  agentId: number;
  
  /** 应用 Secret */
  secret: string;
  
  /** 回调配置 */
  callback?: WeComCallbackConfig;
}

export interface WeComBotConfig {
  /** Bot ID */
  botId?: string;
  
  /** Bot Secret */
  secret?: string;
  
  /** WebSocket URL */
  websocketUrl?: string;
}

export interface WeComAccountConfig {
  /** 账号名称 */
  name?: string;
  
  /** 启用状态 */
  enabled?: boolean;
  
  /** Bot 配置 */
  bot?: WeComBotConfig;
  
  /** Agent 配置 */
  agent?: WeComAgentConfig;
  
  /** DM 策略 */
  dmPolicy?: "open" | "pairing" | "allowlist";
  
  /** 允许列表 */
  allowFrom?: string[];
}
```

#### 1.2 配置示例

```json
{
  "channels": {
    "wecom": {
      "enabled": true,
      "accounts": {
        "default": {
          "name": "我的企业微信",
          "enabled": true,
          "bot": {
            "botId": "your-bot-id",
            "secret": "your-bot-secret"
          },
          "agent": {
            "agentId": 100001,
            "secret": "your-agent-secret",
            "callback": {
              "path": "/wecom/callback",
              "token": "your-token",
              "encodingAESKey": "43-char-base64-string",
              "corpId": "wx1234567890abcdef"
            }
          },
          "dmPolicy": "open",
          "allowFrom": ["*"]
        }
      }
    }
  }
}
```

### 2. 加密/解密实现

```typescript
// src/callback/crypto.ts
import * as crypto from 'node:crypto';

/**
 * 解码 EncodingAESKey 为 AESKey (32 字节)
 */
export function decodeEncodingAESKey(encodingAESKey: string): Buffer {
  const padded = encodingAESKey + "=";
  return Buffer.from(padded, 'base64');
}

/**
 * AES-256-CBC 解密企业微信回调消息
 */
export function decryptMessage(
  encryptedBase64: string,
  aesKey: Buffer
): { msg: string; receiveId: string } {
  // 1. Base64 解码
  const encrypted = Buffer.from(encryptedBase64, 'base64');
  
  // 2. AES-256-CBC 解密 (IV = AESKey 前 16 字节)
  const iv = aesKey.slice(0, 16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
  decipher.setAutoPadding(false);
  
  let decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  
  // 3. 移除 PKCS#7 填充
  const padLen = decrypted[decrypted.length - 1];
  decrypted = decrypted.slice(0, decrypted.length - padLen);
  
  // 4. 解析格式: random(16) + msg_len(4) + msg + receiveId
  const msgLen = decrypted.readUInt32BE(16);
  const msg = decrypted.slice(20, 20 + msgLen).toString('utf8');
  const receiveId = decrypted.slice(20 + msgLen).toString('utf8');
  
  return { msg, receiveId };
}

/**
 * AES-256-CBC 加密消息 (用于被动回复)
 */
export function encryptMessage(
  msg: string,
  aesKey: Buffer,
  receiveId: string
): string {
  // 1. 构造明文: random(16) + msg_len(4) + msg + receiveId
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
```

### 3. 签名验证

```typescript
// src/callback/signature.ts
import * as crypto from 'node:crypto';

/**
 * 生成企业微信回调签名
 * 
 * signature = sha1(sort(token, timestamp, nonce, msg_encrypt))
 */
export function generateSignature(
  token: string,
  timestamp: string,
  nonce: string,
  msgEncrypt: string
): string {
  const sorted = [token, timestamp, nonce, msgEncrypt]
    .sort()
    .join('');
  
  return crypto
    .createHash('sha1')
    .update(sorted)
    .digest('hex');
}

/**
 * 验证企业微信回调签名
 */
export function verifySignature(
  signature: string,
  token: string,
  timestamp: string,
  nonce: string,
  msgEncrypt: string
): boolean {
  const expected = generateSignature(token, timestamp, nonce, msgEncrypt);
  
  // 使用常量时间比较，防止时序攻击
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}

/**
 * 验证时间戳有效性（防止重放攻击）
 */
export function verifyTimestamp(
  timestamp: string,
  maxAgeMs: number = 300000  // 5 分钟
): boolean {
  const timestampNum = parseInt(timestamp, 10);
  if (isNaN(timestampNum)) return false;
  
  const now = Date.now() / 1000;
  const age = Math.abs(now - timestampNum);
  
  return age <= maxAgeMs / 1000;
}
```

### 4. XML 解析

```typescript
// src/callback/parser.ts
import * as xml2js from 'xml2js';

export interface WeComCallbackMessage {
  ToUserName: string;
  FromUserName: string;
  CreateTime: number;
  MsgType: string;
  Content?: string;
  MsgId?: string;
  AgentID?: string;
  Event?: string;
  EventKey?: string;
  PicUrl?: string;
  MediaId?: string;
  Format?: string;
  Recognition?: string;
  Location_X?: number;
  Location_Y?: number;
  Scale?: number;
  Label?: string;
  Title?: string;
  Description?: string;
  Url?: string;
}

/**
 * 解析企业微信回调 XML
 */
export async function parseCallbackXml(xml: string): Promise<WeComCallbackMessage> {
  const parser = new xml2js.Parser({
    explicitArray: false,
    explicitCharkey: false,
    normalize: true,
    trim: true
  });
  
  const result = await parser.parseStringPromise(xml);
  return result.xml as WeComCallbackMessage;
}

/**
 * 从加密 XML 中提取 Encrypt 字段
 */
export function extractEncryptField(xml: string): string | null {
  const match = xml.match(/<Encrypt><!\[CDATA\[(.*?)\]\]><\/Encrypt>/s);
  return match ? match[1] : null;
}

/**
 * 构建被动回复 XML
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
```

### 5. 回调处理器

```typescript
// src/callback/handler.ts
import type { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';
import { verifySignature, verifyTimestamp } from './signature.js';
import { decryptMessage } from './crypto.js';
import { parseCallbackXml, extractEncryptField } from './parser.js';
import type { WeComAccountConfig } from '../types/callback.js';
import type { RuntimeEnv } from 'openclaw/plugin-sdk/runtime-env';

export interface CallbackHandlerContext {
  account: WeComAccountConfig;
  runtime: RuntimeEnv;
  accountId: string;
}

/**
 * 处理企业微信回调请求
 */
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
  
  // GET 请求：URL 验证
  if (req.method === 'GET') {
    return handleUrlVerification(req, res, ctx, query);
  }
  
  // POST 请求：消息回调
  if (req.method === 'POST') {
    return handleMessageCallback(req, res, ctx, query);
  }
  
  // 其他方法
  res.statusCode = 405;
  res.end('Method Not Allowed');
  return true;
}

/**
 * 处理 URL 验证（GET 请求）
 */
async function handleUrlVerification(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: CallbackHandlerContext,
  query: { msg_signature: string; timestamp: string; nonce: string; echostr: string }
): Promise<boolean> {
  const { account, runtime, accountId } = ctx;
  const callback = account.agent?.callback;
  
  if (!callback) {
    runtime.error?.(`[wecom][callback][${accountId}] Agent callback not configured`);
    res.statusCode = 400;
    res.end('Callback not configured');
    return true;
  }
  
  runtime.log?.(`[wecom][callback][${accountId}] URL verification request received`);
  
  // 1. 验证签名
  const valid = verifySignature(
    query.msg_signature,
    callback.token,
    query.timestamp,
    query.nonce,
    query.echostr
  );
  
  if (!valid) {
    runtime.error?.(`[wecom][callback][${accountId}] Signature verification failed`);
    res.statusCode = 403;
    res.end('Invalid signature');
    return true;
  }
  
  // 2. 解密 echostr
  try {
    const aesKey = decodeEncodingAESKey(callback.encodingAESKey);
    const { msg } = decryptMessage(query.echostr, aesKey);
    
    runtime.log?.(`[wecom][callback][${accountId}] URL verification successful`);
    
    // 3. 返回明文 echostr（无引号、无 BOM、无换行）
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

/**
 * 处理消息回调（POST 请求）
 */
async function handleMessageCallback(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: CallbackHandlerContext,
  query: { msg_signature: string; timestamp: string; nonce: string; echostr: string }
): Promise<boolean> {
  const { account, runtime, accountId } = ctx;
  const callback = account.agent?.callback;
  
  if (!callback) {
    runtime.error?.(`[wecom][callback][${accountId}] Agent callback not configured`);
    res.statusCode = 400;
    res.end('Callback not configured');
    return true;
  }
  
  runtime.log?.(`[wecom][callback][${accountId}] Message callback received`);
  
  // 1. 读取 POST body
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString('utf8');
  
  // 2. 提取 Encrypt 字段
  const msgEncrypt = extractEncryptField(body);
  if (!msgEncrypt) {
    runtime.error?.(`[wecom][callback][${accountId}] No Encrypt field in XML`);
    res.statusCode = 400;
    res.end('Invalid XML format');
    return true;
  }
  
  // 3. 验证签名
  const valid = verifySignature(
    query.msg_signature,
    callback.token,
    query.timestamp,
    query.nonce,
    msgEncrypt
  );
  
  if (!valid) {
    runtime.error?.(`[wecom][callback][${accountId}] Signature verification failed`);
    res.statusCode = 403;
    res.end('Invalid signature');
    return true;
  }
  
  // 4. 验证时间戳（可选）
  if (!verifyTimestamp(query.timestamp)) {
    runtime.error?.(`[wecom][callback][${accountId}] Timestamp expired`);
    res.statusCode = 403;
    res.end('Timestamp expired');
    return true;
  }
  
  // 5. 解密消息
  try {
    const aesKey = decodeEncodingAESKey(callback.encodingAESKey);
    const { msg, receiveId } = decryptMessage(msgEncrypt, aesKey);
    
    // 6. 验证 receiveId
    if (receiveId !== callback.corpId) {
      runtime.error?.(`[wecom][callback][${accountId}] receiveId mismatch: expected=${callback.corpId}, got=${receiveId}`);
      res.statusCode = 400;
      res.end('receiveId mismatch');
      return true;
    }
    
    // 7. 解析消息 XML
    const parsed = await parseCallbackXml(msg);
    runtime.log?.(`[wecom][callback][${accountId}] Message received: MsgType=${parsed.MsgType}, From=${parsed.FromUserName}`);
    
    // 8. 分发消息到核心处理流程
    await dispatchMessage(parsed, ctx);
    
    // 9. 返回成功（5 秒内必须响应）
    res.statusCode = 200;
    res.end('success');
    return true;
    
  } catch (err) {
    runtime.error?.(`[wecom][callback][${accountId}] Process message failed: ${String(err)}`);
    res.statusCode = 500;
    res.end('Process failed');
    return true;
  }
}

/**
 * 分发消息到核心处理流程
 */
async function dispatchMessage(
  msg: WeComCallbackMessage,
  ctx: CallbackHandlerContext
): Promise<void> {
  // TODO: 实现消息分发逻辑
  // 1. 将消息转换为 OpenClaw 内部格式
  // 2. 调用 channel.reply.dispatch() 分发到 AI
  // 3. 处理流式回复
  
  console.log(`[wecom][callback] Dispatch message: ${JSON.stringify(msg)}`);
}
```

### 6. 插件注册

```typescript
// index.ts (修改)
import { handleWeComCallback } from './src/callback/index.js';
import { resolveWeComAccount } from './src/config/accounts.js';

const plugin = {
  id: "wecom-openclaw-plugin",
  name: "企业微信",
  description: "企业微信 OpenClaw 插件",
  configSchema: emptyPluginConfigSchema(),
  
  register(api: OpenClawPluginApi) {
    // 设置运行时
    setWeComRuntime(api.runtime);
    
    // 注册 Channel
    api.registerChannel({ plugin: wecomPlugin });
    
    // 注册 Tool
    api.registerTool(createWeComMcpTool(), { name: "wecom_mcp" });
    
    // 注册 HTTP 路由 (新增)
    const cfg = api.runtime.config.loadConfig();
    const account = resolveWeComAccount(cfg);
    
    if (account.agent?.callback) {
      const callbackPath = account.agent.callback.path || "/wecom/callback";
      
      api.registerHttpRoute({
        path: callbackPath,
        handler: async (req, res) => {
          return handleWeComCallback(req, res, {
            account,
            runtime: api.runtime,
            accountId: account.accountId
          });
        },
        auth: "plugin",
        match: "exact"
      });
      
      console.log(`[wecom] Callback route registered at ${callbackPath}`);
    }
    
    // ... 其他注册逻辑
  }
};
```

---

## 🔒 安全措施

### 1. 签名验证（必须）

- **所有请求都必须验证签名**
- 使用 SHA1(token, timestamp, nonce, msg_encrypt)
- 使用常量时间比较（防止时序攻击）

### 2. 时间戳验证（推荐）

- 防止重放攻击
- 拒绝超过 5 分钟的请求

### 3. receiveId 验证（必须）

- 验证 receiveId 是否匹配 corpId
- 防止跨企业消息注入

### 4. 密钥管理

- EncodingAESKey 仅在内存中解码
- 不在日志中输出密钥信息
- 使用环境变量或安全存储

---

## 📊 错误处理

| 错误类型 | HTTP 状态码 | 处理方式 |
|---------|-----------|---------|
| 签名验证失败 | 403 | 拒绝请求，记录日志 |
| 时间戳过期 | 403 | 拒绝请求，记录日志 |
| receiveId 不匹配 | 400 | 拒绝请求，记录日志 |
| XML 解析失败 | 400 | 拒绝请求，返回错误 |
| 解密失败 | 500 | 返回错误，企业微信会重试 |
| 消息处理失败 | 500 | 返回错误，企业微信会重试 |

**重试机制**：
- 企业微信最多重试 5 次
- 必须在 5 秒内响应
- 返回 200 或 "success" 表示成功接收

---

## 🧪 测试方案

### 1. 本地测试（使用 ngrok）

```bash
# 1. 启动 OpenClaw Gateway
openclaw gateway start

# 2. 启动 ngrok
ngrok http 18789

# 3. 使用 ngrok URL 配置企业微信回调
# URL: https://your-ngrok-url.ngrok.io/wecom/callback
```

### 2. 企业微信管理后台配置

1. 登录企业微信管理后台
2. 进入应用管理 → 选择应用 → 设置 API 接收
3. 填写：
   - **URL**: `https://your-domain.com/wecom/callback`
   - **Token**: 与配置文件中一致
   - **EncodingAESKey**: 随机生成或与配置文件一致

### 3. 测试验证

```bash
# 测试 URL 验证
curl "http://localhost:18789/wecom/callback?msg_signature=xxx&timestamp=xxx&nonce=xxx&echostr=encrypted"

# 测试消息接收（需要企业微信发送真实消息）
# 企业微信会在应用内发送消息时触发回调
```

---

## 📝 集成步骤

### 步骤 1：安装依赖

```bash
cd /home/highland/projects/wecom-openclaw-plugin
npm install xml2js
npm install --save-dev @types/xml2js
```

### 步骤 2：创建回调模块

按照上述文件结构创建 `src/callback/` 目录和相关文件。

### 步骤 3：修改配置类型

在 `src/types/` 中添加回调配置类型定义。

### 步骤 4：注册 HTTP 路由

在 `index.ts` 中注册回调路由。

### 步骤 5：测试验证

使用 ngrok 进行本地测试，然后部署到生产环境。

---

## 🎯 后续优化

1. **被动回复支持**：实现加密的被动回复消息
2. **事件处理**：处理关注、取消关注、菜单点击等事件
3. **多账号支持**：支持一个插件管理多个企业微信账号
4. **监控告警**：添加回调失败监控和告警
5. **日志审计**：记录所有回调请求用于安全审计

---

*文档版本：v1.0*  
*最后更新：2026.04.06*