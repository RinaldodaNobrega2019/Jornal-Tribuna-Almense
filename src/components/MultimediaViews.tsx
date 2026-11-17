import { useState } from 'react';
import { Headphones, Music2, Pause, Play, ShieldCheck, Share2, Video as VideoIcon } from 'lucide-react';
import { Artist, AudioTrack, PodcastEpisode, SongItem, VideoItem } from '../types';
import { extractYoutubeId, formatDatePtBR, shareSocialUrl } from '../lib/format';
import { EditorialImage } from './EditorialImage';

interface PodcastPageProps {
  podcasts: PodcastEpisode[];
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  onPlayTrack: (track: AudioTrack) => void;
}

export function PodcastPage({
  podcasts,
  currentTrack,
  isPlaying,
  onPlayTrack,
}: PodcastPageProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="border-b border-slate-200 pb-6 mb-8">
        <p className="text-xs font-semibold tracking-wider text-blue-900 uppercase mb-2">
          Áudio & Entrevistas
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-950 mb-2">
          Podcast Jornal Tribuna Almense
        </h1>
        <p className="text-base text-slate-600 max-w-2xl">
          Entrevistas, análises políticas, memória cultural e os principais assuntos de Almas e das
          Serras Gerais para ouvir diretamente no portal.
        </p>
      </div>

      {podcasts.length === 0 ? (
        <p className="text-slate-500 py-12 text-center">Nenhum episódio publicado até o momento.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {podcasts.map((ep) => {
            const trackId = `podcast-${ep.id}`;
            const active = currentTrack?.id === trackId && isPlaying;
            const ytId = extractYoutubeId(ep.videoUrl || '');
            const shareHref = shareSocialUrl(
              'whatsapp',
              `Podcast Ep. ${ep.episodeNumber}: ${ep.title}`,
              window.location.href
            );

            return (
              <article
                key={ep.id}
                className="bg-white border border-slate-200 p-5 flex flex-col gap-4"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-36 h-36 shrink-0 bg-slate-100 border border-slate-200 overflow-hidden">
                    <EditorialImage src={ep.coverImage} alt={ep.title} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                      <span className="font-semibold text-blue-900">
                        Episódio {String(ep.episodeNumber).padStart(2, '0')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{formatDatePtBR(ep.publishedAt)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{ep.duration || '24:00'}</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-950 leading-snug mb-2">
                      {ep.title}
                    </h2>
                    {ep.guestName && (
                      <p className="text-xs text-slate-600 mb-2">
                        Convidado / Apresentação: <span className="font-medium">{ep.guestName}</span>
                      </p>
                    )}
                    <p className="text-sm text-slate-600 leading-relaxed">{ep.description}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() =>
                      onPlayTrack({
                        id: trackId,
                        kind: 'podcast',
                        title: `Ep. ${ep.episodeNumber} — ${ep.title}`,
                        subtitle: ep.guestName || 'Podcast Tribuna Almense',
                        audioUrl: ep.audioUrl,
                        coverImage: ep.coverImage,
                      })
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 transition-colors cursor-pointer"
                  >
                    {active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {active ? 'Pausar episódio' : 'Ouvir episódio'}
                  </button>

                  <a
                    href={shareHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-xs font-medium text-slate-700 hover:border-blue-900 hover:text-blue-900"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Compartilhar
                  </a>
                </div>

                {ytId && (
                  <div className="pt-2">
                    <p className="text-xs font-medium text-slate-600 mb-2">Vídeo da entrevista</p>
                    <div className="aspect-video w-full bg-black border border-slate-200">
                      <iframe
                        className="w-full h-full"
                        src={`https://www.youtube.com/embed/${ytId}`}
                        title={ep.title}
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface VideosPageProps {
  videos: VideoItem[];
}

export function VideosPage({ videos }: VideosPageProps) {
  const categories = ['Todos', ...Array.from(new Set(videos.map((v) => v.category)))];
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);

  const filtered =
    selectedCategory === 'Todos'
      ? videos
      : videos.filter((v) => v.category === selectedCategory);

  const widescreenVideos = filtered.filter((v) => v.aspectRatio !== '9:16');
  const verticalVideos = filtered.filter((v) => v.aspectRatio === '9:16');

  const handleWatch = (video: VideoItem) => {
    setActiveVideo(video);
    fetch(`/api/videos/${video.id}/view`, { method: 'POST' }).catch(() => {});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6 mb-8">
        <div>
          <p className="text-xs font-semibold tracking-wider text-blue-900 uppercase mb-2">
            TV Tribuna Almense
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-950 mb-2">
            Vídeos Jornalísticos e Boletins
          </h1>
          <p className="text-base text-slate-600 max-w-2xl">
            Reportagens especiais, coberturas de eventos e boletins verticais 9:16 direto de Almas e
            do Tocantins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-white text-blue-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {activeVideo && (
        <div className="mb-10 p-5 bg-slate-950 text-white border border-slate-800">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <span className="text-xs text-blue-300 font-medium">
                {activeVideo.category} · {activeVideo.aspectRatio}
              </span>
              <h2 className="text-xl font-bold text-white">{activeVideo.title}</h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveVideo(null)}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
            >
              Fechar player
            </button>
          </div>
          {extractYoutubeId(activeVideo.youtubeId || activeVideo.videoUrl) ? (
            <div
              className={`mx-auto bg-black ${
                activeVideo.aspectRatio === '9:16' ? 'max-w-xs aspect-[9/16]' : 'aspect-video w-full'
              }`}
            >
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${extractYoutubeId(
                  activeVideo.youtubeId || activeVideo.videoUrl
                )}`}
                title={activeVideo.title}
                allowFullScreen
              />
            </div>
          ) : activeVideo.videoUrl ? (
            <video
              controls
              autoPlay
              src={activeVideo.videoUrl}
              className={`mx-auto bg-black ${
                activeVideo.aspectRatio === '9:16' ? 'max-w-xs aspect-[9/16]' : 'w-full max-h-[540px]'
              }`}
            />
          ) : (
            <div className="p-8 text-center bg-slate-900 border border-slate-800">
              <VideoIcon className="w-8 h-8 text-blue-300 mx-auto mb-2" />
              <p className="text-sm text-slate-300">{activeVideo.description}</p>
            </div>
          )}
        </div>
      )}

      {widescreenVideos.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-950 mb-5">Reportagens & Entrevistas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {widescreenVideos.map((v) => (
              <div key={v.id} className="bg-white border border-slate-200 flex flex-col">
                <button
                  type="button"
                  onClick={() => handleWatch(v)}
                  className="relative aspect-video w-full overflow-hidden bg-slate-100 group cursor-pointer text-left"
                >
                  <EditorialImage src={v.thumbnailUrl} alt={v.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex items-center justify-center">
                    <span className="w-12 h-12 flex items-center justify-center bg-blue-900/90 text-white group-hover:bg-blue-800 transition-colors">
                      <Play className="w-5 h-5 ml-0.5" />
                    </span>
                  </div>
                </button>
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">
                      <span className="font-semibold text-blue-900">{v.category}</span>
                      <span className="mx-1.5">·</span>
                      <span className="font-mono tabular-nums">{formatDatePtBR(v.publishedAt)}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-950 leading-snug mb-1.5">
                      {v.title}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-2">{v.description}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="font-mono tabular-nums text-slate-500">{v.views} visualizações</span>
                    <a
                      href={shareSocialUrl('whatsapp', v.title, window.location.href)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-900 font-medium hover:underline"
                    >
                      Compartilhar
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {verticalVideos.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-slate-950 mb-5">Vídeos Verticais (9:16)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {verticalVideos.map((v) => (
              <div key={v.id} className="bg-white border border-slate-200 flex flex-col">
                <button
                  type="button"
                  onClick={() => handleWatch(v)}
                  className="relative aspect-[9/16] w-full overflow-hidden bg-slate-100 group cursor-pointer text-left"
                >
                  <EditorialImage src={v.thumbnailUrl} alt={v.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-end p-4">
                    <span className="w-10 h-10 mb-3 flex items-center justify-center bg-white text-blue-950">
                      <Play className="w-4 h-4 ml-0.5" />
                    </span>
                    <span className="text-[11px] font-medium text-blue-200">{v.category}</span>
                    <h3 className="text-base font-bold text-white leading-snug">{v.title}</h3>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

interface MusicPageProps {
  artists: Artist[];
  songs: SongItem[];
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  onPlayTrack: (track: AudioTrack, songId: number) => void;
}

export function MusicPage({
  artists,
  songs,
  currentTrack,
  isPlaying,
  onPlayTrack,
}: MusicPageProps) {
  const genres = ['Todos', ...Array.from(new Set(songs.map((s) => s.genre)))];
  const [selectedGenre, setSelectedGenre] = useState('Todos');
  const [selectedArtistId, setSelectedArtistId] = useState<number | null>(null);

  const filteredSongs = songs.filter((s) => {
    if (selectedGenre !== 'Todos' && s.genre !== selectedGenre) return false;
    if (selectedArtistId && s.artistId !== selectedArtistId) return false;
    return s.rightsAuthorized;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="border-b border-slate-200 pb-6 mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-blue-900 uppercase mb-2">
            Cultura Musical das Serras Gerais
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-950 mb-2">
            Músicas Locais — Artistas e Compositores de Almas
          </h1>
          <p className="text-base text-slate-600 max-w-2xl">
            Vitrine permanente de valorização dos talentos musicais de Almas e região. Todas as
            obras publicadas contam com autorização formal de divulgação e reprodução.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1">
          {genres.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGenre(g)}
              className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer ${
                selectedGenre === g
                  ? 'bg-white text-blue-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {artists.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-950">Artistas da Terra</h2>
            {selectedArtistId && (
              <button
                type="button"
                onClick={() => setSelectedArtistId(null)}
                className="text-xs font-medium text-blue-900 hover:underline cursor-pointer"
              >
                Mostrar todos os artistas
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {artists.map((artist) => {
              const isSelected = selectedArtistId === artist.id;
              return (
                <button
                  key={artist.id}
                  type="button"
                  onClick={() => setSelectedArtistId(isSelected ? null : artist.id)}
                  className={`p-4 border text-left flex items-start gap-4 transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-blue-900 bg-blue-50/40'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="w-16 h-16 shrink-0 bg-slate-100 border border-slate-200 overflow-hidden">
                    <EditorialImage src={artist.photoUrl} alt={artist.name} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-950 truncate">{artist.name}</h3>
                    <p className="text-xs text-blue-900 font-medium mb-1">
                      {artist.city} · {artist.genre}
                    </p>
                    <p className="text-xs text-slate-600 line-clamp-2">{artist.bio}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-bold text-slate-950 mb-4 flex items-center gap-2">
          <Music2 className="w-5 h-5 text-blue-900" />
          Repertório Autorizado ({filteredSongs.length})
        </h2>

        {filteredSongs.length === 0 ? (
          <p className="text-slate-500 py-8">Nenhuma música encontrada para este filtro.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredSongs.map((song) => {
              const trackId = `song-${song.id}`;
              const active = currentTrack?.id === trackId && isPlaying;
              const artistName = song.artist?.name || 'Artista Local';
              return (
                <div
                  key={song.id}
                  className="bg-white border border-slate-200 p-4 flex flex-col sm:flex-row gap-4"
                >
                  <div className="w-full sm:w-28 h-28 shrink-0 bg-slate-100 border border-slate-200 overflow-hidden">
                    <EditorialImage src={song.coverImage} alt={song.title} />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <span className="font-semibold text-blue-900">{song.genre}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{song.plays} reproduções</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-950 truncate">{song.title}</h3>
                      <p className="text-sm font-medium text-slate-700 mb-1">{artistName}</p>
                      <p className="text-xs text-slate-600 line-clamp-2">{song.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onPlayTrack(
                              {
                                id: trackId,
                                kind: 'music',
                                title: song.title,
                                subtitle: `${artistName} · ${song.genre}`,
                                audioUrl: song.audioUrl,
                                coverImage: song.coverImage,
                              },
                              song.id
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 cursor-pointer"
                        >
                          {active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          {active ? 'Pausar' : 'Tocar música'}
                        </button>
                        <a
                          href={shareSocialUrl(
                            'whatsapp',
                            `Ouça "${song.title}" de ${artistName}`,
                            window.location.href
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 text-xs text-slate-700 hover:border-blue-900"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Reprodução autorizada
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
