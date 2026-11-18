import type { GameStats } from '../types';
import { parseCampaignSave, type CampaignSave } from './campaignSave';

export const WALLET_KEY = 'unknownUniverse.wallet.v1';
export interface LevelResult {
  receiptId: string; level: number; points: number; totalPoints: number; gems: number; monsters: number;
  pickupGold: number; clearGold: number; performanceGold: number; earnedGold: number;
}
export interface PendingResult { result: LevelResult; campaign: CampaignSave }
export interface Wallet { version: 1; gold: number; receipts: string[]; pending: PendingResult | null }
export const emptyWallet = (): Wallet => ({version:1,gold:0,receipts:[],pending:null});

/** A level's starting totals survive checkpoints, quit/resume, and renderer remounts. */
export function trackRewardRun(stats: GameStats): GameStats {
  const runId=()=>crypto.randomUUID?.()??Array.from(crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16).padStart(8,'0')).join('-');
  return stats.rewardProgress ? stats : {...stats,rewardProgress:{runId:runId(),
    startScore:stats.score,startGems:stats.souls,startMonsters:stats.monstersDefeated}};
}
export function nextRewardLevel(stats: GameStats): GameStats {
  const tracked=trackRewardRun(stats);
  return {...tracked,collectedGems:undefined,rewardProgress:{runId:tracked.rewardProgress!.runId,
    startScore:stats.score,startGems:stats.souls,startMonsters:stats.monstersDefeated}};
}
export function levelResult(before: GameStats, after: GameStats): LevelResult {
  const start=trackRewardRun(before).rewardProgress!;
  const points=Math.max(0,after.score-start.startScore),gems=Math.max(0,after.souls-start.startGems);
  const pickupGold=gems*5,clearGold=100;
  // Coins already grant 100 points; don't turn their points or the clear bonus into a second payout.
  const performanceGold=Math.min(150,Math.floor(Math.max(0,points-gems*100-900)/1000)*10);
  return {receiptId:`${start.runId}:${before.level}`,level:before.level,points,totalPoints:after.score,gems,
    monsters:Math.max(0,after.monstersDefeated-start.startMonsters),pickupGold,clearGold,performanceGold,
    earnedGold:pickupGold+clearGold+performanceGold};
}

/** An unfinished attempt can show its tally without crediting completion rewards. */
export function unfinishedLevelResult(stats: GameStats): LevelResult {
  return {...levelResult(stats,stats),pickupGold:0,clearGold:0,performanceGold:0,earnedGold:0};
}

export function readWallet(defaults: GameStats): Wallet {
  try {
    const raw=localStorage.getItem(WALLET_KEY);
    if (!raw) return emptyWallet();
    const w=JSON.parse(raw);
    if(w.version!==1||!Number.isSafeInteger(w.gold)||w.gold<0||w.gold>1e9||!Array.isArray(w.receipts)
      ||!w.receipts.every((id:unknown)=>typeof id==='string'&&/^[a-zA-Z0-9-]{1,80}:[1-6]$/.test(id))) return emptyWallet();
    let pending:PendingResult|null=null;
    if(w.pending){
      const r=w.pending.result,campaign=parseCampaignSave(JSON.stringify(w.pending.campaign),defaults,true);
      if(!r||!campaign||!Number.isInteger(r.level)||r.level<1||r.level>6||!w.receipts.includes(r.receiptId)
        ||r.receiptId!==`${campaign.stats.rewardProgress?.runId}:${r.level}`
        ||campaign.story!==`level${r.level}`||campaign.stats.level!==Math.min(6,r.level+1)
        ||!['points','totalPoints','gems','monsters','pickupGold','clearGold','performanceGold','earnedGold']
          .every(k=>Number.isSafeInteger(r[k])&&r[k]>=0&&r[k]<=1e9)
        ||r.pickupGold!==r.gems*5||r.clearGold!==100||r.performanceGold>150
        ||r.earnedGold!==r.pickupGold+r.clearGold+r.performanceGold||r.totalPoints!==campaign.stats.score) return emptyWallet();
      pending={result:r,campaign};
    }
    return {version:1,gold:w.gold,receipts:[...new Set<string>(w.receipts)],pending};
  } catch { return emptyWallet(); }
}

/** Credit and pending results are one atomic storage write, so reload cannot split them. */
export function bankLevelResult(wallet: Wallet, pending: PendingResult): Wallet {
  const claimed=wallet.receipts.includes(pending.result.receiptId);
  const next:Wallet={version:1,gold:wallet.gold+(claimed?0:pending.result.earnedGold),
    receipts:claimed?wallet.receipts:[...wallet.receipts,pending.result.receiptId],pending};
  localStorage.setItem(WALLET_KEY,JSON.stringify(next));
  return next;
}
export function acknowledgeResults(wallet: Wallet): Wallet {
  const next:Wallet={...wallet,pending:null};
  localStorage.setItem(WALLET_KEY,JSON.stringify(next));
  return next;
}
