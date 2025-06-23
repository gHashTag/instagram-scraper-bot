import { relations } from "drizzle-orm/relations";
import { projects, reels, users, competitors, hashtags, parsingRuns } from "./schema";

export const reelsRelations = relations(reels, ({one}) => ({
	project: one(projects, {
		fields: [reels.projectId],
		references: [projects.id]
	}),
}));

export const projectsRelations = relations(projects, ({one, many}) => ({
	reels: many(reels),
	user: one(users, {
		fields: [projects.userId],
		references: [users.id]
	}),
	competitors: many(competitors),
	hashtags: many(hashtags),
	parsingRuns: many(parsingRuns),
}));

export const usersRelations = relations(users, ({many}) => ({
	projects: many(projects),
}));

export const competitorsRelations = relations(competitors, ({one}) => ({
	project: one(projects, {
		fields: [competitors.projectId],
		references: [projects.id]
	}),
}));

export const hashtagsRelations = relations(hashtags, ({one}) => ({
	project: one(projects, {
		fields: [hashtags.projectId],
		references: [projects.id]
	}),
}));

export const parsingRunsRelations = relations(parsingRuns, ({one}) => ({
	project: one(projects, {
		fields: [parsingRuns.projectId],
		references: [projects.id]
	}),
}));