import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { ProjectRole, Priority, TaskStatus } from "@prisma/client";
import { deleteFromR2 } from "~/server/r2/upload";

export const taskRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
        priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
        dueDate: z.date().optional(),
        members: z.array(z.string()).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.task.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          description: input.description,
          status: input.status,
          priority: input.priority,
          dueDate: input.dueDate,
          createdById: ctx.session.user.id,

          members: {
            create: [
              {
                userId: ctx.session.user.id,
                role: ProjectRole.OWNER,
              },

              ...input.members
                .filter((id) => id !== ctx.session.user.id) // avoid duplicate owner
                .map((userId) => ({
                  userId,
                  role: ProjectRole.MEMBER,
                  invitedById: ctx.session.user.id,
                })),
            ],
          },
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
        priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
        dueDate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.task.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          status: input.status,
          priority: input.priority,
          dueDate: input.dueDate,
          updatedById: ctx.session.user.id,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 1. get all attachments for this project
      const attachments = await ctx.db.attachment.findMany({
        where: { taskId: input.id },
      });

      // 2. delete each from R2
      for (const attachment of attachments) {
        if (attachment.storageKey) {
          await deleteFromR2(attachment.storageKey);
        }
      }

      // 3. delete project (DB cascades members, tasks, comments)
      return ctx.db.task.delete({
        where: { id: input.id },
      });
    }),

  getAll: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.task.findMany({
        where: {
          projectId: input.projectId,
          members: {
            some: { userId: ctx.session.user.id },
          },
        },
        include: {
          members: {
            include: {
              user: true,
            },
          },
          attachments: {
            include: {
              uploadedBy: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getTask: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.task.findFirst({
        where: {
          id: input.id,
        },
        include: {
          members: {
            include: {
              user: true,
            },
          },
          attachments: {
            include: {
              uploadedBy: true,
            },
          },
        },
      });
    }),

  getMembers: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.taskMember.findMany({
        where: { taskId: input.taskId },
        include: {
          user: true,
        },
      });
    }),
});
