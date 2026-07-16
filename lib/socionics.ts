// Classical socionics (16 types) — the eterotype system
// used across Bestie: the test, the Social Passport, and compatibility.
//
// Key = 4 letters in order [E/I][S/N][L/F][R/X].
//   E/I extraversion/introversion, S/N sensing/intuition,
//   L/F logic/ethics, R/X rationality/irrationality.

export type Family = 'air' | 'fire' | 'water' | 'earth'
export type Pole = 'L' | 'F' | 'S' | 'N' | 'E' | 'I' | 'R' | 'X'

export const ELEMENTS: Record<Family, { name: string; color: string }> = {
  air:   { name: 'Air',   color: '#C7A34F' },
  fire:  { name: 'Fire',  color: '#D06A55' },
  water: { name: 'Water', color: '#5C7E9C' },
  earth: { name: 'Earth', color: '#3F9985' },
}

export const FAMILY: Record<Family, string> = {
  air:   "Air (the alpha quadra, «the researchers») — society's nervous system. Core values: freedom, knowledge, joy, delight. The family's mission is to multiply, deepen and spread knowledge.",
  fire:  "Fire (the beta quadra, «the organizers») — society's musculoskeletal system. Core values: energy and change. The family's mission is motivation, organization, protection and order.",
  water: "Water (the gamma quadra, «the entrepreneurs») — society's internal organs. Core values: resources. The family's mission is distributing and multiplying goods, efficiency, service and diplomacy.",
  earth: "Earth (the delta quadra, «the craftsmen») — society's cardiovascular system. Core values: work, upkeep, relationships, delight. The family's mission is to produce, preserve and bring practical benefit.",
}

export const COLLECTIVE: Record<Family, string> = {
  air:   "The theorists: first understand, weigh and think it through — then act. Depth, reflection, empathy for the complex. Their taste of happiness — to understand.",
  fire:  "The doers: why measure seven times when you can cut now? Movement, achievement, overcoming. Their taste of happiness — to achieve.",
  water: "The creatives: restlessness, imagination, schemes and possibilities in everything. Their taste of happiness — to invent and try the new.",
  earth: "The practitioners: attention to detail, comfort, safety, finishing to quality. Their taste of happiness — solid work and caring for their own.",
}

export const POLES: Record<Pole, { label: string; plus: string; minus: string; dir: string }> = {
  L: { label: 'Logician',  plus: 'precision, objectivity, directness',        minus: 'empathy and «packaging» feelings',        dir: 'analysis, optimization, structures, essence and mechanisms' },
  F: { label: 'Ethical',   plus: 'empathy, emotionality, flexibility',        minus: 'concreteness and business toughness',      dir: 'people, relationships, image, presentation, emotions' },
  S: { label: 'Sensor',    plus: 'concreteness, attentiveness, practicality', minus: 'imagination and foresight',                dir: 'quality execution, the present, specifics and matter' },
  N: { label: 'Intuitive', plus: 'imagination, originality, creativity',      minus: 'decisiveness and attention to detail',     dir: 'ideas, concepts, forecasts, past and future' },
  E: { label: 'Extravert', plus: 'initiative, sociability, breadth',          minus: 'reflection and focus',                     dir: 'many people, new acquaintances, many processes at once' },
  I: { label: 'Introvert', plus: 'depth, concentration, reflection',          minus: 'openness and seizing opportunities',       dir: 'long relationships with a small circle, deep focus' },
  R: { label: 'Rational',  plus: 'consistency, predictability, stability',    minus: 'flexibility in new conditions',            dir: 'plans, regularity, preparing in advance' },
  X: { label: 'Irrational',plus: 'flexibility, adaptability, ease of starting',minus: 'predictability and systematicity',        dir: 'spontaneity, frequent switching, working «as you go»' },
}

export type TypeInfo = { name: string; proto: string; fam: Family; col: Family; intro: string }

export const TYPES: Record<string, TypeInfo> = {
  INLR: { name: 'Analyst',      proto: 'Robespierre',  fam: 'air',   col: 'air',   intro: 'An architect of order. You break the world into structures and patterns and value precision and independence of thought.' },
  INLX: { name: 'Critic',       proto: 'Balzac',       fam: 'water', col: 'air',   intro: 'A skeptical seer. You see how events will unfold and spot the weak points of any idea before anyone else.' },
  INFR: { name: 'Humanist',     proto: 'Dostoevsky',   fam: 'earth', col: 'air',   intro: 'A quiet conscience. You feel people more deeply than they understand themselves and lead them to a better version.' },
  INFX: { name: 'Idealist',     proto: 'Yesenin',      fam: 'fire',  col: 'air',   intro: 'A romantic of time. You feel people’s moods and the flow of time, and inspire others with a dream.' },
  ISLR: { name: 'Inspector',    proto: 'Maxim Gorky',  fam: 'fire',  col: 'earth', intro: 'A keeper of the system. You perfect order: rules, quality, discipline. You can be relied on without fail.' },
  ISLX: { name: 'Craftsman',    proto: 'Gabin',        fam: 'earth', col: 'earth', intro: 'An engineer of comfort. You do with your hands better than many explain with words: precise, beautiful, calm.' },
  ISFR: { name: 'Guardian',     proto: 'Dreiser',      fam: 'water', col: 'earth', intro: 'A guardian of relationships. You sense «us vs. them» and protect those who trust you to the end.' },
  ISFX: { name: 'Diplomat',     proto: 'Dumas',        fam: 'air',   col: 'earth', intro: 'An artist of coziness. You savor the moment and create comfort around you — in space, food, relationships.' },
  ENLR: { name: 'Entrepreneur', proto: 'Jack London',  fam: 'water', col: 'water', intro: 'An engine of efficiency. You see where a resource works and where it burns in vain, and rev up any endeavor.' },
  ENLX: { name: 'Generator',    proto: 'Don Quixote',  fam: 'air',   col: 'water', intro: 'A generator of ideas. You see possibilities where others see a wall and catch fire for the new before anyone.' },
  ENFR: { name: 'Ideologist',   proto: 'Hamlet',       fam: 'fire',  col: 'water', intro: 'An inspirer. You charge whole halls with emotion and lead people toward meaning.' },
  ENFX: { name: 'Advisor',      proto: 'Huxley',       fam: 'earth', col: 'water', intro: 'A guide to possibilities. You see people’s talents before they do and connect the right ones.' },
  ESLR: { name: 'Administrator',proto: 'Stirlitz',     fam: 'earth', col: 'fire',  intro: 'A manager of the work. You turn chaos into a working process: quality, on time, honestly.' },
  ESLX: { name: 'Marshal',      proto: 'Zhukov',       fam: 'fire',  col: 'fire',  intro: 'A strategist of will. You take space and responsibility under control when others hesitate.' },
  ESFR: { name: 'Enthusiast',   proto: 'Hugo',         fam: 'air',   col: 'fire',  intro: 'The sun of the company. You fill the space with emotion and care, and charge everyone around.' },
  ESFX: { name: 'Politician',   proto: 'Napoleon',     fam: 'water', col: 'fire',  intro: 'A master of influence. You read people and situations on the fly and always find the lever.' },
}

// scale, question, option A (first pole L/S/E/R), option B (second pole)
export const QUESTIONS: { scale: 'LF' | 'SN' | 'EI' | 'RX'; q: string; a: string; b: string }[] = [
  { scale: 'LF', q: 'In an argument, what matters more to me…', a: 'Facts, numbers and patterns: how things connect', b: 'People’s feelings and the relationships between them' },
  { scale: 'SN', q: 'In life I’m more…', a: 'Here and now: engaged in the present moment', b: '«Always and everywhere»: thoughts of past and future' },
  { scale: 'EI', q: 'What fills me with energy…', a: 'People, events, a stream of new information', b: 'Silence, depth and turning inward' },
  { scale: 'RX', q: 'I’m more comfortable…', a: 'When there’s a plan and a sequence', b: 'Figuring it out as I go, on the spot' },
  { scale: 'LF', q: 'People would more likely call me…', a: 'Precise, reserved, objective', b: 'Emotional, flexible, feeling' },
  { scale: 'SN', q: 'When I tell a story, I…', a: 'Give concrete examples from life', b: 'Generalize and drift into ideas and theories' },
  { scale: 'EI', q: 'In conversation I tend to…', a: 'Touch on many things a little', b: 'Dig deep into one topic' },
  { scale: 'RX', q: 'I usually explain my decisions with…', a: '«In order to», «it’s necessary», «with a goal»', b: '«By feel», «I want to», «in the flow»' },
  { scale: 'LF', q: 'It’s easier for me to…', a: 'Tell the truth directly, call things by their names', b: 'Soften the facts and choose delicate words' },
  { scale: 'SN', q: 'My perception is more…', a: '«Near-sighted»: I sharply see what’s near', b: '«Far-sighted»: I see horizons, but it’s blurry up close' },
  { scale: 'EI', q: 'Working in a crowded place…', a: 'Charges me: I’m more productive around people', b: 'Drains me: I need my own den' },
  { scale: 'RX', q: 'I reach goals…', a: 'Step by step, one at a time', b: 'Several at once, in parallel and scattered' },
  { scale: 'LF', q: 'Choosing a thing or an idea, I look at…', a: 'The essence and use — the «candy» itself', b: 'The presentation and image — the «wrapper», the vibe' },
  { scale: 'SN', q: 'My anchor is…', a: 'Body sensations and the senses', b: 'Memory, imagination and intuition' },
  { scale: 'EI', q: 'About my feelings and thoughts I…', a: 'Speak them out right away', b: 'First live through them inside, then voice them' },
  { scale: 'RX', q: 'Changes and new conditions…', a: 'Throw me off: I need time to adjust', b: 'Energize me: I switch easily' },
  { scale: 'LF', q: 'In a team I prefer the role of…', a: '«HQ»: essence, mechanisms, result', b: '«Front»: dialogue, people, relationships' },
  { scale: 'SN', q: 'I’m more interested in…', a: 'Doing and finishing to a ready result', b: 'Coming up with ideas and mapping future options' },
  { scale: 'EI', q: 'I’m like someone who digs…', a: 'Many different wells — breadth of contacts and topics', b: 'One deep well — my own topic to the bottom' },
  { scale: 'RX', q: 'In conversation I usually…', a: 'Hold the thread of the topic to the end', b: 'Jump from topic to topic' },
  { scale: 'LF', q: 'It’s easier for me to…', a: 'Explain how something works', b: 'Sense a person’s mood and motives' },
  { scale: 'SN', q: 'To «how’s the weather?» I’d answer…', a: 'Concretely: «+18 and sunny»', b: 'From afar: «the weather was always good here, until…»' },
  { scale: 'EI', q: 'The new, for me…', a: 'I constantly need an inflow of the new', b: 'It’s more interesting to deepen what already exists' },
  { scale: 'RX', q: 'I lean toward…', a: 'Preparing in advance', b: 'Spontaneity: «let’s start, we’ll figure it out»' },
  { scale: 'LF', q: 'In my speech, attention is more on…', a: 'Quantity and quality: «15%, 8 km, 10 schools»', b: 'Judgments and mood: epithets, morals, characters' },
  { scale: 'SN', q: 'I live through events…', a: 'As they happen — I give in to the moment', b: 'In advance, in my mind — they’re already «lived»' },
  { scale: 'EI', q: 'In a big group I…', a: 'Expand connections and make acquaintances', b: 'Am more effective in a small group or one-on-one' },
  { scale: 'RX', q: 'My rhythm is…', a: 'Regularity: a routine and rhythm every day', b: 'Inspiration: in waves, from impulse to impulse' },
]

// ── Russian display layer ────────────────────────────────────────────────────
// Canonical data (stored in DB, used for matching) stays English above.
// These are display-only translations for the test UI.

export const ELEMENTS_RU: Record<Family, string> = {
  air: 'Воздух', fire: 'Огонь', water: 'Вода', earth: 'Земля',
}

export const FAMILY_RU: Record<Family, string> = {
  air:   'Воздух (альфа-квадра, «исследователи») — нервная система общества. Глубинные ценности: свобода, познание, радость, наслаждение. Миссия семьи — умножать, углублять и распространять знания.',
  fire:  'Огонь (бета-квадра, «организаторы») — опорно-двигательный аппарат общества. Глубинные ценности: энергия и перемены. Миссия семьи — мотивация, организация, защита и порядок.',
  water: 'Вода (гамма-квадра, «предприниматели») — внутренние органы общества. Глубинные ценности: ресурсы. Миссия семьи — распределение и умножение благ, эффективность, сервис и дипломатия.',
  earth: 'Земля (дельта-квадра, «мастера») — сердечно-сосудистая система общества. Глубинные ценности: труд, поддержание, отношения, наслаждение. Миссия семьи — производить, сохранять и приносить практическую пользу.',
}

export const COLLECTIVE_RU: Record<Family, string> = {
  air:   'Теоретики: сначала понять, взвесить и обдумать — потом делать. Глубина, рефлексия, эмпатия к сложному. Вкус счастья — понимать.',
  fire:  'Решалы: зачем семь раз отмерять, если можно уже сейчас отрезать? Движение, достижения, преодоление. Вкус счастья — достигать.',
  water: 'Креативщики: непоседливость, фантазия, «схемочки» и возможности во всём. Вкус счастья — придумать и попробовать новое.',
  earth: 'Практики: внимательность к деталям, комфорт, безопасность, доведение до качества. Вкус счастья — добротная работа и забота о своих.',
}

export const POLES_RU: Record<Pole, { label: string; plus: string }> = {
  L: { label: 'Логик',      plus: 'точность, объективность, прямота' },
  F: { label: 'Этик',       plus: 'эмпатичность, эмоциональность, гибкость' },
  S: { label: 'Сенсорик',   plus: 'конкретность, внимательность, практичность' },
  N: { label: 'Интуит',     plus: 'фантазия, оригинальность, креативность' },
  E: { label: 'Экстраверт', plus: 'инициативность, коммуникабельность, широта' },
  I: { label: 'Интроверт',  plus: 'глубина, концентрация, рефлексия' },
  R: { label: 'Рационал',   plus: 'последовательность, предсказуемость, стабильность' },
  X: { label: 'Иррационал', plus: 'гибкость, переключаемость, лёгкость на подъём' },
}

export const TYPES_RU: Record<string, { name: string; proto: string; intro: string }> = {
  INLR: { name: 'Аналитик',        proto: 'Робеспьер',     intro: 'Архитектор порядка. Ты раскладываешь мир на структуры и закономерности и ценишь точность и независимость мысли.' },
  INLX: { name: 'Критик',          proto: 'Бальзак',       intro: 'Провидец-скептик. Ты видишь развитие событий наперёд и замечаешь слабые места любой идеи раньше всех.' },
  INFR: { name: 'Гуманист',        proto: 'Достоевский',   intro: 'Тихая совесть. Ты чувствуешь людей глубже, чем они сами себя понимают, и терпеливо ведёшь их к лучшей версии.' },
  INFX: { name: 'Идеалист',        proto: 'Есенин',        intro: 'Романтик времени. Ты тонко чувствуешь настроения людей и течение времени, умеешь мечтать и вдохновлять мечтой.' },
  ISLR: { name: 'Инспектор',       proto: 'Максим Горький', intro: 'Хранитель системы. Ты доводишь порядок до совершенства: правила, качество, дисциплина. На тебя можно положиться.' },
  ISLX: { name: 'Мастер',          proto: 'Габен',         intro: 'Инженер комфорта. Ты делаешь руками лучше, чем многие объясняют словами: точно, красиво, без суеты.' },
  ISFR: { name: 'Хранитель',       proto: 'Драйзер',       intro: 'Страж отношений. Ты безошибочно чувствуешь «свой — чужой» и до конца защищаешь тех, кто тебе доверился.' },
  ISFX: { name: 'Дипломат',        proto: 'Дюма',          intro: 'Художник уюта. Ты умеешь наслаждаться моментом и создавать комфорт вокруг себя — в пространстве, еде, отношениях.' },
  ENLR: { name: 'Предприниматель', proto: 'Джек Лондон',   intro: 'Двигатель эффективности. Ты видишь, где ресурс работает, а где сгорает впустую, и умеешь разогнать любое дело.' },
  ENLX: { name: 'Генератор',       proto: 'Дон Кихот',     intro: 'Генератор идей. Ты видишь возможности там, где другие видят стену, и зажигаешься новым раньше всех.' },
  ENFR: { name: 'Идеолог',         proto: 'Гамлет',        intro: 'Вдохновитель. Ты умеешь заражать эмоцией целые залы и вести людей за смыслом.' },
  ENFX: { name: 'Советчик',        proto: 'Гексли',        intro: 'Проводник возможностей. Ты видишь таланты людей раньше их самих и умеешь сводить нужных с нужными.' },
  ESLR: { name: 'Администратор',   proto: 'Штирлиц',       intro: 'Управляющий делом. Ты превращаешь хаос в работающий процесс: качественно, в срок, по-честному.' },
  ESLX: { name: 'Маршал',          proto: 'Жуков',         intro: 'Стратег воли. Ты берёшь пространство и ответственность под контроль, когда другие медлят.' },
  ESFR: { name: 'Энтузиаст',       proto: 'Гюго',          intro: 'Солнце компании. Ты наполняешь пространство эмоцией и заботой, умеешь радовать и радоваться.' },
  ESFX: { name: 'Политик',         proto: 'Наполеон',      intro: 'Мастер влияния. Ты читаешь людей и ситуации на лету и всегда находишь рычаг.' },
}

// Same order/scales as QUESTIONS; a = first pole (L/S/E/R).
export const QUESTIONS_RU: { q: string; a: string; b: string }[] = [
  { q: 'В споре для меня важнее…', a: 'Факты, цифры и закономерности: «как это с чем связано»', b: 'Чувства людей и отношения между ними' },
  { q: 'По жизни я больше…', a: 'Здесь и сейчас: включён в настоящий момент', b: '«Всегда и везде»: мысли о прошлом и будущем' },
  { q: 'Меня наполняет энергией…', a: 'Люди, события, поток новой информации', b: 'Тишина, глубина и погружение в себя' },
  { q: 'Мне комфортнее…', a: 'Когда есть план и последовательность', b: 'Разбираться по ходу, «на месте»' },
  { q: 'Про меня скорее скажут…', a: 'Точный, сдержанный, объективный', b: 'Эмоциональный, гибкий, чувствующий' },
  { q: 'Когда я рассказываю о чём-то, я…', a: 'Привожу конкретные примеры из жизни', b: 'Обобщаю и ухожу в рассуждения и теории' },
  { q: 'В разговоре я склонен…', a: 'Говорить о многом понемногу', b: 'Глубоко копать одну тему' },
  { q: 'Свои решения я чаще объясняю…', a: '«Затем», «так надо», «с целью»', b: '«По ощущениям», «хочется», «в потоке»' },
  { q: 'Мне легче…', a: 'Сказать правду прямо, назвать вещи своими именами', b: 'Смягчить факты и подобрать деликатные слова' },
  { q: 'Моё восприятие скорее…', a: '«Близорукое»: практично и цепко вижу то, что рядом', b: '«Дальнозоркое»: вижу горизонты, но размыто вблизи' },
  { q: 'Работа в людном месте меня…', a: 'Заряжает: рядом с людьми продуктивнее', b: 'Выматывает: мне нужна своя нора' },
  { q: 'Цели я достигаю…', a: 'Поэтапно, одну за другой', b: 'Несколько сразу, параллельно и вразброс' },
  { q: 'Выбирая вещь или идею, я смотрю на…', a: 'Суть и пользу — саму «конфету»', b: 'Подачу и образ — «обёртку», атмосферу' },
  { q: 'Моя опора — это…', a: 'Ощущения тела и органы чувств', b: 'Память, воображение и чутьё' },
  { q: 'О своих чувствах и мыслях я…', a: 'Говорю сразу наружу, редко пережёвываю внутри', b: 'Сначала долго проживаю внутри, потом озвучиваю' },
  { q: 'Перемены и новые условия…', a: 'Сбивают: мне нужно время перестроиться', b: 'Взбадривают: легко переключаюсь' },
  { q: 'В команде мне ближе роль…', a: '«Штаб»: суть, механизмы, результат', b: '«Фронт»: диалог, люди, отношения' },
  { q: 'Мне интереснее…', a: 'Сделать и довести до готового результата', b: 'Придумать идею и просчитать варианты будущего' },
  { q: 'Я похож на того, кто копает…', a: 'Много разных колодцев — широта связей и тем', b: 'Один глубокий колодец — своя тема до дна' },
  { q: 'В разговоре я обычно…', a: 'Держу нить темы до конца', b: 'Перепрыгиваю с темы на тему' },
  { q: 'Мне проще…', a: 'Объяснить, как что устроено', b: 'Уловить настроение и мотивы человека' },
  { q: 'На вопрос «как погода?» я отвечу…', a: 'Конкретно: «+18 и солнечно»', b: 'Заходя издалека: «тут всегда была хорошая погода, до тех пор, пока…»' },
  { q: 'Новое для меня…', a: 'Постоянно нужен приток нового: люди, события, информация', b: 'Интереснее анализировать и углублять то, что уже есть' },
  { q: 'Мне ближе…', a: 'Заблаговременная подготовка', b: 'Спонтанность: «давайте начинать, по ходу разберёмся»' },
  { q: 'Внимание в моей речи чаще на…', a: 'Количестве и качестве: «15%, 8 километров, 10 школ»', b: 'Оценках и настроении: эпитеты, мораль, характеры' },
  { q: 'События я проживаю…', a: 'В момент их наступления — отдаюсь силе момента', b: 'Заранее в уме — когда наступают, уже «прожиты»' },
  { q: 'В большой компании я…', a: 'Расширяю связи и завожу знакомства', b: 'Эффективнее в малой группе или один на один' },
  { q: 'Мой ритм — это…', a: 'Регулярность: режим и ритм каждый день', b: 'Вдохновение: волнами, от импульса к импульсу' },
]

export function computeKey(answers: (number | undefined)[]): string {
  const sc = { LF: [0, 0], SN: [0, 0], EI: [0, 0], RX: [0, 0] } as Record<string, number[]>
  QUESTIONS.forEach((q, i) => { const a = answers[i]; if (a === 0 || a === 1) sc[q.scale][a]++ })
  return (sc.EI[0] >= sc.EI[1] ? 'E' : 'I') + (sc.SN[0] >= sc.SN[1] ? 'S' : 'N') +
         (sc.LF[0] >= sc.LF[1] ? 'L' : 'F') + (sc.RX[0] >= sc.RX[1] ? 'R' : 'X')
}

const FLIP: Record<string, string> = { E: 'I', I: 'E', S: 'N', N: 'S', L: 'F', F: 'L', R: 'R', X: 'X' }
// Dual: flip E/I, S/N, L/F; keep R/X. (Don Quixote↔Dumas, Robespierre↔Hugo …)
export function dualOf(key: string): string {
  return FLIP[key[0]] + FLIP[key[1]] + FLIP[key[2]] + key[3]
}

export type Relation = { label: string; score: number; note: string }

// A simplified but socionics-grounded relation model. It correctly flags the
// two extremes — Duality (ideal complement) and Conflict (flip all four) —
// plus same-quadra comfort, and grades everything else by shared dichotomies.
export function relation(a?: string | null, b?: string | null): Relation | null {
  if (!a || !b || !TYPES[a] || !TYPES[b]) return null
  let diffs = 0
  for (let i = 0; i < 4; i++) if (a[i] !== b[i]) diffs++
  if (a === b) return { label: 'Identity', score: 68, note: 'You get each other instantly — same strengths, same blind spots.' }
  if (dualOf(a) === b) return { label: 'Duality', score: 99, note: 'The ideal complement — you cover each other’s blind spots effortlessly.' }
  if (diffs === 4) return { label: 'Conflict', score: 34, note: 'Very different wiring — real, honest effort to understand each other.' }
  const sameFam = TYPES[a].fam === TYPES[b].fam
  const sameCol = TYPES[a].col === TYPES[b].col
  let score = 48
  if (sameFam) score += 22
  if (sameCol) score += 8
  score += (4 - diffs) * 4
  score = Math.min(score, 95)
  const label = sameFam ? 'Same quadra' : (score >= 70 ? 'Good match' : 'Different worlds')
  const note = sameFam
    ? 'You share the same core values — an easy, comfortable connection.'
    : (score >= 70 ? 'Plenty of common ground to build on.' : 'Different worlds — interesting, but takes translation.')
  return { label, score, note }
}
