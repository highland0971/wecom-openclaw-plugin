import type { OpenApiClient } from "./request.js";

export type ViewType =
  | "VIEW_TYPE_GRID"
  | "VIEW_TYPE_KANBAN"
  | "VIEW_TYPE_GALLERY"
  | "VIEW_TYPE_GANTT"
  | "VIEW_TYPE_CALENDAR";

export type FieldType =
  | "FIELD_TYPE_TEXT"
  | "FIELD_TYPE_NUMBER"
  | "FIELD_TYPE_CHECKBOX"
  | "FIELD_TYPE_DATE_TIME"
  | "FIELD_TYPE_IMAGE"
  | "FIELD_TYPE_USER"
  | "FIELD_TYPE_URL"
  | "FIELD_TYPE_SELECT"
  | "FIELD_TYPE_PROGRESS"
  | "FIELD_TYPE_PHONE_NUMBER"
  | "FIELD_TYPE_EMAIL"
  | "FIELD_TYPE_SINGLE_SELECT"
  | "FIELD_TYPE_LOCATION"
  | "FIELD_TYPE_CURRENCY"
  | "FIELD_TYPE_PERCENTAGE"
  | "FIELD_TYPE_BARCODE";

// ==================== Sheet Types ====================

export interface GetSheetParams {
  docid?: string;
  url?: string;
  [key: string]: unknown;
}

export interface SheetInfo {
  sheet_id: string;
  title: string;
  sheet_type?: number;
  [key: string]: unknown;
}

export interface GetSheetResult {
  errcode: number;
  errmsg: string;
  sheets?: SheetInfo[];
  [key: string]: unknown;
}

export interface AddSheetParams {
  docid?: string;
  url?: string;
  properties: {
    title: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface AddSheetResult {
  errcode: number;
  errmsg: string;
  sheet?: SheetInfo;
  [key: string]: unknown;
}

export interface UpdateSheetParams {
  docid?: string;
  url?: string;
  properties: {
    sheet_id: string;
    title: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface DeleteSheetParams {
  docid?: string;
  url?: string;
  sheet_id: string;
  [key: string]: unknown;
}

// ==================== Field Types ====================

export interface GetFieldsParams {
  docid?: string;
  url?: string;
  sheet_id: string;
  [key: string]: unknown;
}

export interface FieldInfo {
  field_id: string;
  field_title: string;
  field_type: FieldType;
  [key: string]: unknown;
}

export interface GetFieldsResult {
  errcode: number;
  errmsg: string;
  fields?: FieldInfo[];
  [key: string]: unknown;
}

export interface AddFieldItem {
  field_title: string;
  field_type: FieldType;
  [key: string]: unknown;
}

export interface AddFieldsParams {
  docid?: string;
  url?: string;
  sheet_id: string;
  fields: AddFieldItem[];
  [key: string]: unknown;
}

export interface AddFieldsResult {
  errcode: number;
  errmsg: string;
  fields?: FieldInfo[];
  [key: string]: unknown;
}

export interface UpdateFieldItem {
  field_id: string;
  field_title: string;
  field_type: FieldType;
  [key: string]: unknown;
}

export interface UpdateFieldsParams {
  docid?: string;
  url?: string;
  sheet_id: string;
  fields: UpdateFieldItem[];
  [key: string]: unknown;
}

export interface DeleteFieldsParams {
  docid?: string;
  url?: string;
  sheet_id: string;
  field_ids: string[];
  [key: string]: unknown;
}

// ==================== Record Types ====================

export interface GetRecordsParams {
  docid?: string;
  url?: string;
  sheet_id: string;
  [key: string]: unknown;
}

export interface RecordValue {
  [fieldTitleOrId: string]: unknown;
}

export interface SmartsheetRecord {
  record_id: string;
  values?: RecordValue;
  [key: string]: unknown;
}

export interface GetRecordsResult {
  errcode: number;
  errmsg: string;
  records?: SmartsheetRecord[];
  total?: number;
  has_more?: boolean;
  [key: string]: unknown;
}

export interface AddRecordItem {
  values: RecordValue;
  [key: string]: unknown;
}

export interface AddRecordsParams {
  docid?: string;
  url?: string;
  sheet_id: string;
  records: AddRecordItem[];
  [key: string]: unknown;
}

export interface AddRecordsResult {
  errcode: number;
  errmsg: string;
  records?: SmartsheetRecord[];
  [key: string]: unknown;
}

export type KeyType = "CELL_VALUE_KEY_TYPE_FIELD_TITLE" | "CELL_VALUE_KEY_TYPE_FIELD_ID";

export interface UpdateRecordItem {
  record_id: string;
  values: RecordValue;
  [key: string]: unknown;
}

export interface UpdateRecordsParams {
  docid?: string;
  url?: string;
  sheet_id: string;
  key_type?: KeyType;
  records: UpdateRecordItem[];
  [key: string]: unknown;
}

export interface DeleteRecordsParams {
  docid?: string;
  url?: string;
  sheet_id: string;
  record_ids: string[];
  [key: string]: unknown;
}

export interface AddViewParams {
  docid: string;
  sheet_id: string;
  view_title: string;
  view_type: ViewType;
  property_gantt?: {
    start_date_field_id: string;
    end_date_field_id: string;
  };
  property_calendar?: {
    start_date_field_id: string;
    end_date_field_id: string;
  };
  [key: string]: unknown;
}

export interface AddViewResult {
  errcode: number;
  errmsg: string;
  view: {
    view_id: string;
    view_title: string;
    view_type: ViewType;
  };
}

export interface DeleteViewsParams {
  docid: string;
  sheet_id: string;
  view_ids: string[];
  [key: string]: unknown;
}

export interface ViewProperty {
  auto_sort?: boolean;
  sort_spec?: {
    sort_infos: Array<{
      field_id: string;
      desc: boolean;
    }>;
  };
  group_spec?: {
    groups: Array<{
      field_id: string;
      desc: boolean;
    }>;
  };
  filter_spec?: {
    conjunction: "CONJUNCTION_AND" | "CONJUNCTION_OR";
    conditions: unknown[];
  };
  is_field_stat_enabled?: boolean;
  field_visibility?: Record<string, boolean>;
  frozen_field_count?: number;
  color_config?: {
    conditions: unknown[];
  };
}

export interface UpdateViewParams {
  docid: string;
  sheet_id: string;
  view_id: string;
  view_title?: string;
  property?: ViewProperty;
  [key: string]: unknown;
}

export interface GetViewsParams {
  docid: string;
  sheet_id: string;
  view_ids?: string[];
  offset?: number;
  limit?: number;
  [key: string]: unknown;
}

export interface ViewInfo {
  view_id: string;
  view_title: string;
  view_type: ViewType;
  property?: ViewProperty;
}

export interface GetViewsResult {
  errcode: number;
  errmsg: string;
  total: number;
  has_more: boolean;
  next: number;
  views: ViewInfo[];
}

export function createSmartsheetApi(client: OpenApiClient) {
  return {
    // Sheet APIs
    async getSheet(params: GetSheetParams): Promise<GetSheetResult> {
      return client.request<GetSheetResult>("wedoc/smartsheet/get_sheet", params);
    },

    async addSheet(params: AddSheetParams): Promise<AddSheetResult> {
      return client.request<AddSheetResult>("wedoc/smartsheet/add_sheet", params);
    },

    async updateSheet(params: UpdateSheetParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("wedoc/smartsheet/update_sheet", params);
    },

    async deleteSheet(params: DeleteSheetParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("wedoc/smartsheet/delete_sheet", params);
    },

    // Field APIs
    async getFields(params: GetFieldsParams): Promise<GetFieldsResult> {
      return client.request<GetFieldsResult>("wedoc/smartsheet/get_fields", params);
    },

    async addFields(params: AddFieldsParams): Promise<AddFieldsResult> {
      return client.request<AddFieldsResult>("wedoc/smartsheet/add_fields", params);
    },

    async updateFields(params: UpdateFieldsParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("wedoc/smartsheet/update_fields", params);
    },

    async deleteFields(params: DeleteFieldsParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("wedoc/smartsheet/delete_fields", params);
    },

    // Record APIs
    async getRecords(params: GetRecordsParams): Promise<GetRecordsResult> {
      return client.request<GetRecordsResult>("wedoc/smartsheet/get_records", params);
    },

    async addRecords(params: AddRecordsParams): Promise<AddRecordsResult> {
      return client.request<AddRecordsResult>("wedoc/smartsheet/add_records", params);
    },

    async updateRecords(params: UpdateRecordsParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("wedoc/smartsheet/update_records", params);
    },

    async deleteRecords(params: DeleteRecordsParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("wedoc/smartsheet/delete_records", params);
    },

    // View APIs
    async addView(params: AddViewParams): Promise<AddViewResult> {
      return client.request<AddViewResult>("wedoc/smartsheet/add_view", params);
    },

    async deleteViews(params: DeleteViewsParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("wedoc/smartsheet/delete_views", params);
    },

    async updateView(params: UpdateViewParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("wedoc/smartsheet/update_view", params);
    },

    async getViews(params: GetViewsParams): Promise<GetViewsResult> {
      return client.request<GetViewsResult>("wedoc/smartsheet/get_views", params);
    },
  };
}

export type SmartsheetApi = ReturnType<typeof createSmartsheetApi>;