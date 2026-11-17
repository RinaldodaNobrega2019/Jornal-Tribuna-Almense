import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, Check, Copy, Lock, MessageSquare, Share2 } from 'lucide-react';
import { Article, Category, UserProfile } from '../types';
import { extractYoutubeId, formatDateTimePtBR, shareSocialUrl } from '../lib/format';
import { EditorialImage } from './EditorialImage';

interface ArticleDetailViewProps {
  slug: string;
  categories: Category[];
  authToken: string | null;
  currentUser: UserProfile | null;
  onBack: () => void;
  onNavigateCategory: (slug: string) => void;
  onOpenAdminLogin: () => void;
}

export function ArticleDetailView({
  slug,
  categories,
  authToken,
  currentUser,
  onBack,
  onNavigateCategory,
  onOpenAdminLogin,
}: ArticleDetailViewProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [commentName, setCommentName] = useState(currentUser?.name || '');
  const [commentEmail, setCommentEmail] = useState(currentUser?.email || '');
  const [commentText, setCommentText] = useState('');
  const [commentStatus, setCommentStatus] = useState<{ ok?: string; err?: string }>({});
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetch(`/api/articles/${encodeURIComponent(slug)}`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Matéria não encontrada.');
        return res.json();
      })
      .then((data) => {
        if (active) setArticle(data);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Erro ao carregar notícia.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug, authToken]);

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/?noticia=${encodeURIComponent(slug)}`;
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleSubmitComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!article) return;
    setSubmittingComment(true);
    setCommentStatus({});
    try {
      const res = await fetch(`/api/articles/${article.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: commentName,
          authorEmail: commentEmail,
          content: commentText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar comentário.');
      setCommentText('');
      setCommentStatus({ ok: data.message });
    } catch (err: any) {
      setCommentStatus({ err: err.message });
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="h-6 w-32 bg-slate-100 mb-6" />
        <div className="h-12 w-full bg-slate-100 mb-4" />
        <div className="h-96 w-full bg-slate-100" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-3">Publicação indisponível</h2>
        <p className="text-slate-600 mb-6">{error || 'Não foi possível localizar esta notícia.'}</p>
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 bg-blue-900 text-white text-sm font-medium hover:bg-blue-800 cursor-pointer"
        >
          Voltar à página inicial
        </button>
      </div>
    );
  }

  const categoryName =
    categories.find((c) => c.slug === article.categorySlug)?.name || article.categorySlug;
  const shareUrl = `${window.location.origin}/?noticia=${encodeURIComponent(article.slug)}`;
  const ytId = extractYoutubeId(article.videoUrl || '');
  const paragraphs = article.content.split(/\n+/).filter((p) => p.trim().length > 0);

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-900 hover:text-blue-700 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para a capa
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <button
            type="button"
            onClick={() => onNavigateCategory(article.categorySlug)}
            className="font-semibold text-blue-900 hover:underline cursor-pointer"
          >
            {categoryName}
          </button>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{formatDateTimePtBR(article.publishedAt)}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{article.views} leituras</span>
        </div>
      </div>

      <header className="mb-8">
        {article.isBreaking && (
          <p className="text-xs font-bold tracking-wider text-red-700 uppercase mb-2">
            Plantão Urgente · Atualização em Almas e Região
          </p>
        )}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-950 leading-tight mb-4">
          {article.title}
        </h1>
        {article.subtitle && (
          <p className="text-lg sm:text-xl text-slate-600 leading-relaxed mb-5">
            {article.subtitle}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <div className="text-sm text-slate-700">
            Por <span className="font-semibold text-slate-950">{article.authorName}</span>
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-slate-500">Jornal Tribuna Almense</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 inline-flex items-center gap-1 mr-1">
              <Share2 className="w-3.5 h-3.5" /> Compartilhar:
            </span>
            <a
              href={shareSocialUrl('whatsapp', article.title, shareUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-700 hover:border-blue-900 hover:text-blue-900 transition-colors"
            >
              WhatsApp
            </a>
            <a
              href={shareSocialUrl('facebook', article.title, shareUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-700 hover:border-blue-900 hover:text-blue-900 transition-colors"
            >
              Facebook
            </a>
            <a
              href={shareSocialUrl('x', article.title, shareUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-700 hover:border-blue-900 hover:text-blue-900 transition-colors"
            >
              X
            </a>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-700 hover:border-blue-900 hover:text-blue-900 inline-flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado' : 'Link'}
            </button>
          </div>
        </div>
      </header>

      {article.coverImage && (
        <figure className="mb-8">
          <div className="aspect-video w-full overflow-hidden bg-slate-100 border border-slate-200">
            <EditorialImage src={article.coverImage} alt={article.title} />
          </div>
          <figcaption className="text-xs text-slate-500 mt-2 italic">
            Registro editorial — Jornal Tribuna Almense / {categoryName}
          </figcaption>
        </figure>
      )}

      {article.audioUrl && (
        <div className="mb-8 p-4 bg-slate-50 border border-slate-200">
          <p className="text-xs font-semibold text-blue-900 mb-2">Áudio da reportagem</p>
          <audio controls src={article.audioUrl} className="w-full" />
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-5 text-base sm:text-lg leading-relaxed text-slate-800">
        {paragraphs.map((p, idx) => (
          <p
            key={idx}
            className={
              idx === 0
                ? 'first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:text-blue-950 first-letter:float-left first-letter:mr-3 first-letter:leading-none'
                : ''
            }
          >
            {p}
          </p>
        ))}

        {article.lockedForSubscribers && (
          <div className="my-8 p-6 bg-slate-50 border border-slate-200 text-center">
            <Lock className="w-6 h-6 text-blue-900 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-slate-950 mb-2">
              Conteúdo Exclusivo para Assinantes e Apoiadores
            </h3>
            <p className="text-sm text-slate-600 mb-5 max-w-md mx-auto">
              Esta reportagem especial integra o acervo de assinaturas do Jornal Tribuna Almense.
              Entre com sua conta de assinante ou fale com nossa redação.
            </p>
            <button
              type="button"
              onClick={onOpenAdminLogin}
              className="px-5 py-2.5 bg-blue-900 text-white text-sm font-medium hover:bg-blue-800 cursor-pointer"
            >
              Entrar como Assinante
            </button>
          </div>
        )}
      </div>

      {ytId && (
        <div className="max-w-3xl mx-auto my-10">
          <h3 className="text-lg font-bold text-slate-950 mb-3">Vídeo relacionado</h3>
          <div className="aspect-video w-full bg-slate-950 border border-slate-200">
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${ytId}`}
              title={article.title}
              allowFullScreen
            />
          </div>
        </div>
      )}

      {!ytId && article.videoUrl && (
        <div className="max-w-3xl mx-auto my-10">
          <h3 className="text-lg font-bold text-slate-950 mb-3">Vídeo da reportagem</h3>
          <video controls src={article.videoUrl} className="w-full bg-black border border-slate-200" />
        </div>
      )}

      {Array.isArray(article.gallery) && article.gallery.length > 0 && (
        <section className="my-10 pt-8 border-t border-slate-200">
          <h3 className="text-xl font-bold text-slate-950 mb-4">Galeria de Fotografias</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {article.gallery.map((imgUrl, i) => (
              <div key={i} className="aspect-[4/3] overflow-hidden border border-slate-200 bg-slate-100">
                <EditorialImage src={imgUrl} alt={`${article.title} - foto ${i + 1}`} />
              </div>
            ))}
          </div>
        </section>
      )}

      {article.allowComments && (
        <section className="my-12 pt-8 border-t border-slate-200 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="w-5 h-5 text-blue-900" />
            <h3 className="text-2xl font-bold text-slate-950">
              Comentários dos Leitores ({article.comments?.length || 0})
            </h3>
          </div>

          {article.comments && article.comments.length > 0 ? (
            <div className="space-y-4 mb-8">
              {article.comments.map((c) => (
                <div key={c.id} className="p-4 bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-slate-900">{c.authorName}</span>
                    <span className="text-xs font-mono tabular-nums text-slate-500">
                      {formatDateTimePtBR(c.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{c.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 mb-8">
              Nenhum comentário publicado ainda. Seja o primeiro a participar da discussão.
            </p>
          )}

          <form onSubmit={handleSubmitComment} className="p-5 bg-white border border-slate-200 space-y-4">
            <h4 className="text-base font-semibold text-slate-900">Deixe seu comentário</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={commentName}
                  onChange={(e) => setCommentName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 focus:outline-none focus:border-blue-900"
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={commentEmail}
                  onChange={(e) => setCommentEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 focus:outline-none focus:border-blue-900"
                  placeholder="seu@email.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Comentário</label>
              <textarea
                rows={3}
                required
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 focus:outline-none focus:border-blue-900"
                placeholder="Escreva sua opinião com respeito..."
              />
            </div>

            {commentStatus.ok && (
              <p className="text-sm text-emerald-700 font-medium">{commentStatus.ok}</p>
            )}
            {commentStatus.err && (
              <p className="text-sm text-red-700 font-medium">{commentStatus.err}</p>
            )}

            <button
              type="submit"
              disabled={submittingComment}
              className="px-5 py-2.5 bg-blue-900 text-white text-sm font-medium hover:bg-blue-800 disabled:opacity-60 cursor-pointer"
            >
              {submittingComment ? 'Enviando...' : 'Enviar comentário'}
            </button>
          </form>
        </section>
      )}
    </article>
  );
}
