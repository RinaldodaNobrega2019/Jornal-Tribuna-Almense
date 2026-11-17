import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  passwordHash: text('password_hash'),
  name: text('name').notNull(),
  role: text('role').notNull().default('assinante'), // admin | editor | reporter | assinante
  subscriptionPlan: text('subscription_plan').notNull().default('free'), // free | apoiador | premium
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const articles = pgTable('articles', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  subtitle: text('subtitle').default(''),
  summary: text('summary').notNull(),
  content: text('content').notNull(),
  categorySlug: text('category_slug').notNull(),
  coverImage: text('cover_image').default(''),
  gallery: jsonb('gallery').$type<string[]>().default([]),
  videoUrl: text('video_url').default(''),
  audioUrl: text('audio_url').default(''),
  authorName: text('author_name').notNull().default('Rinaldo da Nóbrega'),
  authorId: integer('author_id').references(() => users.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('published'), // published | draft | scheduled | archived
  isFeatured: boolean('is_featured').notNull().default(false),
  isBreaking: boolean('is_breaking').notNull().default(false),
  isSubscriberOnly: boolean('is_subscriber_only').notNull().default(false),
  allowComments: boolean('allow_comments').notNull().default(true),
  views: integer('views').notNull().default(0),
  scheduledAt: timestamp('scheduled_at'),
  publishedAt: timestamp('published_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  articleId: integer('article_id')
    .references(() => articles.id, { onDelete: 'cascade' })
    .notNull(),
  authorName: text('author_name').notNull(),
  authorEmail: text('author_email').notNull(),
  content: text('content').notNull(),
  status: text('status').notNull().default('pending'), // pending | approved | rejected
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const podcasts = pgTable('podcasts', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  episodeNumber: integer('episode_number').notNull().default(1),
  title: text('title').notNull(),
  description: text('description').notNull(),
  audioUrl: text('audio_url').notNull(),
  videoUrl: text('video_url').default(''),
  coverImage: text('cover_image').default(''),
  duration: text('duration').default('24:00'),
  guestName: text('guest_name').default(''),
  status: text('status').notNull().default('published'), // published | draft | archived
  publishedAt: timestamp('published_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const videos = pgTable('videos', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull().default('Reportagens'),
  videoUrl: text('video_url').default(''),
  youtubeId: text('youtube_id').default(''),
  aspectRatio: text('aspect_ratio').notNull().default('16:9'), // 16:9 | 9:16
  thumbnailUrl: text('thumbnail_url').default(''),
  status: text('status').notNull().default('published'),
  views: integer('views').notNull().default(0),
  publishedAt: timestamp('published_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const artists = pgTable('artists', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  city: text('city').notNull().default('Almas - TO'),
  genre: text('genre').notNull().default('Regional'),
  bio: text('bio').default(''),
  photoUrl: text('photo_url').default(''),
  instagramUrl: text('instagram_url').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const songs = pgTable('songs', {
  id: serial('id').primaryKey(),
  artistId: integer('artist_id')
    .references(() => artists.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  genre: text('genre').notNull().default('Regional'),
  description: text('description').default(''),
  audioUrl: text('audio_url').notNull(),
  coverImage: text('cover_image').default(''),
  rightsAuthorized: boolean('rights_authorized').notNull().default(true),
  authorizationNotes: text('authorization_notes').default(''),
  status: text('status').notNull().default('published'),
  plays: integer('plays').notNull().default(0),
  publishedAt: timestamp('published_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const ads = pgTable('ads', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  advertiserName: text('advertiser_name').notNull(),
  placement: text('placement').notNull().default('sidebar'), // header | sidebar | in_feed | sponsor
  imageUrl: text('image_url').default(''),
  targetUrl: text('target_url').default('#'),
  description: text('description').default(''),
  active: boolean('active').notNull().default(true),
  impressions: integer('impressions').notNull().default(0),
  clicks: integer('clicks').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const contactMessages = pgTable('contact_messages', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const siteSettings = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull().default(''),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  userEmail: text('user_email').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').default(''),
  details: text('details').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  author: one(users, {
    fields: [articles.authorId],
    references: [users.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  article: one(articles, {
    fields: [comments.articleId],
    references: [articles.id],
  }),
}));

export const artistsRelations = relations(artists, ({ many }) => ({
  songs: many(songs),
}));

export const songsRelations = relations(songs, ({ one }) => ({
  artist: one(artists, {
    fields: [songs.artistId],
    references: [artists.id],
  }),
}));
