import { FormEvent, useState } from 'react';
import { Mail, MapPin, MessageCircle, Send } from 'lucide-react';
import { buildWhatsAppLink } from '../lib/format';

interface ContactPageProps {
  settings: Record<string, string>;
}

export function ContactPage({ settings }: ContactPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok?: string; err?: string }>({});

  const whatsapp = settings.whatsapp || '63 99101-4872';
  const institutionalEmail = settings.email || 'jornalistarinaldodanobrega@gmail.com';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback({});
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar mensagem.');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      setFeedback({ ok: data.message });
    } catch (err: any) {
      setFeedback({ err: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="border-b border-slate-200 pb-6 mb-10">
        <p className="text-xs font-semibold tracking-wider text-blue-900 uppercase mb-2">
          Fale com a Redação
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-950 mb-2">
          Contato — Jornal Tribuna Almense
        </h1>
        <p className="text-base text-slate-600 max-w-2xl">
          Envie sugestões de pauta, denúncias comunitárias, solicitações de cobertura cultural ou
          propostas comerciais diretamente para nossa equipe editorial.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 bg-slate-50 border border-slate-200 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-950 mb-1">Atendimento Direto</h2>
              <p className="text-sm text-slate-600">
                Responsável editorial: {settings.editor_chief || 'Rinaldo da Nóbrega'}
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-blue-900 mt-1 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-900">E-mail institucional</div>
                  <a
                    href={`mailto:${institutionalEmail}`}
                    className="text-blue-900 hover:underline break-all"
                  >
                    {institutionalEmail}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MessageCircle className="w-4 h-4 text-blue-900 mt-1 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-900">WhatsApp da Redação</div>
                  <p className="text-slate-700 font-mono tabular-nums">{whatsapp}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-blue-900 mt-1 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-900">Sede Editorial</div>
                  <p className="text-slate-700">Almas, Tocantins — Região das Serras Gerais</p>
                </div>
              </div>
            </div>

            <a
              href={buildWhatsAppLink(
                whatsapp,
                'Olá! Gostaria de falar com a redação do Jornal Tribuna Almense.'
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Conversar pelo WhatsApp ({whatsapp})
            </a>
          </div>

          <div className="p-6 bg-white border border-slate-200">
            <h3 className="text-base font-bold text-slate-950 mb-3">Redes Sociais Oficiais</h3>
            <div className="grid grid-cols-2 gap-2.5 text-sm">
              {[
                { label: 'Facebook', url: settings.facebook_url },
                { label: 'Instagram', url: settings.instagram_url },
                { label: 'YouTube', url: settings.youtube_url },
                { label: 'TikTok', url: settings.tiktok_url },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2.5 border border-slate-200 text-slate-800 font-medium hover:border-blue-900 hover:text-blue-900 transition-colors text-center"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 bg-white border border-slate-200 space-y-5">
            <h2 className="text-2xl font-bold text-slate-950">Envie sua mensagem</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nome</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 focus:outline-none focus:border-blue-900"
                  placeholder="Seu nome completo"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 focus:outline-none focus:border-blue-900"
                  placeholder="voce@exemplo.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Assunto</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 focus:outline-none focus:border-blue-900"
                placeholder="Sugestão de pauta, anúncio, imprensa..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mensagem</label>
              <textarea
                rows={6}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 focus:outline-none focus:border-blue-900"
                placeholder="Escreva os detalhes da sua mensagem..."
              />
            </div>

            {feedback.ok && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 font-medium">
                {feedback.ok}
              </div>
            )}
            {feedback.err && (
              <div className="p-3 bg-red-50 border border-red-200 text-sm text-red-800 font-medium">
                {feedback.err}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Enviando...' : 'Enviar mensagem'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

interface InstitutionalPageProps {
  pageKey: 'about' | 'expediente' | 'privacy' | 'editorial' | 'terms' | 'advertise';
  settings: Record<string, string>;
  onNavigateContact: () => void;
}

const INSTITUTIONAL_META: Record<
  InstitutionalPageProps['pageKey'],
  { title: string; subtitle: string; settingKey: string }
> = {
  about: {
    title: 'Sobre o Jornal Tribuna Almense',
    subtitle: 'Comunicação independente a serviço de Almas, do Tocantins e do interesse público.',
    settingKey: 'about_text',
  },
  expediente: {
    title: 'Expediente',
    subtitle: 'Estrutura editorial, direção jornalística e canais oficiais.',
    settingKey: 'expediente_text',
  },
  privacy: {
    title: 'Política de Privacidade',
    subtitle: 'Compromisso com a transparência e proteção de dados dos leitores.',
    settingKey: 'privacy_text',
  },
  editorial: {
    title: 'Política Editorial',
    subtitle: 'Princípios de independência, verificação dos fatos e direito de resposta.',
    settingKey: 'editorial_policy_text',
  },
  terms: {
    title: 'Termos de Uso',
    subtitle: 'Direitos autorais, uso do portal e autorizações de reprodução.',
    settingKey: 'terms_text',
  },
  advertise: {
    title: 'Anuncie no Jornal Tribuna Almense',
    subtitle: 'Conecte sua empresa aos leitores de Almas, Serras Gerais e todo o Tocantins.',
    settingKey: 'advertise_text',
  },
};

export function InstitutionalPage({
  pageKey,
  settings,
  onNavigateContact,
}: InstitutionalPageProps) {
  const meta = INSTITUTIONAL_META[pageKey];
  const bodyText = settings[meta.settingKey] || '';
  const paragraphs = bodyText.split(/\n+/).filter((p) => p.trim().length > 0);
  const whatsapp = settings.whatsapp || '63 99101-4872';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="border-b border-slate-200 pb-6 mb-8">
        <div className="flex items-center gap-4 mb-4">
          {settings.logo_url && (
            <img
              src={settings.logo_url}
              alt="Logo Jornal Tribuna Almense"
              referrerPolicy="no-referrer"
              className="w-12 h-12 object-contain border border-slate-200 bg-white p-1"
            />
          )}
          <div>
            <p className="text-xs font-semibold tracking-wider text-blue-900 uppercase">
              Institucional · Jornal Tribuna Almense
            </p>
            <p className="text-xs text-slate-500">{settings.slogan || 'Almas noticiada para todos.'}</p>
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-950 mb-2">{meta.title}</h1>
        <p className="text-base text-slate-600">{meta.subtitle}</p>
      </div>

      <div className="max-w-2xl space-y-5 text-base sm:text-lg leading-relaxed text-slate-800 mb-10">
        {paragraphs.map((p, idx) => (
          <p key={idx}>{p}</p>
        ))}
      </div>

      {pageKey === 'advertise' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {[
            {
              name: 'Banner Cabeçalho',
              desc: 'Exposição institucional no topo de todas as páginas do portal.',
            },
            {
              name: 'Destaque Lateral & Entre Notícias',
              desc: 'Presença estratégica junto às manchetes mais acessadas.',
            },
            {
              name: 'Patrocínio Podcast & Vídeos',
              desc: 'Inserção de marca e apoio cultural nas produções audiovisuais.',
            },
          ].map((slot) => (
            <div key={slot.name} className="p-5 bg-slate-50 border border-slate-200">
              <h3 className="text-base font-bold text-slate-950 mb-1.5">{slot.name}</h3>
              <p className="text-sm text-slate-600">{slot.desc}</p>
            </div>
          ))}
        </div>
      )}

      <div className="p-6 bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            Atendimento da Redação e Departamento Comercial
          </p>
          <p className="text-xs text-slate-600">
            {settings.email || 'jornalistarinaldodanobrega@gmail.com'} · WhatsApp {whatsapp}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={buildWhatsAppLink(whatsapp, 'Olá! Desejo atendimento comercial/editorial.')}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
          >
            WhatsApp Direto
          </a>
          <button
            type="button"
            onClick={onNavigateContact}
            className="px-4 py-2 bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 cursor-pointer"
          >
            Formulário de Contato
          </button>
        </div>
      </div>
    </div>
  );
}
