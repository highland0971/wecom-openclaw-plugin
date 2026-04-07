import type { OpenApiClient } from "./request.js";

export interface RenameDocParams {
  docid: string;
  doc_name: string;
  [key: string]: unknown;
}

export interface DeleteDocParams {
  docid: string;
  [key: string]: unknown;
}

export interface ShareDocParams {
  docid: string;
  share_type: 1 | 2;
  share_permission: 1 | 2 | 3 | 4;
  [key: string]: unknown;
}

export interface DocPermissionInfo {
  docid: string;
  share_url?: string;
  share_permission?: number;
  water_mark?: boolean;
  copy_enabled?: boolean;
}

export interface ModifyDocMembersParams {
  docid: string;
  add_members?: Array<{
    userid: string;
    auth?: number;
  }>;
  remove_members?: Array<{
    userid: string;
  }>;
  [key: string]: unknown;
}

export interface ModifyDocSecurityParams {
  docid: string;
  water_mark?: boolean;
  copy_enabled?: boolean;
  add_watermark_after_download?: boolean;
  [key: string]: unknown;
}

export interface CreateCollectorParams {
  docid?: string;
  name: string;
  questions?: unknown[];
  [key: string]: unknown;
}

export interface CollectorInfo {
  collector_id: string;
  name: string;
  status: number;
  create_time: number;
}

export interface GetDocContentParams {
  docid?: string;
  url?: string;
  type: 2;
  task_id?: string;
  [key: string]: unknown;
}

export interface GetDocContentResult {
  errcode: number;
  errmsg: string;
  content?: string;
  task_id?: string;
  task_done?: boolean;
}

export interface CreateDocParams {
  doc_type: 3 | 10;
  doc_name: string;
  [key: string]: unknown;
}

export interface CreateDocResult {
  errcode: number;
  errmsg: string;
  url?: string;
  docid?: string;
}

export interface EditDocContentParams {
  docid?: string;
  url?: string;
  content: string;
  content_type: 1;
  [key: string]: unknown;
}

export interface SmartpageCreateParams {
  title?: string;
  pages: Array<{
    page_title?: string;
    content_type?: 0 | 1;
    page_filepath?: string;
  }>;
  [key: string]: unknown;
}

export interface SmartpageCreateResult {
  errcode: number;
  errmsg: string;
  docid?: string;
  url?: string;
}

export interface SmartpageExportTaskParams {
  docid: string;
  content_type: 0 | 1;
  [key: string]: unknown;
}

export interface SmartpageExportTaskResult {
  errcode: number;
  errmsg: string;
  task_id?: string;
}

export interface SmartpageGetExportResultParams {
  task_id: string;
  [key: string]: unknown;
}

export interface SmartpageGetExportResultResult {
  errcode: number;
  errmsg: string;
  task_done?: boolean;
  content_filepath?: string;
}

export function createDocApi(client: OpenApiClient) {
  return {
    async renameDoc(params: RenameDocParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("wedoc/rename_doc", params);
    },

    async deleteDoc(params: DeleteDocParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("wedoc/delete_doc", params);
    },

    async getDocInfo(docid: string): Promise<{ errcode: number; errmsg: string } & { doc_info: { docid: string; doc_name: string; create_time: number; modify_time: number; creator?: string; modifier?: string } }> {
      return client.request("wedoc/get_doc_info", { docid });
    },

    async shareDoc(params: ShareDocParams): Promise<{ errcode: number; errmsg: string; share_url?: string }> {
      return client.request("wedoc/share_doc", params);
    },

    async getDocPermission(docid: string): Promise<{ errcode: number; errmsg: string } & DocPermissionInfo> {
      return client.request("wedoc/get_doc_permission", { docid });
    },

    async modifyDocMembers(params: ModifyDocMembersParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("wedoc/modify_doc_members", params);
    },

    async modifyDocSecurity(params: ModifyDocSecurityParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("wedoc/modify_doc_security", params);
    },

    async createCollector(params: CreateCollectorParams): Promise<{ errcode: number; errmsg: string; collector_id?: string }> {
      return client.request("wedoc/create_collector", params);
    },

    async getCollectorInfo(collector_id: string): Promise<{ errcode: number; errmsg: string } & { collector_info: CollectorInfo }> {
      return client.request("wedoc/get_collector_info", { collector_id });
    },

    async getCollectorAnswers(params: { collector_id: string; offset?: number; limit?: number }): Promise<{ errcode: number; errmsg: string; answers?: unknown[]; total?: number; has_more?: boolean }> {
      return client.request("wedoc/get_collector_answers", params);
    },

    async getDocContent(params: GetDocContentParams): Promise<GetDocContentResult> {
      return client.request<GetDocContentResult>("wedoc/get_doc_content", params);
    },

    async createDoc(params: CreateDocParams): Promise<CreateDocResult> {
      return client.request<CreateDocResult>("wedoc/create_doc", params);
    },

    async editDocContent(params: EditDocContentParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("wedoc/edit_doc_content", params);
    },

    async smartpageCreate(params: SmartpageCreateParams): Promise<SmartpageCreateResult> {
      return client.request<SmartpageCreateResult>("wedoc/smartpage_create", params);
    },

    async smartpageExportTask(params: SmartpageExportTaskParams): Promise<SmartpageExportTaskResult> {
      return client.request<SmartpageExportTaskResult>("wedoc/smartpage_export_task", params);
    },

    async smartpageGetExportResult(params: SmartpageGetExportResultParams): Promise<SmartpageGetExportResultResult> {
      return client.request<SmartpageGetExportResultResult>("wedoc/smartpage_get_export_result", params);
    },
  };
}

export type DocApi = ReturnType<typeof createDocApi>;