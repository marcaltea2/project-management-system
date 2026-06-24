import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  uploadToR2,
  deleteFromR2,
  getPresignedDownloadUrl,
} from "~/server/r2/upload";
import { TRPCError } from "@trpc/server";

export const attachmentsRouter = createTRPCRouter({
  upload: protectedProcedure
    .input(
      z.object({
        filename: z.string().min(1),
        fileData: z.string().min(1), // base64s
        mimeType: z.string().min(1),
        folder: z.string().default("attachments"),
        projectId: z.string().optional(),
        taskId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. upload to R2
      const { url, key, filename } = await uploadToR2({
        fileData: input.fileData,
        filename: input.filename,
        mimeType: input.mimeType,
        folder: input.folder,
      });

      // 2. save to attachment DB
      return ctx.db.attachment.create({
        data: {
          filename,
          url,
          storageKey: key,
          mimeType: input.mimeType,
          size: Buffer.from(input.fileData, "base64").length,
          uploadedById: ctx.session.user.id,
          projectId: input.projectId,
          taskId: input.taskId,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 1. get attachment to find R2 key
      const attachment = await ctx.db.attachment.findUnique({
        where: { id: input.id },
      });

      if (!attachment) throw new TRPCError({ code: "NOT_FOUND" });

      // 2. delete from R2 using key
      if (attachment.storageKey) {
        await deleteFromR2(attachment.storageKey);
      }

      // 3. delete from DB
      return ctx.db.attachment.delete({
        where: { id: input.id },
      });
    }),

  Duplicate: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        attachments: z.array(
          z.object({
            filename: z.string(),
            url: z.string(), // original R2 URL to fetch from
            mimeType: z.string(),
            size: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const results = [];

      for (const attachment of input.attachments) {
        // 1. Fetch file from R2 server-side (no CORS issues from server)
        const response = await fetch(attachment.url);
        const buffer = Buffer.from(await response.arrayBuffer());
        const base64 = buffer.toString("base64");

        // 2. Upload as new file to R2
        const { url, key } = await uploadToR2({
          fileData: base64,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          folder: "projects",
        });

        // 3. Save new DB record
        const record = await ctx.db.attachment.create({
          data: {
            filename: attachment.filename,
            url,
            storageKey: key,
            mimeType: attachment.mimeType,
            size: attachment.size,
            projectId: input.projectId,
            uploadedById: ctx.session.user.id,
          },
        });

        results.push(record);
      }

      return results;
    }),

  getDownloadUrl: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const attachment = await ctx.db.attachment.findUnique({
        where: { id: input.id },
      });

      if (!attachment?.storageKey) throw new TRPCError({ code: "NOT_FOUND" });

      const url = await getPresignedDownloadUrl({
        key: attachment.storageKey,
        filename: attachment.filename,
        expiresIn: 60, // 60 seconds is plenty
      });

      return { url };
    }),
    
downloadAll: protectedProcedure
  .input(z.object({ projectId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const attachments = await ctx.db.attachment.findMany({
      where: { projectId: input.projectId },
    });

    const files = await Promise.all(
      attachments.map(async (a) => {
        if (!a.storageKey) throw new TRPCError({ code: "NOT_FOUND" });

        return {
          filename: a.filename,
          url: await getPresignedDownloadUrl({
            key: a.storageKey, // narrowed to string
            filename: a.filename,
            expiresIn: 120,
          }),
        };
      }),
    );

    return { files };
  }),
});
