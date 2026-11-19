import { SkipForward, User } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CHARACTERS_CATALOG } from '../data/scpCatalog';
import {
  CharacterDefinition,
  DialogueChoice,
  DialogueDefinition,
  DialogueLine,
} from '../types/game';
import { soundEngine } from '../utils/sound';

export interface DialogueCompletionResult {
  triggerEventId?: string;
  energyDelta?: number;
  nextDialogueId?: string;
}

interface DialogueOverlayProps {
  dialogue: DialogueDefinition;
  inlineCharacters?: Record<string, CharacterDefinition>;
  onComplete: (result?: DialogueCompletionResult) => void;
  onLineTrigger?: (triggerEventId?: string, energyDelta?: number) => void;
}

function playDialogueSound(sound?: string) {
  if (!sound) return;
  switch (sound) {
    case 'explosion':
      soundEngine.playExplosion();
      break;
    case 'heal':
      soundEngine.playHeal();
      break;
    case 'revive':
      soundEngine.playRevive();
      break;
    case 'stun':
      soundEngine.playScream096();
      break;
    case 'scream066':
      soundEngine.playScream066();
      break;
    case 'pull':
      soundEngine.playPull012();
      break;
    case 'portal':
      soundEngine.playPocket106();
      break;
    case 'tesla':
      soundEngine.playTeslaArc();
      break;
    case 'blink':
      soundEngine.playBlink();
      break;
    case 'place':
      soundEngine.playPlace();
      break;
    case 'collect':
      soundEngine.playCollect();
      break;
    case 'door':
      soundEngine.playDoor079();
      break;
    case 'horde':
      soundEngine.playFlagHorde();
      break;
    case 'alert':
    default:
      soundEngine.playTesla();
      break;
  }
}

export function DialogueOverlay({
  dialogue,
  inlineCharacters,
  onComplete,
  onLineTrigger,
}: DialogueOverlayProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [revealedChars, setRevealedChars] = useState(0);
  const [imgErrorKey, setImgErrorKey] = useState<string | null>(null);
  const firedLineRef = useRef<number>(-1);
  const completedRef = useRef<boolean>(false);

  const lines = dialogue.lines ?? [];
  const currentLine: DialogueLine | undefined = lines[lineIndex];
  const typingSpeed = Math.max(8, dialogue.typingSpeedCps ?? 52);
  const isSkippable = dialogue.skippable !== false;

  const character: CharacterDefinition | undefined = useMemo(() => {
    if (!currentLine?.characterId) return undefined;
    return (
      inlineCharacters?.[currentLine.characterId] ??
      CHARACTERS_CATALOG[currentLine.characterId]
    );
  }, [currentLine?.characterId, inlineCharacters]);

  const speakerName =
    currentLine?.speakerName ?? character?.name ?? 'Personal del Sitio-19';
  const speakerTitle =
    currentLine?.speakerTitle ?? character?.title ?? character?.role ?? '';
  const factionLabel = character?.faction ?? '';
  const expression =
    currentLine?.expression ?? character?.defaultExpression ?? 'neutral';
  const side = currentLine?.side ?? character?.side ?? 'left';
  const accentColor =
    currentLine?.color ?? character?.accentColor ?? '#F59E0B';
  const portraitSrc =
    currentLine?.portrait ??
    character?.expressions?.[expression] ??
    character?.defaultPortrait;
  const portraitKey = `${lineIndex}:${portraitSrc ?? ''}`;
  const fullText = currentLine?.text ?? '';
  const isFullyRevealed = revealedChars >= fullText.length;

  useEffect(() => {
    setLineIndex(0);
    setRevealedChars(0);
    setImgErrorKey(null);
    firedLineRef.current = -1;
    completedRef.current = false;
  }, [dialogue]);

  useEffect(() => {
    if (!currentLine) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete({ triggerEventId: dialogue.onCompleteEventId });
      }
      return;
    }
    setRevealedChars(0);
    if (firedLineRef.current !== lineIndex) {
      firedLineRef.current = lineIndex;
      playDialogueSound(currentLine.sound);
      if (currentLine.triggerEventId || currentLine.energyDelta) {
        onLineTrigger?.(currentLine.triggerEventId, currentLine.energyDelta);
      }
    }
  }, [lineIndex, currentLine, dialogue.onCompleteEventId, onComplete, onLineTrigger]);

  useEffect(() => {
    if (!currentLine || isFullyRevealed) return;
    const msPerChar = Math.max(10, Math.round(1000 / typingSpeed));
    const timer = window.setInterval(() => {
      setRevealedChars((prev) => {
        if (prev + 1 >= fullText.length) {
          window.clearInterval(timer);
          return fullText.length;
        }
        return prev + 1;
      });
    }, msPerChar);
    return () => window.clearInterval(timer);
  }, [currentLine, fullText.length, isFullyRevealed, typingSpeed]);

  const finishDialogue = useCallback(
    (result?: DialogueCompletionResult) => {
      if (completedRef.current) return;
      completedRef.current = true;
      onComplete({
        triggerEventId: result?.triggerEventId ?? dialogue.onCompleteEventId,
        energyDelta: result?.energyDelta,
        nextDialogueId: result?.nextDialogueId,
      });
    },
    [dialogue.onCompleteEventId, onComplete]
  );

  const advanceLine = useCallback(() => {
    if (!currentLine) {
      finishDialogue();
      return;
    }
    if (!isFullyRevealed) {
      setRevealedChars(fullText.length);
      return;
    }
    if (currentLine.choices && currentLine.choices.length > 0) {
      return;
    }
    if (currentLine.endAfterLine) {
      finishDialogue();
      return;
    }
    if (currentLine.nextLineId) {
      const targetIdx = lines.findIndex((l) => l.id === currentLine.nextLineId);
      if (targetIdx !== -1) {
        setLineIndex(targetIdx);
        return;
      }
    }
    if (
      currentLine.nextIndex !== undefined &&
      currentLine.nextIndex >= 0 &&
      currentLine.nextIndex < lines.length
    ) {
      setLineIndex(currentLine.nextIndex);
      return;
    }
    if (lineIndex + 1 < lines.length) {
      setLineIndex(lineIndex + 1);
    } else {
      finishDialogue();
    }
  }, [currentLine, finishDialogue, fullText.length, isFullyRevealed, lineIndex, lines]);

  const handleSelectChoice = useCallback(
    (choice: DialogueChoice) => {
      if (choice.triggerEventId || choice.energyDelta) {
        onLineTrigger?.(choice.triggerEventId, choice.energyDelta);
      }
      if (choice.nextDialogueId) {
        finishDialogue({ nextDialogueId: choice.nextDialogueId });
        return;
      }
      if (choice.closeDialogue) {
        finishDialogue();
        return;
      }
      if (choice.nextLineId) {
        const idx = lines.findIndex((l) => l.id === choice.nextLineId);
        if (idx !== -1) {
          setLineIndex(idx);
          return;
        }
      }
      if (
        choice.nextIndex !== undefined &&
        choice.nextIndex >= 0 &&
        choice.nextIndex < lines.length
      ) {
        setLineIndex(choice.nextIndex);
        return;
      }
      if (lineIndex + 1 < lines.length) {
        setLineIndex(lineIndex + 1);
      } else {
        finishDialogue();
      }
    },
    [finishDialogue, lineIndex, lines, onLineTrigger]
  );

  useEffect(() => {
    if (!currentLine?.autoAdvanceSec || !isFullyRevealed) return;
    if (currentLine.choices && currentLine.choices.length > 0) return;
    const t = window.setTimeout(() => {
      advanceLine();
    }, currentLine.autoAdvanceSec * 1000);
    return () => window.clearTimeout(t);
  }, [advanceLine, currentLine, isFullyRevealed]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        advanceLine();
      } else if (e.key === 'Escape' && isSkippable) {
        e.preventDefault();
        e.stopPropagation();
        finishDialogue();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [advanceLine, finishDialogue, isSkippable]);

  if (!currentLine) return null;

  const hasChoices =
    isFullyRevealed && currentLine.choices && currentLine.choices.length > 0;
  const showPortrait = Boolean(portraitSrc) && imgErrorKey !== portraitKey;
  const alignmentClass =
    side === 'right'
      ? 'flex-row-reverse'
      : side === 'center'
      ? 'flex-col items-center text-center'
      : 'flex-row';

  return (
    <div
      className="absolute inset-0 z-30 flex items-end justify-center p-4 sm:p-6"
      style={{
        backgroundColor: dialogue.backdropTint ?? 'rgba(8, 12, 18, 0.62)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={dialogue.title ?? `Diálogo de ${speakerName}`}
      onClick={(e) => {
        if (!hasChoices) {
          e.stopPropagation();
          advanceLine();
        }
      }}
    >
      <div
        className="w-full max-w-4xl rounded-xl border border-slate-700/90 bg-[#121821]/95 p-4 shadow-2xl backdrop-blur-sm sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-end gap-4 ${alignmentClass}`}>
          {/* Character PNG Portrait */}
          <div
            className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-[#0B1017] sm:h-36 sm:w-36"
            style={{ borderColor: accentColor }}
          >
            {showPortrait ? (
              <img
                src={portraitSrc}
                alt={`${speakerName} (${expression})`}
                referrerPolicy="no-referrer"
                onError={() => setImgErrorKey(portraitKey)}
                className="h-full w-full object-contain object-bottom"
              />
            ) : (
              <div className="flex flex-col items-center justify-center px-2 text-center">
                <User className="h-9 w-9 text-slate-500" />
                <span className="mt-1 truncate text-[11px] font-semibold text-slate-300">
                  {speakerName}
                </span>
                {expression && (
                  <span className="font-mono-num text-[10px] text-slate-500">
                    {expression}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Dialogue Body */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <h3
                  className="font-display text-xl font-bold tracking-wide"
                  style={{ color: accentColor }}
                >
                  {speakerName}
                </h3>
                {(speakerTitle || factionLabel) && (
                  <span className="text-xs text-slate-400">
                    {[speakerTitle, factionLabel].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="font-mono-num tabular-nums">
                  {lineIndex + 1}/{lines.length}
                </span>
                {isSkippable && (
                  <button
                    type="button"
                    onClick={() => finishDialogue()}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                  >
                    <SkipForward className="h-3.5 w-3.5" />
                    Saltar
                  </button>
                )}
              </div>
            </div>

            <div
              className="mt-3 min-h-[76px] cursor-pointer text-sm leading-relaxed text-slate-100 sm:text-base"
              style={
                character?.textColor ? { color: character.textColor } : undefined
              }
              onClick={advanceLine}
            >
              {fullText.slice(0, revealedChars)}
            </div>

            {hasChoices ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {currentLine.choices!.map((choice, idx) => (
                  <button
                    key={`${choice.label}_${idx}`}
                    type="button"
                    onClick={() => handleSelectChoice(choice)}
                    className="rounded-lg border border-amber-500/60 bg-amber-500/15 px-3.5 py-2 text-xs font-bold whitespace-nowrap text-amber-200 transition-colors hover:bg-amber-500 hover:text-slate-950"
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-400">
                <span>
                  {isFullyRevealed
                    ? 'Pulsa Espacio, Enter o haz clic para continuar'
                    : 'Mostrando transmisión...'}
                </span>
                <button
                  type="button"
                  onClick={advanceLine}
                  className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold whitespace-nowrap text-slate-950 transition-colors hover:bg-amber-400"
                >
                  {!isFullyRevealed
                    ? 'Completar'
                    : lineIndex + 1 < lines.length && !currentLine.endAfterLine
                    ? 'Continuar'
                    : 'Finalizar'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
