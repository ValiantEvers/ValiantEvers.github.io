// All norsk forklarende tekst samlet ett sted.
// Tone: sober, dataforankret, pedagogisk. Ingen utropstegn, ingen "AI-tonet"
// språk, ingen emoji.

export const COPY = {
  header: {
    title: 'Norges Bank Watch',
    tagline: 'Pengepolitikkens nøkkeltall, oppdatert daglig.',
    built_by: 'Bygget av Valiant Evers. Alle data fra Norges Bank og SSB.',
    last_updated_prefix: 'Sist oppdatert',
  },

  tiles: {
    styringsrente: 'Styringsrente',
    styringsrente_sub: 'siden forrige rentemøte',
    kpi: 'KPI 12-mnd',
    kpi_sub: 'endring vs. forrige måned',
    kpi_jae: 'KPI-JAE 12-mnd',
    kpi_jae_sub: 'endring vs. forrige måned',
    eurnok: 'EUR/NOK',
    eurnok_sub: 'hittil i år',
  },

  rentebane: {
    title: 'Rentebanen',
    body:
      'Styringsrenten er den renten bankene kan plassere overskuddslikviditet ' +
      'til over natten i Norges Bank, og den styrer prisene videre i ' +
      'pengemarkedet. Fire ganger i året publiserer Norges Bank sin egen ' +
      'forventede bane for styringsrenten i Pengepolitisk rapport — den ' +
      'såkalte rentebanen. Det er Norges Banks beste anslag på hvor renten ' +
      'bør være framover for å treffe inflasjonsmålet, og er ikke et løfte. ' +
      'Når markedet priser renten annerledes enn banens egen bane, ' +
      'signaliserer det at investorene tror inflasjonen eller realøkonomien ' +
      'utvikler seg annerledes enn Norges Bank legger til grunn.',
    legend: {
      historisk: 'Historisk styringsrente',
      bane: 'Norges Banks rentebane (siste PPR)',
      nibor: 'NOWA 3M (proxy for kort markedsrente)',
    },
    note:
      'Norges Bank publiserer ikke NIBOR direkte. Som proxy for kort ' +
      'markedsrente bruker vi 3-måneders glidende snitt av NOWA, som er ' +
      'den moderne RFR-baserte erstatningen.',
    todo: 'OIS-implisert markedsbane kommer i neste versjon.',
    source: 'Kilde: Norges Bank, IR/SHORT_RATES, og siste publiserte Pengepolitisk rapport.',
  },

  inflasjon: {
    title: 'Inflasjon — KPI og KPI-JAE',
    body:
      'KPI (konsumprisindeksen) måler den gjennomsnittlige prisveksten på ' +
      'varer og tjenester husholdninger faktisk kjøper. KPI-JAE er ' +
      'totalindeksen justert for avgiftsendringer og uten energivarer. ' +
      'Den siste er vanligvis mer stabil enn KPI, fordi store skift i ' +
      'strømpriser og særavgifter er filtrert ut, og er derfor det målet ' +
      'Norges Bank legger mest vekt på i pengepolitikken. ' +
      'Inflasjonsmålet er 2 prosent over tid.',
    legend: {
      kpi: 'KPI 12-mnd',
      kpi_jae: 'KPI-JAE 12-mnd',
      mal: 'Inflasjonsmål (2 %)',
    },
    source: 'Kilde: SSB, tabell 03013 (KPI) og 05327 (KPI-JAE).',
  },

  lonn: {
    title: 'Lønnsvekst',
    body:
      'Lønnsvekst er kanskje den viktigste innenlandske inflasjonsdriveren ' +
      'i en liten åpen økonomi. Gjennom frontfagsmodellen forhandles ' +
      'konkurranseutsatt sektor først, og resten av økonomien følger etter. ' +
      'Vedvarende høy lønnsvekst kan presse opp prisene på tjenester der ' +
      'lønn er en stor del av kostnaden, og blir derfor fulgt nøye. ' +
      'Teknisk beregningsutvalg (TBU) publiserer offisielle anslag og ' +
      'fasitter for hvert lønnsoppgjør.',
    legend: {
      yoy: 'Årlig vekst i gjennomsnittlig månedslønn',
    },
    source: 'Kilde: SSB, tabell 11418 (gjennomsnittlig månedslønn, alle yrker og sektorer).',
  },

  bolig: {
    title: 'Boligpris',
    body:
      'Boligprisene inngår direkte i Norges Banks reaksjonsfunksjon. Et ' +
      'kraftig fall kan gi formueeffekter på konsum og presse banker mot ' +
      'tap, mens vedvarende sterk vekst kan signalisere finansiell ' +
      'sårbarhet. Indeksen viser prisutviklingen for brukte boliger på ' +
      'landsbasis, ikke sesongjustert.',
    legend: {
      indeks: 'Indeks (2015 = 100)',
      yoy: '12-mnd endring',
    },
    source: 'Kilde: SSB, tabell 07221 (prisindeks for brukte boliger).',
  },

  valuta: {
    title: 'Kronekursen',
    body:
      'En svak krone gjør importerte varer dyrere og virker direkte inn på ' +
      'KPI, særlig på matvarer, klær og elektronikk. Norges Bank følger ' +
      'med på den importveide kursindeksen I-44, som dekker handelsvektede ' +
      'kurser mot Norges 44 viktigste handelspartnere. For MVP holder vi ' +
      'oss til EUR/NOK og USD/NOK — de to bilaterale kursene som dominerer ' +
      'mediedekningen og er enklest å forholde seg til.',
    legend: {
      eur: 'EUR/NOK',
      usd: 'USD/NOK',
    },
    source: 'Kilde: Norges Bank, EXR/B.{CCY}.NOK.SP.',
  },

  footer: {
    method:
      'Dataene hentes automatisk hver morgen fra Norges Bank og SSBs åpne ' +
      'API-er. Rentebanen oppdateres manuelt når Norges Bank publiserer en ' +
      'ny Pengepolitisk rapport (fire ganger i året). Hele oppsettet er ' +
      'åpent og kan inspiseres i kildekoden.',
    repo: 'Kildekode på GitHub',
    disclaimer:
      'Ikke investeringsråd. Data leveres uten garantier. Eventuelle feil ' +
      'i kilde-API-er reproduseres på dette dashbordet.',
  },

  noData: 'Data ikke tilgjengelig.',
}
