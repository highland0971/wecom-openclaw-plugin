/**
 * wecom_mcp — 企业微信 OpenAPI 工具
 *
 * 直接调用企业微信 OpenAPI 接口，无需依赖 MCP Server。
 * 所有接口都通过 openapi action 调用。
 *
 * 在 skills 中的使用方式：
 *   wecom_mcp openapi <category> <method> '<jsonArgs>'
 *
 * 示例：
 *   wecom_mcp openapi message send '{"touser": "user1", "msgtype": "text", ...}'
 *   wecom_mcp openapi smartsheet addView '{"docid": "...", ...}'
 */

import { getOpenApiService } from "../openapi/index.js";
import { OpenApiError } from "../openapi/request.js";

interface WeComToolsParams {
  action: "openapi";
  category: string;
  method: string;
  args?: string | Record<string, unknown>;
}

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  details: data,
});

const errorResult = (err: unknown) => {
  if (err && typeof err === "object" && "errcode" in err) {
    const { errcode, errmsg } = err as { errcode: number; errmsg?: string };
    return textResult({ error: errmsg ?? `错误码: ${errcode}`, errcode });
  }

  const message = err instanceof Error ? err.message : String(err);
  return textResult({ error: message });
};

const parseArgs = (args: string | Record<string, unknown> | undefined): Record<string, unknown> => {
  if (!args) return {};
  if (typeof args === "object") return args;
  try {
    return JSON.parse(args) as Record<string, unknown>;
  } catch (err) {
    const detail = err instanceof SyntaxError ? err.message : String(err);
    throw new Error(`args 参数不是合法的 JSON: ${args} (${detail})`);
  }
};

const handleOpenApi = async (
  category: string,
  method: string,
  args: Record<string, unknown>
): Promise<unknown> => {
  const openApi = getOpenApiService();
  if (!openApi) {
    throw new Error("OpenAPI 服务未初始化，请确保已配置 corpId 和 agentSecret");
  }

  console.log(`[openapi] handleOpenApi ${category}/${method} 入参: ${JSON.stringify(args).slice(0, 500)}`);

  const startTime = performance.now();

  try {
    let result: unknown;

    switch (category) {
      case "message":
        if (method === "send") {
          result = await openApi.message.send(args as Parameters<typeof openApi.message.send>[0]);
        } else if (method === "recall") {
          result = await openApi.message.recall(args as Parameters<typeof openApi.message.recall>[0]);
        } else if (method === "createAppChat") {
          result = await openApi.message.createAppChat(args as Parameters<typeof openApi.message.createAppChat>[0]);
        } else if (method === "updateAppChat") {
          result = await openApi.message.updateAppChat(args as Parameters<typeof openApi.message.updateAppChat>[0]);
        } else if (method === "getAppChat") {
          result = await openApi.message.getAppChat(args.chatid as string);
        } else if (method === "sendAppChatMessage") {
          result = await openApi.message.sendAppChatMessage(args as Parameters<typeof openApi.message.sendAppChatMessage>[0]);
        } else {
          throw new Error(`未知的消息 API 方法: ${method}`);
        }
        break;

      case "smartsheet":
        if (method === "addView") {
          result = await openApi.smartsheet.addView(args as Parameters<typeof openApi.smartsheet.addView>[0]);
        } else if (method === "deleteViews") {
          result = await openApi.smartsheet.deleteViews(args as Parameters<typeof openApi.smartsheet.deleteViews>[0]);
        } else if (method === "updateView") {
          result = await openApi.smartsheet.updateView(args as Parameters<typeof openApi.smartsheet.updateView>[0]);
        } else if (method === "getViews") {
          result = await openApi.smartsheet.getViews(args as Parameters<typeof openApi.smartsheet.getViews>[0]);
        } else if (method === "getSheet") {
          result = await openApi.smartsheet.getSheet(args as Parameters<typeof openApi.smartsheet.getSheet>[0]);
        } else if (method === "addSheet") {
          result = await openApi.smartsheet.addSheet(args as Parameters<typeof openApi.smartsheet.addSheet>[0]);
        } else if (method === "updateSheet") {
          result = await openApi.smartsheet.updateSheet(args as Parameters<typeof openApi.smartsheet.updateSheet>[0]);
        } else if (method === "deleteSheet") {
          result = await openApi.smartsheet.deleteSheet(args as Parameters<typeof openApi.smartsheet.deleteSheet>[0]);
        } else if (method === "getFields") {
          result = await openApi.smartsheet.getFields(args as Parameters<typeof openApi.smartsheet.getFields>[0]);
        } else if (method === "addFields") {
          result = await openApi.smartsheet.addFields(args as Parameters<typeof openApi.smartsheet.addFields>[0]);
        } else if (method === "updateFields") {
          result = await openApi.smartsheet.updateFields(args as Parameters<typeof openApi.smartsheet.updateFields>[0]);
        } else if (method === "deleteFields") {
          result = await openApi.smartsheet.deleteFields(args as Parameters<typeof openApi.smartsheet.deleteFields>[0]);
        } else if (method === "getRecords") {
          result = await openApi.smartsheet.getRecords(args as Parameters<typeof openApi.smartsheet.getRecords>[0]);
        } else if (method === "addRecords") {
          result = await openApi.smartsheet.addRecords(args as Parameters<typeof openApi.smartsheet.addRecords>[0]);
        } else if (method === "updateRecords") {
          result = await openApi.smartsheet.updateRecords(args as Parameters<typeof openApi.smartsheet.updateRecords>[0]);
        } else if (method === "deleteRecords") {
          result = await openApi.smartsheet.deleteRecords(args as Parameters<typeof openApi.smartsheet.deleteRecords>[0]);
        } else {
          throw new Error(`未知的智能表格 API 方法: ${method}`);
        }
        break;

      case "contact":
        if (method === "createUser") {
          result = await openApi.contact.createUser(args as Parameters<typeof openApi.contact.createUser>[0]);
        } else if (method === "getUser") {
          result = await openApi.contact.getUser(args.userid as string);
        } else if (method === "updateUser") {
          result = await openApi.contact.updateUser(args as Parameters<typeof openApi.contact.updateUser>[0]);
        } else if (method === "deleteUser") {
          result = await openApi.contact.deleteUser(args.userid as string);
        } else if (method === "getDepartmentUsers") {
          result = await openApi.contact.getDepartmentUsers(args.department_id as number, args.fetch_child as 0 | 1 | undefined);
        } else if (method === "createDepartment") {
          result = await openApi.contact.createDepartment(args as Parameters<typeof openApi.contact.createDepartment>[0]);
        } else if (method === "updateDepartment") {
          result = await openApi.contact.updateDepartment(args as Parameters<typeof openApi.contact.updateDepartment>[0]);
        } else if (method === "deleteDepartment") {
          result = await openApi.contact.deleteDepartment(args.id as number);
        } else if (method === "getDepartmentList") {
          result = await openApi.contact.getDepartmentList(args.id as number | undefined);
        } else if (method === "createTag") {
          result = await openApi.contact.createTag(args as Parameters<typeof openApi.contact.createTag>[0]);
        } else if (method === "updateTag") {
          result = await openApi.contact.updateTag(args as Parameters<typeof openApi.contact.updateTag>[0]);
        } else if (method === "deleteTag") {
          result = await openApi.contact.deleteTag(args.tagid as number);
        } else if (method === "getTagUsers") {
          result = await openApi.contact.getTagUsers(args.tagid as number);
        } else if (method === "addTagUsers") {
          result = await openApi.contact.addTagUsers(args as Parameters<typeof openApi.contact.addTagUsers>[0]);
        } else if (method === "delTagUsers") {
          result = await openApi.contact.delTagUsers(args as Parameters<typeof openApi.contact.delTagUsers>[0]);
        } else {
          throw new Error(`未知的通讯录 API 方法: ${method}`);
        }
        break;

      case "doc":
        if (method === "renameDoc") {
          result = await openApi.doc.renameDoc(args as Parameters<typeof openApi.doc.renameDoc>[0]);
        } else if (method === "deleteDoc") {
          result = await openApi.doc.deleteDoc(args as Parameters<typeof openApi.doc.deleteDoc>[0]);
        } else if (method === "getDocInfo") {
          result = await openApi.doc.getDocInfo(args.docid as string);
        } else if (method === "shareDoc") {
          result = await openApi.doc.shareDoc(args as Parameters<typeof openApi.doc.shareDoc>[0]);
        } else if (method === "getDocPermission") {
          result = await openApi.doc.getDocPermission(args.docid as string);
        } else if (method === "modifyDocMembers") {
          result = await openApi.doc.modifyDocMembers(args as Parameters<typeof openApi.doc.modifyDocMembers>[0]);
        } else if (method === "modifyDocSecurity") {
          result = await openApi.doc.modifyDocSecurity(args as Parameters<typeof openApi.doc.modifyDocSecurity>[0]);
        } else if (method === "createCollector") {
          result = await openApi.doc.createCollector(args as Parameters<typeof openApi.doc.createCollector>[0]);
        } else if (method === "getCollectorInfo") {
          result = await openApi.doc.getCollectorInfo(args.collector_id as string);
        } else if (method === "getCollectorAnswers") {
          result = await openApi.doc.getCollectorAnswers(args as Parameters<typeof openApi.doc.getCollectorAnswers>[0]);
        } else if (method === "getDocContent") {
          result = await openApi.doc.getDocContent(args as Parameters<typeof openApi.doc.getDocContent>[0]);
        } else if (method === "createDoc") {
          result = await openApi.doc.createDoc(args as Parameters<typeof openApi.doc.createDoc>[0]);
        } else if (method === "editDocContent") {
          result = await openApi.doc.editDocContent(args as Parameters<typeof openApi.doc.editDocContent>[0]);
        } else if (method === "smartpageCreate") {
          result = await openApi.doc.smartpageCreate(args as Parameters<typeof openApi.doc.smartpageCreate>[0]);
        } else if (method === "smartpageExportTask") {
          result = await openApi.doc.smartpageExportTask(args as Parameters<typeof openApi.doc.smartpageExportTask>[0]);
        } else if (method === "smartpageGetExportResult") {
          result = await openApi.doc.smartpageGetExportResult(args as Parameters<typeof openApi.doc.smartpageGetExportResult>[0]);
        } else {
          throw new Error(`未知的文档 API 方法: ${method}`);
        }
        break;

      case "todo":
        if (method === "getTodoList") {
          result = await openApi.todo.getTodoList(args as Parameters<typeof openApi.todo.getTodoList>[0]);
        } else if (method === "getTodoDetail") {
          result = await openApi.todo.getTodoDetail(args as Parameters<typeof openApi.todo.getTodoDetail>[0]);
        } else if (method === "createTodo") {
          result = await openApi.todo.createTodo(args as Parameters<typeof openApi.todo.createTodo>[0]);
        } else if (method === "updateTodo") {
          result = await openApi.todo.updateTodo(args as Parameters<typeof openApi.todo.updateTodo>[0]);
        } else if (method === "deleteTodo") {
          result = await openApi.todo.deleteTodo(args as Parameters<typeof openApi.todo.deleteTodo>[0]);
        } else if (method === "changeTodoUserStatus") {
          result = await openApi.todo.changeTodoUserStatus(args as Parameters<typeof openApi.todo.changeTodoUserStatus>[0]);
        } else {
          throw new Error(`未知的待办 API 方法: ${method}`);
        }
        break;

      case "schedule":
        if (method === "createCalendar") {
          result = await openApi.schedule.createCalendar(args as Parameters<typeof openApi.schedule.createCalendar>[0]);
        } else if (method === "getScheduleListByRange") {
          result = await openApi.schedule.getScheduleListByRange(args as Parameters<typeof openApi.schedule.getScheduleListByRange>[0]);
        } else if (method === "getScheduleDetail") {
          result = await openApi.schedule.getScheduleDetail(args as Parameters<typeof openApi.schedule.getScheduleDetail>[0]);
        } else if (method === "createSchedule") {
          result = await openApi.schedule.createSchedule(args as Parameters<typeof openApi.schedule.createSchedule>[0]);
        } else if (method === "updateSchedule") {
          result = await openApi.schedule.updateSchedule(args as Parameters<typeof openApi.schedule.updateSchedule>[0]);
        } else if (method === "cancelSchedule") {
          result = await openApi.schedule.cancelSchedule(args as Parameters<typeof openApi.schedule.cancelSchedule>[0]);
        } else if (method === "addScheduleAttendees") {
          result = await openApi.schedule.addScheduleAttendees(args as Parameters<typeof openApi.schedule.addScheduleAttendees>[0]);
        } else if (method === "delScheduleAttendees") {
          result = await openApi.schedule.delScheduleAttendees(args as Parameters<typeof openApi.schedule.delScheduleAttendees>[0]);
        } else {
          throw new Error(`未知的日程 API 方法: ${method}`);
        }
        break;

      case "meeting":
        if (method === "create") {
          result = await openApi.meeting.create(args as Parameters<typeof openApi.meeting.create>[0]);
        } else if (method === "cancel") {
          result = await openApi.meeting.cancel(args as Parameters<typeof openApi.meeting.cancel>[0]);
        } else if (method === "getInfo") {
          result = await openApi.meeting.getInfo(args as Parameters<typeof openApi.meeting.getInfo>[0]);
        } else if (method === "listUserMeetings") {
          result = await openApi.meeting.listUserMeetings(args as Parameters<typeof openApi.meeting.listUserMeetings>[0]);
        } else if (method === "update") {
          result = await openApi.meeting.update(args as Parameters<typeof openApi.meeting.update>[0]);
        } else {
          throw new Error(`未知的会议 API 方法: ${method}`);
        }
        break;

      case "msg":
        if (method === "getMsgChatList") {
          result = await openApi.msg.getMsgChatList(args as Parameters<typeof openApi.msg.getMsgChatList>[0]);
        } else if (method === "getMessage") {
          result = await openApi.msg.getMessage(args as Parameters<typeof openApi.msg.getMessage>[0]);
        } else if (method === "getMsgMedia") {
          result = await openApi.msg.getMsgMedia(args as Parameters<typeof openApi.msg.getMsgMedia>[0]);
        } else if (method === "sendMessage") {
          result = await openApi.msg.sendMessage(args as Parameters<typeof openApi.msg.sendMessage>[0]);
        } else {
          throw new Error(`未知的消息会话 API 方法: ${method}`);
        }
        break;

      default:
        throw new Error(`未知的 OpenAPI 品类: ${category}，支持 message/smartsheet/contact/doc/todo/schedule/meeting/msg`);
    }

    const elapsed = (performance.now() - startTime).toFixed(1);
    console.log(`[openapi] handleOpenApi ${category}/${method} 成功，耗时: ${elapsed}ms`);

    return result;
  } catch (err) {
    if (err instanceof OpenApiError) {
      console.error(`[openapi] handleOpenApi ${category}/${method} API 错误: errcode=${err.errcode}, errmsg=${err.errmsg}`);
      return { errcode: err.errcode, errmsg: err.errmsg };
    }
    throw err;
  }
};

export function createWeComMcpTool() {
  return {
    name: "wecom_mcp",
    label: "企业微信 OpenAPI 工具",
    description: [
      "直接调用企业微信 OpenAPI 接口（需要配置 corpId 和 agentSecret）",
      "",
      "使用方式：",
      "  wecom_mcp openapi <category> <method> '<jsonArgs>'",
      "",
      "品类列表：",
      "  - message: 消息推送（send/recall/createAppChat/updateAppChat/getAppChat/sendAppChatMessage）",
      "  - smartsheet: 智能表格（addView/deleteViews/updateView/getViews/getSheet/addSheet/updateSheet/deleteSheet/getFields/addFields/updateFields/deleteFields/getRecords/addRecords/updateRecords/deleteRecords）",
      "  - contact: 通讯录管理（createUser/getUser/updateUser/deleteUser/getDepartmentUsers/createDepartment/updateDepartment/deleteDepartment/getDepartmentList/createTag/updateTag/deleteTag/getTagUsers/addTagUsers/delTagUsers）",
      "  - doc: 文档管理（renameDoc/deleteDoc/getDocInfo/shareDoc/getDocPermission/modifyDocMembers/modifyDocSecurity/createCollector/getCollectorInfo/getCollectorAnswers/getDocContent/createDoc/editDocContent/smartpageCreate/smartpageExportTask/smartpageGetExportResult）",
      "  - todo: 待办事项（getTodoList/getTodoDetail/createTodo/updateTodo/deleteTodo/changeTodoUserStatus）",
      "  - schedule: 日程管理（createCalendar/getScheduleListByRange/getScheduleDetail/createSchedule/updateSchedule/cancelSchedule/addScheduleAttendees/delScheduleAttendees）",
      "  - meeting: 会议管理（create/cancel/getInfo/listUserMeetings/update）",
      "  - msg: 消息会话（getMsgChatList/getMessage/getMsgMedia/sendMessage）",
    ].join("\n"),
    parameters: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          enum: ["openapi"],
          description: "操作类型：openapi（直接调用 OpenAPI）",
        },
        category: {
          type: "string",
          description: "OpenAPI 品类：message/smartsheet/contact/doc/todo/schedule/meeting/msg",
        },
        method: {
          type: "string",
          description: "要调用的方法名",
        },
        args: {
          type: ["string", "object"],
          description: "调用方法的参数，可以是 JSON 字符串或对象（默认 {}）",
        },
      },
      required: ["action", "category", "method"],
    },
    async execute(_toolCallId: string, params: unknown) {
      const p = params as WeComToolsParams;
      console.log(
        `[openapi] execute: category=${p.category}, method=${p.method}` +
        (p.args ? `, args=${typeof p.args === "string" ? p.args : JSON.stringify(p.args)}` : ""),
      );
      try {
        const args = parseArgs(p.args);
        const result = textResult(await handleOpenApi(p.category, p.method, args));
        console.log(
          `[openapi] execute: category=${p.category}, method=${p.method}` +
          ` → 响应长度=${result.content[0].text.length} chars`,
        );
        return result;
      } catch (err) {
        console.error(
          `[openapi] execute: category=${p.category}, method=${p.method}` +
          ` → 异常: ${err instanceof Error ? err.message : String(err)}`,
        );
        return errorResult(err);
      }
    },
  };
}