import type { OpenApiClient } from "./request.js";

export interface CreateUserParams {
  userid: string;
  name: string;
  department: number[];
  position?: string;
  mobile?: string;
  email?: string;
  avatar_mediaid?: string;
  alias?: string;
  external_position?: string;
  external_profile?: {
    external_attr?: unknown[];
  };
  to_invite?: boolean;
  [key: string]: unknown;
}

export interface UserInfo {
  userid: string;
  name: string;
  department: number[];
  position?: string;
  mobile?: string;
  email?: string;
  avatar?: string;
  status: number;
  enable: number;
  isleader: number;
  alias?: string;
  telephone?: string;
  qr_code?: string;
}

export interface UpdateUserParams {
  userid: string;
  name?: string;
  department?: number[];
  position?: string;
  mobile?: string;
  email?: string;
  [key: string]: unknown;
}

export interface CreateDepartmentParams {
  name: string;
  parentid: number;
  order?: number;
  id?: number;
  [key: string]: unknown;
}

export interface DepartmentInfo {
  id: number;
  name: string;
  parentid: number;
  order?: number;
}

export interface CreateTagParams {
  tagname: string;
  tagid?: number;
  [key: string]: unknown;
}

export interface TagInfo {
  tagid: number;
  tagname: string;
}

export function createContactApi(client: OpenApiClient) {
  return {
    async createUser(params: CreateUserParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("user/create", params);
    },

    async getUser(userid: string): Promise<{ errcode: number; errmsg: string } & UserInfo> {
      return client.get("user/get", { userid });
    },

    async updateUser(params: UpdateUserParams): Promise<{ errcode: number; errmsg: string }> {
      return client.request("user/update", params);
    },

    async deleteUser(userid: string): Promise<{ errcode: number; errmsg: string }> {
      return client.get("user/delete", { userid });
    },

    async getDepartmentUsers(
      department_id: number,
      fetch_child?: 0 | 1
    ): Promise<{ errcode: number; errmsg: string; userlist: UserInfo[] }> {
      const params: Record<string, string> = { department_id: String(department_id) };
      if (fetch_child !== undefined) {
        params.fetch_child = String(fetch_child);
      }
      return client.get("user/list", params);
    },

    async createDepartment(params: CreateDepartmentParams): Promise<{ errcode: number; errmsg: string; id: number }> {
      return client.request("department/create", params);
    },

    async updateDepartment(params: { id: number; name?: string; parentid?: number; order?: number }): Promise<{ errcode: number; errmsg: string }> {
      return client.request("department/update", params);
    },

    async deleteDepartment(id: number): Promise<{ errcode: number; errmsg: string }> {
      return client.get("department/delete", { id: String(id) });
    },

    async getDepartmentList(id?: number): Promise<{ errcode: number; errmsg: string; department: DepartmentInfo[] }> {
      const params: Record<string, string> = id !== undefined ? { id: String(id) } : {};
      return client.get("department/list", params);
    },

    async createTag(params: CreateTagParams): Promise<{ errcode: number; errmsg: string; tagid: number }> {
      return client.request("tag/create", params);
    },

    async updateTag(params: { tagid: number; tagname: string }): Promise<{ errcode: number; errmsg: string }> {
      return client.request("tag/update", params);
    },

    async deleteTag(tagid: number): Promise<{ errcode: number; errmsg: string }> {
      return client.request("tag/delete", { tagid });
    },

    async getTagUsers(tagid: number): Promise<{ errcode: number; errmsg: string; userlist: { userid: string }[]; partylist?: number[] }> {
      return client.get("tag/get", { tagid: String(tagid) });
    },

    async addTagUsers(params: { tagid: number; userlist?: string[]; partylist?: number[] }): Promise<{ errcode: number; errmsg: string; invalidlist?: string[]; invalidparty?: number[] }> {
      return client.request("tag/addtagusers", params);
    },

    async delTagUsers(params: { tagid: number; userlist?: string[]; partylist?: number[] }): Promise<{ errcode: number; errmsg: string }> {
      return client.request("tag/deltagusers", params);
    },
  };
}

export type ContactApi = ReturnType<typeof createContactApi>;