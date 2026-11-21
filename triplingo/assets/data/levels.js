// Niveles Básico (pre‑A1) y C2 (maestría). Se insertan antes/después de las 24 unidades A1–C1.
(function () {
const BASIC = {
en: [
{t:"El alfabeto y los sonidos", g:`<p>El inglés tiene 26 letras pero <b>más de 40 sonidos</b>: la escritura no siempre indica la pronunciación. Deletrear es muy útil: <b>A</b> (ei), <b>E</b> (i), <b>I</b> (ai), <b>O</b> (ou), <b>U</b> (iu), <b>Y</b> (uái).</p><p>Vocales cortas vs largas: <i>ship</i> /ɪ/ vs <i>sheep</i> /iː/. La <b>h</b> se pronuncia (aspirada) en <i>house</i>.</p><p>Pregunta útil: <b>How do you spell it?</b> (¿Cómo se deletrea?).</p>`,
v:[["Letter","léter","Letra"],["Spell","spel","Deletrear"],["Sound","sáund","Sonido"],["Word","uérd","Palabra"],["Sheep","ship","Oveja"],["Ship","ship (corta)","Barco"],["Yes","iés","Sí"],["No","nou","No"]],
s:[["How do you spell your name?","","¿Cómo se deletrea tu nombre?"],["My name is spelled A N A.","","Mi nombre se deletrea A N A."],["Can you repeat, please?","","¿Puede repetir, por favor?"]]},
{t:"Colores y objetos", g:`<p>Los colores van <b>antes</b> del sustantivo: <i>a red car</i> (un coche rojo).</p><p>Artículos: <b>a</b> antes de consonante (<i>a book</i>), <b>an</b> antes de sonido vocal (<i>an apple</i>). <b>the</b> = el/la/los/las.</p><p>Plural regular con <b>-s</b>: <i>book → books</i>.</p>`,
v:[["Red","red","Rojo"],["Blue","blu","Azul"],["Green","grin","Verde"],["Black","blak","Negro"],["White","uáit","Blanco"],["Book","buk","Libro"],["Phone","foun","Teléfono"],["Table","téibol","Mesa"]],
s:[["The book is red.","","El libro es rojo."],["I have a black phone.","","Tengo un teléfono negro."],["An apple and two books.","","Una manzana y dos libros."]]},
{t:"Días, meses y clima", g:`<p>Días y meses se escriben con <b>mayúscula</b>: <i>Monday, January</i>.</p><p>Preposiciones: <b>on</b> + día (<i>on Monday</i>), <b>in</b> + mes (<i>in May</i>), <b>at</b> + hora (<i>at 5</i>).</p><p>Clima con <b>It's</b>: <i>It's sunny, it's cold, it's raining</i>.</p>`,
v:[["Monday","mándei","Lunes"],["Friday","fráidei","Viernes"],["Sunday","sándei","Domingo"],["January","yániueri","Enero"],["Sunny","sáni","Soleado"],["Cold","kould","Frío"],["Hot","jot","Caluroso"],["Today","tudéi","Hoy"]],
s:[["Today is Monday.","","Hoy es lunes."],["It's cold in January.","","Hace frío en enero."],["See you on Friday!","","¡Nos vemos el viernes!"]]},
{t:"Frases de supervivencia", g:`<p>Con 10 frases puedes sobrevivir en cualquier país: pedir ayuda, decir que no entiendes y pedir que hablen despacio.</p><p><b>Excuse me</b> = disculpe (para llamar la atención). <b>Sorry</b> = perdón (por un error).</p><p>Usa <b>please</b> y <b>thank you</b> siempre: el inglés es muy cortés.</p>`,
v:[["Help","jelp","Ayuda"],["Sorry","sóri","Perdón"],["Excuse me","ekskiús mi","Disculpe"],["I don't understand","ai dont anderstánd","No entiendo"],["Slowly","slóuli","Despacio"],["Bathroom","báthrum","Baño"],["Where","uér","Dónde"],["How much","jáu mach","Cuánto"]],
s:[["Excuse me, where is the bathroom?","","Disculpe, ¿dónde está el baño?"],["Sorry, I don't understand.","","Perdón, no entiendo."],["Can you speak slowly, please?","","¿Puede hablar despacio, por favor?"]]}
],
pt: [
{t:"Alfabeto y sonidos nasales", g:`<p>El alfabeto es como el español, con <b>k, w, y</b> solo en palabras extranjeras. Acentos: <b>´</b> (abierto: <i>café</i>), <b>^</b> (cerrado: <i>você</i>), <b>~</b> (nasal: <i>mãe</i>), <b>ç</b> = "s" (<i>coração</i>).</p><p>Nasales: <b>ão, ãe, õe, em, im</b>. Practica <i>pão, mãe, põe, bem</i>.</p><p>Pregunta: <b>Como se escreve?</b> (¿Cómo se escribe?).</p>`,
v:[["Letra","létra","Letra"],["Som","son","Sonido"],["Palavra","paláura","Palabra"],["Mãe","mãi","Madre"],["Pão","pãu","Pan"],["Coração","korasãu","Corazón"],["Sim","sin","Sí"],["Não","nãu","No"]],
s:[["Como se escreve o seu nome?","","¿Cómo se escribe tu nombre?"],["Pode repetir, por favor?","","¿Puede repetir, por favor?"],["Eu não sei.","","No sé."]]},
{t:"Colores y objetos", g:`<p>Los colores van <b>después</b> del sustantivo y concuerdan: <i>o carro vermelho, a casa vermelha</i>.</p><p>Artículos: <b>o, a, os, as</b> (el, la…), <b>um, uma</b> (un, una).</p><p>Ojo: <b>roxo</b> = morado (no "rojo"), <b>vermelho</b> = rojo.</p>`,
v:[["Vermelho","vermélio","Rojo"],["Azul","azúu","Azul"],["Verde","vêrdi","Verde"],["Preto","prêtu","Negro"],["Branco","brânku","Blanco"],["Roxo","rôchu","Morado"],["Livro","lívru","Libro"],["Mesa","mêza","Mesa"]],
s:[["O livro é vermelho.","","El libro es rojo."],["Eu tenho um celular preto.","","Tengo un celular negro."],["A mesa é branca.","","La mesa es blanca."]]},
{t:"Días, meses y clima", g:`<p>Los días se numeran: <b>segunda‑feira</b> (lunes), <b>terça‑feira</b> (martes), <b>quarta</b>, <b>quinta</b>, <b>sexta</b>; luego <b>sábado</b> y <b>domingo</b>.</p><p>Clima: <b>Está calor / frio</b>, <b>Está chovendo</b>, <b>Faz sol</b>.</p><p>Meses en minúscula: <i>janeiro, fevereiro…</i></p>`,
v:[["Segunda-feira","segúnda féira","Lunes"],["Sexta-feira","sêsta féira","Viernes"],["Domingo","domíngu","Domingo"],["Janeiro","yanéiru","Enero"],["Sol","sóu","Sol"],["Frio","fríu","Frío"],["Calor","kalór","Calor"],["Hoje","ôyi","Hoy"]],
s:[["Hoje é segunda-feira.","","Hoy es lunes."],["Está muito calor hoje.","","Hace mucho calor hoy."],["Até sexta!","","¡Hasta el viernes!"]]},
{t:"Frases de supervivencia", g:`<p><b>Com licença</b> = disculpe (pasar o llamar la atención). <b>Desculpa</b> = perdón.</p><p><b>Não entendi</b> (no entendí) es la forma natural en Brasil. <b>Fala devagar, por favor</b> = habla despacio.</p><p><b>Banheiro</b> = baño (en Portugal: <i>casa de banho</i>).</p>`,
v:[["Socorro","sokôhu","¡Auxilio!"],["Desculpa","deskúlpa","Perdón"],["Com licença","kon lisênsa","Disculpe / con permiso"],["Não entendi","nãu entenyí","No entendí"],["Devagar","devagár","Despacio"],["Banheiro","bañéiru","Baño"],["Onde","ônyi","Dónde"],["Quanto","kuántu","Cuánto"]],
s:[["Com licença, onde fica o banheiro?","","Disculpe, ¿dónde está el baño?"],["Desculpa, não entendi.","","Perdón, no entendí."],["Fala devagar, por favor.","","Habla despacio, por favor."]]}
],
ja: [
{t:"Sonidos y vocales (あいうえお)", g:`<p>El japonés tiene solo <b>5 vocales</b> como el español: <b>あ a, い i, う u, え e, お o</b>. Cada kana es una sílaba (consonante + vocal), excepto <b>ん</b> (n).</p><p><b>Vocales largas</b> cambian el significado: <i>おばさん</i> (tía) vs <i>おばあさん</i> (abuela). <b>っ</b> pequeña = pausa doble: <i>きって</i> (sello).</p><p>👉 Practica escribir en <b>Escritura japonesa</b>: dibuja cada kana con tu dedo.</p>`,
v:[["あ","a","a"],["い","i","i"],["う","u","u"],["え","e","e"],["お","o","o"],["あい","ai","Amor"],["いえ","ie","Casa"],["うえ","ue","Arriba"]],
s:[["あい","ai","Amor"],["いえ が あります。","ie ga arimasu","Hay una casa."],["うえ を みて。","ue o mite","Mira arriba."]]},
{t:"Números y kanji 一二三", g:`<p>Los números tienen kanji muy sencillos: <b>一</b> (1), <b>二</b> (2), <b>三</b> (3), <b>四</b> (4), <b>五</b> (5), <b>六</b> (6), <b>七</b> (7), <b>八</b> (8), <b>九</b> (9), <b>十</b> (10).</p><p>Los tres primeros son líneas: ¡una, dos y tres rayas! Se escriben de <b>arriba abajo</b> y de <b>izquierda a derecha</b>.</p><p>Practica su trazo en la sección <b>Kanji</b>.</p>`,
v:[["一","ichi","Uno"],["二","ni","Dos"],["三","san","Tres"],["四","yon","Cuatro"],["五","go","Cinco"],["六","roku","Seis"],["七","nana","Siete"],["十","jū","Diez"]],
s:[["一 二 三","ichi ni san","Uno, dos, tres"],["十 です。","jū desu","Son diez."],["五 こ ください。","go ko kudasai","Cinco, por favor."]]},
{t:"Colores y objetos", g:`<p>Muchos colores son adjetivos ‑い: <b>あかい</b> (rojo), <b>あおい</b> (azul), <b>しろい</b> (blanco), <b>くろい</b> (negro). Van <b>antes</b> del sustantivo: <i>あかい ほん</i>.</p><p>Otros usan <b>の</b>: <i>みどり の ほん</i> (libro verde).</p><p><b>これ</b> = esto, <b>それ</b> = eso.</p>`,
v:[["あかい","akai","Rojo"],["あおい","aoi","Azul"],["しろい","shiroi","Blanco"],["くろい","kuroi","Negro"],["みどり","midori","Verde"],["ほん","hon","Libro"],["ペン","pen","Bolígrafo"],["つくえ","tsukue","Escritorio"]],
s:[["これ は あかい ほん です。","kore wa akai hon desu","Esto es un libro rojo."],["くろい ペン が あります。","kuroi pen ga arimasu","Hay un bolígrafo negro."],["それ は なん ですか。","sore wa nan desu ka","¿Qué es eso?"]]},
{t:"Frases de supervivencia", g:`<p><b>すみません</b> sirve para todo: disculpe, perdón, gracias por la molestia.</p><p><b>わかりません</b> = no entiendo. <b>もう いちど</b> = otra vez. <b>ゆっくり</b> = despacio.</p><p>Añade <b>おねがいします</b> (por favor) para pedir con cortesía.</p>`,
v:[["たすけて","tasukete","¡Ayuda!"],["わかりません","wakarimasen","No entiendo"],["もういちど","mō ichido","Otra vez"],["ゆっくり","yukkuri","Despacio"],["トイレ","toire","Baño"],["どこ","doko","Dónde"],["いくら","ikura","Cuánto"],["おねがいします","onegaishimasu","Por favor"]],
s:[["すみません、 トイレ は どこ ですか。","sumimasen, toire wa doko desu ka","Disculpe, ¿dónde está el baño?"],["すみません、 わかりません。","sumimasen, wakarimasen","Perdón, no entiendo."],["ゆっくり おねがいします。","yukkuri onegaishimasu","Más despacio, por favor."]]}
]
};

const C2 = {
en: [
{t:"Registro académico", g:`<p>El inglés académico prefiere la <b>nominalización</b>: <i>"we analysed" → "the analysis showed"</i>.</p><p><b>Hedging</b> (matizar): <i>it appears that, the data suggest, arguably, to a certain extent</i>.</p><p>Verbos de reporte precisos: <b>contend, posit, refute, concede, underscore</b>.</p>`,
v:[["Posit","pósit","Postular"],["Refute","rifiút","Refutar"],["Concede","konsíd","Conceder / admitir"],["Underscore","andersków","Subrayar / recalcar"],["Arguably","árguiuabli","Posiblemente / se podría decir"],["Notwithstanding","notuizstánding","No obstante"],["Paradigm","páradaim","Paradigma"],["Salient","séilient","Destacado"]],
s:[["The findings underscore the need for further research.","","Los hallazgos subrayan la necesidad de más investigación."],["Arguably, this is the most salient issue.","","Posiblemente, este es el asunto más destacado."],["Notwithstanding these limitations, the study is valuable.","","A pesar de estas limitaciones, el estudio es valioso."]]},
{t:"Humor, ironía y dobles sentidos", g:`<p>El <b>understatement</b> británico: <i>"It's a bit chilly"</i> (hace un frío terrible). <b>Sarcasmo</b>: <i>"Oh great, another meeting."</i></p><p><b>Puns</b> (juegos de palabras): <i>"I'm reading a book on anti‑gravity. It's impossible to put down."</i></p><p>Entender humor = nivel C2: requiere cultura y matices.</p>`,
v:[["Pun","pan","Juego de palabras"],["Tongue-in-cheek","tang in chik","Irónico / en broma"],["Deadpan","dédpan","Inexpresivo (humor seco)"],["Wry","rai","Irónico / socarrón"],["Understatement","anderstéitment","Atenuación"],["Banter","bánter","Bromas / charla ingeniosa"],["Quip","kuip","Ocurrencia"],["Witty","uíti","Ingenioso"]],
s:[["It was a tongue-in-cheek comment.","","Fue un comentario en broma."],["Their banter was incredibly witty.","","Sus bromas eran increíblemente ingeniosas."],["He delivered the joke completely deadpan.","","Contó el chiste con total seriedad."]]},
{t:"Literatura y estilo", g:`<p>Recursos literarios: <b>metaphor, simile, alliteration, foreshadowing</b>.</p><p>Inversión y estructuras arcaicas en literatura: <i>"Little did she know…"</i>, <i>"Were I to…"</i> (=If I were to).</p><p>Leer clásicos (sección <b>Libros</b>) es el mejor entrenamiento C2.</p>`,
v:[["Foreshadowing","forshádouing","Presagio"],["Simile","símili","Símil"],["Alliteration","aliteréishon","Aliteración"],["Poignant","póiñant","Conmovedor"],["Eloquent","élokuent","Elocuente"],["Vivid","vívid","Vívido"],["Ambiguous","ambíguius","Ambiguo"],["Little did","lítol did","Poco sabía…"]],
s:[["Little did she know what was coming.","","Poco sabía ella lo que se venía."],["Were I to accept, I would move abroad.","","Si aceptara, me mudaría al extranjero."],["It was a poignant and eloquent speech.","","Fue un discurso conmovedor y elocuente."]]},
{t:"Maestría: precisión y naturalidad", g:`<p>C2 = decir exactamente lo que quieres con naturalidad. Colocaciones: <b>make a decision, take a risk, heavy rain, strong coffee</b> (no "big rain").</p><p>Sinónimos con matices: <i>look / glance / stare / gaze / peer</i>.</p><p>Meta: pensar en inglés. Habla contigo mismo, escribe un diario y conversa con la IA sobre temas complejos.</p>`,
v:[["Glance","glans","Echar un vistazo"],["Stare","ster","Mirar fijamente"],["Gaze","gueis","Contemplar"],["Collocation","kolokéishon","Colocación"],["Seamless","símles","Sin fisuras / fluido"],["Nuanced","níuanst","Matizado"],["Articulate","artíkiulet","Elocuente / articular"],["Take a risk","teik a risk","Arriesgarse"]],
s:[["She glanced at me and smiled.","","Me echó un vistazo y sonrió."],["His argument was nuanced and articulate.","","Su argumento fue matizado y elocuente."],["Sometimes you have to take a risk.","","A veces hay que arriesgarse."]]}
],
pt: [
{t:"Registro académico", g:`<p>Portugués académico: voz pasiva con <b>se</b> (<i>analisa-se</i>), nominalización y conectores formales: <b>outrossim, destarte, por conseguinte</b>.</p><p>Matizar: <b>Ao que tudo indica…, Cumpre salientar que…, Convém ressaltar…</b></p><p>Mesóclisis (solo muy formal): <i>dir-se-ia</i> (se diría).</p>`,
v:[["Cumpre salientar","kúmpri salientár","Cabe destacar"],["Por conseguinte","pur konseguínchi","Por consiguiente"],["Destarte","destárchi","De este modo"],["Outrossim","outrosín","Asimismo"],["Hipótese","ipótezi","Hipótesis"],["Ao que tudo indica","au ki túdu indíka","Todo indica que"],["Refutar","hefutár","Refutar"],["Dir-se-ia","dir-si-ía","Se diría"]],
s:[["Cumpre salientar que os dados são preliminares.","","Cabe destacar que los datos son preliminares."],["Por conseguinte, a hipótese foi refutada.","","Por consiguiente, la hipótesis fue refutada."],["Dir-se-ia que o problema é antigo.","","Se diría que el problema es antiguo."]]},
{t:"Humor e ironía brasileña", g:`<p>El humor brasileño usa mucho la <b>ironía</b> y el <b>exagero</b>: <i>"Imagina!"</i> (¡qué va!), <i>"Só que não"</i> (¡no!, al final de una frase irónica).</p><p>Expresiones: <b>chorar de rir</b> (llorar de risa), <b>zoar</b> (burlarse en broma), <b>tirar sarro</b>.</p>`,
v:[["Só que não","só ki nãu","¡Pues no! (ironía)"],["Imagina!","imayína","¡Qué va! / ¡De nada!"],["Zoar","zoár","Bromear / burlarse"],["Chorar de rir","shorár yi hir","Llorar de risa"],["Piada","piáda","Chiste"],["Trocadilho","trokadíliu","Juego de palabras"],["Irônico","irôniku","Irónico"],["Engraçado","engrasádu","Gracioso"]],
s:[["Adoro acordar cedo… só que não.","","Me encanta madrugar… ¡pues no!"],["A gente chorou de rir com a piada.","","Lloramos de risa con el chiste."],["Para de me zoar!","","¡Deja de burlarte de mí!"]]},
{t:"Literatura y estilo", g:`<p>Lee a <b>Machado de Assis</b>, <b>Clarice Lispector</b>, <b>Fernando Pessoa</b>. Recursos: ironía narrativa, narrador que habla al lector (<i>"leitor"</i>).</p><p>Tiempos literarios: <b>pretérito mais‑que‑perfeito simples</b> (<i>fizera, dissera</i>) = había hecho, había dicho.</p>`,
v:[["Fizera","fizéra","Había hecho"],["Dissera","disséra","Había dicho"],["Leitor","leitór","Lector"],["Narrador","narradór","Narrador"],["Comovente","komovênchi","Conmovedor"],["Eloquente","elokuênchi","Elocuente"],["Ambíguo","ambíguu","Ambiguo"],["Metáfora","metáfora","Metáfora"]],
s:[["Ele já dissera tudo o que sabia.","","Él ya había dicho todo lo que sabía."],["Caro leitor, não me julgue.","","Querido lector, no me juzgues."],["Foi um discurso comovente e eloquente.","","Fue un discurso conmovedor y elocuente."]]},
{t:"Maestría: precisión y naturalidad", g:`<p>Colocaciones: <b>tomar uma decisão, correr um risco, chuva forte, café forte</b>.</p><p>Matices: <i>olhar / espiar / fitar / contemplar</i>. Variantes: Brasil vs Portugal (<i>você / tu</i>, <i>trem / comboio</i>).</p><p>Meta: pensar en portugués, consumir podcasts y novelas sin subtítulos.</p>`,
v:[["Fitar","fitár","Mirar fijamente"],["Espiar","espiár","Echar un vistazo / espiar"],["Contemplar","kontemplár","Contemplar"],["Correr um risco","kohér um hísku","Correr un riesgo"],["Matizado","machizádu","Matizado"],["Fluência","fluênsia","Fluidez"],["Sotaque","sotáki","Acento"],["Naturalidade","naturalidáyi","Naturalidad"]],
s:[["Ela me fitou e sorriu.","","Me miró fijamente y sonrió."],["Às vezes é preciso correr um risco.","","A veces hay que correr un riesgo."],["Seu sotaque está cada vez mais natural.","","Tu acento es cada vez más natural."]]}
],
ja: [
{t:"Japonés escrito formal (である)", g:`<p>Ensayos, periódicos y textos académicos usan el estilo <b>である</b> en vez de です: <i>これは問題である</i>.</p><p>Conectores escritos: <b>しかしながら</b>, <b>すなわち</b> (es decir), <b>ゆえに</b> (por lo tanto), <b>〜に関して</b> (respecto a).</p><p>Kanji compuestos (熟語) dominan el texto formal.</p>`,
v:[["である","de aru","Es (escrito formal)"],["しかしながら","shikashi nagara","No obstante"],["すなわち","sunawachi","Es decir"],["ゆえに","yue ni","Por lo tanto"],["に関して","ni kanshite","Respecto a"],["研究","kenkyū","Investigación"],["結果","kekka","Resultado"],["問題","mondai","Problema"]],
s:[["これは 重要な 問題 である。","kore wa jūyōna mondai de aru","Este es un problema importante."],["研究 の 結果 に関して 説明する。","kenkyū no kekka ni kanshite setsumei suru","Explico respecto a los resultados de la investigación."],["しかしながら、 課題 も 多い。","shikashi nagara, kadai mo ōi","No obstante, también hay muchos desafíos."]]},
{t:"Expresiones idiomáticas (慣用句)", g:`<p>Los <b>慣用句</b> usan partes del cuerpo: <b>顔が広い</b> (cara ancha = conocer a mucha gente), <b>腹が立つ</b> (enfadarse), <b>猫の手も借りたい</b> (tan ocupado que pedirías ayuda a un gato).</p><p>Yojijukugo (4 kanji): <b>一期一会</b> (cada encuentro es único).</p>`,
v:[["顔が広い","kao ga hiroi","Conocer a mucha gente"],["腹が立つ","hara ga tatsu","Enfadarse"],["猫の手も借りたい","neko no te mo karitai","Estar muy ocupado"],["一期一会","ichigo ichie","Cada encuentro es único"],["耳が痛い","mimi ga itai","Doler oír (verdad incómoda)"],["気が合う","ki ga au","Llevarse bien"],["口が軽い","kuchi ga karui","Indiscreto"],["頭が切れる","atama ga kireru","Muy inteligente"]],
s:[["彼 は 顔が広い です。","kare wa kao ga hiroi desu","Él conoce a mucha gente."],["今日 は 猫の手も借りたい ほど 忙しい。","kyō wa neko no te mo karitai hodo isogashii","Hoy estoy ocupadísimo."],["一期一会 を 大切に しよう。","ichigo ichie o taisetsu ni shiyō","Valoremos cada encuentro único."]]},
{t:"Literatura japonesa", g:`<p>Autores clásicos de dominio público: <b>夏目漱石</b> (Natsume Sōseki), <b>芥川龍之介</b> (Akutagawa), <b>宮沢賢治</b> (Miyazawa Kenji). Léelos en la sección <b>Libros</b>.</p><p>Estilo literario antiguo: <b>〜ぬ</b> = 〜ない (<i>知らぬ</i>), <b>〜ず</b> = sin (<i>言わず</i>), katakana histórico en 雨ニモマケズ.</p>`,
v:[["吾輩","wagahai","Yo (arcaico, pomposo)"],["名前","namae","Nombre"],["無い","nai","No hay / no tener"],["知らぬ","shiranu","No saber (literario)"],["言わず","iwazu","Sin decir"],["物語","monogatari","Relato"],["作者","sakusha","Autor"],["小説","shōsetsu","Novela"]],
s:[["吾輩 は 猫 である。","wagahai wa neko de aru","Yo soy un gato."],["名前 は まだ 無い。","namae wa mada nai","Todavía no tengo nombre."],["何 も 言わず に 帰った。","nani mo iwazu ni kaetta","Se fue sin decir nada."]]},
{t:"Maestría: matices y registro", g:`<p>C2 en japonés = cambiar de registro sin esfuerzo: casual (友達), cortés (です・ます), honorífico (敬語) y escrito (である).</p><p>Matices de "mirar": <b>見る</b> (ver), <b>眺める</b> (contemplar), <b>覗く</b> (asomarse/espiar), <b>見つめる</b> (mirar fijamente).</p><p>Lectura diaria de noticias (NHK) y novelas.</p>`,
v:[["眺める","nagameru","Contemplar"],["覗く","nozoku","Asomarse / espiar"],["見つめる","mitsumeru","Mirar fijamente"],["微妙","bimyō","Sutil / dudoso"],["ニュアンス","nyuansu","Matiz"],["流暢","ryūchō","Fluido"],["自然","shizen","Natural"],["表現","hyōgen","Expresión"]],
s:[["窓 から 海 を 眺める。","mado kara umi o nagameru","Contemplo el mar desde la ventana."],["その 表現 は 少し 微妙 です。","sono hyōgen wa sukoshi bimyō desu","Esa expresión es un poco dudosa."],["流暢 な 日本語 を 話したい。","ryūchō na nihongo o hanashitai","Quiero hablar japonés con fluidez."]]}
]
};

['en','pt','ja'].forEach(l => { COURSE[l].units = BASIC[l].concat(COURSE[l].units, C2[l]); });

// Niveles: índice de unidades (0‑31)
window.LEVELS = [
  {id:'basic', n:'Básico', cefr:'Pre‑A1', from:0, to:3, ic:'🌱', can:'Reconozco sonidos, letras, colores y frases de supervivencia.'},
  {id:'A1', n:'A1', cefr:'A1', from:4, to:11, ic:'🙂', can:'Me presento, hablo de mi rutina, pido comida y me oriento en la ciudad.'},
  {id:'A2', n:'A2', cefr:'A2', from:12, to:15, ic:'🚶', can:'Cuento lo que hice, viajo, voy al médico y hablo de planes.'},
  {id:'B1', n:'B1', cefr:'B1', from:16, to:19, ic:'💼', can:'Trabajo, opino, comparo, uso condicionales y narro experiencias.'},
  {id:'B2', n:'B2', cefr:'B2', from:20, to:23, ic:'🗞️', can:'Entiendo noticias, debato y uso estructuras complejas con soltura.'},
  {id:'C1', n:'C1', cefr:'C1', from:24, to:27, ic:'🎓', can:'Me expreso con fluidez y precisión en contextos sociales y profesionales.'},
  {id:'C2', n:'C2', cefr:'C2', from:28, to:31, ic:'👑', can:'Domino registros, humor, literatura y matices como un nativo culto.'}
];
window.levelIdx = (i) => LEVELS.findIndex(L => i >= L.from && i <= L.to);
})();
