import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { ProjectStatus, ProjectRole, Priority } from "@prisma/client";
import { deleteFromR2 } from "~/server/r2/upload";
import { TRPCError } from "@trpc/server";

export const projectRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        name: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
        status: z.nativeEnum(ProjectStatus).default(ProjectStatus.ACTIVE),
        priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
        dueDate: z.date().optional(),
        coverColor: z.string().optional(),
        members: z.array(z.string()).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.project.create({
        data: {
          workspaceId: input.workspaceId,
          name: input.name,
          slug: input.slug,
          description: input.description,
          status: input.status,
          priority: input.priority,
          dueDate: input.dueDate,
          coverColor: input.coverColor,
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
        slug: z.string().min(1),
        description: z.string().optional(),
        status: z.nativeEnum(ProjectStatus).default(ProjectStatus.ACTIVE),
        priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
        dueDate: z.date().optional(),
        coverColor: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.project.update({
        where: { id: input.id },
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          status: input.status,
          priority: input.priority,
          dueDate: input.dueDate,
          coverColor: input.coverColor,
          updatedById: ctx.session.user.id,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 1. get all attachments for this project
      const attachments = await ctx.db.attachment.findMany({
        where: { projectId: input.id },
      });

      // 2. delete each from R2
      for (const attachment of attachments) {
        if (attachment.storageKey) {
          await deleteFromR2(attachment.storageKey);
        }
      }

      // 3. delete project (DB cascades members, tasks, comments)
      return ctx.db.project.delete({
        where: { id: input.id },
      });
    }),

  getAll: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.project.findMany({
        where: {
          workspaceId: input.workspaceId,
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
          workspace: true,
          tasks: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getProject: protectedProcedure
    .input(z.object({ workspaceSlug: z.string(), projectSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.project.findFirst({
        where: {
          slug: input.projectSlug,
          workspace: {
            slug: input.workspaceSlug,
          },
        },
        include: {
          members: {
            include: {
              user: true,
            },
          },
          workspace: true,
          tasks: true,
        },
      });
    }),

  getMembers: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.projectMember.findMany({
        where: { projectId: input.projectId },
        include: {
          user: true,
        },
      });
    }),

  getAttachments: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.attachment.findMany({
        where: { projectId: input.projectId },
        include: {
          uploadedBy: true,
        },
      });
    }),
    
  inviteMember: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        userId: z.string(), // ← was email
        role: z.nativeEnum(ProjectRole).default(ProjectRole.MEMBER),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const callerMember = await ctx.db.projectMember.findFirst({
        where: { projectId: input.projectId, userId: ctx.session.user.id },
      });
      if (!callerMember) throw new TRPCError({ code: "FORBIDDEN" });

      const existing = await ctx.db.projectMember.findFirst({
        where: { projectId: input.projectId, userId: input.userId },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This person is already a member of the project.",
        });
      }

      return ctx.db.projectMember.create({
        data: {
          projectId: input.projectId,
          userId: input.userId,
          role: input.role,
          invitedById: ctx.session.user.id,
        },
      });
    }),

  getLastActivity: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const latestTask = await ctx.db.task.findFirst({
        where: { projectId: input.projectId },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      });

      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
        select: { updatedAt: true, createdAt: true },
      });

      const projectTime = new Date(
        project?.updatedAt ?? project?.createdAt ?? 0,
      );
      const taskTime = latestTask ? new Date(latestTask.updatedAt) : null;

      const lastActivityAt =
        taskTime && taskTime > projectTime ? taskTime : projectTime;

      return { lastActivityAt };
    }),

  toggleStar: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.starredProject.findFirst({
        where: {
          projectId: input.projectId,
          userId: ctx.session.user.id,
        },
      });

      if (existing) {
        await ctx.db.starredProject.delete({ where: { id: existing.id } });
        return { starred: false };
      }

      await ctx.db.starredProject.create({
        data: {
          projectId: input.projectId,
          userId: ctx.session.user.id,
        },
      });
      return { starred: true };
    }),
});
