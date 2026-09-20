import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

/**
 * Provider-agnostic storage layer.
 *
 * In production, configure the S3_* environment variables (works with AWS S3
 * or any S3-compatible provider such as Cloudflare R2 / DigitalOcean Spaces /
 * Backblaze B2) and the platform will stream uploads straight to that bucket.
 *
 * When no bucket credentials are configured (e.g. first-run sandbox/demo),
 * the platform falls back to a local-disk provider under `public/uploads` so
 * the full upload -> database -> playback flow keeps working end-to-end.
 * Swapping providers requires zero application code changes.
 */

export type UploadResult = {
  provider: string;
  storageKey: string;
  url: string;
};

const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.S3_REGION;
const ENDPOINT = process.env.S3_ENDPOINT;
const ACCESS_KEY = process.env.S3_ACCESS_KEY_ID;
const SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY;
const PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL;

const isS3Configured = Boolean(BUCKET && REGION && ACCESS_KEY && SECRET_KEY);

let s3Client: S3Client | null = null;
function getClient() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: REGION,
      endpoint: ENDPOINT || undefined,
      forcePathStyle: Boolean(ENDPOINT),
      credentials: {
        accessKeyId: ACCESS_KEY!,
        secretAccessKey: SECRET_KEY!,
      },
    });
  }
  return s3Client;
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-140);
}

export function generateStorageKey(folder: string, originalName: string) {
  const ext = originalName.includes(".") ? originalName.split(".").pop() : "";
  const safeBase = sanitizeFileName(originalName.replace(/\.[^/.]+$/, ""));
  const unique = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  return `${folder}/${unique}-${safeBase}${ext ? "." + ext : ""}`;
}

export async function uploadBuffer(
  storageKey: string,
  buffer: Buffer,
  contentType: string
): Promise<UploadResult> {
  if (isS3Configured) {
    const client = getClient();
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: storageKey,
        Body: buffer,
        ContentType: contentType,
      })
    );
    const url = PUBLIC_BASE_URL
      ? `${PUBLIC_BASE_URL.replace(/\/$/, "")}/${storageKey}`
      : ENDPOINT
        ? `${ENDPOINT.replace(/\/$/, "")}/${BUCKET}/${storageKey}`
        : `https://${BUCKET}.s3.${REGION}.amazonaws.com/${storageKey}`;
    return { provider: "s3", storageKey, url };
  }

  // Local-disk fallback is strictly for local development.
  // Production (Vercel) has an ephemeral read-only filesystem — uploads
  // REQUIRE S3-compatible storage configured, otherwise we fail loudly
  // instead of silently "succeeding" into a black hole.
  if (process.env.NODE_ENV === "production") {
    throw new Error("Storage is not configured. Set S3_BUCKET/S3_REGION/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY.");
  }
  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  const destPath = path.join(uploadsRoot, storageKey);
  await mkdir(path.dirname(destPath), { recursive: true });
  await writeFile(destPath, buffer);
  return { provider: "local", storageKey, url: `/uploads/${storageKey}` };
}

export async function deleteObject(storageKey: string) {
  if (isS3Configured) {
    const client = getClient();
    await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: storageKey }));
    return;
  }
  // local fallback deletion intentionally skipped (best-effort demo storage)
}

export function storageProviderName() {
  return isS3Configured ? "s3" : "local";
}
