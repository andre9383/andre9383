// Escenarios de conversación y técnicas de aprendizaje
window.SCENARIOS = [
  {id:"intro", ic:"👋", t:"Presentarte", d:"Conoces a alguien nuevo en una fiesta.", min:0},
  {id:"cafe", ic:"☕", t:"En la cafetería", d:"Pides algo de comer y beber.", min:0},
  {id:"shop", ic:"🛍️", t:"De compras", d:"Buscas ropa y preguntas precios y tallas.", min:4},
  {id:"dir", ic:"🗺️", t:"Pedir direcciones", d:"Estás perdido y buscas la estación.", min:4},
  {id:"hotel", ic:"🏨", t:"En el hotel", d:"Haces check-in y resuelves un problema con la habitación.", min:8},
  {id:"doctor", ic:"🩺", t:"En el médico", d:"Explicas tus síntomas.", min:8},
  {id:"friend", ic:"🍻", t:"Charla con un amigo", d:"Conversación casual sobre el fin de semana y planes.", min:8},
  {id:"job", ic:"💼", t:"Entrevista de trabajo", d:"Te entrevistan para un puesto que te interesa.", min:12},
  {id:"debate", ic:"⚖️", t:"Debate", d:"Defiendes tu opinión sobre la tecnología y el trabajo remoto.", min:16},
  {id:"business", ic:"📧", t:"Reunión de negocios", d:"Negocias plazos y precios con un cliente.", min:18},
  {id:"free", ic:"🎲", t:"Tema libre", d:"Habla de lo que quieras; la IA se adapta.", min:0}
];

window.SKILLS = [
  {ic:"🔁", t:"Repetición espaciada", d:"Repasar justo antes de olvidar multiplica la retención. La sección <b>Repasar</b> programa cada palabra automáticamente (1, 3, 7, 16, 35 días…). Hazla <b>todos los días</b>, aunque sean 5 minutos."},
  {ic:"🧠", t:"Recuerdo activo", d:"Intentar recordar (sin mirar) fortalece la memoria mucho más que releer. Por eso las tarjetas te hacen <b>pensar primero</b> y luego mostrar la respuesta."},
  {ic:"🔀", t:"Intercalado", d:"Mezclar idiomas y temas en una misma sesión obliga al cerebro a discriminar y consolida mejor. El repaso mezcla inglés, portugués y japonés a propósito."},
  {ic:"🗣️", t:"Shadowing", d:"Escucha una frase y repítela al mismo tiempo imitando ritmo y entonación. Usa el <b>Laboratorio de pronunciación</b>: escucha → repite → compara. 10 minutos al día cambian tu acento."},
  {ic:"👶", t:"Técnica Feynman", d:"Explica una regla como si se la enseñaras a un niño. Si no puedes, no la entendiste. En cada unidad hay un botón para explicarla con tus palabras y que la IA te evalúe."},
  {ic:"🎯", t:"Input comprensible", d:"Aprendemos cuando entendemos el ~80% y deducimos el resto. Las <b>Lecturas IA</b> generan textos exactamente a tu nivel."},
  {ic:"⏱️", t:"Bloques de enfoque", d:"25 min de foco total + 5 de descanso (Pomodoro). Usa el temporizador de la sección Más. Sin móvil, sin redes."},
  {ic:"🧩", t:"Chunks (bloques)", d:"Aprende frases completas, no palabras sueltas: <i>\"Could I have…\"</i>, <i>\"Eu queria…\"</i>, <i>\"〜をください\"</i>. Hablarás más rápido porque no construyes desde cero."},
  {ic:"🌙", t:"Sueño y repaso nocturno", d:"El cerebro consolida lo aprendido al dormir. Haz un repaso corto de tarjetas antes de dormir."},
  {ic:"🔗", t:"Transferencia", d:"Aprovecha el español: el portugués comparte ~85% del vocabulario. En inglés busca cognados (<i>information, possible</i>). En japonés usa mnemotecnias visuales para kana y kanji."}
];

window.METHOD = `<p><b>Método TriLingo 3×</b> — cada día, por cada idioma activo:</p>
<p>1️⃣ <b>Aprende</b> (10‑15 min): teoría corta + vocabulario de la unidad de la semana.</p>
<p>2️⃣ <b>Practica</b> (10 min): ejercicios activos con voz y escritura, y repaso espaciado.</p>
<p>3️⃣ <b>Usa</b> (5‑10 min): conversación real con la IA o shadowing.</p>
<p>El plan avanza <b>1 unidad por semana</b> en cada idioma: 24 semanas ≈ 6 meses, de A1 a C1 (en japonés, hasta un nivel intermedio-alto equivalente). Si vas más rápido, adelántate; si te atrasas, el repaso prioriza lo importante.</p>`;
