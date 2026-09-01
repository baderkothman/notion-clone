import { z } from "zod";

export const fetchLinkMetadataSchema = z.object({ url: z.string().trim().min(1).max(2000) });
export type FetchLinkMetadataInput = z.infer<typeof fetchLinkMetadataSchema>;

export interface LinkMetadata {
  url: string;
  title: string;
  description: string;
  faviconUrl: string | null;
}
