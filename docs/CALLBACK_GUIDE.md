# 企业微信回调集成指南

> 本文档指导您完成 wecom-openclaw-plugin 的企业微信回调集成

---

## 📋 概述

企业微信回调允许您的应用接收企业微信服务器的实时消息推送，包括：

- 用户发送给应用的消息
- 菜单点击事件
- 关注/取消关注事件
- 通讯录变更事件

---

## 🚀 快速开始

### 步骤 1：安装依赖

```bash
cd /path/to/wecom-openclaw-plugin
npm install xml2js
npm install --save-dev @types/xml2js
```

### 步骤 2：配置企业微信回调

在企业微信管理后台配置回调：

1. 登录企业微信管理后台：https://work.weixin.qq.com/
2. 进入「应用管理」→ 选择应用 → 「设置 API 接收」
3. 填写以下信息：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| **URL** | 回调地址 | `https://your-domain.com/wecom/callback` |
| **Token** | 验证令牌 | `your_token_123` |
| **EncodingAESKey** | 加密密钥 | 随机生成或手动输入（43 字符） |

### 步骤 3：配置插件

编辑 `~/.openclaw/openclaw.json`：

```json
{
  "channels": {
    "wecom": {
      "enabled": true,
      "agent": {
        "agentId": 100001,
        "secret": "your_agent_secret",
        "callback": {
          "path": "/wecom/callback",
          "token": "your_token_123",
          "encodingAESKey": "43-character-base64-string",
          "corpId": "wx1234567890abcdef"
        }
      },
      "dmPolicy": "open",
      "allowFrom": ["*"]
    }
  }
}
```

### 步骤 4：启动 Gateway

```bash
openclaw gateway start
```

Gateway 启动后会自动注册回调路由：`/wecom/callback`

---

## 🧪 测试验证

### 本地测试（使用 ngrok）

```bash
# 1. 启动 ngrok
ngrok http 18789

# 2. 使用 ngrok URL 配置企业微信
# URL: https://your-ngrok-id.ngrok.io/wecom/callback

# 3. 企业微信会自动发送 GET 请求验证 URL
# 日志输出：[wecom][callback] URL verification successful
```

### 验证回调工作正常

1. **URL 验证**：配置回调 URL 时，企业微信会发送 GET 请求
   - 成功：返回 200，日志显示 "URL verification successful"
   - 失败：检查 Token 和 EncodingAESKey 是否正确

2. **消息接收**：在企业微信应用中发送消息
   - 成功：日志显示 "Message received: MsgType=text, From=xxx"
   - 失败：检查签名验证、解密是否正确

---

## 🔧 配置说明

### 回调配置字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `path` | string | 否 | 回调路径，默认 `/wecom/callback` |
| `token` | string | 是 | 验证令牌，3-32 字符 |
| `encodingAESKey` | string | 是 | 加密密钥，43 字符 Base64 |
| `corpId` | string | 是 | 企业 ID，用于 receiveId 验证 |

### 完整配置示例

```json
{
  "channels": {
    "wecom": {
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
          "token": "your_token_123",
          "encodingAESKey": "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567",
          "corpId": "wx1234567890abcdef"
        }
      },
      "dmPolicy": "open",
      "allowFrom": ["*"]
    }
  }
}
```

---

## 🔄 工作流程

### URL 验证流程

```
企业微信服务器                    插件
      │                           │
      │ GET /wecom/callback       │
      │ ?msg_signature=xxx        │
      │ &timestamp=xxx            │
      │ &nonce=xxx                │
      │ &echostr=ENCRYPTED        │
      ├──────────────────────────>│
      │                           │ 1. 验证签名
      │                           │ 2. 解密 echostr
      │                           │
      │ 200 OK                    │
      │ plaintext_echostr         │
      │<──────────────────────────┤
      │                           │
```

### 消息接收流程

```
企业微信服务器                    插件                    OpenClaw
      │                           │                         │
      │ POST /wecom/callback      │                         │
      │ ?msg_signature=xxx        │                         │
      │ &timestamp=xxx            │                         │
      │ &nonce=xxx                │                         │
      │ <Encrypt>...</Encrypt>    │                         │
      ├──────────────────────────>│                         │
      │                           │ 1. 验证签名              │
      │                           │ 2. 解密消息              │
      │                           │ 3. 解析 XML              │
      │                           │                         │
      │                           │ 分发消息                 │
      │                           ├────────────────────────>│
      │                           │                         │
      │                           │           AI 回复       │
      │                           │<────────────────────────┤
      │                           │                         │
      │ 200 OK                    │                         │
      │ "success"                 │                         │
      │<──────────────────────────┤                         │
      │                           │                         │
```

---

## 🔒 安全措施

### 1. 签名验证

所有回调请求都必须通过签名验证：

- 使用 SHA1 算法
- 参数：token, timestamp, nonce, msg_encrypt
- 防止伪造请求

### 2. 时间戳验证

防止重放攻击：

- 默认允许 5 分钟内的时间差
- 超时的请求会被拒绝（403 Forbidden）

### 3. receiveId 验证

防止跨企业消息注入：

- 解密后验证 receiveId 是否匹配 corpId
- 不匹配的请求会被拒绝（400 Bad Request）

### 4. 加密传输

- 所有消息内容使用 AES-256-CBC 加密
- 密钥由 EncodingAESKey 派生
- 防止消息内容泄露

---

## 🚨 故障排查

### 问题 1：URL 验证失败

**症状**：企业微信提示 "URL 验证失败"

**排查步骤**：

1. 检查 Token 是否正确
2. 检查 EncodingAESKey 是否正确（43 字符）
3. 查看日志：`[wecom][callback] Verification failed`
4. 测试签名算法是否一致

### 问题 2：签名验证失败

**症状**：日志显示 "Signature verification failed"

**排查步骤**：

1. 确认 Token 配置正确
2. 检查是否使用了正确的签名算法（SHA1）
3. 确认参数排序正确（字典序）

### 问题 3：解密失败

**症状**：日志显示 "Decrypt failed"

**排查步骤**：

1. 确认 EncodingAESKey 正确（43 字符 Base64）
2. 检查密钥格式（需追加 "=" 再解码）
3. 验证 IV 是否正确（AESKey 前 16 字节）

### 问题 4：receiveId 不匹配

**症状**：日志显示 "receiveId mismatch"

**排查步骤**：

1. 确认 corpId 配置正确
2. 检查是否使用了正确的企业 ID

---

## 📊 日志级别

| 日志前缀 | 含义 | 示例 |
|---------|------|------|
| `[wecom][callback][accountId]` | 回调相关日志 | URL 验证、消息接收 |
| `URL verification request received` | 收到 URL 验证请求 | GET 请求 |
| `URL verification successful` | URL 验证成功 | 配置成功 |
| `Message callback received` | 收到消息回调 | POST 请求 |
| `Message received` | 消息接收成功 | MsgType, From 等信息 |

---

## 🔍 调试技巧

### 1. 查看原始请求

```bash
# 使用 curl 模拟企业微信回调
curl "http://localhost:18789/wecom/callback?msg_signature=xxx&timestamp=xxx&nonce=xxx&echostr=encrypted"
```

### 2. 检查路由注册

```bash
# 启动 Gateway 后检查日志
# 应该看到：[wecom] Callback route registered at /wecom/callback
```

### 3. 验证配置加载

```bash
# 检查配置是否正确加载
openclaw config get channels.wecom.agent.callback
```

---

## 📚 参考资料

- [企业微信回调配置文档](https://developer.work.weixin.qq.com/document/path/90375)
- [消息加密/解密说明](https://developer.work.weixin.qq.com/document/path/90376)
- [OpenClaw 插件开发文档](https://docs.openclaw.ai/plugins/sdk-channel-plugins)

---

## 🎯 下一步

1. **完成消息分发**：实现 `dispatchMessage` 函数，将消息路由到 OpenClaw 核心
2. **实现被动回复**：支持在回调中直接返回加密的回复消息
3. **事件处理**：处理关注、菜单点击等事件
4. **多账号支持**：支持一个插件管理多个企业微信账号

---

*文档版本：v1.0*  
*最后更新：2026.04.06*