
export enum UpgradeType {
  CLICK = 'CLICK',
  AUTO = 'AUTO',
  PRESTIGE = 'PRESTIGE'
}

export enum QuestType {
  CLICKS = 'CLICKS',
  UPGRADES = 'UPGRADES',
  LEVEL = 'LEVEL'
}

export interface Quest {
  id: string;
  type: QuestType;
  description: string;
  goal: number;
  current: number;
  reward: number;
  completed: boolean;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  baseValue: number;
  type: UpgradeType;
  icon: string;
  maxLevel: number;
}

export interface PrestigeUpgrade extends Upgrade {
  // Prestige upgrades use prestigePoints as currency
}

export interface GameState {
  currency: number;
  totalCurrencyEarned: number;
  totalClicks: number;
  totalUpgradesBought: number;
  xp: number;
  level: number;
  upgrades: { [id: string]: number };
  prestigeUpgrades: { [id: string]: number };
  prestigePoints: number;
  lastDailyReset: number;
  dailyQuests: Quest[];
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  value: string;
  opacity: number;
}
