import { useState, useEffect, useRef } from 'react';
import { Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<{ message: string; data?: any }[]>([]);
  const [results, setResults] = useState<{ processedFirms: any[], duplicates: any[] } | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const runPipeline = async () => {
    setIsRunning(true);
    setLogs([]);
    setResults(null);

    try {
      const response = await fetch('/api/pipeline/run', {
        method: 'POST',
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '');
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.done) {
                setIsRunning(false);
              } else if (data.error) {
                setLogs(prev => [...prev, { message: `ERROR: ${data.error}` }]);
                setIsRunning(false);
              } else {
                setLogs(prev => [...prev, { message: data.message }]);
                if (data.data && data.data.processedFirms) {
                  setResults(data.data);
                }
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error: any) {
      setLogs(prev => [...prev, { message: `ERROR: ${error.message}` }]);
      setIsRunning(false);
    }
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      <header className="bg-white border-b border-zinc-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">GTM Data Pipeline</h1>
            <p className="text-sm text-zinc-500">Legal AI Startup</p>
          </div>
          <button
            onClick={runPipeline}
            disabled={isRunning}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isRunning 
                ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' 
                : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Running Pipeline...' : 'Run Pipeline'}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logs Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col h-[600px]">
          <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50/50">
            <h2 className="font-medium text-sm text-zinc-700">Execution Logs</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-2 bg-zinc-950 text-zinc-300">
            {logs.length === 0 && !isRunning && (
              <div className="text-zinc-600 italic">Click 'Run Pipeline' to start...</div>
            )}
            <AnimatePresence initial={false}>
              {logs.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${log.message.startsWith('ERROR') ? 'text-red-400' : ''}`}
                >
                  <span className="text-zinc-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                  {log.message}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Results Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col h-[600px]">
          <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50/50 flex justify-between items-center">
            <h2 className="font-medium text-sm text-zinc-700">Pipeline Results</h2>
            {results && (
              <span className="text-xs font-medium px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                {results.processedFirms.length} Processed
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {!results ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-3">
                <AlertCircle className="w-8 h-8 opacity-20" />
                <p className="text-sm">No results yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Processed Leads ({results.processedFirms.length})
                  </h3>
                  <div className="space-y-3">
                    {results.processedFirms.map((firm: any) => (
                      <div key={firm.id} className="p-3 rounded-lg border border-zinc-100 bg-zinc-50/50 text-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium text-zinc-900">{firm.name}</div>
                            <div className="text-xs text-zinc-500">{firm.domain} • {firm.region}</div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              firm.route === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                              firm.route === 'mid-market' ? 'bg-blue-100 text-blue-800' :
                              firm.route === 'smb' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-zinc-100 text-zinc-800'
                            }`}>
                              {firm.route}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs mt-3 pt-3 border-t border-zinc-100">
                          <div>
                            <span className="text-zinc-500">Score:</span>{' '}
                            <span className="font-medium">{firm.score}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500">Lawyers:</span>{' '}
                            <span className="font-medium">{firm.firmographic.lawyerCount}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500">Experiment:</span>{' '}
                            <span className="font-medium">{firm.experimentVariant || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500">Contact:</span>{' '}
                            <span className="font-medium truncate block" title={firm.contact.email}>
                              {firm.contact.email || 'Missing'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {results.duplicates.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 mb-3">
                      Duplicates Filtered ({results.duplicates.length})
                    </h3>
                    <div className="space-y-2">
                      {results.duplicates.map((firm: any) => (
                        <div key={firm.id} className="p-2 rounded border border-red-100 bg-red-50/50 text-xs flex justify-between">
                          <span className="font-medium text-red-900">{firm.name}</span>
                          <span className="text-red-700">{firm.domain}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
