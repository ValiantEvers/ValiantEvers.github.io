// MockExamModule.jsx – timed full-exam simulation
(function() {
const { useState, useMemo, useEffect, useRef } = React;

// Available mock-exam papers (drawn from the same exams.json data)
const PAPER_TEMPLATES = [
  {
    id: 'spring-2025-final',
    label: 'May 2025 – Final (GRA 65463)',
    description: 'The most recent past paper. Closest predictor of the May 2026 exam.',
    durationSec: 3 * 60 * 60,  // 3 hours
  },
  {
    id: 'spring-2024-final',
    label: 'May 2024 – Final (GRA 65463 V3)',
    description: 'A second full paper to attempt. Heavy on FX swaps and 2008 reforms.',
    durationSec: 3 * 60 * 60,
  },
  {
    id: 'final-2023',
    label: '2023 – Final',
    description: 'Older format with longer essay questions.',
    durationSec: 3 * 60 * 60,
  },
  {
    id: 'final-2022',
    label: '2022 – Final',
    description: 'Includes Akerlof lemons numerical and bail-in calculation.',
    durationSec: 3 * 60 * 60,
  },
];

// May 2025 (and most recent) scale – also the precedent for May 2026
const GRADING_RECENT = [
  { grade: 'A', min: 75 }, { grade: 'B', min: 65 }, { grade: 'C', min: 55 },
  { grade: 'D', min: 45 }, { grade: 'E', min: 35 }, { grade: 'F', min: 0 },
];

// Spring 2024 final used a stricter scale
const GRADING_SPRING2024 = [
  { grade: 'A', min: 85 }, { grade: 'B', min: 72 }, { grade: 'C', min: 60 },
  { grade: 'D', min: 48 }, { grade: 'E', min: 35 }, { grade: 'F', min: 0 },
];

const GRADING = GRADING_RECENT;  // shown on the setup page as the default reference

function formatHMS(secs) {
  if (secs < 0) secs = 0;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function MockExamModule({ data }) {
  const exams = data.exams || [];

  const [phase, setPhase] = useState(() => window.lsGet('gra6546_mock_phase', 'setup'));   // 'setup' | 'active' | 'review'
  const [paperId, setPaperId] = useState(() => window.lsGet('gra6546_mock_paperId', 'spring-2025-final'));
  const [startedAt, setStartedAt] = useState(() => window.lsGet('gra6546_mock_startedAt', null));
  const [endedAt, setEndedAt] = useState(() => window.lsGet('gra6546_mock_endedAt', null));
  const [answers, setAnswers] = useState(() => window.lsGet('gra6546_mock_answers', {}));
  const [now, setNow] = useState(Date.now());

  // Persist core state
  useEffect(() => { window.lsSet('gra6546_mock_phase', phase); }, [phase]);
  useEffect(() => { window.lsSet('gra6546_mock_paperId', paperId); }, [paperId]);
  useEffect(() => { window.lsSet('gra6546_mock_startedAt', startedAt); }, [startedAt]);
  useEffect(() => { window.lsSet('gra6546_mock_endedAt', endedAt); }, [endedAt]);
  useEffect(() => { window.lsSet('gra6546_mock_answers', answers); }, [answers]);

  // Timer tick
  useEffect(() => {
    if (phase !== 'active') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const paperTemplate = PAPER_TEMPLATES.find(p => p.id === paperId) || PAPER_TEMPLATES[0];

  const questions = useMemo(() => {
    return exams
      .filter(q => q.paperId === paperId)
      .sort((a, b) => {
        const norm = s => String(s).replace(/[^\d]/g, '').padStart(3, '0') + String(s).replace(/[\d]/g, '');
        return norm(a.questionNumber).localeCompare(norm(b.questionNumber));
      });
  }, [exams, paperId]);

  const totalPoints = questions.reduce((s, q) => s + (q.points || 0), 0);

  // Timer
  const elapsed = startedAt ? Math.floor((now - startedAt) / 1000) : 0;
  const remaining = startedAt ? Math.max(0, paperTemplate.durationSec - elapsed) : paperTemplate.durationSec;
  const timeUp = phase === 'active' && remaining === 0;

  // Auto-finish when time up
  useEffect(() => {
    if (timeUp && phase === 'active') {
      setEndedAt(Date.now());
      setPhase('review');
    }
  }, [timeUp, phase]);

  function start() {
    setStartedAt(Date.now());
    setEndedAt(null);
    setAnswers({});
    setPhase('active');
  }

  function finish() {
    if (!confirm('Finish the mock exam now? Model answers will be revealed.')) return;
    setEndedAt(Date.now());
    setPhase('review');
  }

  function resetAll() {
    if (!confirm('Reset the mock-exam state and start over?')) return;
    setPhase('setup');
    setStartedAt(null);
    setEndedAt(null);
    setAnswers({});
  }

  function setAnswer(qid, text) {
    setAnswers(a => ({ ...a, [qid]: text }));
  }

  // ── SETUP ─────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="mock-wrap">
        <div className="mock-setup">
          <div className="detail-type-label">Mock Exam</div>
          <h2 className="detail-term" style={{ marginBottom: 12 }}>3-hour timed simulation</h2>
          <p className="detail-summary" style={{ marginBottom: 32 }}>
            Sit a full past paper under exam conditions: 3-hour timer, no answers visible until you finish or time runs out.
            Pick a paper, click Start, and write your answers in the textareas.
            Your answers persist in your browser if you reload.
          </p>

          <div className="label" style={{ marginBottom: 8 }}>Choose paper</div>
          <div className="mock-paper-list">
            {PAPER_TEMPLATES.map(p => {
              const qCount = exams.filter(q => q.paperId === p.id).length;
              if (qCount === 0) return null;
              return (
                <button
                  key={p.id}
                  className={'mock-paper-card' + (paperId === p.id ? ' selected' : '')}
                  onClick={() => setPaperId(p.id)}
                >
                  <strong>{p.label}</strong>
                  <span style={{ fontSize: 12, color: 'var(--ink-light)' }}>
                    {qCount} questions · {(p.durationSec / 3600).toFixed(0)}-hour timer
                  </span>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-mid)', marginTop: 6 }}>{p.description}</span>
                </button>
              );
            })}
          </div>

          <div className="mock-grading-ref">
            <span className="label">
              Grade thresholds – {paperId === 'spring-2024-final' ? 'Spring 2024 scale (stricter)' : 'May 2025 scale (also expected for May 2026)'}
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {(paperId === 'spring-2024-final' ? GRADING_SPRING2024 : GRADING_RECENT).map(g => (
                <div key={g.grade} className="mock-grade-pill">
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'var(--ink)' }}>{g.grade}</span>
                  <span style={{ marginLeft: 6 }}>≥ {g.min} pts</span>
                </div>
              ))}
            </div>
          </div>

          <button className="fc-btn" style={{ marginTop: 28 }} onClick={start}>
            Start mock exam ({(paperTemplate.durationSec / 3600).toFixed(0)} hours)
          </button>
        </div>
      </div>
    );
  }

  // ── ACTIVE ────────────────────────────────────
  if (phase === 'active') {
    const lowTime = remaining <= 30 * 60;  // last 30 min
    const criticalTime = remaining <= 5 * 60;  // last 5 min
    return (
      <div className="mock-wrap">
        <div className={'mock-timer-bar' + (criticalTime ? ' critical' : (lowTime ? ' low' : ''))}>
          <div>
            <span className="label">Time remaining</span>
            <div className="mock-timer-display">{formatHMS(remaining)}</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <span className="label">Paper · {totalPoints} pts</span>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{paperTemplate.label}</div>
          </div>
          <button className="fc-btn fc-btn-review" style={{ marginLeft: 16, padding: '8px 18px' }} onClick={finish}>
            Finish & reveal answers
          </button>
        </div>

        <div className="mock-questions">
          {questions.map(q => (
            <div key={q.id} className="mock-question">
              <div className="mock-q-header">
                <span className="exam-q-num">{q.questionNumber}</span>
                <span className="exam-q-prompt"><strong style={{ marginRight: 8 }}>Q{q.questionNumber}.</strong>{q.prompt}</span>
                <span className="exam-q-points">{q.points} pts</span>
              </div>
              <textarea
                className="mock-answer-input"
                placeholder="Write your answer here…"
                value={answers[q.id] || ''}
                onChange={e => setAnswer(q.id, e.target.value)}
                rows={6}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── REVIEW ────────────────────────────────────
  return (
    <div className="mock-wrap">
      <div className="mock-review-bar">
        <div>
          <span className="label">Mock exam complete</span>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{paperTemplate.label}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-light)' }}>
            Time used: {formatHMS(endedAt && startedAt ? Math.floor((endedAt - startedAt)/1000) : 0)} of {formatHMS(paperTemplate.durationSec)}
          </div>
        </div>
        <button className="fc-btn fc-btn-nav" style={{ marginLeft: 'auto' }} onClick={resetAll}>
          New mock exam
        </button>
      </div>

      <div className="mock-questions">
        {questions.map(q => (
          <div key={q.id} className="mock-question reviewed">
            <div className="mock-q-header">
              <span className="exam-q-num">{q.questionNumber}</span>
              <span className="exam-q-prompt"><strong style={{ marginRight: 8 }}>Q{q.questionNumber}.</strong>{q.prompt}</span>
              <span className="exam-q-points">{q.points} pts</span>
            </div>

            {answers[q.id] ? (
              <div className="mock-your-answer">
                <span className="label">Your answer</span>
                <pre>{answers[q.id]}</pre>
              </div>
            ) : (
              <div className="mock-your-answer empty">
                <span className="label">Your answer</span>
                <em>(no answer entered)</em>
              </div>
            )}

            <div className="mock-model-answer">
              <span className="label" style={{ color: 'var(--accent)' }}>Model answer</span>
              <div
                className="topic-section-body"
                dangerouslySetInnerHTML={{ __html: window.renderMarkdown ? window.renderMarkdown(q.modelAnswer || '') : window.renderWalkthrough(q.modelAnswer || '') }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.MockExamModule = MockExamModule;
})();
