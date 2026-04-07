import type { OpenApiClient } from "./request.js";

export interface GetTodoListParams {
  create_begin_time?: string;
  create_end_time?: string;
  remind_begin_time?: string;
  remind_end_time?: string;
  limit?: number;
  cursor?: string;
  [key: string]: unknown;
}

export interface TodoIndexItem {
  todo_id: string;
  todo_status: number;
  user_status: number;
  creator_id: string;
  remind_time?: string;
  create_time: string;
  update_time: string;
}

export interface GetTodoListResult {
  errcode: number;
  errmsg: string;
  index_list: TodoIndexItem[];
  next_cursor?: string;
  has_more: boolean;
}

export interface GetTodoDetailParams {
  todo_id_list: string[];
  [key: string]: unknown;
}

export interface FollowerInfo {
  follower_id: string;
  follower_status: number;
  update_time: string;
}

export interface TodoDetailItem {
  todo_id: string;
  todo_status: number;
  content: string;
  follower_list: {
    followers: FollowerInfo[];
  };
  creator_id: string;
  user_status: number;
  remind_time?: string;
  create_time: string;
  update_time: string;
}

export interface GetTodoDetailResult {
  errcode: number;
  errmsg: string;
  data_list: TodoDetailItem[];
}

export interface CreateTodoParams {
  content: string;
  follower_list?: {
    followers: Array<{
      follower_id: string;
      follower_status: number;
    }>;
  };
  remind_time?: string;
  [key: string]: unknown;
}

export interface CreateTodoResult {
  errcode: number;
  errmsg: string;
  todo_id: string;
}

export interface UpdateTodoParams {
  todo_id: string;
  content?: string;
  follower_list?: {
    followers: Array<{
      follower_id: string;
      follower_status: number;
    }>;
  };
  todo_status?: number;
  remind_time?: string;
  [key: string]: unknown;
}

export interface DeleteTodoParams {
  todo_id: string;
  [key: string]: unknown;
}

export interface ChangeTodoUserStatusParams {
  todo_id: string;
  user_status: number;
  [key: string]: unknown;
}

export function createTodoApi(client: OpenApiClient) {
  return {
    async getTodoList(params: GetTodoListParams = {}): Promise<GetTodoListResult> {
      return client.request<GetTodoListResult>("todo/get_todo_list", params);
    },

    async getTodoDetail(params: GetTodoDetailParams): Promise<GetTodoDetailResult> {
      return client.request<GetTodoDetailResult>("todo/get_todo_detail", params);
    },

    async createTodo(params: CreateTodoParams): Promise<CreateTodoResult> {
      return client.request<CreateTodoResult>("todo/create_todo", params);
    },

    async updateTodo(params: UpdateTodoParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("todo/update_todo", params);
    },

    async deleteTodo(params: DeleteTodoParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("todo/delete_todo", params);
    },

    async changeTodoUserStatus(params: ChangeTodoUserStatusParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("todo/change_todo_user_status", params);
    },
  };
}

export type TodoApi = ReturnType<typeof createTodoApi>;