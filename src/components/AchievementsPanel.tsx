import React, { useMemo } from 'react';
import {
  Award,
  CarFront,
  CheckCircle2,
  Coins,
  Crown,
  Eye,
  Flame,
  Gauge,
  Ghost,
  Globe,
  Lock,
  Magnet,
  Rocket,
  Route,
  Shield,
  Skull,
  Sparkles,
  Star,
  Target,
  Trophy,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  AchievementCategory,
  AchievementIconId,
  AchievementTier,
  AchievementView,
} from '../types/game';

interface AchievementsPanelProps {
  achievements: AchievementView[];
  selectedCategory: 'all' | AchievementCategory;
  onSelectCategory: (cat: 'all' | AchievementCategory) => void;
  onClaimAchievement: (id: string) => void;
}

interface TierStyle {
  label: string;
  pillClass: string;
  medallionBg: string;
  medallionBorder: string;
  iconColor: string;
  barClass: string;
  cardBorder: string;
  dotColor: string;
}

const TIER_STYLES: Record<AchievementTier, TierStyle> = {
  bronze: {
    label: 'Bronz',
    pillClass: 'border-amber-700/50 bg-amber-900/30 text-amber-300',
    medallionBg:
      'linear-gradient(145deg, rgba(180,83,9,0.42) 0%, rgba(69,26,3,0.72) 100%)',
    medallionBorder: 'border-amber-600/50',
    iconColor: '#f59e0b',
    barClass: 'bg-gradient-to-r from-amber-600 to-amber-400',
    cardBorder: 'border-white/10',
    dotColor: '#d97706',
  },
  silver: {
    label: 'Gümüş',
    pillClass: 'border-slate-400/40 bg-slate-500/20 text-slate-200',
    medallionBg:
      'linear-gradient(145deg, rgba(148,163,184,0.34) 0%, rgba(30,41,59,0.76) 100%)',
    medallionBorder: 'border-slate-300/45',
    iconColor: '#e2e8f0',
    barClass: 'bg-gradient-to-r from-slate-400 to-slate-200',
    cardBorder: 'border-slate-400/18',
    dotColor: '#cbd5e1',
  },
  gold: {
    label: 'Altın',
    pillClass: 'border-amber-400/55 bg-amber-500/20 text-amber-200',
    medallionBg:
      'linear-gradient(145deg, rgba(245,158,11,0.42) 0%, rgba(120,53,15,0.72) 100%)',
    medallionBorder: 'border-amber-400/60',
    iconColor: '#fde047',
    barClass: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300',
    cardBorder: 'border-amber-400/22',
    dotColor: '#facc15',
  },
  diamond: {
    label: 'Elmas',
    pillClass: 'border-cyan-400/55 bg-cyan-500/20 text-cyan-200',
    medallionBg:
      'linear-gradient(145deg, rgba(34,211,238,0.38) 0%, rgba(12,74,110,0.78) 100%)',
    medallionBorder: 'border-cyan-300/60',
    iconColor: '#67e8f9',
    barClass: 'bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-300',
    cardBorder: 'border-cyan-400/25',
    dotColor: '#22d3ee',
  },
  mythic: {
    label: 'Efsanevi',
    pillClass: 'border-rose-400/60 bg-rose-500/22 text-rose-200',
    medallionBg:
      'linear-gradient(145deg, rgba(244,63,94,0.45) 0%, rgba(126,34,206,0.58) 55%, rgba(49,10,36,0.85) 100%)',
    medallionBorder: 'border-rose-400/65',
    iconColor: '#fda4af',
    barClass: 'bg-gradient-to-r from-rose-500 via-fuchsia-400 to-amber-300',
    cardBorder: 'border-rose-400/30',
    dotColor: '#fb7185',
  },
};

const TIER_ORDER: readonly AchievementTier[] = [
  'bronze',
  'silver',
  'gold',
  'diamond',
  'mythic',
];

const CATEGORY_TABS: {
  id: 'all' | AchievementCategory;
  label: string;
  Icon: React.FC<{ className?: string }>;
  accentActive?: string;
}[] = [
  { id: 'all', label: 'Tümü', Icon: Award },
  {
    id: 'extreme',
    label: 'Zorlu',
    Icon: Skull,
    accentActive: 'border-rose-400/75 bg-rose-500/22 text-rose-200',
  },
  { id: 'speed', label: 'Hız', Icon: Gauge },
  { id: 'skill', label: 'Makas', Icon: Zap },
  { id: 'drift', label: 'Drift', Icon: Flame },
  { id: 'events', label: 'Yol', Icon: Rocket },
  { id: 'garage', label: 'Garaj', Icon: CarFront },
];

const renderAchievementIcon = (
  iconId: AchievementIconId,
  className: string,
  color: string,
) => {
  const style = { color };
  switch (iconId) {
    case 'gauge':
      return <Gauge className={className} style={style} />;
    case 'zap':
    case 'bolt':
      return <Zap className={className} style={style} />;
    case 'flame':
      return <Flame className={className} style={style} />;
    case 'route':
      return <Route className={className} style={style} />;
    case 'globe':
      return <Globe className={className} style={style} />;
    case 'sparkles':
      return <Sparkles className={className} style={style} />;
    case 'target':
      return <Target className={className} style={style} />;
    case 'ghost':
      return <Ghost className={className} style={style} />;
    case 'trophy':
      return <Trophy className={className} style={style} />;
    case 'crown':
      return <Crown className={className} style={style} />;
    case 'wind':
      return <Wind className={className} style={style} />;
    case 'wrench':
      return <Wrench className={className} style={style} />;
    case 'magnet':
      return <Magnet className={className} style={style} />;
    case 'rocket':
      return <Rocket className={className} style={style} />;
    case 'shield':
      return <Shield className={className} style={style} />;
    case 'coins':
      return <Coins className={className} style={style} />;
    case 'car':
      return <CarFront className={className} style={style} />;
    case 'star':
      return <Star className={className} style={style} />;
    case 'skull':
      return <Skull className={className} style={style} />;
    case 'eye':
      return <Eye className={className} style={style} />;
    default:
      return <Award className={className} style={style} />;
  }
};

export const AchievementsPanel: React.FC<AchievementsPanelProps> = ({
  achievements,
  selectedCategory,
  onSelectCategory,
  onClaimAchievement,
}) => {
  const stats = useMemo(() => {
    const total = achievements.length;
    let unlocked = 0;
    let totalGoldPotential = 0;
    let earnedGold = 0;
    const tierCounts: Record<AchievementTier, { unlocked: number; total: number }> = {
      bronze: { unlocked: 0, total: 0 },
      silver: { unlocked: 0, total: 0 },
      gold: { unlocked: 0, total: 0 },
      diamond: { unlocked: 0, total: 0 },
      mythic: { unlocked: 0, total: 0 },
    };

    for (const a of achievements) {
      totalGoldPotential += a.rewardGold;
      tierCounts[a.tier].total++;
      if (a.unlocked) {
        unlocked++;
        tierCounts[a.tier].unlocked++;
        if (a.claimed) earnedGold += a.rewardGold;
      }
    }
    const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;
    return { total, unlocked, pct, totalGoldPotential, earnedGold, tierCounts };
  }, [achievements]);

  const filteredList = useMemo(() => {
    return achievements
      .filter(
        (ach) =>
          selectedCategory === 'all' || ach.category === selectedCategory,
      )
      .slice()
      .sort((a, b) => {
        const aRank = a.unlocked && !a.claimed ? 0 : !a.unlocked ? 1 : 2;
        const bRank = b.unlocked && !b.claimed ? 0 : !b.unlocked ? 1 : 2;
        if (aRank !== bRank) return aRank - bRank;
        // Among in-progress achievements, surface those closest to completion first
        if (aRank === 1) {
          const aPct = a.progress / Math.max(1, a.target);
          const bPct = b.progress / Math.max(1, b.target);
          if (Math.abs(bPct - aPct) > 0.05) return bPct - aPct;
        }
        return 0;
      });
  }, [achievements, selectedCategory]);

  // Radial ring geometry
  const ringR = 22;
  const ringCircumference = 2 * Math.PI * ringR;
  const ringOffset = ringCircumference * (1 - stats.pct / 100);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Trophy Hall Hero Summary Card */}
      <div className="mt-2.5 shrink-0 rounded-2xl border border-white/10 bg-gradient-to-br from-[#181d2b] via-[#131722] to-[#0f121a] p-3">
        <div className="flex items-center gap-3">
          {/* Radial Completion Ring */}
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
            <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
              <circle
                cx="28"
                cy="28"
                r={ringR}
                fill="none"
                stroke="rgba(255,255,255,0.09)"
                strokeWidth="4.5"
              />
              <circle
                cx="28"
                cy="28"
                r={ringR}
                fill="none"
                stroke="url(#achHeroGrad)"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
              />
              <defs>
                <linearGradient id="achHeroGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="55%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
              <span className="font-mono-num text-xs font-black text-white">
                %{stats.pct}
              </span>
            </div>
          </div>

          {/* Progress & Tier Medal Strip */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-display text-sm font-extrabold text-white">
                <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Kupa Salonu</span>
              </span>
              <span className="font-mono-num text-xs font-extrabold text-amber-300">
                {stats.unlocked}/{stats.total} Açık
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {TIER_ORDER.map((tier) => {
                const ts = TIER_STYLES[tier];
                const tc = stats.tierCounts[tier];
                return (
                  <span
                    key={tier}
                    className="inline-flex items-center gap-1 rounded-md border border-white/8 bg-zinc-950/75 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300 font-mono-num"
                    title={`${ts.label}: ${tc.unlocked}/${tc.total}`}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: ts.dotColor }}
                    />
                    <span>
                      {tc.unlocked}/{tc.total}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Strip with Icons */}
      <div className="no-scrollbar mt-2.5 flex shrink-0 items-center gap-1.5 overflow-x-auto pb-0.5">
        {CATEGORY_TABS.map(({ id, label, Icon, accentActive }) => {
          const catItems =
            id === 'all'
              ? achievements
              : achievements.filter((a) => a.category === id);
          const catUnlocked = catItems.filter((a) => a.unlocked).length;
          const catClaimable = catItems.filter(
            (a) => a.unlocked && !a.claimed,
          ).length;
          const active = selectedCategory === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectCategory(id)}
              className={`ug-skew inline-flex min-h-[36px] shrink-0 items-center gap-1.5 border px-3 py-1.5 font-display italic text-xs font-bold uppercase tracking-wide transition-all cursor-pointer ${
                active
                  ? accentActive || 'ug-tab-active border-orange-400/75'
                  : 'border-white/10 bg-[#111520] text-zinc-400 hover:border-orange-500/40 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{label}</span>
              <span className="font-mono-num text-[11px] opacity-85">
                {catUnlocked}/{catItems.length}
              </span>
              {catClaimable > 0 && (
                <span
                  className="h-2 w-2 rounded-full bg-emerald-400"
                  aria-label={`${catClaimable} toplanabilir ödül`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Scrollable Trophy Cards List */}
      <div className="mt-2.5 flex-1 space-y-2.5 overflow-y-auto pr-1 custom-scroll">
        {filteredList.map((ach) => {
          const pct = Math.min(
            100,
            Math.round((ach.progress / Math.max(1, ach.target)) * 100),
          );
          const canClaim = ach.unlocked && !ach.claimed;
          const ts = TIER_STYLES[ach.tier];

          const medallion = (
            <div
              className={`ug-cut-sm relative flex h-12 w-12 shrink-0 items-center justify-center border ${ts.medallionBorder} shadow-md ${
                !ach.unlocked ? 'opacity-85' : ''
              }`}
              style={{ background: ts.medallionBg }}
            >
              {renderAchievementIcon(ach.icon, 'h-5.5 w-5.5', ts.iconColor)}
              {ach.claimed && (
                <span className="absolute -right-1 -bottom-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border border-zinc-950 bg-emerald-400 text-zinc-950">
                  <CheckCircle2 className="h-3 w-3 stroke-[2.8]" />
                </span>
              )}
              {!ach.unlocked && ach.progress === 0 && (
                <span className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full border border-white/10 bg-zinc-950 text-zinc-400">
                  <Lock className="h-2.5 w-2.5" />
                </span>
              )}
            </div>
          );

          if (canClaim) {
            return (
              <button
                key={ach.id}
                type="button"
                onClick={() => onClaimAchievement(ach.id)}
                className="ug-cut-sm group relative w-full overflow-hidden border border-orange-400/75 bg-gradient-to-r from-rose-500/18 via-orange-500/14 to-emerald-500/14 p-3 text-left transition-all hover:border-orange-300 active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  {medallion}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-display italic text-sm font-extrabold uppercase text-white">
                        {ach.title}
                      </span>
                      <span
                        className={`ug-skew border px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider ${ts.pillClass}`}
                      >
                        {ts.label}
                      </span>
                      {ach.singleRun && (
                        <span className="ug-skew border border-rose-400/40 bg-rose-500/18 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-rose-200">
                          Tek Sürüş
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-orange-100/85">
                      {ach.description}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="ug-skew h-1.5 flex-1 overflow-hidden bg-white/15">
                        <div className="h-full w-full bg-gradient-to-r from-orange-400 to-emerald-400" />
                      </div>
                      <span className="ug-cut-sm ug-btn-fire inline-flex items-center gap-1 px-2.5 py-1 text-xs font-extrabold font-mono-num shrink-0">
                        <Coins className="h-3.5 w-3.5" />
                        <span>ÖDÜLÜ AL +{ach.rewardGold}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          }

          return (
            <div
              key={ach.id}
              className={`ug-cut-sm border p-3 transition-colors ${
                ach.claimed
                  ? 'border-emerald-400/25 bg-emerald-500/[0.06]'
                  : `${ts.cardBorder} bg-[#131722]/95`
              }`}
            >
              <div className="flex items-start gap-3">
                {medallion}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-display text-sm font-extrabold text-white">
                          {ach.title}
                        </span>
                        <span
                          className={`ug-skew border px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider ${ts.pillClass}`}
                        >
                          {ts.label}
                        </span>
                        {ach.singleRun && (
                          <span className="ug-skew border border-rose-400/35 bg-rose-500/14 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-rose-200">
                            Tek Sürüş
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-400">
                        {ach.description}
                      </p>
                    </div>

                    {ach.claimed ? (
                      <span className="ug-skew inline-flex items-center gap-1 border border-emerald-400/30 bg-emerald-500/12 px-2 py-1 font-display text-[11px] font-bold uppercase text-emerald-300 shrink-0">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Alındı</span>
                      </span>
                    ) : (
                      <span className="ug-skew inline-flex items-center gap-1 border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-xs font-extrabold text-amber-300 font-mono-num shrink-0">
                        <Coins className="h-3 w-3 text-amber-400" />
                        <span>+{ach.rewardGold}</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 flex items-center gap-2.5">
                    <div className="ug-skew h-1.5 flex-1 overflow-hidden bg-white/10">
                      <div
                        className={`h-full ${
                          ach.claimed ? 'bg-emerald-400' : ts.barClass
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-300 font-mono-num shrink-0">
                      {ach.progress.toLocaleString('tr-TR')} /{' '}
                      {ach.target.toLocaleString('tr-TR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
