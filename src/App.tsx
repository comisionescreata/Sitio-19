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
  const [currentLevelNum, setCurrentLevelNum] = useState<number>(1);
  const [completedLevels, setCompletedLevels] = useState<number[]>(loadCompletedLevels);
  const [freePlayAllUnlocked, setFreePlayAllUnlocked] = useState(false);
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

  // Unlocked towers from progression (or all when unlocked via Admin)
  const unlockedTowers = useMemo<TowerType[]>(() => {
    if (freePlayAllUnlocked) {
      return TOWER_CATALOG.map((t) => t.type);
    }
    const unlockedByLevelRewards = new Set<TowerType>(
      LEVEL_CATALOG.filter(
        (lvl) => lvl.unlockTower && (completedLevels.includes(lvl.level) || lvl.level <= highestCompleted)
      ).map((lvl) => lvl.unlockTower!)
    );
    return TOWER_CATALOG.filter(
      (t) => t.unlockLevel <= highestCompleted || unlockedByLevelRewards.has(t.type)
    ).map((t) => t.type);
  }, [completedLevels, freePlayAllUnlocked, highestCompleted]);

  const activeLevelConfig =
    LEVEL_CATALOG.find((l) => l.level === currentLevelNum) ?? LEVEL_CATALOG[0];

  const enterLevel = useCallback(
    (levelNumber: number) => {
      const targetConfig =
        LEVEL_CATALOG.find((l) => l.level === levelNumber) ?? LEVEL_CATALOG[0];
      setCurrentLevelNum(levelNumber);
      if (levelNumber <= GAME_CONFIG.progression.autoDeckMaxLevel) {
        setActiveDeck(unlockedTowers.slice(0, targetConfig.maxDeckSlots));
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

  const handleCompleteAllLevels = useCallback(() => {
    const all = LEVEL_CATALOG.map((l) => l.level);
    setCompletedLevels(all);
    saveCompletedLevels(all);
    setFreePlayAllUnlocked(true);
  }, []);

  const handleResetProgress = useCallback(() => {
    setCompletedLevels([]);
    saveCompletedLevels([]);
    setFreePlayAllUnlocked(false);
    setCurrentLevelNum(1);
  }, []);

  const handleNextLevel = useCallback(() => {
    const nextLvl = Math.min(LEVEL_CATALOG.length, currentLevelNum + 1);
    enterLevel(nextLvl);
  }, [currentLevelNum, enterLevel]);

  return (
    <>
      {screen === 'title' && (
        <TitleScreen
          completedLevels={completedLevels}
          unlockedTowers={unlockedTowers}
          freePlayAllUnlocked={freePlayAllUnlocked}
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
          completedLevels={completedLevels}
          onCompleteAllLevels={handleCompleteAllLevels}
          onResetProgress={handleResetProgress}
          onJumpToLevel={(lvl) => {
            setFreePlayAllUnlocked(true);
            enterLevel(lvl);
          }}
          onClose={() => setAdminOpen(false)}
        />
      )}
    </>
  );
}
