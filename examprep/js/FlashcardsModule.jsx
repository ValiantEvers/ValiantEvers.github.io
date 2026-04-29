// FlashcardsModule.jsx
(function() {
const { useState, useMemo, useEffect, useRef } = React;

const SR_KEY   = 'gra6546_fc_sr';
const MODE_KEY = 'gra6546_fc_mode';

const INTERVALS     = [1, 3, 7, 14, 30, 90];
const MASTERED_DAYS = 21;

// ── SR helpers ──────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function nextInterval(repetitions, multiplier) {
  const idx = Math.min(Math.max(repetitions, 0), INTERVALS.length - 1);
  return Math.max(1, Math.ceil(INTERVALS[idx] * multiplier));
}

function applySR(srData, cardId, rating) {
  const cur = srData[cardId] || { repetitions: 0 };
  let reps, interval;
  if (rating === 'hard') {
    reps     = 0;
    interval = 1;
  } else if (rating === 'good') {
    reps     = cur.repetitions + 1;
    interval = nextInterval(reps, 1.0);
  } else {                          // easy
    reps     = cur.repetitions + 2;
    interval = nextInterval(reps, 1.5);
  }
  return {
    ...srData,
    [cardId]: { interval, repetitions: reps, dueDate: addDays(interval), lastRating: rating },
  };
}

function previewIntervals(srData, cardId) {
  const reps = (srData[cardId] || { repetitions: 0 }).repetitions;
  return {
    hard: 1,
    good: nextInterval(reps + 1, 1.0),
    easy: nextInterval(reps + 2, 1.5),
  };
}

// ── Deck builders ───────────────────────────────────────────

function buildBaseDeck(glossary, flashcards, activeTags) {
  const auto = glossary
    .filter(e => e.flashcardBack)
    .map(e => ({ id: 'auto-' + e.id, front: e.term, back: e.flashcardBack, tags: e.tags || [] }));
  let deck = [...auto, ...(flashcards || [])];
  if (activeTags.length > 0) {
    deck = deck.filter(c => activeTags.some(t => (c.tags || []).includes(t)));
  }
  return deck;
}

function buildSRDeck(baseDeck, srData) {
  const today = todayStr();
  const overdue = [], dueToday = [], newCards = [], future = [];
  baseDeck.forEach(card => {
    const sr = srData[card.id];
    if (!sr || !sr.dueDate)          newCards.push(card);
    else if (sr.dueDate < today)     overdue.push(card);
    else if (sr.dueDate === today)   dueToday.push(card);
    else                             future.push(card);
  });
  overdue.sort((a, b) => (srData[a.id].dueDate < srData[b.id].dueDate ? -1 : 1));
  return [...overdue, ...dueToday, ...newCards, ...future];
}

// ── Component ───────────────────────────────────────────────

function FlashcardsModule({ data, pendingFlashcardNav }) {
  const { glossary = [], flashcards = [] } = data;
  const [activeTags, setActiveTags]   = useState([]);
  const [srData,     setSrData]       = useState(() => window.lsGet(SR_KEY, {}));
  const [mode,       setMode]         = useState(() => window.lsGet(MODE_KEY, 'sr'));
  const [idx,        setIdx]          = useState(0);
  const [flipped,    setFlipped]      = useState(false);
  const [swipeStartX, setSwipeStartX] = useState(null);
  const [swipeStartY, setSwipeStartY] = useState(null);
  const cardRef = useRef(null);
  const consumedNavKeyRef = useRef(0);

  const today = todayStr();

  const baseDeck = useMemo(
    () => buildBaseDeck(glossary, flashcards, activeTags),
    [glossary, flashcards, activeTags],
  );

  const deck = useMemo(
    () => mode === 'sr' ? buildSRDeck(baseDeck, srData) : baseDeck,
    [mode, baseDeck, srData],
  );

  // Stats run over the full (unfiltered) deck
  const fullDeck = useMemo(
    () => buildBaseDeck(glossary, flashcards, []),
    [glossary, flashcards],
  );

  const srStats = useMemo(() => {
    let overdue = 0, newCount = 0, mastered = 0;
    fullDeck.forEach(card => {
      const sr = srData[card.id];
      if (!sr || !sr.dueDate)      newCount++;
      else if (sr.dueDate <= today) overdue++;
      if (sr && sr.interval >= MASTERED_DAYS) mastered++;
    });
    return { overdue, newCount, mastered };
  }, [fullDeck, srData, today]);

  const safeIdx = deck.length > 0 ? idx % deck.length : 0;
  const card    = deck[safeIdx] || null;

  // Deep-link from search palette: clear tag filter on a new pending nav,
  // then snap the deck to the matching card once it's in the deck. Each
  // {id,key} pair is consumed only once so subsequent user navigation
  // (advance / rate) is not undone by this effect.
  useEffect(() => {
    if (!pendingFlashcardNav?.id) return;
    setActiveTags([]);
    setFlipped(false);
  }, [pendingFlashcardNav]);

  useEffect(() => {
    const nav = pendingFlashcardNav;
    if (!nav?.id || nav.key === consumedNavKeyRef.current) return;
    const target = deck.findIndex(c => c.id === nav.id);
    if (target >= 0) {
      setIdx(target);
      consumedNavKeyRef.current = nav.key;
    }
  }, [pendingFlashcardNav, deck]);

  const intervals = useMemo(
    () => card ? previewIntervals(srData, card.id) : { hard: 1, good: 1, easy: 2 },
    [card, srData],
  );

  function saveSR(next) {
    setSrData(next);
    window.lsSet(SR_KEY, next);
  }

  function rate(rating) {
    if (!card) return;
    saveSR(applySR(srData, card.id, rating));
    setFlipped(false);
    setTimeout(() => setIdx(i => i + 1), 50);
  }

  function navigate(offset) {
    setFlipped(false);
    setTimeout(() => setIdx(i => Math.max(0, i + offset)), 50);
  }

  function toggleTag(tag) {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    setIdx(0);
    setFlipped(false);
  }

  function switchMode(m) {
    setMode(m);
    window.lsSet(MODE_KEY, m);
    setIdx(0);
    setFlipped(false);
  }

  function resetProgress() {
    if (!confirm('Reset all progress? This cannot be undone.')) return;
    saveSR({});
    setIdx(0);
    setFlipped(false);
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === ' ')           { e.preventDefault(); setFlipped(f => !f); }
      if (e.key === 'ArrowRight')  navigate(1);
      if (e.key === 'ArrowLeft')   navigate(-1);
      if (flipped) {
        if (e.key === '1') rate('hard');
        if (e.key === '2') rate('good');
        if (e.key === '3') rate('easy');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, deck, flipped]);

  // Touch / swipe
  function onTouchStart(e) {
    setSwipeStartX(e.touches[0].clientX);
    setSwipeStartY(e.touches[0].clientY);
  }
  function onTouchEnd(e) {
    if (swipeStartX === null) return;
    const dx  = e.changedTouches[0].clientX - swipeStartX;
    const dy  = e.changedTouches[0].clientY - swipeStartY;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (adx < 15 && ady < 15) {
      setFlipped(f => !f);
    } else if (adx > ady) {
      if (dx > 60) navigate(1); else if (dx < -60) navigate(-1);
    } else {
      if (ady > 60) navigate(dy < 0 ? 1 : -1);
    }
    setSwipeStartX(null);
    setSwipeStartY(null);
  }

  const allTags = Object.keys(window.TAG_TAXONOMY);

  if (baseDeck.length === 0) {
    return (
      <div className="flashcards-wrap">
        <div className="empty-state">No cards match this filter.</div>
      </div>
    );
  }

  function dayLabel(n) {
    return n === 1 ? '+1 day' : '+' + n + ' days';
  }

  return (
    <div className="flashcards-wrap">

      {/* ── Mode toggle ── */}
      <div className="fc-mode-toggle">
        <button
          className={'fc-mode-btn' + (mode === 'sr'     ? ' active' : '')}
          onClick={() => switchMode('sr')}
        >Spaced Repetition</button>
        <button
          className={'fc-mode-btn' + (mode === 'browse' ? ' active' : '')}
          onClick={() => switchMode('browse')}
        >Browse All</button>
      </div>

      {/* ── SR dashboard ── */}
      {mode === 'sr' && (
        <div className="fc-sr-dashboard">
          <div className="fc-sr-stat overdue">
            <span className="fc-sr-num">{srStats.overdue}</span>
            <span className="fc-sr-label">Due Today</span>
          </div>
          <div className="fc-sr-stat new">
            <span className="fc-sr-num">{srStats.newCount}</span>
            <span className="fc-sr-label">New</span>
          </div>
          <div className="fc-sr-stat mastered">
            <span className="fc-sr-num">{srStats.mastered}</span>
            <span className="fc-sr-label">Mastered</span>
          </div>
          <button className="fc-reset-btn" onClick={resetProgress}>
            Reset Progress
          </button>
        </div>
      )}

      {/* ── Tag filter ── */}
      <div className="filter-bar" style={{ marginBottom: 24 }}>
        <button
          className={'tag' + (activeTags.length === 0 ? ' active' : '')}
          onClick={() => { setActiveTags([]); setIdx(0); setFlipped(false); }}
        >All</button>
        {allTags.map(tag => (
          <button key={tag}
            className={'tag' + (activeTags.includes(tag) ? ' active' : '')}
            onClick={() => toggleTag(tag)}
          >{window.tagLabel(tag)}</button>
        ))}
      </div>

      {/* ── Progress counter ── */}
      <div className="fc-controls-top">
        <div className="fc-progress">
          {safeIdx + 1}<span> / {deck.length}</span>
        </div>
        {card && srData[card.id] && (
          <span style={{ fontSize: 11, color: 'var(--ink-light)' }}>
            Interval: {srData[card.id].interval} day{srData[card.id].interval !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Card ── */}
      {card && (
        <div
          className="fc-card-wrap"
          onClick={() => setFlipped(f => !f)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          role="button"
          tabIndex={0}
          aria-label={flipped
            ? 'Card back: ' + card.back
            : 'Card front: ' + card.front + '. Press space to flip.'}
          onKeyDown={e => e.key === 'Enter' && setFlipped(f => !f)}
        >
          <div className={'fc-card' + (flipped ? ' flipped' : '')} ref={cardRef}>
            <div className="fc-face">
              <div className="fc-face-label">Term</div>
              <div className="fc-front-text">{card.front}</div>
              {(card.tags || []).length > 0 && (
                <div style={{ position:'absolute', bottom:14, left:16, display:'flex', gap:4, flexWrap:'wrap' }}>
                  {card.tags.map(t => (
                    <span key={t} style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--ink-light)' }}>
                      {window.tagLabel(t)}
                    </span>
                  ))}
                </div>
              )}
              <div className="fc-flip-hint">Space to flip</div>
            </div>
            <div className="fc-face fc-face-back">
              <div className="fc-face-label">Definition</div>
              <div className="fc-back-text">{card.back}</div>
              <div className="fc-flip-hint">Space to flip</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Rating buttons (appear after flip) ── */}
      {card && flipped && (
        <div className="fc-rating-row">
          <button className="fc-rating-btn hard" onClick={() => rate('hard')}>
            <span className="fc-rating-label">Hard</span>
            <span className="fc-rating-sub">{dayLabel(intervals.hard)}</span>
          </button>
          <button className="fc-rating-btn good" onClick={() => rate('good')}>
            <span className="fc-rating-label">Good</span>
            <span className="fc-rating-sub">{dayLabel(intervals.good)}</span>
          </button>
          <button className="fc-rating-btn easy" onClick={() => rate('easy')}>
            <span className="fc-rating-label">Easy</span>
            <span className="fc-rating-sub">{dayLabel(intervals.easy)}</span>
          </button>
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="fc-actions">
        <button className="fc-btn fc-btn-nav" onClick={() => navigate(-1)} aria-label="Previous card">← Prev</button>
        {card && !flipped && (
          <button className="fc-btn fc-btn-flip" onClick={() => setFlipped(true)} aria-label="Flip card">Flip Card</button>
        )}
        <button className="fc-btn fc-btn-nav" onClick={() => navigate(1)} aria-label="Next card">Next →</button>
      </div>

      {/* ── Keyboard hints ── */}
      <div className="fc-shortcuts">
        <span><kbd>Space</kbd> flip</span>
        <span><kbd>→</kbd> next</span>
        <span><kbd>←</kbd> prev</span>
        <span><kbd>1</kbd> hard</span>
        <span><kbd>2</kbd> good</span>
        <span><kbd>3</kbd> easy</span>
      </div>

      <div style={{ marginTop:16, textAlign:'center', fontSize:11, color:'var(--ink-light)' }}>
        Tap to flip · Swipe ← / → to navigate
      </div>
    </div>
  );
}

window.FlashcardsModule = FlashcardsModule;
})();
