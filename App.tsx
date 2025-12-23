
import React, { useState, useEffect, useCallback } from 'react';
import { GeminiService } from './services/geminiService';
import { GenerationMode, VideoJob } from './types';
import Sidebar from './components/Sidebar';
import Creator from './components/Creator';
import Gallery from './components/Gallery';

const App: React.FC = () => {
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const checkKey = useCallback(async () => {
    // @ts-ignore
    const hasSelected = await window.aistudio.hasSelectedApiKey();
    setHasKey(hasSelected);
    setIsAuthChecked(true);
  }, []);

  useEffect(() => {
    checkKey();
  }, [checkKey]);

  const handleOpenKeySelector = async () => {
    // @ts-ignore
    await window.aistudio.openSelectKey();
    setHasKey(true); // Assume success per instructions
  };

  const addJob = (job: VideoJob) => {
    setJobs(prev => [job, ...prev]);
    setActiveJobId(job.id);
  };

  const updateJob = (id: string, updates: Partial<VideoJob>) => {
    setJobs(prev => prev.map(job => job.id === id ? { ...job, ...updates } : job));
  };

  if (!isAuthChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-pulse text-blue-400 font-semibold">Initializing VividMotion Studio...</div>
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 p-6 text-center">
        <div className="max-w-md glass p-8 rounded-3xl shadow-2xl">
          <h1 className="text-4xl font-bold mb-4 gradient-text">VividMotion</h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Welcome to the future of AI cinematography. To begin generating high-quality videos with Veo 3.1, please select a paid Google Cloud project API key.
          </p>
          <button
            onClick={handleOpenKeySelector}
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20"
          >
            Connect Studio Key
          </button>
          <div className="mt-6 text-sm text-gray-500">
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-blue-400">
              Billing Documentation
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950 text-gray-100">
      <Sidebar 
        jobs={jobs} 
        activeJobId={activeJobId} 
        onSelectJob={setActiveJobId} 
        onNewJob={() => setActiveJobId(null)}
      />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 glass sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600"></div>
            <h1 className="font-bold text-lg tracking-tight">VividMotion <span className="text-gray-500 font-normal">Studio</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">Veo 3.1 Active</span>
            <button 
              onClick={handleOpenKeySelector}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Change Key
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {activeJobId ? (
            <Gallery job={jobs.find(j => j.id === activeJobId)} />
          ) : (
            <Creator onJobCreated={addJob} onJobUpdated={updateJob} />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
