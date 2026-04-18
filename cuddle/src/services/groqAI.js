// Groq Cloud AI — generates personalized pet care tips
// Key: EXPO_PUBLIC_GROQ_API_KEY in cuddle/.env

import AsyncStorage from '@react-native-async-storage/async-storage';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL    = 'llama-3.1-8b-instant';
const TIP_TTL_MS    = 25 * 60 * 1000; // 25 min — alinha com o intervalo de 30 min do timer

function getKey() {
  return process.env.EXPO_PUBLIC_GROQ_API_KEY ?? null;
}

function cacheKey(pet) {
  return `@cuddle:tip:${pet.id ?? `${pet.species}_${pet.breed ?? 'sem_raca'}`}`;
}

async function getCached(pet) {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(pet));
    if (!raw) return null;
    const { tip, ts } = JSON.parse(raw);
    if (Date.now() - ts < TIP_TTL_MS) return tip;
    await AsyncStorage.removeItem(cacheKey(pet));
  } catch { /* ignore */ }
  return null;
}

async function setCached(pet, tip) {
  try {
    await AsyncStorage.setItem(cacheKey(pet), JSON.stringify({ tip, ts: Date.now() }));
  } catch { /* ignore */ }
}

const TIP_CATEGORIES = [
  'cuidados com higiene e banho',
  'alimentação e hidratação adequadas',
  'comportamento e estimulação mental',
  'exercício físico e brincadeiras',
  'sinais de bem-estar e felicidade',
  'cuidados com o pelo ou pele',
  'preferências de ambiente (temperatura, espaço, luz)',
  'socialização com humanos e outros animais',
  'cuidados preventivos (vacinas, vermífugos, antipulgas)',
  'sinais de estresse ou ansiedade e como acalmar',
  'curiosidades sobre o comportamento natural da espécie',
  'dicas de enriquecimento ambiental',
];

async function callGroq(pet) {
  const key = getKey();
  if (!key || key === 'sua_chave_groq_aqui') return null;

  const { name, species, breed, age } = pet;
  const ageText   = age != null ? `${age} ano(s)` : 'idade desconhecida';
  const breedText = breed && breed !== 'SRD' && breed !== 'Outro' ? `da raça ${breed}` : '';
  const category  = TIP_CATEGORIES[Math.floor(Math.random() * TIP_CATEGORIES.length)];

  const prompt = [
    `Você é um veterinário experiente. Gere UMA dica prática sobre "${category}"`,
    `específica para ${name}, um(a) ${species} ${breedText} com ${ageText}.`,
    `A dica deve ser relevante para a raça/espécie e útil no dia a dia do tutor.`,
    `Seja direto e positivo. Máximo 3 frases curtas. Apenas a dica, sem saudação. Em português.`,
  ].join(' ');

  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 220,
        temperature: 0.75,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns a tip for a pet — serves from cache when fresh, otherwise calls API.
 */
export async function generatePetTip(pet) {
  const cached = await getCached(pet);
  if (cached) return cached;

  const tip = await callGroq(pet);
  if (tip) await setCached(pet, tip);
  return tip;
}

/**
 * Picks a random pet from the list and returns a notification object.
 * Falls back to null if API is unavailable.
 */
export async function pickAITip(pets) {
  if (!pets?.length) return null;
  const pet = pets[Math.floor(Math.random() * pets.length)];
  const tip = await generatePetTip(pet);
  if (!tip) return null;
  return {
    id: `tip_${pet.id ?? pet.name}_${Date.now()}`,
    type: 'tip',
    petName: pet.name,
    species: pet.species,
    tip,
    isAI: true,
    ts: Date.now(),
  };
}
