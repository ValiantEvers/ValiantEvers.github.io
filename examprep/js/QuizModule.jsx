// QuizModule.jsx — multiple-choice + true/false-with-explanation practice
(function() {
const { useState, useMemo, useEffect } = React;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function QuizModule({ data, pendingQuizNav }) {
  const all = data.quiz || [];

  const [mode, setMode] = useState(() => window.lsGet('gra6546_quiz_mode', 'all'));   // 'all' | 'tf' | 'mc'
  const [topic, setTopic] = useState(() => window.lsGet('gra6546_quiz_topic', null));
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [revealed, setRevealed] = useState({});  // qId -> true
  const [picks, setPicks] = useState({});        // qId -> 'true'|'false'|'uncertain' or option index

  useEffect(() => { window.lsSet('gra6546_quiz_mode', mode); }, [mode]);
  useEffect(() => { window.lsSet('gra6546_quiz_topic', topic); }, [topic]);

  // Deep-link from search palette: clear filters so the targeted question is
  // visible, mark it revealed, then scroll it into view.
  useEffect(() => {
    const id = pendingQuizNav?.id;
    if (!id) return;
    setMode('all');
    setTopic(null);
    setRevealed(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      const el = document.querySelector('[data-quiz-id="' + id + '"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  }, [pendingQuizNav]);

  const filtered = useMemo(() => {
    let pool = all;
    if (mode !== 'all') pool = pool.filter(q => q.type === mode);
    if (topic) pool = pool.filter(q => q.topic === topic);
    // re-shuffle on shuffleSeed bump
    return shuffle(pool);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, mode, topic, shuffleSeed]);

  const topicTags = useMemo(() => {
    const set = new Set(all.map(q => q.topic).filter(Boolean));
    return Array.from(set);
  }, [all]);

  const score = useMemo(() => {
    let answered = 0, correct = 0;
    Object.keys(picks).forEach(qid => {
      const q = all.find(x => x.id === qid);
      if (!q) return;
      answered++;
      if (q.type === 'tf' && picks[qid] === q.answer) correct++;
      if (q.type === 'mc' && picks[qid] === q.answerIndex) correct++;
    });
    return { answered, correct };
  }, [picks, all]);

  function reset() {
    setRevealed({});
    setPicks({});
    setShuffleSeed(s => s + 1);
  }

  function pick(q, value) {
    setPicks(p => ({ ...p, [q.id]: value }));
    setRevealed(r => ({ ...r, [q.id]: true }));
  }

  return (
    <div className="quiz-wrap">
      {/* Controls */}
      <div className="quiz-controls">
        <div style={{ display: 'flex', gap: 0, border: '1px solid var(--rule)' }}>
          {[['all', 'Mixed'], ['tf', 'True / False'], ['mc', 'Multiple Choice']].map(([v, l]) => (
            <button key={v}
              onClick={() => { setMode(v); reset(); }}
              className={'quiz-mode-btn' + (mode === v ? ' active' : '')}
            >{l}</button>
          ))}
        </div>

        <div className="filter-bar" style={{ padding: 0, border: 'none', marginBottom: 0, flex: 1 }}>
          <button className={'tag' + (!topic ? ' active' : '')}
            onClick={() => { setTopic(null); reset(); }}>All topics</button>
          {topicTags.map(t => (
            <button key={t}
              onClick={() => { setTopic(topic === t ? null : t); reset(); }}
              className={'tag' + (topic === t ? ' active' : '')}
            >{window.tagLabel(t)}</button>
          ))}
        </div>

        <button onClick={reset} className="fc-btn fc-btn-nav" style={{ padding: '6px 14px', fontSize: 11 }}>
          Reshuffle
        </button>
      </div>

      {/* Score */}
      <div className="quiz-scorebar">
        <span className="num-feature" style={{ fontSize: 28 }}>{score.correct}</span>
        <span style={{ color: 'var(--ink-light)', fontSize: 16 }}>/ {score.answered} correct</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-light)' }}>
          {filtered.length} questions in this set
        </span>
      </div>

      {/* Questions */}
      {filtered.length === 0 ? (
        <div className="empty-state">No questions match this filter.</div>
      ) : filtered.map((q, i) => (
        <QuizCard
          key={q.id}
          q={q}
          index={i + 1}
          revealed={!!revealed[q.id]}
          pick={picks[q.id]}
          onPick={(value) => pick(q, value)}
        />
      ))}
    </div>
  );
}

function QuizCard({ q, index, revealed, pick, onPick }) {
  const isCorrect = q.type === 'tf'
    ? (pick === q.answer)
    : (pick === q.answerIndex);

  return (
    <div data-quiz-id={q.id} className={'quiz-card ' + (revealed ? (isCorrect ? 'correct' : 'incorrect') : '')}>
      <div className="quiz-card-head">
        <span className="quiz-num">{index}</span>
        <span className="quiz-prompt">{q.prompt}</span>
        <span className="quiz-topic">{window.tagLabel(q.topic)}</span>
      </div>

      {q.type === 'tf' ? (
        <div className="quiz-options">
          {['true', 'false', 'uncertain'].map(v => {
            const cls = ['quiz-option-btn'];
            if (revealed) {
              if (v === q.answer) cls.push('correct');
              else if (pick === v) cls.push('incorrect');
            } else if (pick === v) cls.push('selected');
            return (
              <button key={v}
                disabled={revealed}
                onClick={() => onPick(v)}
                className={cls.join(' ')}
              >{v.charAt(0).toUpperCase() + v.slice(1)}</button>
            );
          })}
        </div>
      ) : (
        <div className="quiz-options-mc">
          {q.options.map((opt, idx) => {
            const cls = ['quiz-option-btn', 'mc'];
            if (revealed) {
              if (idx === q.answerIndex) cls.push('correct');
              else if (pick === idx) cls.push('incorrect');
            } else if (pick === idx) cls.push('selected');
            return (
              <button key={idx}
                disabled={revealed}
                onClick={() => onPick(idx)}
                className={cls.join(' ')}
              >
                <span className="quiz-mc-letter">{String.fromCharCode(65 + idx)}</span>
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {revealed && (
        <div className="quiz-explanation">
          <span className="label">Why</span>
          <p>{q.explanation}</p>
        </div>
      )}
    </div>
  );
}

window.QuizModule = QuizModule;
})();
