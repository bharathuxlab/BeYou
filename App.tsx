
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppStage, GoalCategory, TimerSession, CATEGORY_COLORS, CATEGORY_EMOJIS, HistoryItem } from './types';
import { getMotivationalTip, getCelebrationMessage } from './services/geminiService';
import { CircularTimer } from './components/CircularTimer';
import { Button } from './components/Button';
import { LiveView } from './components/LiveView';
import { InterviewSetup } from './components/InterviewSetup';
import { LandingView } from './components/LandingView';
import { ResumeTailorView } from './components/ResumeTailorView';
import { Confetti } from './components/Confetti';
import { audioService } from './services/audioService';
import { saveSession, getHistory } from './services/storageService';
import { Timer, Mic, Briefcase, Home, FileText } from 'lucide-react';

const PRESET_TIMES = [5, 15, 25, 45, 60];

const App: React.FC = () => {
  // --- State ---
  const [currentView, setCurrentView] = useState<'LANDING' | 'TIMER' | 'LIVE' | 'INTERVIEW' | 'RESUME'>('LANDING');
  const [stage, setStage] = useState<AppStage>(AppStage.SETUP);
  
  // Interview specific state
  const [interviewInstruction, setInterviewInstruction] = useState<string | undefined>(undefined);
  const [currentCompanyName, setCurrentCompanyName] = useState<string>('');
  
  const [session, setSession] = useState<TimerSession>({
    durationMinutes: 25,
    category: GoalCategory.FOCUS,
    intention: '',
  });
  
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [smoothProgress, setSmoothProgress] = useState(100); // 0-100 float for smooth animation
  const [motivationLoading, setMotivationLoading] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState('');
  
  // Timer Refs
  const endTimeRef = useRef<number | null>(null);
  const timerIdRef = useRef<number | null>(null);
  const totalDurationRef = useRef<number>(0);

  // --- Handlers ---

  const handleStart = async () => {
    audioService.playStart();
    setStage(AppStage.RUNNING);
    
    const durationMs = session.durationMinutes * 60 * 1000;
    totalDurationRef.current = durationMs;
    setTimeLeft(session.durationMinutes * 60);
    setSmoothProgress(100);
    endTimeRef.current = Date.now() + durationMs;

    // Use a faster interval (30ms) for smoother UI updates (~30-60fps)
    timerIdRef.current = window.setInterval(() => {
      if (!endTimeRef.current) return;
      const now = Date.now();
      const diff = endTimeRef.current - now;
      
      if (diff <= 0) {
        handleComplete();
      } else {
        // Precise math for smooth ring
        const percentage = Math.max 
          (0, (diff / totalDurationRef.current) * 100);
        setSmoothProgress(percentage);
        setTimeLeft(Math.ceil(diff / 1000));
      }
    }, 30);

    if (session.intention) {
      setMotivationLoading(true);
      try {
        const tip = await getMotivationalTip(session.category, session.durationMinutes, session.intention);
        setSession(prev => ({ ...prev, aiMotivation: tip }));
      } catch (e) {
        console.error(e);
      } finally {
        setMotivationLoading(false);
      }
    }
  };

  const handlePause = () => {
    audioService.playPause();
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
    setStage(AppStage.PAUSED);
  };

  const handleResume = () => {
    audioService.playResume();
    // Re-calculate end time based on remaining duration derived from current percentage
    const remainingMs = (smoothProgress / 100) * totalDurationRef.current;
    endTimeRef.current = Date.now() + remainingMs;
    
    setStage(AppStage.RUNNING);
    timerIdRef.current = window.setInterval(() => {
      if (!endTimeRef.current) return;
      const now = Date.now();
      const diff = endTimeRef.current - now;
      
      if (diff <= 0) {
        handleComplete();
      } else {
        const percentage = Math.max(0, (diff / totalDurationRef.current) * 100);
        setSmoothProgress(percentage);
        setTimeLeft(Math.ceil(diff / 1000));
      }
    }, 30);
  };

  const handleStop = () => {
    if (timerIdRef.current) clearInterval(timerIdRef.current);
    setStage(AppStage.SETUP);
    setSession(prev => ({ ...prev, aiMotivation: undefined }));
    setSmoothProgress(100);
  };

  const handleComplete = async () => {
    audioService.playComplete();
    if (timerIdRef.current) clearInterval(timerIdRef.current);
    saveSession(session);
    setStage(AppStage.COMPLETED);
    setTimeLeft(0);
    setSmoothProgress(0);
    const msg = await getCelebrationMessage(session.category);
    setCelebrationMsg(msg);
  };

  const handleStartInterview = (instruction: string, companyName: string) => {
    setInterviewInstruction(instruction);
    setCurrentCompanyName(companyName);
    setCurrentView('LIVE'); 
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleViewChange = (view: typeof currentView) => {
    setCurrentView(view);
    if (view !== 'LIVE') {
      setInterviewInstruction(undefined);
    }
  };

  // --- Views ---

  const renderSetup = () => (
    <div className="max-w-md w-full bg-white/70 backdrop-blur-xl md:rounded-3xl shadow-xl p-8 animate-fade-in-up h-full md:h-[600px] flex flex-col overflow-y-auto no-scrollbar md:border md:border-white/50">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 display-font mb-2">Focus Mode</h1>
        <p className="text-gray-500 text-sm">Design your psychological flow state.</p>
      </div>

      <div className="mb-6">
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Goal Category</label>
        <div className="grid grid-cols-5 gap-3">
          {Object.values(GoalCategory).map((cat) => (
            <button
              key={cat}
              onClick={() => setSession({ ...session, category: cat })}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 ${
                session.category === cat 
                  ? `${CATEGORY_COLORS[cat]} shadow-lg scale-110 ring-2 ring-offset-2 ring-gray-100` 
                  : 'bg-white text-gray-400 hover:bg-gray-50 hover:scale-105 shadow-sm'
              }`}
            >
              <span className="text-2xl mb-1 filter drop-shadow-sm">{CATEGORY_EMOJIS[cat]}</span>
            </button>
          ))}
        </div>
        <div className="text-center mt-3 text-xs font-medium text-gray-500 uppercase tracking-widest">
           {session.category}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Duration (Minutes)</label>
        <div className="flex justify-between items-center bg-white/50 p-1.5 rounded-2xl border border-white/50 shadow-inner">
           {PRESET_TIMES.map(time => (
             <button
              key={time}
              onClick={() => setSession({ ...session, durationMinutes: time })}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                session.durationMinutes === time
                 ? 'bg-white shadow-md text-black transform scale-105'
                 : 'text-gray-400 hover:text-gray-600'
              }`}
             >
               {time}
             </button>
           ))}
        </div>
      </div>

      <div className="mb-8 flex-1">
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Intention</label>
        <input
          type="text"
          maxLength={60}
          placeholder="e.g. Finish the Q3 report..."
          value={session.intention}
          onChange={(e) => setSession({ ...session, intention: e.target.value })}
          className="w-full bg-white/50 border-white/50 border rounded-2xl px-5 py-4 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-black/5 outline-none transition-all shadow-inner"
        />
      </div>

      <Button onClick={handleStart} fullWidth className="shadow-xl">
        Start Session
      </Button>
    </div>
  );

  const renderTimer = () => (
    <div className="flex flex-col items-center justify-center h-full md:h-[600px] w-full max-w-md bg-white/60 md:bg-white/80 rounded-none md:rounded-3xl backdrop-blur-xl animate-fade-in text-center p-6 shadow-2xl border border-white/50">
      
      <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase mb-8 shadow-sm ${CATEGORY_COLORS[session.category]}`}>
        {CATEGORY_EMOJIS[session.category]} {session.category}
      </div>

      <div className="mb-10 scale-90 md:scale-100">
        <CircularTimer 
          percentage={smoothProgress} 
          colorClass={CATEGORY_COLORS[session.category]}
        >
          <div className="text-6xl font-bold display-font text-gray-800 tracking-tighter">
            {formatTime(timeLeft)}
          </div>
          <div className="text-gray-400 text-sm mt-2 font-medium tracking-wide">REMAINING</div>
        </CircularTimer>
      </div>

      <div className="w-full bg-white/60 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white shadow-sm min-h-[100px] flex items-center justify-center relative overflow-hidden group hover:bg-white/80 transition-colors">
        {motivationLoading ? (
           <div className="flex items-center gap-2 text-gray-400 text-sm animate-pulse">
             <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
             <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
             <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
             <span className="uppercase tracking-widest text-[10px]">Neural Sync</span>
           </div>
        ) : (
          <div className="relative z-10">
             <p className="text-gray-800 font-medium italic leading-relaxed text-lg">
               "{session.aiMotivation || "Stay present. One step at a time."}"
             </p>
             {session.aiMotivation && <div className="absolute -top-4 -left-4 text-6xl opacity-5 select-none font-serif">❝</div>}
          </div>
        )}
      </div>

      <div className="flex gap-4 w-full mt-auto mb-20 md:mb-0">
        <Button 
          variant="secondary" 
          onClick={handleStop} 
          className="flex-1 bg-white/50 border-white"
        >
          Abandon
        </Button>
        {stage === AppStage.RUNNING ? (
          <Button onClick={handlePause} className="flex-1 shadow-lg bg-black text-white">Pause</Button>
        ) : (
          <Button onClick={handleResume} className="flex-1 shadow-lg bg-black text-white">Resume</Button>
        )}
      </div>
    </div>
  );

  const renderCompleted = () => (
    <div className="max-w-md w-full bg-white/80 backdrop-blur-xl md:rounded-3xl shadow-2xl p-10 h-full md:h-[600px] flex flex-col text-center animate-scale-in justify-center border border-white/50 relative overflow-hidden">
      <Confetti />
      
      <div className="relative z-10">
        <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl shadow-inner animate-bounce">
            🎉
        </div>
        
        <h2 className="text-4xl font-bold text-gray-900 mb-2 display-font tracking-tight">Flow Complete</h2>
        <p className="text-gray-500 mb-10 text-lg">{session.durationMinutes} minutes well spent.</p>

        <div className="bg-gradient-to-r from-gray-50/50 to-white p-8 rounded-3xl mb-10 border border-white shadow-sm transform transition-all hover:scale-105">
            <p className="text-gray-800 font-medium leading-relaxed text-lg italic">
            "{celebrationMsg || "Great job! Take a breath."}"
            </p>
        </div>

        <div className="mt-auto mb-20 md:mb-0">
            <Button onClick={() => setStage(AppStage.SETUP)} fullWidth className="shadow-xl">
            Start New Session
            </Button>
        </div>
      </div>
    </div>
  );

  // --- Render Layout ---

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center md:p-4 relative overflow-hidden font-sans text-gray-900 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* GLOBAL BACKGROUND MESH - Moves slowly */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-blue-200/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob"></div>
        <div className="absolute top-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-purple-200/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[70vw] h-[70vw] bg-orange-100/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px]"></div>
      </div>

      {/* Main Content Container */}
      <div className="w-full h-full md:h-auto flex justify-center z-10 animate-fade-in relative">
        {currentView === 'LANDING' && <LandingView onEnter={() => setCurrentView('TIMER')} />}
        
        {currentView === 'TIMER' && (
          <>
            {stage === AppStage.SETUP && renderSetup()}
            {(stage === AppStage.RUNNING || stage === AppStage.PAUSED) && renderTimer()}
            {stage === AppStage.COMPLETED && renderCompleted()}
          </>
        )}
        
        {currentView === 'INTERVIEW' && <InterviewSetup onStartInterview={handleStartInterview} />}
        
        {currentView === 'LIVE' && (
          <LiveView 
            systemInstruction={interviewInstruction} 
            companyName={currentCompanyName}
            mode={interviewInstruction ? 'INTERVIEW' : 'COACH'} 
          />
        )}
        
        {currentView === 'RESUME' && <ResumeTailorView />}
      </div>

      {/* Floating Glass Dock Navigation */}
      {currentView !== 'LANDING' && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white/70 backdrop-blur-2xl border border-white/40 shadow-2xl rounded-full p-2 flex gap-4 z-50 transition-all hover:scale-105 hover:bg-white/80 ring-1 ring-black/5">
          <button 
            onClick={() => handleViewChange('LANDING')}
            className="p-3.5 rounded-full text-gray-400 hover:bg-white hover:text-gray-900 transition-all duration-300 hover:shadow-md group relative"
            aria-label="Home"
          >
            <Home size={22} className="group-hover:scale-110 transition-transform" />
          </button>

          <div className="w-px h-8 bg-gray-300/30 my-auto"></div>

          <button 
            onClick={() => handleViewChange('TIMER')}
            className={`p-3.5 rounded-full transition-all duration-300 relative group ${currentView === 'TIMER' ? 'bg-black text-white shadow-lg scale-110' : 'text-gray-400 hover:bg-white hover:text-gray-900 hover:shadow-md'}`}
            aria-label="Timer"
          >
            <Timer size={22} className={currentView !== 'TIMER' ? "group-hover:scale-110 transition-transform" : ""} />
            {currentView === 'TIMER' && <span className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full border-2 border-black"></span>}
          </button>
          
          <button 
            onClick={() => handleViewChange('LIVE')}
            className={`p-3.5 rounded-full transition-all duration-300 relative group ${currentView === 'LIVE' && !interviewInstruction ? 'bg-black text-white shadow-lg scale-110' : 'text-gray-400 hover:bg-white hover:text-gray-900 hover:shadow-md'}`}
            aria-label="Coach"
          >
            <Mic size={22} className={currentView !== 'LIVE' ? "group-hover:scale-110 transition-transform" : ""} />
          </button>

          <button 
            onClick={() => handleViewChange('INTERVIEW')}
            className={`p-3.5 rounded-full transition-all duration-300 relative group ${currentView === 'INTERVIEW' || (currentView === 'LIVE' && interviewInstruction) ? 'bg-black text-white shadow-lg scale-110' : 'text-gray-400 hover:bg-white hover:text-gray-900 hover:shadow-md'}`}
            aria-label="Interview"
          >
            <Briefcase size={22} className={currentView !== 'INTERVIEW' ? "group-hover:scale-110 transition-transform" : ""} />
          </button>
          
          <button 
            onClick={() => handleViewChange('RESUME')}
            className={`p-3.5 rounded-full transition-all duration-300 relative group ${currentView === 'RESUME' ? 'bg-black text-white shadow-lg scale-110' : 'text-gray-400 hover:bg-white hover:text-gray-900 hover:shadow-md'}`}
            aria-label="Resume"
          >
            <FileText size={22} className={currentView !== 'RESUME' ? "group-hover:scale-110 transition-transform" : ""} />
          </button>
        </div>
      )}

    </div>
  );
};

export default App;
