import type { OpenApiClient } from "./request.js";

export type MediaType = "image" | "voice" | "video" | "file";

export interface UploadMediaParams {
  buffer: Buffer;
  type: MediaType;
  filename?: string;
  contentType?: string;
}

export interface UploadMediaResult {
  errcode: number;
  errmsg: string;
  type: MediaType;
  media_id: string;
  created_at: string;
}

export interface GetMediaResult {
  errcode: number;
  errmsg: string;
}

export function createMediaApi(client: OpenApiClient) {
  return {
    async upload(params: UploadMediaParams): Promise<UploadMediaResult> {
      return client.upload<UploadMediaResult>(
        "media/upload",
        params.buffer,
        params.type,
        {
          filename: params.filename,
          contentType: params.contentType,
        }
      );
    },

    async get(mediaId: string): Promise<GetMediaResult> {
      return client.get<GetMediaResult>("media/get", { media_id: mediaId });
    },
  };
}

export type MediaApi = ReturnType<typeof createMediaApi>;