import { relations } from "drizzle-orm/relations";
import { projects, hashtags, parsingRuns, users, competitors, reels, transcriptEmbeddings, chatHistory } from "./schema";

export const hashtagsRelations = relations(hashtags, ({one}) => ({
	project: one(projects, {
		fields: [hashtags.projectId],
		references: [projects.id]
	}),
}));

export const projectsRelations = relations(projects, ({one, many}) => ({
	hashtags: many(hashtags),
	parsingRuns: many(parsingRuns),
	user: one(users, {
		fields: [projects.userId],
		references: [users.id]
	}),
	competitors: many(competitors),
	reels: many(reels),
}));

export const parsingRunsRelations = relations(parsingRuns, ({one}) => ({
	project: one(projects, {
		fields: [parsingRuns.projectId],
		references: [projects.id]
	}),
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

export const reelsRelations = relations(reels, ({one, many}) => ({
	project: one(projects, {
		fields: [reels.projectId],
		references: [projects.id]
	}),
	transcriptEmbeddings: many(transcriptEmbeddings),
	chatHistories: many(chatHistory),
}));

export const transcriptEmbeddingsRelations = relations(transcriptEmbeddings, ({one}) => ({
	reel: one(reels, {
		fields: [transcriptEmbeddings.reelId],
		references: [reels.reelUrl]
	}),
}));

export const chatHistoryRelations = relations(chatHistory, ({one}) => ({
	reel: one(reels, {
		fields: [chatHistory.reelId],
		references: [reels.reelUrl]
	}),
}));