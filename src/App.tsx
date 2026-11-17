import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Headphones,
  Lock,
  Menu,
  MessageCircle,
  Music2,
  Pause,
  Play,
  Search,
  Video as VideoIcon,
  X,
} from 'lucide-react';
import { ArticleDetailView } from './components/ArticleDetailView';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { AdminPanel } from './components/AdminPanel';
import { EditorialImage } from './components/EditorialImage';
import { ContactPage, InstitutionalPage } from './components/InstitutionalViews';
import { MusicPage, PodcastPage, VideosPage } from './components/MultimediaViews';
import { buildWhatsAppLink, formatDatePtBR } from './lib/format';
import {
  AdBanner,
  Article,
  AudioTrack,
  PortalBootstrap,
  PortalPage,
  UserProfile,
} from './types';

const MAIN_MENU: Array<{ label: string; page: PortalPage; matchKey: string }> = [
  { label: 'HOME', page: { type: 'home' }, matchKey: 'home' },
  { label: 'ALMAS', page: { type: 'category', slug: 'almas' }, matchKey: 'cat:almas' },
  { label: 'CIDADES', page: { type: 'category', slug: 'cidades' }, matchKey: 'cat:cidades' },
  { label: 'ESTADO', page: { type: 'category', slug: 'estado' }, matchKey: 'cat:estado' },
  { label: 'JUSTIÇA', page: { type: 'category', slug: 'justica' }, matchKey: 'cat:justica' },
  { label: 'ESPORTE', page: { type: 'category', slug: 'esporte' }, matchKey: 'cat:esporte' },
  { label: 'PODCAST', page: { type: 'podcast' }, matchKey: 'podcast' },
  { label: 'VÍDEOS', page: { type: 'videos' }, matchKey: 'videos' },
  { label: 'MÚSICAS LOCAIS', page: { type: 'music' }, matchKey: 'music' },
  { label: 'CULTURA', page: { type: 'category', slug: 'cultura' }, matchKey: 'cat:cultura' },
  { label: 'CONTATO', page: { type: 'contact' }, matchKey: 'contact' },
];

function parseInitialPageFromUrl(): PortalPage {
  const params = new URLSearchParams(window.location.search);
  const noticia = params.get('noticia');
  if (noticia) return { type: 'article', slug: noticia };
  const secao = params.get('secao');
  if (secao) return { type: 'category', slug: secao };
  const pagina = params.get('pagina');
  if (pagina === 'podcast') return { type: 'podcast' };
  if (pagina === 'videos') return { type: 'videos' };
  if (pagina === 'musicas') return { type: 'music' };
  if (pagina === 'contato') return { type: 'contact' };
  if (pagina === 'admin') return { type: 'admin' };
  if (
    pagina === 'about' ||
    pagina === 'expediente' ||
    pagina === 'privacy' ||
    pagina === 'editorial' ||
    pagina === 'terms' ||
    pagina === 'advertise'
  ) {
    return { type: 'institutional', pageKey: pagina };
  }
  return { type: 'home' };
}

function getPageUrl(page: PortalPage): string {
  switch (page.type) {
    case 'home':
      return '/';
    case 'article':
      return `/?noticia=${encodeURIComponent(page.slug)}`;
    case 'category':
      return `/?secao=${encodeURIComponent(page.slug)}`;
    case 'podcast':
      return '/?pagina=podcast';
    case 'videos':
      return '/?pagina=videos';
    case 'music':
      return '/?pagina=musicas';
    case 'contact':
      return '/?pagina=contato';
    case 'institutional':
      return `/?pagina=${page.pageKey}`;
    case 'search':
      return `/?busca=${encodeURIComponent(page.query)}`;
    case 'admin':
      return '/?pagina=admin';
  }
}

function getActiveMenuKey(page: PortalPage): string {
  if (page.type === 'home') return 'home';
  if (page.type === 'category') return `cat:${page.slug}`;
  if (page.type === 'podcast') return 'podcast';
  if (page.type === 'videos') return 'videos';
  if (page.type === 'music') return 'music';
  if (page.type === 'contact') return 'contact';
  return '';
}

export default function App() {
  const [bootstrap, setBootstrap] = useState<PortalBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState<PortalPage>(() => parseInitialPageFromUrl());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  // In-memory auth session
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Integrated Audio Player
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const loadBootstrap = useCallback(async () => {
    try {
      setLoadError('');
      const res = await fetch('/api/portal-bootstrap');
      if (!res.ok) throw new Error('Falha ao carregar o portal.');
      const data: PortalBootstrap = await res.json();
      setBootstrap(data);
    } catch (err: any) {
      setLoadError(err.message || 'Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBootstrap();
    const interval = setInterval(loadBootstrap, 60_000); // Auto-refresh breaking/latest feed every minute
    return () => clearInterval(interval);
  }, [loadBootstrap]);

  useEffect(() => {
    const onPopState = () => {
      setPage(parseInitialPageFromUrl());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((nextPage: PortalPage) => {
    setPage(nextPage);
    setMobileMenuOpen(false);
    const nextUrl = getPageUrl(nextPage);
    window.history.pushState({}, '', nextUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const settings = bootstrap?.settings || {};
  const portalName = settings.portal_name || 'JORNAL TRIBUNA ALMENSE';
  const slogan = settings.slogan || 'Almas noticiada para todos.';
  const whatsapp = settings.whatsapp || '63 99101-4872';
  const email = settings.email || 'jornalistarinaldodanobrega@gmail.com';
  const logoUrl = settings.logo_url || '';

  useEffect(() => {
    if (page.type === 'home') {
      document.title = `${portalName} — ${slogan}`;
    } else if (page.type === 'category') {
      document.title = `${page.slug.toUpperCase()} — ${portalName}`;
    } else if (page.type === 'podcast') {
      document.title = `Podcast — ${portalName}`;
    } else if (page.type === 'videos') {
      document.title = `Vídeos — ${portalName}`;
    } else if (page.type === 'music') {
      document.title = `Músicas Locais — ${portalName}`;
    } else if (page.type === 'contact') {
      document.title = `Contato — ${portalName}`;
    } else if (page.type === 'admin') {
      document.title = `Painel Administrativo — ${portalName}`;
    }
  }, [page, portalName, slogan]);

  const handlePlayTrack = (track: AudioTrack, songId?: number) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying((prev) => !prev);
      return;
    }
    setCurrentTrack(track);
    setIsPlaying(true);
    if (songId) {
      fetch(`/api/songs/${songId}/play`, { method: 'POST' }).catch(() => {});
    }
  };

  const handleAdClick = (ad: AdBanner) => {
    fetch(`/api/ads/${ad.id}/click`, { method: 'POST' }).catch(() => {});
    if (!ad.targetUrl || ad.targetUrl === '#anuncie') {
      navigate({ type: 'institutional', pageKey: 'advertise' });
    }
  };

  const renderAdBox = (ad: AdBanner, variant: 'header' | 'sidebar' | 'in_feed') => {
    const isExternal = ad.targetUrl && ad.targetUrl.startsWith('http');
    const content = (
      <div
        className={`border border-slate-200 bg-slate-50 hover:border-blue-900 transition-colors ${
          variant === 'header'
            ? 'px-4 py-2.5 flex flex-wrap items-center justify-between gap-3'
            : variant === 'in_feed'
            ? 'p-5 flex flex-col sm:flex-row items-center justify-between gap-4'
            : 'p-4 space-y-2'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {ad.imageUrl && (
            <img
              src={ad.imageUrl}
              alt={ad.title}
              referrerPolicy="no-referrer"
              className={
                variant === 'header'
                  ? 'h-10 w-20 object-cover border border-slate-200 shrink-0'
                  : 'h-16 w-28 object-cover border border-slate-200 shrink-0'
              }
            />
          )}
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Publicidade · {ad.advertiserName}
            </div>
            <div className="text-sm font-bold text-slate-900 truncate">{ad.title}</div>
            {ad.description && variant !== 'header' && (
              <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{ad.description}</p>
            )}
          </div>
        </div>
        <span className="text-xs font-semibold text-blue-900 whitespace-nowrap shrink-0">
          Saiba mais →
        </span>
      </div>
    );

    if (isExternal) {
      return (
        <a
          key={ad.id}
          href={ad.targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleAdClick(ad)}
          className="block"
        >
          {content}
        </a>
      );
    }

    return (
      <button
        key={ad.id}
        type="button"
        onClick={() => handleAdClick(ad)}
        className="block w-full text-left cursor-pointer"
      >
        {content}
      </button>
    );
  };

  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }, []);

  const allArticles = bootstrap?.articles || [];
  const categories = bootstrap?.categories || [];
  const categoryNameMap = useMemo(
    () => new Map(categories.map((c) => [c.slug, c.name])),
    [categories]
  );

  const featuredArticle =
    allArticles.find((a) => a.isFeatured) || allArticles[0] || null;
  const breakingArticles = allArticles.filter((a) => a.isBreaking);
  const tickerList = breakingArticles.length > 0 ? breakingArticles : allArticles.slice(0, 6);

  const latestNews = allArticles
    .filter((a) => a.id !== featuredArticle?.id)
    .slice(0, 5);
  const almasNews = allArticles.filter((a) => a.categorySlug === 'almas').slice(0, 3);
  const tocantinsNews = allArticles
    .filter((a) => ['cidades', 'estado', 'justica'].includes(a.categorySlug))
    .slice(0, 4);
  const sportAndNationalNews = allArticles
    .filter((a) => ['esporte', 'brasil'].includes(a.categorySlug))
    .slice(0, 4);
  const cultureNews = allArticles.filter((a) => a.categorySlug === 'cultura').slice(0, 3);

  const headerAd = bootstrap?.ads.find((a) => a.placement === 'header');
  const sidebarAd = bootstrap?.ads.find((a) => a.placement === 'sidebar');
  const inFeedAd = bootstrap?.ads.find((a) => a.placement === 'in_feed');

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    navigate({ type: 'search', query: searchInput.trim() });
    setSearchOpen(false);
  };

  const activeMenuKey = getActiveMenuKey(page);

  const renderArticleCard = (article: Article, compact = false) => {
    const catName = categoryNameMap.get(article.categorySlug) || article.categorySlug;
    return (
      <article
        key={article.id}
        className="group bg-white border border-slate-200 hover:border-blue-900 transition-colors flex flex-col"
      >
        <button
          type="button"
          onClick={() => navigate({ type: 'article', slug: article.slug })}
          className="text-left flex-1 flex flex-col cursor-pointer"
        >
          {!compact && (
            <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 border-b border-slate-200">
              <EditorialImage
                src={article.coverImage}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
            </div>
          )}
          <div className="p-4 flex-1 flex flex-col justify-between gap-2.5">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mb-1.5">
                {article.isBreaking && (
                  <>
                    <span className="font-bold text-red-700 uppercase">Urgente</span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <span className="font-semibold text-blue-900">{catName}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{formatDatePtBR(article.publishedAt)}</span>
                {article.isSubscriberOnly && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-0.5 text-blue-950 font-medium">
                      <Lock className="w-3 h-3" /> Assinantes
                    </span>
                  </>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-950 leading-snug group-hover:text-blue-900 transition-colors mb-1.5">
                {article.title}
              </h3>
              {!compact && (
                <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                  {article.summary}
                </p>
              )}
            </div>
            <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
              Por {article.authorName}
            </div>
          </div>
        </button>
      </article>
    );
  };

  return (
    <div className={`min-h-screen flex flex-col bg-white text-slate-900 ${currentTrack ? 'pb-20' : ''}`}>
      {/* Institutional Utility Strip */}
      <div className="bg-blue-950 text-blue-100 text-xs border-b border-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="capitalize">{todayFormatted}</span>
            <span className="text-blue-400" aria-hidden="true">|</span>
            <span className="hidden sm:inline">Almas, Tocantins · Serras Gerais</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={buildWhatsAppLink(whatsapp, 'Olá! Gostaria de falar com o Jornal Tribuna Almense.')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-white transition-colors whitespace-nowrap"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp {whatsapp}
            </a>
            <button
              type="button"
              onClick={() => navigate({ type: 'admin' })}
              className="font-semibold text-white hover:underline whitespace-nowrap cursor-pointer"
            >
              {currentUser ? `Redação (${currentUser.name.split(' ')[0]})` : 'Painel da Redação'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Masthead */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate({ type: 'home' })}
            className="flex items-center gap-3.5 text-left cursor-pointer min-w-0"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 border border-slate-200 bg-white overflow-hidden p-0.5">
              <EditorialImage
                src={logoUrl}
                alt="Logomarca Oficial Jornal Tribuna Almense"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-serif tracking-tight text-blue-950 truncate">
                {portalName}
              </div>
              <div className="text-xs sm:text-sm text-slate-600 truncate">{slogan}</div>
            </div>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            {searchOpen ? (
              <form onSubmit={handleSearchSubmit} className="flex items-center border border-slate-300">
                <input
                  type="text"
                  autoFocus
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar notícias..."
                  className="px-3 py-1.5 text-xs sm:text-sm w-36 sm:w-56 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-900 text-white text-xs font-semibold cursor-pointer"
                >
                  Buscar
                </button>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="px-2 py-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                  aria-label="Fechar busca"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="p-2.5 border border-slate-200 text-slate-700 hover:border-blue-900 hover:text-blue-900 cursor-pointer"
                aria-label="Pesquisar notícias"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate({ type: 'institutional', pageKey: 'advertise' })}
              className="hidden sm:inline-flex px-4 py-2 bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 whitespace-nowrap cursor-pointer"
            >
              Anuncie Aqui
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden p-2.5 border border-slate-200 text-slate-800 cursor-pointer"
              aria-label="Abrir menu principal"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* 11-Item Main Editorial Navigation */}
        <nav
          aria-label="Menu Principal"
          className="hidden lg:block border-t border-slate-100 bg-slate-50/70"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 overflow-x-auto">
            {MAIN_MENU.map((item) => {
              const active = activeMenuKey === item.matchKey;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.page)}
                  className={`py-3 text-xs font-bold tracking-wide whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                    active
                      ? 'border-blue-900 text-blue-950'
                      : 'border-transparent text-slate-700 hover:text-blue-900 hover:border-blue-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <nav className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 grid grid-cols-2 gap-1.5">
            {MAIN_MENU.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.page)}
                className={`px-3 py-2.5 text-left text-xs font-bold border ${
                  activeMenuKey === item.matchKey
                    ? 'border-blue-900 bg-blue-50 text-blue-950'
                    : 'border-slate-100 text-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      {/* Auto-updating Breaking / Latest News Ticker */}
      {tickerList.length > 0 && page.type !== 'admin' && (
        <div className="bg-slate-100 border-b border-slate-200 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center">
            <span className="py-2 pr-4 text-[11px] font-extrabold uppercase tracking-wider text-red-700 whitespace-nowrap shrink-0 border-r border-slate-300">
              Últimas Notícias
            </span>
            <div className="flex-1 overflow-hidden pl-4">
              <div className="ticker-track gap-8 py-2">
                {[...tickerList, ...tickerList].map((item, idx) => (
                  <button
                    key={`${item.id}-${idx}`}
                    type="button"
                    onClick={() => navigate({ type: 'article', slug: item.slug })}
                    className="text-xs font-medium text-slate-800 hover:text-blue-900 whitespace-nowrap cursor-pointer inline-flex items-center gap-2"
                  >
                    <span className="font-semibold text-blue-900">
                      [{categoryNameMap.get(item.categorySlug) || item.categorySlug}]
                    </span>
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configurable Header Ad Banner */}
      {headerAd && page.type !== 'admin' && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4">
          {renderAdBox(headerAd, 'header')}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {loading ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-6">
            <div className="h-10 w-2/3 bg-slate-100" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 h-96 bg-slate-100" />
              <div className="lg:col-span-4 h-96 bg-slate-100" />
            </div>
          </div>
        ) : loadError ? (
          <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
            <h2 className="text-2xl font-bold text-slate-950">Não foi possível carregar o portal</h2>
            <p className="text-sm text-slate-600">{loadError}</p>
            <button
              type="button"
              onClick={loadBootstrap}
              className="px-5 py-2.5 bg-blue-900 text-white text-sm font-semibold cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        ) : page.type === 'admin' ? (
          <AdminPanel
            authToken={authToken}
            currentUser={currentUser}
            onAuthSuccess={(token, user) => {
              setAuthToken(token);
              setCurrentUser(user);
            }}
            onLogout={() => {
              setAuthToken(null);
              setCurrentUser(null);
            }}
            onPortalDataChanged={loadBootstrap}
            onBackToPortal={() => navigate({ type: 'home' })}
          />
        ) : page.type === 'article' ? (
          <ArticleDetailView
            slug={page.slug}
            categories={categories}
            authToken={authToken}
            currentUser={currentUser}
            onBack={() => navigate({ type: 'home' })}
            onNavigateCategory={(slug) => navigate({ type: 'category', slug })}
            onOpenAdminLogin={() => navigate({ type: 'admin' })}
          />
        ) : page.type === 'podcast' ? (
          <PodcastPage
            podcasts={bootstrap?.podcasts || []}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onPlayTrack={(track) => handlePlayTrack(track)}
          />
        ) : page.type === 'videos' ? (
          <VideosPage videos={bootstrap?.videos || []} />
        ) : page.type === 'music' ? (
          <MusicPage
            artists={bootstrap?.artists || []}
            songs={bootstrap?.songs || []}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onPlayTrack={(track, songId) => handlePlayTrack(track, songId)}
          />
        ) : page.type === 'contact' ? (
          <ContactPage settings={settings} />
        ) : page.type === 'institutional' ? (
          <InstitutionalPage
            pageKey={page.pageKey}
            settings={settings}
            onNavigateContact={() => navigate({ type: 'contact' })}
          />
        ) : page.type === 'category' || page.type === 'search' ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
            <div className="border-b border-slate-200 pb-6 mb-8">
              <p className="text-xs font-semibold tracking-wider text-blue-900 uppercase mb-2">
                {page.type === 'search' ? 'Pesquisa no Acervo' : 'Editoria Jornal Tribuna Almense'}
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-950">
                {page.type === 'search'
                  ? `Resultados para "${page.query}"`
                  : categoryNameMap.get(page.slug) || page.slug.toUpperCase()}
              </h1>
            </div>

            {(() => {
              const filtered =
                page.type === 'search'
                  ? allArticles.filter((a) => {
                      const q = page.query.toLowerCase();
                      return (
                        a.title.toLowerCase().includes(q) ||
                        a.summary.toLowerCase().includes(q) ||
                        (a.subtitle || '').toLowerCase().includes(q)
                      );
                    })
                  : allArticles.filter((a) => a.categorySlug === page.slug);

              if (filtered.length === 0) {
                return (
                  <div className="py-12 text-center border border-slate-200 bg-slate-50">
                    <p className="text-slate-600 mb-4">Nenhuma publicação encontrada nesta seção.</p>
                    <button
                      type="button"
                      onClick={() => navigate({ type: 'home' })}
                      className="px-4 py-2 bg-blue-900 text-white text-xs font-semibold cursor-pointer"
                    >
                      Voltar à página inicial
                    </button>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtered.map((art) => renderArticleCard(art))}
                </div>
              );
            })()}
          </div>
        ) : (
          /* HOME PAGE */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-12">
            {/* HERO: Manchete Principal + Últimas + Mais Acessadas */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {featuredArticle && (
                <div className="lg:col-span-8 flex flex-col">
                  <button
                    type="button"
                    onClick={() => navigate({ type: 'article', slug: featuredArticle.slug })}
                    className="group text-left bg-white border border-slate-200 hover:border-blue-900 transition-colors flex-1 flex flex-col cursor-pointer"
                  >
                    <div className="aspect-video w-full overflow-hidden bg-slate-100 border-b border-slate-200">
                      <EditorialImage
                        src={featuredArticle.coverImage}
                        alt={featuredArticle.title}
                        className="w-full h-full object-cover group-hover:scale-[1.015] transition-transform duration-300"
                      />
                    </div>
                    <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2.5">
                          {featuredArticle.isBreaking && (
                            <>
                              <span className="font-bold text-red-700 uppercase">Urgente</span>
                              <span aria-hidden="true">·</span>
                            </>
                          )}
                          <span className="font-bold text-blue-900 uppercase">
                            Manchete ·{' '}
                            {categoryNameMap.get(featuredArticle.categorySlug) ||
                              featuredArticle.categorySlug}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {formatDatePtBR(featuredArticle.publishedAt)}
                          </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-950 leading-tight group-hover:text-blue-900 transition-colors mb-3">
                          {featuredArticle.title}
                        </h1>
                        <p className="text-base text-slate-600 leading-relaxed">
                          {featuredArticle.subtitle || featuredArticle.summary}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
                        <span className="text-slate-600">
                          Por <strong className="text-slate-900">{featuredArticle.authorName}</strong>
                        </span>
                        <span className="font-semibold text-blue-900 inline-flex items-center gap-1">
                          Ler reportagem completa <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* SIDE RAIL: Últimas Notícias + Mais Acessadas + Banner Lateral */}
              <aside className="lg:col-span-4 space-y-6 flex flex-col justify-between">
                <div className="bg-slate-50 border border-slate-200 p-5">
                  <h2 className="text-lg font-bold text-blue-950 pb-2.5 mb-3 border-b border-slate-200">
                    Últimas Notícias
                  </h2>
                  <div className="divide-y divide-slate-200">
                    {latestNews.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate({ type: 'article', slug: item.slug })}
                        className="w-full py-3 text-left group cursor-pointer block"
                      >
                        <div className="text-[11px] text-slate-500 mb-0.5">
                          <span className="font-semibold text-blue-900">
                            {categoryNameMap.get(item.categorySlug) || item.categorySlug}
                          </span>
                          <span className="mx-1.5">·</span>
                          <span className="font-mono tabular-nums">
                            {formatDatePtBR(item.publishedAt)}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-900 leading-snug">
                          {item.title}
                        </h3>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5">
                  <h2 className="text-lg font-bold text-blue-950 pb-2.5 mb-3 border-b border-slate-200">
                    Mais Acessadas
                  </h2>
                  <ol className="divide-y divide-slate-100">
                    {(bootstrap?.mostRead || []).slice(0, 5).map((item, idx) => (
                      <li key={item.id} className="py-2.5">
                        <button
                          type="button"
                          onClick={() => navigate({ type: 'article', slug: item.slug })}
                          className="w-full text-left flex items-start gap-3 group cursor-pointer"
                        >
                          <span className="text-lg font-bold font-mono tabular-nums text-blue-900/50 leading-none mt-0.5">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-900 leading-snug">
                              {item.title}
                            </h3>
                            <span className="text-[11px] font-mono tabular-nums text-slate-400">
                              {item.views} leituras
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>

                {sidebarAd && renderAdBox(sidebarAd, 'sidebar')}
              </aside>
            </section>

            {/* NOTÍCIAS DE ALMAS */}
            <section>
              <div className="flex items-end justify-between border-b-2 border-blue-900 pb-2.5 mb-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-950">Notícias de Almas</h2>
                  <p className="text-xs text-slate-500">
                    Acontecimentos locais, comunidade e serviços em Almas
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate({ type: 'category', slug: 'almas' })}
                  className="text-xs font-semibold text-blue-900 hover:underline whitespace-nowrap cursor-pointer"
                >
                  Ver todas de Almas →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {almasNews.map((a) => renderArticleCard(a))}
              </div>
            </section>

            {/* DESTAQUES DO TOCANTINS (Cidades, Estado & Justiça) */}
            <section>
              <div className="flex items-end justify-between border-b-2 border-blue-900 pb-2.5 mb-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-950">
                    Destaques do Tocantins & Justiça
                  </h2>
                  <p className="text-xs text-slate-500">
                    Cidades das Serras Gerais, gestão estadual e decisões judiciais
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate({ type: 'category', slug: 'estado' })}
                  className="text-xs font-semibold text-blue-900 hover:underline whitespace-nowrap cursor-pointer"
                >
                  Ver Tocantins →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {tocantinsNews.map((a) => renderArticleCard(a))}
              </div>
            </section>

            {/* IN-FEED ADVERTISING */}
            {inFeedAd && <div>{renderAdBox(inFeedAd, 'in_feed')}</div>}

            {/* ESPORTE & NOTÍCIAS NACIONAIS */}
            <section>
              <div className="flex items-end justify-between border-b-2 border-slate-800 pb-2.5 mb-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-950">
                    Esporte & Notícias Nacionais
                  </h2>
                  <p className="text-xs text-slate-500">
                    Cobertura esportiva regional e acontecimentos do Brasil e do mundo
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold text-blue-900">
                  <button
                    type="button"
                    onClick={() => navigate({ type: 'category', slug: 'esporte' })}
                    className="hover:underline cursor-pointer"
                  >
                    Esporte
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate({ type: 'category', slug: 'brasil' })}
                    className="hover:underline cursor-pointer"
                  >
                    Brasil e Mundo
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {sportAndNationalNews.map((a) => renderArticleCard(a))}
              </div>
            </section>

            {/* MULTIMÍDIA: VÍDEOS, PODCAST E MÚSICAS LOCAIS */}
            <section className="bg-slate-50 border border-slate-200 p-6 sm:p-8 space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Vídeos Recentes */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-950 inline-flex items-center gap-2">
                      <VideoIcon className="w-5 h-5 text-blue-900" />
                      Vídeos Recentes
                    </h2>
                    <button
                      type="button"
                      onClick={() => navigate({ type: 'videos' })}
                      className="text-xs font-semibold text-blue-900 hover:underline cursor-pointer"
                    >
                      Abrir TV Tribuna →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(bootstrap?.videos || []).slice(0, 2).map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => navigate({ type: 'videos' })}
                        className="group text-left bg-white border border-slate-200 hover:border-blue-900 transition-colors cursor-pointer"
                      >
                        <div className="relative aspect-video overflow-hidden bg-slate-100">
                          <EditorialImage src={v.thumbnailUrl} alt={v.title} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent flex items-center justify-center">
                            <span className="w-10 h-10 bg-blue-900/90 text-white flex items-center justify-center">
                              <Play className="w-4 h-4 ml-0.5" />
                            </span>
                          </div>
                        </div>
                        <div className="p-3.5">
                          <div className="text-[11px] text-blue-900 font-semibold mb-1">
                            {v.category} · {v.aspectRatio}
                          </div>
                          <h3 className="text-sm font-bold text-slate-950 line-clamp-2 group-hover:text-blue-900">
                            {v.title}
                          </h3>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Podcast Tribuna Almense */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-950 inline-flex items-center gap-2">
                      <Headphones className="w-5 h-5 text-blue-900" />
                      Podcasts
                    </h2>
                    <button
                      type="button"
                      onClick={() => navigate({ type: 'podcast' })}
                      className="text-xs font-semibold text-blue-900 hover:underline cursor-pointer"
                    >
                      Todos os episódios →
                    </button>
                  </div>
                  <div className="space-y-3">
                    {(bootstrap?.podcasts || []).slice(0, 2).map((ep) => {
                      const trackId = `podcast-${ep.id}`;
                      const active = currentTrack?.id === trackId && isPlaying;
                      return (
                        <div
                          key={ep.id}
                          className="bg-white border border-slate-200 p-3.5 flex items-center gap-3.5"
                        >
                          <div className="w-16 h-16 shrink-0 border border-slate-200 overflow-hidden">
                            <EditorialImage src={ep.coverImage} alt={ep.title} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-semibold text-blue-900">
                              Ep. {String(ep.episodeNumber).padStart(2, '0')} · {ep.duration}
                            </div>
                            <h3 className="text-sm font-bold text-slate-950 line-clamp-2">
                              {ep.title}
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handlePlayTrack({
                                id: trackId,
                                kind: 'podcast',
                                title: `Ep. ${ep.episodeNumber} — ${ep.title}`,
                                subtitle: ep.guestName || 'Podcast Tribuna Almense',
                                audioUrl: ep.audioUrl,
                                coverImage: ep.coverImage,
                              })
                            }
                            className="w-10 h-10 shrink-0 bg-blue-900 text-white flex items-center justify-center hover:bg-blue-800 cursor-pointer"
                            aria-label={`Reproduzir ${ep.title}`}
                          >
                            {active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Músicas Locais */}
              <div className="pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between pb-3 mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-950 inline-flex items-center gap-2">
                      <Music2 className="w-5 h-5 text-blue-900" />
                      Músicas Locais — Talentos de Almas e Serras Gerais
                    </h2>
                    <p className="text-xs text-slate-600">
                      Obras autorizadas pelos artistas e compositores da região
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate({ type: 'music' })}
                    className="text-xs font-semibold text-blue-900 hover:underline whitespace-nowrap cursor-pointer"
                  >
                    Ouvir todas →
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(bootstrap?.songs || []).slice(0, 3).map((song) => {
                    const trackId = `song-${song.id}`;
                    const active = currentTrack?.id === trackId && isPlaying;
                    return (
                      <div
                        key={song.id}
                        className="bg-white border border-slate-200 p-3.5 flex items-center gap-3"
                      >
                        <div className="w-14 h-14 shrink-0 border border-slate-200 overflow-hidden">
                          <EditorialImage src={song.coverImage} alt={song.title} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold text-blue-900 truncate">
                            {song.artist?.name || 'Artista Local'}
                          </div>
                          <h3 className="text-sm font-bold text-slate-950 truncate">{song.title}</h3>
                          <div className="text-[11px] text-slate-500">{song.genre}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handlePlayTrack(
                              {
                                id: trackId,
                                kind: 'music',
                                title: song.title,
                                subtitle: `${song.artist?.name || 'Artista'} · ${song.genre}`,
                                audioUrl: song.audioUrl,
                                coverImage: song.coverImage,
                              },
                              song.id
                            )
                          }
                          className="w-9 h-9 shrink-0 bg-blue-900 text-white flex items-center justify-center hover:bg-blue-800 cursor-pointer"
                          aria-label={`Tocar ${song.title}`}
                        >
                          {active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* CULTURA E EVENTOS */}
            <section>
              <div className="flex items-end justify-between border-b-2 border-blue-900 pb-2.5 mb-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-950">Cultura e Eventos</h2>
                  <p className="text-xs text-slate-500">
                    Festejos tradicionais, literatura, artesanato e agenda cultural
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate({ type: 'category', slug: 'cultura' })}
                  className="text-xs font-semibold text-blue-900 hover:underline whitespace-nowrap cursor-pointer"
                >
                  Ver Cultura →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cultureNews.map((a) => renderArticleCard(a))}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Institutional Footer */}
      <footer className="bg-blue-950 text-slate-200 border-t border-blue-900 mt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 bg-white p-1 shrink-0 overflow-hidden">
                <EditorialImage
                  src={logoUrl}
                  alt="Logomarca Jornal Tribuna Almense"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="text-xl font-bold font-serif text-white">{portalName}</div>
                <div className="text-xs text-blue-200">{slogan}</div>
              </div>
            </div>
            <p className="text-xs text-blue-100/80 leading-relaxed max-w-md">
              Veículo de comunicação digital independente dedicado a Almas, região das Serras
              Gerais, Tocantins, Brasil e mundo.
            </p>
            <div className="text-xs text-blue-100 space-y-1">
              <p>
                <strong className="text-white">Autor e Responsável Editorial:</strong>{' '}
                {settings.editor_chief || 'Rinaldo da Nóbrega — Escritor e Jornalista'}
              </p>
              <p>
                <strong className="text-white">E-mail:</strong>{' '}
                <a href={`mailto:${email}`} className="underline hover:text-white">
                  {email}
                </a>
              </p>
              <p>
                <strong className="text-white">WhatsApp:</strong>{' '}
                <a
                  href={buildWhatsAppLink(whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-white font-mono"
                >
                  {whatsapp}
                </a>
              </p>
            </div>
          </div>

          <div className="md:col-span-3 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-200">Editorias</h3>
            <ul className="space-y-1.5 text-xs">
              {MAIN_MENU.slice(0, 10).map((m) => (
                <li key={m.label}>
                  <button
                    type="button"
                    onClick={() => navigate(m.page)}
                    className="text-blue-100/90 hover:text-white hover:underline cursor-pointer"
                  >
                    {m.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4 space-y-5">
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-200">
                Institucional
              </h3>
              <ul className="grid grid-cols-2 gap-1.5 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={() => navigate({ type: 'institutional', pageKey: 'about' })}
                    className="hover:text-white hover:underline cursor-pointer"
                  >
                    Sobre o Jornal
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate({ type: 'institutional', pageKey: 'expediente' })}
                    className="hover:text-white hover:underline cursor-pointer"
                  >
                    Expediente
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate({ type: 'institutional', pageKey: 'privacy' })}
                    className="hover:text-white hover:underline cursor-pointer"
                  >
                    Política de Privacidade
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate({ type: 'institutional', pageKey: 'editorial' })}
                    className="hover:text-white hover:underline cursor-pointer"
                  >
                    Política Editorial
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate({ type: 'institutional', pageKey: 'terms' })}
                    className="hover:text-white hover:underline cursor-pointer"
                  >
                    Termos de Uso
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate({ type: 'institutional', pageKey: 'advertise' })}
                    className="hover:text-white hover:underline cursor-pointer"
                  >
                    Anuncie no Jornal
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate({ type: 'contact' })}
                    className="hover:text-white hover:underline cursor-pointer"
                  >
                    Contato
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate({ type: 'admin' })}
                    className="hover:text-white hover:underline cursor-pointer"
                  >
                    Painel Administrativo
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-200">
                Redes Sociais
              </h3>
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { label: 'Facebook', url: settings.facebook_url },
                  { label: 'Instagram', url: settings.instagram_url },
                  { label: 'YouTube', url: settings.youtube_url },
                  { label: 'TikTok', url: settings.tiktok_url },
                  { label: 'WhatsApp', url: buildWhatsAppLink(whatsapp) },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 border border-blue-800 text-blue-100 hover:bg-blue-900 hover:text-white transition-colors"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-blue-900 py-4 px-4 sm:px-6 text-center text-xs text-blue-300">
          © {new Date().getFullYear()} {portalName} · {slogan} · Almas, Tocantins.
        </div>
      </footer>

      {/* Persistent Global Audio Player */}
      <AudioPlayerBar
        track={currentTrack}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        onClose={() => {
          setIsPlaying(false);
          setCurrentTrack(null);
        }}
      />
    </div>
  );
}
