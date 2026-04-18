// Pet care tips keyed by species (lowercased), with generic fallbacks.
// Each entry is an array of tip strings.

const TIPS_BY_SPECIES = {
  cachorro: [
    'Cães precisam de pelo menos 30 minutos de atividade física por dia.',
    'Escove os dentes do seu cão pelo menos 2–3 vezes por semana para evitar problemas dentários.',
    'Mantenha as vacinas em dia — visite o veterinário anualmente.',
    'Água fresca sempre disponível é essencial, especialmente em dias quentes.',
    'Interação social e brincadeiras reduzem ansiedade em cães.',
    'Evite alimentar com ossos cozidos — eles podem se partir e machucar.',
  ],
  gato: [
    'Gatos precisam de caixas de areia limpas — limpe pelo menos uma vez ao dia.',
    'Ofereça ambientes elevados para que seu gato se sinta seguro e estimulado.',
    'Escove o pelo do seu gato regularmente para evitar bolas de pelo.',
    'Gatos hidratados são gatos saudáveis — considere oferecer água corrente (fonte).',
    'Brinquedos de caça simulam o instinto natural e mantêm o gato ativo.',
    'Consulte um veterinário se o gato parar de comer por mais de 24h.',
  ],
  ave: [
    'Aves precisam de luz natural ou UVB para sintetizar vitamina D.',
    'Renove a água e a comida das aves diariamente para evitar infecções.',
    'Enriquecimento ambiental com brinquedos e poleiros reduz o estresse.',
    'Nunca use sprays ou perfumes perto das aves — os pulmões delas são muito sensíveis.',
    'Aves são animais sociais; considere ter ao menos um companheiro para ela.',
  ],
  peixe: [
    'Troque cerca de 20–30% da água do aquário semanalmente.',
    'Monitore o pH e temperatura da água regularmente.',
    'Não alimente em excesso — restos de comida contaminam a água.',
    'Deixe o aquário longe de luz solar direta para evitar crescimento excessivo de algas.',
  ],
  hamster: [
    'Hamsters são noturnos — evite perturbá-los durante o dia.',
    'A roda de exercícios é essencial para o bem-estar do hamster.',
    'Troque a cama da gaiola semanalmente para manter a higiene.',
    'Hamsters precisam de espaço para cavar — use pelo menos 15 cm de substrato.',
  ],
};

const TIPS_BY_COAT = {
  longo: [
    'Pelos longos precisam de escovação diária para evitar nós e emaranhados.',
    'Considere um tosa preventiva a cada 2–3 meses para pelos longos.',
  ],
  curto: [
    'Mesmo pelos curtos se beneficiam de escovação semanal para remover pelos mortos.',
  ],
  crespo: [
    'Pelos crespos requerem hidratação extra — use condicionador específico para pets.',
  ],
};

const TIPS_BY_AGE = {
  filhote: [
    'Filhotes precisam de vacinas com frequência — siga o calendário do veterinário.',
    'A socialização precoce (2–4 meses) é fundamental para um temperamento equilibrado.',
    'Filhotes dormem muito — isso é normal e importante para o desenvolvimento.',
  ],
  adulto: [
    'Pets adultos se beneficiam de check-ups anuais para monitorar saúde geral.',
    'Mantenha o peso ideal — obesidade é a causa mais comum de problemas articulares.',
  ],
  idoso: [
    'Pets idosos devem visitar o veterinário a cada 6 meses.',
    'Rampas e camas ortopédicas ajudam pets mais velhos com dificuldades de mobilidade.',
    'Dietas especiais para sênior ajudam a manter os rins e articulações saudáveis.',
    'Observe mudanças de comportamento — podem indicar dor ou problemas cognitivos.',
  ],
};

const GENERIC_TIPS = [
  'Visitas regulares ao veterinário previnem problemas antes que se tornem sérios.',
  'Manter o ambiente limpo e livre de parasitas é essencial para a saúde do seu pet.',
  'Amor e atenção são tão importantes quanto alimentação e saúde física.',
  'Certifique-se de que seu pet tem identificação (microchip ou coleira com plaquinha).',
  'Castração reduz o risco de vários tipos de câncer e comportamentos indesejados.',
];

function getAgeCategory(age) {
  if (age === undefined || age === null) return 'adulto';
  if (age <= 1) return 'filhote';
  if (age >= 8) return 'idoso';
  return 'adulto';
}

/**
 * Gera um array de dicas para um pet com base em seus dados.
 * @param {Object} pet - { name, species, breed, coat, age, sex }
 * @returns {string[]}
 */
export function getTipsForPet(pet) {
  const tips = new Set();

  const speciesKey = (pet.species || '').toLowerCase();
  const coatKey = (pet.coat || '').toLowerCase();
  const ageCategory = getAgeCategory(pet.age);

  // Species tips
  const speciesTips = TIPS_BY_SPECIES[speciesKey] || TIPS_BY_SPECIES['cachorro'];
  speciesTips.forEach((t) => tips.add(t));

  // Coat tips
  for (const [key, tipList] of Object.entries(TIPS_BY_COAT)) {
    if (coatKey.includes(key)) tipList.forEach((t) => tips.add(t));
  }

  // Age tips
  (TIPS_BY_AGE[ageCategory] || []).forEach((t) => tips.add(t));

  // Always add some generic tips
  GENERIC_TIPS.slice(0, 2).forEach((t) => tips.add(t));

  return Array.from(tips);
}

/**
 * Seleciona uma dica aleatória para um conjunto de pets.
 * Retorna um objeto { petName, tip } ou null se não houver pets.
 * @param {Array} pets
 */
export function pickRandomTip(pets) {
  if (!pets || pets.length === 0) return null;

  const pet = pets[Math.floor(Math.random() * pets.length)];
  const tips = getTipsForPet(pet);
  const tip = tips[Math.floor(Math.random() * tips.length)];

  return { petName: pet.name, species: pet.species, tip };
}
