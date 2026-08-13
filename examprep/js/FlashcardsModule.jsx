// FlashcardsModule.jsx
(function() {
const { useState, useMemo, useEffect, useRef } = React;

const SR_KEY     = 'gra6546_fc_sr';
const MODE_KEY   = 'gra6546_fc_mode';
const TIER_KEY   = 'gra6546_fc_tier';
const BACKUP_KEY = 'gra6546_flashcards_pre_exam_backup';

// ── EXAM MODE intervals (May 13 final) ─────────────────────
// Pre-exam-mode default was [1, 3, 7, 14, 30, 90] days – built for
// long-term retention. These are recalibrated for an 8-day window so
// every card cycles 4-6 times before the exam.
const MIN_AGAIN    = 5;          // 5 minutes (relearn within session)
const MIN_HARD     = 60;         // 1 hour
const MIN_GOOD_NEW = 1 * 24 * 60;    // 1 day
const MIN_GOOD_CAP = 3 * 24 * 60;    // capped at 3 days
const MIN_EASY_NEW = 2 * 24 * 60;    // 2 days
const MIN_EASY_CAP = 4 * 24 * 60;    // capped at 4 days
const MIN_MASTERED = 4 * 24 * 60;    // mastered = at Easy cap (4 days)

// ── SR helpers ──────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function dueAtFromMinutes(min) {
  return new Date(Date.now() + min * 60 * 1000).toISOString();
}

function nextIntervalMin(prevMin, prevRating, rating) {
  if (rating === 'again') return MIN_AGAIN;
  if (rating === 'hard')  return MIN_HARD;
  if (rating === 'good') {
    if (prevRating === 'good' && prevMin >= MIN_GOOD_NEW) {
      return Math.min(prevMin * 2, MIN_GOOD_CAP);
    }
    return MIN_GOOD_NEW;
  }
  if (rating === 'easy') {
    if (prevRating === 'easy' && prevMin >= MIN_EASY_NEW) {
      return Math.min(prevMin * 2, MIN_EASY_CAP);
    }
    return MIN_EASY_NEW;
  }
  return MIN_GOOD_NEW;
}

function applySR(srData, cardId, rating) {
  const cur = srData[cardId] || {};
  const prevMin    = cur.intervalMin || 0;
  const prevRating = cur.lastRating  || null;
  const intervalMin = nextIntervalMin(prevMin, prevRating, rating);
  return {
    ...srData,
    [cardId]: { intervalMin, dueAt: dueAtFromMinutes(intervalMin), lastRating: rating },
  };
}

function previewIntervals(srData, cardId) {
  const cur = srData[cardId] || {};
  const prevMin    = cur.intervalMin || 0;
  const prevRating = cur.lastRating  || null;
  return {
    again: MIN_AGAIN,
    hard:  MIN_HARD,
    good:  nextIntervalMin(prevMin, prevRating, 'good'),
    easy:  nextIntervalMin(prevMin, prevRating, 'easy'),
  };
}

function formatInterval(min) {
  if (min < 60) return min + ' min';
  if (min < 24 * 60) {
    const h = Math.round(min / 60);
    return h + (h === 1 ? ' hour' : ' hours');
  }
  const days = Math.round(min / (24 * 60));
  return days + (days === 1 ? ' day' : ' days');
}

// ── Deck builders ───────────────────────────────────────────

function buildBaseDeck(glossary, flashcards, activeTags, tierFilter) {
  const auto = glossary
    .filter(e => e.flashcardBack)
    .map(e => ({
      id: 'auto-' + e.id,
      front: e.term,
      back: e.flashcardBack,
      tags: e.tags || [],
      tier: e.tier || null,
      triage_reason: e.triage_reason || null,
    }));
  let deck = [...auto, ...(flashcards || [])];
  // Tier filter – drops are excluded from every view.
  // tierFilter: 'core' | 'nice' | 'all'  (where 'all' = core + nice; 'drop' is never shown)
  deck = deck.filter(c => c.tier !== 'drop');
  if (tierFilter === 'core') deck = deck.filter(c => c.tier === 'core');
  if (tierFilter === 'nice') deck = deck.filter(c => c.tier === 'nice');
  if (activeTags.length > 0) {
    deck = deck.filter(c => activeTags.some(t => (c.tags || []).includes(t)));
  }
  return deck;
}

function buildSRDeck(baseDeck, srData) {
  const now = Date.now();
  const overdue = [], newCards = [], future = [];
  baseDeck.forEach(card => {
    const sr = srData[card.id];
    if (!sr || !sr.dueAt) newCards.push(card);
    else if (new Date(sr.dueAt).getTime() <= now) overdue.push(card);
    else future.push(card);
  });
  overdue.sort((a, b) => (srData[a.id].dueAt < srData[b.id].dueAt ? -1 : 1));
  return [...overdue, ...newCards, ...future];
}

// ── Component ───────────────────────────────────────────────

function FlashcardsModule({ data, pendingFlashcardNav }) {
  const { glossary = [], flashcards = [] } = data;
  const [activeTags, setActiveTags]   = useState([]);
  const [srData,     setSrData]       = useState(() => {
    // One-time exam-mode migration: if the backup hasn't been written yet,
    // copy current SR state to the backup key, then start fresh.
    if (window.lsGet(BACKUP_KEY, null) === null) {
      const prior = window.lsGet(SR_KEY, {});
      window.lsSet(BACKUP_KEY, prior);
      window.lsSet(SR_KEY, {});
      return {};
    }
    return window.lsGet(SR_KEY, {});
  });
  const [mode,       setMode]         = useState(() => window.lsGet(MODE_KEY, 'sr'));
  const [tierFilter, setTierFilter]   = useState(() => window.lsGet(TIER_KEY, 'core')); // 'core' | 'nice' | 'all'

  useEffect(() => { window.lsSet(TIER_KEY, tierFilter); }, [tierFilter]);
  const [idx,        setIdx]          = useState(0);
  const [flipped,    setFlipped]      = useState(false);
  const [swipeStartX, setSwipeStartX] = useState(null);
  const [swipeStartY, setSwipeStartY] = useState(null);
  const cardRef = useRef(null);
  const consumedNavKeyRef = useRef(0);

  const baseDeck = useMemo(
    () => buildBaseDeck(glossary, flashcards, activeTags, tierFilter),
    [glossary, flashcards, activeTags, tierFilter],
  );

  const deck = useMemo(
    () => mode === 'sr' ? buildSRDeck(baseDeck, srData) : baseDeck,
    [mode, baseDeck, srData],
  );

  // Stats run over the full (untag-filtered, untier-filtered, drop-excluded) deck
  const fullDeck = useMemo(
    () => buildBaseDeck(glossary, flashcards, [], 'all'),
    [glossary, flashcards],
  );

  const srStats = useMemo(() => {
    let overdue = 0, newCount = 0, mastered = 0;
    const now = Date.now();
    fullDeck.forEach(card => {
      const sr = srData[card.id];
      if (!sr || !sr.dueAt) newCount++;
      else if (new Date(sr.dueAt).getTime() <= now) overdue++;
      if (sr && sr.intervalMin >= MIN_MASTERED) mastered++;
    });
    return { overdue, newCount, mastered };
  }, [fullDeck, srData]);

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
    () => card ? previewIntervals(srData, card.id) : { again: MIN_AGAIN, hard: MIN_HARD, good: MIN_GOOD_NEW, easy: MIN_EASY_NEW },
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
        if (e.key === '1') rate('again');
        if (e.key === '2') rate('hard');
        if (e.key === '3') rate('good');
        if (e.key === '4') rate('easy');
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

  return (
    <div className="flashcards-wrap">

      {/* ── Exam-mode indicator (remove after 2026-05-13) ── */}
      <div style={{
        display: 'inline-block',
        padding: '4px 10px',
        marginBottom: 14,
        border: '1px solid var(--accent)',
        background: 'var(--accent-pale, #FCE9E9)',
        color: 'var(--accent)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
      }}>
        Exam mode · final on 13 May 2026 · intervals shortened to 5 min / 1 h / 1–3 d / 2–4 d
      </div>

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

      {/* ── Tier filter (post-triage; drops always excluded) ── */}
      <div className="fc-mode-toggle" style={{ marginTop: 10 }}>
        {[['core', 'Core only'], ['nice', 'Nice only'], ['all', 'Core + Nice']].map(([v, l]) => (
          <button
            key={v}
            className={'fc-mode-btn' + (tierFilter === v ? ' active' : '')}
            onClick={() => { setTierFilter(v); setIdx(0); setFlipped(false); }}
          >{l}</button>
        ))}
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
            Interval: {formatInterval(srData[card.id].intervalMin || 0)}
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
          <button
            className="fc-rating-btn hard"
            onClick={() => rate('again')}
            style={{ borderColor: 'var(--accent)', background: 'var(--accent-pale, #FCE9E9)' }}
          >
            <span className="fc-rating-label" style={{ color: 'var(--accent)' }}>Again</span>
            <span className="fc-rating-sub">{formatInterval(intervals.again)}</span>
          </button>
          <button className="fc-rating-btn hard" onClick={() => rate('hard')}>
            <span className="fc-rating-label">Hard</span>
            <span className="fc-rating-sub">{formatInterval(intervals.hard)}</span>
          </button>
          <button className="fc-rating-btn good" onClick={() => rate('good')}>
            <span className="fc-rating-label">Good</span>
            <span className="fc-rating-sub">{formatInterval(intervals.good)}</span>
          </button>
          <button className="fc-rating-btn easy" onClick={() => rate('easy')}>
            <span className="fc-rating-label">Easy</span>
            <span className="fc-rating-sub">{formatInterval(intervals.easy)}</span>
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
        <span><kbd>1</kbd> again</span>
        <span><kbd>2</kbd> hard</span>
        <span><kbd>3</kbd> good</span>
        <span><kbd>4</kbd> easy</span>
      </div>

      <div style={{ marginTop:16, textAlign:'center', fontSize:11, color:'var(--ink-light)' }}>
        Tap to flip · Swipe ← / → to navigate
      </div>
    </div>
  );
}

window.FlashcardsModule = FlashcardsModule;
})();
