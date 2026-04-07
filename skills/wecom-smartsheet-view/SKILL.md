---
name: wecom-smartsheet-view
description: 智能表格视图管理技能。通过 OpenAPI 管理智能表格视图，支持创建/查询/更新/删除视图，支持表格视图、看板视图、甘特图、日历视图等类型。当需要"创建看板视图"、"添加甘特图"、"删除视图"时触发。需要配置 corpId 和 agentSecret。
metadata:
  {
    "openclaw": { "emoji": "📊" },
  }
---

# 智能表格视图管理

> `wecom_mcp` 是一个 MCP tool，通过 `openapi` action 直接调用企业微信 OpenAPI。

> ⚠️ **前置条件**：
> 1. 已配置 `channels.wecom.corpId` 和 `channels.wecom.agentSecret`
> 2. 已有智能表格文档，知道 docid 和 sheet_id
> 3. 首次调用前，必须按 `wecom-preflight` 技能执行前置条件检查

---

## 接口列表

### 添加视图 — addView

使用 `wecom_mcp` tool 调用 `wecom_mcp openapi smartsheet addView '<json入参>'`

创建新视图，支持多种视图类型。参见 [API 详情](references/api-add-view.md)。

### 删除视图 — deleteViews

使用 `wecom_mcp` tool 调用 `wecom_mcp openapi smartsheet deleteViews '{"docid": "...", "sheet_id": "...", "view_ids": ["view1", "view2"]}'`

批量删除视图。

### 更新视图 — updateView

使用 `wecom_mcp` tool 调用 `wecom_mcp openapi smartsheet updateView '<json入参>'`

更新视图标题、排序、过滤、分组、填色配置。

### 查询视图 — getViews

使用 `wecom_mcp` tool 调用 `wecom_mcp openapi smartsheet getViews '{"docid": "...", "sheet_id": "..."}'`

查询视图列表及详情。

---

## 视图类型

| view_type | 类型名称 | 说明 |
|-----------|---------|------|
| `VIEW_TYPE_GRID` | 表格视图 | 默认视图，表格形式展示数据 |
| `VIEW_TYPE_KANBAN` | 看板视图 | 按分组列展示卡片 |
| `VIEW_TYPE_GALLERY` | 画册视图 | 图片为主的展示 |
| `VIEW_TYPE_GANTT` | 甘特视图 | 项目进度时间线，需指定开始/结束日期字段 |
| `VIEW_TYPE_CALENDAR` | 日历视图 | 按日历展示，需指定日期字段 |

---

## 核心规则

### 视图数量限制
- 单表最多 200 个视图

### 甘特图/日历视图要求
- 必须指定 `start_date_field_id` 和 `end_date_field_id`
- 只允许日期类型字段 (`FIELD_TYPE_DATE_TIME`)

### 视图配置参数

| 参数 | 说明 |
|------|------|
| `view_title` | 视图标题 |
| `auto_sort` | 记录变更后自动重新排序 |
| `sort_spec` | 排序设置 |
| `group_spec` | 分组设置 |
| `filter_spec` | 过滤设置 |
| `field_visibility` | 字段可见性 |
| `frozen_field_count` | 冻结列数 |
| `color_config` | 填色设置 |

---

## 典型工作流

### 创建看板视图

**用户 query 示例**：
- "给这个表格创建一个看板视图"
- "添加一个按状态分组的看板"

**执行流程**：
1. 确认 docid 和 sheet_id（从上下文或用户输入获取）
2. 调用 `wecom_mcp openapi smartsheet addView`：
   ```json
   {
     "docid": "DOCID",
     "sheet_id": "SHEETID",
     "view_title": "看板视图",
     "view_type": "VIEW_TYPE_KANBAN"
   }
   ```
3. 返回 view_id，告知用户创建成功

### 创建甘特图

**用户 query 示例**：
- "创建一个甘特图视图，开始时间是开始日期字段"
- "用项目进度表创建甘特图"

**执行流程**：
1. 调用 `wecom_mcp openapi doc smartsheet_get_fields` 获取字段列表
2. 找到日期类型字段的 field_id
3. 调用 `wecom_mcp openapi smartsheet addView`：
   ```json
   {
     "docid": "DOCID",
     "sheet_id": "SHEETID",
     "view_title": "项目甘特图",
     "view_type": "VIEW_TYPE_GANTT",
     "property_gantt": {
       "start_date_field_id": "FIELDID_START",
       "end_date_field_id": "FIELDID_END"
     }
   }
   ```

### 查询并修改视图

**用户 query 示例**：
- "看看有哪些视图"
- "把默认视图改个名字"

**执行流程**：
1. 调用 `wecom_mcp openapi smartsheet getViews` 获取视图列表
2. 展示视图名称和类型
3. 用户选择后，调用 `wecom_mcp openapi smartsheet updateView`：
   ```json
   {
     "docid": "DOCID",
     "sheet_id": "SHEETID",
     "view_id": "VIEWID",
     "view_title": "新视图名"
   }
   ```

### 删除视图

**用户 query 示例**：
- "删除多余的视图"
- "把测试视图删掉"

**执行流程**：
1. 调用 `getViews` 获取视图列表
2. 确认要删除的视图
3. 调用 `wecom_mcp openapi smartsheet deleteViews`：
   ```json
   {
     "docid": "DOCID",
     "sheet_id": "SHEETID",
     "view_ids": ["VIEWID1", "VIEWID2"]
   }
   ```

---

## 错误处理

| 错误码 | 说明 | 处理方式 |
|--------|------|---------|
| 40056 | 视图数量超限 | 先删除不需要的视图 |
| 40057 | 视图不存在 | 检查 view_id 是否正确 |
| 40058 | 字段类型不匹配 | 甘特图/日历视图必须使用日期字段 |

---

## 快速参考

| 接口 | 用途 | 关键参数 |
|------|------|---------|
| `addView` | 创建视图 | docid, sheet_id, view_title, view_type |
| `deleteViews` | 删除视图 | docid, sheet_id, view_ids[] |
| `updateView` | 更新视图 | docid, sheet_id, view_id, property |
| `getViews` | 查询视图 | docid, sheet_id, view_ids[]? |