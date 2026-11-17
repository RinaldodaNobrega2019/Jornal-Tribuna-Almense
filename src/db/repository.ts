import { and, desc, eq, ilike, lte, or, sql } from 'drizzle-orm';
import { db } from './index.ts';
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
} from './schema.ts';
import { hashPassword } from '../lib/crypto.ts';

const ADMIN_EMAILS = new Set([
  'rinaldonobregaalmas@gmail.com',
  'jornalistarinaldodanobrega@gmail.com',
]);

let seedPromise: Promise<void> | null = null;

export async function ensureSeedData(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeedIfNeeded().catch((err) => {
      seedPromise = null;
      console.error('Seed check error:', err);
      throw new Error('Falha ao inicializar os dados do portal.', { cause: err });
    });
  }
  return seedPromise;
}

async function runSeedIfNeeded(): Promise<void> {
  const existingCategories = await db.select().from(categories).limit(1);
  if (existingCategories.length > 0) {
    return;
  }

  // 1. Default Administrative & Editorial User
  const adminPasswordHash = hashPassword('Tribuna@2026');
  const [adminUser] = await db
    .insert(users)
    .values({
      uid: 'local-admin-rinaldo',
      email: 'jornalistarinaldodanobrega@gmail.com',
      username: 'rinaldo',
      passwordHash: adminPasswordHash,
      name: 'Rinaldo da Nóbrega',
      role: 'admin',
      subscriptionPlan: 'premium',
      active: true,
    })
    .onConflictDoNothing()
    .returning();

  // 2. Editorial Categories
  await db
    .insert(categories)
    .values([
      { slug: 'almas', name: 'Almas', description: 'Notícias locais de Almas e região das Serras Gerais', sortOrder: 1, isSystem: true },
      { slug: 'cidades', name: 'Cidades', description: 'Cobertura dos municípios do Sudeste e interior do Tocantins', sortOrder: 2, isSystem: true },
      { slug: 'estado', name: 'Estado', description: 'Política, economia e ações em todo o Tocantins', sortOrder: 3, isSystem: true },
      { slug: 'justica', name: 'Justiça', description: 'Decisões judiciais, Ministério Público e direitos do cidadão', sortOrder: 4, isSystem: true },
      { slug: 'esporte', name: 'Esporte', description: 'Campeonatos municipais, ligas regionais e atletas tocantinenses', sortOrder: 5, isSystem: true },
      { slug: 'cultura', name: 'Cultura', description: 'Tradições, literatura, festejos, artesanato e eventos culturais', sortOrder: 6, isSystem: true },
      { slug: 'brasil', name: 'Brasil e Mundo', description: 'Principais acontecimentos nacionais e internacionais', sortOrder: 7, isSystem: true },
    ])
    .onConflictDoNothing();

  // 3. Site Settings & Institutional Pages
  const defaultSettings: Array<{ key: string; value: string }> = [
    { key: 'portal_name', value: 'JORNAL TRIBUNA ALMENSE' },
    { key: 'slogan', value: 'Almas noticiada para todos.' },
    { key: 'editor_chief', value: 'Rinaldo da Nóbrega — Escritor e Jornalista' },
    { key: 'logo_url', value: '/src/assets/images/tribuna_logo_emblem_1794938135064.jpg' },
    { key: 'whatsapp', value: '63 99101-4872' },
    { key: 'email', value: 'jornalistarinaldodanobrega@gmail.com' },
    { key: 'facebook_url', value: 'https://facebook.com/jornaltribunaalmense' },
    { key: 'instagram_url', value: 'https://instagram.com/jornaltribunaalmense' },
    { key: 'youtube_url', value: 'https://youtube.com/@jornaltribunaalmense' },
    { key: 'tiktok_url', value: 'https://tiktok.com/@jornaltribunaalmense' },
    {
      key: 'about_text',
      value:
        'O Jornal Tribuna Almense é um veículo de comunicação digital independente sediado em Almas, no coração das Serras Gerais do Tocantins. Idealizado pelo escritor e jornalista Rinaldo da Nóbrega, o portal nasce com a missão de levar informação apurada, ética e acessível sobre Almas, o Tocantins, o Brasil e o mundo.\n\nComprometido com o interesse público e a valorização da identidade regional, o Tribuna Almense integra jornalismo escrito, podcasts, reportagens em vídeo e um espaço dedicado aos músicos e compositores da nossa terra.',
    },
    {
      key: 'expediente_text',
      value:
        'JORNAL TRIBUNA ALMENSE\nSlogan: Almas noticiada para todos.\n\nDiretor-Geral e Editor Responsável: Rinaldo da Nóbrega — Escritor e Jornalista\nRedação e Atendimento: Almas, Tocantins — Serras Gerais\nE-mail institucional: jornalistarinaldodanobrega@gmail.com\nWhatsApp da Redação: (63) 99101-4872',
    },
    {
      key: 'editorial_policy_text',
      value:
        'A linha editorial do Jornal Tribuna Almense pauta-se pela independência, pluralidade, verificação rigorosa dos fatos e respeito ao contraditório. Toda matéria jornalística distingue claramente a informação factual do conteúdo opinativo ou publicitário. Correções e direitos de resposta são atendidos com celeridade através do canal oficial da redação.',
    },
    {
      key: 'privacy_text',
      value:
        'O Jornal Tribuna Almense respeita a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018). Os dados fornecidos nos formulários de contato, comentários ou cadastro de assinantes são utilizados exclusivamente para atendimento editorial, moderação e comunicação solicitada pelo leitor, não sendo comercializados com terceiros.',
    },
    {
      key: 'terms_text',
      value:
        'Todo o conteúdo jornalístico, fotográfico e audiovisual publicado no Jornal Tribuna Almense é protegido por direitos autorais. As obras musicais exibidas na seção Músicas Locais contam com autorização expressa de seus respectivos compositores e intérpretes. A reprodução parcial de matérias exige citação explícita da fonte e link para a publicação original.',
    },
    {
      key: 'advertise_text',
      value:
        'Associe sua marca ao veículo de comunicação com maior conexão com Almas e as Serras Gerais. Oferecemos formatos estratégicos em banners no cabeçalho, destaques laterais, publicidade entre notícias e patrocínio de quadros em podcast e vídeo.\n\nEntre em contato diretamente com nossa equipe comercial pelo WhatsApp (63) 99101-4872 ou pelo e-mail jornalistarinaldodanobrega@gmail.com.',
    },
  ];

  for (const item of defaultSettings) {
    await db.insert(siteSettings).values(item).onConflictDoNothing();
  }

  // 4. Articles
  const now = Date.now();
  const h = (hoursAgo: number) => new Date(now - hoursAgo * 3600 * 1000);

  await db
    .insert(articles)
    .values([
      {
        slug: 'rota-turistica-serras-gerais-impulsiona-economia-de-almas',
        title: 'Rota Turística das Serras Gerais impulsiona economia, comércio e infraestrutura em Almas',
        subtitle: 'Fluxo de visitantes cresce ao longo do ano e fortalece empreendimentos familiares, pousadas e gastronomia regional no sudeste do Tocantins.',
        summary: 'Com atrativos naturais preservados e melhoria nos acessos, Almas consolida-se como porta de entrada estratégica do ecoturismo tocantinense.',
        content:
          'Almas vive um momento de renovação econômica impulsionado pela consolidação da Rota Turística das Serras Gerais. Comerciantes locais, guias credenciados e pequenos produtores rurais relatam aumento constante na procura por serviços de hospedagem, alimentação típica e roteiros ecológicos.\n\nAlém do impacto direto na geração de renda urbana, o movimento turístico tem estimulado a valorização da agricultura familiar e do artesanato tradicional, conectando a história centenária do município a novas oportunidades de desenvolvimento sustentável.\n\nLideranças comunitárias destacam que a manutenção contínua das estradas vicinais, sinalização turística e qualificação profissional permanecem como prioridades para garantir que o crescimento beneficie toda a população almense.',
        categorySlug: 'almas',
        coverImage: '/src/assets/images/hero_almas_serras_gerais_1794938135711.jpg',
        gallery: [
          '/src/assets/images/hero_almas_serras_gerais_1794938135711.jpg',
          '/src/assets/images/news_cultura_festejos_1794938136974.jpg',
        ],
        authorName: 'Rinaldo da Nóbrega',
        authorId: adminUser?.id ?? null,
        status: 'published',
        isFeatured: true,
        isBreaking: true,
        isSubscriberOnly: false,
        allowComments: true,
        views: 1840,
        publishedAt: h(1),
      },
      {
        slug: 'comunidade-almense-celebra-melhorias-educacao-e-acervo-cultural',
        title: 'Escolas municipais de Almas ampliam projetos de leitura e valorização da história local',
        subtitle: 'Iniciativa aproxima estudantes da literatura tocantinense e estimula a produção textual nas salas de aula.',
        summary: 'Projetos pedagógicos integram escritores regionais, oficinas de redação e resgate da memória cultural almense.',
        content:
          'Estudantes da rede municipal de Almas passaram a contar neste semestre com uma programação ampliada de oficinas de leitura, produção de crônicas e visitas orientadas a acervos históricos do município.\n\nEducadores ressaltam que aproximar os jovens das narrativas da própria cidade fortalece o sentimento de pertencimento e melhora o desempenho em interpretação de texto. O Jornal Tribuna Almense acompanha as ações educativas como parte do compromisso permanente com a cultura e a formação cidadã.',
        categorySlug: 'almas',
        coverImage: '/src/assets/images/news_cultura_festejos_1794938136974.jpg',
        authorName: 'Rinaldo da Nóbrega',
        authorId: adminUser?.id ?? null,
        status: 'published',
        isFeatured: false,
        isBreaking: false,
        views: 620,
        publishedAt: h(4),
      },
      {
        slug: 'municipios-sudeste-tocantins-articulam-consorcio-estradas',
        title: 'Municípios do Sudeste do Tocantins articulam consórcio para manutenção de estradas vicinais',
        subtitle: 'Prefeituras de Almas, Porto Alegre do Tocantins, Dianópolis e Rio da Conceição discutem plano integrado de logística rural.',
        summary: 'Integração regional visa assegurar o escoamento da produção agropecuária e o transporte escolar durante todo o ano.',
        content:
          'Gestores municipais da região sudeste do Tocantins realizaram encontro técnico para alinhar ações conjuntas voltadas à recuperação de pontes e estradas vicinais que interligam comunidades rurais aos centros urbanos.\n\nA proposta de atuação em consórcio busca reduzir custos operacionais com maquinário compartilhado e acelerar o atendimento às rotas mais críticas antes do período chuvoso.',
        categorySlug: 'cidades',
        coverImage: '/src/assets/images/hero_almas_serras_gerais_1794938135711.jpg',
        authorName: 'Redação Tribuna Almense',
        authorId: adminUser?.id ?? null,
        status: 'published',
        isFeatured: false,
        isBreaking: true,
        views: 940,
        publishedAt: h(6),
      },
      {
        slug: 'governo-tocantins-investimentos-conectividade-rural',
        title: 'Tocantins amplia programa de conectividade digital e energia limpa para comunidades do interior',
        subtitle: 'Novas torres de transmissão e sistemas fotovoltaicos beneficiam escolas rurais e unidades básicas de saúde.',
        summary: 'Iniciativa estadual prevê cobertura ampliada de internet banda larga em povoados e distritos afastados das sedes urbanas.',
        content:
          'O plano estadual de expansão da conectividade começou a alcançar localidades estratégicas do interior tocantinense, levando internet de alta velocidade para escolas, postos de atendimento e associações de produtores.\n\nCom a melhoria do sinal, serviços públicos digitais e sistemas de telemedicina ganham maior estabilidade em todo o estado.',
        categorySlug: 'estado',
        coverImage: '/src/assets/images/news_justica_tocantins_1794938136430.jpg',
        authorName: 'Redação Tribuna Almense',
        authorId: adminUser?.id ?? null,
        status: 'published',
        isFeatured: false,
        isBreaking: false,
        views: 1120,
        publishedAt: h(9),
      },
      {
        slug: 'justica-itinerante-amplia-atendimento-almas-e-regiao',
        title: 'Justiça e Ministério Público ampliam mutirões de atendimento gratuito na comarca de Almas e região',
        subtitle: 'Ação facilita emissão de registros civis, conciliações familiares e orientação jurídica direta à população.',
        summary: 'Unidades móveis percorrem bairros e distritos rurais com foco na celeridade processual e garantia de direitos básicos.',
        content:
          'O programa de atendimento itinerante do Judiciário tocantinense, em parceria com o Ministério Público e a Defensoria Pública, intensificou o calendário de serviços presenciais voltados às famílias de Almas e municípios vizinhos.\n\nDurante os mutirões, moradores têm acesso facilitado a acordos de conciliação, retificação de documentos, pensão alimentícia e orientações previdenciárias sem necessidade de longos deslocamentos até a capital.',
        categorySlug: 'justica',
        coverImage: '/src/assets/images/news_justica_tocantins_1794938136430.jpg',
        authorName: 'Rinaldo da Nóbrega',
        authorId: adminUser?.id ?? null,
        status: 'published',
        isFeatured: false,
        isBreaking: false,
        views: 1410,
        publishedAt: h(12),
      },
      {
        slug: 'copa-serras-gerais-futebol-amador-reune-torcedores',
        title: 'Copa Serras Gerais de Futebol Amador movimenta estádios e revela novos talentos em Almas',
        subtitle: 'Equipes locais protagonizam rodadas equilibradas com forte participação das famílias nas arquibancadas.',
        summary: 'Competição regional valoriza o esporte de base e fortalece o intercâmbio esportivo entre cidades vizinhas.',
        content:
          'A edição atual da Copa Serras Gerais tem atraído expressivo público aos gramados municipais. Em Almas, a rodada do último fim de semana foi marcada por jogos disputados, organização das torcidas e destaque para jovens atletas formados nas escolinhas locais.\n\nAlém da disputa pelo troféu regional, o torneio aquece o comércio informal nos arredores do estádio e incentiva a prática esportiva entre adolescentes.',
        categorySlug: 'esporte',
        coverImage: '/src/assets/images/news_esporte_campo_1794938136909.jpg',
        authorName: 'Redação Esportiva',
        authorId: adminUser?.id ?? null,
        status: 'published',
        isFeatured: false,
        isBreaking: false,
        views: 1295,
        publishedAt: h(16),
      },
      {
        slug: 'festejos-tradicionais-artesanato-preservam-raizes-cerrado',
        title: 'Festejos culturais e feira de artesanato celebram a memória e os saberes do Cerrado tocantinense',
        subtitle: 'Mestres artesãos, violeiros e grupos folclóricos reúnem moradores e visitantes em noites de música e gastronomia.',
        summary: 'Programação cultural destaca a cerâmica tradicional, danças típicas e culinária de raiz das Serras Gerais.',
        content:
          'Com ruas iluminadas e praças ocupadas pela comunidade, o encontro cultural realizado neste mês reafirmou a força das tradições populares do sudeste tocantinense.\n\nArtesãs apresentaram peças em barro, capim-dourado e tecelagem manual, enquanto músicos regionais animaram o público com modas de viola e ritmos tradicionais preservados há gerações.',
        categorySlug: 'cultura',
        coverImage: '/src/assets/images/news_cultura_festejos_1794938136974.jpg',
        authorName: 'Rinaldo da Nóbrega',
        authorId: adminUser?.id ?? null,
        status: 'published',
        isFeatured: false,
        isBreaking: false,
        views: 1510,
        publishedAt: h(20),
      },
      {
        slug: 'producao-sustentavel-cerrado-destaque-forum-nacional',
        title: 'Produção sustentável no Cerrado ganha destaque em fórum nacional de agricultura e bioeconomia',
        subtitle: 'Experiências do Tocantins com manejo agroflorestal e frutos nativos atraem atenção de pesquisadores em Brasília.',
        summary: 'Cadeias produtivas do baru, pequi e mel regional demonstram como conservação ambiental gera renda no campo.',
        content:
          'Cooperativas e pesquisadores reunidos em fórum nacional apresentaram resultados positivos sobre o uso sustentável de espécies nativas do Cerrado na geração de renda rural.\n\nProjetos desenvolvidos no Tocantins foram citados como referência de equilíbrio entre preservação dos biomas, rastreabilidade e acesso a novos mercados consumidores no Brasil e no exterior.',
        categorySlug: 'brasil',
        coverImage: '/src/assets/images/musica_serras_gerais_1794938138439.jpg',
        authorName: 'Agência Nacional / Redação',
        authorId: adminUser?.id ?? null,
        status: 'published',
        isFeatured: false,
        isBreaking: false,
        views: 875,
        publishedAt: h(24),
      },
      {
        slug: 'dossie-historico-memorias-imprensa-almas-tocantins',
        title: 'Dossiê Especial: Memórias, crônicas e personagens que moldaram a história de Almas',
        subtitle: 'Reportagem especial de fôlego assinada por Rinaldo da Nóbrega resgata arquivos raros e depoimentos históricos.',
        summary: 'Conteúdo exclusivo para apoiadores e assinantes do Jornal Tribuna Almense com relatos inéditos sobre a formação cultural da cidade.',
        content:
          'Ao longo de décadas, a trajetória de Almas foi construída por famílias trabalhadoras, professores, poetas populares e comunicadores que registraram as transformações do antigo norte goiano até a criação do Estado do Tocantins.\n\nNeste dossiê especial, reunimos documentos históricos, fotografias de acervo familiar e crônicas comentadas sobre os marcos urbanos, religiosos e culturais que definem a identidade do povo almense.\n\nA preservação dessa memória é parte essencial da missão editorial do Jornal Tribuna Almense: registrar o presente com rigor sem jamais esquecer as raízes que nos sustentam.',
        categorySlug: 'almas',
        coverImage: '/src/assets/images/hero_almas_serras_gerais_1794938135711.jpg',
        authorName: 'Rinaldo da Nóbrega',
        authorId: adminUser?.id ?? null,
        status: 'published',
        isFeatured: false,
        isBreaking: false,
        isSubscriberOnly: true,
        views: 530,
        publishedAt: h(30),
      },
    ])
    .onConflictDoNothing();

  // 5. Podcasts
  await db
    .insert(podcasts)
    .values([
      {
        slug: 'ep-01-vozes-das-serras-gerais-jornalismo-independente',
        episodeNumber: 1,
        title: 'Vozes das Serras Gerais: A força do jornalismo local em Almas',
        description:
          'Na estreia do Podcast Tribuna Almense, o escritor e jornalista Rinaldo da Nóbrega analisa o papel da imprensa independente no interior do Tocantins e os bastidores da apuração regional.',
        audioUrl: '/api/media/sample-audio/podcast.wav',
        coverImage: '/src/assets/images/podcast_estudio_tribuna_1794938137292.jpg',
        duration: '28:40',
        guestName: 'Rinaldo da Nóbrega',
        status: 'published',
        publishedAt: h(10),
      },
      {
        slug: 'ep-02-ecoturismo-patrimonio-almas-tocantins',
        episodeNumber: 2,
        title: 'Ecoturismo, cultura e desenvolvimento sustentável nas Serras Gerais',
        description:
          'Conversa aprofundada com empreendedores e lideranças culturais sobre o futuro do turismo responsável em Almas e o fortalecimento da economia criativa local.',
        audioUrl: '/api/media/sample-audio/podcast.wav',
        coverImage: '/src/assets/images/podcast_estudio_tribuna_1794938137292.jpg',
        duration: '34:15',
        guestName: 'Lideranças Culturais de Almas',
        status: 'published',
        publishedAt: h(48),
      },
    ])
    .onConflictDoNothing();

  // 6. Videos (16:9 and 9:16 vertical)
  await db
    .insert(videos)
    .values([
      {
        slug: 'amanhecer-em-almas-serras-gerais',
        title: 'Amanhecer em Almas: belezas naturais e cotidiano nas Serras Gerais',
        description: 'Registro jornalístico destacando as paisagens, o comércio matinal e a hospitalidade do povo almense.',
        category: 'Reportagens',
        youtubeId: 'dQw4w9WgXcQ',
        aspectRatio: '16:9',
        thumbnailUrl: '/src/assets/images/hero_almas_serras_gerais_1794938135711.jpg',
        status: 'published',
        views: 740,
        publishedAt: h(5),
      },
      {
        slug: 'boletim-vertical-tribuna-express-almas',
        title: 'Boletim Tribuna Express: Resumo das notícias da semana',
        description: 'Formato vertical 9:16 com os principais destaques de Almas, Justiça e Tocantins em um minuto.',
        category: 'Boletim Vertical',
        youtubeId: '',
        videoUrl: '',
        aspectRatio: '9:16',
        thumbnailUrl: '/src/assets/images/news_esporte_campo_1794938136909.jpg',
        status: 'published',
        views: 512,
        publishedAt: h(14),
      },
      {
        slug: 'encontro-artesoes-cultura-tocantinense',
        title: 'Artesanato e música de raiz no Encontro Cultural do Tocantins',
        description: 'Entrevistas com artesãos e músicos regionais que mantêm vivas as tradições do Cerrado.',
        category: 'Cultura & Entrevistas',
        youtubeId: '',
        videoUrl: '',
        aspectRatio: '16:9',
        thumbnailUrl: '/src/assets/images/news_cultura_festejos_1794938136974.jpg',
        status: 'published',
        views: 425,
        publishedAt: h(26),
      },
    ])
    .onConflictDoNothing();

  // 7. Artists & Authorized Local Songs
  const [artist1] = await db
    .insert(artists)
    .values({
      name: 'Grupo Raízes de Almas',
      city: 'Almas - TO',
      genre: 'Viola & Regional',
      bio: 'Conjunto dedicado à música regional do Cerrado, modas de viola e composições inspiradas nas Serras Gerais.',
      photoUrl: '/src/assets/images/musica_serras_gerais_1794938138439.jpg',
      instagramUrl: 'https://instagram.com',
    })
    .returning();

  const [artist2] = await db
    .insert(artists)
    .values({
      name: 'Marina Cerrado',
      city: 'Almas / Serras Gerais - TO',
      genre: 'MPB Regional',
      bio: 'Cantora e compositora tocantinense com repertório autoral dedicado às águas, chapadas e histórias do interior.',
      photoUrl: '/src/assets/images/news_cultura_festejos_1794938136974.jpg',
      instagramUrl: 'https://instagram.com',
    })
    .returning();

  if (artist1 && artist2) {
    await db.insert(songs).values([
      {
        artistId: artist1.id,
        title: 'Canto das Serras Gerais',
        genre: 'Viola & Regional',
        description: 'Composição autoral em homenagem às manhãs de Almas e aos viajantes das Serras Gerais.',
        audioUrl: '/api/media/sample-audio/music.wav',
        coverImage: '/src/assets/images/musica_serras_gerais_1794938138439.jpg',
        rightsAuthorized: true,
        authorizationNotes: 'Obra autoral com autorização expressa dos autores para reprodução no portal.',
        status: 'published',
        plays: 318,
      },
      {
        artistId: artist1.id,
        title: 'Estrada de Terra e Vento',
        genre: 'Moda de Viola',
        description: 'Relato poético sobre o sertão tocantinense, as festas de maio e a memória dos tropeiros.',
        audioUrl: '/api/media/sample-audio/music.wav',
        coverImage: '/src/assets/images/musica_serras_gerais_1794938138439.jpg',
        rightsAuthorized: true,
        authorizationNotes: 'Licença cultural direta concedida pelo grupo à redação.',
        status: 'published',
        plays: 204,
      },
      {
        artistId: artist2.id,
        title: 'Águas Claras do Tocantins',
        genre: 'MPB Regional',
        description: 'Canção acústica sobre os rios cristalinos e a preservação da biodiversidade das Serras Gerais.',
        audioUrl: '/api/media/sample-audio/music.wav',
        coverImage: '/src/assets/images/news_cultura_festejos_1794938136974.jpg',
        rightsAuthorized: true,
        authorizationNotes: 'Autorização assinada pela intérprete para divulgação cultural.',
        status: 'published',
        plays: 265,
      },
    ]);
  }

  // 8. Ads & Sponsors
  await db.insert(ads).values([
    {
      title: 'Anuncie sua empresa no Jornal Tribuna Almense',
      advertiserName: 'Departamento Comercial Tribuna Almense',
      placement: 'header',
      description: 'Visibilidade diária para leitores de Almas, Serras Gerais e todo o Tocantins. WhatsApp (63) 99101-4872.',
      targetUrl: '#anuncie',
      active: true,
    },
    {
      title: 'Guia Comercial & Serviços de Almas',
      advertiserName: 'Associação de Empreendedores Locais',
      placement: 'sidebar',
      description: 'Espaço reservado para empresas locais, clínicas, comércios e prestadores de serviços das Serras Gerais.',
      targetUrl: '#anuncie',
      active: true,
    },
    {
      title: 'Espaço Patrocinador Cultural — Valorize o Jornalismo Regional',
      advertiserName: 'Rede de Apoio Tribuna Almense',
      placement: 'in_feed',
      description: 'Apoie a imprensa independente do interior do Tocantins e conecte sua marca à comunidade.',
      targetUrl: '#anuncie',
      active: true,
    },
  ]);

  // 9. Initial Audit Log
  await db.insert(auditLogs).values({
    userId: adminUser?.id ?? null,
    userEmail: 'jornalistarinaldodanobrega@gmail.com',
    action: 'SEED_INICIAL',
    entityType: 'system',
    entityId: '1',
    details: 'Estrutura editorial inicial do Jornal Tribuna Almense criada no banco de dados.',
  });
}

export async function getUserByUid(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return rows[0] || null;
  } catch (err) {
    throw new Error('Erro ao consultar usuário.', { cause: err });
  }
}

export async function getUserByLogin(login: string) {
  try {
    const normalized = login.trim().toLowerCase();
    const rows = await db
      .select()
      .from(users)
      .where(or(eq(users.email, normalized), eq(users.username, normalized)))
      .limit(1);
    return rows[0] || null;
  } catch (err) {
    throw new Error('Erro ao buscar credenciais do usuário.', { cause: err });
  }
}

export async function getOrCreateFirebaseUser(uid: string, email: string, name: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const isAdminEmail = ADMIN_EMAILS.has(normalizedEmail);
    const existingByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingByEmail[0] && existingByEmail[0].uid !== uid) {
      const [updated] = await db
        .update(users)
        .set({
          uid,
          name: existingByEmail[0].name || name,
          role: isAdminEmail ? 'admin' : existingByEmail[0].role,
        })
        .where(eq(users.id, existingByEmail[0].id))
        .returning();
      return updated;
    }

    const result = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail,
        name: name || normalizedEmail.split('@')[0],
        role: isAdminEmail ? 'admin' : 'assinante',
        subscriptionPlan: isAdminEmail ? 'premium' : 'free',
        active: true,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: normalizedEmail,
          ...(isAdminEmail ? { role: 'admin', subscriptionPlan: 'premium' } : {}),
        },
      })
      .returning();

    return result[0];
  } catch (err) {
    throw new Error('Erro ao sincronizar perfil de usuário.', { cause: err });
  }
}

export async function getSiteSettingsMap(): Promise<Record<string, string>> {
  try {
    await ensureSeedData();
    const rows = await db.select().from(siteSettings);
    const map: Record<string, string> = {};
    for (const r of rows) {
      map[r.key] = r.value;
    }
    return map;
  } catch (err) {
    throw new Error('Erro ao carregar configurações do portal.', { cause: err });
  }
}

export async function getPortalBootstrap() {
  try {
    await ensureSeedData();
    const now = new Date();

    // Auto-publish scheduled articles whose scheduledAt <= now
    await db
      .update(articles)
      .set({ status: 'published', publishedAt: now, updatedAt: now })
      .where(and(eq(articles.status, 'scheduled'), lte(articles.scheduledAt, now)));

    const [
      settingsRows,
      cats,
      publishedArticles,
      mostReadArticles,
      publishedPodcasts,
      publishedVideos,
      allArtists,
      publishedSongs,
      activeAds,
    ] = await Promise.all([
      db.select().from(siteSettings),
      db.select().from(categories).orderBy(categories.sortOrder, categories.name),
      db
        .select()
        .from(articles)
        .where(eq(articles.status, 'published'))
        .orderBy(desc(articles.publishedAt))
        .limit(40),
      db
        .select()
        .from(articles)
        .where(eq(articles.status, 'published'))
        .orderBy(desc(articles.views))
        .limit(6),
      db
        .select()
        .from(podcasts)
        .where(eq(podcasts.status, 'published'))
        .orderBy(desc(podcasts.publishedAt))
        .limit(12),
      db
        .select()
        .from(videos)
        .where(eq(videos.status, 'published'))
        .orderBy(desc(videos.publishedAt))
        .limit(12),
      db.select().from(artists).orderBy(artists.name),
      db
        .select()
        .from(songs)
        .where(and(eq(songs.status, 'published'), eq(songs.rightsAuthorized, true)))
        .orderBy(desc(songs.publishedAt))
        .limit(20),
      db.select().from(ads).where(eq(ads.active, true)).orderBy(ads.id),
    ]);

    const settings: Record<string, string> = {};
    for (const s of settingsRows) settings[s.key] = s.value;

    const artistMap = new Map(allArtists.map((a) => [a.id, a]));
    const songsWithArtist = publishedSongs.map((s) => ({
      ...s,
      artist: artistMap.get(s.artistId) || null,
    }));

    return {
      settings,
      categories: cats,
      articles: publishedArticles,
      mostRead: mostReadArticles,
      podcasts: publishedPodcasts,
      videos: publishedVideos,
      artists: allArtists,
      songs: songsWithArtist,
      ads: activeAds,
    };
  } catch (err) {
    throw new Error('Erro ao carregar dados da página inicial.', { cause: err });
  }
}

export async function queryArticles(params: {
  category?: string;
  search?: string;
  includeAll?: boolean;
}) {
  try {
    await ensureSeedData();
    const conditions = [];
    if (!params.includeAll) {
      conditions.push(eq(articles.status, 'published'));
    }
    if (params.category && params.category !== 'all') {
      conditions.push(eq(articles.categorySlug, params.category));
    }
    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      conditions.push(
        or(
          ilike(articles.title, term),
          ilike(articles.summary, term),
          ilike(articles.subtitle, term)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    return await db
      .select()
      .from(articles)
      .where(whereClause)
      .orderBy(desc(articles.publishedAt));
  } catch (err) {
    throw new Error('Erro ao listar notícias.', { cause: err });
  }
}

export async function getArticleBySlugAndTrackView(slug: string) {
  try {
    await ensureSeedData();
    const rows = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1);
    const article = rows[0];
    if (!article) return null;

    if (article.status === 'published') {
      await db
        .update(articles)
        .set({ views: sql`${articles.views} + 1` })
        .where(eq(articles.id, article.id));
    }

    const approvedComments = await db
      .select()
      .from(comments)
      .where(and(eq(comments.articleId, article.id), eq(comments.status, 'approved')))
      .orderBy(desc(comments.createdAt));

    return {
      ...article,
      views: article.status === 'published' ? article.views + 1 : article.views,
      comments: approvedComments,
    };
  } catch (err) {
    throw new Error('Erro ao carregar notícia.', { cause: err });
  }
}

export async function createAuditLog(entry: {
  userId?: number | null;
  userEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      userId: entry.userId ?? null,
      userEmail: entry.userEmail,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId || '',
      details: entry.details || '',
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
