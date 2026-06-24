import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2 } from "~/server/r2/r2";
import { env } from "~/env";
import { randomUUID } from "crypto";

type UploadInput = {
  fileData: string; // base64
  filename: string;
  mimeType: string;
  folder: string;
};

type UploadResult = {
  url: string;
  key: string;
  filename: string;
};

type GetObject = {
   key: string;
  filename: string;
  expiresIn?: number;
}

export async function uploadToR2({
  fileData,
  filename,
  mimeType,
  folder,
}: UploadInput): Promise<UploadResult> {
  const buffer = Buffer.from(fileData, "base64");
  const ext = filename.split(".").pop() ?? "bin";
  const key = `${folder}/${randomUUID()}.${ext}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ContentLength: buffer.length,
    }),
  );

  return {
    url: `${env.R2_PUBLIC_URL}/${key}`,
    key,
    filename,
  };
}

export async function deleteFromR2(key: string): Promise<void> {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    }),
  );
}

export async function getPresignedDownloadUrl({
  key,
  filename,
  expiresIn = 60,
}: GetObject) {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${filename}"`,
  });

  return getSignedUrl(r2, command, { expiresIn });
}
