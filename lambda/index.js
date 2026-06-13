const Alexa = require('ask-sdk-core');
const { DynamoDbPersistenceAdapterV3 } = require('./dynamodb-persistence-adapter');

const TIME_ZONE = 'America/Sao_Paulo';
const WATER_GOAL_ML = 3000;
const WATER_DEADLINE_HOUR = 20;
const WATER_MIN_ML = 100;
const WATER_MAX_ML = 5000;
const DEFAULT_LAST_HAIRCUT = '2026-04-30';

const TASK_DEFS = {
  malhar: { label: 'Malhar', required: true, targetDaily: 1 },
  agua: { label: 'Beber água', required: true, targetDaily: 1, waterTracked: true },
  chante: { label: 'Cuidar da Xantê', required: true, targetDaily: 1, window: 'morning_or_night' },
  meditar_guias: { label: 'Meditar e conversar com os guias', required: true, targetDaily: 2 },
  evitar_besteira: { label: 'Não comer besteira', required: true, targetDaily: 1 },

  curso_coursera: { label: 'Curso Coursera', required: false, targetDaily: 1 },
  curso_tera: { label: 'Curso Tera', required: false, targetDaily: 1 },
  curso_itau: { label: 'Curso Itaú', required: false, targetDaily: 1 },
  livro_estrategia_criativa: { label: 'Escrever livro Estratégia Criativa', required: false, targetDaily: 1 },
  livro_priorizacao: { label: 'Escrever livro de Técnicas de Priorização', required: false, targetDaily: 1 },
  livro_pm_tecnico: { label: 'Escrever livro de Product Manager Técnico', required: false, targetDaily: 1 },
  meditar: { label: 'Meditar', required: false, targetDaily: 1 },
  skin_care: { label: 'Skin care', required: false, targetDaily: 1 },
  entrevistas_ingles: { label: 'Treinar entrevistas em inglês', required: false, targetDaily: 1 },
  estudar_frances: { label: 'Estudar francês', required: false, targetDaily: 1 },
  estudar_italiano: { label: 'Estudar italiano', required: false, targetDaily: 1 },
  revisar_backlog: { label: 'Revisar backlog e lista de tarefas', required: false, targetDaily: 1 },
  remedios: { label: 'Tomar remédios', required: false, targetDaily: 2 },
  escovar_dentes: { label: 'Escovar os dentes', required: false, targetDaily: 3 },
  aplicar_vagas: { label: 'Aplicar para vagas de trabalho', required: false, targetDaily: 1 },
  artigo_linkedin: { label: 'Escrever artigo para o LinkedIn', required: false, targetDaily: 1 },
  comprar_frutas_legumes_verduras: { label: 'Comprar frutas, legumes e verduras', required: false, targetDaily: 1 },
  cabelo_barba: { label: 'Cortar cabelo e fazer barba', required: false, monthly: true },
  nadar: { label: 'Nadar', required: false, targetDaily: 1 },
  jiu_jitsu: { label: 'Fazer jiu-jitsu', required: false, targetDaily: 1 },
  verificar_vacinas: { label: 'Verificar vacinas atualizadas', required: false, targetDaily: 1 },
  projeto_nutriflow: { label: 'Projeto NutriFlow', required: false, targetDaily: 1 },
  projeto_ensina_brasil: { label: 'Projeto Ensina Brasil', required: false, targetDaily: 1 },
  outros_projetos: { label: 'Outros projetos', required: false, targetDaily: 1 }
};

const TASK_ALIASES = {
  malhar: 'malhar',
  treino: 'malhar',
  academia: 'malhar',
  agua: 'agua',
  'beber agua': 'agua',
  hidratar: 'agua',
  chante: 'chante',
  xante: 'chante',
  'cuidar da chante': 'chante',
  'cuidar da xante': 'chante',
  guias: 'meditar_guias',
  'meditar com guias': 'meditar_guias',
  'meditar e conversar com os guias': 'meditar_guias',
  'nao comer besteira': 'evitar_besteira',
  besteira: 'evitar_besteira',
  coursera: 'curso_coursera',
  'curso coursera': 'curso_coursera',
  'curso da coursera': 'curso_coursera',
  'aula coursera': 'curso_coursera',
  'aulas coursera': 'curso_coursera',
  tera: 'curso_tera',
  'curso tera': 'curso_tera',
  itau: 'curso_itau',
  'curso itau': 'curso_itau',
  'livro estrategia criativa': 'livro_estrategia_criativa',
  'livro de priorizacao': 'livro_priorizacao',
  'livro pm tecnico': 'livro_pm_tecnico',
  meditar: 'meditar',
  'skin care': 'skin_care',
  skincare: 'skin_care',
  'entrevistas em ingles': 'entrevistas_ingles',
  frances: 'estudar_frances',
  italiano: 'estudar_italiano',
  backlog: 'revisar_backlog',
  remedios: 'remedios',
  'escovar os dentes': 'escovar_dentes',
  vagas: 'aplicar_vagas',
  linkedin: 'artigo_linkedin',
  'artigo linkedin': 'artigo_linkedin',
  'artigo no linkedin': 'artigo_linkedin',
  'escrever artigo linkedin': 'artigo_linkedin',
  'escrever artigo no linkedin': 'artigo_linkedin',
  frutas: 'comprar_frutas_legumes_verduras',
  legumes: 'comprar_frutas_legumes_verduras',
  verduras: 'comprar_frutas_legumes_verduras',
  'cabelo e barba': 'cabelo_barba',
  cabelo: 'cabelo_barba',
  barba: 'cabelo_barba',
  nadar: 'nadar',
  'jiu jitsu': 'jiu_jitsu',
  vacinas: 'verificar_vacinas',
  nutriflow: 'projeto_nutriflow',
  'ensina brasil': 'projeto_ensina_brasil',
  'outros projetos': 'outros_projetos',
  'outro projeto': 'outros_projetos'
};

const MOTIVATION_LINES = {
  steady: [
    'Respira e executa: uma ação de cada vez.',
    'Menos pressa, mais constância. O plano funciona quando você funciona.',
    'Sem teatro. Só faz o próximo passo certo.'
  ],
  firm: [
    'Você quer resultado? Então para de negociar com a preguiça.',
    'Disciplina não pede aplauso, pede repetição.',
    'Seu futuro agradece quando seu agora para de enrolar.'
  ],
  spicy: [
    'Não romantiza a procrastinação. Faz o que tem que ser feito.',
    'Você pediu mudança, não desculpa premium.',
    'Se fosse fácil, qualquer um seria você. Bora executar.'
  ]
};

const REMINDERS_SCOPE = 'alexa::alerts:reminders:skill:readwrite';

function ensureReminders(profile) {
  if (!profile.reminders || typeof profile.reminders !== 'object') {
    profile.reminders = {};
  }
  if (!profile.reminders.tokensByKey || typeof profile.reminders.tokensByKey !== 'object') {
    profile.reminders.tokensByKey = {};
  }
  if (!Array.isArray(profile.reminders.pendingAcks)) {
    profile.reminders.pendingAcks = [];
  }
  if (!Array.isArray(profile.reminders.inconclusive)) {
    profile.reminders.inconclusive = [];
  }
  if (typeof profile.reminders.enabled !== 'boolean') {
    profile.reminders.enabled = false;
  }
  if (typeof profile.reminders.paused !== 'boolean') {
    profile.reminders.paused = false;
  }
  if (typeof profile.reminders.awayMode !== 'boolean') {
    profile.reminders.awayMode = false;
  }
}

function buildReminderSchedules(profile) {
  const schedules = [];
  const awayMode = !!(profile && profile.reminders && profile.reminders.awayMode);

  const waterLines = [
    'Se seu xixi não está mais frequente, ajuste a hidratação.',
    'Não fique com boca seca, se hidrate!',
    'Lucas, hora da água. Bebe água e depois confirma na skill: confirmar lembrete água.'
  ];

  const foodLines = [
    'Vença sua ansiedade evitando comer besteira, só pela próxima hora. Vença essa batalha!',
    'O prazer da comida passa em minutos, seus resultados são prejudicados por meses. Não se sabote!',
    'Eu tô chata? Pior é você quando se culpa por não ter se movimentado para algo que você mesmo quer ser.'
  ];

  if (awayMode) {
    for (let hour = 8; hour <= 20; hour += 2) {
      const waterText = waterLines[(hour - 8) % waterLines.length];
      schedules.push({
        key: `away_agua_${hour}_00`,
        hour,
        minute: 0,
        text: `${waterText} Se estiver fora, fica no push do app e confirma quando puder.`
      });
    }

    [
      { key: 'away_jornada_1100', hour: 11, minute: 0, text: 'Pare de controlar tudo. Aceita a jornada e segue firme.' },
      { key: 'away_perdao_1800', hour: 18, minute: 0, text: 'Não se culpe. Se perdoe e volta para o foco.' },
      { key: 'away_risco_1900', hour: 19, minute: 0, text: 'Alerta de risco: confere as obrigatórias antes das 20h.' },
      { key: 'away_gratidao_1930', hour: 19, minute: 30, text: 'Pelo que você foi grato hoje?' },
      { key: 'away_risco_2000', hour: 20, minute: 0, text: 'Meta obrigatória em risco. Fecha água, Xante e treino hoje.' }
    ].forEach((item) => schedules.push(item));
  } else {
    for (let hour = 5; hour <= 20; hour += 1) {
      const waterText = waterLines[(hour - 5) % waterLines.length];
      schedules.push({
        key: `agua_${hour}_00`,
        hour,
        minute: 0,
        text: waterText
      });

      if (hour <= 19) {
        const foodText = foodLines[(hour - 5) % foodLines.length];
        schedules.push({
          key: `besteira_${hour}_30`,
          hour,
          minute: 30,
          text: foodText
        });
      }
    }

    [
      { key: 'malhar_0430', hour: 4, minute: 30, text: 'Levanta para malhar. Você não tem escolha. Executa.' },
      { key: 'guias_0450', hour: 4, minute: 50, text: 'Meditar e conversar com os guias, primeira rodada do dia.' },
      { key: 'guias_2230', hour: 22, minute: 30, text: 'Meditar e conversar com os guias antes de dormir.' },
      { key: 'chante_0830', hour: 8, minute: 30, text: 'Cuidado da Xante: bloco da manhã.' },
      { key: 'chante_2030', hour: 20, minute: 30, text: 'Se a Xante não foi cuidada de manhã, fecha agora à noite.' },
      { key: 'remedios_0800', hour: 8, minute: 0, text: 'Hora do remédio da manhã.' },
      { key: 'remedios_2000', hour: 20, minute: 0, text: 'Hora do remédio da noite.' },
      { key: 'dentes_0700', hour: 7, minute: 0, text: 'Escovar os dentes, bloco um.' },
      { key: 'dentes_1400', hour: 14, minute: 0, text: 'Escovar os dentes, bloco dois.' },
      { key: 'dentes_2200', hour: 22, minute: 0, text: 'Escovar os dentes, bloco três.' },
      { key: 'jornada_1100', hour: 11, minute: 0, text: 'Pare de controlar tudo. Aceita a jornada e segue firme.' },
      { key: 'perdao_1800', hour: 18, minute: 0, text: 'Não se culpe, se perdoe. Fecha o dia com cabeça limpa.' },
      { key: 'gratidao_1930', hour: 19, minute: 30, text: 'Pelo que você foi grato hoje?' },
      { key: 'risco_1900', hour: 19, minute: 0, text: 'Meta obrigatória em risco? Fecha água, Xante e treino antes da virada.' }
    ].forEach((item) => schedules.push(item));
  }

  return schedules;
}

function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeSsml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getDateKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date());
}

function getHour() {
  return Number(new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    hour12: false
  }).format(new Date()));
}

function getMinute() {
  return Number(new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    minute: '2-digit'
  }).format(new Date()));
}

function getRoutinePhase(day) {
  if (day?.closed) {
    return 'encerrado';
  }
  const hour = getHour();
  if (hour < 12) {
    return 'manha';
  }
  if (hour < 18) {
    return 'tarde';
  }
  return 'noite';
}

function phaseSpeechLabel(phase) {
  if (phase === 'manha') {
    return 'manhã';
  }
  if (phase === 'tarde') {
    return 'tarde';
  }
  if (phase === 'noite') {
    return 'noite';
  }
  return phase || 'dia';
}

function safeObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function baseTaskCounts() {
  const result = {};
  Object.keys(TASK_DEFS).forEach((id) => { result[id] = 0; });
  return result;
}

function newDay(dateKey) {
  return {
    date: dateKey,
    closed: false,
    taskCounts: baseTaskCounts(),
    waterMl: 0,
    lastWaterLogAt: null,
    customToday: [],
    completedCustomToday: {},
    completedPermanent: {},
    awaitingWaterAmount: false,
    awaitingProjectDetail: false,
    awaitingCustomTaskName: false,
    awaitingCustomTaskScope: false,
    pendingCustomTaskLabel: '',
    awaitingMarkNewTaskDone: false,
    pendingNewTaskScope: '',
    pendingNewTaskId: '',
    pendingNewTaskLabel: '',
    otherProjectsWorked: [],
    lastMotivationHour: null,
    lastJunkReminderHour: null
  };
}

function defaultProfile() {
  return {
    permanentTasks: [],
    history: {},
    meta: {
      lastHaircutDate: DEFAULT_LAST_HAIRCUT
    },
    day: null
  };
}

function parseDateIso(dateIso) {
  return new Date(`${dateIso}T12:00:00`);
}

function addMonth(dateIso) {
  const dt = parseDateIso(dateIso);
  dt.setMonth(dt.getMonth() + 1);
  return dt;
}

function formatDatePt(dateObj) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric' }).format(dateObj);
}

function haircutDueInfo(profile) {
  const last = profile.meta.lastHaircutDate || DEFAULT_LAST_HAIRCUT;
  const due = addMonth(last);
  const now = new Date();
  const overdue = now.getTime() > due.getTime();
  return { last, due, overdue };
}

function totalConcludedItems(day, profile) {
  const baseDone = Object.keys(TASK_DEFS).filter((id) => isTaskDoneByCount(id, day, profile)).length;
  const customTodayDone = Object.keys(day.completedCustomToday || {}).filter((k) => day.completedCustomToday[k]).length;
  const permanentDone = Object.keys(day.completedPermanent || {}).filter((k) => day.completedPermanent[k]).length;
  return baseDone + customTodayDone + permanentDone;
}

function isTaskDoneByCount(taskId, day, profile) {
  if (taskId === 'agua') {
    return (day.waterMl || 0) >= WATER_GOAL_ML;
  }
  if (taskId === 'cabelo_barba') {
    const info = haircutDueInfo(profile);
    return !info.overdue;
  }
  const def = TASK_DEFS[taskId];
  if (!def) {
    return false;
  }
  const count = (day.taskCounts && day.taskCounts[taskId]) || 0;
  const target = def.targetDaily || 1;
  return count >= target;
}

function getMissingRequired(day, profile) {
  return Object.keys(TASK_DEFS)
    .filter((id) => TASK_DEFS[id].required)
    .filter((id) => !isTaskDoneByCount(id, day, profile))
    .map((id) => TASK_DEFS[id].label);
}

function getRequiredTaskIds() {
  return Object.keys(TASK_DEFS).filter((id) => TASK_DEFS[id].required);
}

function getOptionalTaskIds() {
  return Object.keys(TASK_DEFS).filter((id) => !TASK_DEFS[id].required);
}

function getMissingOptional(day, profile) {
  return getOptionalTaskIds()
    .filter((id) => !isTaskDoneByCount(id, day, profile))
    .map((id) => TASK_DEFS[id].label);
}

function taskCountSummary(day, profile) {
  const requiredIds = getRequiredTaskIds();
  const optionalIds = getOptionalTaskIds();
  const requiredPending = requiredIds.filter((id) => !isTaskDoneByCount(id, day, profile)).length;
  const optionalPending = optionalIds.filter((id) => !isTaskDoneByCount(id, day, profile)).length;

  return {
    requiredTotal: requiredIds.length,
    requiredPending,
    requiredDone: requiredIds.length - requiredPending,
    optionalTotal: optionalIds.length,
    optionalPending,
    optionalDone: optionalIds.length - optionalPending
  };
}

function archiveDay(profile, day) {
  if (!day || !day.date) {
    return;
  }
  profile.history[day.date] = {
    totalConcludedItems: totalConcludedItems(day, profile),
    requiredDone: getMissingRequired(day, profile).length === 0,
    waterMl: day.waterMl || 0
  };
}

function ensureDay(profile) {
  ensureReminders(profile);
  profile.history = safeObject(profile.history);
  if (!Array.isArray(profile.permanentTasks)) {
    profile.permanentTasks = [];
  }
  profile.meta = safeObject(profile.meta);
  if (!profile.meta.lastHaircutDate) {
    profile.meta.lastHaircutDate = DEFAULT_LAST_HAIRCUT;
  }

  const today = getDateKey();
  if (!profile.day) {
    profile.day = newDay(today);
    return;
  }
  if (profile.day.date !== today) {
    archiveDay(profile, profile.day);
    profile.day = newDay(today);
  }

  if (typeof profile.day.awaitingCustomTaskName !== 'boolean') {
    profile.day.awaitingCustomTaskName = false;
  }
  if (typeof profile.day.awaitingCustomTaskScope !== 'boolean') {
    profile.day.awaitingCustomTaskScope = false;
  }
  if (typeof profile.day.pendingCustomTaskLabel !== 'string') {
    profile.day.pendingCustomTaskLabel = '';
  }
  if (typeof profile.day.awaitingMarkNewTaskDone !== 'boolean') {
    profile.day.awaitingMarkNewTaskDone = false;
  }
  if (typeof profile.day.pendingNewTaskScope !== 'string') {
    profile.day.pendingNewTaskScope = '';
  }
  if (typeof profile.day.pendingNewTaskId !== 'string') {
    profile.day.pendingNewTaskId = '';
  }
  if (typeof profile.day.pendingNewTaskLabel !== 'string') {
    profile.day.pendingNewTaskLabel = '';
  }
}

function motivationBucket(day, profile) {
  if (!day || !profile) {
    return 'firm';
  }
  const missingRequired = getMissingRequired(day, profile).length;
  const phase = getRoutinePhase(day);
  if (phase === 'noite' && missingRequired >= 2) {
    return 'spicy';
  }
  if (missingRequired >= 1) {
    return 'firm';
  }
  return 'steady';
}

function randomFirmLine(day, profile) {
  const bucket = motivationBucket(day, profile);
  const lines = MOTIVATION_LINES[bucket] || MOTIVATION_LINES.firm;
  return lines[Math.floor(Math.random() * lines.length)];
}

function findYesterdayHistory(profile) {
  const keys = Object.keys(profile.history || {}).sort();
  if (keys.length === 0) {
    return null;
  }
  return profile.history[keys[keys.length - 1]];
}

function waterProgressText(day) {
  const ml = day.waterMl || 0;
  const percent = Math.min(100, Math.round((ml / WATER_GOAL_ML) * 100));
  const missing = Math.max(0, WATER_GOAL_ML - ml);
  const warning = (getHour() >= WATER_DEADLINE_HOUR && ml < WATER_GOAL_ML)
    ? 'Já passou da janela das 20h para bater meta de água. Ainda dá para corrigir.'
    : '';
  return `Água: ${percent}% da meta. Falta ${missing} ml.${warning ? ` ${warning}` : ''}`;
}

function parseQuantityToMl(quantityRaw, unitRaw) {
  if (!quantityRaw) {
    return null;
  }
  const unit = normalizeText(unitRaw || '');
  if (unit && !unit.includes('ml') && !unit.includes('mililitro')) {
    return null;
  }

  const raw = String(quantityRaw).trim();
  const candidates = [];

  const normalizedNumeric = Number(raw.replace(/\./g, '').replace(',', '.'));
  if (Number.isFinite(normalizedNumeric) && normalizedNumeric > 0) {
    candidates.push(Math.round(normalizedNumeric));
  }

  const digitsOnly = raw.replace(/\D/g, '');
  if (digitsOnly) {
    candidates.push(Number.parseInt(digitsOnly, 10));
  }

  const ml = candidates.find((value) =>
    Number.isInteger(value) && value >= WATER_MIN_ML && value <= WATER_MAX_ML);

  return ml || null;
}

function registerWater(day, ml) {
  day.waterMl = (day.waterMl || 0) + ml;
  day.lastWaterLogAt = new Date().toISOString();
  day.awaitingWaterAmount = false;
  incrementTask(day, 'agua');
}

function clearCustomTaskFlow(day) {
  day.awaitingCustomTaskName = false;
  day.awaitingCustomTaskScope = false;
  day.pendingCustomTaskLabel = '';
}

function clearMarkNewTaskDoneFlow(day) {
  day.awaitingMarkNewTaskDone = false;
  day.pendingNewTaskScope = '';
  day.pendingNewTaskId = '';
  day.pendingNewTaskLabel = '';
}

function askMarkNewTaskDone(day, result) {
  if (!result || !result.ok || !result.task) {
    clearMarkNewTaskDoneFlow(day);
    return result && result.message ? result.message : 'Não consegui cadastrar essa tarefa.';
  }
  day.awaitingMarkNewTaskDone = true;
  day.pendingNewTaskScope = result.task.scope;
  day.pendingNewTaskId = result.task.id;
  day.pendingNewTaskLabel = result.task.label;
  return `${result.message} Você quer marcar ela como concluída agora?`;
}

function markPendingNewTaskAsDone(day) {
  const scope = day.pendingNewTaskScope;
  const id = day.pendingNewTaskId;
  const label = day.pendingNewTaskLabel || 'tarefa';
  if (!id || !scope) {
    return { ok: false, label };
  }
  if (scope === 'today') {
    day.completedCustomToday[id] = true;
  } else if (scope === 'permanent') {
    day.completedPermanent[id] = true;
  } else {
    return { ok: false, label };
  }
  return { ok: true, label };
}

function cleanTaskLabel(raw) {
  return String(raw || '')
    .trim()
    .replace(/^tarefa\s+/i, '')
    .trim();
}

function resolveCustomTaskScope(scopeRaw) {
  const normalized = normalizeText(scopeRaw);
  if (!normalized) {
    return null;
  }
  if (
    normalized.includes('sempre')
    || normalized.includes('recorrente')
    || normalized.includes('permanente')
    || normalized.includes('fixa')
  ) {
    return 'sempre';
  }
  if (
    normalized.includes('hoje')
    || normalized.includes('pontual')
    || normalized.includes('so hoje')
  ) {
    return 'hoje';
  }
  return null;
}

function resolveTask(taskRaw) {
  const normalized = normalizeText(taskRaw)
    .replace(/^(concluir|finalizar|finalizei|terminei|fiz)\s+/, '')
    .trim();
  if (!normalized) {
    return null;
  }
  if (TASK_DEFS[normalized]) {
    return normalized;
  }
  const aliasMatch = TASK_ALIASES[normalized];
  if (aliasMatch) {
    return aliasMatch;
  }

  // Fallback por palavras-chave para frases mais livres vindas de SearchQuery.
  if (
    normalized.includes('coursera')
    || normalized.includes('cursera')
    || normalized.includes('cour sera')
    || (normalized.includes('curso') && normalized.includes('sera'))
  ) {
    return 'curso_coursera';
  }
  if (normalized.includes('linkedin') || (normalized.includes('artigo') && normalized.includes('linke'))) {
    return 'artigo_linkedin';
  }
  if (normalized.includes('xante') || normalized.includes('chante')) {
    return 'chante';
  }
  if (normalized.includes('agua') || normalized.includes('hidrata')) {
    return 'agua';
  }
  return null;
}

function inAllowedWindow(taskId) {
  if (taskId !== 'chante') {
    return true;
  }
  const hour = getHour();
  return (hour >= 5 && hour <= 11) || (hour >= 18 && hour <= 23);
}

function incrementTask(day, taskId) {
  day.taskCounts = safeObject(day.taskCounts);
  if (typeof day.taskCounts[taskId] !== 'number') {
    day.taskCounts[taskId] = 0;
  }
  day.taskCounts[taskId] += 1;
}

function findCustomTask(day, profile, taskRaw) {
  const normalized = normalizeText(taskRaw);
  if (!normalized) {
    return null;
  }
  const todayTask = (day.customToday || []).find((t) => normalizeText(t.label) === normalized);
  if (todayTask) {
    return { scope: 'today', id: todayTask.id, label: todayTask.label };
  }
  const permanentTask = (profile.permanentTasks || []).find((t) => normalizeText(t.label) === normalized);
  if (permanentTask) {
    return { scope: 'permanent', id: permanentTask.id, label: permanentTask.label };
  }
  return null;
}

function addCustomTask(day, profile, label, scope) {
  const clean = (label || '').trim();
  if (!clean) {
    return { ok: false, message: 'Não consegui entender o nome da tarefa.' };
  }
  if (resolveTask(clean)) {
    return { ok: false, message: 'Essa tarefa já existe no catálogo principal.' };
  }

  if (scope === 'sempre') {
    const exists = (profile.permanentTasks || []).find((t) => normalizeText(t.label) === normalizeText(clean));
    if (exists) {
      return { ok: false, message: 'Essa tarefa permanente já está cadastrada.' };
    }
    const id = `perm-${Date.now()}`;
    profile.permanentTasks.push({ id, label: clean });
    day.completedPermanent[id] = false;
    return {
      ok: true,
      message: `Tarefa permanente cadastrada: ${clean}.`,
      task: { scope: 'permanent', id, label: clean }
    };
  }

  const existsToday = (day.customToday || []).find((t) => normalizeText(t.label) === normalizeText(clean));
  if (existsToday) {
    return { ok: false, message: 'Essa tarefa já está no plano de hoje.' };
  }
  const id = `today-${Date.now()}`;
  day.customToday.push({ id, label: clean });
  day.completedCustomToday[id] = false;
  return {
    ok: true,
    message: `Tarefa de hoje cadastrada: ${clean}.`,
    task: { scope: 'today', id, label: clean }
  };
}

function pendingSummary(day, profile) {
  const basePending = Object.keys(TASK_DEFS).filter((id) => !isTaskDoneByCount(id, day, profile));
  const customPending = Object.keys(day.completedCustomToday || {}).filter((id) => !day.completedCustomToday[id]).length;
  const permPending = Object.keys(day.completedPermanent || {}).filter((id) => !day.completedPermanent[id]).length;
  return { basePending, customPending, permPending };
}

function taskProgressDetail(taskId, day, profile) {
  if (taskId === 'agua') {
    const ml = day.waterMl || 0;
    const percent = Math.min(100, Math.round((ml / WATER_GOAL_ML) * 100));
    return `${ml}ml/${WATER_GOAL_ML}ml (${percent}%)`;
  }
  if (taskId === 'cabelo_barba') {
    const hair = haircutDueInfo(profile);
    return hair.overdue ? `vencido desde ${formatDatePt(hair.due)}` : `em dia ate ${formatDatePt(hair.due)}`;
  }
  const count = (day.taskCounts && day.taskCounts[taskId]) || 0;
  const target = TASK_DEFS[taskId].targetDaily || 1;
  return `${count}/${target}`;
}

function buildAuditRows(day, profile) {
  const baseRows = Object.keys(TASK_DEFS).map((taskId) => {
    const def = TASK_DEFS[taskId];
    const done = isTaskDoneByCount(taskId, day, profile);
    return {
      group: def.required ? 'required' : 'optional',
      label: def.label,
      done,
      detail: `${def.monthly ? 'mensal' : `diaria ${def.targetDaily || 1}x`} | ${taskProgressDetail(taskId, day, profile)}`
    };
  });

  const customTodayRows = (day.customToday || []).map((task) => ({
    group: 'custom_today',
    label: task.label,
    done: !!(day.completedCustomToday && day.completedCustomToday[task.id]),
    detail: 'extra hoje'
  }));

  const permanentRows = (profile.permanentTasks || []).map((task) => ({
    group: 'custom_permanent',
    label: task.label,
    done: !!(day.completedPermanent && day.completedPermanent[task.id]),
    detail: 'extra recorrente'
  }));

  return [...baseRows, ...customTodayRows, ...permanentRows];
}

function applyAuditFilter(rows, mode) {
  if (mode === 'pending') {
    return rows.filter((row) => !row.done);
  }
  if (mode === 'done') {
    return rows.filter((row) => row.done);
  }
  return rows;
}

function rowsByGroup(rows, group) {
  return rows.filter((row) => row.group === group);
}

function groupCardLines(title, rows) {
  if (!rows.length) {
    return [`${title}: nenhum item.`];
  }
  return [
    `${title} (${rows.length}):`,
    ...rows.map((row) => `- [${row.done ? 'x' : ' '}] ${row.label} (${row.detail})`)
  ];
}

function truncateCardContent(text, maxChars = 7900) {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars - 120)}\n\n[Card truncado para caber no limite da Alexa.]`;
}

function buildAuditReport(day, profile, mode = 'all') {
  const allRows = buildAuditRows(day, profile);
  const filteredRows = applyAuditFilter(allRows, mode);
  const summary = taskCountSummary(day, profile);
  const pending = pendingSummary(day, profile);
  const filteredDone = filteredRows.filter((row) => row.done).length;
  const filteredPending = filteredRows.length - filteredDone;

  const requiredRows = rowsByGroup(filteredRows, 'required');
  const optionalRows = rowsByGroup(filteredRows, 'optional');
  const customTodayRows = rowsByGroup(filteredRows, 'custom_today');
  const permanentRows = rowsByGroup(filteredRows, 'custom_permanent');

  const scopeLabel = mode === 'pending'
    ? 'pendentes'
    : mode === 'done'
      ? 'concluidas'
      : 'completas';

  const speech = [
    `Auditoria ${scopeLabel} do seu perfil persistido no Dynamo da skill.`,
    `Obrigatorias: ${summary.requiredDone} de ${summary.requiredTotal}.`,
    `Nao obrigatorias: ${summary.optionalDone} de ${summary.optionalTotal}.`,
    `Extras de hoje pendentes: ${pending.customPending}. Permanentes pendentes hoje: ${pending.permPending}.`,
    mode === 'all'
      ? 'Confira o card no app Alexa para a lista completa.'
      : `No filtro ${scopeLabel}, total ${filteredRows.length} itens. ${filteredPending} pendentes e ${filteredDone} concluidos.`,
    waterProgressText(day)
  ].join(' ');

  const cardLines = [
    `AUDITORIA ${scopeLabel.toUpperCase()} - ${day.date}`,
    'Fonte: atributos persistidos do perfil (DynamoDB da skill).',
    '',
    `Resumo: obrigatorias ${summary.requiredDone}/${summary.requiredTotal} | nao obrigatorias ${summary.optionalDone}/${summary.optionalTotal}`,
    `Extras pendentes: hoje ${pending.customPending}, permanentes ${pending.permPending}`,
    `Agua: ${day.waterMl || 0}ml`,
    '',
    ...groupCardLines('Obrigatorias', requiredRows),
    '',
    ...groupCardLines('Nao obrigatorias', optionalRows),
    '',
    ...groupCardLines('Extras de hoje', customTodayRows),
    '',
    ...groupCardLines('Extras permanentes', permanentRows),
    '',
    `Flags de fluxo: agua=${!!day.awaitingWaterAmount}, projeto=${!!day.awaitingProjectDetail}, nome_tarefa=${!!day.awaitingCustomTaskName}, escopo_tarefa=${!!day.awaitingCustomTaskScope}, confirmar_conclusao_nova=${!!day.awaitingMarkNewTaskDone}`
  ];

  return {
    speech,
    cardTitle: `Auditoria ${scopeLabel}`,
    cardContent: truncateCardContent(cardLines.join('\n'))
  };
}

function maybeHourlyNudge(day, profile) {
  const hour = getHour();
  if (day.lastMotivationHour !== hour) {
    day.lastMotivationHour = hour;
    day.lastJunkReminderHour = hour;
    return `Lembrete da hora: não comer besteira. Você pediu evolução, então execute. ${randomFirmLine(day, profile)}`;
  }
  return null;
}

async function loadProfile(handlerInput) {
  const manager = handlerInput.attributesManager;
  const persistent = await manager.getPersistentAttributes() || {};
  const profile = persistent.profile || defaultProfile();
  ensureDay(profile);
  consumeExpiredPendingAcks(profile);
  return { manager, persistent, profile, day: profile.day };
}

async function saveProfile(manager, persistent, profile) {
  persistent.profile = profile;
  manager.setPersistentAttributes(persistent);
  await manager.savePersistentAttributes();
}

function hasRemindersPermission(handlerInput) {
  const permissions = handlerInput.requestEnvelope?.context?.System?.user?.permissions;
  return !!(permissions && permissions.consentToken);
}

function reminderTokenCount(profile) {
  return Object.keys(profile.reminders.tokensByKey || {}).length;
}

function expectedReminderCount(profile) {
  return buildReminderSchedules(profile).length;
}

function nextUtcForLocalTime(hour, minute) {
  const now = new Date();
  const localFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now);
  const map = {};
  localFmt.forEach((p) => { map[p.type] = p.value; });
  const localNowHour = Number(map.hour);
  const localNowMinute = Number(map.minute);

  let dayShift = 0;
  if (localNowHour > hour || (localNowHour === hour && localNowMinute >= minute)) {
    dayShift = 1;
  }

  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day) + dayShift;
  const approx = new Date(Date.UTC(year, month - 1, day, hour + 3, minute, 0));
  return approx.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function buildReminderPayload(schedule, pushStatus = 'ENABLED') {
  return {
    requestTime: new Date().toISOString(),
    trigger: {
      type: 'SCHEDULED_ABSOLUTE',
      scheduledTime: nextUtcForLocalTime(schedule.hour, schedule.minute),
      timeZoneId: TIME_ZONE,
      recurrence: {
        recurrenceRules: [
          `FREQ=DAILY;BYHOUR=${schedule.hour};BYMINUTE=${schedule.minute};BYSECOND=0;INTERVAL=1`
        ]
      }
    },
    alertInfo: {
      spokenInfo: {
        content: [
          { locale: 'pt-BR', text: schedule.text }
        ]
      }
    },
    pushNotification: { status: pushStatus }
  };
}

async function createAllReminders(handlerInput, profile) {
  const reminderClient = handlerInput.serviceClientFactory.getReminderManagementServiceClient();
  const schedules = buildReminderSchedules(profile);
  const pushStatus = profile.reminders.awayMode ? 'ENABLED' : 'DISABLED';
  const created = [];
  const failed = [];

  for (const schedule of schedules) {
    try {
      const response = await reminderClient.createReminder(buildReminderPayload(schedule, pushStatus));
      profile.reminders.tokensByKey[schedule.key] = response.alertToken;
      created.push(schedule.key);
    } catch (err) {
      failed.push(schedule.key);
    }
  }
  return { created, failed };
}

async function syncReminderGrid(handlerInput, profile, mode = 'auto') {
  if (!hasRemindersPermission(handlerInput)) {
    return {
      status: 'no_permission',
      changed: false,
      created: 0,
      failed: 0
    };
  }

  if (mode === 'auto' && profile.reminders.paused) {
    return {
      status: 'paused',
      changed: false,
      created: 0,
      failed: 0
    };
  }

  const expected = expectedReminderCount(profile);
  const current = reminderTokenCount(profile);
  let remoteCount = null;
  try {
    const reminderClient = handlerInput.serviceClientFactory.getReminderManagementServiceClient();
    const reminderList = await reminderClient.getReminders();
    const alerts = Array.isArray(reminderList && reminderList.alerts) ? reminderList.alerts : [];
    remoteCount = alerts.length;
  } catch (err) {
    // If listing fails, rely on local token count.
  }

  const mustRebuild = mode === 'force'
    || !profile.reminders.enabled
    || current !== expected
    || (remoteCount !== null && remoteCount !== expected);

  if (!mustRebuild) {
    return {
      status: 'already_ok',
      changed: false,
      created: current,
      failed: 0
    };
  }

  await deleteAllReminders(handlerInput, profile);
  const result = await createAllReminders(handlerInput, profile);
  profile.reminders.enabled = true;
  profile.reminders.paused = false;
  profile.reminders.lastSetupAt = new Date().toISOString();
  profile.reminders.expectedCount = expected;

  return {
    status: 'recreated',
    changed: true,
    created: result.created.length,
    failed: result.failed.length
  };
}

async function deleteAllReminders(handlerInput, profile) {
  const reminderClient = handlerInput.serviceClientFactory.getReminderManagementServiceClient();
  const knownTokens = Object.values(profile.reminders.tokensByKey || {}).filter(Boolean);
  const allTokens = new Set(knownTokens);

  try {
    const reminderList = await reminderClient.getReminders();
    const alerts = Array.isArray(reminderList && reminderList.alerts) ? reminderList.alerts : [];
    alerts.forEach((alert) => {
      if (alert && alert.alertToken) {
        allTokens.add(alert.alertToken);
      }
    });
  } catch (err) {
    // If listing fails, fallback to stored tokens only.
  }

  const deleted = [];
  for (const token of allTokens) {
    try {
      await reminderClient.deleteReminder(token);
      deleted.push(token);
    } catch (err) {
      // Ignore deletes that already disappeared.
    }
  }
  profile.reminders.tokensByKey = {};
  return deleted;
}

function consumeExpiredPendingAcks(profile) {
  const now = Date.now();
  const stillPending = [];
  for (const item of profile.reminders.pendingAcks) {
    if (item.deadlineMs <= now && item.status === 'PENDING') {
      profile.reminders.inconclusive.push({
        key: item.key,
        firedAt: item.firedAt,
        closedAt: new Date().toISOString(),
        reason: 'Sem confirmacao apos 2 tentativas.'
      });
    } else {
      stillPending.push(item);
    }
  }
  profile.reminders.pendingAcks = stillPending;
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    const nudge = maybeHourlyNudge(day, profile);
    const pending = pendingSummary(day, profile);
    const hairInfo = haircutDueInfo(profile);
    const phase = getRoutinePhase(day);
    let reminderStatusLine = '';

    const reminderSync = await syncReminderGrid(handlerInput, profile, 'auto');
    if (reminderSync.status === 'recreated') {
      reminderStatusLine = `Lembretes automáticos sincronizados: ${reminderSync.created} ativos.`;
    } else if (reminderSync.status === 'no_permission' && !profile.reminders.enabled) {
      reminderStatusLine = 'Se quiser automação completa, diga: ativar lembretes.';
    } else if (profile.reminders.awayMode) {
      reminderStatusLine = 'Modo fora de casa ativo com lembretes enxutos.';
    }

    await saveProfile(manager, persistent, profile);

    const hairText = hairInfo.overdue
      ? `Cabelo e barba estão vencidos desde ${formatDatePt(hairInfo.due)}.`
      : `Próxima janela de cabelo e barba: ${formatDatePt(hairInfo.due)}.`;
    const spokenPhase = phaseSpeechLabel(phase);

    const responseBuilder = handlerInput.responseBuilder
      .speak([
        'Autocuidado ativado.',
        `Período do dia: ${spokenPhase}.`,
        nudge,
        reminderStatusLine,
        `Pendências: ${pending.basePending.length} do catálogo, ${pending.customPending} extras de hoje e ${pending.permPending} permanentes.`,
        waterProgressText(day),
        hairText,
        'Comandos: plano de hoje, concluir tarefa, registrar água, adicionar tarefa, status obrigatório, status não obrigatório, listar todas as tarefas e boa noite.'
      ].filter(Boolean).join(' '))
      .reprompt('Diga: plano de hoje.');

    if (reminderSync.status === 'no_permission' && !profile.reminders.enabled) {
      responseBuilder.withAskForPermissionsConsentCard([REMINDERS_SCOPE]);
    }

    return responseBuilder.getResponse();
  }
};

const PlanoHojeIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlanoHojeIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    const nudge = maybeHourlyNudge(day, profile);
    const missingRequired = getMissingRequired(day, profile);
    const missingOptional = getMissingOptional(day, profile);
    const summary = taskCountSummary(day, profile);
    const pending = pendingSummary(day, profile);
    const topRequired = missingRequired.slice(0, 5).join(', ');
    const topOptional = missingOptional.slice(0, 5).join(', ');
    const requiredText = missingRequired.length
      ? `Obrigatórias pendentes: ${topRequired}.`
      : 'Obrigatórias do dia já garantidas.';
    const optionalText = missingOptional.length
      ? `Não obrigatórias pendentes: ${topOptional}${missingOptional.length > 5 ? ` e mais ${missingOptional.length - 5}.` : '.'}`
      : 'Não obrigatórias do catálogo já garantidas.';
    await saveProfile(manager, persistent, profile);

    return handlerInput.responseBuilder
      .speak([
        nudge,
        `Obrigatórias: ${summary.requiredPending} pendentes de ${summary.requiredTotal}.`,
        `Não obrigatórias: ${summary.optionalPending} pendentes de ${summary.optionalTotal}.`,
        requiredText,
        optionalText,
        waterProgressText(day),
        `Ainda faltam ${pending.basePending.length} itens do catálogo principal.`
      ].filter(Boolean).join(' '))
      .reprompt('Diga: concluir malhar, concluir xantê, ou registrar água.')
      .getResponse();
  }
};

const ConcluirIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ConcluirIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    const taskRaw = Alexa.getSlotValue(handlerInput.requestEnvelope, 'tarefa');
    const taskId = resolveTask(taskRaw);

    if (taskId) {
      if (taskId === 'agua') {
        day.awaitingWaterAmount = true;
        await saveProfile(manager, persistent, profile);
        return handlerInput.responseBuilder
          .speak('Quanto você bebeu? Responde curto: de 100 a 5000 ml.')
          .reprompt('Fala assim: 500 ml.')
          .getResponse();
      }

      if (taskId === 'outros_projetos') {
        day.awaitingProjectDetail = true;
        await saveProfile(manager, persistent, profile);
        return handlerInput.responseBuilder
          .speak('Qual projeto você trabalhou hoje?')
          .reprompt('Diga o nome do projeto.')
          .getResponse();
      }

      if (taskId === 'cabelo_barba') {
        profile.meta.lastHaircutDate = getDateKey();
      }

      incrementTask(day, taskId);
      await saveProfile(manager, persistent, profile);
      return handlerInput.responseBuilder
        .speak(`Concluído: ${TASK_DEFS[taskId].label}. ${randomFirmLine(day, profile)}`)
        .getResponse();
    }

    const custom = findCustomTask(day, profile, taskRaw);
    if (custom) {
      if (custom.scope === 'today') {
        day.completedCustomToday[custom.id] = true;
      } else {
        day.completedPermanent[custom.id] = true;
      }
      await saveProfile(manager, persistent, profile);
      return handlerInput.responseBuilder
        .speak(`Concluído: ${custom.label}.`)
        .getResponse();
    }

    return handlerInput.responseBuilder
      .speak('Não encontrei essa tarefa. Você pode cadastrar com: adicionar tarefa.')
      .reprompt('Diga: adicionar tarefa revisar currículo para hoje.')
      .getResponse();
  }
};

const ConcluirTarefaLivreIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ConcluirTarefaLivreIntent';
  },
  async handle(handlerInput) {
    const taskRaw = Alexa.getSlotValue(handlerInput.requestEnvelope, 'tarefaLivre');
    const fakeEnvelope = JSON.parse(JSON.stringify(handlerInput.requestEnvelope));
    fakeEnvelope.request.intent.name = 'ConcluirIntent';
    fakeEnvelope.request.intent.slots = {
      tarefa: { name: 'tarefa', value: taskRaw }
    };
    const delegatedInput = Object.assign({}, handlerInput, { requestEnvelope: fakeEnvelope });
    return ConcluirIntentHandler.handle(delegatedInput);
  }
};

const InformarProjetoIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'InformarProjetoIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    const projectName = Alexa.getSlotValue(handlerInput.requestEnvelope, 'nomeProjeto');

    if (!day.awaitingProjectDetail) {
      return handlerInput.responseBuilder
        .speak('Para registrar nome de projeto, primeiro diga: concluir outros projetos.')
        .reprompt('Diga: concluir outros projetos.')
        .getResponse();
    }

    if (!projectName || !projectName.trim()) {
      return handlerInput.responseBuilder
        .speak('Não entendi o nome do projeto. Repete só o nome.')
        .reprompt('Qual projeto você trabalhou?')
        .getResponse();
    }

    day.awaitingProjectDetail = false;
    day.otherProjectsWorked.push({
      name: projectName.trim(),
      at: new Date().toISOString()
    });
    incrementTask(day, 'outros_projetos');
    await saveProfile(manager, persistent, profile);

    return handlerInput.responseBuilder
      .speak(`Projeto registrado: ${projectName.trim()}.`)
      .getResponse();
  }
};

const ConcluirCourseraIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ConcluirCourseraIntent';
  },
  async handle(handlerInput) {
    const fakeEnvelope = JSON.parse(JSON.stringify(handlerInput.requestEnvelope));
    fakeEnvelope.request.intent.name = 'ConcluirIntent';
    fakeEnvelope.request.intent.slots = {
      tarefa: { name: 'tarefa', value: 'curso coursera' }
    };
    const delegatedInput = Object.assign({}, handlerInput, { requestEnvelope: fakeEnvelope });
    return ConcluirIntentHandler.handle(delegatedInput);
  }
};

const RegistrarAguaIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RegistrarAguaIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    const quantity = Alexa.getSlotValue(handlerInput.requestEnvelope, 'quantidade');
    const unit = Alexa.getSlotValue(handlerInput.requestEnvelope, 'unidade');

    if (!quantity) {
      day.awaitingWaterAmount = true;
      await saveProfile(manager, persistent, profile);
      return handlerInput.responseBuilder
        .speak('Boa. Quanto você bebeu? Fala curto: de 100 a 5000 ml.')
        .reprompt('Quanto de água você bebeu?')
        .getResponse();
    }

    const ml = parseQuantityToMl(quantity, unit);

    if (!ml) {
      return handlerInput.responseBuilder
        .speak('Não peguei a quantidade. Fale apenas em ml, entre 100 e 5000. Exemplo: 1500 ml.')
        .reprompt('Repete a quantidade da água.')
        .getResponse();
    }

    registerWater(day, ml);

    await saveProfile(manager, persistent, profile);
    return handlerInput.responseBuilder
      .speak(`Registro feito: ${ml} mililitros. ${waterProgressText(day)}`)
      .getResponse();
  }
};

const InformarQuantidadeAguaIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'InformarQuantidadeAguaIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    const quantity = Alexa.getSlotValue(handlerInput.requestEnvelope, 'quantidade');
    const unit = Alexa.getSlotValue(handlerInput.requestEnvelope, 'unidade');

    if (!day.awaitingWaterAmount) {
      return handlerInput.responseBuilder
        .speak('Se você quiser registrar água, diga: registrar água.')
        .reprompt('Diga: registrar água.')
        .getResponse();
    }

    const ml = parseQuantityToMl(quantity, unit);
    if (!ml) {
      return handlerInput.responseBuilder
        .speak('Não entendi a quantidade. Fale apenas em ml, entre 100 e 5000. Exemplo: 800 ml.')
        .reprompt('Repete a quantidade da água.')
        .getResponse();
    }

    registerWater(day, ml);
    await saveProfile(manager, persistent, profile);
    return handlerInput.responseBuilder
      .speak(`Fechou: ${ml} mililitros registrados. ${waterProgressText(day)}`)
      .getResponse();
  }
};

const StatusAguaIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'StatusAguaIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    await saveProfile(manager, persistent, profile);
    return handlerInput.responseBuilder
      .speak(waterProgressText(day))
      .getResponse();
  }
};

const AdicionarTarefaIntentHandler = {
  canHandle(handlerInput) {
    if (Alexa.getRequestType(handlerInput.requestEnvelope) !== 'IntentRequest') {
      return false;
    }
    const intent = Alexa.getIntentName(handlerInput.requestEnvelope);
    return intent === 'AdicionarTarefaIntent' || intent === 'AdicionarTarefaHojeIntent' || intent === 'AdicionarTarefaSempreIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    const intent = Alexa.getIntentName(handlerInput.requestEnvelope);
    const rawLabel = Alexa.getSlotValue(handlerInput.requestEnvelope, 'tarefaLivre');
    const label = cleanTaskLabel(rawLabel);

    if (!label) {
      day.awaitingCustomTaskName = true;
      day.awaitingCustomTaskScope = false;
      day.pendingCustomTaskLabel = '';
      clearMarkNewTaskDoneFlow(day);
      await saveProfile(manager, persistent, profile);
      return handlerInput.responseBuilder
        .speak('Beleza. Qual o nome da tarefa que você quer cadastrar?')
        .reprompt('Diga o nome da tarefa.')
        .getResponse();
    }

    if (intent === 'AdicionarTarefaHojeIntent' || intent === 'AdicionarTarefaSempreIntent') {
      const scope = intent === 'AdicionarTarefaSempreIntent' ? 'sempre' : 'hoje';
      const result = addCustomTask(day, profile, label, scope);
      clearCustomTaskFlow(day);
      const message = askMarkNewTaskDone(day, result);
      await saveProfile(manager, persistent, profile);
      return handlerInput.responseBuilder
        .speak(result.ok ? `${message} ${randomFirmLine(day, profile)}` : message)
        .reprompt(result.ok ? 'Diga sim ou não.' : 'Se quiser, diga: plano de hoje.')
        .getResponse();
    }

    day.pendingCustomTaskLabel = label;
    day.awaitingCustomTaskName = false;
    day.awaitingCustomTaskScope = true;
    clearMarkNewTaskDoneFlow(day);
    await saveProfile(manager, persistent, profile);
    return handlerInput.responseBuilder
      .speak(`Tarefa anotada: ${label}. Ela é recorrente ou só para hoje?`)
      .reprompt('Responda: recorrente, ou só para hoje.')
      .getResponse();
  }
};

const InformarNomeNovaTarefaIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'InformarNomeNovaTarefaIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    const label = cleanTaskLabel(Alexa.getSlotValue(handlerInput.requestEnvelope, 'tarefaLivre'));

    if (!day.awaitingCustomTaskName) {
      return handlerInput.responseBuilder
        .speak('Para cadastrar uma tarefa, primeiro diga: adicionar tarefa.')
        .reprompt('Diga: adicionar tarefa.')
        .getResponse();
    }

    if (!label) {
      return handlerInput.responseBuilder
        .speak('Não entendi o nome da tarefa. Repete só o nome.')
        .reprompt('Qual o nome da tarefa?')
        .getResponse();
    }

    day.pendingCustomTaskLabel = label;
    day.awaitingCustomTaskName = false;
    day.awaitingCustomTaskScope = true;
    clearMarkNewTaskDoneFlow(day);
    await saveProfile(manager, persistent, profile);
    return handlerInput.responseBuilder
      .speak(`Perfeito. ${label}. Ela é recorrente ou só para hoje?`)
      .reprompt('Responda: recorrente, ou só para hoje.')
      .getResponse();
  }
};

const InformarNomeNovaTarefaAtualizarIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'InformarNomeNovaTarefaAtualizarIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    const task = cleanTaskLabel(Alexa.getSlotValue(handlerInput.requestEnvelope, 'tarefaLivre'));
    const label = task ? `atualizar ${task}` : '';

    if (!day.awaitingCustomTaskName) {
      await saveProfile(manager, persistent, profile);
      return handlerInput.responseBuilder
        .speak('Para cadastrar uma tarefa, primeiro diga: adicionar tarefa.')
        .reprompt('Diga: adicionar tarefa.')
        .getResponse();
    }

    if (!label) {
      await saveProfile(manager, persistent, profile);
      return handlerInput.responseBuilder
        .speak('Não entendi o nome da tarefa. Repete só o nome.')
        .reprompt('Qual o nome da tarefa?')
        .getResponse();
    }

    day.pendingCustomTaskLabel = label;
    day.awaitingCustomTaskName = false;
    day.awaitingCustomTaskScope = true;
    clearMarkNewTaskDoneFlow(day);
    await saveProfile(manager, persistent, profile);
    return handlerInput.responseBuilder
      .speak(`Perfeito. ${label}. Ela é recorrente ou só para hoje?`)
      .reprompt('Responda: recorrente, ou só para hoje.')
      .getResponse();
  }
};

const CapturarTarefaLivreIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CapturarTarefaLivreIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    const raw = Alexa.getSlotValue(handlerInput.requestEnvelope, 'tarefaLivre');
    const label = cleanTaskLabel(raw);

    if (!day.awaitingCustomTaskName && !day.awaitingCustomTaskScope) {
      await saveProfile(manager, persistent, profile);
      return handlerInput.responseBuilder
        .speak('Para cadastrar tarefa nova, primeiro diga: adicionar tarefa.')
        .reprompt('Diga: adicionar tarefa.')
        .getResponse();
    }

    if (day.awaitingCustomTaskScope) {
      const scope = resolveCustomTaskScope(raw);
      if (!scope) {
        await saveProfile(manager, persistent, profile);
        return handlerInput.responseBuilder
          .speak('Estou esperando só o tipo: recorrente ou só para hoje.')
          .reprompt('Diga: recorrente, ou só para hoje.')
          .getResponse();
      }

      const finalLabel = cleanTaskLabel(day.pendingCustomTaskLabel);
      const result = addCustomTask(day, profile, finalLabel, scope);
      clearCustomTaskFlow(day);
      const message = askMarkNewTaskDone(day, result);
      await saveProfile(manager, persistent, profile);
      return handlerInput.responseBuilder
        .speak(result.ok ? `${message} ${randomFirmLine(day, profile)}` : message)
        .reprompt(result.ok ? 'Diga sim ou não.' : 'Se quiser, diga: plano de hoje.')
        .getResponse();
    }

    if (!label) {
      await saveProfile(manager, persistent, profile);
      return handlerInput.responseBuilder
        .speak('Não entendi o nome da tarefa. Repete só o nome.')
        .reprompt('Qual o nome da tarefa?')
        .getResponse();
    }

    day.pendingCustomTaskLabel = label;
    day.awaitingCustomTaskName = false;
    day.awaitingCustomTaskScope = true;
    clearMarkNewTaskDoneFlow(day);
    await saveProfile(manager, persistent, profile);
    return handlerInput.responseBuilder
      .speak(`Anotei: ${label}. É recorrente ou só para hoje?`)
      .reprompt('Responda: recorrente, ou só para hoje.')
      .getResponse();
  }
};

const DefinirEscopoTarefaIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'DefinirEscopoTarefaIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    const scopeRaw = Alexa.getSlotValue(handlerInput.requestEnvelope, 'escopo');
    const scope = resolveCustomTaskScope(scopeRaw);

    if (!day.awaitingCustomTaskScope) {
      return handlerInput.responseBuilder
        .speak('Para definir escopo de tarefa, primeiro diga: adicionar tarefa.')
        .reprompt('Diga: adicionar tarefa.')
        .getResponse();
    }

    if (!scope) {
      return handlerInput.responseBuilder
        .speak('Não entendi se é recorrente ou só para hoje. Responda: recorrente, ou só para hoje.')
        .reprompt('Diga: recorrente, ou só para hoje.')
        .getResponse();
    }

    const label = cleanTaskLabel(day.pendingCustomTaskLabel);
    if (!label) {
      day.awaitingCustomTaskName = true;
      day.awaitingCustomTaskScope = false;
      await saveProfile(manager, persistent, profile);
      return handlerInput.responseBuilder
        .speak('Faltou o nome da tarefa. Qual é o nome?')
        .reprompt('Diga o nome da tarefa.')
        .getResponse();
    }

    const result = addCustomTask(day, profile, label, scope);
    clearCustomTaskFlow(day);
    const message = askMarkNewTaskDone(day, result);
    await saveProfile(manager, persistent, profile);
    return handlerInput.responseBuilder
      .speak(result.ok ? `${message} ${randomFirmLine(day, profile)}` : message)
      .reprompt(result.ok ? 'Diga sim ou não.' : 'Se quiser, diga: plano de hoje.')
      .getResponse();
  }
};

const EscopoRecorrenteIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'EscopoRecorrenteIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    if (!day.awaitingCustomTaskScope || !cleanTaskLabel(day.pendingCustomTaskLabel)) {
      await saveProfile(manager, persistent, profile);
      return handlerInput.responseBuilder
        .speak('Para definir recorrência, primeiro diga: adicionar tarefa.')
        .reprompt('Diga: adicionar tarefa.')
        .getResponse();
    }

    const result = addCustomTask(day, profile, cleanTaskLabel(day.pendingCustomTaskLabel), 'sempre');
    clearCustomTaskFlow(day);
    const message = askMarkNewTaskDone(day, result);
    await saveProfile(manager, persistent, profile);
    return handlerInput.responseBuilder
      .speak(result.ok ? `${message} ${randomFirmLine(day, profile)}` : message)
      .reprompt(result.ok ? 'Diga sim ou não.' : 'Se quiser, diga: plano de hoje.')
      .getResponse();
  }
};

const EscopoHojeIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'EscopoHojeIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    if (!day.awaitingCustomTaskScope || !cleanTaskLabel(day.pendingCustomTaskLabel)) {
      await saveProfile(manager, persistent, profile);
      return handlerInput.responseBuilder
        .speak('Para definir escopo hoje, primeiro diga: adicionar tarefa.')
        .reprompt('Diga: adicionar tarefa.')
        .getResponse();
    }

    const result = addCustomTask(day, profile, cleanTaskLabel(day.pendingCustomTaskLabel), 'hoje');
    clearCustomTaskFlow(day);
    const message = askMarkNewTaskDone(day, result);
    await saveProfile(manager, persistent, profile);
    return handlerInput.responseBuilder
      .speak(result.ok ? `${message} ${randomFirmLine(day, profile)}` : message)
      .reprompt(result.ok ? 'Diga sim ou não.' : 'Se quiser, diga: plano de hoje.')
      .getResponse();
  }
};

const CheckInIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CheckInIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    const done = totalConcludedItems(day, profile);
    const total = Object.keys(TASK_DEFS).length + (profile.permanentTasks || []).length + (day.customToday || []).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    const missingRequired = getMissingRequired(day, profile);
    const missingOptional = getMissingOptional(day, profile);
    const summary = taskCountSummary(day, profile);
    const yesterday = findYesterdayHistory(profile);
    const comparison = yesterday
      ? `Ontem foram ${yesterday.totalConcludedItems} itens. Hoje está em ${done}.`
      : 'Ainda sem histórico de ontem.';
    const hair = haircutDueInfo(profile);
    const hairText = hair.overdue
      ? `Cabelo/barba vencidos desde ${formatDatePt(hair.due)}.`
      : `Cabelo/barba em dia até ${formatDatePt(hair.due)}.`;
    await saveProfile(manager, persistent, profile);

    return handlerInput.responseBuilder
      .speak([
        `Check-in: ${percent}% do plano total.`,
        `Obrigatórias: ${summary.requiredDone} concluídas de ${summary.requiredTotal}, com ${summary.requiredPending} pendentes.`,
        `Não obrigatórias: ${summary.optionalDone} concluídas de ${summary.optionalTotal}, com ${summary.optionalPending} pendentes.`,
        missingRequired.length ? `Obrigatórias pendentes: ${missingRequired.join(', ')}.` : 'Obrigatórias concluídas.',
        missingOptional.length ? `Não obrigatórias pendentes agora: ${missingOptional.slice(0, 5).join(', ')}${missingOptional.length > 5 ? ` e mais ${missingOptional.length - 5}.` : '.'}` : 'Não obrigatórias concluídas no catálogo.',
        waterProgressText(day),
        comparison,
        hairText
      ].join(' '))
      .reprompt('Quer plano de hoje ou status obrigatório?')
      .getResponse();
  }
};

const StatusObrigatorioIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'StatusObrigatorioIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    const missing = getMissingRequired(day, profile);
    const hour = getHour();
    const riskLine = (hour >= 18 && missing.length > 0)
      ? 'Alerta de risco: se isso não fechar hoje, você sabota seu próprio plano.'
      : '';
    await saveProfile(manager, persistent, profile);
    return handlerInput.responseBuilder
      .speak(missing.length
        ? `Obrigatório pendente: ${missing.join(', ')}. ${riskLine}`.trim()
        : 'Tudo obrigatório do dia está concluído.')
      .reprompt('Quer encerrar com boa noite ou continuar o plano?')
      .getResponse();
  }
};

const StatusNaoObrigatorioIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'StatusNaoObrigatorioIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    const summary = taskCountSummary(day, profile);
    const missingOptional = getMissingOptional(day, profile);
    const topOptional = missingOptional.slice(0, 10).join(', ');
    await saveProfile(manager, persistent, profile);

    return handlerInput.responseBuilder
      .speak([
        `Não obrigatórias: ${summary.optionalPending} pendentes de ${summary.optionalTotal}.`,
        missingOptional.length
          ? `Pendentes agora: ${topOptional}${missingOptional.length > 10 ? ` e mais ${missingOptional.length - 10}.` : '.'}`
          : 'Não obrigatórias do catálogo já garantidas hoje.',
        'Se quiser a lista completa, diga: listar todas as tarefas.'
      ].join(' '))
      .reprompt('Diga: listar todas as tarefas.')
      .getResponse();
  }
};

const ListarTodasTarefasIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ListarTodasTarefasIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    const requiredLabels = getRequiredTaskIds().map((id) => TASK_DEFS[id].label);
    const optionalLabels = getOptionalTaskIds().map((id) => TASK_DEFS[id].label);
    const customToday = (day.customToday || []).map((t) => t.label);
    const permanentCustom = (profile.permanentTasks || []).map((t) => t.label);
    await saveProfile(manager, persistent, profile);

    const parts = [
      `Obrigatórias cadastradas (${requiredLabels.length}): ${requiredLabels.join(', ')}.`,
      `Não obrigatórias cadastradas (${optionalLabels.length}): ${optionalLabels.join(', ')}.`,
      customToday.length ? `Extras de hoje (${customToday.length}): ${customToday.join(', ')}.` : 'Você não tem extras de hoje cadastradas.',
      permanentCustom.length ? `Tarefas permanentes extras (${permanentCustom.length}): ${permanentCustom.join(', ')}.` : 'Você não tem tarefas permanentes extras cadastradas.'
    ];

    return handlerInput.responseBuilder
      .speak(parts.join(' '))
      .reprompt('Se quiser, diga: status obrigatório ou status não obrigatório.')
      .getResponse();
  }
};

const AuditoriaIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AuditoriaIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    const report = buildAuditReport(day, profile, 'all');
    await saveProfile(manager, persistent, profile);
    return handlerInput.responseBuilder
      .speak(report.speech)
      .withSimpleCard(report.cardTitle, report.cardContent)
      .reprompt('Se quiser, diga: auditoria pendentes ou plano de hoje.')
      .getResponse();
  }
};

const AuditoriaPendentesIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AuditoriaPendentesIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    const report = buildAuditReport(day, profile, 'pending');
    await saveProfile(manager, persistent, profile);
    return handlerInput.responseBuilder
      .speak(report.speech)
      .withSimpleCard(report.cardTitle, report.cardContent)
      .reprompt('Se quiser, diga: auditoria completa.')
      .getResponse();
  }
};

const AuditoriaConcluidasIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AuditoriaConcluidasIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    const report = buildAuditReport(day, profile, 'done');
    await saveProfile(manager, persistent, profile);
    return handlerInput.responseBuilder
      .speak(report.speech)
      .withSimpleCard(report.cardTitle, report.cardContent)
      .reprompt('Se quiser, diga: auditoria completa.')
      .getResponse();
  }
};

const BoaNoiteIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'BoaNoiteIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    const missing = getMissingRequired(day, profile);
    if (missing.length > 0) {
      return handlerInput.responseBuilder
        .speak(`Boa noite bloqueada. Faltam obrigatórias: ${missing.join(', ')}.`)
        .reprompt('Diga: status obrigatório.')
        .getResponse();
    }

    day.closed = true;
    archiveDay(profile, day);
    const done = totalConcludedItems(day, profile);
    const yesterday = findYesterdayHistory(profile);
    const evolution = yesterday
      ? done >= yesterday.totalConcludedItems
        ? 'Você manteve ou superou ontem.'
        : 'Hoje ficou abaixo de ontem. Amanhã corrige sem drama.'
      : 'Primeiro fechamento registrado.';

    profile.day = newDay(getDateKey());
    await saveProfile(manager, persistent, profile);

    return handlerInput.responseBuilder
      .speak(`Dia encerrado com ${done} itens concluídos. ${evolution}`)
      .getResponse();
  }
};

const MotivacaoIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'MotivacaoIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    const phase = getRoutinePhase(day);
    const spokenPhase = phaseSpeechLabel(phase);
    const pepTalk = randomFirmLine(day, profile);
    const ssml = `<speak>Modo ${escapeSsml(spokenPhase)}. <break time="300ms"/> ${escapeSsml(pepTalk)}</speak>`;
    await saveProfile(manager, persistent, profile);
    return handlerInput.responseBuilder
      .speak(ssml)
      .reprompt('Quer o plano de hoje?')
      .getResponse();
  }
};

const AtivarLembretesIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AtivarLembretesIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile } = await loadProfile(handlerInput);

    if (!hasRemindersPermission(handlerInput)) {
      return handlerInput.responseBuilder
        .speak('Para eu criar lembretes automáticos, preciso da permissão de lembretes no aplicativo da Alexa.')
        .withAskForPermissionsConsentCard([REMINDERS_SCOPE])
        .getResponse();
    }

    const wasActive = profile.reminders.enabled && !profile.reminders.paused;
    const result = await syncReminderGrid(handlerInput, profile, 'force');
    await saveProfile(manager, persistent, profile);
    const modeText = profile.reminders.awayMode ? ' em modo fora de casa' : '';

    return handlerInput.responseBuilder
      .speak(wasActive
        ? `Lembretes atualizados${modeText}. Recriei ${result.created} lembretes. Falharam ${result.failed}.`
        : `Lembretes ativados${modeText}. Criei ${result.created} lembretes. Falharam ${result.failed}.`)
      .reprompt('Se quiser pausar, diga: vou sair.')
      .getResponse();
  }
};

const VouSairIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'VouSairIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile } = await loadProfile(handlerInput);
    if (!profile.reminders.enabled) {
      return handlerInput.responseBuilder
        .speak('Tudo bem. Seus lembretes automáticos ainda não estão ativos.')
        .getResponse();
    }

    if (!hasRemindersPermission(handlerInput)) {
      return handlerInput.responseBuilder
        .speak('Preciso da permissão de lembretes para pausar sua agenda automática.')
        .withAskForPermissionsConsentCard([REMINDERS_SCOPE])
        .getResponse();
    }

    profile.reminders.awayMode = true;
    profile.reminders.paused = false;
    profile.reminders.pausedAt = new Date().toISOString();
    const result = await syncReminderGrid(handlerInput, profile, 'force');
    await saveProfile(manager, persistent, profile);

    return handlerInput.responseBuilder
      .speak(`Entendido. Modo fora de casa ativado com lembretes enxutos e push no app. Recriei ${result.created} lembretes.`)
      .getResponse();
  }
};

const ChegueiIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ChegueiIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile } = await loadProfile(handlerInput);

    if (!profile.reminders.enabled) {
      profile.reminders.awayMode = false;
      profile.reminders.resumedAt = new Date().toISOString();
      await saveProfile(manager, persistent, profile);
      return handlerInput.responseBuilder
        .speak('Modo em casa ativado no plano. Seus lembretes automáticos ainda estão desativados.')
        .getResponse();
    }

    if (!hasRemindersPermission(handlerInput)) {
      profile.reminders.awayMode = false;
      profile.reminders.resumedAt = new Date().toISOString();
      await saveProfile(manager, persistent, profile);
      return handlerInput.responseBuilder
        .speak('Modo em casa ativado no plano. Para sincronizar os lembretes no app Alexa, preciso da permissão de lembretes.')
        .withAskForPermissionsConsentCard([REMINDERS_SCOPE])
        .getResponse();
    }

    profile.reminders.awayMode = false;
    const result = await syncReminderGrid(handlerInput, profile, 'force');
    profile.reminders.resumedAt = new Date().toISOString();
    await saveProfile(manager, persistent, profile);

    return handlerInput.responseBuilder
      .speak(`Bem-vindo de volta. Rotina retomada com ${result.created} lembretes ativos.`)
      .getResponse();
  }
};

const YesIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    if (day.awaitingMarkNewTaskDone) {
      const mark = markPendingNewTaskAsDone(day);
      clearMarkNewTaskDoneFlow(day);
      await saveProfile(manager, persistent, profile);
      return handlerInput.responseBuilder
        .speak(mark.ok ? `Feito. Tarefa marcada como concluída: ${mark.label}.` : 'Perfeito. Mantive a tarefa sem marcar conclusão.')
        .getResponse();
    }

    if (day.awaitingCustomTaskScope && cleanTaskLabel(day.pendingCustomTaskLabel)) {
      const result = addCustomTask(day, profile, cleanTaskLabel(day.pendingCustomTaskLabel), 'sempre');
      clearCustomTaskFlow(day);
      const message = askMarkNewTaskDone(day, result);
      await saveProfile(manager, persistent, profile);
      return handlerInput.responseBuilder
        .speak(result.ok ? `${message} ${randomFirmLine(day, profile)}` : message)
        .reprompt(result.ok ? 'Diga sim ou não.' : 'Se quiser, diga: plano de hoje.')
        .getResponse();
    }

    if (day.awaitingCustomTaskName) {
      await saveProfile(manager, persistent, profile);
      return handlerInput.responseBuilder
        .speak('Me diz o nome da tarefa.')
        .reprompt('Qual o nome da tarefa?')
        .getResponse();
    }

    await saveProfile(manager, persistent, profile);
    return handlerInput.responseBuilder
      .speak('Perfeito. Pode mandar o próximo comando: plano de hoje, status obrigatório ou registrar água.')
      .reprompt('Qual comando?')
      .getResponse();
  }
};

const NoIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    if (day.awaitingMarkNewTaskDone) {
      const keptLabel = day.pendingNewTaskLabel || 'tarefa';
      clearMarkNewTaskDoneFlow(day);
      await saveProfile(manager, persistent, profile);
      return handlerInput.responseBuilder
        .speak(`Perfeito. Mantive sem marcar conclusão: ${keptLabel}.`)
        .getResponse();
    }

    if (day.awaitingCustomTaskScope && cleanTaskLabel(day.pendingCustomTaskLabel)) {
      const result = addCustomTask(day, profile, cleanTaskLabel(day.pendingCustomTaskLabel), 'hoje');
      clearCustomTaskFlow(day);
      const message = askMarkNewTaskDone(day, result);
      await saveProfile(manager, persistent, profile);
      return handlerInput.responseBuilder
        .speak(result.ok ? `${message} ${randomFirmLine(day, profile)}` : message)
        .reprompt(result.ok ? 'Diga sim ou não.' : 'Se quiser, diga: plano de hoje.')
        .getResponse();
    }

    day.awaitingWaterAmount = false;
    day.awaitingProjectDetail = false;
    clearCustomTaskFlow(day);
    clearMarkNewTaskDoneFlow(day);
    await saveProfile(manager, persistent, profile);
    return handlerInput.responseBuilder
      .speak('Perfeito. Encerrando por aqui. Quando quiser, é só chamar autocuidado.')
      .getResponse();
  }
};

const ConfirmarLembreteIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ConfirmarLembreteIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile } = await loadProfile(handlerInput);
    consumeExpiredPendingAcks(profile);
    const tipo = normalizeText(Alexa.getSlotValue(handlerInput.requestEnvelope, 'tipoLembrete'));
    const now = Date.now();

    const pending = profile.reminders.pendingAcks.filter((p) => p.status === 'PENDING');
    let matched = null;
    if (tipo) {
      matched = pending.find((p) => p.key.includes(tipo));
    }
    if (!matched && pending.length > 0) {
      matched = pending[0];
    }

    if (!matched) {
      await saveProfile(manager, persistent, profile);
      return handlerInput.responseBuilder
        .speak('Não encontrei lembrete pendente para confirmar agora.')
        .getResponse();
    }

    matched.status = 'CONFIRMED';
    matched.confirmedAt = new Date(now).toISOString();
    profile.reminders.pendingAcks = profile.reminders.pendingAcks.filter((p) => p.status !== 'CONFIRMED');
    await saveProfile(manager, persistent, profile);

    return handlerInput.responseBuilder
      .speak('Perfeito. Lembrete confirmado. Vamos que vamos.')
      .getResponse();
  }
};

const ReminderStatusChangedHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'Reminders.ReminderStatusChanged';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile } = await loadProfile(handlerInput);
    const body = handlerInput.requestEnvelope.request.body || {};
    const status = body.status;
    const token = body.alertToken;
    consumeExpiredPendingAcks(profile);

    if (status === 'COMPLETED' && token) {
      const key = Object.keys(profile.reminders.tokensByKey || {}).find((k) => profile.reminders.tokensByKey[k] === token);
      if (key) {
        profile.reminders.pendingAcks.push({
          key,
          token,
          firedAt: new Date().toISOString(),
          deadlineMs: Date.now() + (15 * 60 * 1000),
          status: 'PENDING'
        });
      }
    }

    await saveProfile(manager, persistent, profile);
    return handlerInput.responseBuilder.getResponse();
  }
};

const RotinaChanteIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RotinaChanteIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Rotina da Xantê: comida e água, banheiro, escovar pelo, dentes e ouvido. Essa tarefa é obrigatória todo dia.')
      .reprompt('Quando concluir, diga: concluir xantê.')
      .getResponse();
  }
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak([
        'Comandos:',
        'plano de hoje,',
        'concluir tarefa,',
        'registrar água,',
        'responder quantidade de água: 500 ml,',
        'adicionar tarefa para hoje,',
        'adicionar tarefa permanente,',
        'status obrigatório,',
        'status não obrigatório,',
        'auditoria completa,',
        'auditoria pendentes,',
        'auditoria concluidas,',
        'listar todas as tarefas,',
        'check-in,',
        'ativar lembretes uma vez,',
        'vou sair para modo fora de casa,',
        'cheguei,',
        'confirmar lembrete,',
        'e boa noite.'
      ].join(' '))
      .reprompt('Qual comando você quer usar agora?')
      .getResponse();
  }
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
        || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Sessão pausada. Seu plano não.')
      .getResponse();
  }
};

const FallbackIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
  },
  async handle(handlerInput) {
    const { manager, persistent, profile, day } = await loadProfile(handlerInput);
    let message = 'Não entendi. Tente: plano de hoje, concluir tarefa, registrar água, status não obrigatório, ou boa noite.';
    let reprompt = 'Qual comando?';

    if (day.awaitingWaterAmount) {
      message = 'Estou esperando só a quantidade da água. Fala em ml, entre 100 e 5000. Exemplo: 500 ml.';
      reprompt = 'Quanto de água você bebeu?';
    } else if (day.awaitingCustomTaskName) {
      message = 'Estou esperando o nome da tarefa. Fala o nome, por exemplo: revisar currículo.';
      reprompt = 'Qual o nome da tarefa?';
    } else if (day.awaitingCustomTaskScope) {
      message = 'Estou esperando se a tarefa é recorrente ou só para hoje.';
      reprompt = 'Diga: recorrente, ou só para hoje.';
    } else if (day.awaitingMarkNewTaskDone) {
      message = 'Estou esperando se você quer marcar a nova tarefa como concluída agora.';
      reprompt = 'Diga sim ou não.';
    } else {
      const rawText = Alexa.getSlotValue(handlerInput.requestEnvelope, 'tarefa') || '';
      const normalized = normalizeText(rawText);
      if (normalized.includes('agua')) {
        message = 'Para registrar água sem conflito, diga: registrar água no autocuidado.';
        reprompt = 'Diga: registrar água no autocuidado.';
      }
    }

    await saveProfile(manager, persistent, profile);
    return handlerInput.responseBuilder
      .speak(message)
      .reprompt(reprompt)
      .getResponse();
  }
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.getResponse();
  }
};

const RequestLogInterceptor = {
  process(handlerInput) {
    const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
    const intentName = requestType === 'IntentRequest'
      ? Alexa.getIntentName(handlerInput.requestEnvelope)
      : requestType;
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes() || {};
    sessionAttributes.lastIntent = intentName;
    sessionAttributes.lastRequestAt = new Date().toISOString();
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    console.log(`[REQ] ${intentName}`);
  }
};

const ResponseLogInterceptor = {
  process(handlerInput, response) {
    const intentName = Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      ? Alexa.getIntentName(handlerInput.requestEnvelope)
      : Alexa.getRequestType(handlerInput.requestEnvelope);
    const shouldEndSession = response && typeof response.shouldEndSession === 'boolean'
      ? response.shouldEndSession
      : false;
    console.log(`[RES] ${intentName} endSession=${shouldEndSession}`);
  }
};

const IntentReflectorHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
  },
  handle(handlerInput) {
    const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
    return handlerInput.responseBuilder.speak(`Você acionou ${intentName}.`).getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.stack}`);
    return handlerInput.responseBuilder
      .speak('Deu um erro rápido aqui. Tenta de novo com: plano de hoje.')
      .reprompt('Tente: plano de hoje.')
      .getResponse();
  }
};

const persistenceAdapter = new DynamoDbPersistenceAdapterV3({
  tableName: process.env.DYNAMODB_PERSISTENCE_TABLE_NAME,
});

exports.handler = Alexa.SkillBuilders.custom()
  .withApiClient(new Alexa.DefaultApiClient())
  .withPersistenceAdapter(persistenceAdapter)
  .addRequestHandlers(
    ReminderStatusChangedHandler,
    LaunchRequestHandler,
    PlanoHojeIntentHandler,
    ConcluirIntentHandler,
    ConcluirTarefaLivreIntentHandler,
    ConcluirCourseraIntentHandler,
    InformarProjetoIntentHandler,
    RegistrarAguaIntentHandler,
    InformarQuantidadeAguaIntentHandler,
    StatusAguaIntentHandler,
    AdicionarTarefaIntentHandler,
    InformarNomeNovaTarefaIntentHandler,
    InformarNomeNovaTarefaAtualizarIntentHandler,
    DefinirEscopoTarefaIntentHandler,
    EscopoRecorrenteIntentHandler,
    EscopoHojeIntentHandler,
    CapturarTarefaLivreIntentHandler,
    CheckInIntentHandler,
    StatusObrigatorioIntentHandler,
    StatusNaoObrigatorioIntentHandler,
    ListarTodasTarefasIntentHandler,
    AuditoriaIntentHandler,
    AuditoriaPendentesIntentHandler,
    AuditoriaConcluidasIntentHandler,
    BoaNoiteIntentHandler,
    RotinaChanteIntentHandler,
    AtivarLembretesIntentHandler,
    VouSairIntentHandler,
    ChegueiIntentHandler,
    ConfirmarLembreteIntentHandler,
    MotivacaoIntentHandler,
    YesIntentHandler,
    NoIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler
  )
  .addRequestInterceptors(RequestLogInterceptor)
  .addResponseInterceptors(ResponseLogInterceptor)
  .addErrorHandlers(ErrorHandler)
  .lambda();
