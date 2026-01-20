
import { Upgrade, UpgradeType, PrestigeUpgrade } from './types';

export const UPGRADES: Upgrade[] = [
  // CLICK UPGRADES
  {
    id: 'click_1',
    name: 'Cybernetic Finger',
    description: 'A reinforced synthetic digit for more precise clicking.',
    baseCost: 15,
    baseValue: 1,
    type: UpgradeType.CLICK,
    icon: '☝️',
    maxLevel: 100
  },
  {
    id: 'click_2',
    name: 'Neural Uplink',
    description: 'Directly connect your brain to the currency stream.',
    baseCost: 100,
    baseValue: 5,
    type: UpgradeType.CLICK,
    icon: '🧠',
    maxLevel: 100
  },
  {
    id: 'click_3',
    name: 'Quantum Glove',
    description: 'Manipulate subatomic particles to extract more value.',
    baseCost: 1000,
    baseValue: 25,
    type: UpgradeType.CLICK,
    icon: '🧤',
    maxLevel: 100
  },
  {
    id: 'click_4',
    name: 'Plasma Infuser',
    description: 'Charge your clicks with high-energy ionized gas.',
    baseCost: 12000,
    baseValue: 150,
    type: UpgradeType.CLICK,
    icon: '🔥',
    maxLevel: 100
  },
  {
    id: 'click_5',
    name: 'Singularity Tap',
    description: 'Harness the power of a localized black hole.',
    baseCost: 150000,
    baseValue: 1200,
    type: UpgradeType.CLICK,
    icon: '🕳️',
    maxLevel: 100
  },

  // AUTO UPGRADES
  {
    id: 'auto_1',
    name: 'Script Bot',
    description: 'A simple script that clicks for you automatically.',
    baseCost: 50,
    baseValue: 1,
    type: UpgradeType.AUTO,
    icon: '🤖',
    maxLevel: 100
  },
  {
    id: 'auto_2',
    name: 'Mining Rig',
    description: 'A stack of GPUs dedicated to mining the local economy.',
    baseCost: 500,
    baseValue: 10,
    type: UpgradeType.AUTO,
    icon: '🏗️',
    maxLevel: 100
  },
  {
    id: 'auto_3',
    name: 'Server Farm',
    description: 'An entire warehouse of processing power.',
    baseCost: 5000,
    baseValue: 60,
    type: UpgradeType.AUTO,
    icon: '🖥️',
    maxLevel: 100
  },
  {
    id: 'auto_4',
    name: 'AI Swarm',
    description: 'A distributed consciousness that optimizes everything.',
    baseCost: 45000,
    baseValue: 350,
    type: UpgradeType.AUTO,
    icon: '🐝',
    maxLevel: 100
  },
  {
    id: 'auto_5',
    name: 'Galactic Node',
    description: 'A beacon that pulls resources from across the galaxy.',
    baseCost: 600000,
    baseValue: 4000,
    type: UpgradeType.AUTO,
    icon: '🌌',
    maxLevel: 100
  },
];

export const PRESTIGE_UPGRADES: PrestigeUpgrade[] = [
  {
    id: 'pres_1',
    name: 'Iterative Learning',
    description: 'XP gain increased by 20% per level.',
    baseCost: 1,
    baseValue: 0.2,
    type: UpgradeType.PRESTIGE,
    icon: '📚',
    maxLevel: 10
  },
  {
    id: 'pres_2',
    name: 'Capital Optimization',
    description: 'Standard upgrade cost scaling reduced.',
    baseCost: 2,
    baseValue: 0.01,
    type: UpgradeType.PRESTIGE,
    icon: '📉',
    maxLevel: 5
  },
  {
    id: 'pres_3',
    name: 'Advanced Automation',
    description: 'Passive yield efficiency +25% per level.',
    baseCost: 3,
    baseValue: 0.25,
    type: UpgradeType.PRESTIGE,
    icon: '⚙️',
    maxLevel: 10
  },
  {
    id: 'pres_4',
    name: 'Precision Hacking',
    description: 'Click Power multiplier +25% per level.',
    baseCost: 3,
    baseValue: 0.25,
    type: UpgradeType.PRESTIGE,
    icon: '⚡',
    maxLevel: 10
  },
  {
    id: 'pres_5',
    name: 'Neural Plasticity',
    description: 'Increases the base Prestige multiplier efficiency.',
    baseCost: 5,
    baseValue: 0.05,
    type: UpgradeType.PRESTIGE,
    icon: '🧠',
    maxLevel: 5
  },
  {
    id: 'pres_6',
    name: 'Market Influence',
    description: 'All standard upgrade base costs reduced by 10%.',
    baseCost: 10,
    baseValue: 0.1,
    type: UpgradeType.PRESTIGE,
    icon: '🏛️',
    maxLevel: 5
  },
  {
    id: 'pres_7',
    name: 'Legacy Protocol',
    description: 'Quest rewards increased by 50% per level.',
    baseCost: 4,
    baseValue: 0.5,
    type: UpgradeType.PRESTIGE,
    icon: '📜',
    maxLevel: 5
  },
  {
    id: 'pres_8',
    name: 'Data Siphon',
    description: '5% chance to double XP from any source.',
    baseCost: 6,
    baseValue: 0.05,
    type: UpgradeType.PRESTIGE,
    icon: '🧪',
    maxLevel: 10
  },
  {
    id: 'pres_9',
    name: 'Quantum Stability',
    description: 'Reduces prestige threshold by 10% per level.',
    baseCost: 15,
    baseValue: 0.1,
    type: UpgradeType.PRESTIGE,
    icon: '🌀',
    maxLevel: 5
  },
  {
    id: 'pres_10',
    name: 'Zenith Singularity',
    description: 'Global yield multiplier +10% per level.',
    baseCost: 50,
    baseValue: 0.1,
    type: UpgradeType.PRESTIGE,
    icon: '🌟',
    maxLevel: 5
  },
];
