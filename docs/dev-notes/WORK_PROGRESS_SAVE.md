# 企业微信 OpenClaw 插件 - 工作进度保存

**保存时间：** 2026-04-07 17:25 (UTC)
**项目状态：** ✅ 回调模式消息重复发送问题已修复

---

## 📢 重要提醒

### 官方插件升级风险

在 2026-04-07 的调试过程中，曾进行过官方插件升级。**经 MD5 校验验证，运行时代码（dist/）与本地代码一致，未被覆盖。**

详见：[2026-04-07-CALLBACK_FIX.md](./2026-04-07-CALLBACK_FIX.md)

### 建议

1. **部署前验证**：每次部署后执行 MD5 校验
2. **备份机制**：升级前备份 `/root/.openclaw/extensions/wecom-openclaw-plugin/`
3. **版本锁定**：考虑 fork 官方仓库或锁定版本

---

## 📍 项目位置

**项目路径：** `/home/highland/projects/wecom-openclaw-plugin/`

**OpenClaw 部署位置：**
- 容器 IP: `<YOUR_CONTAINER_IP>`
- PVE 宿主机: `<YOUR_PVE_HOST_IP>` (容器 ID: `<YOUR_CONTAINER_ID>`)
- OpenClaw 配置: `/root/.openclaw/openclaw.json`
- 插件位置: `/root/.openclaw/extensions/wecom-openclaw-plugin/`
- 日志位置: `/tmp/openclaw/openclaw-2026-04-06.log`

---

## ✅ 已完成的工作

### 1. MCP Server 替换为 OpenAPI (100%)

**文件修改：**
- `src/mcp/tool.ts` - 移除 `call` 和 `list` action，保留 `openapi`
- `src/openapi/` - 8 个 OpenAPI 模块，74 个 API 方法

**OpenAPI 模块：**
- `user.ts` - 用户管理
- `department.ts` - 部门管理
- `message.ts` - 消息发送 ✅
- `media.ts` - 媒体管理
- `chat.ts` - 群聊管理
- `externalcontact.ts` - 外部联系人
- `corp.ts` - 企业管理
- `index.ts` - 统一导出

### 2. 回调模式完整实现 (100%)

**新增文件：**
- `src/callback/crypto.ts` - AES 加密/解密
- `src/callback/signature.ts` - SHA1 签名验证
- `src/callback/parser.ts` - XML 解析
- `src/callback/handler.ts` - HTTP 请求处理 ⭐ 核心文件
- `src/callback/message-adapter.ts` - 消息上下文转换 ⭐ 关键修复
- `src/callback/reply-sender.ts` - OpenAPI 回复发送
- `src/callback/index.ts` - 模块导出

**关键修复：**
1. ✅ 异步处理模式（避免企业微信 5 秒超时）
2. ✅ 完整上下文字段（MessageSid, ChatType, ConversationLabel 等）
3. ✅ replyOptions 配置（`disableBlockStreaming: false`）

### 3. 双模式支持 (100%)

**WebSocket 模式：**
- 文件：`src/monitor.ts`
- 状态：✅ 保留原有功能
- 特点：实时流式回复

**回调模式：**
- 文件：`src/callback/handler.ts`
- 状态：✅ 新增完成
- 特点：HTTP 回调 + OpenAPI 主动发送

### 4. 回调模式消息重复发送修复 (100%) - 2026-04-07

**问题**：用户每次发送消息收到两条回复

**根因分析**：
1. 企业微信 webhook 5 秒超时重试
2. `onIdle` 回调被多次调用
3. accumulator 删除时机不正确

**修复方案**：
- 立即返回 HTTP 200，异步处理消息
- deliver 只累积文本，不发送
- onIdle 发送完整回复
- 发送前立即删除 accumulator，防止并发问题

**提交记录**：
- `c4d692d` fix: 回调模式消息重复发送问题（最终修复）
- `4811ffd` fix: 企业微信回调消息重复处理问题

**验证状态**：✅ 用户测试通过，消息只发送一次

### 5. 阿里百炼 GLM-5 集成 (100%)

**配置文件：** `/root/.openclaw/openclaw.json`

```json
{
  "models": {
    "providers": {
      "bailian": {
        "baseUrl": "https://coding.dashscope.aliyuncs.com/v1",
        "apiKey": "YOUR_API_KEY",
        "api": "openai-completions",
        "models": [
          {
            "id": "glm-5",
            "name": "GLM-5",
            "api": "openai-completions",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 32000,
            "maxTokens": 4096
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "bailian/glm-5"
      }
    }
  },
  "channels": {
    "wecom": {
      "enabled": true,
      "corpId": "YOUR_CORP_ID",
      "agentId": YOUR_AGENT_ID,
      "agentSecret": "YOUR_AGENT_SECRET",
      "callback": {
        "path": "/wecom/callback",
        "token": "YOUR_CALLBACK_TOKEN",
        "encodingAESKey": "YOUR_ENCODING_AES_KEY",
        "corpId": "YOUR_CORP_ID"
      }
    }
  }
}
```

### 6. 端到端测试验证 (100%)

**测试结果：** ✅ 完全成功

**验证流程：**
1. ✅ 企业微信发送消息
2. ✅ OpenClaw 接收回调
3. ✅ 消息解密成功
4. ✅ AI 生成回复（GLM-5）
5. ✅ deliver 回调触发
6. ✅ OpenAPI 发送回复
7. ✅ 企业微信收到消息

**成功日志：**
```
[wecom][callback][default] ===== DELIVER CALLED =====
[wecom][callback][default] Sending reply via OpenAPI to GaoHong
[wecom][callback][default] Reply sent successfully ✅
```

---

## 📋 待验证的 OpenAPI 功能

### 高优先级：

1. **消息发送测试** ✅ 已验证
   - 文本消息发送
   - Markdown 消息发送

2. **媒体消息发送**
   - 图片消息
   - 文件消息
   - 语音消息

3. **群聊消息发送**
   - 群文本消息
   - 群媒体消息

### 中优先级：

4. **用户管理**
   - 获取用户信息
   - 用户列表

5. **部门管理**
   - 部门列表
   - 部门成员

### 低优先级：

6. **外部联系人**
7. **企业管理**
8. **其他高级功能**

---

## 🔧 关键文件清单

### 核心实现文件：

```
/home/highland/projects/wecom-openclaw-plugin/
├── index.ts                           # 插件入口
├── src/
│   ├── callback/                      # 回调模块
│   │   ├── handler.ts                 # ⭐ HTTP 请求处理
│   │   ├── message-adapter.ts         # ⭐ 消息上下文转换
│   │   ├── reply-sender.ts            # OpenAPI 回复发送
│   │   ├── crypto.ts                  # AES 加密/解密
│   │   ├── signature.ts               # 签名验证
│   │   └── parser.ts                  # XML 解析
│   ├── openapi/                       # OpenAPI 模块
│   │   ├── message.ts                 # ⭐ 消息发送 API
│   │   ├── media.ts                   # 媒体管理 API
│   │   ├── user.ts                    # 用户管理 API
│   │   ├── department.ts              # 部门管理 API
│   │   ├── chat.ts                    # 群聊管理 API
│   │   └── index.ts                   # 统一导出
│   ├── mcp/
│   │   └── tool.ts                    # MCP Tool 定义
│   └── monitor.ts                     # WebSocket 模式
└── docs/
    ├── FINAL_SOLUTION.md              # ⭐ 最终解决方案
    ├── DUAL_MODE_ARCHITECTURE.md      # 双模式架构
    ├── WORK_PROGRESS.md               # 开发进度报告
    ├── CALLBACK_DESIGN.md             # 回调设计文档
    └── CALLBACK_GUIDE.md              # 回调使用指南
```

---

## 🚀 下次如何继续

### 方法 1：查看项目状态

```bash
# 查看最终解决方案
cat /home/highland/projects/wecom-openclaw-plugin/FINAL_SOLUTION.md

# 查看工作进度
cat /home/highland/projects/wecom-openclaw-plugin/WORK_PROGRESS_SAVE.md
```

### 方法 2：提供上下文恢复

**告诉我：**
```
我想继续 wecom-openclaw-plugin 项目的开发。
请阅读以下文件恢复上下文：
1. /home/highland/projects/wecom-openclaw-plugin/FINAL_SOLUTION.md
2. /home/highland/projects/wecom-openclaw-plugin/WORK_PROGRESS_SAVE.md
```

### 方法 3：直接说明需求

**例如：**
```
我想验证 OpenAPI 的媒体消息发送功能。
项目位置：/home/highland/projects/wecom-openclaw-plugin
主要文件：src/openapi/media.ts
```

---

## 📊 技术债务和改进建议

### 代码质量：

1. **移除调试日志**
   - 移除 `console.log` 调试语句
   - 保留必要的 `runtime.log` 日志

2. **错误处理增强**
   - 添加更详细的错误信息
   - 实现重试机制

3. **类型定义完善**
   - 补充 TypeScript 类型定义
   - 添加接口文档

### 功能扩展：

1. **群聊支持**
   - 群消息接收
   - 群消息发送
   - 群管理功能

2. **媒体消息**
   - 图片消息
   - 文件消息
   - 语音消息
   - 视频消息

3. **高级功能**
   - 消息撤回
   - 消息引用回复
   - 交互卡片

---

## 📞 联系方式

**项目仓库：** 本地开发
**OpenClaw 文档：** https://docs.openclaw.ai/
**企业微信 API：** https://developer.work.weixin.qq.com/document/path/90664
**参考项目：** https://github.com/YanHaidao/wecom

---

## 🎯 下次验证 OpenAPI 的建议步骤

### 1. 验证媒体上传

```typescript
// 测试图片上传
import { getOpenApiService } from './src/openapi/index.js';

const openApi = getOpenApiService();
const result = await openApi.media.upload({
  type: 'image',
  media: imageBuffer
});

console.log('Media ID:', result.media_id);
```

### 2. 验证媒体消息发送

```typescript
// 测试发送图片消息
await openApi.message.send({
  touser: 'YOUR_USER_ID',
  msgtype: 'image',
  agentid: YOUR_AGENT_ID,
  image: {
    media_id: 'MEDIA_ID'
  }
});
```

### 3. 验证群消息发送

```typescript
// 测试发送群消息
await openApi.message.send({
  tochat: 'CHAT_ID',
  msgtype: 'text',
  agentid: YOUR_AGENT_ID,
  text: {
    content: '群消息测试'
  }
});
```

---

**保存完成！下次继续时，只需告诉我 "继续 wecom-openclaw-plugin 项目" 即可恢复上下文。** ✅