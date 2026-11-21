// Datos de los métodos aplicados de los mejores canales (ver METHOD_SOURCES)
window.CHANNELS = {
  en: [
    { n: 'Miss Honey · Slow English Podcast', h: 'slow_english_podcast', lv: 'A1–A2', why: 'Inglés lento y claro: input comprensible para empezar.' },
    { n: 'EnglishSponge', h: 'englishspongeci', lv: 'A0–C1', why: '700+ vídeos de input comprensible ordenados por nivel.' },
    { n: 'Volka English', h: 'volkaenglish', lv: 'A2–B1', why: 'Historias y temas divertidos con inglés natural.' },
    { n: 'Pensando Inglés', h: 'pensandoingles6884', lv: 'A2–B2', why: 'Nativo que enseña con input real a hispanohablantes.' },
    { n: 'English after hours', h: 'englishafterhours', lv: 'B1–B2', why: 'Conversación natural, acento irlandés.' },
    { n: 'BBC Learning English', h: 'bbclearningenglish', lv: 'B1–C1', why: 'Noticias, pronunciación y expresiones británicas.' },
    { n: 'EspeakEnglish', h: 'espeak.english', lv: 'A1–B1', why: 'Explicaciones en español para hispanohablantes.' }
  ],
  pt: [
    { n: 'Tus Clases de Portugués', h: 'tusclasesdeportugues', lv: 'A1–B1', why: 'Curso desde cero para hispanohablantes (895k suscriptores).' },
    { n: 'Speaking Brazilian', h: 'speakingbrazilian', lv: 'A1–B2', why: 'Gramática, vocabulario y pronunciación de Brasil.' },
    { n: 'Teach Yourself Portuguese', h: 'teachyourselfportuguese', lv: 'A1–B1', why: 'Input comprensible en portugués brasileño.' },
    { n: 'Learn Brazilianese', h: 'learnbrazilianese', lv: 'A2–B1', why: 'Input comprensible + shadowing.' },
    { n: 'Brazilian Portuguese with Sofia', h: 'portuguesewithsofia', lv: 'B1–B2', why: 'Vida real en Río: expresiones en contexto.' },
    { n: 'Portugués con Philipe Brazuca', h: 'philipebrazuca', lv: 'A2–B2', why: 'Jerga y portugués real explicado en español.' },
    { n: 'Português com Marcia Macedo', h: 'portuguescommarciamacedobr', lv: 'B2–C1', why: '100% en portugués, nivel avanzado.' }
  ],
  ja: [
    { n: 'Natural Japanese (CI Japanese)', h: 'nijapanese', lv: 'A0–B2', why: 'El método de input comprensible más completo para japonés.' },
    { n: 'Akiko Japanese Conversations', h: 'aki-senseijpn', lv: 'N5–N3', why: 'Input comprensible y conversación para principiantes.' },
    { n: 'ALPC · Slow Japanese Podcast', h: 'alpaca_japanese', lv: 'N5–N4', why: 'Japonés lento para escuchar a diario.' },
    { n: 'いろいろな日本語', h: 'iroironanihongo', lv: 'N4–N3', why: 'Input sobre anime, manga y cultura.' },
    { n: 'Ren – Joy of Japanese', h: 'joyofjapanese', lv: 'N4–N2', why: 'Input comprensible y preparación JLPT.' },
    { n: 'Japanese Immersion with Asami', h: 'japaneseimmersionwithasami4249', lv: 'N5–N3', why: 'Historias (TPRS) e inmersión.' },
    { n: 'Organic Japanese with Cure Dolly', h: 'organicjapanesewithcuredol49', lv: 'N5–N3', why: 'La gramática japonesa explicada desde su lógica real.' }
  ]
};

// Hitos de horas de input (inspirado en el seguimiento por horas de los métodos de input comprensible)
window.INPUT_MILESTONES = [[10, '🌱 Primeros sonidos'], [50, '👂 Reconoces palabras sueltas'], [150, '🙂 Sigues temas sencillos'], [300, '💬 Entiendes conversaciones lentas'], [600, '🎬 Disfrutas contenido nativo con esfuerzo'], [1000, '🚀 Conversación cómoda'], [1500, '👑 Comprensión casi nativa']];

// Núcleo de alta frecuencia: "con 1000 palabras cubres el 85% de lo cotidiano" (Lonsdale). Empieza con las 50 + la caja de herramientas.
window.CORE = {
  en: { tools: [['How do you say…?', '', '¿Cómo se dice…?'], ['What does … mean?', '', '¿Qué significa…?'], ['I don\'t understand.', '', 'No entiendo.'], ['Can you repeat, please?', '', '¿Puede repetir, por favor?'], ['More slowly, please.', '', 'Más despacio, por favor.'], ['Is this correct?', '', '¿Esto es correcto?']],
    words: 'the=el/la|be=ser/estar|to=a/para|of=de|and=y|a=un/una|in=en|that=que/eso|have=tener|I=yo|it=eso/ello|for=para/por|not=no|on=sobre/en|with=con|he=él|as=como|you=tú/usted|do=hacer|at=en (lugar)|this=esto|but=pero|his=su (de él)|by=por|from=de/desde|they=ellos|we=nosotros|say=decir|her=su/ella|she=ella|or=o|will=(futuro)|my=mi|one=uno|all=todo|would=(condicional)|there=allí/hay|their=su (de ellos)|what=qué|so=así/entonces|up=arriba|out=fuera|if=si|about=sobre/acerca de|who=quién|get=obtener/conseguir|which=cuál|go=ir|me=me/mí|when=cuándo' },
  pt: { tools: [['Como se diz…?', '', '¿Cómo se dice…?'], ['O que significa…?', '', '¿Qué significa…?'], ['Não entendi.', '', 'No entendí.'], ['Pode repetir, por favor?', '', '¿Puede repetir, por favor?'], ['Mais devagar, por favor.', '', 'Más despacio, por favor.'], ['Está certo?', '', '¿Está bien?']],
    words: 'de=de|a=la / a|o=el|que=que|e=y|do=del|da=de la|em=en|um=un|para=para|é=es|com=con|não=no|uma=una|os=los|no=en el|se=se/si|na=en la|por=por|mais=más|as=las|dos=de los|como=como|mas=pero|foi=fue|ao=al|ele=él|das=de las|tem=tiene|à=a la|seu=su|sua=su|ou=o|ser=ser|quando=cuando|muito=mucho|há=hay/hace|nos=nos/en los|já=ya|está=está|eu=yo|também=también|só=solo|pelo=por el|pela=por la|até=hasta|isso=eso|ela=ella|entre=entre|era=era' },
  ja: { tools: [['〜は にほんごで なんですか', 'wa nihongo de nan desu ka', '¿Cómo se dice … en japonés?'], ['〜って どういう いみですか', 'tte dō iu imi desu ka', '¿Qué significa…?'], ['わかりません', 'wakarimasen', 'No entiendo.'], ['もう いちど おねがいします', 'mō ichido onegaishimasu', 'Otra vez, por favor.'], ['ゆっくり おねがいします', 'yukkuri onegaishimasu', 'Más despacio, por favor.'], ['これで あっていますか', 'kore de atte imasu ka', '¿Está correcto así?']],
    words: 'これ=kore · esto|それ=sore · eso|わたし=watashi · yo|あなた=anata · tú|なに=nani · qué|だれ=dare · quién|どこ=doko · dónde|いつ=itsu · cuándo|どうして=dōshite · por qué|はい=hai · sí|いいえ=iie · no|ある=aru · haber (cosas)|いる=iru · haber (seres)|する=suru · hacer|なる=naru · volverse|いく=iku · ir|くる=kuru · venir|みる=miru · ver|たべる=taberu · comer|のむ=nomu · beber|いう=iu · decir|おもう=omou · pensar|わかる=wakaru · entender|しる=shiru · saber|ほしい=hoshii · querer (algo)|いい=ii · bueno|おおきい=ōkii · grande|ちいさい=chiisai · pequeño|たくさん=takusan · mucho|すこし=sukoshi · un poco|いま=ima · ahora|きょう=kyō · hoy|あした=ashita · mañana|きのう=kinō · ayer|ひと=hito · persona|もの=mono · cosa|こと=koto · asunto|とき=toki · momento|ところ=tokoro · lugar|ともだち=tomodachi · amigo|ことば=kotoba · palabra|です=desu · es|ない=nai · no (negación)|も=mo · también|から=kara · desde/porque|まで=made · hasta|でも=demo · pero|そして=soshite · y luego|とても=totemo · muy|もう=mō · ya' }
};

// Pares mínimos: entrena el oído (los sonidos que tu cerebro aún "filtra")
window.MINPAIRS = {
  en: [['ship', 'sheep', 'barco / oveja'], ['live', 'leave', 'vivir / irse'], ['bat', 'bet', 'murciélago / apostar'], ['cat', 'cut', 'gato / cortar'], ['think', 'sink', 'pensar / hundirse'], ['very', 'berry', 'muy / baya'], ['light', 'right', 'luz / derecha'], ['full', 'fool', 'lleno / tonto'], ['walk', 'work', 'caminar / trabajar'], ['three', 'tree', 'tres / árbol'], ['beach', 'bitch', '¡cuidado! playa / insulto'], ['sheet', 'shit', '¡cuidado! hoja / grosería'], ['hat', 'hot', 'sombrero / caliente'], ['pool', 'pull', 'piscina / tirar']],
  pt: [['avó', 'avô', 'abuela / abuelo'], ['vovó', 'vovô', 'abuelita / abuelito'], ['pão', 'pau', 'pan / palo'], ['pais', 'país', 'padres / país'], ['caro', 'carro', 'caro / coche'], ['bebê', 'bebe', 'bebé / bebe'], ['pode', 'pôde', 'puede / pudo'], ['sede', 'cede', 'sed / cede'], ['mal', 'mau', 'mal / malo'], ['tia', 'tchau', 'tía / chao'], ['está', 'esta', 'está / esta'], ['nós', 'noz', 'nosotros / nuez']],
  ja: [['おばさん', 'おばあさん', 'tía / abuela'], ['おじさん', 'おじいさん', 'tío / abuelo'], ['きて', 'きって', 'ven / sello'], ['ここ', 'こうこう', 'aquí / bachillerato'], ['びょういん', 'びよういん', 'hospital / peluquería'], ['え', 'ええ', 'cuadro / sí'], ['さか', 'さっか', 'cuesta / escritor'], ['ゆき', 'ゆうき', 'nieve / valor'], ['かいしゃ', 'かいしゃ', '— (igual: practica el ritmo)'], ['しゅじん', 'しゅうじん', 'esposo / prisionero'], ['いえ', 'いいえ', 'casa / no'], ['おと', 'おっと', 'sonido / esposo']]
};
window.MINPAIRS.ja = window.MINPAIRS.ja.filter(p => p[0] !== p[1]);

// Temas para hablar contigo mismo (self‑talk / "conversaciones en la ducha")
window.SELFTALK = ['Describe tu día de hoy de principio a fin', 'Cuenta tus planes para el fin de semana', 'Describe la habitación donde estás', 'Habla de tu comida favorita y cómo se prepara', 'Explica por qué estás aprendiendo este idioma', 'Cuenta una anécdota divertida que te pasó', 'Describe a tu mejor amigo o amiga', 'Habla de una película o serie que te guste', 'Explica cómo llegar de tu casa a tu trabajo o escuela', 'Imagina que pides comida en un restaurante (haz los dos papeles)', 'Imagina que preguntas una dirección y te responden (haz los dos papeles)', 'Opina: ¿es mejor vivir en la ciudad o en el campo?'];

window.METHOD_SOURCES = [
  { t: 'How to learn any language in six months', by: 'Chris Lonsdale · TEDx (37,8 M de vistas)', id: 'd0yGdNEWdn0', p: 'Contenido relevante para ti, usar el idioma como herramienta desde el día 1, input comprensible, entrenar oído y músculos, estado relajado, tolerar la ambigüedad, escuchar mucho, núcleo de alta frecuencia, "padre lingüístico" que no corrige sino reformula, imitar la cara y conectar sonidos con imágenes sin traducir.' },
  { t: 'The secrets of learning a new language', by: 'Lýdia Machová · TED (12,6 M)', id: 'o_XVt5rdpFY', p: 'Disfrutar el proceso con contenido que te gusta, repetición espaciada, un sistema diario (15 min al despertar, podcasts en el camino), hablar contigo mismo y medir tu progreso.' },
  { t: '5 techniques to speak any language', by: 'Sid Efromovich · TEDx (13,2 M)', id: '-WLHr1_EVtQ', p: 'Equivocarse a propósito para salir de tu "base de sonidos", anotar la pronunciación real, buscar quien te corrija con detalle, conversaciones imaginarias en la ducha (haciendo los dos papeles) y un compañero de conversación.' },
  { t: 'Learning Japanese isn\'t actually that hard', by: 'Trenton · (5,9 M)', id: '7fvCb5_Nzq4', p: 'Kana en pocos días, gramática básica sin obsesionarse, inmersión de horas al día (también pasiva), tolerar la ambigüedad, Anki de 10‑20 tarjetas nuevas al día, "minar" frases del contenido real, entrenar el acento tonal y hablar/escribir cuando ya entiendes bastante.' },
  { t: 'How to learn a language: INPUT', by: 'Joseph Everett · (4,6 M)', id: 'J_EQDtpYSNM', p: 'Input comprensible primero, empezar con las 100 palabras más frecuentes y hacer shadowing poco a poco, grabándote.' }
];
