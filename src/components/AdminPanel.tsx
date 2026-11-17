import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import {
  Archive,
  CheckCircle2,
  DatabaseBackup,
  Edit3,
  FileText,
  Headphones,
  Image as ImageIcon,
  Lock,
  LogOut,
  Megaphone,
  MessageSquare,
  Music2,
  Plus,
  Shield,
  Trash2,
  Upload,
  Users,
  Video as VideoIcon,
} from 'lucide-react';
import { auth, googleAuthProvider } from '../lib/firebase';
import { formatDateTimePtBR } from '../lib/format';
import {
  AdBanner,
  Article,
  Artist,
  AuditLogEntry,
  Category,
  CommentItem,
  ContactMessage,
  PodcastEpisode,
  SongItem,
  UserProfile,
  VideoItem,
} from '../types';
import { EditorialImage } from './EditorialImage';

interface AdminPanelProps {
  authToken: string | null;
  currentUser: UserProfile | null;
  onAuthSuccess: (token: string, user: UserProfile) => void;
  onLogout: () => void;
  onPortalDataChanged: () => void;
  onBackToPortal: () => void;
}

type AdminTab =
  | 'overview'
  | 'articles'
  | 'podcasts'
  | 'videos'
  | 'music'
  | 'ads'
  | 'community'
  | 'settings';

interface DashboardData {
  stats: {
    totalArticles: number;
    publishedArticles: number;
    draftArticles: number;
    scheduledArticles: number;
    totalViews: number;
    totalPodcasts: number;
    totalVideos: number;
    totalSongs: number;
    pendingComments: number;
    unreadMessages: number;
  };
  articles: Article[];
  categories: Category[];
  podcasts: PodcastEpisode[];
  videos: VideoItem[];
  artists: Artist[];
  songs: SongItem[];
  ads: AdBanner[];
  comments: CommentItem[];
  messages: ContactMessage[];
  settings: Record<string, string>;
  auditLogs: AuditLogEntry[];
  users: UserProfile[];
}

export function AdminPanel({
  authToken,
  currentUser,
  onAuthSuccess,
  onLogout,
  onPortalDataChanged,
  onBackToPortal,
}: AdminPanelProps) {
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [tab, setTab] = useState<AdminTab>('overview');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadingDash, setLoadingDash] = useState(false);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);

  // Article Form State
  const [editingArticleId, setEditingArticleId] = useState<number | null>(null);
  const [artTitle, setArtTitle] = useState('');
  const [artSubtitle, setArtSubtitle] = useState('');
  const [artSummary, setArtSummary] = useState('');
  const [artContent, setArtContent] = useState('');
  const [artCategory, setArtCategory] = useState('almas');
  const [artCover, setArtCover] = useState('');
  const [artGallery, setArtGallery] = useState<string[]>([]);
  const [artVideo, setArtVideo] = useState('');
  const [artAudio, setArtAudio] = useState('');
  const [artAuthor, setArtAuthor] = useState('Rinaldo da Nóbrega');
  const [artStatus, setArtStatus] = useState<'published' | 'draft' | 'scheduled' | 'archived'>('published');
  const [artScheduledAt, setArtScheduledAt] = useState('');
  const [artFeatured, setArtFeatured] = useState(false);
  const [artBreaking, setArtBreaking] = useState(false);
  const [artSubscriberOnly, setArtSubscriberOnly] = useState(false);
  const [artAllowComments, setArtAllowComments] = useState(true);

  // Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Podcast Form State
  const [podNum, setPodNum] = useState('3');
  const [podTitle, setPodTitle] = useState('');
  const [podGuest, setPodGuest] = useState('');
  const [podDuration, setPodDuration] = useState('25:00');
  const [podDesc, setPodDesc] = useState('');
  const [podAudio, setPodAudio] = useState('');
  const [podVideo, setPodVideo] = useState('');
  const [podCover, setPodCover] = useState('');

  // Video Form State
  const [vidTitle, setVidTitle] = useState('');
  const [vidCat, setVidCat] = useState('Reportagens');
  const [vidRatio, setVidRatio] = useState<'16:9' | '9:16'>('16:9');
  const [vidYoutube, setVidYoutube] = useState('');
  const [vidFileUrl, setVidFileUrl] = useState('');
  const [vidThumb, setVidThumb] = useState('');
  const [vidDesc, setVidDesc] = useState('');

  // Artist & Song Form State
  const [artistName, setArtistName] = useState('');
  const [artistCity, setArtistCity] = useState('Almas - TO');
  const [artistGenre, setArtistGenre] = useState('Regional');
  const [artistBio, setArtistBio] = useState('');
  const [artistPhoto, setArtistPhoto] = useState('');

  const [songArtistId, setSongArtistId] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [songGenre, setSongGenre] = useState('Regional');
  const [songDesc, setSongDesc] = useState('');
  const [songAudio, setSongAudio] = useState('');
  const [songCover, setSongCover] = useState('');
  const [songAuthorized, setSongAuthorized] = useState(false);
  const [songAuthNotes, setSongAuthNotes] = useState('');

  // Ad Form State
  const [adTitle, setAdTitle] = useState('');
  const [adAdvertiser, setAdAdvertiser] = useState('');
  const [adPlacement, setAdPlacement] = useState<'header' | 'sidebar' | 'in_feed' | 'sponsor'>('sidebar');
  const [adImage, setAdImage] = useState('');
  const [adTarget, setAdTarget] = useState('');
  const [adDesc, setAdDesc] = useState('');

  // Settings Draft
  const [settingsDraft, setSettingsDraft] = useState<Record<string, string>>({});

  // New User Form
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uUsername, setUUsername] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uRole, setURole] = useState<'admin' | 'editor' | 'reporter' | 'assinante'>('editor');
  const [uPlan, setUPlan] = useState<'free' | 'apoiador' | 'premium'>('free');

  const showToast = (msg: string, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 4000);
  };

  const isEditorialRole =
    currentUser && ['admin', 'editor', 'reporter'].includes(currentUser.role);

  const loadDashboard = async (token: string) => {
    setLoadingDash(true);
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Sem permissão para acessar o painel.');
      const payload: DashboardData = await res.json();
      setData(payload);
      setSettingsDraft(payload.settings || {});
      if (payload.artists.length > 0 && !songArtistId) {
        setSongArtistId(String(payload.artists[0].id));
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar painel.', true);
    } finally {
      setLoadingDash(false);
    }
  };

  useEffect(() => {
    if (authToken && isEditorialRole) {
      loadDashboard(authToken);
    }
  }, [authToken, isEditorialRole]);

  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginInput, password: passwordInput }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha na autenticação.');
      setPasswordInput('');
      onAuthSuccess(json.token, json.user);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();
      const res = await fetch('/api/auth/firebase', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha ao autenticar com Google.');
      onAuthSuccess(idToken, json.user);
    } catch (err: any) {
      setAuthError(err.message || 'Login com Google cancelado ou indisponível.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUploadFile = async (
    file: File,
    onSuccessUrl: (url: string) => void
  ) => {
    if (!authToken) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha no envio do arquivo.');
      onSuccessUrl(json.url);
      showToast(`Arquivo "${file.name}" enviado com sucesso.`);
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  const handleFileChange = (
    e: ChangeEvent<HTMLInputElement>,
    cb: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) handleUploadFile(file, cb);
    e.target.value = '';
  };

  const handleSaveArticle = async (e: FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    const payload = {
      title: artTitle,
      subtitle: artSubtitle,
      summary: artSummary,
      content: artContent,
      categorySlug: artCategory,
      coverImage: artCover,
      gallery: artGallery,
      videoUrl: artVideo,
      audioUrl: artAudio,
      authorName: artAuthor,
      status: artStatus,
      scheduledAt: artStatus === 'scheduled' && artScheduledAt ? artScheduledAt : null,
      isFeatured: artFeatured,
      isBreaking: artBreaking,
      isSubscriberOnly: artSubscriberOnly,
      allowComments: artAllowComments,
    };
    try {
      const url = editingArticleId
        ? `/api/admin/articles/${editingArticleId}`
        : '/api/admin/articles';
      const method = editingArticleId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar notícia.');

      setEditingArticleId(null);
      setArtTitle('');
      setArtSubtitle('');
      setArtSummary('');
      setArtContent('');
      setArtCover('');
      setArtGallery([]);
      setArtVideo('');
      setArtAudio('');
      setArtFeatured(false);
      setArtBreaking(false);
      setArtSubscriberOnly(false);
      showToast(editingArticleId ? 'Notícia atualizada!' : 'Notícia salva com sucesso!');
      await loadDashboard(authToken);
      onPortalDataChanged();
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  const startEditArticle = (a: Article) => {
    setEditingArticleId(a.id);
    setArtTitle(a.title);
    setArtSubtitle(a.subtitle || '');
    setArtSummary(a.summary);
    setArtContent(a.content);
    setArtCategory(a.categorySlug);
    setArtCover(a.coverImage || '');
    setArtGallery(Array.isArray(a.gallery) ? a.gallery : []);
    setArtVideo(a.videoUrl || '');
    setArtAudio(a.audioUrl || '');
    setArtAuthor(a.authorName);
    setArtStatus(a.status);
    setArtFeatured(a.isFeatured);
    setArtBreaking(a.isBreaking);
    setArtSubscriberOnly(a.isSubscriberOnly);
    setArtAllowComments(a.allowComments);
    setTab('articles');
  };

  const handleQuickArticleStatus = async (a: Article, nextStatus: Article['status']) => {
    if (!authToken) return;
    const res = await fetch(`/api/admin/articles/${a.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ ...a, status: nextStatus }),
    });
    if (res.ok) {
      showToast(`Status alterado para ${nextStatus}.`);
      loadDashboard(authToken);
      onPortalDataChanged();
    }
  };

  const handleDeleteArticle = async (id: number) => {
    if (!authToken) return;
    const res = await fetch(`/api/admin/articles/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      showToast('Notícia excluída.');
      loadDashboard(authToken);
      onPortalDataChanged();
    }
  };

  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ name: newCatName, description: newCatDesc }),
    });
    if (res.ok) {
      setNewCatName('');
      setNewCatDesc('');
      showToast('Categoria criada.');
      loadDashboard(authToken);
      onPortalDataChanged();
    }
  };

  const handleCreatePodcast = async (e: FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    const res = await fetch('/api/admin/podcasts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        episodeNumber: Number(podNum),
        title: podTitle,
        guestName: podGuest,
        duration: podDuration,
        description: podDesc,
        audioUrl: podAudio,
        videoUrl: podVideo,
        coverImage: podCover,
      }),
    });
    const json = await res.json();
    if (!res.ok) return showToast(json.error, true);
    setPodTitle('');
    setPodDesc('');
    setPodAudio('');
    setPodVideo('');
    showToast('Episódio de podcast publicado!');
    loadDashboard(authToken);
    onPortalDataChanged();
  };

  const handleCreateVideo = async (e: FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    const res = await fetch('/api/admin/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        title: vidTitle,
        category: vidCat,
        aspectRatio: vidRatio,
        youtubeId: vidYoutube,
        videoUrl: vidFileUrl,
        thumbnailUrl: vidThumb,
        description: vidDesc,
      }),
    });
    const json = await res.json();
    if (!res.ok) return showToast(json.error, true);
    setVidTitle('');
    setVidYoutube('');
    setVidFileUrl('');
    setVidDesc('');
    showToast('Vídeo publicado!');
    loadDashboard(authToken);
    onPortalDataChanged();
  };

  const handleCreateArtist = async (e: FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    const res = await fetch('/api/admin/artists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        name: artistName,
        city: artistCity,
        genre: artistGenre,
        bio: artistBio,
        photoUrl: artistPhoto,
      }),
    });
    if (res.ok) {
      setArtistName('');
      setArtistBio('');
      setArtistPhoto('');
      showToast('Artista cadastrado!');
      loadDashboard(authToken);
      onPortalDataChanged();
    }
  };

  const handleCreateSong = async (e: FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    const res = await fetch('/api/admin/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        artistId: Number(songArtistId),
        title: songTitle,
        genre: songGenre,
        description: songDesc,
        audioUrl: songAudio,
        coverImage: songCover,
        rightsAuthorized: songAuthorized,
        authorizationNotes: songAuthNotes,
      }),
    });
    const json = await res.json();
    if (!res.ok) return showToast(json.error, true);
    setSongTitle('');
    setSongDesc('');
    setSongAudio('');
    setSongAuthorized(false);
    setSongAuthNotes('');
    showToast('Música local autorizada publicada!');
    loadDashboard(authToken);
    onPortalDataChanged();
  };

  const handleCreateAd = async (e: FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    const res = await fetch('/api/admin/ads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        title: adTitle,
        advertiserName: adAdvertiser,
        placement: adPlacement,
        imageUrl: adImage,
        targetUrl: adTarget,
        description: adDesc,
      }),
    });
    if (res.ok) {
      setAdTitle('');
      setAdAdvertiser('');
      setAdImage('');
      setAdTarget('');
      setAdDesc('');
      showToast('Anúncio publicado!');
      loadDashboard(authToken);
      onPortalDataChanged();
    }
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(settingsDraft),
    });
    if (res.ok) {
      showToast('Identidade visual e configurações atualizadas!');
      loadDashboard(authToken);
      onPortalDataChanged();
    } else {
      showToast('Apenas administradores podem alterar configurações globais.', true);
    }
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        name: uName,
        email: uEmail,
        username: uUsername,
        password: uPassword,
        role: uRole,
        subscriptionPlan: uPlan,
      }),
    });
    const json = await res.json();
    if (!res.ok) return showToast(json.error, true);
    setUName('');
    setUEmail('');
    setUUsername('');
    setUPassword('');
    showToast('Usuário criado com senha criptografada!');
    loadDashboard(authToken);
  };

  const handleDownloadBackup = async () => {
    if (!authToken) return;
    const res = await fetch('/api/admin/backup', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) return showToast('Erro ao gerar backup.', true);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tribuna-almense-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup JSON exportado!');
  };

  // Login Gate Screen
  if (!authToken || !currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-14">
        <div className="bg-white border border-slate-200 p-7 sm:p-8">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-200">
            <Lock className="w-5 h-5 text-blue-900" />
            <div>
              <h1 className="text-2xl font-bold text-slate-950">Painel da Redação</h1>
              <p className="text-xs text-slate-500">Jornal Tribuna Almense · Acesso Restrito</p>
            </div>
          </div>

          <form onSubmit={handlePasswordLogin} className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Usuário ou E-mail
              </label>
              <input
                type="text"
                required
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 focus:outline-none focus:border-blue-900"
                placeholder="rinaldo ou seu@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Senha</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 focus:outline-none focus:border-blue-900"
                placeholder="••••••••"
              />
            </div>

            {authError && (
              <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 p-2.5">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60 cursor-pointer"
            >
              {authLoading ? 'Autenticando...' : 'Entrar com Login e Senha'}
            </button>
          </form>

          <div className="relative my-5 text-center">
            <div className="border-t border-slate-200" />
            <span className="bg-white px-3 text-xs text-slate-400 relative -top-2.5">ou</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={authLoading}
            className="w-full py-2.5 border border-slate-300 text-slate-800 text-sm font-semibold hover:border-blue-900 hover:text-blue-900 transition-colors cursor-pointer"
          >
            Entrar com Conta Google Institucional
          </button>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1">
            <p>
              Acesso editorial inicial: usuário <span className="font-mono text-slate-700">rinaldo</span> /
              senha <span className="font-mono text-slate-700">Tribuna@2026</span> (altere em Usuários após entrar).
            </p>
            <button
              type="button"
              onClick={onBackToPortal}
              className="text-blue-900 font-medium hover:underline cursor-pointer pt-1"
            >
              Voltar ao portal público
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Subscriber non-editorial view
  if (!isEditorialRole) {
    return (
      <div className="max-w-xl mx-auto px-4 py-14">
        <div className="bg-white border border-slate-200 p-8 text-center space-y-4">
          <Shield className="w-8 h-8 text-blue-900 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-950">Conta de Leitor / Assinante</h1>
          <p className="text-sm text-slate-600">
            Conectado como <span className="font-semibold">{currentUser.email}</span> · Plano:{' '}
            <span className="font-semibold uppercase">{currentUser.subscriptionPlan}</span>
          </p>
          <p className="text-xs text-slate-500">
            Seu perfil não possui permissões administrativas de publicação. Caso integre a redação,
            solicite elevação de acesso ao diretor Rinaldo da Nóbrega.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onBackToPortal}
              className="px-4 py-2 bg-blue-900 text-white text-xs font-semibold cursor-pointer"
            >
              Ir para o Portal
            </button>
            <button
              type="button"
              onClick={async () => {
                await signOut(auth).catch(() => {});
                onLogout();
              }}
              className="px-4 py-2 border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs: Array<{ id: AdminTab; label: string; icon: any }> = [
    { id: 'overview', label: 'Visão Geral', icon: FileText },
    { id: 'articles', label: 'Notícias & Categorias', icon: Edit3 },
    { id: 'podcasts', label: 'Podcasts', icon: Headphones },
    { id: 'videos', label: 'Vídeos', icon: VideoIcon },
    { id: 'music', label: 'Músicas Locais', icon: Music2 },
    { id: 'ads', label: 'Publicidade', icon: Megaphone },
    { id: 'community', label: 'Comentários & Contato', icon: MessageSquare },
    { id: 'settings', label: 'Logo, Redes & Usuários', icon: Users },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 text-sm font-medium border shadow-md ${
            toast.err
              ? 'bg-red-50 text-red-900 border-red-300'
              : 'bg-blue-950 text-white border-blue-900'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-semibold tracking-wider text-blue-900 uppercase">
            Administração Editorial · {currentUser.role.toUpperCase()}
          </p>
          <h1 className="text-3xl font-bold text-slate-950">Painel Jornal Tribuna Almense</h1>
          <p className="text-xs text-slate-500 mt-1">
            Conectado como <span className="font-semibold text-slate-800">{currentUser.name}</span> ({currentUser.email})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToPortal}
            className="px-4 py-2 border border-slate-300 text-xs font-semibold text-slate-700 hover:border-blue-900 hover:text-blue-900 cursor-pointer"
          >
            Ver Portal Público
          </button>
          <button
            type="button"
            onClick={async () => {
              await signOut(auth).catch(() => {});
              onLogout();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Encerrar Sessão
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 bg-slate-100 p-1 mb-8">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                tab === t.id
                  ? 'bg-white text-blue-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {loadingDash && !data ? (
        <div className="py-16 text-center text-sm text-slate-500">Carregando dados da redação...</div>
      ) : (
        data && (
          <>
            {/* OVERVIEW TAB */}
            {tab === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Notícias Publicadas', value: data.stats.publishedArticles },
                    { label: 'Rascunhos / Agendadas', value: data.stats.draftArticles + data.stats.scheduledArticles },
                    { label: 'Total de Visualizações', value: data.stats.totalViews },
                    { label: 'Podcasts & Vídeos', value: data.stats.totalPodcasts + data.stats.totalVideos },
                    { label: 'Músicas Locais', value: data.stats.totalSongs },
                    { label: 'Comentários Pendentes', value: data.stats.pendingComments },
                    { label: 'Mensagens Não Lidas', value: data.stats.unreadMessages },
                    { label: 'Anúncios Ativos', value: data.ads.filter((a) => a.active).length },
                  ].map((kpi) => (
                    <div key={kpi.label} className="p-4 bg-white border border-slate-200">
                      <div className="text-xs text-slate-500 mb-1">{kpi.label}</div>
                      <div className="text-2xl font-bold font-mono tabular-nums text-blue-950">
                        {kpi.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-950">Publicações Recentes</h2>
                    <button
                      type="button"
                      onClick={() => setTab('articles')}
                      className="text-xs font-semibold text-blue-900 hover:underline cursor-pointer"
                    >
                      Gerenciar todas
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-2 pr-4">Título</th>
                          <th className="py-2 pr-4">Editoria</th>
                          <th className="py-2 pr-4">Status</th>
                          <th className="py-2 pr-4 text-right">Leituras</th>
                          <th className="py-2 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.articles.slice(0, 8).map((a) => (
                          <tr key={a.id}>
                            <td className="py-2.5 pr-4 font-medium text-slate-900 max-w-md truncate">
                              {a.title}
                            </td>
                            <td className="py-2.5 pr-4 text-xs text-slate-600">{a.categorySlug}</td>
                            <td className="py-2.5 pr-4 text-xs font-medium text-blue-900">{a.status}</td>
                            <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-slate-700">
                              {a.views}
                            </td>
                            <td className="py-2.5 text-right whitespace-nowrap space-x-2">
                              <button
                                type="button"
                                onClick={() => startEditArticle(a)}
                                className="text-xs text-blue-900 hover:underline cursor-pointer"
                              >
                                Editar
                              </button>
                              {a.status !== 'archived' && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickArticleStatus(a, 'archived')}
                                  className="text-xs text-slate-500 hover:underline cursor-pointer"
                                >
                                  Arquivar
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ARTICLES & CATEGORIES TAB */}
            {tab === 'articles' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <form
                  onSubmit={handleSaveArticle}
                  className="lg:col-span-7 bg-white border border-slate-200 p-6 space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-950">
                      {editingArticleId ? 'Editar Matéria' : 'Publicar Nova Matéria'}
                    </h2>
                    {editingArticleId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingArticleId(null);
                          setArtTitle('');
                          setArtSubtitle('');
                          setArtSummary('');
                          setArtContent('');
                        }}
                        className="text-xs text-slate-500 hover:underline cursor-pointer"
                      >
                        Cancelar edição
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Título</label>
                    <input
                      type="text"
                      required
                      value={artTitle}
                      onChange={(e) => setArtTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300"
                      placeholder="Manchete da notícia"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Subtítulo / Linha fina</label>
                    <input
                      type="text"
                      value={artSubtitle}
                      onChange={(e) => setArtSubtitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300"
                      placeholder="Complemento explicativo"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria</label>
                      <select
                        value={artCategory}
                        onChange={(e) => setArtCategory(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 bg-white"
                      >
                        {data.categories.map((c) => (
                          <option key={c.slug} value={c.slug}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                      <select
                        value={artStatus}
                        onChange={(e) => setArtStatus(e.target.value as any)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 bg-white"
                      >
                        <option value="published">Publicar Agora</option>
                        <option value="draft">Salvar Rascunho</option>
                        <option value="scheduled">Programar Publicação</option>
                        <option value="archived">Arquivar</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Autor</label>
                      <input
                        type="text"
                        value={artAuthor}
                        onChange={(e) => setArtAuthor(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300"
                      />
                    </div>
                  </div>

                  {artStatus === 'scheduled' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Data e Hora Programada
                      </label>
                      <input
                        type="datetime-local"
                        value={artScheduledAt}
                        onChange={(e) => setArtScheduledAt(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Resumo</label>
                    <textarea
                      rows={2}
                      required
                      value={artSummary}
                      onChange={(e) => setArtSummary(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Texto Completo da Matéria
                    </label>
                    <textarea
                      rows={7}
                      required
                      value={artContent}
                      onChange={(e) => setArtContent(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Fotografia de Capa (URL ou Upload)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={artCover}
                          onChange={(e) => setArtCover(e.target.value)}
                          className="flex-1 px-3 py-2 text-xs border border-slate-300"
                          placeholder="/uploads/..."
                        />
                        <label className="px-3 py-2 bg-slate-100 border border-slate-300 text-xs font-medium cursor-pointer hover:bg-slate-200 inline-flex items-center gap-1">
                          <Upload className="w-3.5 h-3.5" />
                          Foto
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileChange(e, (url) => setArtCover(url))}
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Galeria de Imagens (adicionar fotos)
                      </label>
                      <label className="w-full px-3 py-2 bg-slate-50 border border-dashed border-slate-300 text-xs font-medium cursor-pointer hover:bg-slate-100 inline-flex items-center justify-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5" />
                        Enviar foto para galeria ({artGallery.length} anexadas)
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleFileChange(e, (url) => setArtGallery((prev) => [...prev, url]))
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Vídeo da Matéria (YouTube ou MP4)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={artVideo}
                          onChange={(e) => setArtVideo(e.target.value)}
                          className="flex-1 px-3 py-2 text-xs border border-slate-300"
                          placeholder="Link YouTube ou /uploads/..."
                        />
                        <label className="px-3 py-2 bg-slate-100 border border-slate-300 text-xs cursor-pointer">
                          MP4
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => handleFileChange(e, (url) => setArtVideo(url))}
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Áudio da Matéria (MP3)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={artAudio}
                          onChange={(e) => setArtAudio(e.target.value)}
                          className="flex-1 px-3 py-2 text-xs border border-slate-300"
                          placeholder="/uploads/..."
                        />
                        <label className="px-3 py-2 bg-slate-100 border border-slate-300 text-xs cursor-pointer">
                          MP3
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => handleFileChange(e, (url) => setArtAudio(url))}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-700">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={artFeatured}
                        onChange={(e) => setArtFeatured(e.target.checked)}
                      />
                      Manchete Principal
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={artBreaking}
                        onChange={(e) => setArtBreaking(e.target.checked)}
                      />
                      Urgente (Plantão)
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={artSubscriberOnly}
                        onChange={(e) => setArtSubscriberOnly(e.target.checked)}
                      />
                      Exclusiva Assinantes
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={artAllowComments}
                        onChange={(e) => setArtAllowComments(e.target.checked)}
                      />
                      Habilitar Comentários
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 cursor-pointer"
                  >
                    {editingArticleId ? 'Atualizar Publicação' : 'Salvar Publicação'}
                  </button>
                </form>

                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white border border-slate-200 p-5">
                    <h3 className="text-lg font-bold text-slate-950 mb-3">
                      Todas as Notícias ({data.articles.length})
                    </h3>
                    <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
                      {data.articles.map((a) => (
                        <div key={a.id} className="py-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 line-clamp-2">
                              {a.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {a.categorySlug} · {a.status} ·{' '}
                              <span className="font-mono tabular-nums">{a.views} views</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEditArticle(a)}
                              className="p-1.5 text-blue-900 hover:bg-blue-50 cursor-pointer"
                              aria-label="Editar"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickArticleStatus(a, 'archived')}
                              className="p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer"
                              aria-label="Arquivar"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteArticle(a.id)}
                              className="p-1.5 text-red-700 hover:bg-red-50 cursor-pointer"
                              aria-label="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 space-y-4">
                    <h3 className="text-lg font-bold text-slate-950">Categorias Editoriais</h3>
                    <form onSubmit={handleCreateCategory} className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="Nova categoria"
                        className="flex-1 px-3 py-2 text-xs border border-slate-300"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-2 bg-blue-900 text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Criar
                      </button>
                    </form>
                    <div className="divide-y divide-slate-100">
                      {data.categories.map((c) => (
                        <div key={c.id} className="py-2 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-900">{c.name}</span>
                            <span className="text-slate-400 ml-2 font-mono">/{c.slug}</span>
                          </div>
                          {!c.isSystem && (
                            <button
                              type="button"
                              onClick={async () => {
                                await fetch(`/api/admin/categories/${c.id}`, {
                                  method: 'DELETE',
                                  headers: { Authorization: `Bearer ${authToken}` },
                                });
                                loadDashboard(authToken!);
                                onPortalDataChanged();
                              }}
                              className="text-red-700 hover:underline cursor-pointer"
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PODCASTS TAB */}
            {tab === 'podcasts' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <form
                  onSubmit={handleCreatePodcast}
                  className="lg:col-span-5 bg-white border border-slate-200 p-6 space-y-4"
                >
                  <h2 className="text-xl font-bold text-slate-950">Publicar Episódio de Podcast</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nº Episódio</label>
                      <input
                        type="number"
                        value={podNum}
                        onChange={(e) => setPodNum(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Duração</label>
                      <input
                        type="text"
                        value={podDuration}
                        onChange={(e) => setPodDuration(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300"
                        placeholder="28:40"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Título</label>
                    <input
                      type="text"
                      required
                      value={podTitle}
                      onChange={(e) => setPodTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Convidado / Apresentação</label>
                    <input
                      type="text"
                      value={podGuest}
                      onChange={(e) => setPodGuest(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição</label>
                    <textarea
                      rows={3}
                      required
                      value={podDesc}
                      onChange={(e) => setPodDesc(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Arquivo de Áudio (MP3)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={podAudio}
                        onChange={(e) => setPodAudio(e.target.value)}
                        placeholder="/uploads/episodio.mp3"
                        className="flex-1 px-3 py-2 text-xs border border-slate-300"
                      />
                      <label className="px-3 py-2 bg-slate-100 border border-slate-300 text-xs cursor-pointer">
                        Enviar MP3
                        <input
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, setPodAudio)}
                        />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Capa do Episódio</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={podCover}
                        onChange={(e) => setPodCover(e.target.value)}
                        placeholder="URL ou enviar imagem"
                        className="flex-1 px-3 py-2 text-xs border border-slate-300"
                      />
                      <label className="px-3 py-2 bg-slate-100 border border-slate-300 text-xs cursor-pointer">
                        Capa
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, setPodCover)}
                        />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Vídeo da Entrevista (YouTube opcional)
                    </label>
                    <input
                      type="text"
                      value={podVideo}
                      onChange={(e) => setPodVideo(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full px-3 py-2 text-xs border border-slate-300"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 cursor-pointer"
                  >
                    Publicar Episódio
                  </button>
                </form>

                <div className="lg:col-span-7 bg-white border border-slate-200 p-6">
                  <h2 className="text-xl font-bold text-slate-950 mb-4">
                    Episódios Publicados ({data.podcasts.length})
                  </h2>
                  <div className="divide-y divide-slate-100">
                    {data.podcasts.map((p) => (
                      <div key={p.id} className="py-3.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 shrink-0 border border-slate-200 overflow-hidden">
                            <EditorialImage src={p.coverImage} alt={p.title} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              Ep. {p.episodeNumber} — {p.title}
                            </p>
                            <p className="text-xs text-slate-500">
                              {p.duration} · {p.guestName}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch(`/api/admin/podcasts/${p.id}`, {
                              method: 'DELETE',
                              headers: { Authorization: `Bearer ${authToken}` },
                            });
                            loadDashboard(authToken!);
                            onPortalDataChanged();
                          }}
                          className="text-xs text-red-700 hover:underline cursor-pointer shrink-0"
                        >
                          Excluir
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* VIDEOS TAB */}
            {tab === 'videos' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <form
                  onSubmit={handleCreateVideo}
                  className="lg:col-span-5 bg-white border border-slate-200 p-6 space-y-4"
                >
                  <h2 className="text-xl font-bold text-slate-950">Publicar Vídeo Jornalístico</h2>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Título</label>
                    <input
                      type="text"
                      required
                      value={vidTitle}
                      onChange={(e) => setVidTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria</label>
                      <input
                        type="text"
                        value={vidCat}
                        onChange={(e) => setVidCat(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Formato</label>
                      <select
                        value={vidRatio}
                        onChange={(e) => setVidRatio(e.target.value as '16:9' | '9:16')}
                        className="w-full px-3 py-2 text-sm border border-slate-300 bg-white"
                      >
                        <option value="16:9">Horizontal (16:9)</option>
                        <option value="9:16">Vertical (9:16)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Link do YouTube (ou ID)
                    </label>
                    <input
                      type="text"
                      value={vidYoutube}
                      onChange={(e) => setVidYoutube(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full px-3 py-2 text-xs border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ou enviar vídeo MP4 gravado
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={vidFileUrl}
                        onChange={(e) => setVidFileUrl(e.target.value)}
                        placeholder="/uploads/video.mp4"
                        className="flex-1 px-3 py-2 text-xs border border-slate-300"
                      />
                      <label className="px-3 py-2 bg-slate-100 border border-slate-300 text-xs cursor-pointer">
                        Enviar MP4
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, setVidFileUrl)}
                        />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Miniatura / Capa</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={vidThumb}
                        onChange={(e) => setVidThumb(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-slate-300"
                      />
                      <label className="px-3 py-2 bg-slate-100 border border-slate-300 text-xs cursor-pointer">
                        Imagem
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, setVidThumb)}
                        />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição</label>
                    <textarea
                      rows={3}
                      value={vidDesc}
                      onChange={(e) => setVidDesc(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-900 text-white text-sm font-semibold cursor-pointer"
                  >
                    Publicar Vídeo
                  </button>
                </form>

                <div className="lg:col-span-7 bg-white border border-slate-200 p-6">
                  <h2 className="text-xl font-bold text-slate-950 mb-4">
                    Vídeos Cadastrados ({data.videos.length})
                  </h2>
                  <div className="divide-y divide-slate-100">
                    {data.videos.map((v) => (
                      <div key={v.id} className="py-3.5 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{v.title}</p>
                          <p className="text-xs text-slate-500">
                            {v.category} · Formato {v.aspectRatio} ·{' '}
                            <span className="font-mono tabular-nums">{v.views} views</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch(`/api/admin/videos/${v.id}`, {
                              method: 'DELETE',
                              headers: { Authorization: `Bearer ${authToken}` },
                            });
                            loadDashboard(authToken!);
                            onPortalDataChanged();
                          }}
                          className="text-xs text-red-700 hover:underline cursor-pointer"
                        >
                          Excluir
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MUSIC TAB */}
            {tab === 'music' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 space-y-6">
                  <form
                    onSubmit={handleCreateArtist}
                    className="bg-white border border-slate-200 p-5 space-y-3"
                  >
                    <h2 className="text-lg font-bold text-slate-950">Cadastrar Artista Local</h2>
                    <input
                      type="text"
                      required
                      value={artistName}
                      onChange={(e) => setArtistName(e.target.value)}
                      placeholder="Nome do artista ou grupo"
                      className="w-full px-3 py-2 text-sm border border-slate-300"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={artistCity}
                        onChange={(e) => setArtistCity(e.target.value)}
                        placeholder="Cidade"
                        className="px-3 py-2 text-xs border border-slate-300"
                      />
                      <input
                        type="text"
                        value={artistGenre}
                        onChange={(e) => setArtistGenre(e.target.value)}
                        placeholder="Gênero musical"
                        className="px-3 py-2 text-xs border border-slate-300"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={artistBio}
                      onChange={(e) => setArtistBio(e.target.value)}
                      placeholder="Biografia resumida"
                      className="w-full px-3 py-2 text-xs border border-slate-300"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={artistPhoto}
                        onChange={(e) => setArtistPhoto(e.target.value)}
                        placeholder="Foto do artista"
                        className="flex-1 px-3 py-2 text-xs border border-slate-300"
                      />
                      <label className="px-3 py-2 bg-slate-100 border border-slate-300 text-xs cursor-pointer">
                        Foto
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, setArtistPhoto)}
                        />
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                    >
                      Cadastrar Artista
                    </button>
                  </form>

                  <form
                    onSubmit={handleCreateSong}
                    className="bg-white border border-slate-200 p-5 space-y-3"
                  >
                    <h2 className="text-lg font-bold text-slate-950">Publicar Música Autorizada</h2>
                    <select
                      value={songArtistId}
                      onChange={(e) => setSongArtistId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 bg-white"
                    >
                      {data.artists.map((ar) => (
                        <option key={ar.id} value={ar.id}>
                          {ar.name} ({ar.city})
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        value={songTitle}
                        onChange={(e) => setSongTitle(e.target.value)}
                        placeholder="Título da música"
                        className="px-3 py-2 text-sm border border-slate-300"
                      />
                      <input
                        type="text"
                        value={songGenre}
                        onChange={(e) => setSongGenre(e.target.value)}
                        placeholder="Gênero"
                        className="px-3 py-2 text-sm border border-slate-300"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={songDesc}
                      onChange={(e) => setSongDesc(e.target.value)}
                      placeholder="Informações da obra / composição"
                      className="w-full px-3 py-2 text-xs border border-slate-300"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={songAudio}
                        onChange={(e) => setSongAudio(e.target.value)}
                        placeholder="Arquivo MP3"
                        className="flex-1 px-3 py-2 text-xs border border-slate-300"
                      />
                      <label className="px-3 py-2 bg-slate-100 border border-slate-300 text-xs cursor-pointer">
                        MP3
                        <input
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, setSongAudio)}
                        />
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={songCover}
                        onChange={(e) => setSongCover(e.target.value)}
                        placeholder="Capa da música/álbum"
                        className="flex-1 px-3 py-2 text-xs border border-slate-300"
                      />
                      <label className="px-3 py-2 bg-slate-100 border border-slate-300 text-xs cursor-pointer">
                        Capa
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, setSongCover)}
                        />
                      </label>
                    </div>
                    <label className="flex items-start gap-2 text-xs text-slate-800 bg-emerald-50 border border-emerald-200 p-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={songAuthorized}
                        onChange={(e) => setSongAuthorized(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>
                        Declaro que os direitos de divulgação e reprodução desta música estão
                        expressamente autorizados pelo artista/compositor.
                      </span>
                    </label>
                    <input
                      type="text"
                      value={songAuthNotes}
                      onChange={(e) => setSongAuthNotes(e.target.value)}
                      placeholder="Registro da autorização (ex: Termo assinado em...)"
                      className="w-full px-3 py-2 text-xs border border-slate-300"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-blue-900 text-white text-sm font-semibold cursor-pointer"
                    >
                      Publicar Música
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-7 bg-white border border-slate-200 p-6">
                  <h2 className="text-xl font-bold text-slate-950 mb-4">
                    Acervo de Músicas Locais ({data.songs.length})
                  </h2>
                  <div className="divide-y divide-slate-100">
                    {data.songs.map((s) => (
                      <div key={s.id} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{s.title}</p>
                          <p className="text-xs text-slate-500">
                            {s.genre} ·{' '}
                            <span className="font-mono tabular-nums">{s.plays} reproduções</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch(`/api/admin/songs/${s.id}`, {
                              method: 'DELETE',
                              headers: { Authorization: `Bearer ${authToken}` },
                            });
                            loadDashboard(authToken!);
                            onPortalDataChanged();
                          }}
                          className="text-xs text-red-700 hover:underline cursor-pointer"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ADS TAB */}
            {tab === 'ads' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <form
                  onSubmit={handleCreateAd}
                  className="lg:col-span-5 bg-white border border-slate-200 p-6 space-y-4"
                >
                  <h2 className="text-xl font-bold text-slate-950">Novo Espaço Publicitário</h2>
                  <input
                    type="text"
                    required
                    value={adTitle}
                    onChange={(e) => setAdTitle(e.target.value)}
                    placeholder="Título do anúncio ou campanha"
                    className="w-full px-3 py-2 text-sm border border-slate-300"
                  />
                  <input
                    type="text"
                    required
                    value={adAdvertiser}
                    onChange={(e) => setAdAdvertiser(e.target.value)}
                    placeholder="Nome da empresa / patrocinador"
                    className="w-full px-3 py-2 text-sm border border-slate-300"
                  />
                  <select
                    value={adPlacement}
                    onChange={(e) => setAdPlacement(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 bg-white"
                  >
                    <option value="header">Banner Cabeçalho</option>
                    <option value="sidebar">Banner Lateral</option>
                    <option value="in_feed">Publicidade Entre Notícias</option>
                    <option value="sponsor">Espaço Patrocinador</option>
                  </select>
                  <textarea
                    rows={2}
                    value={adDesc}
                    onChange={(e) => setAdDesc(e.target.value)}
                    placeholder="Texto curto da oferta ou patrocínio"
                    className="w-full px-3 py-2 text-xs border border-slate-300"
                  />
                  <input
                    type="text"
                    value={adTarget}
                    onChange={(e) => setAdTarget(e.target.value)}
                    placeholder="Link de destino (ex: https://...)"
                    className="w-full px-3 py-2 text-xs border border-slate-300"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={adImage}
                      onChange={(e) => setAdImage(e.target.value)}
                      placeholder="Banner imagem (opcional)"
                      className="flex-1 px-3 py-2 text-xs border border-slate-300"
                    />
                    <label className="px-3 py-2 bg-slate-100 border border-slate-300 text-xs cursor-pointer">
                      Banner
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, setAdImage)}
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-900 text-white text-sm font-semibold cursor-pointer"
                  >
                    Cadastrar Anúncio
                  </button>
                </form>

                <div className="lg:col-span-7 bg-white border border-slate-200 p-6">
                  <h2 className="text-xl font-bold text-slate-950 mb-4">
                    Anúncios & Patrocinadores ({data.ads.length})
                  </h2>
                  <div className="divide-y divide-slate-100">
                    {data.ads.map((ad) => (
                      <div key={ad.id} className="py-3.5 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{ad.title}</p>
                          <p className="text-xs text-slate-500">
                            {ad.advertiserName} · Posição: {ad.placement} ·{' '}
                            <span className="font-mono tabular-nums">{ad.clicks} cliques</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={async () => {
                              await fetch(`/api/admin/ads/${ad.id}`, {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${authToken}`,
                                },
                                body: JSON.stringify({ active: !ad.active }),
                              });
                              loadDashboard(authToken!);
                              onPortalDataChanged();
                            }}
                            className={`px-2.5 py-1 text-xs font-semibold border cursor-pointer ${
                              ad.active
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                : 'border-slate-300 bg-slate-50 text-slate-600'
                            }`}
                          >
                            {ad.active ? 'Ativo' : 'Pausado'}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await fetch(`/api/admin/ads/${ad.id}`, {
                                method: 'DELETE',
                                headers: { Authorization: `Bearer ${authToken}` },
                              });
                              loadDashboard(authToken!);
                              onPortalDataChanged();
                            }}
                            className="text-xs text-red-700 hover:underline cursor-pointer"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* COMMUNITY TAB (Comments + Contact Messages) */}
            {tab === 'community' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white border border-slate-200 p-6">
                  <h2 className="text-xl font-bold text-slate-950 mb-4">
                    Moderação de Comentários ({data.comments.length})
                  </h2>
                  {data.comments.length === 0 ? (
                    <p className="text-sm text-slate-500">Nenhum comentário enviado ainda.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {data.comments.map((c) => (
                        <div key={c.id} className="py-3.5 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-900">
                              {c.authorName} ({c.authorEmail})
                            </span>
                            <span className="font-medium text-blue-900 uppercase">{c.status}</span>
                          </div>
                          <p className="text-sm text-slate-700">{c.content}</p>
                          <div className="flex items-center gap-3 text-xs">
                            <button
                              type="button"
                              onClick={async () => {
                                await fetch(`/api/admin/comments/${c.id}`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${authToken}`,
                                  },
                                  body: JSON.stringify({ status: 'approved' }),
                                });
                                loadDashboard(authToken!);
                              }}
                              className="text-emerald-700 font-semibold hover:underline cursor-pointer"
                            >
                              Aprovar
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await fetch(`/api/admin/comments/${c.id}`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${authToken}`,
                                  },
                                  body: JSON.stringify({ status: 'rejected' }),
                                });
                                loadDashboard(authToken!);
                              }}
                              className="text-amber-700 font-semibold hover:underline cursor-pointer"
                            >
                              Rejeitar
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await fetch(`/api/admin/comments/${c.id}`, {
                                  method: 'DELETE',
                                  headers: { Authorization: `Bearer ${authToken}` },
                                });
                                loadDashboard(authToken!);
                              }}
                              className="text-red-700 hover:underline cursor-pointer"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200 p-6">
                  <h2 className="text-xl font-bold text-slate-950 mb-4">
                    Mensagens do Formulário de Contato ({data.messages.length})
                  </h2>
                  {data.messages.length === 0 ? (
                    <p className="text-sm text-slate-500">Nenhuma mensagem recebida.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {data.messages.map((m) => (
                        <div key={m.id} className="py-3.5 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900">{m.subject}</span>
                            <span className="font-mono text-slate-500">
                              {formatDateTimePtBR(m.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-blue-900">
                            {m.name} · {m.email}
                          </p>
                          <p className="text-sm text-slate-700">{m.message}</p>
                          {!m.isRead && (
                            <button
                              type="button"
                              onClick={async () => {
                                await fetch(`/api/admin/messages/${m.id}/read`, {
                                  method: 'PATCH',
                                  headers: { Authorization: `Bearer ${authToken}` },
                                });
                                loadDashboard(authToken!);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Marcar como lida
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SETTINGS, LOGO, USERS, BACKUP & AUDIT LOGS TAB */}
            {tab === 'settings' && (
              <div className="space-y-8">
                <form
                  onSubmit={handleSaveSettings}
                  className="bg-white border border-slate-200 p-6 space-y-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                      <h2 className="text-xl font-bold text-slate-950">
                        Identidade Visual, Logomarca Oficial & Redes Sociais
                      </h2>
                      <p className="text-xs text-slate-500">
                        Substitua a logomarca oficial sempre que precisar e atualize os links do portal.
                      </p>
                    </div>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 cursor-pointer"
                    >
                      Salvar Configurações
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-slate-50 p-4 border border-slate-200">
                    <div className="md:col-span-3 flex justify-center">
                      <div className="w-28 h-28 bg-white border border-slate-200 p-2 overflow-hidden">
                        <EditorialImage
                          src={settingsDraft.logo_url}
                          alt="Logomarca Oficial"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-9 space-y-2">
                      <label className="block text-xs font-semibold text-slate-800">
                        Logomarca Oficial (Cabeçalho, Capa, Rodapé e Institucionais)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="text"
                          value={settingsDraft.logo_url || ''}
                          onChange={(e) =>
                            setSettingsDraft((s) => ({ ...s, logo_url: e.target.value }))
                          }
                          className="flex-1 min-w-[220px] px-3 py-2 text-xs border border-slate-300 bg-white"
                        />
                        <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 text-white text-xs font-semibold cursor-pointer hover:bg-blue-800">
                          <Upload className="w-3.5 h-3.5" />
                          Enviar / Substituir Logomarca
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              handleFileChange(e, (url) =>
                                setSettingsDraft((s) => ({ ...s, logo_url: url }))
                              )
                            }
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { key: 'portal_name', label: 'Nome do Portal' },
                      { key: 'slogan', label: 'Slogan' },
                      { key: 'editor_chief', label: 'Responsável Editorial' },
                      { key: 'whatsapp', label: 'WhatsApp' },
                      { key: 'email', label: 'E-mail Institucional' },
                      { key: 'facebook_url', label: 'Facebook URL' },
                      { key: 'instagram_url', label: 'Instagram URL' },
                      { key: 'youtube_url', label: 'YouTube URL' },
                      { key: 'tiktok_url', label: 'TikTok URL' },
                    ].map((field) => (
                      <div key={field.key}>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {field.label}
                        </label>
                        <input
                          type="text"
                          value={settingsDraft[field.key] || ''}
                          onChange={(e) =>
                            setSettingsDraft((s) => ({ ...s, [field.key]: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-xs border border-slate-300"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {[
                      { key: 'about_text', label: 'Texto: Sobre o Jornal' },
                      { key: 'expediente_text', label: 'Texto: Expediente' },
                      { key: 'editorial_policy_text', label: 'Texto: Política Editorial' },
                      { key: 'privacy_text', label: 'Texto: Política de Privacidade' },
                      { key: 'terms_text', label: 'Texto: Termos de Uso' },
                      { key: 'advertise_text', label: 'Texto: Anuncie no Jornal' },
                    ].map((area) => (
                      <div key={area.key}>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {area.label}
                        </label>
                        <textarea
                          rows={4}
                          value={settingsDraft[area.key] || ''}
                          onChange={(e) =>
                            setSettingsDraft((s) => ({ ...s, [area.key]: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-xs border border-slate-300"
                        />
                      </div>
                    ))}
                  </div>
                </form>

                {/* USERS & SUBSCRIPTIONS */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <form
                    onSubmit={handleCreateUser}
                    className="lg:col-span-5 bg-white border border-slate-200 p-6 space-y-3"
                  >
                    <h3 className="text-lg font-bold text-slate-950">
                      Novo Usuário / Assinante
                    </h3>
                    <input
                      type="text"
                      required
                      value={uName}
                      onChange={(e) => setUName(e.target.value)}
                      placeholder="Nome completo"
                      className="w-full px-3 py-2 text-sm border border-slate-300"
                    />
                    <input
                      type="email"
                      required
                      value={uEmail}
                      onChange={(e) => setUEmail(e.target.value)}
                      placeholder="E-mail"
                      className="w-full px-3 py-2 text-sm border border-slate-300"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={uUsername}
                        onChange={(e) => setUUsername(e.target.value)}
                        placeholder="Login (usuário)"
                        className="px-3 py-2 text-sm border border-slate-300"
                      />
                      <input
                        type="password"
                        required
                        value={uPassword}
                        onChange={(e) => setUPassword(e.target.value)}
                        placeholder="Senha (mín. 6)"
                        className="px-3 py-2 text-sm border border-slate-300"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={uRole}
                        onChange={(e) => setURole(e.target.value as any)}
                        className="px-3 py-2 text-xs border border-slate-300 bg-white"
                      >
                        <option value="admin">Administrador</option>
                        <option value="editor">Editor</option>
                        <option value="reporter">Repórter</option>
                        <option value="assinante">Assinante (Leitor)</option>
                      </select>
                      <select
                        value={uPlan}
                        onChange={(e) => setUPlan(e.target.value as any)}
                        className="px-3 py-2 text-xs border border-slate-300 bg-white"
                      >
                        <option value="free">Plano Gratuito</option>
                        <option value="apoiador">Plano Apoiador</option>
                        <option value="premium">Plano Premium</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-blue-900 text-white text-xs font-semibold cursor-pointer"
                    >
                      Criar Usuário
                    </button>
                  </form>

                  <div className="lg:col-span-7 bg-white border border-slate-200 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-950">
                        Usuários & Permissões ({data.users.length})
                      </h3>
                      <button
                        type="button"
                        onClick={handleDownloadBackup}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                      >
                        <DatabaseBackup className="w-3.5 h-3.5" />
                        Backup do Banco (JSON)
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {data.users.map((u) => (
                        <div key={u.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div>
                            <span className="font-bold text-slate-900">{u.name}</span>
                            <span className="text-slate-500 ml-2">{u.email}</span>
                            {u.username && (
                              <span className="text-blue-900 ml-2 font-mono">@{u.username}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={u.role}
                              onChange={async (e) => {
                                await fetch(`/api/admin/users/${u.id}`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${authToken}`,
                                  },
                                  body: JSON.stringify({ role: e.target.value }),
                                });
                                loadDashboard(authToken!);
                              }}
                              className="px-2 py-1 border border-slate-300 bg-white"
                            >
                              <option value="admin">admin</option>
                              <option value="editor">editor</option>
                              <option value="reporter">reporter</option>
                              <option value="assinante">assinante</option>
                            </select>
                            <select
                              value={u.subscriptionPlan}
                              onChange={async (e) => {
                                await fetch(`/api/admin/users/${u.id}`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${authToken}`,
                                  },
                                  body: JSON.stringify({ subscriptionPlan: e.target.value }),
                                });
                                loadDashboard(authToken!);
                              }}
                              className="px-2 py-1 border border-slate-300 bg-white"
                            >
                              <option value="free">free</option>
                              <option value="apoiador">apoiador</option>
                              <option value="premium">premium</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AUDIT LOGS */}
                <div className="bg-white border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-950 mb-3">
                    Registro de Atividades Administrativas
                  </h3>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {data.auditLogs.map((log) => (
                      <div key={log.id} className="py-2 flex flex-wrap justify-between gap-2">
                        <div>
                          <span className="font-mono font-semibold text-blue-900">{log.action}</span>
                          <span className="mx-2 text-slate-300">/</span>
                          <span className="text-slate-800">{log.details}</span>
                          <span className="ml-2 text-slate-500">({log.userEmail})</span>
                        </div>
                        <span className="font-mono tabular-nums text-slate-400">
                          {formatDateTimePtBR(log.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
