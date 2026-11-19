# Documentación Maestra Completa de los Archivos JSON (Sitio-19)

Esta guía documenta **de principio a fin** cada archivo JSON ubicado en `src/data/json/`, cada campo soportado por el motor TypeScript, valores por defecto, interacciones entre sistemas y recetas completas listas para copiar y adaptar.

---

## Índice General

1. [Resumen de Carpetas y Archivos JSON](#1-resumen-de-carpetas-y-archivos-json)
2. [Panel de Administrador y Herramientas del Archivo Táctico](#2-panel-de-administrador-y-herramientas-del-archivo-táctico)
3. [`config.json` — Configuración Global y Orden (`levelOrder`, `scpOrder`, `towerOrder`)](#3-configjson--configuración-global-del-juego)
4. [`levels/<n>.json` — Niveles por Archivo, Portadas (`coverImage`), Casillas, Lápidas y Oleadas](#4-levelsjson--niveles-tablero-casillas-lápidasobstáculos-y-oleadas)
5. [`objectives.json` / `objetives.json` y `objectives/` — Objetivos, Restricciones de Perímetro y Reglas de Victoria](#5-objectivesjson--objetivos-y-condiciones-de-fallo)
6. [`events.json` / `events/` — Motor de Eventos (`logic` + `visual`) y Mutación Específica de SCPs](#5-eventsjson--motor-de-eventos-logic--visual-y-mutación-específica-de-scps)
7. [`characters.json` / `characters/` — Personajes, Retratos PNG y Múltiples Expresiones](#6-charactersjson--personajes-retratos-png-y-múltiples-expresiones)
8. [`dialogues.json` / `dialogues/` — Sistema de Diálogos, Ramificaciones, Audio y Eventos](#7-dialoguesjson--sistema-de-diálogos-ramificaciones-audio-y-eventos)
9. [`effects.json` / `effects/` — Motor Declarativo de Efectos y Prioridades](#8-effectsjson--motor-declarativo-de-efectos-y-prioridades)
10. [`towers.json` / `towers/` — Personal de Contención y Estructuras Defensivas](#9-towersjson--personal-de-contención-y-estructuras-defensivas)
11. [`scps.json` / `scps/` — Entidades SCP, Estadísticas y Bloques `behavior`](#10-scpsjson--entidades-scp-estadísticas-y-bloques-behavior)
12. [`designs.json` / `designs/` — Personalización Visual Completa, Sprites, Formas Vectoriales y UI](#11-designsjson--apariencia-visual-sprites-formas-vectoriales-y-ui)
13. [Guía Práctica: Crear una Misión Completa Desde Cero (Lápidas + Objetivos + Diálogos + Eventos + Efectos)](#12-guía-práctica-crear-una-misión-completa-desde-cero)
14. [`particles.json` / `particles/` — Sistema Reutilizable de Partículas y Diseño Completo](#13-particlesjson--sistema-reutilizable-de-partículas-y-diseño-completo)
15. [Programación Completa 100% en JSON: Nuevas Torres (`towers/`) y Nuevos SCP (`scps/`)](#14-programación-completa-100-en-json-nuevas-torres-towersjson-y-nuevos-scp-scpsjson)

---

## 1. Resumen de Carpetas y Archivos JSON

El juego carga automáticamente **tanto carpetas modulares (un archivo `.json` por elemento)** como los archivos raíz tradicionales en `src/data/json/`. Puedes organizar cada cosa en su carpeta limpia:

| Carpeta / Archivo | Convención recomendada | Estado inicial | Qué controla |
| :--- | :--- | :--- | :--- |
| `config.json` | Objeto `{ ... }` | Configurado | Parámetros globales, **`levelOrder`**, `scpOrder`, `towerOrder`, rejilla base, velocidades de proyectiles, energía del cielo, puertas Tesla y secreto Admin. |
| `levels/<n>.json` (+ `levels.json`) | `1.json`, `2.json`, `3.json`... | Configurado (`1..3`) | Cada nivel en su archivo numerado. Soporta **`coverImage` (portada)**, `objectives`, `victoryCondition`, `tileOverrides`, `tileModifiers`, `obstacles`/`tombstones`, diálogos y oleadas. |
| `objectives/` + `objectives.json` (`objetives.json`) | `<id>.json` o diccionario | 8 presets listos | Objetivos primarios, secundarios, bonus y condiciones de derrota inmediata (p. ej. **no dejar pasar ningún SCP más allá de la columna 3**). |
| `scps/<nombre>.json` (+ `scps.json`) | `scp_008.json`, `scp_173.json`... | 17 entidades SCP | Ficha y comportamiento 100% programable de cada SCP (`hp`, `speed`, `dps`, `effects`, `behavior`, `particles`, `inlineDesign`). |
| `towers/<nombre>.json` (+ `towers.json`) | `guard.json`, `mtf.json`... | 20 torres | Personal y estructuras defensivas (`cost`, `cooldown`, `maxHp`, combate, `particles`, `inlineDesign`). |
| `effects/<nombre>.json` (+ `effects.json`) | `<id>.json` o diccionario | Catálogo completo | Efectos `builtin` y `declarative` reutilizables en torres, SCPs, casillas y eventos. |
| `particles/<nombre>.json` (+ `particles.json`) | `<id>.json` o diccionario | 28+ presets | Sistemas de partículas multicapa para despliegues, ataques, explosiones, impactos, auras y obstáculos. |
| `designs/<seccion>.json` (+ `designs.json`) | `board.json`, `ui.json`, etc. o monolítico | Personalización completa | Colores, sprites, bordes, radios, barras de vida/escudo, líneas de perímetro, proyectiles (`diamond`, `rocket`, `laser_bolt`, `orb`, `ring`, `sprite`), `tileModifiers`, `obstacles` y `hudTheme`. |
| `events/` + `events.json` | Vacío `{}` | Listo para empezar desde 0 | Eventos reutilizables con bloques `logic` y `visual`. |
| `characters/` + `characters.json` | Vacío `{}` | Listo para empezar desde 0 | Personajes narrativos con retratos PNG y soporte para múltiples expresiones. |
| `dialogues/` + `dialogues.json` | Vacío `{}` | Listo para empezar desde 0 | Conversaciones tipo novela visual con retratos dinámicos y ramificaciones. |

> **Cómo funciona la carga por carpetas (`import.meta.glob`)**:
> - En **`levels/`**, nombra cada archivo con el número del nivel (`1.json`, `2.json`, `3.json`, etc.). Si el objeto dentro del archivo omite `"level"`, el cargador deduce el número a partir del nombre del archivo (`1.json` → `level: 1`).
> - En **`config.json -> levelOrder`**, defines exactamente qué niveles aparecen y en qué orden en la Ruta de Contención (ejemplo: `[1, 2, 3]` o `[1, 3, 2, 10]`). Si un archivo existe en `levels/` pero no figura en `levelOrder`, `levelOrder` marca la prioridad inicial y cualquier nivel extra se añade ordenado por su número (o puedes listar todos en `levelOrder`).
> - En **`scps/`** y **`towers/`**, si un archivo omite `"type"`, se usa el nombre del archivo como `"type"`. Opcionalmente ordena con `config.json -> scpOrder` y `towerOrder`.
> - En **`objectives/`**, **`effects/`**, **`particles/`**, **`events/`**, **`characters/`** y **`dialogues/`**, cada archivo puede contener **un solo objeto** (si omite `"id"`, toma el nombre del archivo) o **un diccionario/arreglo de varios**.
> - En **`objectives.json`** y **`objetives.json`**, el motor acepta ambos nombres de archivo indistintamente (y además la carpeta `objectives/` o `objetives/`).
> - En **`designs/`**, cualquier archivo JSON (como `designs/board.json` o `designs/hudTheme.json`) se fusiona automáticamente (`deepMerge`) sobre `designs.json`.

> **Rutas de imágenes PNG**: Para portadas de nivel (`coverImage`), retratos (`characters`), sprites de casillas (`tileOverrides`, `tileModifiers`), lápidas/obstáculos (`obstacles`, `tombstones`) o unidades (`designs`), puedes colocar imágenes en `public/assets/...` (`"/assets/mi_imagen.png"`) o en `src/assets/images/...`.

---

## 2. Panel de Administrador y Herramientas del Archivo Táctico

### Panel de Administrador (`Admin`)
Accesible desde la pantalla principal con la contraseña definida en `config.json -> admin.secret`:

- **Desbloqueo Personalizado por Nivel (`1..N`)**: libera niveles específicos sin ensuciar el progreso guardado en `localStorage`, o márcalos como completados hasta X.
- **Todas las Torres: ON/OFF / Desbloquear Todo / Reiniciar Progreso / Salto Directo a Nivel**.
- **Resumen en vivo del JSON cargado**: muestra el conteo actual de `Niveles`, `Torres`, `SCP`, `Efectos`, `Objetivos`, `Partículas`, `Eventos`, `Personajes` y `Diálogos`.

### Archivo Táctico (`Archivo`)
- Pestañas: **Amenazas SCP**, **Personal y Estructuras**, **Efectos** (con **Editor / Constructor JSON**), **Objetivos**, **Partículas** (con visor interactivo `<ParticleSystem />`), **Eventos**, **Personajes** y **Diálogos**.

---

## 3. `config.json` — Configuración Global del Juego

Define los valores globales predeterminados cuando un nivel u objeto específico no los sobrescribe.

### Esquema completo

```json
{
  "app": {
    "title": "Sitio-19: Defensa SCP",
    "storageKey": "sitio19_completed_levels_v1",
    "sectorBackdropImage": "/src/assets/images/SCPlogo.webp"
  },
  "levelOrder": [1, 2, 3],
  "scpOrder": ["scp_008", "scp_966", "scp_939", "scp_173"],
  "towerOrder": ["researcher", "guard", "barricade"],
  "grid": {
    "rows": 6,
    "cols": 9
  },
  "boardLayout": {
    "gateWidth": 58,
    "breachMargin": 28,
    "padTop": 14,
    "padBottom": 14,
    "cellSize": 92
  },
  "progression": {
    "autoDeckMaxLevel": 6,
    "defaultStarterDeck": ["researcher", "guard"],
    "defaultDeckPriority": ["researcher", "guard", "barricade", "medic"],
    "sectors": [
      { "id": 1, "label": "Sector I (1–10)", "start": 1, "end": 10 }
    ]
  },
  "gameplay": {
    "energyDropAmount": 50,
    "initialSkyEnergyDelaySec": 10,
    "skyEnergyIntervalMinSec": 6.5,
    "skyEnergyIntervalVarianceSec": 2.0,
    "skyEnergyColMin": 1,
    "skyEnergyColSpan": 6,
    "energyDropLifetimeSec": 12,
    "energyDropCollectRadiusPx": 34,
    "removeRefundRatio": 0.25,
    "announcementDurationSec": 5.0,
    "flagBannerDurationSec": 4.5,
    "defaultFlagBanner": "¡Se aproxima una GRAN HORDA de SCP!",
    "projectileSpeeds": {
      "standard": 6.4,
      "mtf": 6.4,
      "cryo": 6.4,
      "turret": 7.4,
      "sniper": 9.6,
      "shotgun": 7.8,
      "pyro": 6.4,
      "heavy": 8.0,
      "grenade": 5.2,
      "psionic": 6.4
    },
    "doors079": {
      "minCol": 4,
      "toggleMinSec": 2.2,
      "toggleVarianceSec": 2.8
    },
    "teslaGate": {
      "firingDurationSec": 0.75,
      "sweepSpeedColsPerSec": 15
    }
  },
  "trackUi": {
    "nodeSpacing": 148,
    "trackHeight": 246,
    "waveAmplitude": 44
  },
  "admin": {
    "secret": "",
    "quickJumpLevels": [1, 10, 15, 20]
  }
}
```

### Notas clave de `config.json`
- **`levelOrder`**: arreglo numérico (`[1, 2, 3, ...]`) que define el orden exacto de los archivos `src/data/json/levels/<n>.json` en la campaña y en la Ruta de Contención.
- **`scpOrder` / `towerOrder`**: arreglos opcionales de `type` para controlar el orden en que aparecen SCP y torres en el Archivo Táctico y el selector de mazo.
- `progression.autoDeckMaxLevel`: hasta este número de nivel el juego asigna automáticamente las torres desbloqueadas sin abrir el selector de mazo (a menos que el nivel defina `lockedDeck`).
- `boardLayout.cellSize`: tamaño en píxeles de cada casilla lógica. El renderizador, las zonas de aura, los sprites de casillas y el cálculo de clics usan este valor dinámicamente.

---

## 4. `levels/<n>.json` — Niveles por Archivo, Portadas, Casillas, Lápidas y Oleadas

Cada nivel se guarda preferentemente en **`src/data/json/levels/<numero>.json`** (por ejemplo `1.json`, `2.json`, `3.json`) y se ordena según `config.json -> levelOrder`.

### 4.1 Propiedades principales de cada nivel

| Campo | Tipo | Obligatorio | Descripción |
| :--- | :--- | :--- | :--- |
| `level` | `number` | Opcional* | Número único del nivel (`1`, `2`, `3`, ...). Si se omite dentro de `levels/4.json`, se infiere `4` del nombre del archivo. |
| `title` | `string` | Sí | Título mostrado en el selector de niveles y en la barra superior. |
| `description` | `string` | Sí | Breve resumen estratégico mostrado antes de jugar. |
| `coverImage` | `string` | No | **Portada del nivel** (también acepta `portrait` o `bannerImage`). Se muestra en la tarjeta principal de campaña y en la cabecera del selector de mazo. Si se omite, usa `config.json -> app.sectorBackdropImage`. |
| `startingEnergy` | `number` | Sí | Energía inicial disponible al comenzar la partida. |
| `maxDeckSlots` | `number` | Sí | Máximo de cartas permitidas en el mazo del jugador. |
| `rows` / `cols` | `number` | No | Dimensiones personalizadas del tablero para ese nivel (`rows`: 1–20, `cols`: 3–24). |
| `grid` | `{ rows?: number, cols?: number }` | No | Alternativa agrupada a `rows`/`cols`. |
| `boardOverride` | `Partial<BoardDesignConfig>` | No | Sobrescribe colores, líneas y fondo de `designs.json -> board` solo para este nivel. |
| `environment` | `LevelEnvironmentConfig` | No | Clima persistente, tinte atmosférico y viñeta de alerta. |
| `rules` | `LevelRulesConfig` | No | Multiplicadores globales del nivel, generación pasiva, tope de energía, límite de torres, vetos y mazo fijo. |
| `disableTeslaGates` | `boolean` | No | Si es `true`, el nivel comienza sin compuertas Tesla de emergencia en el borde izquierdo. |
| `autoCollectEnergy` | `boolean` | No | Si es `true`, las cápsulas de energía se recogen automáticamente al caer. |
| `skyEnergy` | `LevelSkyEnergyConfig` | No | Configura o desactiva (`disabled: true`) la energía caída del cielo. |
| `blockedCells` | `BlockedCellConfig[]` | No | Casillas permanentemente bloqueadas para construir (`[{ "row": 2, "col": 4, "label": "ROTO", "color": "#475569" }]`). |
| `tileOverrides` | `TileOverrideConfig[]` | No | Personalización visual por casilla/fila/columna: color, transparencia, borde, sprite PNG propio y etiqueta. |
| `tileModifiers` | `TileModifierConfig[]` | No | Casillas tácticas con mecánicas activas (curación, daño, mejora de proyectiles, hielo, fuego, perforación, regeneración de barreras, sellos anti-spawn, auras declarativas). |
| `obstacles` | `BoardObstacleConfig[]` | No | Obstáculos interactivos en el tablero (`tombstone`, `barricade`, `anomaly_node`, `debris`, `custom`). |
| `tombstones` | `BoardObstacleConfig[]` | No | Atajo para definir obstáculos con `kind: "tombstone"` por defecto (se fusionan automáticamente con `obstacles`). |
| `startingTowers` | `StartingTowerConfig[]` | No | Torres pre-desplegadas al iniciar el nivel (`type`, `row`, `col`, `hp?`, `immuneToPsych?`, `shieldHp?`). |
| `startingEnemies` | `StartingEnemyConfig[]` | No | SCP ya presentes en el tablero en el segundo `0`. |
| `startingDoors079` | `StartingDoorConfig[]` | No | Puertas iniciales de SCP-079 (`row`, `col`, `isOpen?`, `toggleIntervalSec?`). |
| `globalEffects` | `string[]` | No | Lista de IDs de `effects` aplicados automáticamente por el entorno del nivel a las unidades que correspondan por `targetSide`. |
| `levelEvents` | `Array<string \| object>` | No | Lista de eventos dinámicos (IDs de `events`, eventos inline o `{ "eventId": "...", ...overrides }`). |
| `objectives` | `Array<string \| Partial<ObjectiveDefinition>>` | No | Objetivos primarios, secundarios, bonus o condiciones de fallo (p. ej. `"no_scp_past_col_3"` o un objeto inline completo). |
| `introDialogueId` | `string` | No | ID de diálogo que se reproduce automáticamente al empezar el nivel. |
| `victoryDialogueId` | `string` | No | ID de diálogo que se reproduce al cumplir la victoria, justo antes del modal de Nivel Completado. |
| `defeatDialogueId` | `string` | No | ID de diálogo que se reproduce si ocurre una brecha antes de mostrar la pantalla de Derrota. |
| `inlineDialogues` | `Record<string, DialogueDefinition>` | No | Diálogos locales definidos dentro del propio nivel (prioridad sobre `dialogues` si comparten ID). |
| `victoryCondition` | `LevelVictoryCondition` | No | Condición de victoria y derrota ampliada (`standard`, `survive_time`, `kill_count`, `destroy_obstacles`, `objectives_only`, `survive_and_kill`, `boss_hunt`, `endless`). |
| `enemiesPresent` | `EnemyType[]` | No | Si se omite, el motor los deduce de `events`, `startingEnemies`, `obstacles[].spawnOnDestroy` y `events`. |
| `durationSeconds` | `number` | No | Si se omite, se calcula automáticamente a partir de la línea temporal o `victoryCondition.targetSeconds`. |
| `flagMarkers` | `number[]` | No | Posiciones `0..1` en la barra de progreso; si se omite, se deducen de los eventos con `isFlagHorde: true`. |
| `rewardLabel` | `string \| null` | No | Texto mostrado al completar el nivel. |
| `unlockTower` | `TowerType` | No | ID de la torre desbloqueada al completar este nivel. |
| `events` | `RawLevelEvent[]` | Sí | Línea temporal cronológica de oleadas y disparos puntuales. |

---

### 4.2 Bloque `rules` (Reglas del Nivel)

```json
"rules": {
  "enemyHpMultiplier": 1.3,
  "enemySpeedMultiplier": 1.15,
  "enemyDpsMultiplier": 1.2,
  "towerHpMultiplier": 1.0,
  "towerDamageMultiplier": 1.1,
  "towerFireRateMultiplier": 1.25,
  "towerCostMultiplier": 0.9,
  "towerCooldownMultiplier": 0.8,
  "energyCap": 800,
  "passiveEnergyPerSec": 3.5,
  "maxTowersOnBoard": 16,
  "bannedTowers": ["sniper", "tesla_coil"],
  "lockedDeck": ["researcher", "guard", "engineer", "cryo", "barricade", "mtf"]
}
```

- Si `lockedDeck` está definido, el jugador entra directo al nivel con ese mazo exacto.
- Las torres incluidas en `bannedTowers` no pueden seleccionarse ni colocarse aunque estén desbloqueadas.

---

### 4.3 Bloque `environment` (Clima y Atmósfera)

```json
"environment": {
  "weather": "spores",
  "weatherColor": "rgba(132, 204, 22, 0.55)",
  "weatherDensity": 48,
  "weatherSpeed": 1.1,
  "tintColor": "20, 83, 45",
  "tintAlpha": 0.16,
  "tintPulseSpeed": 2.0,
  "alertLevel": "warning"
}
```

- **`weather`**: `"none" | "ash" | "snow" | "sparks" | "spores" | "rain" | "static" | "embers"`.
- **`alertLevel`**: `"normal" | "warning" | "critical"` (dibuja un marco pulsante de alerta en los bordes).

---

### 4.4 Personalización de Casillas: `tileOverrides` y `tileModifiers`

#### A. `tileOverrides` (Aspecto visual individual o por zona)
Permite pintar suelos diferentes, poner losas temáticas, texturas PNG por casilla o etiquetas tácticas antes de dibujar los modificadores y unidades.

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `row` / `col` | `number` | Coordenada única (`0`-indexada). Si se omite `row` (y `rows`), aplica a toda la columna; si se omite `col` (y `cols`), aplica a toda la fila. |
| `rows` / `cols` | `number[]` | Arreglos de filas o columnas para cubrir zonas o carriles completos. |
| `color` | `string` | Color de relleno CSS (`"#1E293B"`, `"rgba(15, 118, 110, 0.35)"`). |
| `opacity` | `number` | Opacidad del relleno (`0..1`, defecto `1`). |
| `sprite` | `string` | Ruta de imagen PNG/WebP para dibujar encima de la casilla. |
| `spriteOpacity` | `number` | Opacidad del sprite (`0..1`, defecto `0.92`). |
| `strokeColor` | `string` | Color del borde de la casilla personalizada. |
| `label` | `string` | Texto corto en la esquina superior izquierda de la casilla. |
| `labelColor` | `string` | Color del texto `label`. |

Ejemplo:
```json
"tileOverrides": [
  {
    "rows": [1, 2, 3],
    "cols": [0, 1],
    "color": "#13212E",
    "strokeColor": "#38BDF8",
    "label": "ZONA SEGURA",
    "labelColor": "#7DD3FC"
  },
  {
    "row": 2,
    "col": 6,
    "sprite": "/assets/tiles/altar_anomalo.png",
    "spriteOpacity": 0.95,
    "strokeColor": "#A855F7"
  }
]
```

#### B. `tileModifiers` (Casillas con mecánicas de combate, proyectiles y efectos)
Pueden existir al iniciar el nivel (`levels.json -> tileModifiers`) o crearse/eliminarse en tiempo real mediante `events.json` (`addTileModifiers` / `removeTileModifiers`).

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `string` | Identificador opcional para poder eliminarlo luego desde un evento (`removeTileModifiers`). |
| `row` / `col` o `rows` / `cols` | `number` / `number[]` | Casillas donde aplica el modificador (omitido = todo el eje). |
| `kind` | `TileModifierKind` | Tipo de efecto de la casilla (ver tabla de los 17 tipos abajo). |
| `value` | `number` | Magnitud numérica según el `kind`. |
| `appliesEffectId` | `string` | ID de un efecto de `effects.json` que se aplica cuando `kind` es `"apply_effect"`. |
| `targetSide` | `"towers" \| "enemies" \| "all"` | Limita a quién afecta cuando se usa `"apply_effect"` (defecto: `"all"`). |
| `color` / `strokeColor` | `string` | Colores personalizados del relleno y borde discontinuo. |
| `sprite` | `string` | PNG/WebP opcional dibujado en la casilla. |
| `opacity` | `number` | Opacidad visual (`0..1`). |
| `label` | `string` | Etiqueta corta en esquina inferior derecha (sobrescribe la etiqueta automática). |
| `durationSec` | `number` | Duración en segundos si es temporal (muy útil en eventos dinámicos). |

##### Todos los `kind` soportados en `tileModifiers`

| `kind` | Qué hace exactamente | Valor por defecto de `value` |
| :--- | :--- | :--- |
| `"heal"` | Cura cada segundo a la torre situada encima. | `15` HP/s |
| `"regen_barrier"` | Cura prioritariamente a estructuras (`barricade`, `bunker`, etc.) encima, ideal para muros reforzados. | `28` HP/s |
| `"damage_tower"` | Inflige daño continuo a cualquier torre colocada en esta casilla. | `15` DPS |
| `"damage_enemy"` | Inflige daño continuo a los SCP que crucen por esta casilla. | `25` DPS |
| `"heal_enemy"` | Cura a los SCP mientras caminan sobre esta casilla. | `20` HP/s |
| `"boost_fire"` | Multiplica la cadencia de disparo de la torre colocada encima. | `1.4` (+40% velocidad ataque) |
| `"boost_damage"` | Multiplica el daño de la torre colocada encima. | `1.4` (+40% daño) |
| `"slow_enemy"` | Ralentiza el movimiento de los SCP que pisan la casilla. | `0.35` (35% más lentos) |
| `"speed_enemy"` | Acelera el movimiento de los SCP que pisan la casilla (cinta transportadora o rastro anómalo). | `1.45` (+45% velocidad) |
| `"energy"` | Genera energía continua mientras haya una torre desplegada encima. | `5` energía/s |
| `"shield"` | Otorga escudo inicial y regenera escudo cada segundo a la torre situada encima. | `150` escudo inicial / `20` escudo/s |
| `"ignite_projectiles"` | **Estilo antorcha PvZ**: todo proyectil aliado que cruce la casilla se incendia (`burnDps`, `burnDuration`). Si no tiene daño de quemadura, añade quemadura de `value` DPS. | `18` DPS de quemadura durante 3.5s |
| `"chill_projectiles"` | Todo proyectil aliado que atraviese la casilla se vuelve criogénico y ralentiza al impactar. | `0.35` factor de frío durante 2.5s |
| `"pierce_projectiles"` | Vuelve perforantes (`passThrough: true`) a los proyectiles que crucen esta casilla. | — |
| `"boost_projectile_damage"` | Multiplica el daño de cada proyectil aliado **una sola vez** al atravesar la casilla. | `1.5` (+50% daño) |
| `"block_enemy_spawn"` | Sella la casilla para evitar invocaciones o apariciones desde ese punto. | — |
| `"apply_effect"` | Aplica periódicamente (cada 0.5s) el efecto `appliesEffectId` de `effects.json` sobre torres o SCP en esa casilla. | — |

Ejemplo combinado:
```json
"tileModifiers": [
  {
    "rows": [0, 2, 4],
    "cols": [3],
    "kind": "ignite_projectiles",
    "value": 24,
    "sprite": "/assets/tiles/brasero.png",
    "label": "FUEGO"
  },
  {
    "row": 2,
    "col": 2,
    "kind": "boost_projectile_damage",
    "value": 1.6,
    "label": "+60% BALA"
  },
  {
    "rows": [1, 3],
    "cols": [4, 5],
    "kind": "apply_effect",
    "appliesEffectId": "mi_veneno_lento",
    "targetSide": "enemies",
    "label": "ÁCIDO"
  }
]
```

---

### 4.5 Lápidas y Obstáculos del Tablero: `obstacles` y `tombstones` (Estilo PvZ)

Permiten colocar lápidas, barricadas, nodos anómalos o escombros destructibles que interactúan con el combate igual que las **lápidas de Plants vs. Zombies**:

- Pueden **bloquear casillas** de construcción (`blocksPlacement`).
- Pueden **interceptar proyectiles** (`blocksProjectiles`) y absorber explosiones (`absorbsSplash`).
- Pueden **despejarse instantáneamente al colocar encima una unidad contramedida** (`allowCounterPlacement: true`, por defecto `"engineer"` y `"grenadier"` en las lápidas, estilo *Comepiedras / Grave Buster*).
- Pueden **romperse a disparos** (si `destructible: true`) o recibir daño multiplicado por las unidades contramedida (`counterDamageMultiplier`, defecto `4.0`).
- Pueden mostrar una **imagen PNG sana** (`sprite`) y cambiar automáticamente a otra **imagen PNG agrietada** (`crackedSprite`) cuando su salud baja del 50%.
- Pueden **dar energía al destruirse** (`rewardEnergy`), **invocar un SCP al romperse** (`spawnOnDestroy`) o **disparar un evento completo** de `events.json` (`triggerEventOnDestroy`).
- Pueden funcionar como **puntos de emboscada** durante las oleadas mediante `spawnFromObstacles` en `events.json` (¡SCP saliendo directamente de las lápidas en mitad de la partida!).

#### Esquema completo de `BoardObstacleConfig`

| Campo | Tipo | Defecto según `kind` | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Auto | ID único opcional. |
| `kind` | `"tombstone" \| "barricade" \| "anomaly_node" \| "debris" \| "custom"` | `"tombstone"` | Tipo visual/lógico del obstáculo. |
| `row` | `number` | Obligatorio | Fila del tablero (`0..gridRows-1`). |
| `col` | `number` | Obligatorio | Columna del tablero (`0..gridCols-1`). |
| `hp` | `number` | `320` (`tombstone`) / `450` (otros) | Puntos de vida máximos. |
| `destructible` | `boolean` | `true` (o `hp > 0`) | Si puede destruirse por ataques o contramedidas. |
| `blocksPlacement` | `boolean` | `true` | Impide colocar torres normales encima. |
| `blocksProjectiles` | `boolean` | `true` | Intercepta proyectiles aliados (a menos que sean `passThrough`). |
| `blocksEnemies` | `boolean` | `true` para `barricade`/`debris`; `false` para `tombstone` | Si es `true`, los SCP se detienen y atacan el obstáculo cuerpo a cuerpo como si fuera una barrera. |
| `blocksEnemySpawn` | `boolean` | `false` | Evita que nazcan enemigos en esa casilla. |
| `canSpawnEnemies` | `boolean` | `true` para `tombstone`; `false` otros | Habilita que eventos con `spawnFromObstacles` hagan emerger SCP desde este obstáculo. |
| `allowCounterPlacement` | `boolean` | `true` para `tombstone` | Permite colocar una torre en `counterTowerTypes` encima para destruir la lápida al instante y desplegar ahí la torre. |
| `counterTowerTypes` | `TowerType[]` | `["engineer", "grenadier"]` | Torres habilitadas para despejar el obstáculo directamente y que además infligen `counterDamageMultiplier` si le disparan. |
| `counterDamageMultiplier` | `number` | `4.0` | Multiplicador de daño contra el obstáculo si ataca una unidad incluida en `counterTowerTypes`. |
| `absorbsSplash` | `boolean` | `true` | Si recibe daño en área de granadas o explosiones. |
| `rewardEnergy` | `number` | `25` (`tombstone`) / `0` (otros) | Energía otorgada al jugador cuando el obstáculo se destruye. |
| `spawnOnDestroy` | `ObstacleDestroySpawnConfig` | — | Invoca SCP automáticamente al romperse (`{ type, count?, hpMultiplier?, speedMultiplier?, dpsMultiplier?, extraEffects?, immunities?, eliteBadge?, eliteColor? }`). |
| `triggerEventOnDestroy` | `string` | — | ID de un evento de `events.json` que se dispara al destruirse. |
| `sprite` | `string` | — | Ruta PNG/WebP del obstáculo sano. |
| `crackedSprite` | `string` | — | Ruta PNG/WebP cuando `hp <= maxHp * 0.5`. |
| `color` / `strokeColor` / `crackedColor` | `string` | — | Colores de respaldo si no hay sprite PNG. |
| `label` | `string` | — | Etiqueta pequeña opcional sobre el obstáculo. |
| `widthRatio` / `heightRatio` | `number` | `0.78` / `0.82` | Escala relativa del sprite respecto al tamaño de la casilla. |

Ejemplo de lápidas en `levels.json`:
```json
"tombstones": [
  {
    "row": 1,
    "col": 6,
    "hp": 360,
    "rewardEnergy": 30,
    "allowCounterPlacement": true,
    "counterTowerTypes": ["engineer", "grenadier"],
    "sprite": "/assets/obstacles/lapida_sana.png",
    "crackedSprite": "/assets/obstacles/lapida_rota.png",
    "label": "CRIPTA 01"
  },
  {
    "row": 3,
    "col": 7,
    "hp": 420,
    "rewardEnergy": 40,
    "spawnOnDestroy": {
      "type": "scp_008",
      "count": 1,
      "eliteBadge": "RESURGIDO",
      "eliteColor": "#22C55E"
    },
    "triggerEventOnDestroy": "alerta_lapida_rota"
  }
]
```

---

### 4.6 Condiciones de Victoria y Derrota (`victoryCondition`)

```json
"victoryCondition": {
  "mode": "survive_and_kill",
  "targetSeconds": 120,
  "targetKills": 45,
  "targetEnemyTypes": ["scp_173", "scp_682"],
  "targetObstacles": 4,
  "obstacleKind": "tombstone",
  "requireClearAfter": true,
  "breachCol": 0,
  "defeatOnZeroTowersAfterSec": 25,
  "label": "Resiste 120s y elimina 45 SCP",
  "victoryTitle": "Protocolo Alfa Cumplido",
  "victorySubtitle": "Todos los objetivos de contención fueron asegurados."
}
```

#### Todos los modos `mode` soportados:
| Modo | Cómo se gana |
| :--- | :--- |
| `"standard"` | Todas las oleadas de `events[]` terminan, no quedan SCP vivos en el tablero y todos los objetivos primarios están cumplidos. |
| `"survive_time"` | Aguantar `targetSeconds` segundos (+ limpiar enemigos si `requireClearAfter: true`) y cumplir objetivos primarios. |
| `"kill_count"` | Eliminar al menos `targetKills` SCP (global o filtrado por `targetEnemyTypes`) y cumplir objetivos primarios. |
| `"survive_and_kill"` | Combinar tiempo (`targetSeconds`) **y** bajas (`targetKills`), útil para asedios exigentes. |
| `"destroy_obstacles"` | Destruir todos los obstáculos (o `targetObstacles` del tipo `obstacleKind`) y opcionalmente limpiar enemigos (`requireClearAfter`). |
| `"objectives_only"` | La victoria salta en cuanto se completan todos los objetivos `"primary"` / `requiredForVictory: true` del nivel (ideal para misiones tácticas). |
| `"boss_hunt"` | Neutralizar a todos los tipos listados en `targetEnemyTypes` (p. ej. `["scp_682"]`). |
| `"endless"` | Modo infinito: cuando termina la línea temporal, reinicia las oleadas en un nuevo ciclo progresivamente más difícil (`endlessCycle`) sin finalizar por victoria. |

#### Reglas adicionales de derrota en `victoryCondition`:
- **`breachCol`** (`number`): columna a partir de la cual se dispara la brecha/Tesla izquierda (por defecto `-0.22`). Si pones p. ej. `2.5`, los SCP provocan brecha antes del borde izquierdo.
- **`defeatOnZeroTowersAfterSec`** (`number`): si a partir de ese segundo de partida no queda ninguna torre viva en el tablero, pierdes automáticamente.
- **`victoryTitle` / `victorySubtitle`**: textos personalizados para el modal de victoria.

---

## 5. `objectives.json` / `objetives.json` y `objectives/` — Objetivos y Restricciones de Perímetro

Los objetivos se pueden definir en `src/data/json/objectives/<id>.json`, en `src/data/json/objectives.json` o `src/data/json/objetives.json`, o directamente inline dentro de `levels/<n>.json -> objectives[]`.

### 5.1 Presets incluidos en `src/data/json/objectives/`
- `"no_scp_past_col_3"`: **No dejes que ningún SCP cruce más allá de la columna 3** (dibuja una línea roja vertical en la columna 3 y provoca derrota inmediata si algún enemigo la pisa).
- `"no_scp_past_col_4"`: Límite de perímetro en la columna 4.
- `"no_tesla_gate"`: No activar ninguna puerta Tesla de emergencia.
- `"max_2_towers_lost"`: No perder más de 2 torres desplegadas.
- `"kill_15_scps"`: Contener al menos 15 SCP.
- `"destroy_all_tombstones"`: Despejar todas las lápidas del tablero.
- `"protect_tombstones"`: Proteger los nodos/lápidas sin que sean destruidos por enemigos.
- `"min_energy_200"`: Terminar el nivel con al menos 200 de energía.

### 5.2 Cómo referenciar o personalizar un objetivo en un nivel
Puedes mezclar strings (IDs) y objetos con sobrescrituras parciales o definiciones completas:
```json
"objectives": [
  "no_scp_past_col_3",
  { "objectiveId": "kill_15_scps", "targetCount": 25, "description": "Elimina 25 SCP en el corredor." },
  {
    "id": "sin_bajas_medicos",
    "title": "Proteger Médicos",
    "description": "No pierdas más de 1 unidad o se aborta la misión.",
    "category": "fail_condition",
    "kind": "max_towers_lost",
    "maxCount": 1,
    "failOnViolate": true,
    "failReason": "Se perdieron demasiados efectivos médicos."
  }
]
```

### 5.3 Todos los `kind` soportados en `ObjectiveDefinition`

| `kind` | Qué evalúa | Parámetros clave |
| :--- | :--- | :--- |
| `"no_enemy_past_col"` | Falla si un SCP alcanza `col <= def.col` (ej. `col: 3`). Dibuja línea vertical automática en el canvas. | `col`, `ignoreSkyFalling?`, `enemyTypes?`, `excludeEnemyTypes?`, `showBoundaryLine?`, `boundaryColor?`, `boundaryLabel?` |
| `"no_enemy_reach_row_col"` | Falla si un SCP entra en el rectángulo `rows` × `[minCol..maxCol]`. | `rows?`, `minCol?`, `maxCol?`, `col?`, `enemyTypes?` |
| `"no_tesla_gate_used"` | Falla si se activa cualquier compuerta Tesla de emergencia. | `failOnViolate?` |
| `"max_tesla_gates_used"` | Falla si se activan más de `maxCount` compuertas Tesla. | `maxCount` |
| `"max_towers_lost"` | Falla si mueren más de `maxCount` torres. | `maxCount` |
| `"max_towers_deployed"` | Falla si despliegas más de `maxCount` torres en toda la partida. | `maxCount` |
| `"max_towers_alive"` | Falla si hay más de `maxCount` torres vivas a la vez. | `maxCount`, `towerTypes?`, `towerCategory?` |
| `"min_towers_alive"` | Exige mantener al menos `minCount` torres activas. | `minCount`, `towerTypes?`, `towerCategory?` |
| `"protect_obstacles"` | Falla si los SCP destruyen más de `maxCount` obstáculos (`obstacleKind?`). | `maxCount`, `obstacleKind?` |
| `"destroy_all_obstacles"` | Se completa cuando todos los obstáculos (`obstacleKind?`) han sido destruidos. | `obstacleKind?`, `rewardEnergy?` |
| `"kill_enemies"` | Se completa al eliminar `targetCount` SCP (filtrable por `enemyTypes` / `excludeEnemyTypes`). | `targetCount`, `enemyTypes?`, `excludeEnemyTypes?`, `rewardEnergy?` |
| `"min_energy_remaining"` | Evalúa al terminar la misión si conservas al menos `minEnergy` de energía. | `minEnergy` |
| `"max_energy_spent"` | Falla si el gasto acumulado en despliegues supera `maxEnergy`. | `maxEnergy` |
| `"survive_time"` | Se completa al llegar a `targetSeconds` segundos. | `targetSeconds`, `rewardEnergy?` |
| `"no_tower_type_used"` | Falla si el jugador coloca alguna torre listada en `towerTypes`. | `towerTypes` |
| `"keep_tower_hp_above"` | Falla si alguna torre viva cae por debajo de `minHpRatio` (`0..1`) de salud. | `minHpRatio`, `towerTypes?`, `towerCategory?` |
| `"event_triggered"` | Se completa cuando se ejecuta el evento `eventId` de `events`. | `eventId` |

### 5.4 Campos comunes de `ObjectiveDefinition`
- `id`, `title`, `description`, `color`
- `category`: `"primary" | "secondary" | "bonus" | "fail_condition"`
- `requiredForVictory`: `true` impide ganar la partida hasta que el objetivo esté completo.
- `failOnViolate`: `true` provoca **derrota inmediata** en el instante en que se incumpla el límite (con mensaje `failReason` en pantalla).
- `rewardEnergy`: energía instantánea otorgada al completar un objetivo progresivo.

---

### 4.7 Línea Temporal del Nivel (`events[]`)

Cada entrada representa un instante de aparición de oleada y/o un disparo de diálogo o evento.

| Campo | Tipo | Obligatorio | Descripción |
| :--- | :--- | :--- | :--- |
| `time` | `number` | Sí | **Segundos relativos** desde la entrada anterior (`0` en la primera = segundo `0`). |
| `absoluteTime` | `number` | No | Alternativa: segundo exacto desde el inicio del nivel. |
| `type` | `EnemyType` | No* | Tipo de SCP (*opcional si solo se usa `eventId`, `event` o `dialogueId`). |
| `row` / `rows` | `number \| [r1, r2]` | No | Fila fija o lista de filas; si se omite, elige al azar. `[r1, r2]` ocupa 2 carriles (ej. SCP-682). |
| `col` | `number` | No | Columna inicial personalizada (defecto: entrada derecha). |
| `count` | `number` | No | Cantidad de SCP a invocar. |
| `staggerSec` | `number` | No | Separación en segundos entre cada unidad de `count`. |
| `repeat` | `{ times: number, intervalSec: number }` | No | Repite esta entrada `times` veces cada `intervalSec` segundos. |
| `isFlagHorde` | `boolean` | No | Marca la oleada como Gran Horda con bandera y activa eventos `on_flag_horde`. |
| `hordeLabel` | `string` | No | Texto del banner rojo de Gran Horda. |
| `hpMultiplier`, `speedMultiplier`, `dpsMultiplier` | `number` | No | Escalado de vida, velocidad y daño solo para esa oleada. |
| `extraEffects` | `string[]` | No | Efectos de `effects.json` adheridos a esos SCP al nacer. |
| `immunities` | `EnemyImmunity[]` | No | Inmunidades extra (`"slow"`, `"burn"`, `"stun"`, `"explosion"`, `"silence"`, `"all_effects"`). |
| `eliteBadge`, `eliteColor` | `string` | No | Etiqueta y color identificador sobre esos SCP. |
| `announcement` | `string` | No | Aviso superior de texto al lanzarse la entrada. |
| `dialogueId` | `string` | No | ID de diálogo (`inlineDialogues` o `dialogues.json`) que salta en este momento de la partida. |
| `inlineDialogue` | `DialogueDefinition` | No | Objeto de diálogo completo definido directamente aquí. |
| `eventId` | `string` | No | ID de un evento de `events.json` a ejecutar en este momento. |
| `eventOverrides` | `Partial<LevelEventDefinition>` | No | Sobrescrituras sobre el evento referenciado en `eventId`. |
| `event` | `Partial<LevelEventDefinition>` | No | Evento completo inline. |

---

## 5. `events.json` — Motor de Eventos (`logic` + `visual`) y Mutación Específica de SCPs

Este archivo empieza vacío `{}` para que puedas construir tu propia biblioteca de eventos desde cero.

Cada evento se compone de:
- Metadatos (`id`, `name`, `description`)
- Condición de activación (`trigger` + parámetros del disparador)
- Bloque **`logic`** (todo lo que modifica la simulación real)
- Bloque **`visual`** (toda la puesta en escena audiovisual)

### 5.1 Disparadores Disponibles (`trigger`)

| `trigger` | Campos adicionales | Cuándo se dispara |
| :--- | :--- | :--- |
| `"on_start"` | — | Una vez al arrancar la simulación (`t >= 0`). |
| `"at_time"` | `time` (segundos) | Una vez al alcanzar el segundo `time`. |
| `"periodic"` | `initialDelaySec`, `intervalSec`, `maxTriggers?`, `cooldownSec?`, `chance?` | De forma cíclica cada `intervalSec` segundos. |
| `"on_flag_horde"` | `cooldownSec?`, `chance?`, `maxTriggers?` | Cada vez que llega una oleada marcada con `isFlagHorde: true`. |
| `"on_progress"` | `progressRatio` (`0..1`) | Una vez cuando la barra de progreso del nivel alcanza `progressRatio`. |
| `"on_enemy_count_above"` | `threshold`, `cooldownSec?`, `maxTriggers?` | Al haber `>= threshold` SCP vivos en el tablero (flanco de subida). |
| `"on_enemy_count_below"` | `threshold`, `cooldownSec?`, `maxTriggers?` | Al bajar a `<= threshold` SCP vivos. |
| `"on_tower_count_above"` | `threshold`, `cooldownSec?`, `maxTriggers?` | Al haber `>= threshold` torres en pie. |
| `"on_tower_count_below"` | `threshold`, `cooldownSec?`, `maxTriggers?` | Al caer a `<= threshold` torres desplegadas. |
| `"on_energy_above"` | `threshold`, `cooldownSec?`, `maxTriggers?` | Al superar `threshold` de energía acumulada. |
| `"on_energy_below"` | `threshold`, `cooldownSec?`, `maxTriggers?` | Al caer por debajo de `threshold` de energía. |
| `"on_kill_count"` | `threshold` | Al alcanzar `threshold` eliminaciones. |
| `"on_obstacle_destroyed"` | `threshold?` (defecto `1`), `cooldownSec?`, `maxTriggers?` | Cuando se destruyen obstáculos/lápidas (con `threshold: 1` o por transición de incremento). |
| `"on_dialogue_end"` | `targetDialogueId?`, `cooldownSec?`, `maxTriggers?` | Justo al cerrarse un diálogo (`targetDialogueId` concreto o cualquier diálogo si se omite). |
| `"on_enemy_type_spawn"` | `targetEnemyType?`, `cooldownSec?`, `maxTriggers?` | En el instante en que aparece en el tablero un SCP concreto (ej. `"scp_173"` o `"scp_682"`), o cualquiera si se omite `targetEnemyType`. |
| `"on_enemy_low_hp"` | `targetEnemyType?`, `hpThresholdRatio?` (defecto `0.4`), `cooldownSec?`, `maxTriggers?` | Cuando un SCP vivo (opcionalmente filtrado por `targetEnemyType`) cae a `<= hpThresholdRatio` de vida máxima (ideal para fases 2 de jefes). |
| `"on_wave_index"` | `waveIndex` (`0`-indexado) | Exactamente cuando se ejecuta la entrada número `waveIndex` de `events[]` del nivel. |

---

### 5.2 Selector y Filtro Avanzado de SCPs (`EnemyTargetFilter`)

Disponible tanto en `logic.mutateEnemies[].filter` como en `logic.applyEffects[].enemyFilter`. Te permite seleccionar con precisión quirúrgica **a qué zombis/SCPs específicos** afectar:

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `types` | `string[]` | Solo SCP cuyo `type` esté en esta lista (ej. `["scp_008", "scp_049_2"]`). |
| `excludeTypes` | `string[]` | Excluye estos tipos de SCP (ej. `["scp_682"]`). |
| `packIds` | `string[]` | Filtra por ID de lote/oleada de spawn si se asignó. |
| `eliteOnly` | `boolean` | Si es `true`, solo afecta a SCPs con etiqueta de élite/badge. |
| `nonEliteOnly` | `boolean` | Si es `true`, excluye élites. |
| `eliteBadges` | `string[]` | Filtra por texto exacto del badge (ej. `["ALFA", "MUTANTE"]`). |
| `rows` | `number[]` | Solo enemigos en esas filas. |
| `cols` | `number[]` | Solo enemigos en esas columnas redondeadas. |
| `colRange` | `[minCol, maxCol]` | Solo enemigos cuya columna exacta esté en ese rango (ej. `[0, 4]` = mitad izquierda cerca de la brecha). |
| `minHpRatio` / `maxHpRatio` | `number` (`0..1`) | Filtra por porcentaje actual de vida (ej. `maxHpRatio: 0.5` = heridos al 50% o menos). |
| `isAttacking` | `boolean` | `true` si están atacando una torre ahora mismo; `false` si están avanzando. |
| `hasEffectIds` | `string[]` | Solo SCP que tengan activo alguno de estos efectos de `effects.json`. |
| `sortBy` | `"closest_to_breach" \| "furthest_from_breach" \| "lowest_hp" \| "highest_hp" \| "fastest" \| "random"` | Orden de prioridad antes de aplicar `maxTargets`. |
| `maxTargets` | `number` | Número máximo de SCP objetivo seleccionados tras ordenar. |

---

### 5.3 Bloque `logic` (Todas las acciones disponibles)

1. **`spawns`**: Arreglo de oleadas inmediatas (`type`, `count?`, `row?`, `rows?`, `col?`, `staggerSec?`, `hpMultiplier?`, `speedMultiplier?`, `dpsMultiplier?`, `extraEffects?`, `immunities?`, `eliteBadge?`, `eliteColor?`).
2. **`spawnFromObstacles`** *(Emboscada de Lápidas PvZ)*:
   Hace emerger SCP directamente desde las lápidas/obstáculos vivos en el tablero:
   ```json
   "spawnFromObstacles": {
     "obstacleKind": "tombstone",
     "rows": [0, 1, 2, 3, 4, 5],
     "cols": [4, 5, 6, 7, 8],
     "types": [
       { "type": "scp_008", "hpMultiplier": 1.2, "eliteBadge": "TUMBA", "eliteColor": "#4ADE80" }
     ],
     "countPerObstacle": 1,
     "destroyObstacleAfter": false,
     "maxObstacles": 4
   }
   ```
3. **`spawnObstacles`**: Coloca dinámicamente nuevas lápidas, barricadas o nodos anómalos en mitad de la partida (`BoardObstacleConfig[]`).
4. **`destroyObstacles`**: Destruye obstáculos filtrados por `{ kind?, rows?, cols?, triggerDestroyEffects? }`.
5. **`addTileModifiers`** / **`removeTileModifiers`**: Crea o elimina casillas especiales dinámicamente durante el nivel (`removeTileModifiers: { id?, kind?, rows?, cols? }`).
6. **`addBlockedCells`** / **`removeBlockedCells`**: Bloquea o despeja casillas de construcción en tiempo real.
7. **`mutateEnemies`** *(Modificación Directa a Zombis/SCPs Específicos)*:
   Permite transformar, potenciar, herir, curar, empujar o mutar directamente a los SCP seleccionados por `filter`:
   ```json
   "mutateEnemies": [
     {
       "filter": {
         "types": ["scp_008"],
         "maxHpRatio": 0.6,
         "sortBy": "closest_to_breach",
         "maxTargets": 3
       },
       "healPercent": 0.4,
       "shieldHp": 180,
       "shieldColor": "#22C55E",
       "speedMultiplier": 1.35,
       "dpsMultiplier": 1.25,
       "knockbackCols": 0,
       "transformToType": "scp_049_2",
       "addEffects": ["mi_furia_viral"],
       "addImmunities": ["slow"],
       "eliteBadge": "MUTADO",
       "eliteColor": "#22C55E",
       "floatingText": "¡MUTACIÓN!",
       "floatingTextColor": "#4ADE80",
       "triggerEffectId": "mi_onda_viral",
       "sound": "revive"
     }
   ]
   ```
   **Todos los campos de `EnemyMutationEntry`**:
   - `filter`: `EnemyTargetFilter` (opcional; si se omite aplica a todos los SCP vivos).
   - `damageInstant`, `damagePercentMaxHp`, `healAmount`, `healPercent`, `shieldHp`, `shieldColor`.
   - `hpMultiplier` (escala `hp` y `maxHp` permanentemente), `speedMultiplier`, `dpsMultiplier`.
   - `stunSec`, `slowFactor`, `slowSec`, `burnDps`, `burnSec`, `silenceSec`.
   - `knockbackCols`, `advanceCols`, `teleportToCol`, `shiftLane`.
   - `transformToType`: **Transforma in-situ** al enemigo en otro `EnemyType` conservando su proporción de vida y posición.
   - `addEffects`, `removeEffects`, `addImmunities`, `removeImmunities`.
   - `eliteBadge`, `eliteColor`, `floatingText`, `floatingTextColor`, `triggerEffectId`, `sound`.
8. **`applyEffects`**: Aplica uno o varios efectos de `effects.json` o `inlineEffect` filtrando torres o enemigos (soporta `enemyFilter`).
9. **`energyDelta`** y **`energyDrops`**: Suma o resta energía o lanza cápsulas en casillas.
10. **`clearNegativeTowerStatuses`** / **`clearNegativeEnemyStatuses`**.
11. **`spawnDoors079`** / **`clearDoors079`**.
12. **`teslaGateAction`**: `{ "action": "fire" | "disable" | "enable" | "recharge", "rows?": [0, 2] }`.
13. **`globalModifiers`**: Modificadores globales con `durationSec`.
14. **`boardOverride`** + **`boardOverrideDurationSec`**: Cambio temporal de estética del tablero.
15. **`dialogueId`** / **`inlineDialogue`**: Lanza una escena de diálogo visual en ese punto de la partida.
16. **`chainEventId`** + **`chainDelaySec`**: Encadena otro evento tras N segundos.
17. **`announcement`**, **`bannerText`**, **`bannerStyle`** (`"info" | "warning" | "danger" | "horde"`).

---

### 5.4 Bloque `visual` (Escenografía y Efectos Audiovisuales)

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `screenTintRgb`, `screenTintAlpha`, `screenTintDurationSec`, `screenTintPulseSpeed` | `string` / `number` | Tiñe la pantalla completa temporalmente (ej. `"220, 38, 38"`). |
| `flashRgb`, `flashAlpha`, `flashDecaySpeed` | `string` / `number` | Destello instantáneo que se desvanece suavemente. |
| `shakeIntensity`, `shakeDurationSec` | `number` | Sacudida de cámara en píxeles. |
| `weather`, `weatherColor`, `weatherDensity`, `weatherSpeed`, `weatherDurationSec` | `string` / `number` | Sobrescribe el clima temporalmente (`"rain"`, `"embers"`, `"spores"`, `"static"`, etc.). |
| `laneHighlight` | `{ rows?, cols?, color?, strokeColor?, label?, durationSec?, pulseSpeed? }` | Ilumina carriles o casillas de aviso antes/durante un ataque. |
| `waveKind`, `waveColorRgb`, `waveRadiusPx`, `waveDurationSec`, `waveRow?`, `waveCol?` | `string` / `number` | Onda visual centrada en casilla específica o centro del mapa. |
| `particleBurst` | `{ color, count?, speedPx?, durationSec?, sizePx? }` | Explosión de partículas. |
| `floatingText`, `floatingTextColor` | `string` | Texto flotante en el tablero. |
| `bannerText`, `bannerColor`, `bannerBorderColor`, `bannerDurationSec` | `string` / `number` | Banner superior dentro del área del canvas. |
| `sound` | `EffectSoundKey` | `"explosion" \| "heal" \| "revive" \| "stun" \| "scream066" \| "pull" \| "portal" \| "tesla" \| "blink" \| "place" \| "collect" \| "door" \| "horde" \| "alert"`. |

---

## 6. `characters.json` — Personajes, Retratos PNG y Múltiples Expresiones

Archivo vacío `{}` por defecto en `src/data/json/characters.json`. Soporta diccionario `{ "id": {...} }` o arreglo `[{ "id": ..., ... }]`.

### Esquema de `CharacterDefinition`

| Campo | Tipo | Obligatorio | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Sí | Clave única referenciada desde `dialogues.json` (`"characterId": "dra_elena"`). |
| `name` | `string` | Sí | Nombre visible en el cuadro de diálogo. |
| `title` | `string` | No | Rango o cargo (ej. `"Directora de Contención"`). |
| `role` | `string` | No | Alternativa a `title` si no se define `title`. |
| `faction` | `string` | No | Facción o departamento (ej. `"Fuerza Operativa Móvil Epsilon-11"`). |
| `description` | `string` | No | Biografía corta visible en la pestaña **Personajes** del Archivo Táctico. |
| `defaultExpression` | `string` | No | Clave de expresión por defecto si la línea no especifica `expression` (defecto `"neutral"`). |
| `defaultPortrait` | `string` | No | Ruta PNG de respaldo si no existe la clave de expresión buscada. |
| `expressions` | `Record<string, string>` | No | Diccionario clave de expresión -> ruta PNG (`"neutral"`, `"alerta"`, `"herido"`, `"feliz"`, `"enojado"`, `"radio"`, o cualquier nombre que inventes). |
| `side` | `"left" \| "right" \| "center"` | No | Posición del retrato (izquierda, derecha o centrado). |
| `accentColor` | `string` | No | Color del marco del retrato y del nombre del personaje (ej. `"#38BDF8"`). |
| `textColor` | `string` | No | Color opcional del texto hablado por este personaje. |

### Cómo resuelve el motor la imagen PNG en cada línea de diálogo
1. Si la línea tiene `portrait`, usa esa ruta exacta.
2. Si no, busca `character.expressions[line.expression ?? character.defaultExpression ?? "neutral"]`.
3. Si esa expresión no existe, usa `character.defaultPortrait`.
4. Si la imagen todavía no existe en disco o falla al cargar, el motor muestra automáticamente un retrato de respaldo elegante con el nombre del personaje y su expresión activa (nunca muestra un icono roto).

### Ejemplo completo para `src/data/json/characters.json`

```json
{
  "dra_elena": {
    "id": "dra_elena",
    "name": "Dra. Elena Vance",
    "title": "Jefa de Contención Biológica",
    "faction": "Sitio-19 · Ala Médica",
    "description": "Coordina las respuestas tácticas contra brechas infecciosas y anomalías clase Euclid.",
    "defaultExpression": "neutral",
    "defaultPortrait": "/assets/characters/elena_neutral.png",
    "expressions": {
      "neutral": "/assets/characters/elena_neutral.png",
      "alerta": "/assets/characters/elena_alerta.png",
      "sonriendo": "/assets/characters/elena_sonriendo.png",
      "herida": "/assets/characters/elena_herida.png"
    },
    "side": "left",
    "accentColor": "#38BDF8"
  },
  "com_marcus": {
    "id": "com_marcus",
    "name": "Comandante Marcus",
    "title": "Líder de Escuadra",
    "faction": "Destacamento MTF",
    "defaultExpression": "serio",
    "expressions": {
      "serio": "/assets/characters/marcus_serio.png",
      "gritando": "/assets/characters/marcus_gritando.png",
      "radio": "/assets/characters/marcus_radio.png"
    },
    "side": "right",
    "accentColor": "#F59E0B"
  }
}
```

---

## 7. `dialogues.json` — Sistema de Diálogos, Ramificaciones, Audio y Eventos

Archivo vacío `{}` por defecto en `src/data/json/dialogues.json`. Soporta diccionario `{ "id": {...} }` o arreglo `[{ "id": ..., ... }]`.

### Esquema de `DialogueDefinition`

| Campo | Tipo | Defecto | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Obligatorio | Identificador único del diálogo. |
| `title` | `string` | — | Título descriptivo mostrado en la pestaña Diálogos y accesibilidad. |
| `description` | `string` | — | Nota editorial visible en el Archivo Táctico. |
| `pauseGame` | `boolean` | `true` | Si es `true`, pausa automáticamente la simulación mientras dura el diálogo (en `intro` y post-partida siempre detiene el flujo hasta terminar). |
| `skippable` | `boolean` | `true` | Muestra el botón **Saltar** y habilita la tecla `Escape`. |
| `typingSpeedCps` | `number` | `52` | Caracteres por segundo de la animación máquina de escribir. |
| `backdropTint` | `string` | `"rgba(8, 12, 18, 0.62)"` | Color del velo detrás del cuadro de diálogo. |
| `onCompleteEventId` | `string` | — | Evento de `events.json` que se ejecuta automáticamente al terminar todo el diálogo. |
| `lines` | `DialogueLine[]` | Obligatorio | Lista secuencial (o ramificada) de líneas de conversación. |

### Esquema de cada línea (`DialogueLine`)

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `string` | ID opcional de la línea para poder saltar hacia ella mediante `nextLineId`. |
| `characterId` | `string` | ID del personaje en `characters.json`. |
| `speakerName` | `string` | Sobrescribe o define el nombre si no hay `characterId`. |
| `speakerTitle` | `string` | Sobrescribe el cargo/subtítulo. |
| `expression` | `string` | Clave de expresión en `characters[characterId].expressions` (ej. `"alerta"`). |
| `portrait` | `string` | Ruta PNG directa que anula la expresión del personaje solo para esta línea. |
| `side` | `"left" \| "right" \| "center"` | Anula la posición del retrato para esta línea. |
| `text` | `string` | Texto mostrado al jugador. |
| `color` | `string` | Color de acento puntual para esta línea. |
| `sound` | `EffectSoundKey` | Sonido reproducido al entrar en esta línea (`"alert"`, `"door"`, `"tesla"`, `"horde"`, etc.). |
| `triggerEventId` | `string` | Evento de `events.json` ejecutado inmediatamente al aparecer esta línea. |
| `energyDelta` | `number` | Energía sumada/restada al jugador al llegar a esta línea. |
| `autoAdvanceSec` | `number` | Si se define, avanza automáticamente tras N segundos después de completarse el texto. |
| `nextLineId` / `nextIndex` | `string` / `number` | Salta a otra línea específica en lugar de la siguiente consecutiva. |
| `endAfterLine` | `boolean` | Cierra el diálogo al terminar esta línea aunque haya más líneas debajo (útil en ramas). |
| `choices` | `DialogueChoice[]` | Botones de decisión para el jugador: `{ label, nextLineId?, nextIndex?, nextDialogueId?, triggerEventId?, energyDelta?, closeDialogue? }`. |

### Ejemplo completo para `src/data/json/dialogues.json`

```json
{
  "mision1_intro": {
    "id": "mision1_intro",
    "title": "Informe de Brecha: Sector Tumba",
    "description": "Introducción táctica con decisión de refuerzo inicial.",
    "pauseGame": true,
    "skippable": true,
    "typingSpeedCps": 55,
    "onCompleteEventId": "inicio_lluvia_ligera",
    "lines": [
      {
        "id": "l1",
        "characterId": "dra_elena",
        "expression": "alerta",
        "sound": "alert",
        "text": "¡Sensores biológicos detectan anomalías enterradas bajo las losas del sector!"
      },
      {
        "id": "l2",
        "characterId": "com_marcus",
        "expression": "radio",
        "sound": "door",
        "text": "Comandante, podemos despejar las lápidas con Ingenieros antes de que emerjan más infectados. ¿Qué protocolo autorizamos?",
        "choices": [
          {
            "label": "Enviar suministro eléctrico (+75 Energía)",
            "nextLineId": "ruta_energia",
            "energyDelta": 75
          },
          {
            "label": "Destruir lápidas del frente ahora",
            "nextLineId": "ruta_artilleria",
            "triggerEventId": "bombardeo_lapidas_inicial"
          }
        ]
      },
      {
        "id": "ruta_energia",
        "characterId": "dra_elena",
        "expression": "sonriendo",
        "text": "Transferencia confirmada. Usa esa energía para desplegar defensa de inmediato.",
        "endAfterLine": true
      },
      {
        "id": "ruta_artilleria",
        "characterId": "com_marcus",
        "expression": "gritando",
        "sound": "explosion",
        "text": "¡Fuego de mortero sobre el perímetro! Terreno parcialmente despejado.",
        "endAfterLine": true
      }
    ]
  }
}
```

### Cómo activar diálogos desde cualquier lugar
1. En `levels.json`: `introDialogueId`, `victoryDialogueId`, `defeatDialogueId`.
2. En `levels.json -> events[]`: añadiendo `dialogueId` o `inlineDialogue` en cualquier marca de tiempo de la oleada.
3. En `events.json -> logic`: usando `dialogueId` o `inlineDialogue` cuando se cumpla cualquier `trigger` (por ejemplo al bajar un jefe de vida con `on_enemy_low_hp`).
4. Con `on_dialogue_end` + `targetDialogueId` en `events.json`, puedes lanzar mecánicas especiales exactamente cuando el jugador termina de leer una escena.

---

## 8. `effects.json` — Motor Declarativo de Efectos y Prioridades

Diccionario `{ "id_efecto": { ... } }`. Aunque existen efectos legacy `builtin`, todo efecto personalizado debe usar `"engineMode": "declarative"`.

### 8.1 Campos estructurales de `EffectDefinition`

| Campo | Valores | Descripción |
| :--- | :--- | :--- |
| `id`, `name`, `description` | `string` | Identidad y ficha en Archivo Táctico. |
| `engineMode` | `"declarative"` | Activa el motor declarativo completo. |
| `category` | `"aura" \| "status" \| "trigger" \| "combat" \| "summon" \| "utility" \| "immunity"` | Categoría organizativa. |
| `trigger` | `"continuous_aura" \| "periodic" \| "on_spawn" \| "on_attack" \| "on_hit" \| "on_damaged" \| "on_enemy_enter" \| "on_kill" \| "on_death" \| "on_hp_below" \| "passive"` | Momento en que evalúa y aplica los modificadores. |
| `targetSide` | `"opponents" \| "allies" \| "towers" \| "enemies" \| "self"` | Bando objetivo respecto al emisor. |
| `areaShape` | `"single" \| "self" \| "square" \| "rect" \| "cross" \| "cone_front" \| "lane_behind" \| "lane" \| "random" \| "global"` | Geometría del área de impacto. |
| `radiusCells`, `radiusRows`, `radiusCols` | `number` | Radio en casillas (`1` = 3x3 en `square`). |
| `maxTargets` | `number` | Máximo de objetivos afectados en cada activación. |
| `priority` | `"closest" \| "furthest" \| "lowest_hp" \| "highest_hp" \| "random"` | Orden de selección cuando hay más candidatos que `maxTargets`. |
| `minHpRatio`, `maxHpRatio` | `number` (`0..1`) | Solo afecta objetivos dentro de esa franja de vida porcentual. |
| `onlyAttacking` | `boolean` | Solo afecta enemigos que están atacando actualmente. |
| `onlyElite` | `boolean` | Solo afecta enemigos que portan insignia élite (`customBadge` o `eliteBadge`). |
| `targetCategories` | `["personal" \| "estructura"]` | Filtra torres por categoría. |
| `targetTypes`, `excludeTypes` | `string[]` | Lista blanca o negra de IDs concretos. |
| `excludeSelf` | `boolean` | Excluye al propio emisor del área. |
| `initialDelaySec`, `intervalSec`, `durationSec`, `cooldownSec` | `number` | Tiempos de retardo, frecuencia, duración del estado activo y enfriamiento entre activaciones. |
| `hpThresholdRatio`, `chance`, `maxTriggers`, `stackMode` | `number \| string` | Disparo por umbral HP, probabilidad (`0..1`), máximo de veces y apilado (`"refresh" \| "stack" \| "max"`). |
| `color`, `badgeLabel`, `badgeTextColor` | `string` | Color base y etiqueta sobre las unidades afectadas. |

### 8.2 Todos los Modificadores (`modifiers`)

- **Daño, Ejecución y Curación**:
  - `damageInstant`: daño plano inmediato.
  - `damagePercentMaxHp`: porcentaje de la vida máxima del objetivo (`0.15` = 15%).
  - `executeBelowHpRatio`: ejecuta al instante si la vida del objetivo queda por debajo de este ratio (`0.2` = <20% HP).
  - `dotDps`: daño por segundo mientras dure el efecto.
  - `healAmount`, `healPercent`, `hotHps`: curación plana, porcentual o continua por segundo.
  - `shieldHp`, `shieldDecayPerSec`: escudo absorbente y desgaste opcional por segundo.
  - `energyGain`, `energyPerSec`: energía inmediata o continua.
- **Atributos y Control**:
  - `slowFactor` (`0..0.9`), `speedMultiplier`, `fireRateMultiplier`, `damageMultiplier`, `projectileSpeedMultiplier`, `maxHpMultiplier`.
  - `damageReduction` (`0..0.85`), `vulnerableMultiplier` (ej. `1.5` = recibe +50% daño).
  - `lifestealRatio`: porcentaje del daño o DPS devuelto como curación al emisor.
  - `thornsDps`: daño por segundo a quien ataque cuerpo a cuerpo a la torre afectada.
  - `reflectDamagePercent`: devuelve ese ratio (`0.5` = 50%) del daño mitigado recibido directamente al atacante.
  - `disableTowerActions`, `hypnotizeTower`, `stunSec`, `deafSec`, `silenceSec`, `immuneToPsych`, `cleanseNegative`, `grantsImmunities`, `respectImmunity`.
- **Rebotes, Desplazamiento y Transformación**:
  - `chainBounceCount`, `chainBounceRangeCols`, `chainDamageDecay`: hace saltar el impacto de daño instantáneo entre enemigos cercanos dibujando haces luminosos (`beam`).
  - `knockbackCols`, `teleportCells`, `pullCells`, `laneShift`.
  - `spawnType`, `spawnCount`, `spawnOffsetCol`, `convertVictimTo`.
  - `splitOnDeathType`, `splitOnDeathCount`: al morir una entidad bajo este efecto (o con `on_death`), genera `splitOnDeathCount` criaturas de `splitOnDeathType`.
  - `transformToType`: transforma al enemigo afectado en otro SCP distinto al instante.
  - `applyEffectIds`, `removeEffectIds`, `extraLives`, `reviveHpPercent`, `instakill`, `disappearOnHit`.

---

## 9. `towers.json` — Personal de Contención y Estructuras Defensivas

Arreglo `[ ... ]` con las estadísticas base de todas las torres desplegables.

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `type` | `string` | ID único de la torre. |
| `name`, `roleLabel`, `description` | `string` | Textos mostrados en cartas, HUD y Archivo Táctico. |
| `category` | `"personal" \| "estructura"` | Diferencia personal humano de estructuras mecánicas/fortificaciones. |
| `cost`, `cooldown`, `maxHp`, `unlockLevel` | `number` | Coste en energía, recarga entre despliegues, vida y nivel de desbloqueo. |
| `fireRate`, `damage`, `burstCount`, `maxRangeCols`, `splashRadius`, `aoeTargets`, `passThrough`, `projectileKind`, `projectileSpeed` | `number \| boolean \| string` | Parámetros ofensivos de torres de ataque. |
| `slowFactor`, `slowDuration`, `burnDps`, `burnDuration` | `number` | Estados aplicados por sus proyectiles. |
| `energyAmount`, `energyInterval`, `healAmount`, `healInterval`, `armTime`, `explosionDamage`, `thornsDps`, `floorTrapDps` | `number` | Mecánicas económicas, médicas, minas o trampas de suelo. |
| `canBeHypnotized` | `boolean` | Si puede ser hipnotizada por SCP-035 o efectos con `hypnotizeTower`. |
| `placementRule` | `"any" \| "frontHalf" \| "backHalf"` | Restricción horizontal del tablero. |
| `maxPerBoard`, `maxPerRow` | `number` | Límites simultáneos de esa torre. |
| `effects` | `string[]` | Efectos de `effects.json` adheridos a cada unidad desplegada. |

---

## 10. `scps.json` — Entidades SCP, Estadísticas y Bloques `behavior`

Arreglo `[ ... ]` con cada enemigo:

- **Campos base**: `type`, `code`, `name`, `classification`, `hp`, `speed` (casillas/seg), `dps`, `scoreValue`, `portrait`, `summary`, `tacticalNote`, `effects` (`string[]`), `isSummon`, `announcement`.
- **Bloque `behavior`**:
  - `laneSpan`: `1` o `2` (cuántas filas ocupa; `2` para colosos como SCP-682).
  - `defaultPackCount`: cantidad de individuos si aparece en grupo sin especificar `count`.
  - `immunities`: arreglo de `"all_effects" | "explosion" | "slow" | "burn" | "stun" | "silence"`.
  - `spawnRule`: `{ mode: "edge" | "sky", colRange?: [min, max], maxPerLevel?: number }`.
  - `instakillTower`, `disappearOnHit`.
  - `bounceAccel`: `{ accelPerSec, maxSpeed }` (estilo SCP-018).
  - `blinkJump`, `plagueAura`, `sleepAura`, `hypnosisGlobal`, `skyPull`, `enrage096`, `vaseSpawner`, `pocketDimension`, `screamArea`, `doorController`.

---

## 11. `designs.json` y `designs/` — Personalización Visual Completa, Sprites, Formas Vectoriales y UI

Controla absolutamente todo el apartado visual del `<canvas>` y la interfaz HUD (se puede editar en `designs.json` o dividir por sección en `src/data/json/designs/<seccion>.json`, por ejemplo `designs/board.json` o `designs/hudTheme.json`):

- **`board` (Personalización extrema del tablero y perímetro)**:
  - Colores y fondo: `canvasBg`, `gateBg`, `breachBg`, `bgImage`, `bgImageOpacity`.
  - Casillas: `tileEven`, `tileOdd`, `tileSpriteEven`, `tileSpriteOdd`, `tileStroke`, `tileStrokeWidth`, `tileCornerRadius`, `tileGap`, `tileHighlightColor`.
  - Flechas direccionales: `arrowFill`, `arrowColumns`, `adaptArrowsToGrid`, `arrowStyle` (`"chevron" | "triangle" | "line"`), `arrowScale`.
  - Carriles y etiquetas laterales: `laneStroke`, `laneStrokeWidth`, `laneAlternateTint`, `showLaneNumbers`, `laneLabelPrefix`, `laneNumberColor`.
  - Zona de puertas Tesla y brecha: `gateLabel`, `gateLabelColor`, `gateBorderColor`, `gateBorderWidth`, `breachLabel`, `breachLabelColor`, `breachStripeDark`, `breachStripeAmber`, `breachStripeWidth`, `breachStripeHeight`, `outerBorderColor`, `outerBorderWidth`.
  - Líneas de límite de objetivos (`no_enemy_past_col`): `boundaryLineColor`, `boundaryLineWidth`, `boundaryLineDash`, `boundaryLabelBg`, `boundaryLabelText`.
  - Parpadeo de SCP-173: `blinkOverlayRgb`, `blinkMaxAlpha`.
- **`obstacles` (Estilos por `kind`: `tombstone`, `barricade`, `debris`, `pillar`, `anomaly_node`, etc.)**:
  - `color`, `crackedColor`, `strokeColor`, `crackColor`, `labelColor`, `hpBarColor`, `hpBarWidth`, `cornerRadius`, `sprite`, `crackedSprite`.
- **`tileModifiers` (Estilos visuales por modificador de casilla)**:
  - Soporta claves como `heal_tower`/`heal`, `boost_fire_rate`/`boost_fire`, `boost_damage`, `energy_pad`/`energy`, `shield_pad`/`shield`, `slow_enemy`, `speed_enemy`, `damage_enemy`, `ignite_projectiles`, `cryo_projectiles`/`chill_projectiles`, `hazard_void`, `heal_enemy`, `pierce_projectiles`, `boost_projectile_damage`, `regen_barrier`, `block_enemy_spawn`, `apply_effect`.
  - Campos por clave: `color`, `borderColor`, `label`, `opacity`, `pulseSpeed`, `sprite`.
- **`projectiles` y `defaultProjectile`**:
  - Formas soportadas (`shape`): `"circle"`, `"streak"`, `"pellet_cluster"`, **`"diamond"`**, **`"laser_bolt"`**, **`"orb"`**, **`"rocket"`**, **`"ring"`**, **`"sprite"`** (con imagen propia `sprite`, `spriteWidth`, `spriteHeight`), o cualquier forma vectorial de `customShapes`.
  - Extras: `rotateToVelocity`, `spinSpeed`, `outlineColor`, `outlineWidth`, `glowColor`, `glowBlur`, `trailLength`, `trailColor`, `trailWidth`, `pulseSpeed`, `alpha`, `trailParticleId`, `impactParticleId`.
- **`zones`, `gates`, `doors079`, `statuses`, `badges`, `effects`, `fonts`**:
  - Personalización pixel-perfect de radios, anchos de línea, colores RGB, destellos de daño, escudos, etiquetas de estado y fuentes tipográficas.
- **`ui` y `hudTheme`**:
  - En `ui`: `hpBarBg`, `hpBarHigh`, `hpBarMid`, `hpBarLow`, `hpBarRadius`, `hpBarBorderColor`, `hpBarBorderWidth`, `shieldBarColor`, `shieldBarHeight`, `shieldGlowColor`, `energyDropShape` (`"circle" | "diamond" | "cell"`), `energyDropSprite`, `energyDropPulseSpeed`, `energyDropLabelPrefix`, `enemyLabelBg`, `enemyLabelRadius`, `floatingTextShadowColor`, `floatingTextScale`.
  - En `hudTheme`: `accentColor`, `panelBg`, `panelBorder`, `canvasBorderColor`, `headerBg` para teñir la barra superior, el mazo y el marco del tablero.
- **`defaultTower` y `defaultEnemy`**: diseño automático de respaldo para cualquier torre o SCP nuevo definido por JSON (con `shadowColor`, `shadowRadiusX`, `hpBarFill`, `hpBarBg`, `shieldBarColor`, `shieldRingColor`, `stealthAlpha`, `burnTint`, `stunRingColor`, `recoilScale`, `opacity`, etc.).
- **Sprites por entidad**: `sprite`, `spriteMode` (`"replace" | "under" | "over"`), `spriteWidth`, `spriteHeight`, `spriteOffsetX`, `spriteOffsetY`, `spriteFlipX`, `spriteOpacity`.
- **Formas vectoriales (`customShapes` y `layers`)**: primitivas (`rect`, `roundRect`, `circle`, `ellipse`, `polygon`, `line`, `arc`, `text`) con tokens `$body`, `$stroke`, `$head`, `$accent`, `$aura`, `$slowBody` y condiciones (`always`, `slowed`, `disabled`, `armed`, `enraged`, `convulsing`, `damaged`, `burning`).

---

## 12. Guía Práctica: Crear una Misión Completa Desde Cero

A continuación tienes un flujo real coordinado usando la nueva estructura modular de carpetas:

1. **En `src/data/json/characters.json`**: define tus personajes con retratos PNG y sus expresiones (`neutral`, `alerta`, `herido`).
2. **En `src/data/json/dialogues.json`**: crea el diálogo de inicio (`intro_sector_cripta`) y uno intermedio (`boss_fase_2`).
3. **En `src/data/json/effects.json`**: añade un efecto de ejecución o cadena (ej. `cadena_electrica_tesla` con `chainBounceCount: 3`).
4. **En `src/data/json/events.json`**:
   - Evento `"emboscada_lapidas"` con `trigger: "on_flag_horde"` y `logic.spawnFromObstacles` (hace emerger SCP-008 desde las lápidas).
   - Evento `"furia_mutante"` con `trigger: "on_enemy_low_hp"`, `targetEnemyType: "scp_939"`, `hpThresholdRatio: 0.45`, y `logic.mutateEnemies` (les da escudo, acelera, pone badge `"RABIA"` y dispara un diálogo).
5. **En `src/data/json/levels.json`**: combina en el nivel:
   - `introDialogueId: "intro_sector_cripta"`
   - `tileOverrides` para pintar el cementerio/zona de cuarentena
   - `tileModifiers` con `"ignite_projectiles"` delante de las líneas defensivas
   - `tombstones` con `sprite`, `crackedSprite`, `allowCounterPlacement: true` y `counterTowerTypes: ["engineer", "grenadier"]`
   - `levelEvents: ["emboscada_lapidas", "furia_mutante"]`

Con esa combinación dispones de narrativa visual completa con PNGs y expresiones, casillas totalmente personalizadas, obstáculos tipo PvZ y eventos reactivos capaces de transformar o mutar SCPs concretos en plena batalla.

---

## 13. `particles.json` — Sistema Reutilizable de Partículas y Diseño Completo

El sistema de partículas consta de:
1. **`src/data/json/particles.json`**: catálogo completo de presets multicapa (`attack`, `explosion`, `deployment`, `impact`, `aura`, `obstacle`, `custom`).
2. **Motor `ParticleSystem`** (`src/engine/particleSystem.ts`): integrado dentro del bucle de `simulation.ts` y `renderer.ts`, con límite automático de partículas activas (`450`) y mezcla aditiva (`lighter`, `screen`).
3. **Componente React `<ParticleSystem />`** (`src/components/ParticleSystem.tsx`): lienzo `<canvas>` reutilizable con `ref` imperativo (`emitPreset`, `emitCustom`, `clear`, `getActiveCount`), `emitRequests` declarativos, `autoLoopPresetId`, modo interactivo por clic y guías de cuadrícula (integrado en la pestaña **Partículas** del Archivo Táctico).

### Estructura de un Preset en `particles.json`

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `string` | Identificador único del preset (ej. `"explosion_grenade"`, `"mi_explosion_plasma"`). |
| `name` | `string` | Nombre visible en el Archivo Táctico. |
| `description` | `string` | Descripción breve del efecto visual. |
| `category` | `"attack" \| "explosion" \| "deployment" \| "impact" \| "aura" \| "obstacle" \| "custom"` | Categoría organizativa. |
| `emitters` | `ParticleEmitterConfig[]` | Arreglo de uno o varios emisores combinados simultáneamente o con retraso (`delaySec`). |
| `screenFlashRgb` | `string` | Color RGB opcional (`"251, 146, 60"`) para destello de pantalla al emitir en partida. |
| `screenFlashAlpha` | `number` | Opacidad del destello (`0` a `1`). |
| `screenShake` | `number` | Intensidad de temblor de cámara opcional. |
| `sound` | `EffectSoundKey \| string` | Sonido opcional al emitir (`"explosion"`, `"heal"`, `"tesla"`, `"portal"`, etc.). |

### Propiedades de cada `ParticleEmitterConfig`

| Propiedad | Tipo | Descripción |
| :--- | :--- | :--- |
| `shape` | `"circle" \| "square" \| "spark" \| "ring" \| "star" \| "cross" \| "shard" \| "smoke" \| "sprite"` | Geometría de la partícula (o imagen PNG/WebP con `shape: "sprite"`). |
| `sprite` | `string` | Ruta a imagen si `shape: "sprite"` (ej. `"/assets/chispa.png"`). |
| `colors` | `string[]` | Lista de colores hex o `rgba(...)` entre los que se elige aleatoriamente por partícula. |
| `colorEnd` | `string` | Color hex final hacia el que interpola durante su vida útil. |
| `count` | `number \| [min, max]` | Cantidad de partículas emitidas (fijo o rango aleatorio). |
| `durationSec` | `number \| [min, max]` | Duración de vida en segundos. |
| `sizePx` | `number \| [min, max]` | Tamaño inicial en píxeles. |
| `sizeEndScale` | `number` | Factor de escala al morir (ej. `0.1` encoge, `2.4` expande como humo). |
| `ringExpandPx` | `number` | Radio máximo adicional si `shape === "ring"`. |
| `alphaStart` / `alphaEnd` | `number` | Opacidad inicial y final (`0..1`). |
| `speedPx` | `number \| [min, max]` | Velocidad inicial en píxeles/segundo. |
| `angleDeg` | `number` | Ángulo central de emisión (`0` = derecha, `-90` = arriba, `180` = izquierda, `90` = abajo). |
| `spreadDeg` | `number` | Apertura del cono de dispersión (`360` = explosión omnidireccional). |
| `gravityPx` | `number` | Gravedad vertical (`> 0` cae, `< 0` flota hacia arriba). |
| `drag` | `number` | Rozamiento/frenado exponencial por segundo (`0` = sin freno). |
| `spinDegPerSec` | `number \| [min, max]` | Velocidad de rotación por segundo (ideal para `shard`, `star`, `square`). |
| `offsetX` / `offsetY` | `number` | Desplazamiento del origen en píxeles respecto al centro de celda. |
| `spawnRadiusPx` | `number` | Radio aleatorio alrededor del origen donde nacen las partículas. |
| `blendMode` | `"source-over" \| "lighter" \| "screen"` | `"lighter"` crea brillo energético aditivo real. |
| `glowColor` / `glowBlur` | `string` / `number` | Halo luminoso (`shadowColor` / `shadowBlur`). |
| `strokeColor` / `strokeWidth` | `string` / `number` | Borde de la partícula. |
| `delaySec` | `number` | Retraso antes de disparar este emisor respecto al inicio del preset (para ondas secundarias). |

### Dónde se pueden conectar los IDs de `particles.json`
- En **Torres (`towers.json -> particles`)**: `onDeploy`, `onAttack`, `onHit`, `onDeath`, `projectileTrail`.
- En **SCPs (`scps.json -> particles`)**: `onSpawn`, `onAttack`, `onDamaged`, `onKill`, `onDeath`, `trail`, `trailIntervalSec`.
- En **SCPs (`scps.json -> behavior`)**: `rangedAttack.particlePresetId`, `summonPeriodic.particlePresetId`, `enrageOnLowHp.particlePresetId`, `onKillConvertTo.particlePresetId`, `onDeathSplit.particlePresetId`, `onDeathExplosion.particlePresetId`.
- En **Efectos (`effects.json -> visual.particlePresetId`)**.
- En **Eventos (`events.json -> visual.particlePresetId`)**.
- En **Proyectiles (`designs.json -> projectiles[kind]`)**: `trailParticleId`, `impactParticleId`.

---

## 14. Programación Completa 100% en JSON: Nuevas Torres (`towers.json`) y Nuevos SCP (`scps.json`)

Ya no estás limitado a los IDs integrados (`"guard"`, `"scp_008"`, etc.). Puedes inventar cualquier `type` nuevo (ej. `"tesla_sentinel"`, `"scp_1048_a"`) directamente en JSON, definir toda su lógica de combate, su economía, sus ganchos de efectos/eventos/partículas y su aspecto visual (`inlineDesign`) sin tocar una sola línea de TypeScript.

### A. Todos los campos programables en `towers.json`

| Grupo | Campos soportados | Descripción |
| :--- | :--- | :--- |
| **Identidad y Economía** | `type`, `name`, `category` (`"personal" \| "estructura"`), `cost`, `costScalePerDeployed`, `cooldown`, `maxHp`, `unlockLevel`, `roleLabel`, `description` | `costScalePerDeployed` incrementa dinámicamente el coste por cada copia viva en tablero. |
| **Defensa y Supervivencia** | `shieldOnDeploy`, `shieldColor`, `shieldRegenPerSec`, `maxShieldHp`, `regenHpPerSec`, `thornsDps`, `reflectDamagePercent`, `lifestealRatio`, `immuneToPsych`, `canBeHypnotized` | Escudos con recarga, espinas al recibir mordidas, reflexión porcentual y robo de vida. |
| **Ataque y Proyectiles** | `fireRate`, `damage`, `damageType` (`"physical" \| "explosion" \| "fire" \| "cryo" \| "electric" \| "psionic" \| "true"`), `armorPenetration` (`0..1`), `bonusDamageToBoss`, `critChance`, `critMultiplier`, `burstCount`, `projectileCountPerShot`, `projectileRowSpread`, `maxRangeCols`, `canTargetRows`, `attackBehind`, `targetPriority`, `passThrough`, `pierceCount`, `projectileKind`, `projectileSpeed` | Permite escopetas multi-fila (`projectileCountPerShot` + `projectileRowSpread`), francotiradores con perforación (`pierceCount`), daño verdadero (`damageType: "true"`), críticos o defensa trasera (`attackBehind`). |
| **Control de Masas y Área** | `splashRadius`, `chainBounceCount`, `chainBounceRangeCols`, `chainDamageDecay`, `knockbackCols`, `stunDuration`, `silenceDuration`, `slowFactor`, `slowDuration`, `burnDps`, `burnDuration`, `floorTrapDps`, `aoeTargets`, `aoeRadiusRows`, `aoeRadiusCols` | Rayos en cadena al impactar, aturdimiento, silencio de habilidades SCP, empuje, quemadura o trampas de suelo. |
| **Economía, Curación y Minas** | `energyAmount`, `energyInterval`, `deployEnergyBonus`, `healAmount`, `healInterval`, `armTime`, `explosionDamage`, `explosionRadiusCols`, `explosionRadiusRows` | Generación periódica o instantánea al desplegar, curación en área o minas armables. |
| **Reglas de Colocación** | `placementRule` (`"any" \| "frontHalf" \| "backHalf" \| "rows" \| "cols"`), `allowedRows`, `allowedCols`, `canPlaceOnObstacles`, `maxPerBoard`, `maxPerRow` | Restringe filas/columnas, permite colocar encima de lápidas/obstáculos o limita copias máximas. |
| **Ganchos Reactivos, Partículas y Audio** | `effects`, `onDeployEffects`, `onAttackEffects`, `onHitEffects`, `onDeathEffects`, `onDeathExplosionDamage`, `onDeathExplosionRadius`, `onDeployTriggerEventId`, `onDeathTriggerEventId`, `particles`, `soundOnDeploy`, `soundOnAttack`, `soundOnDeath`, `inlineDesign` | Dispara efectos de `effects.json`, eventos de `events.json` o explosiones al morir; personaliza el dibujo sin abrir `designs.json`. |

### B. Todos los campos programables en `scps.json` (`EnemyDefinition` + `behavior`)

Además de `type`, `code`, `name`, `classification`, `hp`, `speed`, `dps`, `scoreValue`, `portrait`, `summary`, `tacticalNote`, `effects`, `isSummon`, `announcement`, `particles`, `soundOnSpawn`, `soundOnDeath` e `inlineDesign`, el objeto `behavior` admite:

| Bloque en `behavior` | Campos clave | Qué logra sin código TypeScript |
| :--- | :--- | :--- |
| **Defensa y Pasivas** | `immunities`, `damageReduction` (`0..0.95`), `maxDamagePerHit`, `knockbackResist` (`0..1`), `dodgeChance` (`0..1`), `initialShieldHp`, `shieldColor`, `shieldRegenPerSec`, `regenHpPerSec`, `thornsDps`, `reflectDamagePercent`, `lifestealRatio`, `reviveCount`, `reviveHpPercent` | Tanques con escudo regenerativo, armadura porcentual o tope máximo por golpe (anti-francotirador), evasión, espinas, robo de vida y múltiples resurrecciones. |
| **Sigilo y Movilidad** | `untargetableUntilCol`, `laneHopIntervalSec`, `laneHopMode` (`"random" \| "toward_towers" \| "avoid_towers"`), `speedScaleAsHpDrops: { maxBonusMultiplier }`, `laneSpan`, `defaultPackCount` | Enemigos invisibles hasta cierta columna, saltos tácticos entre carriles, aceleración al perder vida u ocupación multi-carril (`laneSpan: 2`). |
| **Furia al Perder Vida** | `enrageOnLowHp: { hpRatio, triggerCol, convulseSec, newHp, speedMultiplier, dpsMultiplier, stunRadiusRow, stunRadiusCol, stunSec, badge, color, sound, particlePresetId }` | Fase 2 automática para cualquier SCP personalizado: convulsión, multiplicadores de velocidad/daño, pulso aturdidor y etiqueta nueva. |
| **Ataque a Distancia** | `rangedAttack: { rangeCols, intervalSec, damage, splashRadius, stunSec, rowSpan, particlePresetId, beamColor, sound }` | Permite a cualquier SCP disparar rayos o proyectiles a varias columnas de distancia contra torres. |
| **Invocación Periódica** | `summonPeriodic: { intervalSec, initialDelaySec, type, count, offsetCol, rowSpread, maxAlive, hpMultiplier, speedMultiplier, dpsMultiplier, sound, particlePresetId }` | Jefes o portadores que invocan secuaces periódicamente con tope `maxAlive`. |
| **Reacciones al Matar / Morir** | `onKillConvertTo: { type, hpMultiplier, particlePresetId }`, `onDeathSplit: { type, count, spreadRows, hpMultiplier, particlePresetId }`, `onDeathExplosion: { radiusCols, radiusRows, damage, stunSec, particlePresetId, sound }`, `rewardsEnergyOnKill`, `onSpawnTriggerEventId`, `onDeathTriggerEventId` | Convierte torres abatidas en nuevos SCP, divide en múltiples crías al morir, explota al caer, otorga energía al jugador o dispara un evento/diálogo de `events.json`. |

### C. Ejemplo Completo Listo para Copiar: Nueva Torre + Nuevo SCP + Preset de Partículas

**1. En `src/data/json/particles.json` (añadir una clave nueva):**
```json
"plasma_arc_custom": {
  "id": "plasma_arc_custom",
  "name": "Arco de Plasma Custom",
  "category": "attack",
  "emitters": [
    {
      "shape": "spark",
      "colors": ["#22D3EE", "#A5F3FC", "#FFFFFF"],
      "count": 10,
      "durationSec": [0.22, 0.42],
      "sizePx": [2.5, 4.5],
      "speedPx": [70, 160],
      "angleDeg": 0,
      "spreadDeg": 360,
      "drag": 3.5,
      "blendMode": "lighter",
      "glowColor": "#22D3EE",
      "glowBlur": 8
    }
  ]
}
```

**2. En `src/data/json/towers.json` (añadir al final del arreglo):**
```json
{
  "type": "plasma_warden",
  "name": "Centinela de Plasma",
  "category": "personal",
  "cost": 185,
  "costScalePerDeployed": 25,
  "cooldown": 14,
  "maxHp": 420,
  "shieldOnDeploy": 160,
  "shieldColor": "#22D3EE",
  "shieldRegenPerSec": 8,
  "unlockLevel": 1,
  "roleLabel": "Arco Perfora-Armadura",
  "description": "Dispara descargas de plasma que atraviesan 2 enemigos, rebotan en cadena y tienen probabilidad de golpe crítico contra jefes.",
  "fireRate": 1.15,
  "damage": 44,
  "damageType": "electric",
  "armorPenetration": 0.65,
  "bonusDamageToBoss": 25,
  "critChance": 0.2,
  "critMultiplier": 1.85,
  "pierceCount": 1,
  "chainBounceCount": 2,
  "chainBounceRangeCols": 1.6,
  "chainDamageDecay": 0.65,
  "stunDuration": 0.35,
  "projectileKind": "turret",
  "projectileSpeed": 12.5,
  "particles": {
    "onDeploy": "deploy_personal",
    "onAttack": "attack_tesla",
    "onHit": "plasma_arc_custom",
    "onDeath": "death_tower"
  },
  "inlineDesign": {
    "shape": "guard",
    "body": "#0F172A",
    "stroke": "#22D3EE",
    "strokeWidth": 2.4,
    "headOrTop": "#164E63",
    "accent": "#22D3EE",
    "weaponOrDetail": "#67E8F9",
    "label": "PLM"
  }
}
```

**3. En `src/data/json/scps.json` (añadir al final del arreglo):**
```json
{
  "type": "scp_custom_harbinger",
  "code": "SCP-CUSTOM",
  "name": "Heraldo del Vacío",
  "classification": "Keter",
  "hp": 950,
  "speed": 0.34,
  "dps": 55,
  "scoreValue": 300,
  "portrait": "/assets/scp_custom.png",
  "summary": "Entidad acorazada invisible a larga distancia que dispara pulsos a distancia, cambia de carril y se divide al morir.",
  "tacticalNote": "Solo puede ser atacado cuando cruza la columna 6.5. Prepárate para neutralizar las crías que libera al caer.",
  "effects": [],
  "announcement": "ALERTA DE CONTENCIÓN: Heraldo del Vacío detectado en el sector.",
  "particles": {
    "onSpawn": "deploy_scp",
    "onAttack": "impact_psionic",
    "onDeath": "explosion_massive",
    "trail": "trail_psionic",
    "trailIntervalSec": 0.25
  },
  "behavior": {
    "initialShieldHp": 280,
    "shieldColor": "#C084FC",
    "damageReduction": 0.2,
    "untargetableUntilCol": 6.5,
    "laneHopIntervalSec": 5.5,
    "laneHopMode": "toward_towers",
    "rewardsEnergyOnKill": 50,
    "rangedAttack": {
      "rangeCols": 2.4,
      "intervalSec": 3.2,
      "damage": 35,
      "stunSec": 0.6,
      "beamColor": "#C084FC",
      "particlePresetId": "plasma_arc_custom",
      "sound": "portal"
    },
    "enrageOnLowHp": {
      "hpRatio": 0.4,
      "convulseSec": 0.7,
      "speedMultiplier": 1.5,
      "dpsMultiplier": 1.35,
      "badge": "SOBRECARGA",
      "color": "#A855F7",
      "particlePresetId": "scream_066"
    },
    "onDeathSplit": {
      "type": "scp_049_2",
      "count": 2,
      "spreadRows": 1,
      "hpMultiplier": 0.6,
      "particlePresetId": "revive_plague"
    }
  },
  "inlineDesign": {
    "shape": "zombie",
    "body": "#3B0764",
    "stroke": "#C084FC",
    "strokeWidth": 2.2,
    "head": "#581C87",
    "accent": "#E879F9",
    "hpBar": "#C084FC",
    "barWidth": 42,
    "codeLabel": "VOID"
  }
}
```

