import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { desc, eq, sql } from 'drizzle-orm';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/index.ts';
import {
  ads,
  articles,
  artists,
  auditLogs,
  categories,
  comments,
  contactMessages,
  podcasts,
  siteSettings,
  songs,
  users,
  videos,
} from './src/db/schema.ts';
import {
  createAuditLog,
  ensureSeedData,
  getArticleBySlugAndTrackView,
  getOrCreateFirebaseUser,
  getPortalBootstrap,
  getUserByLogin,
  queryArticles,
} from './src/db/repository.ts';
import {
  generateWavToneBuffer,
  hashPassword,
  signSessionToken,
  verifyPassword,
} from './src/lib/crypto.ts';
import { adminAuth } from './src/lib/firebase-admin.ts';
import { AuthRequest, optionalAuth, requireAuth, requireRole } from './src/middleware/auth.ts';

const PORT = 3000;
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const base = path
      .basename(file.originalname, path.extname(file.originalname))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 40);
    cb(null, `${Date.now()}-${base || 'media'}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 90);
}

const rateMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string, maxRequests = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count += 1;
  return true;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Sample playable audio generator for initial multimedia tracks
  app.get('/api/media/sample-audio/:kind', (req, res) => {
    const kind = req.params.kind.startsWith('podcast') ? 'podcast' : 'music';
    const wav = generateWavToneBuffer(kind);
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', wav.length.toString());
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(wav);
  });

  // Public Bootstrap
  app.get('/api/portal-bootstrap', async (_req, res) => {
    try {
      const data = await getPortalBootstrap();
      res.json(data);
    } catch (err: any) {
      console.error('Bootstrap failed:', err);
      res.status(500).json({ error: err.message || 'Erro ao carregar portal.' });
    }
  });

  // Public Articles
  app.get('/api/articles', async (req, res) => {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const list = await queryArticles({ category, search });
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erro ao buscar notícias.' });
    }
  });

  app.get('/api/articles/:slug', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const article = await getArticleBySlugAndTrackView(String(req.params.slug));
      if (!article || article.status !== 'published') {
        return res.status(404).json({ error: 'Notícia não encontrada.' });
      }
      const hasAccess =
        !article.isSubscriberOnly ||
        (req.user &&
          (['admin', 'editor', 'reporter'].includes(req.user.role) ||
            ['apoiador', 'premium'].includes(req.user.subscriptionPlan)));

      if (!hasAccess) {
        return res.json({
          ...article,
          content: article.content.split('\n\n')[0] || article.summary,
          lockedForSubscribers: true,
        });
      }
      res.json({ ...article, lockedForSubscribers: false });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erro ao abrir notícia.' });
    }
  });

  app.post('/api/articles/:id/comments', async (req, res) => {
    const ip = req.ip || 'unknown';
    if (!checkRateLimit(`comment:${ip}`, 10, 60_000)) {
      return res.status(429).json({ error: 'Muitas tentativas. Aguarde um minuto.' });
    }
    try {
      const articleId = Number(req.params.id);
      const { authorName, authorEmail, content } = req.body || {};
      if (!articleId || !authorName?.trim() || !authorEmail?.trim() || !content?.trim()) {
        return res.status(400).json({ error: 'Preencha nome, e-mail e comentário.' });
      }
      const [created] = await db
        .insert(comments)
        .values({
          articleId,
          authorName: String(authorName).trim().slice(0, 80),
          authorEmail: String(authorEmail).trim().slice(0, 120),
          content: String(content).trim().slice(0, 1500),
          status: 'pending',
        })
        .returning();
      res.status(201).json({
        message: 'Comentário enviado e aguardando moderação editorial.',
        comment: created,
      });
    } catch (err) {
      console.error('Comment submit error:', err);
      res.status(500).json({ error: 'Não foi possível registrar o comentário.' });
    }
  });

  // Public Videos view counter
  app.post('/api/videos/:id/view', async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.update(videos).set({ views: sql`${videos.views} + 1` }).where(eq(videos.id, id));
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Erro ao registrar visualização.' });
    }
  });

  // Public Song play counter
  app.post('/api/songs/:id/play', async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.update(songs).set({ plays: sql`${songs.plays} + 1` }).where(eq(songs.id, id));
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Erro ao registrar reprodução.' });
    }
  });

  // Public Ad click counter
  app.post('/api/ads/:id/click', async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.update(ads).set({ clicks: sql`${ads.clicks} + 1` }).where(eq(ads.id, id));
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Erro ao registrar clique.' });
    }
  });

  // Public Contact Form
  app.post('/api/contact', async (req, res) => {
    const ip = req.ip || 'unknown';
    if (!checkRateLimit(`contact:${ip}`, 8, 60_000)) {
      return res.status(429).json({ error: 'Limite de envios atingido. Tente novamente em instantes.' });
    }
    try {
      await ensureSeedData();
      const { name, email, subject, message } = req.body || {};
      if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
        return res.status(400).json({ error: 'Todos os campos do formulário são obrigatórios.' });
      }
      const [saved] = await db
        .insert(contactMessages)
        .values({
          name: String(name).trim().slice(0, 120),
          email: String(email).trim().slice(0, 150),
          subject: String(subject).trim().slice(0, 180),
          message: String(message).trim().slice(0, 4000),
        })
        .returning();
      res.status(201).json({ message: 'Mensagem enviada com sucesso para a redação!', id: saved.id });
    } catch (err) {
      console.error('Contact error:', err);
      res.status(500).json({ error: 'Não foi possível enviar sua mensagem.' });
    }
  });

  // Auth: Password Login
  app.post('/api/auth/login', async (req, res) => {
    const ip = req.ip || 'unknown';
    if (!checkRateLimit(`login:${ip}`, 15, 60_000)) {
      return res.status(429).json({ error: 'Muitas tentativas de login. Aguarde um minuto.' });
    }
    try {
      await ensureSeedData();
      const { login, password } = req.body || {};
      if (!login || !password) {
        return res.status(400).json({ error: 'Informe usuário/e-mail e senha.' });
      }
      const user = await getUserByLogin(String(login));
      if (!user || !user.passwordHash || !verifyPassword(String(password), user.passwordHash)) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
      }
      if (!user.active) {
        return res.status(403).json({ error: 'Conta desativada pela administração.' });
      }
      const token = signSessionToken({ uid: user.uid, email: user.email, role: user.role });
      await createAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'LOGIN_SENHA',
        entityType: 'auth',
        details: `Login administrativo via usuário/senha (${user.role})`,
      });
      res.json({
        token,
        user: {
          id: user.id,
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role,
          subscriptionPlan: user.subscriptionPlan,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Erro interno ao autenticar.' });
    }
  });

  // Auth: Firebase Google Sign-In Verification
  app.post('/api/auth/firebase', async (req, res) => {
    try {
      await ensureSeedData();
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token Firebase ausente.' });
      }
      const idToken = authHeader.slice('Bearer '.length).trim();
      const decoded = await adminAuth.verifyIdToken(idToken);
      const user = await getOrCreateFirebaseUser(
        decoded.uid,
        decoded.email || `${decoded.uid}@tribunaalmense.local`,
        decoded.name || decoded.email?.split('@')[0] || 'Usuário'
      );
      if (!user.active) {
        return res.status(403).json({ error: 'Conta desativada.' });
      }
      await createAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'LOGIN_GOOGLE',
        entityType: 'auth',
        details: `Autenticação Google (${user.role})`,
      });
      res.json({
        user: {
          id: user.id,
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role,
          subscriptionPlan: user.subscriptionPlan,
        },
      });
    } catch (err) {
      console.error('Firebase auth verify error:', err);
      res.status(401).json({ error: 'Falha ao validar conta Google.' });
    }
  });

  app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });

  // Admin: Media Upload (images, logo, mp3, mp4)
  app.post(
    '/api/admin/upload',
    requireAuth,
    requireRole(['admin', 'editor', 'reporter']),
    upload.single('file'),
    async (req: AuthRequest, res) => {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      }
      const publicUrl = `/uploads/${req.file.filename}`;
      await createAuditLog({
        userId: req.user!.id,
        userEmail: req.user!.email,
        action: 'UPLOAD_MIDIA',
        entityType: 'media',
        details: `Arquivo enviado: ${req.file.originalname} -> ${publicUrl}`,
      });
      res.json({ url: publicUrl, filename: req.file.originalname, mimetype: req.file.mimetype });
    }
  );

  // Admin: Dashboard Summary & Content Lists
  app.get(
    '/api/admin/dashboard',
    requireAuth,
    requireRole(['admin', 'editor', 'reporter']),
    async (_req, res) => {
      try {
        await ensureSeedData();
        const [
          allArticles,
          allCategories,
          allPodcasts,
          allVideos,
          allArtists,
          allSongs,
          allAds,
          allComments,
          allMessages,
          allSettings,
          allLogs,
          allUsers,
        ] = await Promise.all([
          db.select().from(articles).orderBy(desc(articles.createdAt)),
          db.select().from(categories).orderBy(categories.sortOrder, categories.name),
          db.select().from(podcasts).orderBy(desc(podcasts.publishedAt)),
          db.select().from(videos).orderBy(desc(videos.publishedAt)),
          db.select().from(artists).orderBy(artists.name),
          db.select().from(songs).orderBy(desc(songs.createdAt)),
          db.select().from(ads).orderBy(ads.id),
          db.select().from(comments).orderBy(desc(comments.createdAt)),
          db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)),
          db.select().from(siteSettings),
          db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(50),
          db
            .select({
              id: users.id,
              uid: users.uid,
              email: users.email,
              username: users.username,
              name: users.name,
              role: users.role,
              subscriptionPlan: users.subscriptionPlan,
              active: users.active,
              createdAt: users.createdAt,
            })
            .from(users)
            .orderBy(users.id),
        ]);

        const totalViews = allArticles.reduce((acc, a) => acc + (a.views || 0), 0);
        const settings: Record<string, string> = {};
        for (const s of allSettings) settings[s.key] = s.value;

        res.json({
          stats: {
            totalArticles: allArticles.length,
            publishedArticles: allArticles.filter((a) => a.status === 'published').length,
            draftArticles: allArticles.filter((a) => a.status === 'draft').length,
            scheduledArticles: allArticles.filter((a) => a.status === 'scheduled').length,
            totalViews,
            totalPodcasts: allPodcasts.length,
            totalVideos: allVideos.length,
            totalSongs: allSongs.length,
            pendingComments: allComments.filter((c) => c.status === 'pending').length,
            unreadMessages: allMessages.filter((m) => !m.isRead).length,
          },
          articles: allArticles,
          categories: allCategories,
          podcasts: allPodcasts,
          videos: allVideos,
          artists: allArtists,
          songs: allSongs,
          ads: allAds,
          comments: allComments,
          messages: allMessages,
          settings,
          auditLogs: allLogs,
          users: allUsers,
        });
      } catch (err) {
        console.error('Admin dashboard error:', err);
        res.status(500).json({ error: 'Erro ao carregar dados administrativos.' });
      }
    }
  );

  // Admin: Articles CRUD
  app.post(
    '/api/admin/articles',
    requireAuth,
    requireRole(['admin', 'editor', 'reporter']),
    async (req: AuthRequest, res) => {
      try {
        const body = req.body || {};
        if (!body.title?.trim() || !body.summary?.trim() || !body.content?.trim()) {
          return res.status(400).json({ error: 'Título, resumo e conteúdo são obrigatórios.' });
        }
        const baseSlug = slugify(body.slug || body.title);
        const uniqueSlug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
        const status = body.status || 'published';
        const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
        const publishedAt =
          status === 'scheduled' && scheduledAt ? scheduledAt : new Date();

        const [created] = await db
          .insert(articles)
          .values({
            slug: uniqueSlug,
            title: String(body.title).trim(),
            subtitle: String(body.subtitle || '').trim(),
            summary: String(body.summary).trim(),
            content: String(body.content).trim(),
            categorySlug: String(body.categorySlug || 'almas'),
            coverImage: String(body.coverImage || ''),
            gallery: Array.isArray(body.gallery) ? body.gallery : [],
            videoUrl: String(body.videoUrl || ''),
            audioUrl: String(body.audioUrl || ''),
            authorName: String(body.authorName || req.user!.name || 'Rinaldo da Nóbrega'),
            authorId: req.user!.id,
            status,
            isFeatured: Boolean(body.isFeatured),
            isBreaking: Boolean(body.isBreaking),
            isSubscriberOnly: Boolean(body.isSubscriberOnly),
            allowComments: body.allowComments !== false,
            scheduledAt,
            publishedAt,
          })
          .returning();

        await createAuditLog({
          userId: req.user!.id,
          userEmail: req.user!.email,
          action: 'CRIAR_NOTICIA',
          entityType: 'article',
          entityId: String(created.id),
          details: `${created.title} (${created.status})`,
        });

        res.status(201).json(created);
      } catch (err) {
        console.error('Create article error:', err);
        res.status(500).json({ error: 'Erro ao salvar notícia.' });
      }
    }
  );

  app.put(
    '/api/admin/articles/:id',
    requireAuth,
    requireRole(['admin', 'editor', 'reporter']),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);
        const body = req.body || {};
        const [updated] = await db
          .update(articles)
          .set({
            title: body.title,
            subtitle: body.subtitle ?? '',
            summary: body.summary,
            content: body.content,
            categorySlug: body.categorySlug,
            coverImage: body.coverImage ?? '',
            gallery: Array.isArray(body.gallery) ? body.gallery : [],
            videoUrl: body.videoUrl ?? '',
            audioUrl: body.audioUrl ?? '',
            authorName: body.authorName,
            status: body.status,
            isFeatured: Boolean(body.isFeatured),
            isBreaking: Boolean(body.isBreaking),
            isSubscriberOnly: Boolean(body.isSubscriberOnly),
            allowComments: body.allowComments !== false,
            scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
            updatedAt: new Date(),
          })
          .where(eq(articles.id, id))
          .returning();

        if (!updated) return res.status(404).json({ error: 'Notícia não encontrada.' });

        await createAuditLog({
          userId: req.user!.id,
          userEmail: req.user!.email,
          action: 'EDITAR_NOTICIA',
          entityType: 'article',
          entityId: String(id),
          details: `${updated.title} (${updated.status})`,
        });

        res.json(updated);
      } catch (err) {
        console.error('Update article error:', err);
        res.status(500).json({ error: 'Erro ao atualizar notícia.' });
      }
    }
  );

  app.delete(
    '/api/admin/articles/:id',
    requireAuth,
    requireRole(['admin', 'editor']),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);
        const [deleted] = await db.delete(articles).where(eq(articles.id, id)).returning();
        if (!deleted) return res.status(404).json({ error: 'Notícia não encontrada.' });
        await createAuditLog({
          userId: req.user!.id,
          userEmail: req.user!.email,
          action: 'EXCLUIR_NOTICIA',
          entityType: 'article',
          entityId: String(id),
          details: deleted.title,
        });
        res.json({ ok: true });
      } catch (err) {
        res.status(500).json({ error: 'Erro ao excluir notícia.' });
      }
    }
  );

  // Admin: Categories CRUD
  app.post(
    '/api/admin/categories',
    requireAuth,
    requireRole(['admin', 'editor']),
    async (req: AuthRequest, res) => {
      try {
        const { name, description, sortOrder } = req.body || {};
        if (!name?.trim()) return res.status(400).json({ error: 'Nome da categoria é obrigatório.' });
        const slug = slugify(name);
        const [created] = await db
          .insert(categories)
          .values({
            slug,
            name: String(name).trim(),
            description: String(description || ''),
            sortOrder: Number(sortOrder) || 10,
            isSystem: false,
          })
          .returning();
        await createAuditLog({
          userId: req.user!.id,
          userEmail: req.user!.email,
          action: 'CRIAR_CATEGORIA',
          entityType: 'category',
          entityId: String(created.id),
          details: created.name,
        });
        res.status(201).json(created);
      } catch (err) {
        res.status(500).json({ error: 'Erro ao criar categoria.' });
      }
    }
  );

  app.put(
    '/api/admin/categories/:id',
    requireAuth,
    requireRole(['admin', 'editor']),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);
        const { name, description, sortOrder } = req.body || {};
        const [updated] = await db
          .update(categories)
          .set({ name, description, sortOrder: Number(sortOrder) || 0 })
          .where(eq(categories.id, id))
          .returning();
        if (!updated) return res.status(404).json({ error: 'Categoria não encontrada.' });
        res.json(updated);
      } catch {
        res.status(500).json({ error: 'Erro ao atualizar categoria.' });
      }
    }
  );

  app.delete(
    '/api/admin/categories/:id',
    requireAuth,
    requireRole(['admin']),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);
        await db.delete(categories).where(eq(categories.id, id));
        res.json({ ok: true });
      } catch {
        res.status(500).json({ error: 'Erro ao remover categoria.' });
      }
    }
  );

  // Admin: Podcasts CRUD
  app.post(
    '/api/admin/podcasts',
    requireAuth,
    requireRole(['admin', 'editor']),
    async (req: AuthRequest, res) => {
      try {
        const b = req.body || {};
        if (!b.title?.trim() || !b.audioUrl?.trim()) {
          return res.status(400).json({ error: 'Título e arquivo de áudio (MP3) são obrigatórios.' });
        }
        const [created] = await db
          .insert(podcasts)
          .values({
            slug: `${slugify(b.title)}-${Date.now().toString(36).slice(-4)}`,
            episodeNumber: Number(b.episodeNumber) || 1,
            title: String(b.title).trim(),
            description: String(b.description || ''),
            audioUrl: String(b.audioUrl).trim(),
            videoUrl: String(b.videoUrl || ''),
            coverImage: String(b.coverImage || '/src/assets/images/podcast_estudio_tribuna_1794938137292.jpg'),
            duration: String(b.duration || '20:00'),
            guestName: String(b.guestName || ''),
            status: b.status || 'published',
          })
          .returning();
        await createAuditLog({
          userId: req.user!.id,
          userEmail: req.user!.email,
          action: 'CRIAR_PODCAST',
          entityType: 'podcast',
          entityId: String(created.id),
          details: created.title,
        });
        res.status(201).json(created);
      } catch {
        res.status(500).json({ error: 'Erro ao publicar episódio.' });
      }
    }
  );

  app.delete(
    '/api/admin/podcasts/:id',
    requireAuth,
    requireRole(['admin', 'editor']),
    async (req: AuthRequest, res) => {
      try {
        await db.delete(podcasts).where(eq(podcasts.id, Number(req.params.id)));
        res.json({ ok: true });
      } catch {
        res.status(500).json({ error: 'Erro ao excluir episódio.' });
      }
    }
  );

  // Admin: Videos CRUD
  app.post(
    '/api/admin/videos',
    requireAuth,
    requireRole(['admin', 'editor']),
    async (req: AuthRequest, res) => {
      try {
        const b = req.body || {};
        if (!b.title?.trim()) return res.status(400).json({ error: 'Título do vídeo é obrigatório.' });
        const [created] = await db
          .insert(videos)
          .values({
            slug: `${slugify(b.title)}-${Date.now().toString(36).slice(-4)}`,
            title: String(b.title).trim(),
            description: String(b.description || ''),
            category: String(b.category || 'Reportagens'),
            videoUrl: String(b.videoUrl || ''),
            youtubeId: String(b.youtubeId || ''),
            aspectRatio: b.aspectRatio === '9:16' ? '9:16' : '16:9',
            thumbnailUrl: String(b.thumbnailUrl || '/src/assets/images/hero_almas_serras_gerais_1794938135711.jpg'),
            status: b.status || 'published',
          })
          .returning();
        await createAuditLog({
          userId: req.user!.id,
          userEmail: req.user!.email,
          action: 'CRIAR_VIDEO',
          entityType: 'video',
          entityId: String(created.id),
          details: `${created.title} (${created.aspectRatio})`,
        });
        res.status(201).json(created);
      } catch {
        res.status(500).json({ error: 'Erro ao cadastrar vídeo.' });
      }
    }
  );

  app.delete(
    '/api/admin/videos/:id',
    requireAuth,
    requireRole(['admin', 'editor']),
    async (req: AuthRequest, res) => {
      try {
        await db.delete(videos).where(eq(videos.id, Number(req.params.id)));
        res.json({ ok: true });
      } catch {
        res.status(500).json({ error: 'Erro ao excluir vídeo.' });
      }
    }
  );

  // Admin: Artists & Local Music (Authorized only!)
  app.post(
    '/api/admin/artists',
    requireAuth,
    requireRole(['admin', 'editor']),
    async (req: AuthRequest, res) => {
      try {
        const b = req.body || {};
        if (!b.name?.trim()) return res.status(400).json({ error: 'Nome do artista é obrigatório.' });
        const [created] = await db
          .insert(artists)
          .values({
            name: String(b.name).trim(),
            city: String(b.city || 'Almas - TO'),
            genre: String(b.genre || 'Regional'),
            bio: String(b.bio || ''),
            photoUrl: String(b.photoUrl || '/src/assets/images/musica_serras_gerais_1794938138439.jpg'),
            instagramUrl: String(b.instagramUrl || ''),
          })
          .returning();
        res.status(201).json(created);
      } catch {
        res.status(500).json({ error: 'Erro ao cadastrar artista.' });
      }
    }
  );

  app.post(
    '/api/admin/songs',
    requireAuth,
    requireRole(['admin', 'editor']),
    async (req: AuthRequest, res) => {
      try {
        const b = req.body || {};
        if (!b.rightsAuthorized) {
          return res.status(400).json({
            error: 'Somente é permitida a publicação de músicas com direitos de divulgação e reprodução autorizados.',
          });
        }
        if (!b.artistId || !b.title?.trim() || !b.audioUrl?.trim()) {
          return res.status(400).json({ error: 'Artista, título e áudio são obrigatórios.' });
        }
        const [created] = await db
          .insert(songs)
          .values({
            artistId: Number(b.artistId),
            title: String(b.title).trim(),
            genre: String(b.genre || 'Regional'),
            description: String(b.description || ''),
            audioUrl: String(b.audioUrl).trim(),
            coverImage: String(b.coverImage || '/src/assets/images/musica_serras_gerais_1794938138439.jpg'),
            rightsAuthorized: true,
            authorizationNotes: String(b.authorizationNotes || 'Direitos autorizados pelo artista/compositor.'),
            status: 'published',
          })
          .returning();
        await createAuditLog({
          userId: req.user!.id,
          userEmail: req.user!.email,
          action: 'PUBLICAR_MUSICA',
          entityType: 'song',
          entityId: String(created.id),
          details: created.title,
        });
        res.status(201).json(created);
      } catch {
        res.status(500).json({ error: 'Erro ao cadastrar música.' });
      }
    }
  );

  app.delete(
    '/api/admin/songs/:id',
    requireAuth,
    requireRole(['admin', 'editor']),
    async (req: AuthRequest, res) => {
      try {
        await db.delete(songs).where(eq(songs.id, Number(req.params.id)));
        res.json({ ok: true });
      } catch {
        res.status(500).json({ error: 'Erro ao remover música.' });
      }
    }
  );

  // Admin: Ads CRUD
  app.post(
    '/api/admin/ads',
    requireAuth,
    requireRole(['admin', 'editor']),
    async (req: AuthRequest, res) => {
      try {
        const b = req.body || {};
        if (!b.title?.trim() || !b.advertiserName?.trim()) {
          return res.status(400).json({ error: 'Título e anunciante são obrigatórios.' });
        }
        const [created] = await db
          .insert(ads)
          .values({
            title: String(b.title).trim(),
            advertiserName: String(b.advertiserName).trim(),
            placement: String(b.placement || 'sidebar'),
            imageUrl: String(b.imageUrl || ''),
            targetUrl: String(b.targetUrl || '#anuncie'),
            description: String(b.description || ''),
            active: b.active !== false,
          })
          .returning();
        res.status(201).json(created);
      } catch {
        res.status(500).json({ error: 'Erro ao salvar anúncio.' });
      }
    }
  );

  app.patch(
    '/api/admin/ads/:id',
    requireAuth,
    requireRole(['admin', 'editor']),
    async (req: AuthRequest, res) => {
      try {
        const [updated] = await db
          .update(ads)
          .set({ active: Boolean(req.body?.active) })
          .where(eq(ads.id, Number(req.params.id)))
          .returning();
        res.json(updated);
      } catch {
        res.status(500).json({ error: 'Erro ao atualizar anúncio.' });
      }
    }
  );

  app.delete(
    '/api/admin/ads/:id',
    requireAuth,
    requireRole(['admin']),
    async (req: AuthRequest, res) => {
      try {
        await db.delete(ads).where(eq(ads.id, Number(req.params.id)));
        res.json({ ok: true });
      } catch {
        res.status(500).json({ error: 'Erro ao remover anúncio.' });
      }
    }
  );

  // Admin: Comments Moderation
  app.patch(
    '/api/admin/comments/:id',
    requireAuth,
    requireRole(['admin', 'editor']),
    async (req: AuthRequest, res) => {
      try {
        const status = req.body?.status;
        if (!['approved', 'rejected', 'pending'].includes(status)) {
          return res.status(400).json({ error: 'Status inválido.' });
        }
        const [updated] = await db
          .update(comments)
          .set({ status })
          .where(eq(comments.id, Number(req.params.id)))
          .returning();
        res.json(updated);
      } catch {
        res.status(500).json({ error: 'Erro ao moderar comentário.' });
      }
    }
  );

  app.delete(
    '/api/admin/comments/:id',
    requireAuth,
    requireRole(['admin', 'editor']),
    async (req: AuthRequest, res) => {
      try {
        await db.delete(comments).where(eq(comments.id, Number(req.params.id)));
        res.json({ ok: true });
      } catch {
        res.status(500).json({ error: 'Erro ao excluir comentário.' });
      }
    }
  );

  // Admin: Contact Messages
  app.patch(
    '/api/admin/messages/:id/read',
    requireAuth,
    requireRole(['admin', 'editor']),
    async (req: AuthRequest, res) => {
      try {
        const [updated] = await db
          .update(contactMessages)
          .set({ isRead: true })
          .where(eq(contactMessages.id, Number(req.params.id)))
          .returning();
        res.json(updated);
      } catch {
        res.status(500).json({ error: 'Erro ao marcar mensagem.' });
      }
    }
  );

  // Admin: Site Settings (Logo, Social Links, Institutional Pages)
  app.put(
    '/api/admin/settings',
    requireAuth,
    requireRole(['admin']),
    async (req: AuthRequest, res) => {
      try {
        const updates = req.body || {};
        for (const [key, val] of Object.entries(updates)) {
          if (typeof val !== 'string') continue;
          await db
            .insert(siteSettings)
            .values({ key, value: val, updatedAt: new Date() })
            .onConflictDoUpdate({
              target: siteSettings.key,
              set: { value: val, updatedAt: new Date() },
            });
        }
        await createAuditLog({
          userId: req.user!.id,
          userEmail: req.user!.email,
          action: 'ATUALIZAR_CONFIGURACOES',
          entityType: 'settings',
          details: `Chaves atualizadas: ${Object.keys(updates).join(', ')}`,
        });
        res.json({ ok: true });
      } catch {
        res.status(500).json({ error: 'Erro ao salvar configurações.' });
      }
    }
  );

  // Admin: Users & Permissions
  app.post(
    '/api/admin/users',
    requireAuth,
    requireRole(['admin']),
    async (req: AuthRequest, res) => {
      try {
        const { name, email, username, password, role, subscriptionPlan } = req.body || {};
        if (!name?.trim() || !email?.trim() || !password?.trim()) {
          return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
        }
        const normalizedEmail = String(email).trim().toLowerCase();
        const [created] = await db
          .insert(users)
          .values({
            uid: `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            email: normalizedEmail,
            username: username ? String(username).trim().toLowerCase() : null,
            passwordHash: hashPassword(String(password)),
            name: String(name).trim(),
            role: role || 'editor',
            subscriptionPlan: subscriptionPlan || 'free',
            active: true,
          })
          .returning({
            id: users.id,
            uid: users.uid,
            email: users.email,
            username: users.username,
            name: users.name,
            role: users.role,
            subscriptionPlan: users.subscriptionPlan,
            active: users.active,
            createdAt: users.createdAt,
          });
        await createAuditLog({
          userId: req.user!.id,
          userEmail: req.user!.email,
          action: 'CRIAR_USUARIO',
          entityType: 'user',
          entityId: String(created.id),
          details: `${created.email} (${created.role})`,
        });
        res.status(201).json(created);
      } catch (err) {
        console.error('Create user error:', err);
        res.status(500).json({ error: 'Erro ao criar usuário (e-mail ou usuário já cadastrado).' });
      }
    }
  );

  app.patch(
    '/api/admin/users/:id',
    requireAuth,
    requireRole(['admin']),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);
        const { role, subscriptionPlan, active, newPassword } = req.body || {};
        const patch: Record<string, any> = {};
        if (role) patch.role = role;
        if (subscriptionPlan) patch.subscriptionPlan = subscriptionPlan;
        if (typeof active === 'boolean') patch.active = active;
        if (newPassword && String(newPassword).trim().length >= 6) {
          patch.passwordHash = hashPassword(String(newPassword));
        }

        const [updated] = await db
          .update(users)
          .set(patch)
          .where(eq(users.id, id))
          .returning({
            id: users.id,
            uid: users.uid,
            email: users.email,
            username: users.username,
            name: users.name,
            role: users.role,
            subscriptionPlan: users.subscriptionPlan,
            active: users.active,
            createdAt: users.createdAt,
          });

        await createAuditLog({
          userId: req.user!.id,
          userEmail: req.user!.email,
          action: 'ATUALIZAR_USUARIO',
          entityType: 'user',
          entityId: String(id),
          details: `Perfil atualizado (${Object.keys(patch).join(', ')})`,
        });

        res.json(updated);
      } catch {
        res.status(500).json({ error: 'Erro ao atualizar usuário.' });
      }
    }
  );

  // Admin: Database JSON Backup
  app.get(
    '/api/admin/backup',
    requireAuth,
    requireRole(['admin']),
    async (req: AuthRequest, res) => {
      try {
        const [
          allArticles,
          allCategories,
          allPodcasts,
          allVideos,
          allArtists,
          allSongs,
          allAds,
          allComments,
          allSettings,
        ] = await Promise.all([
          db.select().from(articles),
          db.select().from(categories),
          db.select().from(podcasts),
          db.select().from(videos),
          db.select().from(artists),
          db.select().from(songs),
          db.select().from(ads),
          db.select().from(comments),
          db.select().from(siteSettings),
        ]);

        await createAuditLog({
          userId: req.user!.id,
          userEmail: req.user!.email,
          action: 'BACKUP_BANCO',
          entityType: 'system',
          details: 'Backup completo exportado pelo administrador.',
        });

        const payload = {
          portal: 'Jornal Tribuna Almense',
          exportedAt: new Date().toISOString(),
          data: {
            articles: allArticles,
            categories: allCategories,
            podcasts: allPodcasts,
            videos: allVideos,
            artists: allArtists,
            songs: allSongs,
            ads: allAds,
            comments: allComments,
            settings: allSettings,
          },
        };
        res.setHeader('Content-Disposition', `attachment; filename="tribuna-almense-backup-${Date.now()}.json"`);
        res.json(payload);
      } catch {
        res.status(500).json({ error: 'Erro ao gerar backup.' });
      }
    }
  );

  // Vite or Static Frontend Serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Jornal Tribuna Almense server running on port ${PORT}`);
  });
}

startServer();
