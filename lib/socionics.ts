// Classical socionics (16 types) — the Eterotype system used across Bestie:
// the test, the Social Passport, and compatibility.
//
// Key = 4 letters in order [E/I][S/N][L/F][R/X].
//   E/I extraversion/introversion, S/N sensing/intuition,
//   L/F logic/ethics, R/X rationality/irrationality.
//
// All display copy below is original Bestie wording. Type names and classic
// prototype nicknames come from public classical socionics (A. Augustinavichute).

export type Family = 'air' | 'fire' | 'water' | 'earth'
export type Pole = 'L' | 'F' | 'S' | 'N' | 'E' | 'I' | 'R' | 'X'

export const ELEMENTS: Record<Family, { name: string; color: string }> = {
  air:   { name: 'Air',   color: '#C7A34F' },
  fire:  { name: 'Fire',  color: '#D06A55' },
  water: { name: 'Water', color: '#5C7E9C' },
  earth: { name: 'Earth', color: '#3F9985' },
}

export const FAMILY: Record<Family, string> = {
  air:   'Air (the alpha quadra) — the explorers. What they treasure: freedom, curiosity, play, and the pure joy of understanding something new. Around them, ideas flow easily and nobody is afraid to ask «why?».',
  fire:  'Fire (the beta quadra) — the drivers. What they treasure: momentum, loyalty, and bold change. They rally people around a goal, protect their own, and keep the group moving when others stall.',
  water: 'Water (the gamma quadra) — the builders of value. What they treasure: independence, results, and smart use of time and resources. They respect competence and dislike empty talk.',
  earth: 'Earth (the delta quadra) — the caretakers. What they treasure: steady work, trust, warm relationships, and quality that lasts. They make places and people feel looked after.',
}

export const COLLECTIVE: Record<Family, string> = {
  air:   'The thinkers: understand first, act second. They go deep, weigh things carefully, and are happiest when a complex thing finally makes sense.',
  fire:  'The movers: action over deliberation. They push through obstacles and are happiest crossing a finish line.',
  water: 'The inventors: restless minds that see an opportunity in everything. They are happiest trying something nobody has tried yet.',
  earth: 'The makers: careful hands and an eye for detail. They are happiest when the work is solid and their people are taken care of.',
}

export const POLES: Record<Pole, { label: string; plus: string; minus: string; dir: string }> = {
  L: { label: 'Logician',  plus: 'clarity, objectivity, straight talk',            minus: 'reading and voicing feelings',          dir: 'systems, analysis, getting to the essence of things' },
  F: { label: 'Ethical',   plus: 'warmth, emotional range, people sense',          minus: 'cold facts and hard bargaining',        dir: 'relationships, atmosphere, presentation, emotions' },
  S: { label: 'Sensor',    plus: 'groundedness, attention to detail, practicality', minus: 'long-range imagination',               dir: 'the here and now, craft, tangible results' },
  N: { label: 'Intuitive', plus: 'imagination, originality, sense of direction',   minus: 'routine details and follow-through',    dir: 'ideas, possibilities, past and future' },
  E: { label: 'Extravert', plus: 'initiative, reach, easy first contact',          minus: 'pausing to reflect',                    dir: 'wide circles, new people, many threads at once' },
  I: { label: 'Introvert', plus: 'depth, focus, self-knowledge',                   minus: 'jumping on open doors',                 dir: 'a close circle, one thing done deeply' },
  R: { label: 'Rational',  plus: 'reliability, structure, steady pace',            minus: 'improvising when plans break',          dir: 'plans, routines, preparing ahead' },
  X: { label: 'Irrational',plus: 'adaptability, spontaneity, quick starts',        minus: 'keeping a steady rhythm',               dir: 'acting in the moment, switching fast, riding inspiration' },
}

export type TypeInfo = { name: string; proto: string; fam: Family; col: Family; intro: string }

export const TYPES: Record<string, TypeInfo> = {
  INLR: { name: 'Analyst',      proto: 'Robespierre',   fam: 'air',   col: 'air',   intro: 'You build clarity where others see noise. Independent thought, clean structure, and honest logic are your signature — people come to you when they need the truth untangled.' },
  INLX: { name: 'Critic',       proto: 'Balzac',        fam: 'water', col: 'air',   intro: 'You see three moves ahead and notice the crack in a plan before anyone else. Your calm skepticism has saved more projects than most people’s enthusiasm.' },
  INFR: { name: 'Humanist',     proto: 'Dostoevsky',    fam: 'earth', col: 'air',   intro: 'You read the inner life of people with quiet precision. Patience, loyalty and moral depth make you the friend people trust with what they tell no one.' },
  INFX: { name: 'Idealist',     proto: 'Yesenin',       fam: 'fire',  col: 'air',   intro: 'You feel the mood of a room and the drift of time before words catch up. Your soft, poetic way of seeing gives others permission to dream.' },
  ISLR: { name: 'Inspector',    proto: 'Maxim Gorky',   fam: 'fire',  col: 'earth', intro: 'You are the person systems can lean on. Discipline, precision and follow-through — when you say it will be done, it is done.' },
  ISLX: { name: 'Craftsman',    proto: 'Gabin',         fam: 'earth', col: 'earth', intro: 'Your hands speak better than most people’s words. Quiet skill, good taste and unhurried independence — what you make simply works, and looks right.' },
  ISFR: { name: 'Guardian',     proto: 'Dreiser',       fam: 'water', col: 'earth', intro: 'You know instantly who is worth trusting, and you stand by your people without flinching. Integrity is not a value you hold — it is what you are made of.' },
  ISFX: { name: 'Diplomat',     proto: 'Dumas',         fam: 'air',   col: 'earth', intro: 'You turn ordinary moments into comfort — a meal, a room, a conversation. Where you are, sharp edges soften and people relax.' },
  ENLR: { name: 'Entrepreneur', proto: 'Jack London',   fam: 'water', col: 'water', intro: 'You can feel where effort pays off and where it burns away. Speed, pragmatism and a taste for the smart play — you make things profitable and alive.' },
  ENLX: { name: 'Generator',    proto: 'Don Quixote',   fam: 'air',   col: 'water', intro: 'Where others see a wall, you see a door nobody has opened yet. Ideas arrive to you first — your curiosity simply refuses to sit still.' },
  ENFR: { name: 'Ideologist',   proto: 'Hamlet',        fam: 'fire',  col: 'water', intro: 'You can set a whole room on fire with meaning. Emotion, timing and vision — in your hands an idea stops being words and becomes a movement.' },
  ENFX: { name: 'Advisor',      proto: 'Huxley',        fam: 'earth', col: 'water', intro: 'You spot what people are capable of before they dare to believe it. Lightness, warmth and an unerring nose for human potential.' },
  ESLR: { name: 'Administrator',proto: 'Stirlitz',      fam: 'earth', col: 'fire',  intro: 'You turn chaos into a process that runs on time and to standard. Honest work, done properly — that is your language of respect.' },
  ESLX: { name: 'Marshal',      proto: 'Zhukov',        fam: 'fire',  col: 'fire',  intro: 'When things get real, you take command without asking permission. Willpower, tactics and the nerve to finish what others only start.' },
  ESFR: { name: 'Enthusiast',   proto: 'Hugo',          fam: 'air',   col: 'fire',  intro: 'You bring the warmth people didn’t know they were missing. Generosity, celebration and genuine care — the room is simply better with you in it.' },
  ESFX: { name: 'Politician',   proto: 'Napoleon',      fam: 'water', col: 'fire',  intro: 'You read people and situations in real time and always find the move. Charm, boldness and a firm practical grip on the world of people.' },
}

// scale, question, option A (first pole L/S/E/R), option B (second pole)
export const QUESTIONS: { scale: 'LF' | 'SN' | 'EI' | 'RX'; q: string; a: string; b: string }[] = [
  { scale: 'LF', q: 'A friend asks for advice. My first instinct is to…', a: 'Lay out the options and what will actually work', b: 'Ask how they feel and what they’re afraid of' },
  { scale: 'SN', q: 'My attention naturally lives…', a: 'In what’s physically around me right now', b: 'In thoughts about what was and what could be' },
  { scale: 'EI', q: 'After a long week, I recharge by…', a: 'Getting out — people, plans, somewhere new', b: 'Going quiet — my own space, my own pace' },
  { scale: 'RX', q: 'A trip works best for me when…', a: 'The route and bookings are settled in advance', b: 'We land first and decide on the spot' },
  { scale: 'LF', q: 'A good decision is one that…', a: 'Holds up against the facts', b: 'Feels right to everyone it touches' },
  { scale: 'SN', q: 'When I explain something, I reach for…', a: 'A concrete case that actually happened', b: 'An analogy or a big-picture idea' },
  { scale: 'EI', q: 'In conversation I’d rather…', a: 'Skim across many topics with many people', b: 'Go deep into one topic with one person' },
  { scale: 'RX', q: 'Behind my choices there’s usually…', a: 'A purpose: «this is needed for that»', b: 'A pull: «this is what I want right now»' },
  { scale: 'LF', q: 'When feedback is needed, I…', a: 'Say it straight, even if it stings', b: 'Cushion it so the person can hear it' },
  { scale: 'SN', q: 'I notice first…', a: 'The details — what changed, what’s off', b: 'The meaning — where this is all heading' },
  { scale: 'EI', q: 'Working in a busy café or open office…', a: 'Feeds me — I focus better with life around', b: 'Drains me — I need my own corner' },
  { scale: 'RX', q: 'With goals, I move…', a: 'One at a time, step by step', b: 'Several at once, in bursts' },
  { scale: 'LF', q: 'When I choose a thing, what wins is…', a: 'What it does — function and substance', b: 'How it feels — style and atmosphere' },
  { scale: 'SN', q: 'I trust most…', a: 'What I can see, touch and check', b: 'What my memory and gut assemble for me' },
  { scale: 'EI', q: 'When something moves me, I…', a: 'Say it out loud almost immediately', b: 'Carry it inside first, share it later — maybe' },
  { scale: 'RX', q: 'Sudden changes of plans…', a: 'Knock me off balance — I need time to re-set', b: 'Wake me up — switching is easy' },
  { scale: 'LF', q: 'In a team, my natural post is…', a: 'The engine room: how it works, what it costs, what it yields', b: 'The front desk: people, mood, connections' },
  { scale: 'SN', q: 'I get more satisfaction from…', a: 'Bringing a thing to a finished, usable state', b: 'Sketching what it could become next year' },
  { scale: 'EI', q: 'My social life looks like…', a: 'A wide map of people from different worlds', b: 'A few deep friendships that go way back' },
  { scale: 'RX', q: 'In a long conversation, I…', a: 'Keep the thread until the topic is done', b: 'Let it wander wherever it wants' },
  { scale: 'LF', q: 'It comes easier to me to…', a: 'Explain how a thing is built', b: 'Sense why a person acted that way' },
  { scale: 'SN', q: 'Asked «how’s the weather?», I answer…', a: 'Precisely: «+18, sunny, light wind»', b: 'With a story: «you should have seen last week…»' },
  { scale: 'EI', q: 'My relationship with the new:', a: 'I need a constant inflow — people, news, impressions', b: 'I’d rather go deeper into what I already have' },
  { scale: 'RX', q: 'Before something important, I…', a: 'Prepare early and arrive ready', b: 'Trust that I’ll figure it out live' },
  { scale: 'LF', q: 'My speech leans on…', a: 'Facts and amounts: «three times», «40%», «in two days»', b: 'Colors and judgments: «wonderful», «unfair», «strange»' },
  { scale: 'SN', q: 'Big moments in life, I…', a: 'Live fully as they happen, in the moment', b: 'Have already replayed in my head beforehand' },
  { scale: 'EI', q: 'At a big party, I usually…', a: 'Circulate — new faces are the point', b: 'Find my two people and stay with them' },
  { scale: 'RX', q: 'My natural rhythm is…', a: 'A steady beat: same hours, same rituals', b: 'Waves: intense bursts, then quiet' },
]

// ── Russian display layer ────────────────────────────────────────────────────
// Canonical data (stored in DB, used for matching) stays English above.

export const ELEMENTS_RU: Record<Family, string> = {
  air: 'Воздух', fire: 'Огонь', water: 'Вода', earth: 'Земля',
}

export const FAMILY_RU: Record<Family, string> = {
  air:   'Воздух (альфа-квадра) — исследователи. Что ценят: свободу, любопытство, игру и чистую радость понимания нового. Рядом с ними идеи текут легко, и никто не боится спросить «почему?».',
  fire:  'Огонь (бета-квадра) — двигатели. Что ценят: напор, верность своим и смелые перемены. Они собирают людей вокруг цели, защищают своих и не дают группе застрять.',
  water: 'Вода (гамма-квадра) — созидатели ценности. Что ценят: независимость, результат и умное обращение со временем и ресурсами. Уважают компетентность, не терпят пустых слов.',
  earth: 'Земля (дельта-квадра) — заботливые. Что ценят: ровный труд, доверие, тёплые отношения и качество, которое живёт долго. С ними и местам, и людям спокойно.',
}

export const COLLECTIVE_RU: Record<Family, string> = {
  air:   'Мыслители: сначала понять, потом действовать. Идут вглубь, взвешивают — и счастливы, когда сложное наконец сходится.',
  fire:  'Деятели: действие важнее раздумий. Продавливают препятствия — и счастливы на финишной черте.',
  water: 'Изобретатели: беспокойный ум, который видит возможность во всём. Счастливы, когда пробуют то, чего ещё никто не пробовал.',
  earth: 'Мастеровые: точные руки и внимание к деталям. Счастливы, когда работа сделана добротно, а свои — под присмотром.',
}

export const POLES_RU: Record<Pole, { label: string; plus: string }> = {
  L: { label: 'Логик',      plus: 'ясность, объективность, прямой разговор' },
  F: { label: 'Этик',       plus: 'теплота, эмоциональный диапазон, чутьё на людей' },
  S: { label: 'Сенсорик',   plus: 'заземлённость, внимание к деталям, практичность' },
  N: { label: 'Интуит',     plus: 'воображение, оригинальность, чувство направления' },
  E: { label: 'Экстраверт', plus: 'инициатива, охват, лёгкий первый контакт' },
  I: { label: 'Интроверт',  plus: 'глубина, фокус, знание себя' },
  R: { label: 'Рационал',   plus: 'надёжность, структура, ровный темп' },
  X: { label: 'Иррационал', plus: 'адаптивность, спонтанность, быстрый старт' },
}

export const TYPES_RU: Record<string, { name: string; proto: string; intro: string }> = {
  INLR: { name: 'Аналитик',        proto: 'Робеспьер',      intro: 'Ты создаёшь ясность там, где другие видят шум. Независимая мысль, чистая структура и честная логика — к тебе приходят, когда нужно распутать правду.' },
  INLX: { name: 'Критик',          proto: 'Бальзак',        intro: 'Ты видишь на три хода вперёд и замечаешь трещину в плане раньше всех. Твой спокойный скепсис спас больше проектов, чем чей-то энтузиазм.' },
  INFR: { name: 'Гуманист',        proto: 'Достоевский',    intro: 'Ты читаешь внутренний мир людей с тихой точностью. Терпение, верность и нравственная глубина — тебе доверяют то, что не говорят никому.' },
  INFX: { name: 'Идеалист',        proto: 'Есенин',         intro: 'Ты чувствуешь настроение комнаты и ход времени раньше, чем слова успевают за ними. Твой мягкий поэтичный взгляд разрешает другим мечтать.' },
  ISLR: { name: 'Инспектор',       proto: 'Максим Горький', intro: 'Ты — тот, на кого может опереться система. Дисциплина, точность, доведение до конца: если ты сказал «будет сделано» — это сделано.' },
  ISLX: { name: 'Мастер',          proto: 'Габен',          intro: 'Твои руки говорят лучше, чем у многих — слова. Тихое мастерство, вкус и неспешная независимость: то, что ты делаешь, просто работает — и выглядит правильно.' },
  ISFR: { name: 'Хранитель',       proto: 'Драйзер',        intro: 'Ты мгновенно понимаешь, кому можно доверять, и стоишь за своих не дрогнув. Порядочность для тебя не ценность — это материал, из которого ты сделан.' },
  ISFX: { name: 'Дипломат',        proto: 'Дюма',           intro: 'Ты превращаешь обычные моменты в уют — еду, комнату, разговор. Там, где ты, острые углы сглаживаются и людям спокойно.' },
  ENLR: { name: 'Предприниматель', proto: 'Джек Лондон',    intro: 'Ты чувствуешь, где усилие окупается, а где сгорает впустую. Скорость, прагматизм и вкус к умному ходу — с тобой дело оживает и приносит плоды.' },
  ENLX: { name: 'Генератор',       proto: 'Дон Кихот',      intro: 'Где другие видят стену, ты видишь дверь, которую ещё никто не открыл. Идеи приходят к тебе первыми — твоё любопытство не умеет сидеть на месте.' },
  ENFR: { name: 'Идеолог',         proto: 'Гамлет',         intro: 'Ты умеешь зажечь смыслом целую комнату. Эмоция, чувство момента и видение — в твоих руках идея перестаёт быть словами и становится движением.' },
  ENFX: { name: 'Советчик',        proto: 'Гексли',         intro: 'Ты видишь, на что способен человек, раньше, чем он сам решается в это поверить. Лёгкость, теплота и безошибочный нюх на человеческий потенциал.' },
  ESLR: { name: 'Администратор',   proto: 'Штирлиц',        intro: 'Ты превращаешь хаос в процесс, который идёт в срок и по стандарту. Честная работа, сделанная как надо, — твой язык уважения.' },
  ESLX: { name: 'Маршал',          proto: 'Жуков',          intro: 'Когда становится серьёзно, ты берёшь командование, не спрашивая разрешения. Воля, тактика и характер доводить до конца то, что другие только начинают.' },
  ESFR: { name: 'Энтузиаст',       proto: 'Гюго',           intro: 'Ты приносишь тепло, которого людям не хватало, даже если они об этом не знали. Щедрость, праздник и настоящая забота — с тобой в комнате просто лучше.' },
  ESFX: { name: 'Политик',         proto: 'Наполеон',       intro: 'Ты читаешь людей и ситуации в реальном времени и всегда находишь ход. Обаяние, смелость и крепкая практическая хватка в мире людей.' },
}

// Same order/scales as QUESTIONS; a = first pole (L/S/E/R).
export const QUESTIONS_RU: { q: string; a: string; b: string }[] = [
  { q: 'Друг просит совета. Мой первый порыв…', a: 'Разложить варианты и показать, что реально сработает', b: 'Спросить, что он чувствует и чего боится' },
  { q: 'Моё внимание само по себе живёт…', a: 'В том, что физически вокруг меня прямо сейчас', b: 'В мыслях о том, что было и что могло бы быть' },
  { q: 'После тяжёлой недели я восстанавливаюсь…', a: 'Выбираясь наружу — люди, планы, новое место', b: 'Уходя в тишину — своё пространство, свой темп' },
  { q: 'Поездка удаётся, когда…', a: 'Маршрут и брони решены заранее', b: 'Сначала прилетаем — разберёмся на месте' },
  { q: 'Хорошее решение — то, которое…', a: 'Выдерживает проверку фактами', b: 'Ощущается правильным для всех, кого касается' },
  { q: 'Объясняя что-то, я тянусь к…', a: 'Конкретному случаю, который реально был', b: 'Аналогии или идее в целом' },
  { q: 'В разговоре мне приятнее…', a: 'Скользить по многим темам со многими людьми', b: 'Уйти вглубь одной темы с одним человеком' },
  { q: 'За моими выборами обычно стоит…', a: 'Цель: «это нужно для того-то»', b: 'Тяга: «этого хочется прямо сейчас»' },
  { q: 'Когда нужна обратная связь, я…', a: 'Говорю прямо, даже если заденет', b: 'Смягчаю, чтобы человек смог услышать' },
  { q: 'Первым делом я замечаю…', a: 'Детали — что изменилось, что не так', b: 'Смысл — куда это всё движется' },
  { q: 'Работа в шумной кофейне или опенспейсе…', a: 'Подпитывает — с жизнью вокруг мне легче собраться', b: 'Выжимает — мне нужен свой угол' },
  { q: 'С целями я двигаюсь…', a: 'По одной, шаг за шагом', b: 'Несколькими сразу, рывками' },
  { q: 'Выбирая вещь, я смотрю прежде всего на…', a: 'Что она делает — функцию и суть', b: 'Как она ощущается — стиль и атмосферу' },
  { q: 'Больше всего я доверяю…', a: 'Тому, что можно увидеть, потрогать и проверить', b: 'Тому, что складывают память и чутьё' },
  { q: 'Когда меня что-то трогает, я…', a: 'Почти сразу говорю об этом вслух', b: 'Сначала ношу в себе, поделюсь позже — может быть' },
  { q: 'Внезапная смена планов…', a: 'Выбивает — мне нужно время перестроиться', b: 'Бодрит — переключаюсь легко' },
  { q: 'В команде моё естественное место…', a: 'Машинное отделение: как работает, что стоит, что даёт', b: 'Передовая: люди, настроение, связи' },
  { q: 'Больше удовольствия мне даёт…', a: 'Довести вещь до готового, рабочего состояния', b: 'Набросать, чем она может стать через год' },
  { q: 'Моя социальная жизнь выглядит как…', a: 'Широкая карта людей из разных миров', b: 'Несколько глубоких дружб на много лет' },
  { q: 'В долгом разговоре я…', a: 'Держу нить, пока тема не закрыта', b: 'Отпускаю его бродить, куда захочет' },
  { q: 'Мне легче даётся…', a: 'Объяснить, как устроена вещь', b: 'Почувствовать, почему человек так поступил' },
  { q: 'На вопрос «как погода?» я отвечу…', a: 'Точно: «+18, солнце, лёгкий ветер»', b: 'Историей: «видел бы ты, что было на прошлой неделе…»' },
  { q: 'Мои отношения с новым:', a: 'Нужен постоянный приток — люди, новости, впечатления', b: 'Лучше углубиться в то, что уже есть' },
  { q: 'Перед важным событием я…', a: 'Готовлюсь заранее и прихожу во всеоружии', b: 'Верю, что разберусь по живому' },
  { q: 'Моя речь опирается на…', a: 'Факты и величины: «в три раза», «40%», «за два дня»', b: 'Краски и оценки: «чудесно», «несправедливо», «странно»' },
  { q: 'Большие моменты жизни я…', a: 'Проживаю целиком, когда они происходят', b: 'Уже прокрутил в голове заранее' },
  { q: 'На большой вечеринке я обычно…', a: 'Курсирую — новые лица и есть смысл', b: 'Нахожу своих двоих и остаюсь с ними' },
  { q: 'Мой естественный ритм…', a: 'Ровный такт: одни и те же часы, свои ритуалы', b: 'Волны: мощные рывки, потом тишина' },
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
