
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameState, UpgradeType, Particle, Upgrade, QuestType, Quest, PrestigeUpgrade } from './types';
import { UPGRADES, PRESTIGE_UPGRADES } from './constants';

const INITIAL_STATE: GameState = {
  currency: 0,
  totalCurrencyEarned: 0,
  totalClicks: 0,
  totalUpgradesBought: 0,
  xp: 0,
  level: 1,
  upgrades: {},
  prestigeUpgrades: {},
  prestigePoints: 0,
  lastDailyReset: 0,
  dailyQuests: [],
};

const XP_BASE = 100;
const XP_GROWTH = 1.6;
const PRESTIGE_THRESHOLD_BASE = 1000000; // $1M to start prestiging
const AUTO_SAVE_INTERVAL = 60000; // 60 seconds
const COST_GROWTH_BASE = 1.15;
const PRESTIGE_COST_GROWTH = 1.5;

const COMMANDS = ['-help', '-set_money', '-resetdata', '-upgrade_amount', '-prestige_amount', '-protocol_amount'];

export default function App() {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem('zenith_clicker_save_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...INITIAL_STATE, ...parsed }; // Ensure new properties exist
    }
    return INITIAL_STATE;
  });

  const [particles, setParticles] = useState<Particle[]>([]);
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [showPrestigeModal, setShowPrestigeModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'standard' | 'prestige'>('standard');
  const [lastSaved, setLastSaved] = useState<string>(new Date().toLocaleTimeString());
  
  // Console state
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [consoleInput, setConsoleInput] = useState('');
  const [consoleHistory, setConsoleHistory] = useState<string[]>(['ZENITH OS v2.4.3', 'Type -help for available commands.']);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  
  const lastUpdateRef = useRef<number>(Date.now());
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // --- Prestige Bonuses ---
  const getPresCount = (id: string) => state.prestigeUpgrades?.[id] || 0;
  
  const xpBonus = 1 + (getPresCount('pres_1') * 0.2);
  const costGrowthBonus = COST_GROWTH_BASE - (getPresCount('pres_2') * 0.01);
  const autoYieldBonus = 1 + (getPresCount('pres_3') * 0.25);
  const clickYieldBonus = 1 + (getPresCount('pres_4') * 0.25);
  const presMultiBonus = 0.15 + (getPresCount('pres_5') * 0.05);
  const baseCostReduction = 1 - (getPresCount('pres_6') * 0.1);
  const questBonus = 1 + (getPresCount('pres_7') * 0.5);
  const doubleXpChance = getPresCount('pres_8') * 0.05;
  const prestigeThresholdBonus = 1 - (getPresCount('pres_9') * 0.1);
  const globalBonus = 1 + (getPresCount('pres_10') * 0.1);

  const currentPrestigeThreshold = PRESTIGE_THRESHOLD_BASE * prestigeThresholdBonus;

  // --- Autocomplete Logic ---
  const suggestions = useMemo(() => {
    const input = consoleInput.toLowerCase();
    if (!input) return [];

    const parts = consoleInput.split(' ');
    const cmd = parts[0].toLowerCase();
    
    // Command suggestions
    if (parts.length === 1) {
      return COMMANDS.filter(c => c.startsWith(input));
    }

    // Parameter suggestions for -upgrade_amount
    if (cmd === '-upgrade_amount') {
      const partialName = parts.slice(1).join(' ').replace(/['"]/g, '').toLowerCase();
      return UPGRADES
        .map(u => `"${u.name}"`)
        .filter(name => name.toLowerCase().replace(/['"]/g, '').startsWith(partialName))
        .map(name => `-upgrade_amount ${name}`);
    }

    // Parameter suggestions for -protocol_amount
    if (cmd === '-protocol_amount') {
      const partialName = parts.slice(1).join(' ').replace(/['"]/g, '').toLowerCase();
      return PRESTIGE_UPGRADES
        .map(u => `"${u.name}"`)
        .filter(name => name.toLowerCase().replace(/['"]/g, '').startsWith(partialName))
        .map(name => `-protocol_amount ${name}`);
    }

    return [];
  }, [consoleInput]);

  useEffect(() => {
    setSuggestionIndex(0);
  }, [suggestions]);

  // --- Logic & Calculations ---
  
  const prestigeMultiplier = 1 + (state.prestigePoints * presMultiBonus);
  
  const getUpgradeCount = (id: string) => state.upgrades[id] || 0;
  
  const getUpgradeCost = (upgradeId: string) => {
    const upgrade = UPGRADES.find(u => u.id === upgradeId)!;
    const count = getUpgradeCount(upgradeId);
    return Math.floor((upgrade.baseCost * baseCostReduction) * Math.pow(costGrowthBonus, count));
  };

  const getPresUpgradeCost = (upgradeId: string) => {
    const upgrade = PRESTIGE_UPGRADES.find(u => u.id === upgradeId)!;
    const count = getPresCount(upgradeId);
    return Math.floor(upgrade.baseCost * Math.pow(PRESTIGE_COST_GROWTH, count));
  };

  const clickPower = (UPGRADES
    .filter(u => u.type === UpgradeType.CLICK)
    .reduce((acc, u) => acc + (getUpgradeCount(u.id) * u.baseValue), 1)) * prestigeMultiplier * clickYieldBonus * globalBonus;

  const autoIncome = (UPGRADES
    .filter(u => u.type === UpgradeType.AUTO)
    .reduce((acc, u) => acc + (getUpgradeCount(u.id) * u.baseValue), 0)) * prestigeMultiplier * autoYieldBonus * globalBonus;

  const xpToNextLevel = Math.floor(XP_BASE * Math.pow(XP_GROWTH, state.level - 1));

  const claimablePoints = Math.max(0, Math.floor(state.currency / currentPrestigeThreshold));

  // --- Save Mechanism ---
  useEffect(() => {
    localStorage.setItem('zenith_clicker_save_v2', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLastSaved(new Date().toLocaleTimeString());
      setShowSaveNotification(true);
      setTimeout(() => setShowSaveNotification(false), 3000);
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // --- Console Key Listener ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '=') {
        e.preventDefault();
        setIsConsoleOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isConsoleOpen) {
        setIsConsoleOpen(false);
      }
      
      if (isConsoleOpen && suggestions.length > 0) {
        if (e.key === 'Tab') {
          e.preventDefault();
          setConsoleInput(suggestions[suggestionIndex]);
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSuggestionIndex(prev => (prev + 1) % suggestions.length);
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConsoleOpen, suggestions, suggestionIndex]);

  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleHistory]);

  const handleConsoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = consoleInput.trim();
    if (!cmd) return;

    setConsoleHistory(prev => [...prev, `> ${cmd}`]);
    processCommand(cmd);
    setConsoleInput('');
  };

  const processCommand = (commandStr: string) => {
    const parts = commandStr.split(' ');
    const command = parts[0].toLowerCase();

    switch (command) {
      case '-help':
        setConsoleHistory(prev => [
          ...prev,
          'Available Commands:',
          '-help : Show this list',
          '-set_money [value] : Add assets to your sector',
          '-resetdata : Wipe all progress',
          '-upgrade_amount [name] [value] : Increase upgrade level',
          '-prestige_amount [value] : Add prestige points',
          '-protocol_amount [name] [value] : Increase protocol upgrade level'
        ]);
        break;

      case '-set_money':
        const amount = parseFloat(parts[1]);
        if (!isNaN(amount)) {
          setState(prev => ({ ...prev, currency: prev.currency + amount }));
          setConsoleHistory(prev => [...prev, `Success: Added $${amount.toLocaleString()} assets.`]);
        } else {
          setConsoleHistory(prev => [...prev, 'Error: Invalid amount. Usage: -set_money 1000']);
        }
        break;

      case '-prestige_amount':
        const pAmount = parseFloat(parts[1]);
        if (!isNaN(pAmount)) {
          setState(prev => ({ ...prev, prestigePoints: prev.prestigePoints + pAmount }));
          setConsoleHistory(prev => [...prev, `Success: Added ${pAmount.toLocaleString()} prestige points.`]);
        } else {
          setConsoleHistory(prev => [...prev, 'Error: Invalid amount. Usage: -prestige_amount 100']);
        }
        break;

      case '-resetdata':
        setState(INITIAL_STATE);
        localStorage.clear();
        setConsoleHistory(prev => [...prev, 'CRITICAL: System purged. All data wiped.']);
        break;

      case '-upgrade_amount':
      case '-protocol_amount':
        const isProtocol = command === '-protocol_amount';
        if (parts.length < 2) {
          setConsoleHistory(prev => [...prev, `Error: Missing parameters. Usage: ${command} "Upgrade Name" 10`]);
          return;
        }
        
        let lastPart = parts[parts.length - 1];
        let val = parseInt(lastPart);
        let nameRaw: string;

        if (isNaN(val)) {
          val = 1;
          nameRaw = parts.slice(1).join(' ').replace(/['"]/g, '').toLowerCase();
        } else {
          nameRaw = parts.slice(1, -1).join(' ').replace(/['"]/g, '').toLowerCase();
        }
        
        const list = isProtocol ? PRESTIGE_UPGRADES : UPGRADES;
        const item = list.find(u => u.name.toLowerCase() === nameRaw);

        if (item) {
          setState(prev => {
            if (isProtocol) {
              const current = prev.prestigeUpgrades[item.id] || 0;
              const next = Math.min(item.maxLevel, current + val);
              return {
                ...prev,
                prestigeUpgrades: { ...prev.prestigeUpgrades, [item.id]: next }
              };
            } else {
              const current = prev.upgrades[item.id] || 0;
              const next = Math.min(item.maxLevel, current + val);
              return {
                ...prev,
                upgrades: { ...prev.upgrades, [item.id]: next }
              };
            }
          });
          setConsoleHistory(prev => [...prev, `Success: ${item.name} increased by ${val} levels.`]);
        } else {
          setConsoleHistory(prev => [...prev, `Error: ${isProtocol ? 'Protocol' : 'Upgrade'} "${nameRaw}" not found.`]);
        }
        break;

      default:
        setConsoleHistory(prev => [...prev, `Unknown command: ${command}. Type -help for assistance.`]);
    }
  };

  // --- Quest System ---

  const generateQuests = useCallback(() => {
    const quests: Quest[] = [
      {
        id: 'q_clicks',
        type: QuestType.CLICKS,
        description: 'Sync Nexus 500 times',
        goal: 500,
        current: 0,
        reward: 5000 * (state.level) * questBonus,
        completed: false
      },
      {
        id: 'q_upgrades',
        type: QuestType.UPGRADES,
        description: 'Install 10 Augmentations',
        goal: 10,
        current: 0,
        reward: 10000 * (state.level) * questBonus,
        completed: false
      },
      {
        id: 'q_level',
        type: QuestType.LEVEL,
        description: 'Ascend 2 Levels',
        goal: state.level + 2,
        current: state.level,
        reward: 25000 * (state.level) * questBonus,
        completed: false
      }
    ];
    return quests;
  }, [state.level, questBonus]);

  useEffect(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if (now - state.lastDailyReset > oneDay || state.dailyQuests.length === 0) {
      setState(prev => ({
        ...prev,
        lastDailyReset: now,
        dailyQuests: generateQuests()
      }));
    }
  }, [state.lastDailyReset, generateQuests, state.dailyQuests.length]);

  const updateQuestProgress = (type: QuestType, amount: number, isAbsolute: boolean = false) => {
    setState(prev => ({
      ...prev,
      dailyQuests: prev.dailyQuests.map(q => {
        if (q.type === type && !q.completed) {
          const newCurrent = isAbsolute ? amount : q.current + amount;
          const completed = newCurrent >= q.goal;
          return { ...q, current: newCurrent, completed };
        }
        return q;
      })
    }));
  };

  useEffect(() => {
    state.dailyQuests.forEach(q => {
      if (q.completed && !localStorage.getItem(`quest_claimed_${q.id}_${state.lastDailyReset}`)) {
        localStorage.setItem(`quest_claimed_${q.id}_${state.lastDailyReset}`, 'true');
        addCurrency(q.reward, false);
      }
    });
  }, [state.dailyQuests, state.lastDailyReset]);

  // --- Core Loop ---

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastUpdateRef.current) / 1000;
      lastUpdateRef.current = now;

      if (autoIncome > 0) {
        addCurrency(autoIncome * delta, false);
      }

      setParticles(prev => prev.filter(p => p.opacity > 0).map(p => ({ ...p, opacity: p.opacity - 0.02, y: p.y - 1 })));
    }, 50);

    return () => clearInterval(timer);
  }, [autoIncome]);

  const addCurrency = useCallback((amount: number, isClick: boolean) => {
    setState(prev => {
      let newCurrency = prev.currency + amount;
      let newTotal = prev.totalCurrencyEarned + amount;
      
      let xpMult = xpBonus;
      if (Math.random() < doubleXpChance) xpMult *= 2;
      
      let newXp = prev.xp + ((isClick ? amount * 0.5 : amount * 0.1) * xpMult);
      let newLevel = prev.level;
      let newClicks = isClick ? prev.totalClicks + 1 : prev.totalClicks;

      let currentXpReq = Math.floor(XP_BASE * Math.pow(XP_GROWTH, newLevel - 1));
      while (newXp >= currentXpReq) {
        newXp -= currentXpReq;
        newLevel += 1;
        currentXpReq = Math.floor(XP_BASE * Math.pow(XP_GROWTH, newLevel - 1));
      }

      return {
        ...prev,
        currency: newCurrency,
        totalCurrencyEarned: newTotal,
        totalClicks: newClicks,
        xp: newXp,
        level: newLevel
      };
    });

    if (isClick) updateQuestProgress(QuestType.CLICKS, 1);
    updateQuestProgress(QuestType.LEVEL, state.level, true);
  }, [state.level, xpBonus, doubleXpChance]);

  const handleMainClick = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    setIsClicking(true);
    setTimeout(() => setIsClicking(false), 80);

    addCurrency(clickPower, true);
    setParticles(prev => [...prev.slice(-20), { id: Date.now(), x: clientX, y: clientY, value: `+${Math.floor(clickPower)}`, opacity: 1 }]);
  };

  const buyUpgrade = (id: string) => {
    const upgrade = UPGRADES.find(u => u.id === id)!;
    const currentCount = getUpgradeCount(id);
    if (currentCount >= upgrade.maxLevel) return;

    const cost = getUpgradeCost(id);
    if (state.currency >= cost) {
      setState(prev => ({
        ...prev,
        currency: prev.currency - cost,
        totalUpgradesBought: prev.totalUpgradesBought + 1,
        upgrades: { ...prev.upgrades, [id]: (prev.upgrades[id] || 0) + 1 }
      }));
      updateQuestProgress(QuestType.UPGRADES, 1);
    }
  };

  const buyPrestigeUpgrade = (id: string) => {
    const upgrade = PRESTIGE_UPGRADES.find(u => u.id === id)!;
    const currentCount = getPresCount(id);
    if (currentCount >= upgrade.maxLevel) return;

    const cost = getPresUpgradeCost(id);
    if (state.prestigePoints >= cost) {
      setState(prev => ({
        ...prev,
        prestigePoints: prev.prestigePoints - cost,
        prestigeUpgrades: { ...prev.prestigeUpgrades, [id]: currentCount + 1 }
      }));
    }
  };

  const buyMaxPrestigeUpgrade = (id: string) => {
    const upgrade = PRESTIGE_UPGRADES.find(u => u.id === id)!;
    const currentCount = getPresCount(id);
    const remainingLevels = upgrade.maxLevel - currentCount;
    if (remainingLevels <= 0) return;

    const r = PRESTIGE_COST_GROWTH;
    const affordableN = Math.floor(
      Math.log(
        ((state.prestigePoints * (r - 1)) / (upgrade.baseCost * Math.pow(r, currentCount))) + 1
      ) / Math.log(r)
    );

    const n = Math.min(affordableN, remainingLevels);
    if (n <= 0) return;

    const totalCost = Math.floor(
      upgrade.baseCost * Math.pow(r, currentCount) * (Math.pow(r, n) - 1) / (r - 1)
    );

    setState(prev => ({
      ...prev,
      prestigePoints: prev.prestigePoints - totalCost,
      prestigeUpgrades: { ...prev.prestigeUpgrades, [id]: currentCount + n }
    }));
  };

  const buyMaxUpgrade = (id: string) => {
    const upgrade = UPGRADES.find(u => u.id === id)!;
    const currentCount = getUpgradeCount(id);
    const remainingLevels = upgrade.maxLevel - currentCount;
    if (remainingLevels <= 0) return;

    // Fix: Using baseCostReduction instead of undefined baseReduction
    const baseCost = upgrade.baseCost * baseCostReduction;
    const affordableN = Math.floor(
      Math.log(
        ((state.currency * (costGrowthBonus - 1)) / (baseCost * Math.pow(costGrowthBonus, currentCount))) + 1
      ) / Math.log(costGrowthBonus)
    );

    const n = Math.min(affordableN, remainingLevels);
    if (n <= 0) return;

    const totalCost = Math.floor(
      baseCost * Math.pow(costGrowthBonus, currentCount) * (Math.pow(costGrowthBonus, n) - 1) / (costGrowthBonus - 1)
    );

    setState(prev => ({
      ...prev,
      currency: prev.currency - totalCost,
      totalUpgradesBought: prev.totalUpgradesBought + n,
      upgrades: { ...prev.upgrades, [id]: currentCount + n }
    }));
    updateQuestProgress(QuestType.UPGRADES, n);
  };

  const handlePrestigeSubmit = () => {
    const pointsToAward = claimablePoints;
    if (pointsToAward <= 0) return;

    setState(prev => ({
      ...INITIAL_STATE,
      prestigePoints: prev.prestigePoints + pointsToAward,
      prestigeUpgrades: prev.prestigeUpgrades, // Carry over prestige upgrades
      lastDailyReset: prev.lastDailyReset,
      dailyQuests: [...prev.dailyQuests],
      currency: 0,
      totalCurrencyEarned: 0,
      xp: 0,
      level: 1,
      upgrades: {},
      totalClicks: 0,
      totalUpgradesBought: 0
    }));
    setShowPrestigeModal(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 select-none bg-slate-950 text-slate-100">
      
      {/* HUD */}
      <div className="w-full max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Sector Assets" value={`$${Math.floor(state.currency).toLocaleString()}`} sub={`+${autoIncome.toFixed(1)}/s`} color="cyan" />
        <StatCard label="Nexus Level" value={state.level} sub={`${Math.floor(state.xp)} / ${xpToNextLevel} XP`} progress={(state.xp / xpToNextLevel) * 100} color="purple" />
        <StatCard label="Sync Power" value={Math.floor(clickPower).toLocaleString()} sub="Per manual sync" color="amber" />
        <StatCard label="Prestige Multi" value={`x${prestigeMultiplier.toFixed(2)}`} sub={`${state.prestigePoints} Points`} color="emerald" />
      </div>

      {/* TOP SECTION: THE NEXUS */}
      <div className="w-full max-w-5xl bg-slate-900/50 border border-slate-800 rounded-3xl p-8 mb-8 flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-sm">
        <div className="absolute top-4 right-6 flex flex-col items-end">
           <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Status</span>
           <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full animate-pulse ${showSaveNotification ? 'bg-cyan-400' : 'bg-emerald-500'}`}></span>
              <span className={`text-xs font-mono transition-colors ${showSaveNotification ? 'text-cyan-400' : 'text-emerald-400'}`}>
                {showSaveNotification ? 'SYSTEM BACKED UP' : 'UPLINK STABLE'}
              </span>
           </div>
        </div>

        <div 
          onClick={handleMainClick}
          className={`group relative cursor-pointer w-48 h-48 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-cyan-900/40 via-slate-900 to-purple-900/40 border-[6px] border-slate-800 shadow-[0_0_80px_rgba(34,211,238,0.15)] hover:shadow-[0_0_120px_rgba(34,211,238,0.3)] transition-all duration-75 flex items-center justify-center ${isClicking ? 'scale-95 brightness-110' : 'scale-100'}`}
        >
          <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-pulse"></div>
          <div className="relative z-10 flex flex-col items-center transition-transform duration-500">
             <span className={`text-6xl md:text-8xl mb-2 filter drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-transform ${isClicking ? 'scale-90' : 'scale-100'}`}>💎</span>
             <div className="text-cyan-400 font-bold uppercase tracking-widest text-[10px]">Sync Nexus</div>
          </div>
        </div>

        {/* QUESTS BAR */}
        <div className="mt-8 w-full max-w-2xl">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Daily Operations</h3>
             <span className="text-[10px] text-slate-500 uppercase">Resync In ~{(24 - new Date().getHours())}H</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {state.dailyQuests.map(q => (
              <div key={q.id} className={`p-2 rounded-lg border text-[10px] flex flex-col ${q.completed ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' : 'bg-slate-800/50 border-slate-700 text-slate-300'}`}>
                <span className="font-bold mb-1">{q.description}</span>
                <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden mt-auto">
                   <div className={`h-full transition-all ${q.completed ? 'bg-emerald-500' : 'bg-slate-500'}`} style={{width: `${Math.min(100, (q.current / q.goal) * 100)}%`}}></div>
                </div>
                <div className="flex justify-between mt-1 opacity-60">
                   <span>{q.completed ? 'CLAIMED' : `${Math.floor(q.current)}/${q.goal}`}</span>
                   <span>+${q.reward.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('standard')}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${activeTab === 'standard' ? 'bg-cyan-600 border-cyan-400 shadow-lg shadow-cyan-900/20' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'}`}
        >
          Neural Augments
        </button>
        <button 
          onClick={() => setActiveTab('prestige')}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${activeTab === 'prestige' ? 'bg-emerald-600 border-emerald-400 shadow-lg shadow-emerald-900/20' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'}`}
        >
          Prestige Protocol
        </button>
      </div>

      {/* UPGRADES CONTENT */}
      {activeTab === 'standard' ? (
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between px-1">
               <h2 className="text-xs font-bold text-cyan-500 uppercase tracking-widest flex items-center">
                 <span className="w-2 h-2 bg-cyan-500 rounded-full mr-2"></span> Augmentations
               </h2>
            </div>
            {UPGRADES.filter(u => u.type === UpgradeType.CLICK).map(u => (
              <UpgradeCard key={u.id} upgrade={u} count={getUpgradeCount(u.id)} cost={getUpgradeCost(u.id)} currentCurrency={state.currency} canAfford={state.currency >= getUpgradeCost(u.id)} onBuy={() => buyUpgrade(u.id)} onBuyMax={() => buyMaxUpgrade(u.id)} accentColor="cyan" multiplier={prestigeMultiplier * clickYieldBonus * globalBonus} costScaling={costGrowthBonus} baseReduction={baseCostReduction} />
            ))}
          </div>

          <div className="lg:col-span-4 space-y-4">
             <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl text-center sticky top-8">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest mb-4">Neural Hub</h3>
                <div className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 mb-4">
                  <div className="text-[10px] text-slate-500 uppercase mb-1">Claimable Prestige</div>
                  <div className="text-2xl font-black text-emerald-400 mono">{claimablePoints}</div>
                  <div className="text-[8px] text-slate-600 mt-2 uppercase tracking-widest">
                    Threshold: ${Math.floor(currentPrestigeThreshold).toLocaleString()}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mb-6 italic">Points based on current assets.</p>
                <button disabled={claimablePoints <= 0} onClick={() => setShowPrestigeModal(true)} className={`w-full py-3 rounded-lg font-bold uppercase tracking-widest text-xs transition-all ${claimablePoints > 0 ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg cursor-pointer' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
                  Neural Ascend
                </button>
             </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between px-1">
               <h2 className="text-xs font-bold text-purple-500 uppercase tracking-widest flex items-center">
                 <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span> Automation
               </h2>
            </div>
            {UPGRADES.filter(u => u.type === UpgradeType.AUTO).map(u => (
              <UpgradeCard key={u.id} upgrade={u} count={getUpgradeCount(u.id)} cost={getUpgradeCost(u.id)} currentCurrency={state.currency} canAfford={state.currency >= getUpgradeCost(u.id)} onBuy={() => buyUpgrade(u.id)} onBuyMax={() => buyMaxUpgrade(u.id)} accentColor="purple" multiplier={prestigeMultiplier * autoYieldBonus * globalBonus} costScaling={costGrowthBonus} baseReduction={baseCostReduction} />
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {PRESTIGE_UPGRADES.map(pu => (
            <PrestigeUpgradeCard 
              key={pu.id} 
              upgrade={pu} 
              count={getPresCount(pu.id)} 
              cost={getPresUpgradeCost(pu.id)} 
              currentPrestige={state.prestigePoints}
              canAfford={state.prestigePoints >= getPresUpgradeCost(pu.id)} 
              onBuy={() => buyPrestigeUpgrade(pu.id)} 
              onBuyMax={() => buyMaxPrestigeUpgrade(pu.id)}
            />
          ))}
        </div>
      )}

      {/* FOOTER STATS */}
      <div className="w-full max-w-5xl mt-auto py-6 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-slate-500 uppercase tracking-[0.2em]">
         <div className="flex items-center gap-4">
            <span>ZENITH SYSTEM // v2.4.3</span>
            <span className="hidden md:inline text-slate-700">|</span>
            <span className={showSaveNotification ? 'text-cyan-400' : ''}>
              {showSaveNotification ? 'BACKING UP DATA...' : `LAST BACKUP: ${lastSaved}`}
            </span>
         </div>
         <div className="flex gap-6">
            <button onClick={() => { if(confirm('RESET DATA?')) { setState(INITIAL_STATE); localStorage.clear(); window.location.reload(); } }} className="hover:text-red-400 transition-colors">WIPE CACHE</button>
            <span className="text-slate-700">|</span>
            <span>UPLINK: ACTIVE</span>
         </div>
      </div>

      {/* DEVELOPER CONSOLE */}
      {isConsoleOpen && (
        <div className="fixed inset-x-0 bottom-0 z-[200] h-64 bg-black/95 border-t-2 border-cyan-500/50 backdrop-blur-2xl flex flex-col p-4 font-mono">
          <div className="flex justify-between items-center mb-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Developer Terminal</span>
            </div>
            <button onClick={() => setIsConsoleOpen(false)} className="text-slate-500 hover:text-white text-xs uppercase">[Close]</button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar mb-2 text-[11px] space-y-1">
            {consoleHistory.map((line, i) => (
              <div key={i} className={line.startsWith('>') ? 'text-white' : line.startsWith('Error') ? 'text-red-400' : line.startsWith('Success') ? 'text-emerald-400' : 'text-cyan-500/80'}>
                {line}
              </div>
            ))}
            <div ref={consoleBottomRef}></div>
          </div>

          {suggestions.length > 0 && (
            <div className="absolute bottom-[64px] left-4 bg-slate-900/90 border border-slate-700 rounded-lg p-1 min-w-[200px] z-[210] shadow-2xl backdrop-blur-md">
              <div className="text-[8px] text-slate-500 uppercase tracking-widest px-2 pb-1 border-b border-slate-800 mb-1">Suggestions [Tab to apply]</div>
              {suggestions.map((s, i) => (
                <div 
                  key={s} 
                  className={`px-2 py-1 text-[10px] rounded cursor-pointer transition-colors flex items-center gap-2 ${i === suggestionIndex ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
                  onClick={() => setConsoleInput(s)}
                >
                  <span className={i === suggestionIndex ? 'opacity-100' : 'opacity-0'}>&gt;</span>
                  {s}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleConsoleSubmit} className="flex items-center gap-3 relative">
            <span className="text-cyan-400 font-bold">$</span>
            <input 
              autoFocus
              type="text"
              value={consoleInput}
              onChange={(e) => setConsoleInput(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-white text-[12px] placeholder:text-slate-700"
              placeholder="Enter system command..."
            />
          </form>
        </div>
      )}

      {/* PRESTIGE CONFIRMATION MODAL */}
      {showPrestigeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-8 shadow-[0_0_100px_rgba(16,185,129,0.2)] animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30">
                <span className="text-3xl">🔋</span>
              </div>
              
              <h2 className="text-xl font-black uppercase tracking-widest text-white mb-2">Neural Ascension Protocol</h2>
              <p className="text-slate-400 text-xs leading-relaxed mb-8">
                Initiating a system-wide reset will reallocate current sector assets into core neural processors.
              </p>

              <div className="w-full grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-slate-950 rounded-2xl border border-red-500/20">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">Reseting Assets</div>
                  <ul className="text-[10px] text-red-400 space-y-1 font-mono uppercase text-left">
                    <li>- ${Math.floor(state.currency).toLocaleString()} Assets</li>
                    <li>- LVL {state.level} Clearance</li>
                    <li>- All Augmentations</li>
                  </ul>
                </div>
                <div className="p-4 bg-slate-950 rounded-2xl border border-emerald-500/20">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">Acquiring Core</div>
                  <ul className="text-[10px] text-emerald-400 space-y-1 font-mono uppercase text-left">
                    <li>+ {claimablePoints} Prestige Pts</li>
                    <li>+ {(claimablePoints * presMultiBonus * 100).toFixed(0)}% Yield Boost</li>
                    <li>Permanent Uplink</li>
                  </ul>
                </div>
              </div>

              <div className="w-full space-y-3">
                <button 
                  onClick={handlePrestigeSubmit}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-[0.2em] text-xs rounded-xl shadow-lg shadow-emerald-900/20 transition-all hover:scale-[1.02] active:scale-95"
                >
                  Confirm Ascension
                </button>
                <button 
                  onClick={() => setShowPrestigeModal(false)}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-widest text-[10px] rounded-xl transition-all"
                >
                  Abort Protocol
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PARTICLES */}
      {particles.map(p => (
        <div key={p.id} className="fixed pointer-events-none font-black text-xl z-50 transition-opacity" style={{ left: p.x - 20, top: p.y - 20, opacity: p.opacity, color: '#22d3ee', textShadow: '0 0 10px rgba(0,0,0,0.5)' }}>
          {p.value}
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, progress, color }: any) {
  const colorMap: any = {
    cyan: 'border-cyan-500/30 text-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.05)]',
    purple: 'border-purple-500/30 text-purple-400 shadow-[inset_0_0_20px_rgba(168,85,247,0.05)]',
    amber: 'border-amber-500/30 text-amber-400 shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]',
    emerald: 'border-emerald-500/30 text-emerald-400 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]'
  };
  return (
    <div className={`bg-slate-900/50 border p-3 rounded-xl backdrop-blur-md flex flex-col ${colorMap[color]}`}>
      <span className="text-[9px] uppercase tracking-tighter opacity-70">{label}</span>
      <span className="text-lg md:text-xl font-black mono text-white truncate">{value}</span>
      {progress !== undefined && (
        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden my-1">
          <div className={`h-full transition-all duration-300 ${color === 'purple' ? 'bg-purple-500' : 'bg-slate-500'}`} style={{ width: `${progress}%` }} />
        </div>
      )}
      <span className="text-[9px] text-slate-500 uppercase truncate">{sub}</span>
    </div>
  );
}

function PrestigeUpgradeCard({ upgrade, count, cost, currentPrestige, canAfford, onBuy, onBuyMax }: any) {
  const isMaxed = count >= upgrade.maxLevel;

  const affordableN = useMemo(() => {
    if (isMaxed) return 0;
    const remainingLevels = upgrade.maxLevel - count;
    const r = PRESTIGE_COST_GROWTH;
    const n = Math.floor(
      Math.log(
        ((currentPrestige * (r - 1)) / (upgrade.baseCost * Math.pow(r, count))) + 1
      ) / Math.log(r)
    );
    return Math.max(0, Math.min(n, remainingLevels));
  }, [upgrade, count, currentPrestige, isMaxed]);

  const cardBorderClass = isMaxed 
    ? 'border-emerald-500 bg-emerald-950/20' 
    : canAfford
      ? 'border-emerald-500/30 bg-slate-900/60 hover:border-emerald-400'
      : 'border-slate-800 bg-slate-900/40 opacity-70 grayscale';

  const maxBtnClass = isMaxed
    ? 'hidden'
    : affordableN > 0
      ? 'bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-400 border border-emerald-500/30'
      : 'bg-slate-900/50 text-slate-700 border border-slate-800 cursor-not-allowed';

  return (
    <div 
      className={`relative border p-4 rounded-2xl transition-all duration-300 group ${canAfford && !isMaxed ? 'hover:scale-[1.02]' : ''} ${cardBorderClass}`}
    >
      <div className="flex items-center gap-4 mb-3">
        <div className="text-3xl p-2 bg-slate-800 rounded-xl group-hover:scale-110 transition-transform">
          {upgrade.icon}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-black uppercase tracking-wide text-white">{upgrade.name}</h3>
            <span className="text-[10px] font-mono font-bold text-emerald-400">{count} / {upgrade.maxLevel}</span>
          </div>
          <p className="text-[9px] text-slate-500 italic mt-1">{upgrade.description}</p>
        </div>
      </div>
      
      <div className="flex gap-2">
        {!isMaxed && (
          <button 
            onClick={(e) => { e.stopPropagation(); onBuyMax(); }}
            disabled={affordableN <= 0}
            className={`px-3 rounded-xl text-[9px] font-black transition-all uppercase tracking-tighter ${maxBtnClass} min-w-[50px]`}
          >
            MAX({affordableN})
          </button>
        )}
        <button 
          onClick={(e) => { e.stopPropagation(); onBuy(); }}
          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isMaxed ? 'bg-emerald-900/30 text-emerald-500 border border-emerald-500/20' : canAfford ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg' : 'bg-slate-800 text-slate-500'}`}
        >
          {isMaxed ? 'MAXED' : `${cost} PRESTIGE`}
        </button>
      </div>
    </div>
  );
}

function UpgradeCard({ upgrade, count, cost, currentCurrency, canAfford, onBuy, onBuyMax, accentColor, multiplier, costScaling, baseReduction }: any) {
  const isCyan = accentColor === 'cyan';
  const isMaxed = count >= upgrade.maxLevel;

  const affordableN = useMemo(() => {
    if (isMaxed) return 0;
    const remainingLevels = upgrade.maxLevel - count;
    const baseCost = upgrade.baseCost * baseReduction;
    const n = Math.floor(
      Math.log(
        ((currentCurrency * (costScaling - 1)) / (baseCost * Math.pow(costScaling, count))) + 1
      ) / Math.log(costScaling)
    );
    return Math.max(0, Math.min(n, remainingLevels));
  }, [upgrade, count, currentCurrency, isMaxed, costScaling, baseReduction]);

  const cardBorderClass = isMaxed 
    ? 'border-amber-500 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
    : !canAfford
      ? 'border-slate-800 bg-slate-900/40 opacity-70 grayscale-[0.2]'
      : isCyan 
        ? 'border-cyan-500/30 bg-slate-900/60 hover:border-cyan-400/80 hover:shadow-[0_0_25px_rgba(34,211,238,0.15)] hover:bg-slate-900/80' 
        : 'border-purple-500/30 bg-slate-900/60 hover:border-purple-400/80 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)] hover:bg-slate-900/80';

  const textClass = isMaxed ? 'text-amber-400' : isCyan ? 'text-cyan-400' : 'text-purple-400';
  
  const btnClass = isMaxed 
    ? 'bg-amber-600/20 text-amber-500 border border-amber-500/40 cursor-default ring-1 ring-amber-500/20' 
    : canAfford 
      ? `${isCyan ? 'bg-cyan-500 hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-purple-500 hover:bg-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)]'} text-white active:scale-95 active:brightness-90 ring-1 ring-white/20` 
      : 'bg-slate-900 text-slate-600 border border-slate-700/50 cursor-not-allowed opacity-50 grayscale ring-0';

  const maxBtnClass = isMaxed
    ? 'hidden'
    : affordableN > 0
      ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 shadow-lg'
      : 'bg-slate-900/50 text-slate-700 border border-slate-800 cursor-not-allowed';

  const currentYield = count * upgrade.baseValue * multiplier;
  const nextYield = (count + 1) * upgrade.baseValue * multiplier;

  return (
    <div 
      className={`group relative border p-3.5 rounded-2xl transition-all duration-300 transform ${!isMaxed && canAfford ? 'hover:scale-[1.02]' : ''} ${cardBorderClass}`}
    >
      <div className="invisible group-hover:visible absolute left-0 bottom-full mb-4 w-60 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
         <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl backdrop-blur-2xl ring-1 ring-white/10">
            <h4 className="text-[11px] font-black uppercase text-white tracking-[0.1em] border-b border-slate-800 pb-2.5 mb-2.5 flex items-center justify-between">
              <span>{upgrade.name}</span>
              <span className="text-[9px] text-slate-500 font-mono">ID: {upgrade.id}</span>
            </h4>
            <div className="space-y-2.5 text-[10px] uppercase tracking-wider">
               <div className="flex justify-between">
                  <span className="text-slate-500">Tier Progress</span>
                  <span className="text-white font-bold">{count} / {upgrade.maxLevel}</span>
               </div>
               <div className="flex justify-between">
                  <span className="text-slate-500">Deployment Cost</span>
                  <span className={canAfford ? 'text-emerald-400 font-bold' : 'text-rose-500 font-bold'}>${cost.toLocaleString()}</span>
               </div>
               <div className="flex justify-between pt-2 border-t border-slate-800/50">
                  <span className="text-slate-500">Active Output</span>
                  <span className={textClass}>+{Math.floor(currentYield).toLocaleString()}</span>
               </div>
               {!isMaxed && (
                 <div className="flex justify-between">
                    <span className="text-slate-500">Next Iteration</span>
                    <span className="text-white">+{Math.floor(nextYield).toLocaleString()}</span>
                 </div>
               )}
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-slate-700"></div>
         </div>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div className={`text-3xl p-2.5 rounded-xl transition-all duration-500 ${!canAfford && !isMaxed ? 'bg-slate-800/50 grayscale opacity-40 scale-90' : 'bg-slate-800 shadow-inner'} group-hover:rotate-3`}>
          {upgrade.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h3 className={`text-xs font-black uppercase tracking-wide leading-tight truncate ${!canAfford && !isMaxed ? 'text-slate-500' : 'text-white'}`}>
              {upgrade.name}
            </h3>
            <span className={`text-[10px] font-mono font-black ml-2 px-1.5 py-0.5 rounded ${isMaxed ? 'bg-amber-500/20 text-amber-500' : 'text-slate-400'}`}>
              {count}
            </span>
          </div>
          <p className="text-[9px] text-slate-600 font-medium leading-relaxed mt-1.5 italic group-hover:text-slate-500 transition-colors">
            {upgrade.description}
          </p>
        </div>
      </div>

      <div className="flex items-end justify-between mt-3 gap-2">
        <div className="flex flex-col">
          <span className="text-[8px] text-slate-600 uppercase tracking-widest font-bold mb-0.5">Yield Efficiency</span>
          <span className={`text-[11px] font-black mono ${textClass}`}>
            +{upgrade.baseValue}{upgrade.type === UpgradeType.CLICK ? ' Sync' : '/s'}
          </span>
        </div>
        
        <div className="flex gap-1.5 flex-1">
          {!isMaxed && (
            <button 
              onClick={(e) => { e.stopPropagation(); onBuyMax(); }}
              disabled={affordableN <= 0}
              className={`px-2 rounded-xl text-[9px] font-black transition-all uppercase tracking-tighter ${maxBtnClass} min-w-[50px]`}
            >
              MAX({affordableN})
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onBuy(); }}
            className={`flex-1 flex items-center justify-center py-2 px-3 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${btnClass}`}
            title={isMaxed ? 'Maximum level reached' : canAfford ? 'Purchase Upgrade' : 'Insufficient Assets'}
          >
            {isMaxed ? (
              <span className="flex items-center gap-1.5">
                <span className="text-xs">✦</span> MAXED
              </span>
            ) : (
              <span className="flex flex-col items-center">
                <span className={`text-[8px] ${canAfford ? 'text-white/80' : 'text-rose-400/70'} leading-none mb-0.5`}>
                  {canAfford ? 'PURCHASE' : 'LOCKED'}
                </span>
                <span className="leading-none text-[11px]">${cost.toLocaleString()}</span>
              </span>
            )}
          </button>
        </div>
      </div>
      
      {!isMaxed && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800/30 overflow-hidden rounded-b-2xl">
          <div 
            className={`h-full transition-all duration-700 ease-out ${canAfford ? (isCyan ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]') : 'bg-slate-700'}`}
            style={{ width: `${(count / upgrade.maxLevel) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
