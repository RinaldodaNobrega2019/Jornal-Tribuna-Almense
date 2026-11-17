export function formatDatePtBR(dateStr: string | Date): string {
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return '';
  }
}

export function formatDateTimePtBR(dateStr: string | Date): string {
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '';
  }
}

export function extractYoutubeId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/(?:v=|\/embed\/|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : '';
}

export function buildWhatsAppLink(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, '');
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${withCountry}${query}`;
}

export function shareSocialUrl(
  network: 'whatsapp' | 'facebook' | 'x',
  title: string,
  url: string
): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${title} — Jornal Tribuna Almense`);
  if (network === 'whatsapp') {
    return `https://wa.me/?text=${encodeURIComponent(`${title} — Jornal Tribuna Almense\n${url}`)}`;
  }
  if (network === 'facebook') {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  }
  return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
}
