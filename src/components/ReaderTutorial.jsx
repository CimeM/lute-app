import { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronRight, GraduationCap, Pause, Play, Settings, Store, Trophy, X } from 'lucide-react';

const GREETINGS = [
  { text: 'Hello', language: 'English' },
  { text: 'Hola', language: 'Spanish' },
  { text: 'Bonjour', language: 'French' },
  { text: 'Ciao', language: 'Italian' },
  { text: 'Hallo', language: 'German' },
  { text: 'Zdravo', language: 'Serbian' },
  { text: 'Živjo', language: 'Slovenian' },
  { text: 'Welcome to LUTE', language: 'Learn Using Text' },
];

const LEVELS = [1, 2, 3, 4, 99];
const PROGRESS_LEVELS = [
  { label: '1 · New', color: 'bg-amber-400', width: '20%' },
  { label: '2 · Learning', color: 'bg-orange-500', width: '20%' },
  { label: '3 · Familiar', color: 'bg-green-500', width: '20%' },
  { label: '4 · Known', color: 'bg-zinc-500', width: '10%' },
  { label: 'Ign · Ignore', color: 'bg-zinc-400', width: '10%' },
  { label: 'Unmarked', color: 'bg-zinc-200 dark:bg-zinc-700' },
];

const STEP_COPY = {
  welcome: {
    title: 'Welcome!',
    description: 'Learn foreign languages naturally by reading authentic texts and tracking your vocabulary.',
  },
  word: {
    title: 'Tap a word',
    description: 'Tap the highlighted Italian word to see its translation and learning levels.',
  },
  level: {
    title: 'Choose a level',
    description: 'The word and its English translation appear here. Choose a level to save it to your vocabulary.',
  },
  play: {
    title: 'Hear the pronunciation',
    description: 'Tap Play to hear how the selected word sounds.',
  },
  progress: {
    title: 'See your vocabulary progress',
    description: 'The bar under each book in Library shows the words you’ve marked by level. Each color is a level; gray is unmarked. It tracks word levels, not pages read.',
  },
  store: {
    title: 'Explore the Store',
    description: 'Tap Store in the bottom navigation to find new free books, free learning resources, and challenges.',
  },
};

export function ReaderTutorial({ onClose, themeStyles }) {
  const [step, setStep] = useState('welcome');
  const [greetingIndex, setGreetingIndex] = useState(0);
  const [fadeState, setFadeState] = useState('in');
  const [showNextButton, setShowNextButton] = useState(false);

  const [selectedLevel, setSelectedLevel] = useState(null);
  const [hasPlayedSample, setHasPlayedSample] = useState(false);
  const [sampleSpeechStatus, setSampleSpeechStatus] = useState('idle');
  const [isStoreTabSelected, setIsStoreTabSelected] = useState(false);
  const sampleUtteranceRef = useRef(null);

  // Delay the appearance of the Next button slightly after the welcome animation starts
  useEffect(() => {
    if (step !== 'welcome') return;
    setShowNextButton(false);
    const timer = setTimeout(() => {
      setShowNextButton(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, [step]);

  // Cycle through language greetings automatically
  useEffect(() => {
    if (step !== 'welcome') return;

    if (greetingIndex === GREETINGS.length - 1) {
      return;
    }

    const fadeOutTimer = setTimeout(() => setFadeState('out'), 2000);
    const nextTimer = setTimeout(() => {
      setGreetingIndex((prev) => prev + 1);
      setFadeState('in');
    }, 2400);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(nextTimer);
    };
  }, [greetingIndex, step]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => () => {
    sampleUtteranceRef.current = null;
    window.speechSynthesis?.cancel();
  }, []);

  const copy = STEP_COPY[step];

  const playSampleWord = () => {
    if (typeof window.speechSynthesis?.speak !== 'function'
      || typeof window.SpeechSynthesisUtterance !== 'function') {
      setHasPlayedSample(true);
      return;
    }

    if (sampleSpeechStatus === 'speaking') {
      window.speechSynthesis.pause();
      setSampleSpeechStatus('paused');
      return;
    }
    if (sampleSpeechStatus === 'paused') {
      window.speechSynthesis.resume();
      setSampleSpeechStatus('speaking');
      return;
    }

    const utterance = new window.SpeechSynthesisUtterance('casa');
    utterance.lang = 'it-IT';
    window.speechSynthesis.cancel();
    sampleUtteranceRef.current = utterance;
    const finishSpeech = () => {
      if (sampleUtteranceRef.current !== utterance) return;
      sampleUtteranceRef.current = null;
      setSampleSpeechStatus('idle');
    };
    utterance.onend = finishSpeech;
    utterance.onerror = finishSpeech;
    setSampleSpeechStatus('speaking');
    setHasPlayedSample(true);
    window.speechSynthesis.speak(utterance);
  };

  const currentGreeting = GREETINGS[greetingIndex];
  const isFinalGreeting = greetingIndex === GREETINGS.length - 1;

  const getStepNumber = () => {
    switch (step) {
      case 'welcome': return '1';
      case 'word': return '2';
      case 'level': return '3';
      case 'play': return '4';
      case 'progress': return '5';
      case 'store': return '6';
      default: return '1';
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="reader-tutorial-title"
        className={`reader-tutorial-enter flex h-dvh min-h-dvh w-full flex-col overflow-hidden ${themeStyles.bodyBg}`}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700 sm:px-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-amber-500" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Reader tutorial</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close tutorial"
            className="rounded p-1 text-zinc-500 transition hover:bg-zinc-800/10 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-4 sm:px-6 sm:py-6">
            <div className="flex h-36 shrink-0 flex-col justify-center">
              <div className="mb-1 flex items-center justify-between gap-3">
                <h2 id="reader-tutorial-title" className="text-lg font-semibold">
                  {step === 'welcome' ? 'Welcome!' : copy.title}
                </h2>
                <span className="shrink-0 text-xs tabular-nums text-zinc-500" aria-live="polite">
                  {getStepNumber()} of 6
                </span>
              </div>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                {copy.description}
              </p>
            </div>

            <div className="flex h-[20rem] shrink-0 items-center justify-center">
              <div className="w-full max-w-md overflow-hidden rounded-lg border border-zinc-300/80 dark:border-zinc-700">
                {step === 'welcome' ? (
                  <div className={`relative overflow-hidden flex flex-col items-center justify-center h-[20rem] p-6 text-center select-none ${themeStyles.bodyBg}`}>
                    {/* Colorful Blurred Background Circles */}
                    <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-amber-400/25 dark:bg-amber-500/15 blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-12 -right-12 w-56 h-56 rounded-full bg-indigo-500/25 dark:bg-indigo-600/15 blur-3xl pointer-events-none" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-emerald-400/20 dark:bg-emerald-500/10 blur-3xl pointer-events-none" />

                    {/* Content Container */}
                    <div className="relative z-10 flex flex-col items-center justify-center">
                      <h1
                        className={`font-bold tracking-tight text-4xl sm:text-5xl md:text-6xl transition-all duration-400 ease-in-out transform ${
                          fadeState === 'in'
                            ? 'opacity-100 translate-y-0 scale-100'
                            : 'opacity-0 -translate-y-2 scale-95'
                        } ${isFinalGreeting ? 'text-amber-500 dark:text-amber-400' : 'text-zinc-900 dark:text-zinc-100'}`}
                      >
                        {currentGreeting.text}
                      </h1>
                      <p
                        className={`mt-4 text-xs sm:text-sm font-medium tracking-widest uppercase transition-opacity duration-400 ${
                          fadeState === 'in' ? 'opacity-70' : 'opacity-0'
                        } ${isFinalGreeting ? 'text-amber-600 dark:text-amber-300 opacity-90' : 'text-zinc-500 dark:text-zinc-400'}`}
                      >
                        {currentGreeting.language}
                      </p>
                    </div>
                  </div>
                ) : step === 'progress' ? (
                  <div className="bg-white p-4 dark:bg-zinc-900">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-semibold">A day by the river</span>
                      <span className="shrink-0 text-[11px] text-zinc-500">10 words · Page 1</span>
                    </div>
                    <div
                      className="mt-2 flex h-2 w-full overflow-hidden rounded-sm bg-zinc-200 dark:bg-zinc-700"
                      role="img"
                      aria-label="8 marked and 2 unmarked word occurrences"
                      title="8 marked · 2 unmarked"
                    >
                      {PROGRESS_LEVELS.slice(0, 5).map((level) => (
                        <span key={level.label} className={level.color} style={{ width: level.width }} />
                      ))}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-zinc-600 dark:text-zinc-300">
                      {PROGRESS_LEVELS.map((level) => (
                        <div key={level.label} className="flex min-w-0 items-center gap-2">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${level.color}`} aria-hidden="true" />
                          <span className="truncate">{level.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : step === 'store' ? (
                  <>
                    <div className="bg-white px-4 py-3 dark:bg-zinc-900">
                      <div className="flex items-center gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-700">
                        <Store className="h-4 w-4 text-amber-500" aria-hidden="true" />
                        <h3 className="text-sm font-semibold">Book Store</h3>
                      </div>
                      <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
                        <div className="flex items-center gap-3 py-3">
                          <BookOpen className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                          <div>
                            <p className="text-sm font-medium">New free books</p>
                            <p className="text-xs text-zinc-500">Discover stories to add to your library.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 py-3">
                          <GraduationCap className="h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
                          <div>
                            <p className="text-sm font-medium">Free learning resources</p>
                            <p className="text-xs text-zinc-500">Find materials for your language learning.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 py-3">
                          <Trophy className="h-4 w-4 shrink-0 text-orange-500" aria-hidden="true" />
                          <div>
                            <p className="text-sm font-medium">Challenges</p>
                            <p className="text-xs text-zinc-500">Try a short reading goal.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <nav aria-label="Example app navigation" className="grid grid-cols-3 border-t border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                      <div className="flex flex-col items-center gap-1 py-2 text-zinc-500">
                        <BookOpen className="h-4 w-4" aria-hidden="true" />
                        <span className="text-[10px]">Library</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsStoreTabSelected(true)}
                        aria-label="Select Store tab"
                        aria-pressed={isStoreTabSelected}
                        className={`relative flex flex-col items-center gap-1 py-2 ${isStoreTabSelected ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500 reader-tutorial-target'}`}
                      >
                        <Store className="h-4 w-4" aria-hidden="true" />
                        <span className="text-[10px]">Store</span>
                      </button>
                      <div className="flex flex-col items-center gap-1 py-2 text-zinc-500">
                        <Settings className="h-4 w-4" aria-hidden="true" />
                        <span className="text-[10px]">Settings</span>
                      </div>
                    </nav>
                  </>
                ) : (
                  <>
                    <div className="flex h-9 items-center justify-between border-b border-zinc-300/80 px-3 text-[11px] text-zinc-500 dark:border-zinc-700">
                      <span className="truncate">Un giorno sul fiume</span>
                      <span className="font-mono">1/8</span>
                    </div>
                    <div className="font-serif-reader min-h-40 bg-[#fffdf6] p-4 text-[15px] leading-8 text-zinc-800 dark:bg-[#27251f] dark:text-zinc-100">
                      <p>
                        Ogni mattina, Elena cammina lungo il fiume. La sua{' '}
                        <button
                          type="button"
                          onClick={() => step === 'word' && setStep('level')}
                          className={`rounded-sm px-0.5 font-semibold underline decoration-amber-500 decoration-2 underline-offset-4 ${selectedLevel ? `word-status-${selectedLevel}` : ''} ${step === 'word' ? 'reader-tutorial-target' : ''}`}
                          aria-label="Tap the Italian word casa"
                        >
                          casa
                        </button>{' '}
                        è vicino all’acqua.
                      </p>
                      <p className="mt-2 text-zinc-500 dark:text-zinc-400">Oggi ascolta gli uccelli e legge un libro.</p>
                    </div>

                    {step !== 'word' && (
                      <div className="border-t border-zinc-300/80 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-serif-reader text-base font-bold capitalize">casa</span>
                          {(step === 'level' || step === 'play') && (
                            <button
                              type="button"
                              onClick={playSampleWord}
                              aria-label={sampleSpeechStatus === 'speaking' ? 'Pause pronunciation of casa' : 'Play pronunciation of casa'}
                              className={`relative rounded p-1.5 text-zinc-600 transition hover:bg-zinc-800/10 dark:text-zinc-300 dark:hover:bg-zinc-100/10 ${step === 'play' && !hasPlayedSample ? 'reader-tutorial-target' : ''}`}
                            >
                              {sampleSpeechStatus === 'speaking'
                                ? <Pause className="h-4 w-4" aria-hidden="true" />
                                : <Play className="h-4 w-4" aria-hidden="true" />}
                            </button>
                          )}
                        </div>
                        <div className="mb-3 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-2 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                          house
                        </div>
                        <p id="tutorial-level-title" className="mb-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                          Level of familiarity
                        </p>
                        <div role="group" aria-labelledby="tutorial-level-title" className="grid grid-cols-5 gap-1.5">
                          {LEVELS.map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => {
                                if (step !== 'level') return;
                                setSelectedLevel(level);
                                setStep('play');
                              }}
                              aria-label={level === 99 ? 'Choose ignore level' : `Choose level ${level}`}
                              aria-pressed={selectedLevel === level}
                              className={`relative rounded border py-1.5 text-xs font-bold transition word-status-${level} ${selectedLevel === level ? 'ring-1 ring-amber-500' : ''} ${step === 'level' && level === 2 ? 'reader-tutorial-target' : ''}`}
                            >
                              {level === 99 ? 'Ign' : level}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 dark:border-zinc-700 sm:px-6">
          {step === 'store' && isStoreTabSelected ? (
            <span className="text-xs text-zinc-500">Last step</span>
          ) : (
            <button type="button" onClick={onClose} className="text-sm text-zinc-500 underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100">
              Skip tutorial
            </button>
          )}

          {step === 'welcome' && (
            <button
              type="button"
              onClick={() => setStep('word')}
              aria-label="Next step"
              title="Next step"
              className={`flex items-center gap-1 rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-zinc-950 transition-all duration-500 hover:bg-amber-400 active:scale-[0.98] ${
                showNextButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
              }`}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
              Next Step
            </button>
          )}

          {step === 'progress' && (
            <button
              type="button"
              onClick={() => {
                setIsStoreTabSelected(false);
                setStep('store');
              }}
              aria-label="Next tutorial slide"
              title="Next slide"
              className="flex items-center gap-1 rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 active:scale-[0.98]"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
              Next
            </button>
          )}

          {step === 'play' && hasPlayedSample && (
            <button
              type="button"
              onClick={() => setStep('progress')}
              aria-label="Next tutorial slide"
              title="Next slide"
              className="reader-tutorial-target relative flex items-center gap-1 rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 active:scale-[0.98]"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
              Next
            </button>
          )}

          {step === 'store' && isStoreTabSelected && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 active:scale-[0.98]"
            >
              Finish
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}