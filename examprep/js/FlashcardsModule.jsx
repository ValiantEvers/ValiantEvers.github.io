// FlashcardsModule.jsx
(function() {
const { useState, useMemo, useEffect, useCallback, useRef } = React;

const LS_KEY = 'gra6546_fc_results';

function buildDeck(glossary, flashcards, activeTags) {
  // Auto-cards from glossary entries with flashcardBack
  const autoDeck = glossary
    .filter(e => e.flashcardBack)
    .map(e => ({
      id: 'auto-' + e.id,
      front: e.term,
      back: e.flashcardBack,
      tags: e.tags || [],
      _source: 'glossary',
    }));

  // Curated cards from flashcards.json
  const curated = (flashcards || []).map(e => ({ ...e, _source: 'curated' }));

  let deck = [...autoDeck, ...curated];

  if (activeTags.length > 0) {
    deck = deck.filter(c => activeTags.some(t => (c.tags || []).includes(t)));
  }

  return deck;
}

function FlashcardsModule({ data }) {
  const { glossary = [], flashcards = [] } = data;
  const [activeTags, setActiveTags] = useState([]);
  const [results, setResults] = useState(() => window.lsGet(LS_KEY, {}));
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [swipeStartX, setSwipeStartX] = useState(null);
  const [swipeStartY, setSwipeStartY] = useState(null);
  const cardRef = useRef(null);

  // Weighted deck: "review" cards appear 3× as often as "got it" cards
  const baseDeck = useMemo(() =>
    buildDeck(glossary, flashcards, activeTags),
  [glossary, flashcards, activeTags]);

  const deck = useMemo(() => {
    if (baseDeck.length === 0) return [];
    const weighted = [];
    baseDeck.forEach(card => {
      const res = results[card.id];
      const weight = res === 'got' ? 1 : res === 'review' ? 3 : 2;
      for (let i = 0; i < weight; i++) weighted.push(card);
    });
    // Shuffle once per deck composition change
    for (let i = weighted.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [weighted[i], weighted[j]] = [weighted[j], weighted[i]];
    }
    return weighted;
  }, [baseDeck, results]);

  const safeIdx = deck.length > 0 ? idx % deck.length : 0;
  const card = deck[safeIdx] || null;

  const gotCount = baseDeck.filter(c => results[c.id] === 'got').length;
  const reviewCount = baseDeck.filter(c => results[c.id] === 'review').length;

  function saveResult(cardId, val) {
    const next = { ...results, [cardId]: val };
    setResults(next);
    window.lsSet(LS_KEY, next);
  }

  function next(offset = 1) {
    setFlipped(false);
    setTimeout(() => setIdx(i => (i + offset + deck.length) % Math.max(deck.length, 1)), 50);
  }

  function markGot() { if (card) { saveResult(card.id, 'got'); next(); } }
  function markReview() { if (card) { saveResult(card.id, 'review'); next(); } }

  function toggleTag(tag) {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    setIdx(0);
    setFlipped(false);
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === ' ') { e.preventDefault(); setFlipped(f => !f); }
      if (e.key === 'ArrowRight') next(1);
      if (e.key === 'ArrowLeft') next(-1);
      if (e.key === '1') markGot();
      if (e.key === '2') markReview();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, deck]);

  // Touch/swipe handlers
  function onTouchStart(e) {
    setSwipeStartX(e.touches[0].clientX);
    setSwipeStartY(e.touches[0].clientY);
  }

  function onTouchEnd(e) {
    if (swipeStartX === null) return;
    const dx = e.changedTouches[0].clientX - swipeStartX;
    const dy = e.changedTouches[0].clientY - swipeStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < 15 && absDy < 15) {
      setFlipped(f => !f);
    } else if (absDx > absDy) {
      if (dx > 60) markGot();
      else if (dx < -60) markReview();
    } else {
      if (absDy > 60) next(dy < 0 ? 1 : -1);
    }
    setSwipeStartX(null);
    setSwipeStartY(null);
  }

  if (baseDeck.length === 0) {
    return (
      <div className="flashcards-wrap">
        <div className="empty-state">No flashcards match this filter.</div>
      </div>
    );
  }

  const allTags = Object.keys(window.TAG_TAXONOMY);

  return (
    <div className="flashcards-wrap">
      {/* Tag filter */}
      <div className="filter-bar" style={{ marginBottom: 24 }}>
        <button className={'tag' + (activeTags.length === 0 ? ' active' : '')}
          onClick={() => { setActiveTags([]); setIdx(0); setFlipped(false); }}>All</button>
        {allTags.map(tag => (
          <button key={tag}
            className={'tag' + (activeTags.includes(tag) ? ' active' : '')}
            onClick={() => toggleTag(tag)}>{window.tagLabel(tag)}</button>
        ))}
      </div>

      {/* Progress header */}
      <div className="fc-controls-top">
        <div className="fc-progress">
          {safeIdx + 1}<span> / {deck.length}</span>
        </div>
        <div className="fc-stats">
          <span className="fc-stat-got">✓ {gotCount} got it</span>
          <span className="fc-stat-review">↺ {reviewCount} to review</span>
        </div>
        <button className="tag" onClick={() => { setResults({}); window.lsSet(LS_KEY, {}); setIdx(0); setFlipped(false); }}
          style={{ marginLeft: 'auto' }}>Reset</button>
      </div>

      {/* Card */}
      {card && (
        <div
          className="fc-card-wrap"
          onClick={() => setFlipped(f => !f)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          role="button"
          tabIndex={0}
          aria-label={flipped ? 'Card back: ' + card.back : 'Card front: ' + card.front + '. Press space to flip.'}
          onKeyDown={e => e.key === 'Enter' && setFlipped(f => !f)}
        >
          <div className={'fc-card' + (flipped ? ' flipped' : '')} ref={cardRef}>
            {/* Front */}
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
            {/* Back */}
            <div className="fc-face fc-face-back">
              <div className="fc-face-label">Definition</div>
              <div className="fc-back-text">{card.back}</div>
              <div className="fc-flip-hint">Space to flip</div>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="fc-actions">
        <button className="fc-btn fc-btn-nav" onClick={() => next(-1)} aria-label="Previous card">← Prev</button>
        <button className="fc-btn fc-btn-review" onClick={markReview} aria-label="Mark review again">↺ Review</button>
        <button className="fc-btn fc-btn-got" onClick={markGot} aria-label="Mark got it">✓ Got it</button>
        <button className="fc-btn fc-btn-nav" onClick={() => next(1)} aria-label="Next card">Next →</button>
      </div>

      {/* Keyboard hints */}
      <div className="fc-shortcuts" aria-label="Keyboard shortcuts">
        <span><kbd>Space</kbd> flip</span>
        <span><kbd>→</kbd> next</span>
        <span><kbd>←</kbd> prev</span>
        <span><kbd>1</kbd> got it</span>
        <span><kbd>2</kbd> review</span>
      </div>

      {/* Swipe hint (mobile) */}
      <div style={{ marginTop:16, textAlign:'center', fontSize:11, color:'var(--ink-light)' }}>
        Tap to flip · Swipe right = got it · Swipe left = review
      </div>
    </div>
  );
}

window.FlashcardsModule = FlashcardsModule;
})();
