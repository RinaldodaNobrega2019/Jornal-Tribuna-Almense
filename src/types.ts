export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  isSystem: boolean;
}

export interface Article {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  content: string;
  categorySlug: string;
  coverImage: string;
  gallery: string[];
  videoUrl: string;
  audioUrl: string;
  authorName: string;
  status: 'published' | 'draft' | 'scheduled' | 'archived';
  isFeatured: boolean;
  isBreaking: boolean;
  isSubscriberOnly: boolean;
  allowComments: boolean;
  views: number;
  scheduledAt?: string | null;
  publishedAt: string;
  createdAt: string;
  comments?: CommentItem[];
  lockedForSubscribers?: boolean;
}

export interface CommentItem {
  id: number;
  articleId: number;
  authorName: string;
  authorEmail: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface PodcastEpisode {
  id: number;
  slug: string;
  episodeNumber: number;
  title: string;
  description: string;
  audioUrl: string;
  videoUrl: string;
  coverImage: string;
  duration: string;
  guestName: string;
  status: string;
  publishedAt: string;
}

export interface VideoItem {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: string;
  videoUrl: string;
  youtubeId: string;
  aspectRatio: '16:9' | '9:16';
  thumbnailUrl: string;
  status: string;
  views: number;
  publishedAt: string;
}

export interface Artist {
  id: number;
  name: string;
  city: string;
  genre: string;
  bio: string;
  photoUrl: string;
  instagramUrl: string;
}

export interface SongItem {
  id: number;
  artistId: number;
  title: string;
  genre: string;
  description: string;
  audioUrl: string;
  coverImage: string;
  rightsAuthorized: boolean;
  authorizationNotes: string;
  status: string;
  plays: number;
  publishedAt: string;
  artist?: Artist | null;
}

export interface AdBanner {
  id: number;
  title: string;
  advertiserName: string;
  placement: 'header' | 'sidebar' | 'in_feed' | 'sponsor';
  imageUrl: string;
  targetUrl: string;
  description: string;
  active: boolean;
  impressions: number;
  clicks: number;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  username?: string | null;
  name: string;
  role: 'admin' | 'editor' | 'reporter' | 'assinante';
  subscriptionPlan: 'free' | 'apoiador' | 'premium';
  active: boolean;
  createdAt?: string;
}

export interface AuditLogEntry {
  id: number;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
}

export interface PortalBootstrap {
  settings: Record<string, string>;
  categories: Category[];
  articles: Article[];
  mostRead: Article[];
  podcasts: PodcastEpisode[];
  videos: VideoItem[];
  artists: Artist[];
  songs: SongItem[];
  ads: AdBanner[];
}

export interface AudioTrack {
  id: string;
  kind: 'podcast' | 'music';
  title: string;
  subtitle: string;
  audioUrl: string;
  coverImage: string;
}

export type PortalPage =
  | { type: 'home' }
  | { type: 'category'; slug: string }
  | { type: 'article'; slug: string }
  | { type: 'podcast' }
  | { type: 'videos' }
  | { type: 'music' }
  | { type: 'contact' }
  | { type: 'institutional'; pageKey: 'about' | 'expediente' | 'privacy' | 'editorial' | 'terms' | 'advertise' }
  | { type: 'search'; query: string }
  | { type: 'admin' };
