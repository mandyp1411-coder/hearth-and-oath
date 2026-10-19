// Original character names for Hearth & Oath. No external setting or character
// list is used. These are cultural possibilities, not rules about personality,
// occupation, belief, gender or where a person is allowed to live.
//
// A heritage supplies complete, pronounceable given names and inherited house,
// clan or household names. The shared ancestry pool lets neighboring traditions
// overlap without making every heritage sound alike. Never regenerate a saved
// person's name to apply this catalog: use it only when a new person is created.
//
// The data deliberately retains the v20 schema. givenFragments contains whole
// neutral names and an empty ending so older callers cannot assemble awkward
// syllables. New callers should use the authored given pools directly.

const words = value => Object.freeze(value.split('|'));
function register(label, lore, masculine, feminine, neutral, families, formats = ['{root}']) {
  const given = Object.freeze({ masculine: words(masculine), feminine: words(feminine), neutral: words(neutral) });
  return Object.freeze({
    label, lore, given,
    givenFragments: Object.freeze({ starts: given.neutral, ends: Object.freeze(['']) }),
    family: Object.freeze({ roots: words(families), endings: Object.freeze(['']), formats: Object.freeze(formats) }),
  });
}
function people(base, heritages) {
  return Object.freeze({ ...base, heritages: Object.freeze(heritages) });
}

export const NAME_CULTURES_V31 = Object.freeze({
  human: people(register(
    'Human hearths and traveling houses',
    'Human registers keep given names beside an inherited household name. A family may use a short house name or preserve the small joining word used by its grandparents.',
    'Aderic|Belloran|Cavren|Dastel|Emeran|Fendric|Havrel|Iverdan|Jossan|Keldric|Orvane|Renwick',
    'Adelise|Belvanna|Catrin|Dorelle|Esmeryn|Fenessa|Havelle|Istren|Josselle|Keldra|Orvessa|Renneth',
    'Aven|Bellis|Corven|Dessa|Emsel|Farren|Hollis|Isven|Jori|Kelren|Osset|Revel',
    'Ardell|Bascoven|Carrowen|Davenell|Elswick|Feret|Gavrell|Hestrel|Iscard|Jannery|Kerovan|Orsett',
  ), {
    ashlands: register(
      'Ashland winter households',
      'Ashland names favor clear stresses and firm endings. Older household names come from winter registers; shorter forms are often used among relatives.',
      'Alveth|Bredan|Caldran|Delsric|Erast|Fasker|Haldris|Irdan|Jarnel|Kostren|Ordrik|Talmund',
      'Alseth|Brennael|Cedra|Delsa|Erneth|Faskella|Haldis|Irwen|Jarnessa|Kostella|Odrine|Talma',
      'Aldis|Bredel|Caldren|Dels|Erdeth|Faska|Hallin|Irsen|Jarren|Kost|Ordeth|Tallen',
      'Aldervet|Bralden|Casker|Drevin|Eldrast|Faldren|Harkell|Irswick|Jorveth|Kestell|Rasker|Vornell',
    ),
    sunlands: register(
      'Sunland well houses',
      'Sunland given names carry open vowels and an easy final stress. Some families place es before their house name, keeping the form found in old well registers.',
      'Adriano|Barisel|Cavaro|Demerio|Esvaro|Javarel|Kalisan|Lorenso|Maredo|Navirio|Orsavel|Taviano',
      'Adressa|Bariela|Cavessa|Demeria|Esvala|Javira|Kalessa|Lorenia|Marevia|Navessa|Orsala|Tavielle',
      'Adri|Bari|Cavari|Demeri|Esvi|Javren|Kalis|Loreni|Marei|Naviri|Orsavi|Tavi',
      'Adamar|Belassi|Cavesta|Dorrevi|Esmari|Javassa|Laveno|Meratti|Nadari|Orvessa|Salveto|Terassi',
      ['{root}', '{root}', 'es {root}'],
    ),
    sable_coast: register(
      'Sable Coast kin registers',
      'Coastal households use flowing, clearly separated syllables. A short joining word may identify an old kin register, even after the family has settled inland.',
      'Amodo|Baredo|Dovano|Eselu|Ivando|Kamero|Lomari|Mavuno|Nesaro|Odemi|Sovaro|Tavelo',
      'Amoya|Barenia|Dovessa|Esuma|Ivessa|Kamena|Lomaya|Mavessa|Nesala|Odomi|Sovena|Tavera',
      'Amoni|Bareni|Dovi|Esumi|Ivalo|Kamori|Lomi|Mavuni|Nesami|Odem|Sovei|Tavemi',
      'Adome|Bavero|Cossani|Daveru|Embara|Ivenza|Kamedi|Lomaru|Navessa|Orembo|Tesami|Veyano',
      ['{root}', '{root}', 'de {root}'],
    ),
  }),

  elf: people(register(
    'Elven household verses',
    'Elven names are spoken as complete phrases rather than a string of titles. A household name can be shared across several generations without fixing the bearer to an ancestral garden.',
    'Avelion|Caureth|Elessan|Iriovel|Letharin|Maessir|Neruvan|Orelith|Saevin|Telesor|Ullaven|Vaerith',
    'Avelisse|Caurelle|Elestria|Iriessa|Lethessa|Maerune|Neruella|Orevia|Saerelle|Telesia|Ullessa|Vaerelle',
    'Aveli|Cauris|Eless|Irieth|Lethen|Maeris|Nerui|Orelis|Saeveth|Teles|Ullari|Vaeris',
    'Aunessa|Celovar|Eriante|Ilestren|Lauveri|Mauneth|Neressa|Oruval|Sennari|Teluisse|Uvelen|Vaunora',
    ['{root}', '{root}', 'en {root}'],
  ), {
    ashlands: register(
      'Ashwood quiet names',
      'Ashwood names use restrained vowels and soft final consonants. The household name preserves a root-garden entry; en is sometimes kept before it in formal introductions.',
      'Atherin|Cethral|Evrith|Ithovan|Lessael|Mireneth|Nivoran|Othren|Ressaun|Sethril|Ulvarin|Vethren',
      'Athera|Cethra|Evrisse|Ithessa|Lessanne|Mirethia|Nivessa|Othressa|Ressiel|Sethrane|Ulveria|Vethria',
      'Ather|Cethris|Evrin|Ithrel|Lessin|Mireth|Nivren|Othri|Ressen|Sethrin|Ulve|Vethis',
      'Auneth|Cethune|Evrassel|Ithoran|Lessovar|Mirelune|Nivara|Othrenn|Resseth|Sethuve|Unnora|Vethass',
      ['{root}', '{root}', 'en {root}'],
    ),
    sunlands: register(
      'Sunbough long-vowel names',
      'Sunbough households favor rounded vowels and names that carry clearly across a gathering. Several old family forms keep the joining word la.',
      'Aluvar|Caeluno|Eruvail|Iolaren|Lausir|Mauvelo|Naulior|Oruven|Raulessa|Sauvero|Tauraven|Ulauro',
      'Aluvia|Caeluna|Eruvelle|Iolara|Lausia|Mauvelle|Naulissa|Oruelle|Raulena|Sauvera|Taurisse|Ulaura',
      'Alui|Caelun|Eruvai|Iolare|Lausi|Mauvel|Nauli|Oruve|Raulai|Sauve|Tauris|Ulaui',
      'Alauve|Caulessa|Eruvaun|Iolasse|Lauressa|Mauvara|Naulenne|Oruvessa|Raulante|Sauveri|Talasse|Ulauven',
      ['{root}', '{root}', 'la {root}'],
    ),
    sable_coast: register(
      'Nighttide listening names',
      'Nighttide given names alternate short syllables with a held vowel. Household names are spoken slowly on first meeting, then shortened among close kin.',
      'Ameshir|Ishoren|Liumer|Maeshun|Mirevo|Nauvis|Oshiren|Riumeth|Shaulor|Tiumen|Ussavel|Vairem',
      'Amesha|Ishoria|Liumessa|Maeshira|Mirevia|Nauvissa|Oshirelle|Riuma|Shaulena|Tiumessa|Ussaria|Vairelle',
      'Ameshi|Ishor|Liumi|Maeshu|Mirevi|Nauvi|Oshiri|Riume|Shauli|Tiumi|Ussai|Vaire',
      'Ameshune|Ishovar|Liumara|Maeshenn|Mireuve|Nauvessa|Oshual|Riumoren|Shaulisse|Tiumara|Ussalen|Vaireth',
      ['{root}', '{root}', 'en {root}'],
    ),
  }),

  dwarf: people(register(
    'Dwarven hall and clan names',
    'Dwarven names are short enough to call across a busy hall. A family may give its clan directly or name the hall recorded in its oldest surviving household account.',
    'Almek|Breskun|Dovrik|Emdur|Falket|Gadrun|Heskor|Imrak|Kerdul|Marnok|Oskel|Vadruk',
    'Alma|Breska|Dovra|Emdeth|Falna|Gadra|Heska|Imrith|Kerdra|Marna|Osketh|Vadra',
    'Almen|Bresk|Dovren|Emdek|Falk|Gadrel|Hesken|Imrek|Kerd|Marnel|Oskan|Vadren',
    'Adram|Breskad|Dovrak|Emdral|Falkud|Gadrast|Heskum|Imradd|Kerdam|Marnud|Oskard|Vadrum',
    ['{root}', '{root}', 'of {root} Hall'],
  ), {
    ashlands: register(
      'Cinder-hall struck names',
      'Cinder-hall given names use a strong opening and a short ending. A clan name or the full form of a former hall can follow; neither says what work a child must grow up to do.',
      'Balket|Dreskun|Ferduk|Granek|Halmud|Idrek|Kodran|Mordek|Ostek|Rundal|Skovik|Tavdur',
      'Balkra|Dreska|Ferdra|Graneth|Halma|Idrith|Kodra|Mordra|Osteth|Runda|Skova|Tavdeth',
      'Balken|Dresk|Ferden|Gran|Halmek|Idren|Kodrel|Morden|Osten|Rundek|Skov|Tavdel',
      'Balkarr|Dreskad|Ferdrum|Granvak|Halmur|Idrakk|Kodrund|Korrud|Mordram|Ostrek|Rundask|Tavruk',
      ['{root}', '{root}', 'of {root} Hall'],
    ),
    sunlands: register(
      'Sunforge broad-vowel names',
      'Sunforge names use broad vowels between firm consonants. Some families introduce their inherited name as a clan; others use the name alone.',
      'Adavrik|Berzun|Damaruk|Erdavo|Gorzun|Iravud|Karmaz|Madoruk|Navzad|Orvaz|Sarvuk|Tazdom',
      'Adavra|Berzeth|Damara|Erdava|Gorzia|Iraveth|Karmaza|Madora|Navzeth|Orvaza|Sarva|Tazda',
      'Adav|Berzen|Damrek|Erdav|Gorzen|Irav|Karmez|Madren|Navzek|Orven|Sarvek|Tazden',
      'Adavrak|Berzad|Damarruk|Erdavum|Gorzam|Iravord|Karmazud|Madoran|Navzarak|Odavrak|Sarvadd|Tazruma',
      ['{root}', '{root}', 'Clan {root}'],
    ),
    sable_coast: register(
      'Sable-delve low names',
      'Sable-delve given names favor low vowels and measured endings. The older form del joins a family name to a remembered coastal hall, including halls its descendants have never seen.',
      'Bresmok|Dalmuk|Emnuk|Golvren|Hedrum|Ilmuk|Kossar|Molduk|Nelmor|Ossvek|Tolvum|Vossren',
      'Bresma|Dalma|Emna|Golveth|Hedra|Ilma|Kossra|Moldeth|Nelmara|Ossva|Tolva|Vossra',
      'Bresmen|Dalmen|Emnek|Golven|Hedren|Ilmek|Kossen|Moldel|Nelm|Ossven|Tolven|Vossen',
      'Bresmorr|Dalmud|Emnarr|Golvram|Hedross|Ilmard|Kossum|Moldrek|Nelmoss|Ossvadd|Tolvarr|Vosskar',
      ['{root}', '{root}', 'del {root}'],
    ),
  }),

  halfling: people(register(
    'Halfling household names',
    'Halfling registers preserve both everyday given names and inherited household names. Kin often shorten a name, but an adult can keep the longer form without making it a title.',
    'Abilo|Berren|Casso|Dembel|Ellimo|Fesso|Jollan|Lemmet|Mavilo|Nessel|Orrilo|Pavven',
    'Abella|Berrisa|Cassie|Dembina|Ellima|Fessa|Jolla|Lemmia|Mavella|Nessa|Orrina|Pavvie',
    'Abi|Berri|Cassi|Dembi|Ellim|Fessi|Jolli|Lemmi|Mavi|Nessi|Orri|Pavvi',
    'Abberel|Bellamy|Cassen|Dember|Ellaway|Fessel|Jollivet|Lemmery|Mavrell|Nesset|Orribel|Pavell',
  ), {
    ashlands: register(
      'Ashmeadow fireside names',
      'Ashmeadow households prefer compact given names with a warm middle vowel. The family form is usually kept plain, while a longer older spelling survives in household books.',
      'Amet|Beddan|Cottel|Dallen|Eddilo|Fennik|Hessan|Jemmot|Marden|Nottel|Ossit|Wemmen',
      'Amella|Beddie|Cottia|Dallie|Eddina|Fennie|Hessa|Jemmia|Mardella|Nottia|Ossella|Wemmie',
      'Ami|Bedden|Cotti|Dalli|Eddi|Fenni|Hessi|Jemmi|Mardi|Notti|Ossi|Wemmi',
      'Amblet|Beddow|Cottrell|Dalliver|Eddenby|Fennow|Hessiver|Jemmet|Mardell|Nottiver|Ossamy|Wemble',
    ),
    sunlands: register(
      'Sunfield orchard registers',
      'Sunfield given names are lilting and easy to shorten. The small word di appears in some orchard-town household names and is retained by families who have moved elsewhere.',
      'Aperlo|Bessilo|Cemmo|Dovelli|Esseto|Fellino|Javvo|Lemiro|Meresso|Nivello|Pessan|Tessilo',
      'Aperla|Bessina|Cemma|Dovella|Esseta|Fellia|Javva|Lemira|Meressa|Nivella|Pessina|Tessia',
      'Aperi|Bessi|Cemmi|Doveli|Esset|Felli|Javvi|Lemi|Meressi|Niveli|Pessi|Tessi',
      'Aperetti|Bessala|Cemmari|Dovellet|Essetti|Fellori|Javetto|Lemissa|Merotti|Nivessa|Perossa|Tessari',
      ['{root}', '{root}', 'di {root}'],
    ),
    sable_coast: register(
      'Sablebank crossing names',
      'Sablebank names use soft consonants and short endings that are easy to hear at a landing. Households keep inherited family forms rather than adding a new crossing to every generation.',
      'Avilo|Bovven|Demiot|Ebbelo|Jemari|Lommet|Mereno|Nivvo|Ossimo|Perrado|Tavvil|Vessan',
      'Avella|Bovvie|Demia|Ebbella|Jessa|Lomma|Mereni|Nivva|Ossima|Perria|Tavvie|Vessa',
      'Avi|Bovvi|Demi|Ebbi|Jemi|Lommi|Meren|Nivvi|Ossimi|Perri|Tavvi|Vessi',
      'Avellet|Bovari|Demiset|Ebbolin|Jemera|Lommetti|Merenza|Nivassi|Ossiver|Perrami|Tavello|Vendeli',
    ),
  }),

  orc: people(register(
    'Orc kin and gathering names',
    'Orc names vary between a short public form and a longer household form. A kin name identifies people who share a family account; it does not claim a victory or demand a profession.',
    'Abrukh|Dazhor|Evruk|Gashren|Hadro|Izrak|Kavzul|Mordaz|Nuzhar|Orvak|Ruzhen|Vezruk',
    'Abruna|Dazhra|Evraza|Gashra|Hadra|Izraka|Kavza|Mordra|Nuzhara|Orvaka|Ruzha|Vezra',
    'Abrun|Dazhen|Evraz|Gash|Hadren|Izren|Kavzen|Morden|Nuzh|Orvenk|Ruzhel|Vezren',
    'Abruk|Dazhar|Evrakun|Gashum|Hadrav|Izraka|Kavzur|Mordakun|Nuzhara|Orvash|Ruzhadd|Vezrukha',
    ['{root}', '{root}', 'kin {root}'],
  ), {
    ashlands: register(
      'Ashridge firm names',
      'Ashridge given names use firm opening sounds and a clear final syllable. Kin names often retain a long older form even when the given name is shortened among neighbors.',
      'Bazgurn|Drovak|Ezdrun|Gadrukh|Hozdak|Irzog|Kavdrun|Murzad|Ozrukh|Rogdren|Ulzak|Vazgrom',
      'Bazgra|Drova|Ezdra|Gadruka|Hozda|Irzha|Kavdra|Murza|Ozruka|Rogdra|Ulzha|Vazgra',
      'Bazgen|Droven|Ezdren|Gadruk|Hozden|Irzen|Kavdren|Murzen|Ozren|Rogden|Ulzen|Vazgen',
      'Bazgur|Drovakh|Ezdruma|Gadrun|Hozdara|Irzodan|Kavdrukh|Murzagar|Ozruda|Roshud|Ulzaran|Vazgorr',
      ['{root}', '{root}', 'kin {root}'],
    ),
    sunlands: register(
      'Sunmesa open-vowel names',
      'Sunmesa names leave room between their strong consonants. A family can use its kin name directly or introduce it with the old joining word ar.',
      'Azavo|Davaruk|Esharo|Gazum|Havazo|Izaro|Kavaru|Mazavo|Nashar|Ovaruk|Razumo|Uzavar',
      'Azava|Davara|Eshara|Gazuma|Havaza|Izara|Kavara|Mezara|Nashara|Ovara|Razuma|Uzava',
      'Azavi|Davari|Eshar|Gazem|Havaz|Izari|Kavari|Mazavi|Nash|Ovari|Razum|Uzavi',
      'Azavari|Davarum|Esharaz|Gazavun|Havazur|Izaruma|Kavaru|Mazavash|Nasharum|Ovaraza|Razumad|Uzavara',
      ['{root}', '{root}', 'ar {root}'],
    ),
    sable_coast: register(
      'Sablemarsh measured names',
      'Sablemarsh names favor voiced consonants and low, even syllables. Families preserve a kin name in both public gatherings and the smaller household account.',
      'Buzhor|Duzavan|Ezzur|Gavozh|Izzurem|Mazhor|Nuzav|Ozhumar|Ravuzh|Tuzhar|Vozhum|Zorish',
      'Buzhara|Duzava|Ezzura|Gavozha|Izzura|Mazhora|Nuzava|Ozhuma|Ravuzha|Tuzhara|Vozhuma|Zorisha',
      'Buzhi|Duzav|Ezzun|Gavoz|Izzuri|Mazhi|Nuzem|Ozhumi|Ravuz|Tuzhi|Vozhem|Zorishen',
      'Buzharen|Duzavum|Ezzurad|Gavozhar|Izzurem|Mazhorun|Nuzavash|Ozhumara|Ravuzhen|Tuzharum|Vozhumad|Zorishar',
      ['{root}', '{root}', 'kin {root}'],
    ),
  }),

  goblin: people(register(
    'Goblin neighborhood names',
    'Goblin names are brisk and distinct when called in a crowded room. Inherited house names stand beside given names in neighborhood books, whether the family owns a workshop or not.',
    'Akkit|Bezzen|Cevik|Duznet|Ekzun|Fizzor|Gevvit|Jasken|Kezmot|Nizvar|Ozzek|Tavzik',
    'Akkia|Bezza|Cevvi|Duzna|Ekza|Fizzia|Gevva|Jaska|Kezma|Nizva|Ozzia|Tavza',
    'Akki|Bezzi|Cev|Duzni|Ekzi|Fizz|Gevvi|Jaski|Kezmi|Nizvi|Ozz|Tavzi',
    'Akkasel|Bezrett|Cevask|Duznari|Ekzavet|Fizzeri|Gevvask|Jaskett|Kezmari|Nizovar|Ozzaket|Tavzess',
    ['{root}', '{root}', 'House {root}'],
  ), {
    ashlands: register(
      'Cinderburrow close names',
      'Cinderburrow given names keep their consonants close and their endings short. Family names preserve the different spelling habits of old furnace neighborhoods.',
      'Akket|Bezruk|Dekket|Ekkar|Geznit|Izzrek|Keksen|Muzdet|Nekkit|Ozkren|Tezruk|Vekkot',
      'Akketa|Bezra|Dekka|Ekkia|Gezna|Izzra|Keksa|Muzda|Nekka|Ozkia|Tezra|Vekka',
      'Akken|Bezri|Dekk|Ekki|Gezni|Izzri|Keksi|Muzdi|Nekki|Ozki|Tezri|Vekki',
      'Akkrett|Bezrud|Dekkast|Ekkoren|Geznett|Iskett|Keksari|Muzder|Nekkass|Ozkett|Tezruket|Vekkard',
      ['{root}', '{root}', 'House {root}'],
    ),
    sunlands: register(
      'Sunmarket quick names',
      'Sunmarket names alternate quick consonants with an open vowel. Some households introduce their full name with House, while relatives use the shorter form.',
      'Azzio|Bevzik|Cezaro|Dezzan|Ezvero|Fazilo|Gessan|Kavzet|Levzik|Nesmo|Ozzaro|Tessik',
      'Azzia|Bevza|Cezara|Dezza|Ezvera|Fazila|Gessa|Kavza|Levza|Nesma|Ozzara|Tessia',
      'Azzi|Bevzi|Cezari|Dezzi|Ezvi|Fazi|Gessi|Kavzi|Levzi|Nesmi|Ozzari|Tessi',
      'Azziver|Bevzari|Cezatti|Dezzaro|Ezveri|Fazessi|Gessari|Kavzali|Levzesso|Nesmari|Ozzavett|Tezri',
      ['{root}', '{root}', 'House {root}'],
    ),
    sable_coast: register(
      'Sabledock rounded names',
      'Sabledock names use rounded vowels and a final sound that carries clearly across a crowded quay. Inherited families are recorded without translating them into a trade or a joke.',
      'Bozzum|Duzan|Ezzok|Guzzel|Ivzun|Kozmet|Mezzuk|Navoz|Ozzum|Ruzvik|Tovzet|Vuzzan',
      'Bozza|Duzia|Ezzoka|Guzzia|Ivza|Kozma|Mezza|Navoza|Ozzuma|Ruzva|Tovza|Vuzza',
      'Bozzi|Duzi|Ezzo|Guzzi|Ivzi|Kozmi|Mezzi|Navozi|Ozzu|Ruzvi|Tovzi|Vuzzi',
      'Bozzuret|Duzanni|Ezzovar|Guzzomer|Ivzari|Kozmett|Mezzuri|Navoz|Ozzumet|Ruzvessa|Tovzari|Vuzzarel',
      ['{root}', '{root}', 'House {root}'],
    ),
  }),

  tiefling: people(register(
    'Tiefling birth names and letter houses',
    'Tiefling registers give birth names and chosen names equal standing. A letter-house affiliation is a family history, not an omen, an obligation or a judgment about the person carrying it.',
    'Azeriel|Cevaryn|Dessar|Ezhavel|Iverash|Jassorin|Kezarel|Mavess|Nazriel|Ossavar|Rhezian|Vezorin',
    'Azerelle|Cevarya|Dessara|Ezhavelle|Iveresse|Jassoria|Kezaria|Mavessa|Nazrielle|Ossavelle|Rhezia|Vezoria',
    'Azeri|Cevary|Dessarien|Ezhavi|Iveras|Jassori|Kezari|Mavessan|Nazri|Ossavi|Rheziel|Vezori',
    'Azerath|Cevarel|Dessavain|Ezhara|Iveresse|Jassaveth|Kezarune|Mavessir|Nazrieth|Ossavain|Rhezavel|Vezareth',
    ['{root}', '{root}', 'va {root}'],
  ), {
    ashlands: register(
      'Ashveil letter-house names',
      'Ashveil names use soft sibilants and a deliberate ending. A chosen name can be an ordinary name from the same register; it need not be an abstract virtue or an ominous title.',
      'Arzeth|Cessarin|Drezhael|Ezhrin|Ishravet|Jezharel|Kesseth|Mezhran|Nessavir|Ozhrel|Sorrith|Vessarin',
      'Arzessa|Cessaria|Drezhelle|Ezhria|Ishravelle|Jezharia|Kessara|Mezhria|Nessavelle|Ozhrelle|Sorrisse|Vessaria',
      'Arzethen|Cessari|Drezhel|Ezhri|Ishrave|Jezhari|Kessien|Mezhri|Nessavi|Ozhri|Sorrien|Vessari',
      'Arzareth|Cessarune|Drezhavel|Ezhrane|Ishravess|Jezharath|Kessariel|Mezhrune|Nessaveth|Ozhraun|Sorravelle|Vessareth',
      ['{root}', '{root}', 'va {root}'],
    ),
    sunlands: register(
      'Sunveil clear-sky names',
      'Sunveil names favor wide vowels and a clear final syllable. Several letter houses use za before their inherited name, while other families prefer the unjoined form.',
      'Azair|Dazavel|Ezariun|Hazaire|Izharo|Lazurin|Meluzai|Ozavier|Sazirun|Uzarel|Vezairo|Zarovel',
      'Azaia|Dazavelle|Ezariune|Hazaira|Izharia|Lazuria|Meluzia|Ozaviera|Sazirune|Uzaria|Vezaira|Zarovelle',
      'Azai|Dazavi|Ezari|Hazai|Izhari|Lazuri|Meluz|Ozavi|Saziri|Uzari|Vezai|Zarove',
      'Azairune|Dazaveth|Ezariath|Hazavelle|Izharune|Lazuriel|Meluzareth|Ozavain|Sazirath|Uzarielle|Vezairun|Zeravelle',
      ['{root}', '{root}', 'za {root}'],
    ),
    sable_coast: register(
      'Sableveil returning names',
      'Sableveil given names link low vowels with a softer final syllable. Letter-house forms can begin with sa, preserving an affiliation carried between coastal and inland relatives.',
      'Amozhel|Bezharun|Imzavel|Ishumet|Kessalo|Mezavir|Oshumael|Razhum|Sumevar|Ussaren|Vezhumo|Zomavel',
      'Amozhelle|Bezharuna|Imzavelle|Ishumelle|Kessala|Mezavia|Oshumelle|Razhuma|Sumevara|Ussara|Vezhuma|Zomavelle',
      'Amozhi|Bezhari|Imzavi|Ishume|Kessali|Mezavi|Oshume|Razhumi|Sumevi|Ussari|Vezhumi|Zomavi',
      'Amozhune|Bezhariel|Imzaveth|Ishumara|Kesalume|Mezavain|Oshumeth|Razhumelle|Sumevath|Ussariel|Vezhumara|Zomavess',
      ['{root}', '{root}', 'sa {root}'],
    ),
  }),

  beastfolk: people(register(
    'Beastfolk household registers',
    'Beastfolk names vary with family and heritage. A household may preserve an old lineage name, share a city house name, or use the same name after moving between several kinds of settlement.',
    'Arovek|Besharo|Cevrun|Dovash|Eshuren|Havrek|Ishalo|Kavren|Leshum|Mavaro|Oshvek|Tavren',
    'Arova|Beshara|Cevra|Dovasha|Eshura|Havra|Ishala|Kavra|Leshuma|Mavara|Oshva|Tavra',
    'Arove|Beshari|Cevri|Dovashi|Eshuri|Havri|Ishali|Kavri|Leshumi|Mavari|Oshvi|Tavri',
    'Arovai|Beshuma|Cevrath|Dovaren|Eshuvai|Havresh|Ishalun|Kavrella|Leshoran|Mavashi|Oshveren|Tavressa',
    ['{root}', '{root}', 'of {root}'],
  ), {
    wolfkin: register(
      'Wolfkin calling names',
      'Wolfkin households favor given names with a clear opening and a sustained vowel. A shared family name can belong equally to woodland relatives and kin raised in a city.',
      'Auvren|Bashur|Daurik|Eshvar|Hauren|Kaurvek|Luvran|Ovrun|Rauvek|Shavur|Urvash|Vasken',
      'Auvra|Bashura|Dauria|Eshvara|Haura|Kaurva|Luvra|Ovria|Rauva|Shavura|Urvasha|Vaska',
      'Auvri|Bashu|Dauri|Eshvarin|Hauri|Kaurvi|Luvri|Ovri|Rauvi|Shavu|Urvashi|Vaski',
      'Auvrath|Bashuren|Daurava|Eshvarun|Haurash|Kauraven|Luvrath|Ovrasha|Rauvren|Shavuren|Urdava|Vaskaran',
      ['{root}', '{root}', 'of {root}'],
    ),
    catkin: register(
      'Catkin close-syllable names',
      'Catkin names use a light opening and a close final syllable. Households keep distinct family forms rather than giving every relative a name about claws or rooftops.',
      'Ashirel|Ceshin|Eshiro|Feshal|Ishar|Keshiri|Lishen|Misharo|Neshel|Rishan|Seshir|Vesharo',
      'Ashira|Ceshia|Eshira|Fesha|Ishara|Keshira|Lishia|Mishara|Nesha|Risha|Seshira|Veshara',
      'Ashiri|Ceshi|Eshiri|Feshi|Ishari|Keshri|Lishi|Mishari|Neshi|Rishi|Seshri|Veshari',
      'Ashiren|Ceshali|Eshivar|Feshari|Ishalen|Keshiraun|Lishaveth|Misharen|Neshalin|Rishavay|Senesh|Vesharun',
      ['{root}', '{root}', 'se {root}'],
    ),
    bearkin: register(
      'Bearkin deep-vowel names',
      'Bearkin given names leave room for a deep middle vowel. The longer household form is used on first introduction; a shortened form is common among relatives.',
      'Arrom|Brumet|Dorun|Erum|Gorram|Hodrum|Ivrom|Murrad|Odrum|Torven|Urram|Vorrom',
      'Arroma|Bruma|Doruma|Eruma|Gorra|Hodra|Ivroma|Murra|Odruma|Torva|Urra|Vorra',
      'Arro|Brumi|Doru|Eru|Gorren|Hodri|Ivro|Murri|Odru|Torvi|Urri|Vorri',
      'Arromud|Brumaren|Dorrava|Erumeth|Gorruma|Hodravan|Ivromet|Murraden|Odruma|Torvarem|Urrava|Vorromad',
      ['{root}', '{root}', 'of {root}'],
    ),
    hornkin: register(
      'Hornkin gathering names',
      'Hornkin names carry a clear opening vowel and an even rhythm. The inherited household form can be spoken alone or after a small joining word kept from an older gathering register.',
      'Araven|Daorik|Evaren|Iorun|Kaoven|Maorik|Oravin|Raoven|Tavorn|Uvaren|Veiron|Yaroven',
      'Arava|Daoria|Evara|Ioruna|Kaova|Maoria|Orava|Raova|Tavora|Uvara|Veira|Yarova',
      'Aravi|Daori|Evari|Ioru|Kaovi|Maorin|Oravi|Raovi|Tavori|Uvari|Veirin|Yarovi',
      'Aravenna|Daoriven|Evarath|Ioruvan|Kaovaren|Maorath|Oravenn|Raovari|Tavorath|Uvarenna|Arovan|Yaroveth',
      ['{root}', '{root}', 'an {root}'],
    ),
    harekin: register(
      'Harekin light names',
      'Harekin names use light syllables and tidy endings. Their household names are inherited forms, including names kept by families whose descendants have never lived beside a meadow.',
      'Avelit|Chiven|Delliot|Evvit|Fellit|Ivenel|Jerriot|Levvon|Nivvet|Pellin|Tivven|Yellot',
      'Avelie|Chivia|Dellia|Evvia|Fellie|Ivenia|Jerria|Levvie|Nivva|Pellia|Tivvie|Yellia',
      'Aveli|Chivi|Delli|Evvi|Felli|Iveni|Jerri|Levvi|Nivvi|Pelli|Tivvi|Yelli',
      'Avelitt|Chivaren|Delliwen|Evvinet|Fellivet|Ivennal|Jerriven|Levvarel|Nivett|Pellavar|Tivvenna|Yellivet',
      ['{root}', '{root}', 'of {root}'],
    ),
    wildkin: register(
      'Wildkin varied household names',
      'Wildkin is a shared register for many other beastfolk lineages. Its names retain distinct family sounds rather than pretending those lineages share a single language or a single way of life.',
      'Akshun|Chorro|Deyvar|Eshiko|Ishkaren|Javulo|Kessho|Leshun|Navori|Orush|Sevako|Usharen',
      'Akshia|Chorra|Deyva|Eshika|Ishkara|Javula|Kessha|Leshuna|Navora|Orusha|Sevaka|Ushara',
      'Akshi|Chorri|Deyvi|Eshiki|Ishkari|Javuli|Kesshi|Leshuni|Navor|Orushi|Sevaki|Ushari',
      'Akshavan|Chorreni|Deyvarash|Eshikora|Ishkarun|Javulessa|Kesshavi|Leshunet|Navorath|Orushenna|Sevakori|Unoria',
      ['{root}', '{root}', 'of {root}'],
    ),
  }),
});

function roll(seed, salt, range) {
  let h = 2166136261;
  const input = `${String(seed ?? 'hearth')}\u001f${String(salt ?? '')}`;
  for (let i = 0; i < input.length; i++) h = Math.imul(h ^ input.charCodeAt(i), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) % Math.max(1, range);
}

// Same identity weights as the existing generator. Calling a naming helper must
// not change pronouns, appearance, family membership or any saved state.
export function defaultNamingIdentityV31(seed, id) {
  const ancestries = ['human', 'human', 'human', 'human', 'human', 'elf', 'elf', 'dwarf', 'dwarf', 'halfling', 'halfling', 'orc', 'orc', 'goblin', 'tiefling', 'beastfolk'];
  const ancestry = ancestries[roll(seed, `person:${id}:ancestry`, ancestries.length)];
  const pronouns = ['he/him', 'she/her', 'they/them', 'he/him', 'she/her'][roll(seed, `person:${id}:pronouns`, 5)];
  const heritages = Object.keys(NAME_CULTURES_V31[ancestry].heritages);
  return { ancestry, pronouns, heritage: heritages[roll(seed, `person:${id}:heritage`, heritages.length)] };
}

export function namingLoreV31(ancestry = 'human', heritage) {
  const base = NAME_CULTURES_V31[ancestry] || NAME_CULTURES_V31.human;
  return base.heritages[heritage] || base;
}

// culturalName-compatible, deterministic and free of state changes. A caller
// owns persistence, explicit chosen names, and the set of already-used names.
export function culturalNameV31(seed = 'hearth', id = 'person', options = {}) {
  const defaults = defaultNamingIdentityV31(seed, id);
  const requestedAncestry = options.ancestry || options.appearance?.ancestry || defaults.ancestry;
  const ancestry = NAME_CULTURES_V31[requestedAncestry] ? requestedAncestry : 'human';
  const base = NAME_CULTURES_V31[ancestry];
  const heritageIds = Object.keys(base.heritages);
  const requestedHeritage = options.heritage || options.appearance?.heritage || defaults.heritage;
  const heritage = base.heritages[requestedHeritage] ? requestedHeritage : heritageIds[roll(seed, `person:${id}:heritage`, heritageIds.length)];
  const culture = base.heritages[heritage];
  const pronouns = options.pronouns || defaults.pronouns;
  const requestedPresentation = options.presentation || options.appearance?.portraitPresentation || ({ 'he/him': 'masculine', 'she/her': 'feminine', 'they/them': 'neutral' })[pronouns] || 'neutral';
  const presentation = ['masculine', 'feminine'].includes(requestedPresentation) ? requestedPresentation : 'neutral';
  const used = new Set(options.usedNames || []);
  let result;
  for (let attempt = 0; attempt < 256; attempt++) {
    const key = `name-v31:${ancestry}:${heritage}:${id}:${attempt}`;
    const pick = (salt, values) => values[roll(seed, `${key}:${salt}`, values.length)];
    const source = roll(seed, `${key}:source`, 5) < 4 ? culture : base;
    const given = pick('given', source.given[presentation]);
    const familySource = roll(seed, `${key}:family-source`, 5) < 4 ? culture.family : base.family;
    const family = options.familyName || pick('format', familySource.formats).replace('{root}', pick('root', familySource.roots)).replace('{ending}', '');
    const name = `${given} ${family}`.slice(0, 40);
    result = { version: 1, name, given, family, ancestry, heritage, culture: culture.label, lore: culture.lore };
    // Avoid accidental echoes such as a short given name repeated at the start
    // of its new family name. An explicitly inherited family always takes priority.
    const echo = !options.familyName && family.toLowerCase().split(/\s+/).some(part => part.startsWith(given.toLowerCase().slice(0, Math.min(4, given.length))));
    if (!used.has(name) && !echo) break;
  }
  return result;
}
