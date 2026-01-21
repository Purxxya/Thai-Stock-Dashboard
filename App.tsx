
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  TrendingUp, 
  Search, 
  RefreshCcw, 
  LayoutDashboard, 
  BrainCircuit, 
  Zap,
  Loader2,
  Clock,
  Database,
  Wifi,
  LineChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  FileCode2,
  Settings,
  Activity,
  PieChart,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { Stock, MarketSummary, AIInsight, GroundingSource } from './types';
import { INITIAL_STOCKS, MARKET_SUMMARIES } from './constants';
import StockChart from './components/StockChart';
import SheetView from './components/SheetView';
import ScriptModal from './components/ScriptModal';
import { analyzePortfolio, fetchGeminiMarketDataBatch } from './services/geminiService';

const CACHE_KEY = 'thaistock_executive_v16_stable';
const REFRESH_INTERVAL = 1800000; // 30 min cycles (Slower cycles for stability)
const BATCH_DELAY = 65000; // 65s delay - Highest safety for Search Tool quota
const BACKOFF_DELAY = 600000; // 10 min backoff for 429 errors

const KPIGauge = ({ value, label, color = "#dc2626", subLabel = "" }: { value: number, label: string, color?: string, subLabel?: string }) => {
  const rotation = (Math.min(100, Math.max(0, value)) / 100) * 180 - 90;
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center transition-all hover:shadow-md hover:border-red-100">
      <div className="relative w-28 h-14 overflow-hidden">
        <div className="absolute top-0 left-0 w-28 h-28 border-[10px] border-slate-50 rounded-full"></div>
        <div 
          className="absolute top-0 left-0 w-28 h-28 border-[10px] border-transparent border-t-current rounded-full transition-all duration-1000 ease-in-out"
          style={{ color, transform: `rotate(${rotation}deg)` }}
        ></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-lg font-black text-slate-800">{value}%</div>
      </div>
      <div className="mt-2 text-center">
        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
        <div className="text-[7px] font-bold text-red-600/60 uppercase mt-0.5">{subLabel}</div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [stocks, setStocks] = useState<Stock[]>(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return INITIAL_STOCKS.map(s => {
          const c = parsed.find((item: any) => item.symbol === s.symbol);
          return c ? { ...s, ...c } : s;
        });
      } catch (e) { return INITIAL_STOCKS; }
    }
    return INITIAL_STOCKS;
  });

  const [markets] = useState<MarketSummary[]>(MARKET_SUMMARIES);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStock, setSelectedStock] = useState<Stock | null>(stocks[0]);
  const [viewType, setViewType] = useState<'line' | 'candle'>('candle');
  const [isSyncing, setIsSyncing] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'spreadsheet'>('dashboard');
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [nextSyncIn, setNextSyncIn] = useState(REFRESH_INTERVAL / 1000);
  const [syncProgress, setSyncProgress] = useState(0);
  const [groundingSources, setGroundingSources] = useState<GroundingSource[]>([]);
  
  const updateStockState = useCallback((realDataList: any[]) => {
    setStocks(prev => {
      const newState = prev.map(stock => {
        const realData = realDataList.find((d: any) => d.symbol.toUpperCase() === stock.symbol.toUpperCase());
        if (realData) {
          const newPrice = typeof realData.price === 'number' ? realData.price : stock.price;
          const newChangePct = typeof realData.changePercent === 'number' ? realData.changePercent : stock.changePercent;
          return {
            ...stock,
            price: newPrice,
            changePercent: newChangePct,
            change: (stock.prevClose * newChangePct) / 100,
            isRealTime: true,
            lastUpdated: realData.lastTradeTime || new Date().toLocaleTimeString('th-TH')
          };
        }
        return stock;
      });
      localStorage.setItem(CACHE_KEY, JSON.stringify(newState));
      return newState;
    });
  }, []);

  const runBatchRefresh = async (specificSymbols?: string[]) => {
    if (isSyncing || quotaExceeded) return;
    setIsSyncing(true);
    setSyncProgress(0);
    try {
      const symbolsToSync = specificSymbols || stocks.map(s => s.symbol);
      // Increased batch size to 18 to reduce RPM calls
      const batchSize = 18; 
      
      for (let i = 0; i < symbolsToSync.length; i += batchSize) {
        const chunk = symbolsToSync.slice(i, i + batchSize);
        
        try {
          const result = await fetchGeminiMarketDataBatch(chunk);
          if (result.data?.length) updateStockState(result.data);
          
          if (result.sources?.length) {
            setGroundingSources(prev => {
              const combined = [...prev, ...result.sources];
              const unique = Array.from(new Map(combined.map(s => [s.uri, s])).values());
              return unique.slice(-15);
            });
          }
        } catch (innerError: any) {
          if (innerError.message === "QUOTA_EXCEEDED") throw innerError;
          console.warn(`Sync partial skip for: ${chunk.join(",")}`);
        }
        
        const progress = Math.min(100, Math.round(((i + batchSize) / symbolsToSync.length) * 100));
        setSyncProgress(progress);

        if (i + batchSize < symbolsToSync.length) {
          await new Promise(r => setTimeout(r, BATCH_DELAY));
        }
      }
      setQuotaExceeded(false);
    } catch (e: any) {
      if (e.message === "QUOTA_EXCEEDED") {
        setQuotaExceeded(true);
        setTimeout(() => setQuotaExceeded(false), BACKOFF_DELAY);
      }
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
      setNextSyncIn(REFRESH_INTERVAL / 1000);
    }
  };

  const handleQuickSync6 = () => {
    const targetSymbols = ["HMPRO", "INTUCH", "IRPC", "IVL", "JAS", "JMART"];
    runBatchRefresh(targetSymbols);
  };

  const handleAIAnalyze = async () => {
    if (isAnalyzing || quotaExceeded) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzePortfolio(stocks);
      setAiInsight(result);
    } catch (e) {
      console.error("AI Error:", e);
    } finally { setIsAnalyzing(false); }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setNextSyncIn(prev => {
        if (prev <= 1) {
          runBatchRefresh();
          return REFRESH_INTERVAL / 1000;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentSelected = useMemo(() => 
    stocks.find(s => s.symbol === selectedStock?.symbol) || selectedStock, 
    [stocks, selectedStock]
  );

  const filteredStocks = useMemo(() => 
    stocks.filter(s => s.symbol.includes(searchTerm.toUpperCase())), 
    [stocks, searchTerm]
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f1f5f9] text-slate-700 font-sans selection:bg-red-500/10">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 hidden lg:flex shadow-md z-[60]">
        <div className="p-5 flex items-center gap-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-md">
            <TrendingUp size={16} />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 tracking-tighter uppercase leading-none">Thai Stock Dashboard</h1>
            <span className="text-[8px] text-red-600 font-black tracking-widest uppercase">STABLE REALTIME</span>
          </div>
        </div>
        
        <div className="px-4 py-2">
           <div className="relative group">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-red-600 transition-all" size={14} />
             <input 
              type="text" 
              placeholder="FILTER..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-[9px] font-black focus:ring-2 focus:ring-red-600/5 focus:border-red-600 outline-none transition-all tracking-widest uppercase"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
          {filteredStocks.map(s => (
            <button 
              key={s.symbol} 
              onClick={() => setSelectedStock(s)}
              className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-all group relative overflow-hidden ${currentSelected?.symbol === s.symbol ? 'bg-red-600 text-white shadow-sm' : 'hover:bg-slate-50 border border-transparent text-slate-500'}`}
            >
              <div className="text-left relative z-10">
                <span className={`text-[11px] font-black tracking-tight block ${currentSelected?.symbol === s.symbol ? 'text-white' : 'text-slate-900'}`}>{s.symbol}</span>
                <span className={`text-[7px] font-bold uppercase truncate max-w-[70px] block mt-0.5 ${currentSelected?.symbol === s.symbol ? 'text-red-100' : 'text-slate-400'}`}>{s.fullName}</span>
              </div>
              <div className="text-right relative z-10">
                <div className={`text-[11px] font-black tabular-nums ${currentSelected?.symbol === s.symbol ? 'text-white' : 'text-slate-900'}`}>฿{s.price.toFixed(2)}</div>
                <div className={`text-[8px] font-black mt-0.5 ${s.changePercent >= 0 ? (currentSelected?.symbol === s.symbol ? 'text-red-100' : 'text-emerald-500') : (currentSelected?.symbol === s.symbol ? 'text-red-100' : 'text-red-600')}`}>
                  {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
                </div>
              </div>
            </button>
          ))}
        </nav>

        <div className="m-4 p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-3">
           <div className="flex items-center justify-between">
             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
               <Activity size={10} className="text-red-600" /> SYNC
             </span>
             <div className={`w-1.5 h-1.5 rounded-full ${quotaExceeded ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
           </div>
           
           <div className="space-y-2">
             <div className="flex justify-between items-end">
               <span className="text-[7px] font-bold text-slate-400 uppercase">Timer</span>
               <span className="text-[8px] font-black text-slate-800">{Math.floor(nextSyncIn / 60)}m {nextSyncIn % 60}s</span>
             </div>
             <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
               <div className="h-full bg-red-600 transition-all duration-1000" style={{ width: `${(nextSyncIn / (REFRESH_INTERVAL/1000)) * 100}%` }}></div>
             </div>
           </div>
           <button 
             onClick={handleQuickSync6}
             disabled={isSyncing || quotaExceeded}
             className="w-full py-1.5 bg-white border border-slate-200 text-[8px] font-black text-slate-600 hover:text-red-600 hover:border-red-600 rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
           >
             <Zap size={10} /> REFRESH KEY 6
           </button>
        </div>

        {groundingSources.length > 0 && (
          <div className="mx-4 mb-4 p-4 bg-slate-50/80 rounded-xl border border-slate-200/40 space-y-2">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Wifi size={10} className="text-red-600" /> Grounding Sources
            </span>
            <div className="space-y-1.5 max-h-[120px] overflow-y-auto custom-scrollbar pr-1">
              {groundingSources.map((s, idx) => (
                <a 
                  key={idx} 
                  href={s.uri} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center justify-between bg-white px-2 py-1.5 rounded border border-slate-100 group/link transition-all"
                >
                  <span className="text-[7px] font-bold text-slate-500 truncate max-w-[150px] group-hover/link:text-red-600 uppercase tracking-tight">
                    {s.title}
                  </span>
                  <ExternalLink size={8} className="text-slate-300 group-hover/link:text-red-600" />
                </a>
              ))}
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-50">
          <div className="flex items-center gap-8 overflow-x-auto no-scrollbar py-1">
            {markets.map((m) => (
              <div key={m.index} className="flex items-center gap-3 whitespace-nowrap border-r border-slate-100 pr-8 last:border-0">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 tracking-widest uppercase">{m.index}</span>
                  <span className="text-[13px] font-black text-slate-900 tabular-nums leading-none mt-1">{m.value.toLocaleString()}</span>
                </div>
                <span className={`text-[9px] font-black flex items-center ${m.change >= 0 ? 'text-emerald-500' : 'text-red-600'}`}>
                  {m.changePercent}%
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
             {isSyncing && (
               <div className="flex flex-col items-end mr-2">
                 <span className="text-[8px] font-black text-red-600 uppercase mb-0.5">Syncing {syncProgress}%</span>
                 <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full bg-red-600" style={{ width: `${syncProgress}%` }}></div>
                 </div>
               </div>
             )}
             <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-lg text-[7px] font-black text-emerald-600 uppercase tracking-widest">
               <CheckCircle2 size={10} /> {quotaExceeded ? "Cooldown" : "API Ready"}
             </div>
             <button 
                onClick={() => runBatchRefresh()}
                disabled={isSyncing || quotaExceeded}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-red-600 rounded-lg transition-all disabled:opacity-30 border border-slate-100 shadow-sm"
             >
                {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
             </button>
             <button 
                onClick={() => setIsScriptModalOpen(true)}
                className="bg-slate-900 hover:bg-black text-white px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1.5 active:scale-95"
             >
                <FileCode2 size={12} /> Sync Log
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5 lg:p-8 custom-scrollbar">
          {activeTab === 'dashboard' ? (
            <div className="max-w-[1200px] mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPIGauge value={82} label="Sentiment" subLabel="Excellent" />
                <KPIGauge value={74} label="Velocity" subLabel="Stable" color="#059669" />
                <KPIGauge value={currentSelected ? Math.min(100, Math.max(0, Math.round(50 + currentSelected.changePercent * 20))) : 50} label="Relative Strength" subLabel="Momentum" />
                <div className="bg-red-600 rounded-xl p-4 flex flex-col justify-between text-white shadow relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-3 opacity-10">
                     <PieChart size={80} />
                   </div>
                   <div className="p-2 bg-white/10 rounded-lg backdrop-blur-xl border border-white/20 w-fit">
                      <Wifi size={14} />
                   </div>
                   <div className="relative z-10">
                     <div className="text-[8px] font-bold opacity-70 uppercase mb-0.5">Asset Focus</div>
                     <div className="text-xl font-black tracking-tighter">{currentSelected?.symbol}</div>
                   </div>
                </div>
              </div>

              {quotaExceeded && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-4 text-amber-800 animate-in slide-in-from-top duration-500">
                  <AlertCircle className="shrink-0" size={20} />
                  <div className="text-[11px] font-bold uppercase tracking-tight leading-relaxed">
                    API Quota Limit (429) - ระบบกำลังปรับสมดุลการเชื่อมต่ออัตโนมัติ (Backoff) กรุณารอสักครู่เพื่อให้การซิงค์ข้อมูลกลับมาเสถียรอีกครั้ง
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                 <div className="flex flex-col xl:flex-row justify-between items-start gap-6 mb-6 border-b border-slate-50 pb-6">
                    <div className="space-y-2">
                       <div className="flex items-center gap-2">
                         <span className="px-2 py-1 bg-red-50 text-red-600 text-[8px] font-black rounded border border-red-100 uppercase tracking-widest">{currentSelected?.sector}</span>
                         <div className="flex items-center gap-1.5 text-slate-400 text-[8px] font-black uppercase tracking-widest px-3 border-l border-slate-100">
                           <Clock size={10} className="text-red-600" /> {currentSelected?.lastUpdated || 'INITIAL'}
                         </div>
                       </div>
                       <div className="flex flex-col">
                         <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">{currentSelected?.symbol}</h2>
                         <div className="text-[11px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">{currentSelected?.fullName}</div>
                       </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="text-4xl font-black text-slate-900 tabular-nums tracking-tighter leading-none">
                        ฿{currentSelected?.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <div className={`flex items-center gap-2 text-lg font-black ${currentSelected && currentSelected.change >= 0 ? 'text-emerald-500' : 'text-red-600'}`}>
                         <div className="flex items-center gap-0.5">
                          {currentSelected && currentSelected.change >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                          {currentSelected?.changePercent.toFixed(2)}%
                         </div>
                         <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded">
                           {currentSelected && currentSelected.change >= 0 ? '+' : ''}{currentSelected?.change.toFixed(2)}
                         </div>
                      </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8">
                       <div className="relative">
                          <div className="absolute top-0 right-0 flex bg-white/90 backdrop-blur-xl p-1 rounded-lg border border-slate-100 z-10">
                            <button onClick={() => setViewType('line')} className={`p-1.5 rounded transition-all ${viewType === 'line' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-900'}`}><LineChart size={14} /></button>
                            <button onClick={() => setViewType('candle')} className={`p-1.5 rounded transition-all ${viewType === 'candle' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-900'}`}><BarChart3 size={14} /></button>
                          </div>
                          <StockChart 
                            data={currentSelected?.history || []} 
                            color="#dc2626" 
                            prevClose={currentSelected?.prevClose || 0}
                            viewType={viewType}
                          />
                       </div>
                    </div>

                    <div className="lg:col-span-4 flex flex-col gap-5">
                       <div className="p-5 bg-slate-50/50 rounded-xl space-y-4 border border-slate-200/60">
                          <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                             <Settings size={12} className="text-red-600" /> Executive Metrics
                          </h4>
                          <div className="space-y-4">
                            {[
                              { label: 'Market Cap', val: currentSelected?.marketCap, icon: <Database size={10} /> },
                              { label: 'Daily Volume', val: currentSelected?.volume, icon: <Activity size={10} /> },
                              { label: 'Prev Settlement', val: '฿' + currentSelected?.prevClose.toFixed(2), icon: <Clock size={10} /> }
                            ].map(item => (
                              <div key={item.label} className="flex flex-col gap-1 group">
                                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5 group-hover:text-red-600 transition-colors">
                                  {item.icon} {item.label}
                                </span>
                                <span className="text-lg text-slate-900 font-black tracking-tighter">{item.val}</span>
                              </div>
                            ))}
                          </div>
                       </div>

                       <div className="p-5 bg-slate-900 rounded-xl space-y-4 shadow-lg relative overflow-hidden min-h-[180px]">
                          <div className="absolute top-0 right-0 p-4 opacity-10 text-red-600 rotate-12 scale-110">
                            <BrainCircuit size={60} />
                          </div>
                          <div className="flex items-center justify-between relative z-10">
                             <div className="flex items-center gap-2 text-white">
                               <Zap size={14} className="text-red-500 fill-red-500" />
                               <span className="text-[9px] font-black uppercase tracking-widest">AI Hub</span>
                             </div>
                             <button onClick={handleAIAnalyze} disabled={isAnalyzing || quotaExceeded} className="bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-lg transition-all disabled:opacity-30 border border-white/5 shadow-lg">
                               {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <BrainCircuit size={12} />}
                             </button>
                          </div>
                          {aiInsight ? (
                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-700 relative z-10">
                               <div className="p-3 bg-white/5 rounded-lg border border-white/10 backdrop-blur-xl">
                                 <p className="text-[11px] text-slate-100 font-medium leading-relaxed italic border-l-2 border-red-600 pl-3">
                                   "{aiInsight.summary}"
                                 </p>
                               </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-6 relative z-10 opacity-30">
                               <Loader2 size={18} className="text-slate-600 animate-pulse" />
                               <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-3">Ready for Signal</p>
                            </div>
                          )}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200/60">
                 <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-5 bg-red-600 rounded-full shadow-sm shadow-red-600/40"></div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Market Watch Ledger</h3>
                    </div>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                       <thead className="bg-slate-50/40 text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
                         <tr>
                           <th className="px-6 py-4">Ticker</th>
                           <th className="px-6 py-4">Company Name</th>
                           <th className="px-6 py-4 text-right">Last Price</th>
                           <th className="px-6 py-4 text-right">Performance</th>
                           <th className="px-6 py-4 text-center">Sync Status</th>
                           <th className="px-6 py-4"></th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {stocks.slice(0, 30).map(stock => (
                           <tr key={stock.symbol} onClick={() => setSelectedStock(stock)} className={`hover:bg-slate-50 transition-all cursor-pointer group ${currentSelected?.symbol === stock.symbol ? 'bg-red-50/20' : ''}`}>
                             <td className="px-6 py-3">
                               <span className={`text-[13px] font-black transition-colors ${currentSelected?.symbol === stock.symbol ? 'text-red-600' : 'text-slate-900 group-hover:text-red-600'}`}>{stock.symbol}</span>
                             </td>
                             <td className="px-6 py-3">
                               <span className="text-[9px] text-slate-400 font-bold uppercase truncate max-w-[150px] block">{stock.fullName}</span>
                             </td>
                             <td className="px-6 py-3 text-right font-black text-[13px] tabular-nums text-slate-900">฿{stock.price.toFixed(2)}</td>
                             <td className={`px-6 py-3 text-right font-black text-[13px] tabular-nums ${stock.changePercent >= 0 ? 'text-emerald-500' : 'text-red-600'}`}>
                                {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                             </td>
                             <td className="px-6 py-3 text-center">
                                {stock.isRealTime ? (
                                  <div className="text-[8px] font-black text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 w-fit mx-auto uppercase">Real-time</div>
                                ) : (
                                  <div className="text-[8px] font-black text-slate-200 bg-slate-50 px-2 py-1 rounded w-fit mx-auto uppercase tracking-tighter opacity-50">Historical Feed</div>
                                )}
                             </td>
                             <td className="px-6 py-3 text-right">
                                <ChevronRight size={16} className={`transition-all ${currentSelected?.symbol === stock.symbol ? 'text-red-600' : 'text-slate-100 group-hover:text-red-600'}`} />
                             </td>
                           </tr>
                         ))}
                       </tbody>
                    </table>
                 </div>
              </div>
            </div>
          ) : (
            <div className="h-full animate-in slide-in-from-right duration-700 bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm overflow-hidden">
               <SheetView stocks={stocks} />
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-2xl border border-slate-200 p-1.5 rounded-2xl shadow-xl flex gap-1.5 z-[100] ring-1 ring-black/5">
         <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all ${activeTab === 'dashboard' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}><LayoutDashboard size={14} /> Dash</button>
         <button onClick={() => setActiveTab('spreadsheet')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all ${activeTab === 'spreadsheet' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}><FileSpreadsheet size={14} /> Grid</button>
      </div>

      <ScriptModal isOpen={isScriptModalOpen} onClose={() => setIsScriptModalOpen(false)} />
    </div>
  );
};

export default App;
