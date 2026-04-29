// CalculationsModule.jsx — exam-grade numerical drills grouped by calculation type
(function() {
const { useState, useMemo, useEffect } = React;

const CATEGORIES = [
  { id: 'impairment-ifrs9',   label: 'Impairment / IFRS 9',           short: 'Impairment' },
  { id: 'rwa',                label: 'Risk-Weighted Assets (REA)',    short: 'RWA' },
  { id: 'capital-ratios',     label: 'Capital Ratios — CET1 / T1 / Total', short: 'Capital Ratios' },
  { id: 'bailin',             label: 'Bail-in Waterfall',             short: 'Bail-in' },
  { id: 'fx-swap',            label: 'FX Swap & Covered Interest Parity', short: 'FX Swap' },
  { id: 'credit-risk-models', label: 'Credit-Risk Modelling',         short: 'Credit-Risk Models' },
  { id: 'diamond-dybvig',     label: 'Diamond-Dybvig Deposit Contract', short: 'Diamond-Dybvig' },
];

const DIFFICULTY_ORDER = { easy: 1, medium: 2, hard: 3 };

function CalculationsModule({ data }) {
  const all = data.calculations || [];

  const [activeCategory, setActiveCategory] = useState(() => window.lsGet('gra6546_calc_category', null));
  const [difficulty,     setDifficulty]     = useState(() => window.lsGet('gra6546_calc_difficulty', null));
  const [revealedIds,    setRevealedIds]    = useState({}); // exerciseId -> bool

  useEffect(() => { window.lsSet('gra6546_calc_category',  activeCategory); }, [activeCategory]);
  useEffect(() => { window.lsSet('gra6546_calc_difficulty', difficulty);    }, [difficulty]);

  const filtered = useMemo(() => {
    let pool = all;
    if (activeCategory) pool = pool.filter(e => e.category === activeCategory);
    if (difficulty)     pool = pool.filter(e => e.difficulty === difficulty);
    return pool.slice().sort((a, b) => {
      const da = DIFFICULTY_ORDER[a.difficulty] || 99;
      const db = DIFFICULTY_ORDER[b.difficulty] || 99;
      if (da !== db) return da - db;
      return (a.id || '').localeCompare(b.id || '');
    });
  }, [all, activeCategory, difficulty]);

  const counts = useMemo(() => {
    const c = {};
    all.forEach(e => { c[e.category] = (c[e.category] || 0) + 1; });
    return c;
  }, [all]);

  const totalMinutes = useMemo(
    () => filtered.reduce((s, e) => s + (e.estimatedMinutes || 0), 0),
    [filtered]
  );

  function toggleReveal(id) {
    setRevealedIds(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function revealAll() {
    const next = {};
    filtered.forEach(e => { next[e.id] = true; });
    setRevealedIds(next);
  }

  function hideAll() {
    setRevealedIds({});
  }

  if (!all.length) {
    return <div className="empty-state">No calculation exercises loaded.</div>;
  }

  return (
    <div className="calc-wrap">
      {/* Category filter */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <button
          className={'tag' + (!activeCategory ? ' active' : '')}
          onClick={() => setActiveCategory(null)}
        >All categories ({all.length})</button>
        {CATEGORIES.map(cat => {
          const n = counts[cat.id] || 0;
          if (n === 0) return null;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              className={'tag' + (activeCategory === cat.id ? ' active' : '')}
            >
              {cat.short} ({n})
            </button>
          );
        })}
      </div>

      {/* Difficulty filter + meta */}
      <div className="calc-controls">
        <div style={{ display:'flex', gap:0, border:'1px solid var(--rule)' }}>
          {[['', 'All levels'], ['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']].map(([v, l]) => (
            <button
              key={v || 'all'}
              onClick={() => setDifficulty(v || null)}
              className={'calc-diff-btn' + ((difficulty || '') === v ? ' active' : '')}
            >{l}</button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <button onClick={revealAll} className="calc-bulk-btn">Show all answers</button>
        <button onClick={hideAll}   className="calc-bulk-btn">Hide all</button>
      </div>

      {/* Summary bar */}
      <div className="calc-scorebar">
        <span className="num-feature" style={{ fontSize: 28 }}>{filtered.length}</span>
        <span style={{ color: 'var(--ink-light)', fontSize: 16 }}>
          {filtered.length === 1 ? 'exercise' : 'exercises'} in view
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-light)' }}>
          ≈ {totalMinutes} min total · click any card to reveal the worked solution
        </span>
      </div>

      {/* Exercises */}
      {filtered.length === 0 ? (
        <div className="empty-state">No exercises match this filter.</div>
      ) : (
        filtered.map((e, i) => (
          <CalcCard
            key={e.id}
            exercise={e}
            index={i + 1}
            revealed={!!revealedIds[e.id]}
            onToggle={() => toggleReveal(e.id)}
          />
        ))
      )}
    </div>
  );
}

function CalcCard({ exercise, index, revealed, onToggle }) {
  const cat = CATEGORIES.find(c => c.id === exercise.category);
  const md  = window.renderMarkdown;

  return (
    <article className={'calc-card' + (revealed ? ' revealed' : '')} data-calc-id={exercise.id}>
      {/* Header */}
      <header className="calc-card-head">
        <span className="calc-num">{String(index).padStart(2, '0')}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="calc-title">{exercise.title}</h3>
          <div className="calc-meta">
            <span className="calc-cat-pill">{cat ? cat.short : exercise.category}</span>
            <span className={'calc-diff-pill ' + (exercise.difficulty || 'medium')}>
              {exercise.difficulty || 'medium'}
            </span>
            <span className="calc-meta-sep">·</span>
            <span className="calc-meta-time">≈ {exercise.estimatedMinutes || '—'} min</span>
            <span className="calc-meta-sep">·</span>
            <span className="calc-meta-source">{exercise.source}</span>
          </div>
        </div>
      </header>

      {/* Problem */}
      <section className="calc-section">
        <span className="label">Problem</span>
        <div
          className="calc-problem topic-section-body"
          dangerouslySetInnerHTML={{ __html: md(exercise.problem || '') }}
        />
      </section>

      {/* Inputs (optional structured table) */}
      {exercise.given && exercise.given.length > 0 && (
        <section className="calc-section">
          <span className="label">Inputs</span>
          <table className="calc-given-table">
            <tbody>
              {exercise.given.map((g, i) => (
                <tr key={i}>
                  <td className="calc-given-label">{g.label}</td>
                  <td className="calc-given-value">{g.value}</td>
                  {g.note && <td className="calc-given-note">{g.note}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Key formulas */}
      {exercise.keyFormulas && exercise.keyFormulas.length > 0 && (
        <section className="calc-section">
          <span className="label">Key formulas</span>
          <ul className="calc-formula-list">
            {exercise.keyFormulas.map((f, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: md(f) }} />
            ))}
          </ul>
        </section>
      )}

      {/* Reveal button */}
      <button
        className={'calc-reveal-btn' + (revealed ? ' open' : '')}
        onClick={onToggle}
        aria-expanded={revealed}
      >
        {revealed ? 'Hide answer' : 'Show answer'}
        <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
          <path d="M2 4l3.5 3.5L9 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="square"/>
        </svg>
      </button>

      {/* Worked solution (revealed) */}
      <div className={'calc-solution ' + (revealed ? 'open' : 'closed')} aria-hidden={!revealed}>
        {(exercise.parts || []).map((part, i) => (
          <div key={part.id || i} className="calc-part">
            <div className="calc-part-head">
              <span className="calc-part-prompt"
                dangerouslySetInnerHTML={{ __html: md(part.prompt || '') }} />
            </div>
            {part.working && part.working.length > 0 && (
              <ol className="calc-working">
                {part.working.map((step, j) => (
                  <li key={j} dangerouslySetInnerHTML={{ __html: md(step) }} />
                ))}
              </ol>
            )}
            <div className="calc-final-answer">
              <span className="label">Answer</span>
              <span
                className="calc-final-value"
                dangerouslySetInnerHTML={{ __html: md(part.answer || '') }}
              />
              {part.unit && <span className="calc-final-unit">{part.unit}</span>}
            </div>
          </div>
        ))}

        {exercise.intuition && (
          <div className="calc-intuition">
            <span className="label">Why this answer makes sense</span>
            <div
              className="topic-section-body"
              dangerouslySetInnerHTML={{ __html: md(exercise.intuition) }}
            />
          </div>
        )}
      </div>
    </article>
  );
}

window.CalculationsModule = CalculationsModule;
})();
