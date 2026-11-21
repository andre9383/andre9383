// Modo niños: 2 niveles × 6 unidades × 8 palabras con imagen (emoji). Sin escritura obligatoria.
(function () {
const BASE = [
 // Nivel 1
 {t:"Colores", ic:"🎨", it:[["Rojo","🔴"],["Azul","🔵"],["Verde","🟢"],["Amarillo","🟡"],["Negro","⚫"],["Blanco","⚪"],["Morado","🟣"],["Naranja","🟠"]]},
 {t:"Animales", ic:"🐶", it:[["Perro","🐶"],["Gato","🐱"],["Pájaro","🐦"],["Pez","🐟"],["Vaca","🐮"],["Caballo","🐴"],["León","🦁"],["Elefante","🐘"]]},
 {t:"Números", ic:"🔢", it:[["Uno","1️⃣"],["Dos","2️⃣"],["Tres","3️⃣"],["Cuatro","4️⃣"],["Cinco","5️⃣"],["Seis","6️⃣"],["Siete","7️⃣"],["Ocho","8️⃣"]]},
 {t:"Familia", ic:"👨‍👩‍👧", it:[["Mamá","👩"],["Papá","👨"],["Bebé","👶"],["Hermano","👦"],["Hermana","👧"],["Abuela","👵"],["Abuelo","👴"],["Familia","👨‍👩‍👧‍👦"]]},
 {t:"Comida", ic:"🍎", it:[["Manzana","🍎"],["Plátano","🍌"],["Pan","🍞"],["Leche","🥛"],["Agua","💧"],["Huevo","🥚"],["Pastel","🍰"],["Uvas","🍇"]]},
 {t:"Mi cuerpo", ic:"🙋", it:[["Ojo","👁️"],["Nariz","👃"],["Boca","👄"],["Oreja","👂"],["Mano","✋"],["Pie","🦶"],["Cabeza","🙆"],["Diente","🦷"]]},
 // Nivel 2
 {t:"Juguetes y juegos", ic:"🧸", it:[["Pelota","⚽"],["Osito","🧸"],["Muñeca","🪆"],["Coche","🚗"],["Cometa","🪁"],["Globo","🎈"],["Tren","🚂"],["Rompecabezas","🧩"]]},
 {t:"La escuela", ic:"🏫", it:[["Escuela","🏫"],["Libro","📖"],["Lápiz","✏️"],["Mochila","🎒"],["Maestra","👩‍🏫"],["Amigo","🧑‍🤝‍🧑"],["Tijeras","✂️"],["Reloj","⏰"]]},
 {t:"La ropa", ic:"👕", it:[["Camiseta","👕"],["Pantalón","👖"],["Vestido","👗"],["Zapatos","👟"],["Gorro","🧢"],["Calcetines","🧦"],["Abrigo","🧥"],["Gafas","👓"]]},
 {t:"Clima y naturaleza", ic:"🌈", it:[["Sol","☀️"],["Lluvia","🌧️"],["Nieve","❄️"],["Nube","☁️"],["Árbol","🌳"],["Flor","🌸"],["Luna","🌙"],["Estrella","⭐"]]},
 {t:"Emociones", ic:"😊", it:[["Feliz","😊"],["Triste","😢"],["Enojado","😠"],["Asustado","😨"],["Cansado","😴"],["Sorprendido","😲"],["Tonto / gracioso","🤪"],["Enamorado","😍"]]},
 {t:"Acciones", ic:"🏃", it:[["Correr","🏃"],["Saltar","🤸"],["Comer","🍽️"],["Dormir","😴"],["Nadar","🏊"],["Bailar","💃"],["Cantar","🎤"],["Leer","📚"]]}
];
const W = {
en: [
 [["Red","red"],["Blue","blu"],["Green","grin"],["Yellow","iélou"],["Black","blak"],["White","uáit"],["Purple","pérpol"],["Orange","órinch"]],
 [["Dog","dog"],["Cat","kat"],["Bird","berd"],["Fish","fish"],["Cow","kau"],["Horse","jors"],["Lion","láion"],["Elephant","élefant"]],
 [["One","uan"],["Two","tu"],["Three","zri"],["Four","for"],["Five","faiv"],["Six","siks"],["Seven","séven"],["Eight","eit"]],
 [["Mom","mom"],["Dad","dad"],["Baby","béibi"],["Brother","bróder"],["Sister","síster"],["Grandma","gránma"],["Grandpa","granpa"],["Family","fámili"]],
 [["Apple","ápol"],["Banana","banána"],["Bread","bred"],["Milk","milk"],["Water","uóter"],["Egg","eg"],["Cake","keik"],["Grapes","greips"]],
 [["Eye","ai"],["Nose","nous"],["Mouth","mauz"],["Ear","íer"],["Hand","jand"],["Foot","fut"],["Head","jed"],["Tooth","tuz"]],
 [["Ball","bol"],["Teddy bear","tédi ber"],["Doll","dol"],["Car","kar"],["Kite","kait"],["Balloon","balún"],["Train","trein"],["Puzzle","pásol"]],
 [["School","skul"],["Book","buk"],["Pencil","pénsil"],["Backpack","bákpak"],["Teacher","tícher"],["Friend","frend"],["Scissors","sísors"],["Clock","klok"]],
 [["T-shirt","tí shert"],["Pants","pants"],["Dress","dres"],["Shoes","shus"],["Cap","kap"],["Socks","soks"],["Coat","kout"],["Glasses","gláses"]],
 [["Sun","san"],["Rain","rein"],["Snow","snou"],["Cloud","klaud"],["Tree","tri"],["Flower","fláuer"],["Moon","mun"],["Star","star"]],
 [["Happy","jápi"],["Sad","sad"],["Angry","ángri"],["Scared","skerd"],["Tired","táierd"],["Surprised","serpráisd"],["Silly","síli"],["In love","in lav"]],
 [["Run","ran"],["Jump","yamp"],["Eat","it"],["Sleep","slip"],["Swim","suím"],["Dance","dans"],["Sing","sing"],["Read","rid"]]
],
pt: [
 [["Vermelho","vermélio"],["Azul","azúu"],["Verde","vêrdi"],["Amarelo","amarélu"],["Preto","prêtu"],["Branco","brânku"],["Roxo","rôchu"],["Laranja","laránya"]],
 [["Cachorro","kachôhu"],["Gato","gátu"],["Passarinho","pasaríñu"],["Peixe","péichi"],["Vaca","váka"],["Cavalo","kavále"],["Leão","leãu"],["Elefante","elefánchi"]],
 [["Um","um"],["Dois","dóis"],["Três","tres"],["Quatro","kuátru"],["Cinco","sínku"],["Seis","seis"],["Sete","séchi"],["Oito","óitu"]],
 [["Mamãe","mamãi"],["Papai","papái"],["Bebê","bebê"],["Irmão","irmãu"],["Irmã","irmã"],["Vovó","vovó"],["Vovô","vovô"],["Família","família"]],
 [["Maçã","masã"],["Banana","banána"],["Pão","pãu"],["Leite","léichi"],["Água","água"],["Ovo","ôvu"],["Bolo","bôlu"],["Uva","úva"]],
 [["Olho","ôliu"],["Nariz","narís"],["Boca","bôka"],["Orelha","orélia"],["Mão","mãu"],["Pé","pé"],["Cabeça","kabésa"],["Dente","dênchi"]],
 [["Bola","bóla"],["Ursinho","ursíñu"],["Boneca","bonéka"],["Carrinho","kahíñu"],["Pipa","pípa"],["Balão","balãu"],["Trem","trein"],["Quebra-cabeça","kébra kabésa"]],
 [["Escola","eskóla"],["Livro","lívru"],["Lápis","lápis"],["Mochila","mochíla"],["Professora","profesôra"],["Amigo","amígu"],["Tesoura","tezôura"],["Relógio","helóyiu"]],
 [["Camiseta","kamizéta"],["Calça","káusa"],["Vestido","vestídu"],["Sapato","sapátu"],["Boné","boné"],["Meias","méias"],["Casaco","kazáku"],["Óculos","ókulus"]],
 [["Sol","sóu"],["Chuva","chúva"],["Neve","névi"],["Nuvem","núvein"],["Árvore","árvori"],["Flor","flor"],["Lua","lúa"],["Estrela","estréla"]],
 [["Feliz","felís"],["Triste","trístchi"],["Bravo","brávu"],["Com medo","kon mêdu"],["Cansado","kansádu"],["Surpreso","surprêzu"],["Bobo","bôbu"],["Apaixonado","apaichonádu"]],
 [["Correr","kohér"],["Pular","pulár"],["Comer","komér"],["Dormir","dormír"],["Nadar","nadár"],["Dançar","dansár"],["Cantar","kantár"],["Ler","ler"]]
],
ja: [
 [["あか","aka"],["あお","ao"],["みどり","midori"],["きいろ","kiiro"],["くろ","kuro"],["しろ","shiro"],["むらさき","murasaki"],["オレンジ","orenji"]],
 [["いぬ","inu"],["ねこ","neko"],["とり","tori"],["さかな","sakana"],["うし","ushi"],["うま","uma"],["ライオン","raion"],["ぞう","zō"]],
 [["いち","ichi"],["に","ni"],["さん","san"],["よん","yon"],["ご","go"],["ろく","roku"],["なな","nana"],["はち","hachi"]],
 [["ママ","mama"],["パパ","papa"],["あかちゃん","akachan"],["おにいちゃん","oniichan"],["おねえちゃん","onēchan"],["おばあちゃん","obāchan"],["おじいちゃん","ojiichan"],["かぞく","kazoku"]],
 [["りんご","ringo"],["バナナ","banana"],["パン","pan"],["ぎゅうにゅう","gyūnyū"],["みず","mizu"],["たまご","tamago"],["ケーキ","kēki"],["ぶどう","budō"]],
 [["め","me"],["はな","hana"],["くち","kuchi"],["みみ","mimi"],["て","te"],["あし","ashi"],["あたま","atama"],["は","ha"]],
 [["ボール","bōru"],["くま","kuma"],["にんぎょう","ningyō"],["くるま","kuruma"],["たこ","tako"],["ふうせん","fūsen"],["でんしゃ","densha"],["パズル","pazuru"]],
 [["がっこう","gakkō"],["ほん","hon"],["えんぴつ","enpitsu"],["ランドセル","randoseru"],["せんせい","sensei"],["ともだち","tomodachi"],["はさみ","hasami"],["とけい","tokei"]],
 [["シャツ","shatsu"],["ズボン","zubon"],["ワンピース","wanpīsu"],["くつ","kutsu"],["ぼうし","bōshi"],["くつした","kutsushita"],["コート","kōto"],["めがね","megane"]],
 [["たいよう","taiyō"],["あめ","ame"],["ゆき","yuki"],["くも","kumo"],["き","ki"],["はな","hana"],["つき","tsuki"],["ほし","hoshi"]],
 [["うれしい","ureshii"],["かなしい","kanashii"],["おこった","okotta"],["こわい","kowai"],["ねむい","nemui"],["びっくり","bikkuri"],["おもしろい","omoshiroi"],["だいすき","daisuki"]],
 [["はしる","hashiru"],["とぶ","tobu"],["たべる","taberu"],["ねる","neru"],["およぐ","oyogu"],["おどる","odoru"],["うたう","utau"],["よむ","yomu"]]
]};
window.KIDS = {};
['en','pt','ja'].forEach(l => {
  KIDS[l] = { levels: [{ n: 'Nivel 1', ic: '🐣' }, { n: 'Nivel 2', ic: '🚀' }].map((L, li) => ({
    n: L.n, ic: L.ic,
    units: BASE.slice(li * 6, li * 6 + 6).map((u, k) => ({ t: u.t, ic: u.ic, v: u.it.map((x, j) => [W[l][li * 6 + k][j][0], W[l][li * 6 + k][j][1], x[0], x[1]]) }))
  })) };
});
})();
