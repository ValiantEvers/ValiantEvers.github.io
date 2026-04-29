// App.jsx — main shell
(function() {
const { useState, useEffect } = React;

const MODULES = [
  { id: 'topics',     label: 'Topics',     subtitle: 'Twelve Exam-Ready Summaries' },
  { id: 'glossary',   label: 'Glossary',   subtitle: 'Terms & Model Walkthroughs' },
  { id: 'timeline',   label: 'Timeline',   subtitle: 'Crises in Chronological Order' },
  { id: 'mindmap',    label: 'Mind-map',   subtitle: 'Concepts as a Connected Graph' },
  { id: 'flashcards', label: 'Flashcards', subtitle: 'Active Recall' },
  { id: 'quiz',       label: 'Quiz',       subtitle: 'Multiple-Choice & True/False' },
  { id: 'exams',      label: 'Past Exams', subtitle: 'Real Papers with Model Answers' },
  { id: 'mock',       label: 'Mock Exam',  subtitle: 'Timed 3-Hour Simulation' },
];

const NUMS = {
  topics: '01', glossary: '02', timeline: '03', mindmap: '04',
  flashcards: '05', quiz: '06', exams: '07', mock: '08',
};

function Nav({ module, setModule, onSearch }) {
  return (
    <header className="nav" role="banner">
      <div className="nav-inner">
        <div className="nav-masthead">
          <span className="nav-course">GRA6546</span>
          <span className="label" style={{ color: 'var(--ink-light)', fontSize: 9 }}>
            Exam Prep · 13 May 2026
          </span>
        </div>
        <div className="nav-rule" aria-hidden="true"></div>
        <nav className="nav-links" aria-label="Module navigation">
          {MODULES.map(m => (
            <button
              key={m.id}
              className={'nav-link' + (module === m.id ? ' active' : '')}
              onClick={() => setModule(m.id)}
              aria-current={module === m.id ? 'page' : undefined}
            >{m.label}</button>
          ))}
        </nav>
        <button className="nav-search-btn" onClick={onSearch} aria-label="Open global search (Cmd+K)">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M9 9L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square"/>
          </svg>
          Search
          <span className="nav-search-kbd">⌘K</span>
        </button>
      </div>
    </header>
  );
}

function ModuleHeader({ module }) {
  const m = MODULES.find(x => x.id === module);
  if (!m) return null;
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--rule)' }}>
      <div className="module-header">
        <div className="module-header-left">
          <div className="label" style={{ marginBottom: 6 }}>
            Section {NUMS[module]} — Financial Institutions &amp; Crises
          </div>
          <h1 className="module-title">{m.label}</h1>
          <p className="module-subtitle">{m.subtitle}</p>
        </div>
      </div>
      <span className="module-issue-num" aria-hidden="true">{NUMS[module]}</span>
    </div>
  );
}

function App() {
  const [module, setModule] = useState(() => {
    const saved = window.lsGet('gra6546_module', 'topics');
    return MODULES.find(m => m.id === saved) ? saved : 'topics';
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [data, setData] = useState({
    glossary: [], models: [], timeline: [], flashcards: [], exams: [], topics: [], quiz: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Cross-module navigation requests. Stored as {id, key} so re-navigating to the
  // same id (e.g. searching the same term twice) still bumps the object reference
  // and re-fires the consuming module's useEffect.
  const [pendingExamNav,     setPendingExamNav]     = useState({ id: null, key: 0 });
  const [pendingGlossaryNav, setPendingGlossaryNav] = useState({ id: null, key: 0 });
  const [pendingTopicNav,    setPendingTopicNav]    = useState({ id: null, key: 0 });

  function bumpNav(setter, id) {
    setter(prev => ({ id, key: prev.key + 1 }));
  }

  // Persist active module
  useEffect(() => {
    window.lsSet('gra6546_module', module);
  }, [module]);

  // Load all JSON data
  useEffect(() => {
    const files = ['glossary', 'models', 'timeline', 'flashcards', 'exams', 'topics', 'quiz'];
    const recallP = fetch('data/recall_questions.json')
      .then(r => r.ok ? r.json() : {})
      .catch(() => ({}));
    Promise.all([
      ...files.map(f =>
        fetch('data/' + f + '.json')
          .then(r => { if (!r.ok) throw new Error(f + ' not found'); return r.json(); })
      ),
      recallP,
    ]).then(([glossary, models, timeline, flashcards, exams, topics, quiz, recall]) => {
      const withRecall = arr => arr.map(e => ({
        ...e,
        recall_questions: recall[e.id] || e.recall_questions || [],
      }));
      setData({
        glossary: withRecall(glossary),
        models: withRecall(models),
        timeline,
        flashcards,
        exams,
        topics: withRecall(topics),
        quiz,
      });
      setLoading(false);
    }).catch(err => {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Used by Search palette: navigate to a module, optionally selecting a specific entry.
  // Glossary, topics, and exams modules support deep-linking via their pending* nav prop;
  // other modules just switch without selection.
  function handleNavigate(mod, id) {
    setModule(mod);
    if (!id) return;
    if (mod === 'glossary')    bumpNav(setPendingGlossaryNav, id);
    else if (mod === 'topics') bumpNav(setPendingTopicNav,    id);
    else if (mod === 'exams')  bumpNav(setPendingExamNav,     id);
  }

  function navigateToExam(examQuestionId) {
    setModule('exams');
    bumpNav(setPendingExamNav, examQuestionId);
    // Scroll into view + auto-expand handled inside ExamsModule via prop
    setTimeout(() => {
      const el = document.querySelector('[data-q-id="' + examQuestionId + '"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  }

  // Generic cross-module navigator used by the Mind-map "Read more" button
  function navigateFromMindmap(targetModule, entryId) {
    if (targetModule === 'glossary') {
      bumpNav(setPendingGlossaryNav, entryId);
      setModule('glossary');
    } else if (targetModule === 'topics') {
      bumpNav(setPendingTopicNav, entryId);
      setModule('topics');
    }
  }

  const TopicsModule     = window.TopicsModule;
  const GlossaryModule   = window.GlossaryModule;
  const TimelineModule   = window.TimelineModule;
  const MindmapModule    = window.MindmapModule;
  const FlashcardsModule = window.FlashcardsModule;
  const QuizModule       = window.QuizModule;
  const ExamsModule      = window.ExamsModule;
  const MockExamModule   = window.MockExamModule;
  const SearchPalette    = window.SearchPalette;

  return (
    <>
      <Nav module={module} setModule={setModule} onSearch={() => setSearchOpen(true)} />

      <ModuleHeader module={module} />

      <main id="main-content" tabIndex={-1}>
        {loading && <div className="loading">Loading content…</div>}
        {error && (
          <div className="loading" style={{ color: 'var(--accent)', flexDirection:'column', gap:8 }}>
            <strong>Could not load data files.</strong>
            <span style={{ fontSize:13, color:'var(--ink-light)' }}>
              Make sure the app is served over HTTP (not opened as a local file).
            </span>
            <code style={{ fontSize: 11, marginTop: 12, color: 'var(--ink-light)' }}>{error}</code>
          </div>
        )}
        {!loading && !error && (
          <>
            {module === 'topics'     && <TopicsModule     data={data} navigateToExam={navigateToExam} pendingTopicNav={pendingTopicNav} />}
            {module === 'glossary'   && <GlossaryModule   data={data} pendingGlossaryNav={pendingGlossaryNav} />}
            {module === 'timeline'   && <TimelineModule   data={data} />}
            {module === 'mindmap'    && <MindmapModule    data={data} onNavigate={navigateFromMindmap} />}
            {module === 'flashcards' && <FlashcardsModule data={data} />}
            {module === 'quiz'       && <QuizModule       data={data} />}
            {module === 'exams'      && <ExamsModule      data={data} pendingExamNav={pendingExamNav} />}
            {module === 'mock'       && <MockExamModule   data={data} />}
          </>
        )}
      </main>

      {searchOpen && (
        <SearchPalette
          data={data}
          onClose={() => setSearchOpen(false)}
          onNavigate={handleNavigate}
        />
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
