// All 6 step components – exported to window

// ─── Shared helpers ───────────────────────────────────────────
function ExampleBox({ children, title = 'Eksempel' }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ marginTop: '16px' }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'none', border: '2px solid var(--green)', borderRadius: '99px',
        padding: '8px 18px', cursor: 'pointer', fontFamily: 'var(--font-body)',
        fontSize: '13px', fontWeight: '700', color: 'var(--green)',
        letterSpacing: '0.05em', transition: 'all 0.2s',
      }}
        onMouseOver={e => { e.currentTarget.style.background = 'var(--green)'; e.currentTarget.style.color = 'white'; }}
        onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--green)'; }}
      >
        <span style={{ fontSize: '16px' }}>{open ? '−' : '+'}</span> {open ? 'Skjul' : 'Se eksempel'}
      </button>
      {open && (
        <div style={{
          marginTop: '12px', padding: '20px 22px',
          background: 'var(--green-light)', borderRadius: '16px',
          border: '1px solid #b8e8d0', animation: 'fadeIn 0.25s ease',
        }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: '700', color: '#1a6b45', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{title}</p>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: '#1e5c3a', lineHeight: '1.65' }}>{children}</div>
        </div>
      )}
    </div>
  );
}

function Concept({ label, children }) {
  return (
    <div style={{
      padding: '22px 24px', borderRadius: '16px',
      background: 'var(--warm)', border: '1px solid var(--border)',
      marginBottom: '14px',
    }}>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: '8px' }}>{label}</p>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--navy)', lineHeight: '1.7' }}>{children}</div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: '600', color: 'var(--navy)', margin: '32px 0 14px', lineHeight: '1.2' }}>{children}</h3>
  );
}

// ─── Step 1: Penger først ──────────────────────────────────────
function Step1() {
  const [creditMode, setCreditMode] = React.useState(null);
  return (
    <div>
      <SectionTitle>Hva er en buffer?</SectionTitle>
      <Concept label="Definisjon">
        En buffer er penger du setter til side for uventede utgifter – som en ødelagt vaskemaskin, tannlege, eller å miste jobben. Det er din finansielle trygghet.
      </Concept>
      <ExampleBox title="Tenk deg dette">
        Bilen din ryker plutselig. Reparasjonen koster 12 000 kr. Uten buffer må du ta opp forbrukslån med høy rente. Med buffer betaler du bare – og sover godt.
      </ExampleBox>

      <SectionTitle>Hvorfor buffer før investering?</SectionTitle>
      <Concept label="Rekkefølge">
        Hvis du investerer 50 000 kr, men ikke har buffer, risikerer du å måtte <strong>selge aksjene på verst mulig tidspunkt</strong> – kanskje midt i et krakk. Buffer = frihet til å la pengene jobbe i fred.
      </Concept>
      <div style={{ padding: '18px 22px', background: 'var(--navy)', borderRadius: '16px', marginTop: '14px' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'rgba(255,255,255,0.9)', lineHeight: '1.65' }}>
          🎯 <strong style={{ color: '#7de8b2' }}>Tommelfingerregel:</strong> Ha 3–6 måneders utgifter i buffer før du investerer. Beregn din nedenfor.
        </p>
      </div>

      <SectionTitle>Hva koster måneden din?</SectionTitle>
      <BudgetCalc />

      <SectionTitle>Kredittkort – smart eller farlig?</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
        {[
          { mode: 'smart', label: '✓ Smart bruk', color: 'var(--green)', bg: 'var(--green-light)', border: '#b8e8d0', desc: 'Bruker kredittkortet som et betalingskort, betaler hele beløpet ved forfall. Ingen renter. Kanskje bonuspoeng.' },
          { mode: 'farlig', label: '✗ Farlig bruk', color: '#c0392b', bg: '#fde8e8', border: '#f5b8b8', desc: 'Betaler bare minimumsbeløpet. Renten er gjerne 20–25 % i året. Gjelden vokser fort og kan bli en felle.' },
        ].map(({ mode, label, color, bg, border, desc }) => (
          <div key={mode} onClick={() => setCreditMode(creditMode === mode ? null : mode)} style={{
            padding: '20px', borderRadius: '16px', background: creditMode === mode ? bg : 'var(--warm)',
            border: `2px solid ${creditMode === mode ? border : 'var(--border)'}`,
            cursor: 'pointer', transition: 'all 0.2s',
          }}>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: '700', color, marginBottom: '8px', fontSize: '15px' }}>{label}</p>
            {creditMode === mode && <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: '1.6', color: 'var(--navy)' }}>{desc}</p>}
            {creditMode !== mode && <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)' }}>Trykk for å lese mer</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 2: Hvordan penger vokser ────────────────────────────
function Step2() {
  return (
    <div>
      <SectionTitle>Hva er rente?</SectionTitle>
      <Concept label="Enkelt forklart">
        Rente er betaling for å låne penger. Du betaler rente til banken når du låner – og banken betaler rente til deg når du sparer.
      </Concept>
      <ExampleBox title="Sparerente i praksis">
        Du setter 50 000 kr i banken med 3 % rente.<br /><br />
        <span style={{ display: 'block', fontFamily: 'monospace', fontSize: '14px', background: 'rgba(0,0,0,0.06)', borderRadius: '8px', padding: '12px 14px', lineHeight: '2' }}>
          50 000 kr × 3 % = <strong>1 500 kr</strong> i rente<br />
          50 000 kr + 1 500 kr = <strong>51 500 kr</strong>
        </span>
        <br />Uten å gjøre noe som helst har pengene dine vokst med 1 500 kr på ett år.
      </ExampleBox>

      <SectionTitle>Hva er avkastning?</SectionTitle>
      <Concept label="Definisjon">
        Avkastning er gevinsten du får på en investering – i prosent. Historisk har aksjemarkedet gitt ca. 7–10 % i snitt per år over lange perioder.
      </Concept>

      <SectionTitle>Hva er inflasjon?</SectionTitle>
      <Concept label="Kjøpekraft">
        Inflasjon betyr at ting blir dyrere over tid. 100 kr i dag kjøper ikke like mye om 10 år. Derfor er det viktig at pengene dine <em>vokser raskere enn inflasjonen</em>.
      </Concept>
      <div style={{ padding: '18px 22px', background: '#fff8ed', border: '1px solid #f5dba0', borderRadius: '16px', marginTop: '14px' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: '#7a5500', lineHeight: '1.65' }}>
          ⚠️ Penger du lar stå i madrassen mister verdi hvert år. Inflasjonen spiser kjøpekraften din sakte men sikkert.
        </p>
      </div>

      <SectionTitle>Rentes rente – den åttende underet</SectionTitle>
      <Concept label="Snøballeffekten">
        Når avkastningen din også begynner å gi avkastning, skjer det noe magisk. Effekten er liten i starten – men eksploderer over tid.
      </Concept>
      <CompoundCalc />
    </div>
  );
}

// ─── Step 3: Investering ──────────────────────────────────────
function Step3() {
  const [stockPhase, setStockPhase] = React.useState(0); // 0=normal 1=krakk 2=recovery
  const phases = [
    { label: 'Normal', value: 100, color: 'var(--green)', emoji: '📈', desc: 'Du kjøper 10 Equinor-aksjer à 300 kr. Totalt: 3 000 kr.' },
    { label: 'Krakk', value: 60, color: '#e05252', emoji: '📉', desc: 'Oljeprisen faller. Aksjen er nå 180 kr. Verdien din: 1 800 kr. Du er ned 40 %.' },
    { label: 'Oppgang', value: 140, color: 'var(--green)', emoji: '🚀', desc: '3 år senere: aksjen er 420 kr. Verdien din: 4 200 kr. Du er opp 40 %.' },
  ];
  const ph = phases[stockPhase];

  return (
    <div>
      <SectionTitle>Hva er aksjer?</SectionTitle>
      <Concept label="Eierskap">
        En aksje er en liten bit av et selskap. Kjøper du aksjer i Equinor, eier du en del av selskapet. Hvis selskapet gjør det bra, stiger aksjen. Går det dårlig, faller den.
      </Concept>

      <div style={{ marginTop: '20px', padding: '24px', background: 'var(--warm)', border: '1px solid var(--border)', borderRadius: '20px' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: '700', color: 'var(--muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '16px' }}>Interaktivt eksempel: Equinor-aksjen</p>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {phases.map((p, i) => (
            <button key={i} onClick={() => setStockPhase(i)} style={{
              flex: 1, padding: '10px', borderRadius: '12px', border: `2px solid ${i === stockPhase ? ph.color : 'var(--border)'}`,
              background: i === stockPhase ? (i === 1 ? '#fde8e8' : 'var(--green-light)') : 'transparent',
              cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: '700', fontSize: '13px',
              color: i === stockPhase ? ph.color : 'var(--muted)', transition: 'all 0.2s',
            }}>{p.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.05)', borderRadius: '12px', height: '100px', display: 'flex', alignItems: 'flex-end', overflow: 'visible', position: 'relative' }}>
            <div style={{ width: '100%', background: ph.color, height: `${(ph.value / 140) * 100}%`, borderRadius: '12px', transition: 'height 0.6s cubic-bezier(0.34,1.56,0.64,1)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', bottom: 0 }}>
              <span style={{ fontSize: '24px' }}>{ph.emoji}</span>
            </div>
          </div>
          <div style={{ flex: 3 }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: '700', color: ph.color, lineHeight: 1 }}>{ph.value} %</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--navy)', lineHeight: '1.6', marginTop: '8px' }}>{ph.desc}</p>
          </div>
        </div>
        {stockPhase === 1 && (
          <div style={{ padding: '14px 18px', background: '#fff8ed', borderRadius: '12px', border: '1px solid #f5dba0' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#7a5500', lineHeight: '1.6' }}>💡 <strong>Selg ikke i panikk.</strong> De som satt stille gjennom krakk har historisk alltid kommet tilbake til pluss.</p>
          </div>
        )}
      </div>

      <SectionTitle>Hva er fond?</SectionTitle>
      <Concept label="Spredning">
        Et fond samler mange investorer og kjøper hundrevis av aksjer på én gang. Du kjøper én andel – og eier litt av alt. Lavere risiko enn enkeltaksjer.
      </Concept>
      <ExampleBox title="Indeksfond i praksis">
        Et globalt indeksfond kan inneholde 1600+ selskaper fra hele verden. Om ett selskap går konkurs, merker du det knapt.<br /><br />
        Dette er en smart måte å <strong>diversifisere</strong> på – altså å ikke legge alle eggene i samme kurv. Hvis én aksje kollapser, holder de andre deg oppe.
      </ExampleBox>

      <SectionTitle>Hva er obligasjoner?</SectionTitle>
      <Concept label="Sikrere alternativ">
        En obligasjon er et lån du gir til et selskap eller stat. De betaler deg fast rente over tid, og tilbake lånet ved slutten. Tryggere enn aksjer – men lavere avkastning.
      </Concept>

      <SectionTitle>Hva er risiko?</SectionTitle>
      <Concept label="Risiko ≠ feil">
        Risiko betyr at verdien kan gå opp <em>eller ned</em>. Høyere risiko = høyere potensiell gevinst. Lav risiko = tryggere, men lavere vekst. Tid er din beste risikostrategi.
      </Concept>

      <SectionTitle>Hva er en resesjon?</SectionTitle>
      <Concept label="Markedsnedgang">
        En resesjon er når økonomien skrumper over tid – bedrifter tjener mindre, folk mister jobber, aksjene faller. Historisk har alle resesjoner tatt slutt. Markedet henter seg alltid inn.
      </Concept>
    </div>
  );
}

// ─── Step 4: Kontoer og skatt ─────────────────────────────────
function Step4() {
  const [activeAccount, setActiveAccount] = React.useState(null);
  const accounts = [
    {
      id: 'ask',
      name: 'ASK',
      full: 'Aksjesparekonto',
      tag: 'Mest populær',
      desc: 'Du kan flytte penger mellom aksjer og fond uten å betale skatt underveis. Skatt betales kun når du tar ut gevinst fra kontoen. Ideell for langsiktig sparing i aksjer.',
      tip: 'Perfekt for deg som vil investere i aksjer og fond over tid. Du har også rett på skjermingsfradrag – et fradrag beregnet av din investerte kapital som reduserer skatten du betaler på gevinst.',
    },
    {
      id: 'ikz',
      name: 'IPS',
      full: 'Individuell pensjonssparing',
      tag: 'For pensjon',
      desc: 'Du får skattefradrag på innskudd (inntil 15 000 kr/år). Pengene er låst til du er 62 år. Skattefordelaktig, men uten fleksibilitet.',
      tip: 'Egnet hvis du vil spare skatteoptimalt til pensjon og ikke trenger pengene før.',
    },
    {
      id: 'afk',
      name: 'AF-konto',
      full: 'Aksje- og fondskonto',
      tag: 'Fleksibel',
      desc: 'Vanlig konto for aksjer og fond. Skatt beregnes ved hvert salg – ingen utsettelse. Gir mest fleksibilitet, men er skattemessig mindre gunstig enn ASK.',
      tip: 'Bra hvis du trenger tilgang til pengene, eller handler enkeltaksjer mye.',
    },
    {
      id: 'bsu',
      name: 'BSU',
      full: 'Boligsparing for ungdom',
      tag: 'Under 34 år',
      desc: 'Spar til bolig og få 10 % skattefradrag på innskuddet (inntil 27 500 kr/år). Kun for deg under 34 år som ikke eier bolig.',
      tip: '🏠 Har du ikke bolig og er under 34? Start her – det er Norges beste spareordning.',
    },
  ];

  return (
    <div>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--muted)', lineHeight: '1.7', marginBottom: '20px' }}>
        Valget av konto påvirker hvor mye skatt du betaler. Her er de viktigste kontoene i Norge – trykk for detaljer.
      </p>

      <div style={{ display: 'grid', gap: '12px' }}>
        {accounts.map(acc => (
          <div key={acc.id} onClick={() => setActiveAccount(activeAccount === acc.id ? null : acc.id)} style={{
            padding: '20px 24px', borderRadius: '16px',
            background: activeAccount === acc.id ? 'var(--navy)' : 'var(--warm)',
            border: `2px solid ${activeAccount === acc.id ? 'var(--navy)' : 'var(--border)'}`,
            cursor: 'pointer', transition: 'all 0.25s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: '700', color: activeAccount === acc.id ? '#7de8b2' : 'var(--navy)' }}>{acc.name}</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: activeAccount === acc.id ? 'rgba(255,255,255,0.5)' : 'var(--muted)' }}>{acc.full}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: '700', letterSpacing: '0.05em',
                padding: '4px 12px', borderRadius: '99px',
                background: activeAccount === acc.id ? 'rgba(125,232,178,0.15)' : 'var(--green-light)',
                color: activeAccount === acc.id ? '#7de8b2' : 'var(--green)' }}>{acc.tag}</span>
            </div>
            {activeAccount === acc.id && (
              <div style={{ marginTop: '16px', animation: 'fadeIn 0.2s ease' }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.7', marginBottom: '14px' }}>{acc.desc}</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#7de8b2', lineHeight: '1.6' }}>{acc.tip}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <SectionTitle>Skatt på investeringer</SectionTitle>
      <Concept label="Skattesats 2024">
        Gevinst på aksjer og fond beskattes med ca. <strong>37,84 %</strong> (inkl. oppjustering). Men med ASK utsetter du skatten til du tar penger ut – og lar rentes rente jobbe for deg.
      </Concept>
      <ExampleBox title="Skatteeksempel">
        Du kjøper fond for 10 000 kr. Det vokser til 15 000 kr. Gevinsten er 5 000 kr.<br /><br />
        Skatt: 5 000 × 37,84 % = <strong>1 892 kr</strong> i skatt.<br />
        Du sitter igjen med <strong>13 108 kr</strong>.
      </ExampleBox>
    </div>
  );
}

// ─── Step 5: Tankesett ────────────────────────────────────────
function Step5() {
  const principles = [
    {
      name: 'Benjamin Graham',
      title: 'Beskytt nedsiden',
      quote: '«Margin of safety»',
      desc: 'Invester aldri i noe du ikke forstår. Kjøp med en sikkerhetsmargin – betal aldri mer enn verdien. Ikke tap penger er regel nr. 1.',
      icon: '🛡',
    },
    {
      name: 'Morgan Housel',
      title: 'Atferd slår kunnskap',
      quote: 'The Psychology of Money',
      desc: 'Den beste investeringsplanen er én du faktisk holder deg til. Din atferd – ro i storm, tålmodighet, ikke panikksalg – er viktigere enn å velge "riktig" aksje.',
      icon: '🧠',
    },
    {
      name: 'Langsiktig tenkning',
      title: 'Tid er din fordel',
      quote: 'Warren Buffett: «Our favourite holding period is forever»',
      desc: 'Markedet svinger kortsiktig, men stiger langsiktig. Jo lenger du er investert, jo mer sannsynlig er positiv avkastning. Start tidlig. Vær tålmodig.',
      icon: '⏳',
    },
  ];

  return (
    <div>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--muted)', lineHeight: '1.7', marginBottom: '24px' }}>
        Kunnskap om produkter er bare halvparten. Den andre halvparten er å mestre egne reaksjoner. Her er tre prinsipper fra de beste investorene i verden.
      </p>
      {principles.map((p, i) => (
        <div key={i} style={{
          padding: '28px', borderRadius: '20px',
          background: i === 1 ? 'var(--navy)' : 'var(--warm)',
          border: `1px solid ${i === 1 ? 'transparent' : 'var(--border)'}`,
          marginBottom: '14px',
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '32px', flexShrink: 0 }}>{p.icon}</span>
            <div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: i === 1 ? 'rgba(255,255,255,0.4)' : 'var(--muted)', marginBottom: '4px' }}>{p.name}</p>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '600', color: i === 1 ? 'white' : 'var(--navy)', marginBottom: '10px', lineHeight: 1.2 }}>{p.title}</h4>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontStyle: 'italic', color: i === 1 ? '#7de8b2' : 'var(--green)', marginBottom: '10px' }}>{p.quote}</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: i === 1 ? 'rgba(255,255,255,0.75)' : 'var(--navy)', lineHeight: '1.7' }}>{p.desc}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Step 6: Vanlige feil ─────────────────────────────────────
function Step6() {
  const mistakes = [
    {
      number: '01',
      title: 'Investere uten buffer',
      desc: 'Penger i markedet kan ikke brukes til uventede utgifter. Uten buffer risikerer du å selge aksjene på verst mulig tidspunkt – rett etter et fall.',
      fix: 'Ha alltid 3–6 måneders buffer i klar konto før du starter.',
    },
    {
      number: '02',
      title: 'Selge i panikk',
      desc: 'Markedet faller 30 %. Du ser røde tall og selger alt. En uke senere begynner det å stige. Du misset oppgangen – og tapte på papirtapet.',
      fix: 'Lag en plan på forhånd. Bestem deg for å ikke røre pengene i X år.',
    },
    {
      number: '03',
      title: 'Forvente raske penger',
      desc: 'Aksjemarkedet er ikke et kasino. Å prøve å «time» markedet, kjøpe hot tips eller day-trade slår sjelden indeksfondet over tid.',
      fix: 'Investér jevnlig, i brede fond, over lang tid. Kjedelig vinner.',
    },
    {
      number: '04',
      title: 'Ikke starte fordi man venter på riktig tidspunkt',
      desc: 'Det er alltid noe å bekymre seg for i markedet. De som venter på "perfekt tidspunkt" venter for lenge.',
      fix: 'Det beste tidspunktet å starte var for 10 år siden. Det nest beste er i dag.',
    },
  ];

  return (
    <div>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--muted)', lineHeight: '1.7', marginBottom: '24px' }}>
        De fleste begynner med å gjøre disse feilene. Nå vet du bedre.
      </p>
      {mistakes.map((m, i) => (
        <div key={i} style={{
          display: 'flex', gap: '20px', padding: '24px', borderRadius: '18px',
          border: '1px solid var(--border)', marginBottom: '14px',
          background: 'var(--warm)',
        }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '48px', fontWeight: '700', color: 'var(--border)', lineHeight: 1, flexShrink: 0 }}>{m.number}</span>
          <div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '600', color: 'var(--navy)', marginBottom: '8px', lineHeight: 1.2 }}>{m.title}</h4>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--muted)', lineHeight: '1.65', marginBottom: '12px' }}>{m.desc}</p>
            <div style={{ padding: '10px 16px', borderRadius: '10px', background: 'var(--green-light)', border: '1px solid #b8e8d0' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#1a6b45', lineHeight: '1.6' }}>✓ <strong>Løsning:</strong> {m.fix}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { Step1, Step2, Step3, Step4, Step5, Step6, ExampleBox, Concept, SectionTitle });
