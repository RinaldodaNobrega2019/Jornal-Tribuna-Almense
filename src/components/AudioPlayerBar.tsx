import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, X } from 'lucide-react';
import { AudioTrack } from '../types';
import { EditorialImage } from './EditorialImage';

interface AudioPlayerBarProps {
  track: AudioTrack | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onClose: () => void;
}

function formatSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function AudioPlayerBar({
  track,
  isPlaying,
  onTogglePlay,
  onClose,
}: AudioPlayerBarProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [audioError, setAudioError] = useState(false);

  useEffect(() => {
    setAudioError(false);
    setCurrentTime(0);
    setDuration(0);
  }, [track?.id]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !track) return;
    el.volume = volume;
    if (isPlaying) {
      el.play().catch(() => {
        // Browser autoplay guard if needed
      });
    } else {
      el.pause();
    }
  }, [track, isPlaying, volume]);

  if (!track) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 bg-blue-950 text-white border-t border-blue-900 shadow-lg"
      role="region"
      aria-label="Reprodutor de áudio integrado"
    >
      <audio
        ref={audioRef}
        src={track.audioUrl}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => onTogglePlay()}
        onError={() => setAudioError(true)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 shrink-0 overflow-hidden bg-blue-900 border border-blue-800">
            <EditorialImage src={track.coverImage} alt={track.title} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-blue-200 tracking-wide">
              {track.kind === 'podcast' ? 'Podcast Tribuna Almense' : 'Músicas Locais'}
            </div>
            <div className="text-sm font-semibold text-white truncate">{track.title}</div>
            <div className="text-xs text-blue-200/80 truncate">{track.subtitle}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-5 flex-1 max-w-xl justify-center">
          <button
            type="button"
            onClick={onTogglePlay}
            className="w-10 h-10 flex items-center justify-center bg-white text-blue-950 hover:bg-blue-50 transition-colors shrink-0 cursor-pointer"
            aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <div className="hidden sm:flex items-center gap-2.5 flex-1">
            <span className="text-xs font-mono tabular-nums text-blue-200 w-11 text-right">
              {formatSeconds(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (audioRef.current) {
                  audioRef.current.currentTime = next;
                }
                setCurrentTime(next);
              }}
              className="w-full accent-white cursor-pointer h-1"
              aria-label="Progresso da reprodução"
            />
            <span className="text-xs font-mono tabular-nums text-blue-200 w-11">
              {formatSeconds(duration)}
            </span>
          </div>
          {audioError && (
            <span className="text-xs text-amber-200">Arquivo de áudio indisponível.</span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-blue-200" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-20 accent-white cursor-pointer h-1"
              aria-label="Volume"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-blue-200 hover:text-white hover:bg-blue-900 transition-colors cursor-pointer"
            aria-label="Fechar reprodutor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
