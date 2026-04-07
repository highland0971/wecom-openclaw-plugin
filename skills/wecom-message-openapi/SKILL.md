---
name: wecom-message-openapi
description: 企业微信消息推送增强技能。通过 OpenAPI 直接调用企业微信消息推送接口，支持发送多种类型消息（文本/图片/语音/视频/文件/markdown/模板卡片）、消息撤回、群聊会话管理。当需要"给指定人员发送图片/文件"、"撤回消息"、"创建群聊"、"发送 markdown 消息"时触发。需要配置 corpId 和 agentSecret。
metadata:
  {
    "openclaw": { "emoji": "📨" },
  }
---

# 企业微信消息推送增强

> `wecom_mcp` 是一个 MCP tool，通过 `openapi` action 直接调用企业微信 OpenAPI，绕过 MCP Server 限制。

> ⚠️ **前置条件**：
> 1. 已配置 `channels.wecom.corpId` 和 `channels.wecom.agentSecret`
> 2. 已配置 `channels.wecom.agentId`（发送应用消息时需要）
> 3. 首次调用前，必须按 `wecom-preflight` 技能执行前置条件检查

---

## 接口列表

### 发送应用消息 — send

使用 `wecom_mcp` tool 调用 `wecom_mcp openapi message send '<json入参>'`

向指定用户/部门/标签发送应用消息，支持多种消息类型。参见 [API 详情](references/api-send-message.md)。

### 撤回消息 — recall

使用 `wecom_mcp` tool 调用 `wecom_mcp openapi message recall '{"msgid": "MSGID"}'`

撤回 24 小时内发送的应用消息。

### 创建群聊 — createAppChat

使用 `wecom_mcp` tool 调用 `wecom_mcp openapi message createAppChat '{"name": "群名", "userlist": ["user1", "user2"]}'`

创建群聊会话，返回群聊 ID。

### 修改群聊 — updateAppChat

使用 `wecom_mcp` tool 调用 `wecom_mcp openapi message updateAppChat '{"chatid": "CHATID", "name": "新群名"}'`

修改群聊名称、群主、成员。

### 获取群聊 — getAppChat

使用 `wecom_mcp` tool 调用 `wecom_mcp openapi message getAppChat '{"chatid": "CHATID"}'`

获取群聊详情。

### 群聊发消息 — sendAppChatMessage

使用 `wecom_mcp` tool 调用 `wecom_mcp openapi message sendAppChatMessage '<json入参>'`

向指定群聊发送消息。

---

## 核心规则

### 发送对象规则
- `touser`: 用户 ID 列表，用 `|` 分隔，最多 1000 个，或 `"@all"` 发送给全部
- `toparty`: 部门 ID 列表，用 `|` 分隔，最多 100 个
- `totag`: 标签 ID 列表，用 `|` 分隔，最多 100 个

### 消息类型支持

| msgtype | 说明 | 大小限制 |
|---------|------|---------|
| `text` | 文本消息 | 2048 字节 |
| `image` | 图片消息 | 10MB |
| `voice` | 语音消息 | 2MB，仅支持 AMR |
| `video` | 视频消息 | 10MB |
| `file` | 文件消息 | 20MB |
| `textcard` | 文本卡片 | - |
| `news` | 图文消息 | 8 条图文 |
| `markdown` | Markdown 消息 | 2048 字节 |

### 强制交互步骤
1. **发送前确认**：发送消息前必须向用户确认发送对象和内容
2. **返回 msgid**：成功发送后返回 msgid，可用于撤回

---

## 典型工作流

### 发送文本消息给指定用户

**用户 query 示例**：
- "给张三发一条消息：明天开会"
- "给群里发个通知：下午3点开会"

**执行流程**：
1. 调用 `wecom-contact-lookup get_userlist` 获取通讯录，建立 userid 映射
2. 通过用户名查找 userid（精确/模糊匹配）
3. 确认发送：`即将向 张三(userid1) 发送：'明天开会'，确认发送吗？`
4. 调用 `wecom_mcp openapi message send`：
   ```json
   {
     "touser": "userid1",
     "msgtype": "text",
     "agentid": 1000001,
     "text": { "content": "明天开会" }
   }
   ```
5. 返回 msgid，告知用户发送成功

### 发送 Markdown 消息

**用户 query 示例**：
- "发送 markdown 消息给研发组：今日部署计划..."

**执行流程**：
1. 调用 `wecom-contact-lookup get_userlist` 获取部门列表，找到研发组 department_id
2. 确认发送
3. 调用 `wecom_mcp openapi message send`：
   ```json
   {
     "toparty": "2",
     "msgtype": "markdown",
     "agentid": 1000001,
     "markdown": {
       "content": "## 今日部署计划\n> **事项**：生产环境更新\n> **时间**：今天 18:00"
     }
   }
   ```

### 创建群聊并通知

**用户 query 示例**：
- "创建一个群聊：项目组，成员有张三、李四、王五"
- "建个群拉上开发团队"

**执行流程**：
1. 通过通讯录查找所有成员的 userid
2. 调用 `wecom_mcp openapi message createAppChat`：
   ```json
   {
     "name": "项目组",
     "userlist": ["zhangsan", "lisi", "wangwu"]
   }
   ```
3. 返回 chatid，告知用户群聊创建成功
4. 可选：调用 `sendAppChatMessage` 发送欢迎消息

### 撤回消息

**用户 query 示例**：
- "撤回刚才发的消息"
- "把那条消息撤回来"

**执行流程**：
1. 记录之前发送消息返回的 msgid
2. 调用 `wecom_mcp openapi message recall`：
   ```json
   { "msgid": "vcT8gGc-7dFb4bxT35ONjBDz901sLlXPZw1DAMC_Gc26qRpK-AK5sTJkkb0128t" }
   ```
3. 告知用户撤回成功

---

## 错误处理

| 错误码 | 说明 | 处理方式 |
|--------|------|---------|
| 81013 | 接收人无权限或不存在 | 检查 touser/toparty/totag 是否正确 |
| 45009 | 接口调用超过限制 | 等待后重试 |
| 40014 | access_token 无效 | 自动刷新 token 重试 |
| -1 | 系统繁忙 | 重试最多 3 次 |

---

## 快速参考

| 接口 | 用途 | 关键参数 |
|------|------|---------|
| `send` | 发送应用消息 | touser/toparty/totag, msgtype, agentid |
| `recall` | 撤回消息 | msgid |
| `createAppChat` | 创建群聊 | name, userlist |
| `updateAppChat` | 修改群聊 | chatid, name/add_user_list/del_user_list |
| `getAppChat` | 获取群聊 | chatid |
| `sendAppChatMessage` | 群聊发消息 | chatid, msgtype |