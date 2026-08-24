'use client';

import { useState, ChangeEvent, useEffect, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const getCurrentDateTimeLocal = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

const formatTimeOnly = (dateString: string) => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '-';
  }
};

interface Trade {
  id: string;
  openTime: string;
  closeTime: string;
  day: string;
  duration: string;
  instrument: string;
  setup: string;
  account: string;
  rr: string;
  targetPnl: number;
  realizedPnl: number;
  images: string[];
}

interface BacktestSession {
  id: string;
  name: string;
  trades: Trade[];
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'live' | 'backtest'>('live');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[] | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // ტრეიდების წამოღება LocalStorage-დან
  const [liveTrades, setLiveTrades] = useState<Trade[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('local_trades');
      if (saved) {
        try { return JSON.parse(saved); } catch { return []; }
      }
    }
    return [];
  });

  // ტრეიდების შენახვა LocalStorage-ში როდესაც იცვლება
  useEffect(() => {
    localStorage.setItem('local_trades', JSON.stringify(liveTrades));
  }, [liveTrades]);

  const [backtestSessions, setBacktestSessions] = useState<BacktestSession[]>([
    { id: '1', name: 'სტრატეგია #1 (FVG Test)', trades: [] }
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>('1');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [formData, setFormData] = useState({
    openTime: '', closeTime: '', instrument: 'NQ', account: 'Live Funded', setup: '', risk: '', targetPnl: '', realizedPnl: '', images: [] as string[]
  });

  useEffect(() => {
    if (isModalOpen) {
      const now = getCurrentDateTimeLocal();
      setFormData(prev => ({ 
        ...prev, 
        openTime: now, 
        closeTime: now, 
        images: [],
        account: activeTab === 'backtest' ? 'Backtest' : 'Live Funded'
      }));
    }
  }, [isModalOpen, activeTab]);

  const handleMultipleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Promise.all(Array.from(files).map(file => new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    }))).then(newImages => setFormData(prev => ({ ...prev, images: [...prev.images, ...newImages] })));
  };

  const getDayOfWeek = (dateString: string) => {
    if (!dateString) return '-';
    const days = ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'];
    return days[new Date(dateString).getDay()];
  };

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return '-';
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.floor(diff / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}სთ ${m}წთ` : `${m}წთ`;
  };

  const handleSave = () => {
    const riskVal = parseFloat(formData.risk);
    const targetVal = parseFloat(formData.targetPnl);
    const realizedVal = parseFloat(formData.realizedPnl);
    
    let realizedRR = '-';
    if (riskVal > 0 && !isNaN(realizedVal)) {
      const ratio = (Math.abs(realizedVal) / riskVal).toFixed(2);
      realizedRR = realizedVal < 0 ? `-${ratio}R` : `1:${ratio}`;
    }

    const newTrade: Trade = {
      id: Date.now().toString(),
      openTime: formData.openTime,
      closeTime: formData.closeTime,
      day: getDayOfWeek(formData.openTime),
      duration: calculateDuration(formData.openTime, formData.closeTime),
      instrument: formData.instrument,
      setup: formData.setup || 'Unknown',
      account: activeTab === 'backtest' ? 'Backtest' : formData.account,
      rr: realizedRR,
      targetPnl: targetVal || 0,
      realizedPnl: realizedVal || 0,
      images: formData.images
    };

    if (activeTab === 'backtest') {
      setBacktestSessions(prev => prev.map(session => {
        if (session.id === activeSessionId) {
          return { ...session, trades: [newTrade, ...session.trades] };
        }
        return session;
      }));
    } else {
      setLiveTrades(prev => [newTrade, ...prev]);
    }

    setIsModalOpen(false);
    setFormData({ ...formData, setup: '', risk: '', targetPnl: '', realizedPnl: '', images: [] });
  };

  const handleDeleteTrade = (tradeId: string) => {
    if (activeTab === 'live') {
      setLiveTrades(prev => prev.filter(t => t.id !== tradeId));
    } else {
      setBacktestSessions(prev => prev.map(session => {
        if (session.id === activeSessionId) {
          return { ...session, trades: session.trades.filter(t => t.id !== tradeId) };
        }
        return session;
      }));
    }
  };

  const handleCreateNewBacktest = () => {
    const name = prompt('შეიყვანეთ ახალი ბექტესტის სახელი:', `სტრატეგია #${backtestSessions.length + 1}`);
    if (name) {
      const newSession: BacktestSession = {
        id: Date.now().toString(),
        name,
        trades: []
      };
      setBacktestSessions([...backtestSessions, newSession]);
      setActiveSessionId(newSession.id);
      setActiveTab('backtest');
      setIsDropdownOpen(false);
    }
  };

  const handleDeleteCurrentSession = () => {
    if (backtestSessions.length <= 1) {
      alert('ბოლო ბექტესტს ვერ წაშლით.');
      return;
    }
    if (confirm('ნამდვილად გსურთ ამ ბექტესტის სრულად წაშლა?')) {
      const remaining = backtestSessions.filter(s => s.id !== activeSessionId);
      setBacktestSessions(remaining);
      setActiveSessionId(remaining[0].id);
      setIsDropdownOpen(false);
    }
  };

  const currentBacktestSession = backtestSessions.find(s => s.id === activeSessionId);
  const trades = activeTab === 'backtest' ? (currentBacktestSession ? currentBacktestSession.trades : []) : liveTrades;

  const wins = trades.filter(t => t.realizedPnl > 0);
  const losses = trades.filter(t => t.realizedPnl <= 0);
  const winRate = trades.length > 0 ? Math.round((wins.length / trades.length) * 100) : 0;
  
  const totalWinAmount = wins.reduce((acc, t) => acc + t.realizedPnl, 0);
  const totalLossAmount = Math.abs(losses.reduce((acc, t) => acc + t.realizedPnl, 0));
  const avgWin = wins.length > 0 ? totalWinAmount / wins.length : 0;
  const avgLoss = losses.length > 0 ? totalLossAmount / losses.length : 0;
  const profitFactor = totalLossAmount > 0 ? (totalWinAmount / totalLossAmount).toFixed(2) : (totalWinAmount > 0 ? '∞' : '0');
  const totalPnl = trades.reduce((acc, t) => acc + t.realizedPnl, 0);

  let peak = 0, maxDrawdown = 0, currentEquity = 0;
  const calcTrades = [...trades].reverse();
  const equityData = calcTrades.map((t, idx) => {
    currentEquity += t.realizedPnl;
    if (currentEquity > peak) peak = currentEquity;
    const drawdown = peak - currentEquity;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    return { name: `T${idx + 1}`, equity: currentEquity };
  });

  const strategyDataMap: Record<string, number> = {};
  trades.forEach(t => {
    if (t.realizedPnl > 0) strategyDataMap[t.setup] = (strategyDataMap[t.setup] || 0) + t.realizedPnl;
  });
  const strategyData = Object.keys(strategyDataMap).map(key => ({ name: key, value: strategyDataMap[key] }));
  const COLORS = ['#60a5fa', '#34d399', '#a78bfa', '#fbbf24', '#f87171'];

  const glassCard = "bg-slate-900/50 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-all duration-300 hover:border-white/30";
  const glassInput = "w-full bg-slate-950/60 backdrop-blur-md border border-white/15 rounded-2xl p-3 text-white outline-none focus:border-blue-400 focus:bg-slate-950/90 transition-all placeholder:text-slate-500 shadow-inner";

  return (
    <div className="min-h-screen bg-slate-950 bg-gradient-to-br from-slate-950 via-blue-950/60 to-indigo-950 text-slate-50 p-4 md:p-8 relative overflow-hidden font-sans">
      
      <div className="absolute top-[-10%] left-[-5%] w-[700px] h-[700px] bg-blue-500/30 rounded-full blur-[160px] pointer-events-none"></div>
      <div className="absolute top-[35%] right-[-10%] w-[700px] h-[700px] bg-indigo-500/25 rounded-full blur-[160px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[15%] w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-[160px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        
        {/* Header & Tabs */}
        <header className={`${glassCard} p-6 flex flex-col md:flex-row justify-between items-center gap-4 relative z-30`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500/30 rounded-2xl flex items-center justify-center border border-blue-400/50 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">Trading Journal</h1>
              <p className="text-xs text-slate-300 font-medium">
                {activeTab === 'live' ? '🟢 ლაივ რეჟიმი (Local Storage)' : `🔬 ბექტესტი: ${currentBacktestSession?.name}`}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex bg-slate-950/60 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md relative">
              <button
                onClick={() => setActiveTab('live')}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'live' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:text-white'}`}
              >
                ლაივ ჟურნალი
              </button>
              
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'backtest' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white'}`}
                >
                  🔬 ბექტესტინგი ▾
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-72 bg-slate-900/95 backdrop-blur-3xl border border-white/20 rounded-2xl shadow-2xl p-2 z-[9999]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">არჩეული ტესტები</div>
                    <div className="max-h-48 overflow-y-auto space-y-1 mb-2">
                      {backtestSessions.map(session => (
                        <div
                          key={session.id}
                          onClick={() => {
                            setActiveSessionId(session.id);
                            setActiveTab('backtest');
                            setIsDropdownOpen(false);
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex justify-between items-center ${activeTab === 'backtest' && session.id === activeSessionId ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30' : 'text-slate-300 hover:bg-white/5'}`}
                        >
                          <span className="truncate">{session.name}</span>
                          <span className="text-[10px] opacity-60">({session.trades.length})</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-white/10 pt-1.5 space-y-1">
                      <button
                        onClick={handleCreateNewBacktest}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-2"
                      >
                        + ახალი ტესტის დამატება
                      </button>
                      <button
                        onClick={handleDeleteCurrentSession}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                      >
                        🗑️ მიმდინარე ტესტის წაშლა
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={() => setIsModalOpen(true)} 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-blue-300/50 active:scale-95"
            >
              + ახალი ტრეიდი
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`${glassCard} p-5`}>
            <p className="text-xs text-slate-300 font-semibold uppercase tracking-wider mb-1">Win Rate</p>
            <p className={`text-2xl font-extrabold ${winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>{winRate}%</p>
          </div>
          <div className={`${glassCard} p-5`}>
            <p className="text-xs text-slate-300 font-semibold uppercase tracking-wider mb-1">Total P&L</p>
            <p className={`text-2xl font-extrabold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
            </p>
          </div>
          <div className={`${glassCard} p-5`}>
            <p className="text-xs text-slate-300 font-semibold uppercase tracking-wider mb-1">Profit Factor</p>
            <p className="text-2xl font-extrabold text-white">{profitFactor}</p>
          </div>
          <div className={`${glassCard} p-5`}>
            <p className="text-xs text-slate-300 font-semibold uppercase tracking-wider mb-1">Max Drawdown</p>
            <p className="text-2xl font-extrabold text-red-400">-${maxDrawdown.toFixed(2)}</p>
          </div>
          <div className={`${glassCard} p-5`}>
            <p className="text-xs text-slate-300 font-semibold uppercase tracking-wider mb-1">სულ ტრეიდი</p>
            <p className="text-2xl font-extrabold text-white">{trades.length}</p>
          </div>
          <div className={`${glassCard} p-5`}>
            <p className="text-xs text-slate-300 font-semibold uppercase tracking-wider mb-1">საშუალო მოგება</p>
            <p className="text-2xl font-extrabold text-emerald-400">${avgWin.toFixed(2)}</p>
          </div>
          <div className={`${glassCard} p-5`}>
            <p className="text-xs text-slate-300 font-semibold uppercase tracking-wider mb-1">საშუალო წაგება</p>
            <p className="text-2xl font-extrabold text-red-400">-${avgLoss.toFixed(2)}</p>
          </div>
          <div className={`${glassCard} p-5`}>
            <p className="text-xs text-slate-300 font-semibold uppercase tracking-wider mb-1">Win/Loss Ratio</p>
            <p className="text-2xl font-extrabold text-white">1:{(avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '0')}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`${glassCard} p-6 lg:col-span-2`}>
            <h3 className="text-sm font-bold text-slate-100 mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span> ბალანსის მრუდი
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={equityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                  <XAxis dataKey="name" stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={{ stroke: '#ffffff15' }} />
                  <YAxis stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={{ stroke: '#ffffff15' }} tickFormatter={(val) => `$${val}`} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.2)', color: '#f8fafc', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
                  <Line type="monotone" dataKey="equity" stroke="#60a5fa" strokeWidth={3.5} dot={{ r: 5, fill: '#60a5fa', strokeWidth: 0 }} activeDot={{ r: 7, fill: '#3b82f6' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className={`${glassCard} p-6`}>
            <h3 className="text-sm font-bold text-slate-100 mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> მომგებიანი სტრატეგიები
            </h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={strategyData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={6} dataKey="value" stroke="rgba(255,255,255,0.15)">
                    {strategyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.2)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} itemStyle={{ color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {strategyData.map((entry, idx) => (
                <div key={idx} className="flex items-center text-xs font-semibold text-slate-200">
                  <span className="w-3 h-3 rounded-md mr-2 shadow-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  {entry.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className={`${glassCard} overflow-hidden pb-4 shadow-2xl`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[1000px]">
              <thead className="bg-white/10 text-slate-200 border-b border-white/15 text-xs uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-4">დღე</th>
                  <th className="px-6 py-4">ინსტრუმენტი</th>
                  <th className="px-6 py-4">სტრატეგია</th>
                  <th className="px-6 py-4">დრო (საათი)</th>
                  <th className="px-6 py-4">საბოლოო R:R</th>
                  <th className="px-6 py-4">დაგეგმილი P/L</th>
                  <th className="px-6 py-4">საბოლოო ($)</th>
                  <th className="px-6 py-4">ჩარტები</th>
                  <th className="px-6 py-4 text-center">მოქმედება</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 font-medium">
                {trades.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                      ტრეიდები არ მოიძებნა. დაამატეთ ახალი ტრეიდი.
                    </td>
                  </tr>
                ) : (
                  trades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-white/10 transition-colors">
                      <td className="px-6 py-4 text-slate-200">{trade.day}</td>
                      <td className="px-6 py-4 font-bold text-white">{trade.instrument}</td>
                      <td className="px-6 py-4">
                        <span className="bg-white/15 text-slate-100 border border-white/20 px-3 py-1 rounded-xl text-xs backdrop-blur-md shadow-sm">
                          {trade.setup}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-100 font-semibold">
                          {formatTimeOnly(trade.openTime)} - {formatTimeOnly(trade.closeTime)}
                        </div>
                        <div className="text-slate-300 text-xs mt-0.5">{trade.duration}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-200">{trade.rr}</td>
                      <td className="px-6 py-4 text-slate-300">${trade.targetPnl}</td>
                      <td className={`px-6 py-4 font-bold ${trade.realizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {trade.realizedPnl > 0 ? '+' : ''}${trade.realizedPnl}
                      </td>
                      <td className="px-6 py-4">
                        {trade.images?.length > 0 ? (
                          <div className="relative w-14 h-9 cursor-pointer group rounded-xl overflow-hidden border border-white/25 shadow-md" onClick={() => setGalleryImages(trade.images)}>
                            <img src={trade.images[0]} alt="Chart" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                            {trade.images.length > 1 && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs font-bold text-white backdrop-blur-sm">
                                +{trade.images.length - 1}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-semibold">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDeleteTrade(trade.id)}
                          className="bg-red-500/10 hover:bg-red-500/30 text-red-400 p-2 rounded-xl transition-colors border border-red-500/20"
                          title="ტრეიდის წაშლა"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Trade Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xl flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900/95 backdrop-blur-3xl border border-white/20 rounded-3xl p-6 md:p-8 w-full max-w-xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] my-8 relative overflow-hidden">
            <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-blue-500/30 rounded-full blur-[50px] pointer-events-none"></div>
            
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h2 className="text-2xl font-extrabold text-white">ახალი ტრეიდი</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-2xl transition-colors">
                ✕
              </button>
            </div>
            
            <form className="space-y-5 relative z-10 font-medium">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-2">შესვლის დრო</label>
                  <input type="datetime-local" value={formData.openTime} onChange={(e) => setFormData({...formData, openTime: e.target.value})} className={glassInput} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-2">გამოსვლის დრო</label>
                  <input type="datetime-local" value={formData.closeTime} onChange={(e) => setFormData({...formData, closeTime: e.target.value})} className={glassInput} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-2">ინსტრუმენტი</label>
                  <select value={formData.instrument} onChange={(e) => setFormData({...formData, instrument: e.target.value})} className={glassInput}>
                    <option value="NQ" className="bg-slate-950">NQ</option>
                    <option value="ES" className="bg-slate-950">ES</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-2">ანგარიში</label>
                  <select value={formData.account} onChange={(e) => setFormData({...formData, account: e.target.value})} className={glassInput}>
                    <option value="Live Funded" className="bg-slate-950">Live Funded</option>
                    <option value="Evaluation" className="bg-slate-950">Evaluation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-2">სტრატეგია / სეთაფი</label>
                <input type="text" value={formData.setup} onChange={(e) => setFormData({...formData, setup: e.target.value})} placeholder="მაგ: FVG" className={glassInput} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-2">რისკი ($)</label>
                  <input type="number" value={formData.risk} onChange={(e) => setFormData({...formData, risk: e.target.value})} className={glassInput} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-2">დაგეგმილი P/L</label>
                  <input type="number" value={formData.targetPnl} onChange={(e) => setFormData({...formData, targetPnl: e.target.value})} className={glassInput} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-2">საბოლოო ($)</label>
                  <input type="number" value={formData.realizedPnl} onChange={(e) => setFormData({...formData, realizedPnl: e.target.value})} className={glassInput} placeholder="0.00" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-2">ფოტოების ატვირთვა</label>
                <input type="file" accept="image/*" multiple onChange={handleMultipleImageUpload} className="w-full bg-slate-950/60 backdrop-blur-md border border-white/15 rounded-2xl p-2.5 text-slate-200 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer transition-all" />
              </div>

              <button type="button" onClick={handleSave} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-2xl font-extrabold transition-all mt-4 shadow-[0_0_25px_rgba(59,130,246,0.6)] border border-blue-300/50">
                შენახვა ჟურნალში
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Gallery Modal */}
      {galleryImages && !zoomedImage && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-2xl flex items-center justify-center p-6 z-[60] overflow-y-auto">
          <div className="w-full max-w-6xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-extrabold text-white">ჩარტები</h3>
              <button onClick={() => setGalleryImages(null)} className="bg-white/15 hover:bg-white/25 text-white px-5 py-2.5 rounded-2xl text-sm font-bold transition-all">
                ✕ დახურვა
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {galleryImages.map((img, idx) => (
                <div key={idx} className="relative group bg-slate-900/70 p-3 rounded-3xl border border-white/20">
                  <img src={img} alt="Chart" className="w-full h-auto object-contain max-h-[45vh] rounded-2xl cursor-pointer" onClick={() => setZoomedImage(img)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Zoom Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-[70] p-4 cursor-zoom-out" onClick={() => setZoomedImage(null)}>
          <img src={zoomedImage} alt="Zoomed" className="max-w-full max-h-[90vh] object-contain rounded-2xl border border-white/20" />
        </div>
      )}
    </div>
  );
}