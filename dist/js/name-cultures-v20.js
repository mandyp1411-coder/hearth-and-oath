// Authored names for Hearth & Oath's own world; these are not external canon.
// Static content only. A caller owns seeded selection, uniqueness and persistence.
//
// Schema: each ancestry and heritage supplies given names by presentation,
// composable givenFragments, and family roots/endings/formats. A format uses
// {root} and {ending}; a format may omit {ending}. Given fragments are neutral
// alternatives, not a rule about gender. Heritage pools supplement the ancestry
// pools. Regional customs can add a place affiliation without replacing a name.
// A household's inherited or chosen name records history, not its present job,
// personality, allegiance or moral character. Existing saved names remain valid.

export const NAME_CULTURES_V20 = Object.freeze({
  human: {
    label: 'Hearth ledgers and road names',
    lore: 'Human names vary between winter hearths, southern wells and coastal kin. A household name can remember a former home long after its descendants leave it.',
    given: {
      masculine: ['Berovan', 'Corren', 'Edrican', 'Halven', 'Jorren', 'Malden', 'Othric', 'Rendall', 'Wesren', 'Aldoven', 'Cedran', 'Hervan', 'Ordel', 'Tavrick', 'Verren', 'Wynric'],
      feminine: ['Avelda', 'Brenna', 'Ceryth', 'Edrina', 'Halwenna', 'Joreth', 'Mavelle', 'Odelia', 'Rendara', 'Wesella', 'Aldessa', 'Corlena', 'Herwen', 'Tavelle', 'Verrina', 'Wyneth'],
      neutral: ['Ardel', 'Brenver', 'Carren', 'Everen', 'Halred', 'Jareth', 'Merlen', 'Ollen', 'Renver', 'Weslin', 'Avren', 'Cordel', 'Herith', 'Tavren', 'Verran', 'Wynlen'],
    },
    givenFragments: {
      starts: ['Ald', 'Ber', 'Cor', 'Ed', 'Hal', 'Her', 'Jor', 'Mal', 'Mer', 'Od', 'Oth', 'Ren', 'Tav', 'Ver', 'Wes', 'Wyn'],
      ends: ['aven', 'del', 'eran', 'eth', 'ian', 'ilen', 'len', 'lin', 'ora', 'ovan', 'ren', 'reth', 'ric', 'ven', 'wen', 'wyn'],
    },
    family: {
      roots: ['Alder', 'Ash', 'Barley', 'Bracken', 'Cinder', 'Cold', 'Copper', 'Ember', 'Flint', 'Hearth', 'Hollow', 'Lantern', 'Reed', 'Rook', 'Rowan', 'Wren'],
      endings: ['bank', 'beck', 'brook', 'field', 'ford', 'gate', 'haven', 'hill', 'holt', 'mere', 'ridge', 'stead', 'stone', 'vale', 'ward', 'well'],
      formats: ['{root}{ending}'],
    },
    heritages: {
      ashlands: {
        label: 'Ashland hearth names',
        lore: 'Hearth ledgers place a winter household after the given name. Older ledgers also preserve a name sung at winter burials.',
        given: {
          masculine: ['Beldric', 'Ervold', 'Hesran', 'Voldren'],
          feminine: ['Belda', 'Esvanna', 'Heswena', 'Voldeth'],
          neutral: ['Beldren', 'Esvren', 'Hesdel', 'Voldwen'],
        },
        givenFragments: { starts: ['Bel', 'Es', 'Hes', 'Hov', 'Keld', 'Ner', 'Tol', 'Vold'], ends: ['dren', 'dric', 'eth', 'gard', 'ra', 'ren', 'vold', 'wena'] },
        family: { roots: ['Coal', 'Frost', 'Grey', 'Hearth', 'Rime', 'Snow', 'Winter', 'Yew'], endings: ['bank', 'hall', 'holm', 'holt', 'ridge', 'stead', 'vale', 'ward'], formats: ['{root}{ending}'] },
      },
      sunlands: {
        label: 'Sunland well and caravan names',
        lore: 'Caravan registers keep the household name beside the well or market where its first shared verse was witnessed.',
        given: {
          masculine: ['Darovan', 'Esamir', 'Jalenor', 'Naverin'],
          feminine: ['Darela', 'Esamra', 'Jalessa', 'Navira'],
          neutral: ['Darin', 'Esavel', 'Jaler', 'Naveth'],
        },
        givenFragments: { starts: ['Dar', 'Esa', 'Jal', 'Kar', 'Navi', 'Osa', 'Sare', 'Tiva'], ends: ['amir', 'ela', 'erin', 'essa', 'ir', 'ora', 'vel', 'yen'] },
        family: { roots: ['Amber', 'Clay', 'Date', 'Dawn', 'Ochre', 'Sand', 'Sun', 'Water'], endings: ['arch', 'court', 'gate', 'road', 'shade', 'span', 'step', 'well'], formats: ['{root}{ending}'] },
      },
      sable_coast: {
        label: 'Sable Coast tide registers',
        lore: 'Coastal family names remember landings, sea routes and kin inland. A name on a wreck account is read as a person, never as inherited blame.',
        given: {
          masculine: ['Adomar', 'Belaro', 'Dasevan', 'Omaren'],
          feminine: ['Adessa', 'Belami', 'Dasella', 'Omara'],
          neutral: ['Adorin', 'Belari', 'Dasen', 'Omalin'],
        },
        givenFragments: { starts: ['Ado', 'Bela', 'Dase', 'Ebo', 'Ima', 'Oma', 'Seli', 'Toma'], ends: ['ari', 'essa', 'in', 'lin', 'mar', 'mi', 'ro', 'van'] },
        family: { roots: ['Anchor', 'Brine', 'Drift', 'Gull', 'Harbor', 'Salt', 'Shore', 'Tide'], endings: ['bay', 'bell', 'cliff', 'haven', 'landing', 'reach', 'strand', 'wake'], formats: ['{root}{ending}'] },
      },
    },
  },

  elf: {
    label: 'Names planted in living records',
    lore: 'Elven given names are witnessed verses. Family names recall a household garden, a traveling song or a living record tended by successive kin.',
    given: {
      masculine: ['Aevoren', 'Celaerin', 'Elyravan', 'Faeloren', 'Ilaevor', 'Laethiren', 'Maeroveth', 'Naelurin', 'Oelaeris', 'Raevorin', 'Saeloven', 'Thaeriel', 'Vaeloren', 'Ylaerith', 'Zelevan', 'Caevareth'],
      feminine: ['Aevella', 'Celaeris', 'Elyrava', 'Faelorith', 'Ilaevia', 'Laethira', 'Maerovia', 'Naelureth', 'Oelaera', 'Raevella', 'Saelovia', 'Thaeritha', 'Vaelora', 'Ylaeveth', 'Zelevia', 'Caevera'],
      neutral: ['Aeveth', 'Celaevin', 'Elyren', 'Faelith', 'Ilaeven', 'Laethiel', 'Maerith', 'Naelith', 'Oelaevor', 'Raeveth', 'Saelith', 'Thaeren', 'Vaelith', 'Ylaerin', 'Zeleth', 'Caeviel'],
    },
    givenFragments: {
      starts: ['Aev', 'Caev', 'Celaer', 'Elyr', 'Fael', 'Ilaev', 'Laeth', 'Maer', 'Nael', 'Oelaer', 'Raev', 'Sael', 'Thaer', 'Vael', 'Ylaer', 'Zel'],
      ends: ['ara', 'areth', 'avia', 'ella', 'erin', 'eth', 'iel', 'ira', 'ith', 'or', 'oren', 'ova', 'rin', 'ura', 'ven', 'veth'],
    },
    family: {
      roots: ['Amber', 'Aspen', 'Clover', 'Dew', 'Fern', 'Iris', 'Juniper', 'Laurel', 'Linden', 'Moon', 'Myrtle', 'Petal', 'Rain', 'Silver', 'Thorn', 'Willow'],
      endings: ['bough', 'bloom', 'chorus', 'garden', 'grove', 'leaf', 'lamp', 'memory', 'refrain', 'root', 'shade', 'song', 'stem', 'thread', 'verse', 'weave'],
      formats: ['{root}{ending}'],
    },
    heritages: {
      ashlands: {
        label: 'Ashwood root-garden verses',
        lore: 'Ashwood kindreds add a child’s first song to a household tree. Family names remember the pale root garden where that record began.',
        given: {
          masculine: ['Aesovar', 'Cevethir', 'Lethovar', 'Vaesurin'],
          feminine: ['Aesovia', 'Cevethia', 'Lethora', 'Vaesella'],
          neutral: ['Aeseth', 'Cevelith', 'Lethove', 'Vaesir'],
        },
        givenFragments: { starts: ['Aes', 'Cev', 'Eth', 'Lev', 'Leth', 'Niev', 'Saev', 'Vaes'], ends: ['eth', 'ia', 'ir', 'lith', 'ra', 'rin', 'var', 've'] },
        family: { roots: ['Ash', 'Birch', 'Cold', 'Ivory', 'Lichen', 'Pale', 'Snow', 'White'], endings: ['bough', 'garden', 'leaf', 'refrain', 'root', 'song', 'stem', 'verse'], formats: ['{root}{ending}'] },
      },
      sunlands: {
        label: 'Sunbough cloth and branch names',
        lore: 'A Sunbough name is witnessed beneath an old branch, then carried in song and embroidered cloth when its bearer travels.',
        given: {
          masculine: ['Alauver', 'Dhaevorin', 'Olaesir', 'Savaelun'],
          feminine: ['Alauvia', 'Dhaevella', 'Olaesia', 'Savaela'],
          neutral: ['Alauven', 'Dhaeveth', 'Olaeven', 'Savaelith'],
        },
        givenFragments: { starts: ['Alauv', 'Dhaev', 'Erauv', 'Laus', 'Olaes', 'Raul', 'Savael', 'Thaul'], ends: ['ela', 'en', 'ia', 'ir', 'lith', 'lun', 'rin', 'ver'] },
        family: { roots: ['Apricot', 'Copper', 'Dry', 'Gold', 'Olive', 'Saffron', 'Sun', 'Warm'], endings: ['bough', 'branch', 'cloth', 'garden', 'petal', 'song', 'thread', 'verse'], formats: ['{root}{ending}'] },
      },
      sable_coast: {
        label: 'Nighttide garden and observatory names',
        lore: 'Nighttide names link coastal gardens to voyages and moon observatories. Household lamps remember relatives traveling beyond the coast.',
        given: {
          masculine: ['Ishaeven', 'Maevirun', 'Oshalaer', 'Ulaevorin'],
          feminine: ['Ishaevia', 'Maevira', 'Oshalaia', 'Ulaevella'],
          neutral: ['Ishaelith', 'Maeveth', 'Oshalaen', 'Ulaevar'],
        },
        givenFragments: { starts: ['Ishaev', 'Maev', 'Nauv', 'Oshal', 'Shaur', 'Taev', 'Ulaev', 'Vaeh'], ends: ['aia', 'en', 'er', 'ia', 'lith', 'rin', 'run', 'var'] },
        family: { roots: ['Coral', 'Deep', 'Evening', 'Kelp', 'Moon', 'Night', 'Star', 'Tide'], endings: ['garden', 'lamp', 'leaf', 'memory', 'refrain', 'song', 'thread', 'watch'], formats: ['{root}{ending}'] },
      },
    },
  },

  dwarf: {
    label: 'Makers’ witnesses and hall records',
    lore: 'Dwarven household names remember a hall, a shared work or the people who kept it sound. A descendant can inherit a maker’s name without inheriting the maker’s trade.',
    given: {
      masculine: ['Bardek', 'Dornav', 'Erdum', 'Faldrek', 'Gadrin', 'Hurnek', 'Kovrik', 'Mardun', 'Nardek', 'Orruk', 'Reldum', 'Sovrek', 'Tardek', 'Vordun', 'Yedrik', 'Zadrum'],
      feminine: ['Bardra', 'Dorneth', 'Erda', 'Faldra', 'Gadrith', 'Hurnia', 'Kovra', 'Mardeth', 'Nardia', 'Orra', 'Reldith', 'Sovra', 'Tardeth', 'Vordra', 'Yedna', 'Zadria'],
      neutral: ['Bardun', 'Dornel', 'Erdrek', 'Falden', 'Gadrek', 'Hurnel', 'Kovren', 'Mardek', 'Narden', 'Orren', 'Reldan', 'Sovrin', 'Tarden', 'Vordek', 'Yedrun', 'Zadren'],
    },
    givenFragments: {
      starts: ['Bard', 'Dorn', 'Erd', 'Fald', 'Gad', 'Hurn', 'Kov', 'Mard', 'Nard', 'Orr', 'Reld', 'Sov', 'Tard', 'Vord', 'Yed', 'Zadr'],
      ends: ['an', 'dek', 'dith', 'dra', 'dum', 'dun', 'el', 'en', 'eth', 'ia', 'na', 'rek', 'ren', 'rik', 'run', 'um'],
    },
    family: {
      roots: ['Anvil', 'Basalt', 'Brass', 'Charcoal', 'Chisel', 'Copper', 'Crucible', 'Furnace', 'Granite', 'Hammer', 'Iron', 'Lamplight', 'Rivet', 'Slate', 'Stone', 'Tongs'],
      endings: ['brace', 'clasp', 'forge', 'grip', 'hall', 'hinge', 'hold', 'joint', 'mark', 'measure', 'rest', 'seam', 'span', 'stamp', 'stay', 'witness'],
      formats: ['{root}{ending}', 'of {root}'],
    },
    heritages: {
      ashlands: {
        label: 'Cinder-hall witnesses',
        lore: 'Cinder-hall families keep makers’ names on repaired tools. A hall or old furnace gives the household record its heading.',
        given: {
          masculine: ['Brundek', 'Furgan', 'Heskum', 'Keldrik'],
          feminine: ['Brundra', 'Furgith', 'Heskra', 'Keldeth'],
          neutral: ['Brunden', 'Furgel', 'Hesken', 'Keldrun'],
        },
        givenFragments: { starts: ['Brund', 'Furg', 'Hesk', 'Keld', 'Murk', 'Rusk', 'Skeld', 'Vurn'], ends: ['dek', 'dra', 'el', 'eth', 'ith', 'rik', 'run', 'um'] },
        family: { roots: ['Blackiron', 'Cinder', 'Coal', 'Coldforge', 'Furnace', 'Hearthstone', 'Slag', 'Soot'], endings: ['brace', 'grip', 'hall', 'joint', 'mark', 'seam', 'stamp', 'stay'], formats: ['{root}{ending}'] },
      },
      sunlands: {
        label: 'Sunforge road clans',
        lore: 'Sunforge records carry the witnesses’ marks of a first finished work. Copper-road households remember places where makers and traders met.',
        given: {
          masculine: ['Arvek', 'Dazruk', 'Karnum', 'Ovrad'],
          feminine: ['Arveth', 'Dazra', 'Karnith', 'Ovra'],
          neutral: ['Arven', 'Dazren', 'Karnel', 'Ovrek'],
        },
        givenFragments: { starts: ['Arv', 'Daz', 'Garv', 'Karn', 'Maz', 'Ovr', 'Ravd', 'Taz'], ends: ['ad', 'ek', 'el', 'en', 'eth', 'ith', 'ra', 'ruk'] },
        family: { roots: ['Brass', 'Brightore', 'Copper', 'Glass', 'Ochre', 'Redstone', 'Sunforge', 'Verdigris'], endings: ['clasp', 'hall', 'mark', 'measure', 'road', 'seam', 'span', 'witness'], formats: ['{root}{ending}'] },
      },
      sable_coast: {
        label: 'Sable-delve passage names',
        lore: 'Sable-delve ledgers name those who kept sea-cave passages safe. A household can carry a drowned quarry’s name into a new home.',
        given: {
          masculine: ['Bromuk', 'Delvar', 'Mogren', 'Urdok'],
          feminine: ['Bromra', 'Delveth', 'Mogria', 'Urda'],
          neutral: ['Bromel', 'Delvek', 'Mogrel', 'Urden'],
        },
        givenFragments: { starts: ['Brom', 'Delv', 'Guld', 'Mogr', 'Nelm', 'Oskr', 'Urd', 'Velm'], ends: ['ar', 'ek', 'el', 'eth', 'ia', 'ok', 'ra', 'uk'] },
        family: { roots: ['Barnacle', 'Basalt', 'Blackpearl', 'Deep', 'Harborstone', 'Salt', 'Seacave', 'Tideiron'], endings: ['brace', 'delve', 'hall', 'lamp', 'mark', 'passage', 'span', 'witness'], formats: ['{root}{ending}'] },
      },
    },
  },

  halfling: {
    label: 'Table books and crossing households',
    lore: 'Halfling family names remember hospitality, gardens and crossings. They commemorate what kin once shared; they do not prescribe a descendant’s occupation or disposition.',
    given: {
      masculine: ['Berrilo', 'Cobben', 'Dandry', 'Ebbin', 'Fennilo', 'Hobbrel', 'Jemmick', 'Laddel', 'Merrilo', 'Nobbren', 'Ossilo', 'Perrick', 'Rilloby', 'Tobbin', 'Vennick', 'Wessilo'],
      feminine: ['Berrilla', 'Cobba', 'Dandra', 'Ebbella', 'Fennily', 'Hobbella', 'Jemmina', 'Laddie', 'Merrilla', 'Nobbella', 'Ossily', 'Perrina', 'Rillabelle', 'Tobbina', 'Vennily', 'Wessella'],
      neutral: ['Berrin', 'Cobbel', 'Dandrel', 'Ebby', 'Fenni', 'Hobbri', 'Jemmel', 'Ladden', 'Merrin', 'Nobbri', 'Ossi', 'Perrin', 'Rillob', 'Tobbel', 'Vennel', 'Wessi'],
    },
    givenFragments: {
      starts: ['Berri', 'Cobb', 'Dand', 'Ebb', 'Fenni', 'Hobb', 'Jemm', 'Ladd', 'Merri', 'Nobb', 'Ossi', 'Perri', 'Rillo', 'Tobb', 'Venn', 'Wessi'],
      ends: ['a', 'abelle', 'by', 'el', 'ella', 'en', 'ick', 'ie', 'ily', 'in', 'ina', 'lo', 'rel', 'ri', 'ro', 'y'],
    },
    family: {
      roots: ['Apple', 'Bean', 'Berry', 'Bread', 'Clover', 'Cricket', 'Honey', 'Kettle', 'Little', 'Mallow', 'Orchard', 'Quince', 'Seed', 'Supper', 'Thistle', 'Willow'],
      endings: ['basket', 'bridge', 'chair', 'cross', 'cup', 'door', 'ferry', 'garden', 'gate', 'lane', 'loaf', 'pantry', 'patch', 'step', 'table', 'welcome'],
      formats: ['{root}{ending}'],
    },
    heritages: {
      ashlands: {
        label: 'Ashmeadow winter tables',
        lore: 'Ashmeadow names keep the gardens and households that fed travelers through lean winters. A table book also records welcomes given far from home.',
        given: {
          masculine: ['Boddilo', 'Gerrick', 'Nessbin', 'Woddrel'],
          feminine: ['Boddella', 'Gerrily', 'Nessina', 'Woddie'],
          neutral: ['Boddin', 'Gerrel', 'Nessy', 'Wodden'],
        },
        givenFragments: { starts: ['Bodd', 'Gerr', 'Hedd', 'Mett', 'Ness', 'Ottle', 'Podd', 'Wodd'], ends: ['bin', 'ella', 'ick', 'ie', 'ily', 'in', 'rel', 'y'] },
        family: { roots: ['Brasspot', 'Cold', 'Hearth', 'Oat', 'Root', 'Snow', 'Turnip', 'Winter'], endings: ['chair', 'cup', 'garden', 'gate', 'loaf', 'pantry', 'table', 'welcome'], formats: ['{root}{ending}'] },
      },
      sunlands: {
        label: 'Sunfield orchard and seed names',
        lore: 'Sunfield households name orchards and seed routes in their family accounts. Those names travel with the wagons and survive a lost garden.',
        given: {
          masculine: ['Aprilo', 'Dembin', 'Lemrick', 'Serriby'],
          feminine: ['Aprilla', 'Dembella', 'Lemina', 'Serrily'],
          neutral: ['Aprin', 'Dembel', 'Lemmi', 'Serren'],
        },
        givenFragments: { starts: ['Apri', 'Demb', 'Felli', 'Lemm', 'Pessi', 'Serri', 'Telli', 'Yemb'], ends: ['bel', 'bin', 'by', 'ella', 'ily', 'in', 'ina', 'lo'] },
        family: { roots: ['Almond', 'Apricot', 'Fig', 'Melon', 'Orange', 'Peach', 'Seed', 'Sun'], endings: ['basket', 'cart', 'garden', 'lane', 'patch', 'road', 'shade', 'table'], formats: ['{root}{ending}'] },
      },
      sable_coast: {
        label: 'Sablebank shared crossings',
        lore: 'Sablebank family names preserve tidal gardens and difficult ferry crossings. A landing’s name is carried inland by the people it sheltered.',
        given: {
          masculine: ['Bemmilo', 'Delloby', 'Nerrick', 'Tiddren'],
          feminine: ['Bemmilla', 'Dellie', 'Nerrina', 'Tiddella'],
          neutral: ['Bemmin', 'Dellob', 'Nerri', 'Tiddel'],
        },
        givenFragments: { starts: ['Bemm', 'Dello', 'Gelli', 'Nerri', 'Pello', 'Rummi', 'Tidd', 'Velli'], ends: ['by', 'el', 'ella', 'ick', 'ie', 'illa', 'in', 'lo'] },
        family: { roots: ['Dock', 'Ferry', 'Mussel', 'Reed', 'River', 'Salt', 'Shell', 'Tidal'], endings: ['basket', 'cross', 'cup', 'garden', 'landing', 'step', 'table', 'welcome'], formats: ['{root}{ending}'] },
      },
    },
  },

  orc: {
    label: 'Kin marks and witnessed promises',
    lore: 'Orc kin names record a promise, refuge or gathering remembered by a household. These public names are not verdicts on their bearers, and private family traditions differ.',
    given: {
      masculine: ['Adruk', 'Borken', 'Dazhul', 'Evrag', 'Gorven', 'Hazrik', 'Jorhak', 'Kezrun', 'Mazhek', 'Norgal', 'Odrun', 'Razhuk', 'Sorgad', 'Tazven', 'Urzhek', 'Varkul'],
      feminine: ['Adraka', 'Borketh', 'Dazhira', 'Evra', 'Gorveth', 'Hazra', 'Jorhira', 'Kezra', 'Mazhela', 'Norga', 'Odreth', 'Razhira', 'Sorga', 'Tazra', 'Urzhela', 'Varketh'],
      neutral: ['Adren', 'Borkel', 'Dazhen', 'Evrenk', 'Gorvek', 'Hazren', 'Jorhen', 'Kezrel', 'Mazhen', 'Norgel', 'Odrak', 'Razhen', 'Sorgen', 'Tazrel', 'Urzhen', 'Varken'],
    },
    givenFragments: {
      starts: ['Adr', 'Bork', 'Dazh', 'Evr', 'Gorv', 'Haz', 'Jorh', 'Kez', 'Mazh', 'Norg', 'Odr', 'Razh', 'Sorg', 'Taz', 'Urzh', 'Vark'],
      ends: ['a', 'ad', 'ak', 'ek', 'el', 'ela', 'en', 'eth', 'ira', 'ra', 'rel', 'rik', 'run', 'uk', 'ul', 'ven'],
    },
    family: {
      roots: ['Bridge', 'Common', 'Field', 'Guest', 'Hearth', 'Hill', 'Kin', 'Lantern', 'Neighbor', 'Pass', 'Road', 'Shelter', 'Table', 'Water', 'Winter', 'Word'],
      endings: ['bound', 'carried', 'given', 'guarded', 'heard', 'held', 'kept', 'marked', 'met', 'named', 'raised', 'recalled', 'returned', 'shared', 'stood', 'witnessed'],
      formats: ['{root}-{ending}'],
    },
    heritages: {
      ashlands: {
        label: 'Ashridge refuge promises',
        lore: 'Ashridge kin renew promises before winter witnesses. A family mark can name the upland refuge where neighbors once kept one another alive.',
        given: {
          masculine: ['Bragren', 'Gravuk', 'Hozrek', 'Urdhak'],
          feminine: ['Bragra', 'Graveth', 'Hozra', 'Urdhira'],
          neutral: ['Bragel', 'Graven', 'Hozrel', 'Urdhen'],
        },
        givenFragments: { starts: ['Brag', 'Grav', 'Hoz', 'Kadr', 'Morz', 'Ruzh', 'Torg', 'Urdh'], ends: ['ak', 'el', 'en', 'eth', 'ira', 'ra', 'rel', 'uk'] },
        family: { roots: ['Cold', 'Gate', 'Hearth', 'Hill', 'Pass', 'Refuge', 'Snow', 'Winter'], endings: ['bound', 'guarded', 'held', 'kept', 'raised', 'shared', 'stood', 'witnessed'], formats: ['{root}-{ending}'] },
      },
      sunlands: {
        label: 'Sunmesa open-table histories',
        lore: 'Sunmesa kin preserve farming roads, disputed victories and promises spoken before guests. A public name can be debated without denying the person who carries it.',
        given: {
          masculine: ['Azren', 'Dharuk', 'Kavor', 'Mazhal'],
          feminine: ['Azira', 'Dhareth', 'Kavela', 'Mazhira'],
          neutral: ['Azrel', 'Dharen', 'Kavek', 'Mazhrel'],
        },
        givenFragments: { starts: ['Az', 'Dhar', 'Gazh', 'Kav', 'Mazh', 'Nazr', 'Saz', 'Uvar'], ends: ['al', 'ek', 'ela', 'en', 'eth', 'ira', 'or', 'rel'] },
        family: { roots: ['Cistern', 'Field', 'Guest', 'Mesa', 'Road', 'Seed', 'Table', 'Water'], endings: ['carried', 'given', 'heard', 'kept', 'named', 'returned', 'shared', 'witnessed'], formats: ['{root}-{ending}'] },
      },
      sable_coast: {
        label: 'Sablemarsh walkway kin',
        lore: 'Sablemarsh names remember households that raised and repaired the tidal walkways. The youngest witness can add a correction to an elder’s account.',
        given: {
          masculine: ['Buzhrel', 'Dovhak', 'Murzal', 'Ozhev'],
          feminine: ['Buzhira', 'Dovra', 'Murzeth', 'Ozhela'],
          neutral: ['Buzhen', 'Dovrel', 'Murzek', 'Ozhen'],
        },
        givenFragments: { starts: ['Buzh', 'Dov', 'Hazm', 'Murz', 'Ozh', 'Ravh', 'Tuzh', 'Vozr'], ends: ['al', 'ek', 'ela', 'en', 'eth', 'hak', 'ira', 'rel'] },
        family: { roots: ['Bank', 'Bridge', 'Harbor', 'Marsh', 'Reed', 'Salt', 'Step', 'Tide'], endings: ['bound', 'carried', 'guarded', 'held', 'marked', 'raised', 'returned', 'witnessed'], formats: ['{root}-{ending}'] },
      },
    },
  },

  goblin: {
    label: 'Workshop tokens and neighborhood books',
    lore: 'Goblin households remember repairs, borrowed tools and neighbors who made room for a new home. A repair name belongs to descendants in every walk of life.',
    given: {
      masculine: ['Bekket', 'Cizren', 'Dikkor', 'Ezzik', 'Fizzren', 'Gekkel', 'Hizvar', 'Jikket', 'Kezlo', 'Lizzrek', 'Mekzin', 'Nizzel', 'Ozkit', 'Pekren', 'Rizzek', 'Tizvar'],
      feminine: ['Bekkia', 'Cizra', 'Dikkela', 'Ezzia', 'Fizzela', 'Gekka', 'Hizri', 'Jikkia', 'Kezla', 'Lizzia', 'Mekza', 'Nizza', 'Ozkia', 'Pekra', 'Rizzia', 'Tizra'],
      neutral: ['Bekk', 'Cizrel', 'Dikken', 'Ezz', 'Fizzen', 'Gekki', 'Hizren', 'Jikkel', 'Kezri', 'Lizzel', 'Mekz', 'Nizzin', 'Ozkel', 'Pekki', 'Rizzen', 'Tizrel'],
    },
    givenFragments: {
      starts: ['Bekk', 'Ciz', 'Dikk', 'Ezz', 'Fizz', 'Gekk', 'Hiz', 'Jikk', 'Kez', 'Lizz', 'Mekz', 'Nizz', 'Ozk', 'Pekk', 'Rizz', 'Tiz'],
      ends: ['a', 'el', 'ela', 'en', 'et', 'ia', 'ik', 'in', 'it', 'lo', 'or', 'ra', 'rek', 'rel', 'ri', 'var'],
    },
    family: {
      roots: ['Borrow', 'Brass', 'Bright', 'Button', 'Copper', 'Crook', 'Little', 'Mend', 'Patch', 'Pocket', 'Salvage', 'Small', 'Spare', 'Thread', 'Tin', 'Twice'],
      endings: ['bolt', 'clip', 'cord', 'hinge', 'hook', 'joint', 'key', 'latch', 'link', 'needle', 'peg', 'pin', 'plate', 'rivet', 'spool', 'stitch'],
      formats: ['{root}{ending}'],
    },
    heritages: {
      ashlands: {
        label: 'Cinderburrow repair names',
        lore: 'Cinderburrow family tokens remember an old furnace ward or the repair that made its overlooked rooms habitable.',
        given: {
          masculine: ['Buzket', 'Dreggik', 'Kizzor', 'Tekkren'],
          feminine: ['Buzka', 'Dreggia', 'Kizzela', 'Tekkra'],
          neutral: ['Buzkel', 'Dreggen', 'Kizzi', 'Tekkrel'],
        },
        givenFragments: { starts: ['Buzk', 'Dregg', 'Gizz', 'Kizz', 'Muzz', 'Nekk', 'Tekk', 'Vizz'], ends: ['a', 'el', 'ela', 'en', 'et', 'ia', 'ik', 'or'] },
        family: { roots: ['Cinder', 'Coal', 'Furnace', 'Hearth', 'Iron', 'Patch', 'Slag', 'Soot'], endings: ['bolt', 'grate', 'hinge', 'hook', 'plate', 'rivet', 'stitch', 'vent'], formats: ['{root}{ending}'] },
      },
      sunlands: {
        label: 'Sunmarket favor and tool names',
        lore: 'Sunmarket household books follow borrowed tools and returned favors between caravan workshops. The token name is kept after the workshop moves.',
        given: {
          masculine: ['Azkit', 'Dezzor', 'Kavzik', 'Sizzren'],
          feminine: ['Azkia', 'Dezzela', 'Kavza', 'Sizzra'],
          neutral: ['Azkel', 'Dezzen', 'Kavzi', 'Sizzrel'],
        },
        givenFragments: { starts: ['Azk', 'Dezz', 'Faz', 'Kavz', 'Lazk', 'Nazz', 'Sizz', 'Tazz'], ends: ['a', 'el', 'ela', 'en', 'ia', 'ik', 'it', 'or'] },
        family: { roots: ['Amber', 'Borrow', 'Brass', 'Button', 'Copper', 'Market', 'Spare', 'Sun'], endings: ['clip', 'cord', 'hook', 'key', 'link', 'needle', 'spool', 'stitch'], formats: ['{root}{ending}'] },
      },
      sable_coast: {
        label: 'Sabledock salvage ledgers',
        lore: 'Sabledock names remember wharf workshops and useful things raised from wreckage. Their ledgers preserve the neighbors who helped recover a household.',
        given: {
          masculine: ['Bozzet', 'Dizzuk', 'Mokzet', 'Uzzren'],
          feminine: ['Bozzia', 'Dizzela', 'Mokza', 'Uzzra'],
          neutral: ['Bozzel', 'Dizzen', 'Mokzi', 'Uzzrel'],
        },
        givenFragments: { starts: ['Bozz', 'Dizz', 'Guzz', 'Mokz', 'Nuzz', 'Rokk', 'Uzz', 'Vozz'], ends: ['a', 'el', 'ela', 'en', 'et', 'ia', 'ri', 'uk'] },
        family: { roots: ['Barnacle', 'Brine', 'Dock', 'Drift', 'Harbor', 'Rope', 'Salvage', 'Tin'], endings: ['cleat', 'cord', 'hook', 'joint', 'peg', 'pin', 'plate', 'rivet'], formats: ['{root}{ending}'] },
      },
    },
  },

  tiefling: {
    label: 'Chosen names and letter houses',
    lore: 'Tiefling registers preserve birth names, chosen names and distant kin with equal care. A household name may remember a letter route rather than a fixed ancestral seat.',
    given: {
      masculine: ['Azavel', 'Devaris', 'Ezoren', 'Ishavan', 'Javereth', 'Kezavir', 'Lazoven', 'Mevarin', 'Nazorel', 'Oshavel', 'Raziven', 'Sevaris', 'Tazoren', 'Ushavir', 'Vezarin', 'Yazovel'],
      feminine: ['Azavia', 'Devara', 'Ezoria', 'Ishaveth', 'Javera', 'Kezavia', 'Lazora', 'Mevaria', 'Nazoveth', 'Oshavia', 'Razira', 'Sevara', 'Tazoria', 'Ushavia', 'Vezara', 'Yazovia'],
      neutral: ['Accord', 'Afterlight', 'Candor', 'Evermore', 'Farletter', 'Haven', 'Interval', 'Mercy', 'Morrow', 'Peregrine', 'Refrain', 'Resolve', 'Solace', 'Stilllight', 'Verity', 'Waymark'],
    },
    givenFragments: {
      starts: ['Aza', 'Deva', 'Ezo', 'Isha', 'Jave', 'Keza', 'Lazo', 'Meva', 'Nazo', 'Osha', 'Razi', 'Seva', 'Tazo', 'Usha', 'Veza', 'Yazo'],
      ends: ['ara', 'arin', 'avia', 'el', 'era', 'eth', 'ia', 'ir', 'is', 'ora', 'oren', 'rel', 'ris', 'van', 'vel', 'veth'],
    },
    family: {
      roots: ['Amber', 'Ash', 'Distant', 'Evening', 'Folded', 'Lantern', 'Long', 'Moon', 'Open', 'Quiet', 'Red', 'Road', 'Silver', 'Star', 'Velvet', 'Winter'],
      endings: ['answer', 'archive', 'candle', 'envelope', 'folio', 'hearth', 'journey', 'letter', 'margin', 'page', 'post', 'ribbon', 'seal', 'station', 'verse', 'way'],
      formats: ['{root}{ending}'],
    },
    heritages: {
      ashlands: {
        label: 'Ashveil winter correspondence',
        lore: 'Ashveil letter houses remember cold pilgrimage roads. A new chosen name is written beside the names its bearer wishes to keep in memory.',
        given: {
          masculine: ['Eszharen', 'Izhavel', 'Keshorin', 'Vezharel'],
          feminine: ['Eszhara', 'Izhavia', 'Keshora', 'Vezharia'],
          neutral: ['Emberwake', 'Lastlight', 'Remembrance', 'Winterwish'],
        },
        givenFragments: { starts: ['Eszha', 'Izha', 'Kesha', 'Mezha', 'Nesha', 'Ozhai', 'Uzhai', 'Vezha'], ends: ['ara', 'el', 'en', 'eth', 'ia', 'orin', 'rel', 'vel'] },
        family: { roots: ['Ash', 'Charcoal', 'Cold', 'Ember', 'Frost', 'Longnight', 'Soot', 'Winter'], endings: ['candle', 'folio', 'hearth', 'letter', 'margin', 'ribbon', 'seal', 'way'], formats: ['{root}{ending}'] },
      },
      sunlands: {
        label: 'Sunveil star and remedy records',
        lore: 'Sunveil lineages carry new star names and remedies home from their travels. Astronomers, porters and healers share registers without fixing a child’s calling.',
        given: {
          masculine: ['Adhavel', 'Ezharis', 'Sazorin', 'Uzaver'],
          feminine: ['Adhavia', 'Ezharia', 'Sazora', 'Uzavera'],
          neutral: ['Daybreak', 'Farstar', 'Openhand', 'Patience'],
        },
        givenFragments: { starts: ['Adha', 'Ezha', 'Hazai', 'Lazha', 'Ozha', 'Sazo', 'Uzave', 'Zhai'], ends: ['ara', 'er', 'eth', 'ia', 'ir', 'orin', 'ris', 'vel'] },
        family: { roots: ['Amber', 'Dawn', 'Gold', 'Ochre', 'Open', 'Saffron', 'Star', 'Sun'], endings: ['archive', 'journey', 'letter', 'page', 'post', 'ribbon', 'station', 'verse'], formats: ['{root}{ending}'] },
      },
      sable_coast: {
        label: 'Sableveil coast-to-hearth letters',
        lore: 'Sableveil names travel between coastal relatives and inland hearths. A letter-house affiliation can survive many homes and more than one chosen name.',
        given: {
          masculine: ['Bazhavel', 'Imzoren', 'Ozhavir', 'Umevaris'],
          feminine: ['Bazhavia', 'Imzoria', 'Ozhava', 'Umevara'],
          neutral: ['Harborlight', 'Return', 'Tideletter', 'Welcome'],
        },
        givenFragments: { starts: ['Bazha', 'Imzo', 'Mezai', 'Ozhav', 'Razhu', 'Sume', 'Umeva', 'Vozha'], ends: ['a', 'ara', 'avia', 'el', 'en', 'ir', 'oria', 'ris'] },
        family: { roots: ['Blue', 'Distant', 'Harbor', 'Moon', 'Salt', 'Sea', 'Silver', 'Tide'], endings: ['answer', 'envelope', 'hearth', 'journey', 'letter', 'page', 'seal', 'way'], formats: ['{root}{ending}'] },
      },
    },
  },

  beastfolk: {
    label: 'Household paths and remembered seasons',
    lore: 'Beastfolk names belong to particular households and lineages. A creature lineage is one part of a family story; city, coast and woodland histories can all belong to its members.',
    given: {
      masculine: ['Arroven', 'Beshun', 'Cherrik', 'Dovren', 'Errukar', 'Farrek', 'Heshon', 'Javren', 'Korrin', 'Leshur', 'Mavrik', 'Neshun', 'Orrek', 'Ravren', 'Sherren', 'Tovrik'],
      feminine: ['Arrovia', 'Beshara', 'Cherria', 'Dovra', 'Errula', 'Farri', 'Heshara', 'Javria', 'Korra', 'Leshia', 'Mavra', 'Neshara', 'Orrella', 'Ravria', 'Sherria', 'Tovra'],
      neutral: ['Arrove', 'Besh', 'Cherren', 'Dovri', 'Erru', 'Farrel', 'Hesh', 'Javrel', 'Korren', 'Leshu', 'Mavri', 'Nesh', 'Orri', 'Ravrel', 'Sherri', 'Tovrel'],
    },
    givenFragments: {
      starts: ['Arro', 'Besh', 'Cherr', 'Dov', 'Erru', 'Farr', 'Hesh', 'Jav', 'Korr', 'Lesh', 'Mav', 'Nesh', 'Orr', 'Rav', 'Sherr', 'Tov'],
      ends: ['a', 'ara', 'el', 'ella', 'en', 'ia', 'in', 'kar', 'la', 'on', 'ra', 'rel', 'ri', 'rik', 'un', 'ven'],
    },
    family: {
      roots: ['Autumn', 'Bell', 'Briar', 'Brook', 'Cedar', 'City', 'Dawn', 'Garden', 'Harbor', 'Juniper', 'Meadow', 'Moon', 'Orchard', 'River', 'Rooftop', 'Winter'],
      endings: ['bowl', 'den', 'door', 'hearth', 'landing', 'lane', 'path', 'porch', 'refuge', 'song', 'stall', 'step', 'store', 'tale', 'walk', 'yard'],
      formats: ['{root}{ending}'],
    },
    heritages: {
      wolfkin: {
        label: 'Wolfkin shared paths',
        lore: 'Wolfkin household accounts remember woodland paths and kin who kept travelers safe. A shared walk marks a changing moon, wherever the family lives.',
        given: {
          masculine: ['Aurren', 'Harruk', 'Ruvren', 'Vorrik'],
          feminine: ['Aurra', 'Harruna', 'Ruvria', 'Vorra'],
          neutral: ['Aurrel', 'Harru', 'Ruvri', 'Vorren'],
        },
        givenFragments: { starts: ['Aurr', 'Harr', 'Kurr', 'Lurv', 'Ruv', 'Surr', 'Turr', 'Vorr'], ends: ['a', 'el', 'en', 'ia', 'ik', 'rel', 'ri', 'uk'] },
        family: { roots: ['Briar', 'Cedar', 'Dusk', 'Forest', 'Juniper', 'Moon', 'Safe', 'Wayfarer'], endings: ['den', 'hearth', 'lane', 'path', 'refuge', 'song', 'tale', 'walk'], formats: ['{root}{ending}'] },
      },
      catkin: {
        label: 'Catkin rooftops and garden towns',
        lore: 'Catkin histories preserve climbing paths, garden towns and crowded city hearths. A rooftop tale can remember a home that the family no longer occupies.',
        given: {
          masculine: ['Ceshir', 'Lirrek', 'Mishven', 'Sarril'],
          feminine: ['Ceshia', 'Lirra', 'Mishara', 'Sarrina'],
          neutral: ['Ceshi', 'Lirrel', 'Mishri', 'Sarren'],
        },
        givenFragments: { starts: ['Cesh', 'Firr', 'Lirr', 'Mish', 'Nirr', 'Rish', 'Sarr', 'Vesh'], ends: ['a', 'ara', 'el', 'en', 'ia', 'il', 'ir', 'ven'] },
        family: { roots: ['Balcony', 'Garden', 'High', 'Orchard', 'Rooftop', 'Slate', 'Sunlit', 'Window'], endings: ['court', 'door', 'hearth', 'lane', 'porch', 'step', 'tale', 'yard'], formats: ['{root}{ending}'] },
      },
      bearkin: {
        label: 'Bearkin refuges and shared stores',
        lore: 'Bearkin households remember forest refuges and winter stores opened for neighbors. Their names can recall a gift of honey without making generosity a birthright.',
        given: {
          masculine: ['Borum', 'Dorruk', 'Hurron', 'Murrav'],
          feminine: ['Boruma', 'Dorrua', 'Hurria', 'Murra'],
          neutral: ['Borun', 'Dorr', 'Hurren', 'Murral'],
        },
        givenFragments: { starts: ['Bor', 'Dorr', 'Gurr', 'Hurr', 'Murr', 'Orru', 'Torr', 'Vurr'], ends: ['a', 'al', 'av', 'en', 'ia', 'on', 'uk', 'um'] },
        family: { roots: ['Beech', 'Cedar', 'Forest', 'Honey', 'Lastjar', 'Pine', 'Refuge', 'Winter'], endings: ['bowl', 'den', 'hearth', 'larder', 'porch', 'store', 'table', 'tale'], formats: ['{root}{ending}'] },
      },
      hornkin: {
        label: 'Hornkin grazing roads and gathering bells',
        lore: 'Hornkin families remember misty upland roads and gathering bells. Each new household adds its note to the account rather than losing its own history.',
        given: {
          masculine: ['Arenok', 'Dorvik', 'Kavenor', 'Turren'],
          feminine: ['Arenna', 'Dorvia', 'Kavena', 'Turria'],
          neutral: ['Arenel', 'Dorven', 'Kaven', 'Turrel'],
        },
        givenFragments: { starts: ['Aren', 'Dorv', 'Gaven', 'Kaven', 'Maren', 'Orven', 'Turr', 'Varen'], ends: ['a', 'el', 'en', 'ia', 'ik', 'na', 'ok', 'or'] },
        family: { roots: ['Bell', 'Cloud', 'Gathering', 'Grass', 'Hill', 'Mist', 'Pass', 'Upland'], endings: ['fold', 'hearth', 'lane', 'note', 'path', 'road', 'song', 'tale'], formats: ['{root}{ending}'] },
      },
      harekin: {
        label: 'Harekin meadow messages',
        lore: 'Harekin households record meadow lanes, buried gardens and carried warnings. Messenger stories open the first spring planting even in families that have settled in cities.',
        given: {
          masculine: ['Chivren', 'Fellin', 'Nerrek', 'Tivrel'],
          feminine: ['Chivia', 'Fellira', 'Nerrella', 'Tivria'],
          neutral: ['Chivi', 'Fellen', 'Nerri', 'Tivren'],
        },
        givenFragments: { starts: ['Chiv', 'Fell', 'Jerr', 'Lell', 'Nerr', 'Piv', 'Tiv', 'Vell'], ends: ['el', 'ella', 'en', 'ia', 'in', 'ira', 'rek', 'rel'] },
        family: { roots: ['Buried', 'Clover', 'Dawn', 'Meadow', 'Message', 'Spring', 'Thistle', 'Warning'], endings: ['garden', 'hearth', 'lane', 'path', 'porch', 'song', 'step', 'tale'], formats: ['{root}{ending}'] },
      },
      wildkin: {
        label: 'Wildkin household tales',
        lore: 'Wildkin is a shared register for other Beastfolk lineages. Each household chooses the creature, place or season remembered in its own first tale.',
        given: {
          masculine: ['Akkiven', 'Chorrik', 'Deyrun', 'Sevrok'],
          feminine: ['Akkia', 'Chorria', 'Deyra', 'Sevra'],
          neutral: ['Akki', 'Chorren', 'Deyri', 'Sevren'],
        },
        givenFragments: { starts: ['Akki', 'Chorr', 'Dey', 'Esh', 'Javi', 'Lesh', 'Sevr', 'Ush'], ends: ['a', 'el', 'en', 'ia', 'ik', 'ok', 'ri', 'run'] },
        family: { roots: ['Autumn', 'Brightwing', 'Brook', 'Ember', 'Harbor', 'River', 'Shell', 'Willow'], endings: ['door', 'hearth', 'landing', 'path', 'stall', 'step', 'tale', 'yard'], formats: ['{root}{ending}'] },
      },
    },
  },
});

// Climate IDs deliberately match world.js and realm-content-v18.js. These
// customs are shared regional histories; no ancestry is excluded from a region.
// A place's inherited name need not change when its ruler or population changes.
export const REGION_NAME_LORE_V20 = Object.freeze({
  rainward: {
    title: 'Names above the blackwater',
    cultureRule: 'Rainward registers often record a raised road, safe landing or lantern station beside a household name. Rebuilt wards preserve the old low-water name as a second entry.',
    affiliationFormats: ['of {place}', 'from {place}'],
    placeRoots: ['Blackwater', 'Bog', 'Candle', 'Greyreed', 'Ironfen', 'Lantern', 'Longrain', 'Marsh', 'Rain', 'Reed', 'Stillwater', 'Wetstone'],
    placeEndings: ['bank', 'bridge', 'causeway', 'cross', 'fen', 'ford', 'landing', 'march', 'pier', 'rise', 'ward', 'watch'],
    placeFormats: ['{root}{ending}', '{root} {ending}'],
    remembrance: 'The lost low ward is written beneath the rebuilt road’s name, so a flood cannot erase the households that stood there.',
  },
  saltreach: {
    title: 'Names entered beside the tide',
    cultureRule: 'Saltreach councils record ports of departure and return beside household names. A ship or captain’s title is a separate entry and never becomes a child’s inherited deed.',
    affiliationFormats: ['of {place}', 'from the {place} coast'],
    placeRoots: ['Anchor', 'Brine', 'Cinder', 'Gull', 'Headland', 'Oldsalt', 'Pearl', 'Salt', 'Seaglass', 'Shell', 'Storm', 'Tide'],
    placeEndings: ['bay', 'break', 'cliff', 'cove', 'harbor', 'haven', 'head', 'light', 'quay', 'reach', 'strand', 'wake'],
    placeFormats: ['{root}{ending}', '{root} {ending}'],
    remembrance: 'A harbor bell reads the names of crews as well as vessels. New quays keep the wreck account of the old landing.',
  },
  highstone: {
    title: 'Names witnessed at the hall',
    cultureRule: 'Highstone records name halls, winter shelters and makers who kept a route sound. A craft witness can remain in a family register after its descendants choose different work.',
    affiliationFormats: ['of {place}', 'from {place} Hall'],
    placeRoots: ['Basalt', 'Copper', 'Frost', 'Granite', 'Hammer', 'High', 'Iron', 'Ore', 'Rescue', 'Slate', 'Snow', 'Stone'],
    placeEndings: ['anvil', 'brace', 'delve', 'forge', 'hall', 'hold', 'pass', 'peak', 'reach', 'shelter', 'span', 'watch'],
    placeFormats: ['{root}{ending}', '{root} {ending}'],
    remembrance: 'A fallen shaft’s name is carried into the surviving households’ new hall, beside those who did not reach the rescue bell.',
  },
  blackgrove: {
    title: 'Names kept in root and song',
    cultureRule: 'Blackgrove place names remember a shared clearing, living bridge or tended garden. Household registers distinguish that public place from a private family name.',
    affiliationFormats: ['of {place}', 'from the {place} grove'],
    placeRoots: ['Bark', 'Briar', 'Fern', 'Fox', 'Laurel', 'Leaf', 'Moss', 'Oldroot', 'Rowan', 'Seed', 'Thorn', 'Willow'],
    placeEndings: ['bough', 'bridge', 'clearing', 'garden', 'grove', 'hollow', 'orchard', 'path', 'root', 'shade', 'song', 'vale'],
    placeFormats: ['{root}{ending}', '{root} {ending}'],
    remembrance: 'A swallowed hamlet’s name survives in the path record, even when its doors can only be found between trees.',
  },
  ashplain: {
    title: 'Names carried between wells',
    cultureRule: 'Ashplain travelers give a household and the well or caravan hearth that last sheltered them. Ruined fortress titles remain on maps beside the names used by their present residents.',
    affiliationFormats: ['of {place}', 'from {place} Well'],
    placeRoots: ['Amber', 'Ash', 'Beacon', 'Cinder', 'Clay', 'Ember', 'Glass', 'Ochre', 'Redstone', 'Saffron', 'Sun', 'Wayfarer'],
    placeEndings: ['arch', 'bastion', 'cistern', 'gate', 'hearth', 'plain', 'refuge', 'road', 'shade', 'span', 'ward', 'well'],
    placeFormats: ['{root}{ending}', '{root} {ending}'],
    remembrance: 'A restored cistern records the old ruined ward and the neighbors who reopened it, rather than only the ruler who claimed its water.',
  },
  bellwater: {
    title: 'Names heard across the crossings',
    cultureRule: 'Bellwater ferry registers preserve riverbank households and the crossing where they were witnessed. A move to the opposite bank adds an entry without deleting the earlier home.',
    affiliationFormats: ['of {place}', 'from the {place} crossing'],
    placeRoots: ['Bell', 'Clay', 'Drowned', 'Goldwater', 'Island', 'Lowriver', 'Potter', 'River', 'Sedge', 'Stillbell', 'Waterlily', 'Wetgarden'],
    placeEndings: ['bank', 'bend', 'bridge', 'commons', 'cross', 'ferry', 'ford', 'garden', 'isle', 'landing', 'reed', 'shore'],
    placeFormats: ['{root}{ending}', '{root} {ending}'],
    remembrance: 'When the river changes course, the abandoned crossing bell remains in the household account beside the new bank’s name.',
  },
});
