import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { pollCommits } from "@/lib/github";

export const projectRouter = createTRPCRouter({
    createProject: protectedProcedure.input(
        z.object({
            projectName: z.string(),
            githubUrl: z.string(),
            githubToken: z.string().optional(),
        })
    ).mutation(async ({ ctx, input }) => {
        const project = await ctx.db.project.create({
            data: {
                githubUrl: input.githubUrl,
                name: input.projectName,
                userToProject: {
                    create: {
                        userId: ctx.user.userId!,
                    }
                }
           }
        })
        await pollCommits(project.id)
        return project;
    }),

    getProjects: protectedProcedure.query(async ({ ctx }) => {
        return await ctx.db.project.findMany({
            where: {
                userToProject: {
                    some: {
                        userId: ctx.user.userId!
                    }
                },
                deletedAt: null
            }
        })
    })
})