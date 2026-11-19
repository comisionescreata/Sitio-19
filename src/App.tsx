/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminModal } from './components/AdminModal';
import { DossierModal } from './components/DossierModal';
import { GameBoard } from './components/GameBoard';
import { LoadoutSelector } from './components/LoadoutSelector';
import { TitleScreen } from './components/TitleScreen';
import { GAME_CONFIG, LEVEL_CATALOG, TOWER_CATALOG } from './data/scpCatalog';
import { TowerType } from './types/game';

const STORAGE_KEY = GAME_CONFIG.app.storageKey;

function loadCompletedLevels(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

function saveCompletedLevels(levels: number[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
  } catch {
    // Ignore storage write errors
  }
}

export default function App() {
  const [screen, setScreen] = useState<'title' | 'loadout' | 'game'>('title');
  const [currentLevelNum, setCurrentLevelNum] = useState<number>(
    () => LEVEL_CATALOG[0]?.level ?? 1
  );
  const [completedLevels, setCompletedLevels] = useState<number[]>(loadCompletedLevels);
  const [freePlayAllUnlocked, setFreePlayAllUnlocked] = useState(false);
  const [adminUnlockedUpTo, setAdminUnlockedUpTo] = useState<number | null>(null);
  const [adminUnlockAllTowers, setAdminUnlockAllTowers] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [activeDeck, setActiveDeck] = useState<TowerType[]>(
    GAME_CONFIG.progression.defaultStarterDeck
  );
  const [dossierOpen, setDossierOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const highestCompleted = completedLevels.length > 0 ? Math.max(...completedLevels) : 0;
  const effectiveProgressLevel = Math.max(
    highestCompleted,
    adminUnlockedUpTo ? Math.max(0, adminUnlockedUpTo - 1) : 0
  );

  // Unlocked towers from progression (or all when unlocked via Admin)
  const unlockedTowers = useMemo<TowerType[]>(() => {
    if (freePlayAllUnlocked || adminUnlockAllTowers) {
      return TOWER_CATALOG.map((t) => t.type);
    }
    const unlockedByLevelRewards = new Set<TowerType>(
      LEVEL_CATALOG.filter(
        (lvl) =>
          lvl.unlockTower &&
          (completedLevels.includes(lvl.level) || lvl.level <= effectiveProgressLevel)
      ).map((lvl) => lvl.unlockTower!)
    );
    return TOWER_CATALOG.filter(
      (t) => t.unlockLevel <= effectiveProgressLevel || unlockedByLevelRewards.has(t.type)
    ).map((t) => t.type);
  }, [adminUnlockAllTowers, completedLevels, effectiveProgressLevel, freePlayAllUnlocked]);

  const activeLevelConfig =
    LEVEL_CATALOG.find((l) => l.level === currentLevelNum) ?? LEVEL_CATALOG[0];

  const enterLevel = useCallback(
    (levelNumber: number) => {
      const targetConfig =
        LEVEL_CATALOG.find((l) => l.level === levelNumber) ?? LEVEL_CATALOG[0];
      setCurrentLevelNum(levelNumber);

      const lockedDeck = targetConfig.rules?.lockedDeck;
      if (lockedDeck && lockedDeck.length > 0) {
        const validLocked = lockedDeck.filter((t) =>
          TOWER_CATALOG.some((def) => def.type === t)
        ) as TowerType[];
        if (validLocked.length > 0) {
          setActiveDeck(validLocked);
          setScreen('game');
          return;
        }
      }

      const banned = new Set(targetConfig.rules?.bannedTowers ?? []);
      const allowedUnlocked = unlockedTowers.filter((t) => !banned.has(t));

      if (levelNumber <= GAME_CONFIG.progression.autoDeckMaxLevel) {
        const fallbackDeck =
          allowedUnlocked.length > 0 ? allowedUnlocked : unlockedTowers;
        setActiveDeck(fallbackDeck.slice(0, targetConfig.maxDeckSlots));
        setScreen('game');
      } else {
        setScreen('loadout');
      }
    },
    [unlockedTowers]
  );

  const handleLevelComplete = useCallback((levelNumber: number) => {
    setCompletedLevels((prev) => {
      if (prev.includes(levelNumber)) return prev;
      const updated = [...prev, levelNumber];
      saveCompletedLevels(updated);
      return updated;
    });
  }, []);

  const handleCompleteUpToLevel = useCallback((levelNumber: number) => {
    const clamped = Math.max(1, Math.min(LEVEL_CATALOG.length, levelNumber));
    const upTo = LEVEL_CATALOG.filter((l) => l.level <= clamped).map((l) => l.level);
    setCompletedLevels((prev) => {
      const merged = Array.from(new Set([...prev, ...upTo])).sort((a, b) => a - b);
      saveCompletedLevels(merged);
      return merged;
    });
    setAdminUnlockedUpTo((prev) => Math.max(prev ?? 0, clamped));
  }, []);

  const handleCompleteAllLevels = useCallback(() => {
    const all = LEVEL_CATALOG.map((l) => l.level);
    setCompletedLevels(all);
    saveCompletedLevels(all);
    setFreePlayAllUnlocked(true);
    setAdminUnlockedUpTo(LEVEL_CATALOG.length);
  }, []);

  const handleResetProgress = useCallback(() => {
    setCompletedLevels([]);
    saveCompletedLevels([]);
    setFreePlayAllUnlocked(false);
    setAdminUnlockedUpTo(null);
    setAdminUnlockAllTowers(false);
    setCurrentLevelNum(LEVEL_CATALOG[0]?.level ?? 1);
  }, []);

  const handleNextLevel = useCallback(() => {
    const idx = LEVEL_CATALOG.findIndex((l) => l.level === currentLevelNum);
    const nextLvl =
      idx >= 0 && idx + 1 < LEVEL_CATALOG.length
        ? LEVEL_CATALOG[idx + 1].level
        : LEVEL_CATALOG[0]?.level ?? currentLevelNum;
    enterLevel(nextLvl);
  }, [currentLevelNum, enterLevel]);

  return (
    <>
      {screen === 'title' && (
        <TitleScreen
          completedLevels={completedLevels}
          unlockedTowers={unlockedTowers}
          freePlayAllUnlocked={freePlayAllUnlocked}
          adminUnlockedUpTo={adminUnlockedUpTo}
          adminAuthenticated={adminAuthenticated}
          initialSelectedLevel={currentLevelNum}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onStartLevel={enterLevel}
          onOpenDossier={() => setDossierOpen(true)}
          onOpenAdmin={() => setAdminOpen(true)}
        />
      )}

      {screen === 'loadout' && (
        <LoadoutSelector
          levelConfig={activeLevelConfig}
          unlockedTowers={unlockedTowers}
          maxSlots={activeLevelConfig.maxDeckSlots}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onBack={() => setScreen('title')}
          onConfirmDeck={(deck) => {
            setActiveDeck(deck);
            setScreen('game');
          }}
        />
      )}

      {screen === 'game' && (
        <GameBoard
          levelConfig={activeLevelConfig}
          activeDeck={activeDeck}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onLevelComplete={handleLevelComplete}
          onSelectNextLevel={handleNextLevel}
          onBackToMenu={() => setScreen('title')}
          onOpenDossier={() => setDossierOpen(true)}
          dossierOpen={dossierOpen}
        />
      )}

      {dossierOpen && <DossierModal onClose={() => setDossierOpen(false)} />}

      {adminOpen && (
        <AdminModal
          isAuthenticated={adminAuthenticated}
          onAuthenticate={() => setAdminAuthenticated(true)}
          onLogout={() => {
            setAdminAuthenticated(false);
            setAdminOpen(false);
          }}
          freePlayAllUnlocked={freePlayAllUnlocked}
          onToggleFreePlay={() => setFreePlayAllUnlocked((p) => !p)}
          adminUnlockedUpTo={adminUnlockedUpTo}
          onSetUnlockedUpTo={(lvl) => {
            setFreePlayAllUnlocked(false);
            setAdminUnlockedUpTo(lvl);
          }}
          adminUnlockAllTowers={adminUnlockAllTowers}
          onToggleAllTowers={() => setAdminUnlockAllTowers((p) => !p)}
          completedLevels={completedLevels}
          onCompleteUpToLevel={handleCompleteUpToLevel}
          onCompleteAllLevels={handleCompleteAllLevels}
          onResetProgress={handleResetProgress}
          onJumpToLevel={(lvl) => {
            setAdminUnlockedUpTo((prev) => Math.max(prev ?? 0, lvl));
            enterLevel(lvl);
          }}
          onClose={() => setAdminOpen(false)}
        />
      )}
    </>
  );
}
