// Groq Cloud AI — generates dashboard recommendations
// Key: EXPO_PUBLIC_GROQ_API_KEY in cuddle/.env

import AsyncStorage from '@react-native-async-storage/async-storage';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const RECS_TTL_MS = 6 * 60 * 60 * 1000; // 6h cache per district

function getKey() {
  return process.env.EXPO_PUBLIC_GROQ_API_KEY ?? null;
}

function cacheKey(region) {
  return `@cuddle:analytics:${region}`;
}

async function getCached(region) {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(region));
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts < RECS_TTL_MS) return data;
    await AsyncStorage.removeItem(cacheKey(region));
  } catch { /* ignore */ }
  return null;
}

async function setCached(region, data) {
  try {
    await AsyncStorage.setItem(cacheKey(region), JSON.stringify({ ts: Date.now(), data }));
  } catch { /* ignore */ }
}

function fmtPct(n) {
  if (!Number.isFinite(n)) return '--';
  return Number(n).toFixed(1).replace('.', ',');
}

function fmtPp(n) {
  if (!Number.isFinite(n)) return '--';
  const abs = Math.abs(Number(n));
  const absStr = abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(1);
  return `${n >= 0 ? '+' : '-'}${absStr.replace('.', ',')}pp`;
}

function buildPrompt(input) {
  const district = input.districtName || 'o distrito';
  const total = Number.isFinite(input.total) ? Math.round(input.total) : 'n/d';
  const women = fmtPct(input.womenPct);
  const men = fmtPct(input.menPct);
  const children = fmtPct(input.childrenPct);
  const adults = fmtPct(input.adultsPct);
  const elderly = fmtPct(input.elderlyPct);
  const elderlyDelta = fmtPp(input.elderlyDelta);
  const childrenDelta = fmtPp(input.childrenDelta);
  const adultsDelta = fmtPp(input.adultsDelta);

  return [
    'Você é um especialista em marketing para pet shops.',
    'Gere recomendações curtas e práticas com base nos dados abaixo.',
    `Distrito: ${district}. Populacao total: ${total}.`,
    `Mulheres: ${women}%. Homens: ${men}%. Criancas: ${children}%. Adultos: ${adults}%. Idosos: ${elderly}%.`,
    `Delta vs media: idosos ${elderlyDelta}, criancas ${childrenDelta}, adultos ${adultsDelta}.`,
    'Retorne APENAS JSON válido, sem markdown, exatamente no schema:',
    '{"cards":[{"tag":"Público-alvo principal","emoji":"🐕","title":"...","body":"..."},',
    '{"tag":"Oportunidade de produto","emoji":"🎽","title":"...","body":"..."},',
    '{"tag":"Serviço recomendado","emoji":"🐾","title":"...","body":"..."}],',
    '"opportunities":[{"emoji":"🍖","title":"...","body":"..."},',
    '{"emoji":"🏥","title":"...","body":"..."},',
    '{"emoji":"📱","title":"...","body":"..."},',
    '{"emoji":"🎉","title":"...","body":"..."}] }',
    'Regras: Português, 1-2 frases por item, sem saudações, sem listas.',
  ].join(' ');
}

function fallbackRecommendations(input) {
  const district = input.districtName || 'o distrito';
  const adults = fmtPct(input.adultsPct);
  const children = fmtPct(input.childrenPct);
  const elderly = fmtPct(input.elderlyPct);
  const elderlyDelta = fmtPp(input.elderlyDelta);

  return {
    cards: [
      {
        tag: 'Público-alvo principal',
        emoji: '🐕',
        title: 'Adultos ativos e famílias jovens',
        body: `${adults}% de adultos em idade ativa. ${children}% de crianças indica famílias jovens — ideal para pets de companhia.`,
      },
      {
        tag: 'Oportunidade de produto',
        emoji: '🎽',
        title: 'Acessórios esportivos e passeios',
        body: `Bairro jovem e dinâmico, poucos idosos (${elderly}%). Priorize produtos ativos: coleiras, camas portáteis e brinquedos.`,
      },
      {
        tag: 'Serviço recomendado',
        emoji: '🐾',
        title: 'Adestramento e socialização',
        body: `Famílias com crianças buscam pets bem-treinados. Ofereça pacotes de adestramento e eventos de socialização no bairro.`,
      },
    ],
    opportunities: [
      {
        emoji: '🍖',
        title: 'Nutrição premium',
        body: 'Adultos com renda ativa investem mais em alimentação de qualidade.',
      },
      {
        emoji: '🏥',
        title: 'Plano de saúde pet',
        body: `Variação de idosos (${elderlyDelta}) indica tutores mais atentos a cuidados de saúde.`,
      },
      {
        emoji: '📱',
        title: 'App e fidelidade',
        body: 'Público jovem e digital: programa de pontos via app tem alta adesão.',
      },
      {
        emoji: '🎉',
        title: 'Eventos e comunidade',
        body: `Famílias jovens em ${district}: eventos pet-friendly geram vínculo e divulgação orgânica.`,
      },
    ],
  };
}

function normalizeResponse(data, input) {
  if (!data || typeof data !== 'object') return fallbackRecommendations(input);
  const cards = Array.isArray(data.cards) ? data.cards : [];
  const opps = Array.isArray(data.opportunities) ? data.opportunities : [];

  if (cards.length !== 3 || opps.length !== 4) return fallbackRecommendations(input);

  return {
    cards: cards.map((c, i) => ({
      tag: c.tag || '',
      emoji: c.emoji || '',
      title: c.title || '',
      body: c.body || '',
    })),
    opportunities: opps.map((o) => ({
      emoji: o.emoji || '',
      title: o.title || '',
      body: o.body || '',
    })),
  };
}

async function callGroq(input) {
  const key = getKey();
  if (!key || key === 'sua_chave_groq_aqui') return null;

  const prompt = buildPrompt(input);

  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 700,
        temperature: 0.6,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function getDashboardRecommendations(input) {
  const regionKey = input?.region || input?.districtName || 'district';

  const cached = await getCached(regionKey);
  if (cached) return cached;

  const ai = await callGroq(input);
  const normalized = normalizeResponse(ai, input);

  await setCached(regionKey, normalized);
  return normalized;
}
