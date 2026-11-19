# Documentación Maestra Completa de los Archivos JSON (Sitio-19)

Esta guía documenta **de principio a fin** cada archivo JSON ubicado en `src/data/json/`, cada campo soportado por el motor TypeScript, valores por defecto, interacciones entre sistemas y recetas completas listas para copiar y adaptar.

---

## Índice General

1. [Resumen de Archivos JSON y Carga Segura](#1-resumen-de-archivos-json-y-carga-segura)
2. [Panel de Administrador y Herramientas del Archivo Táctico](#2-panel-de-administrador-y-herramientas-del-archivo-táctico)
3. [`config.json` — Configuración Global del Juego](#3-configjson--configuración-global-del-juego)
4. [`levels.json` — Niveles, Tablero, Casillas, Lápidas/Obstáculos y Oleadas](#4-levelsjson--niveles-tablero-casillas-lápidasobstáculos-y-oleadas)
5. [`events.json` — Motor de Eventos (`logic` + `visual`) y Mutación Específica de SCPs](#5-eventsjson--motor-de-eventos-logic--visual-y-mutación-específica-de-scps)
6. [`characters.json` — Personajes, Retratos PNG y Múltiples Expresiones](#6-charactersjson--personajes-retratos-png-y-múltiples-expresiones)
7. [`dialogues.json` — Sistema de Diálogos, Ramificaciones, Audio y Eventos](#7-dialoguesjson--sistema-de-diálogos-ramificaciones-audio-y-eventos)
8. [`effects.json` — Motor Declarativo de Efectos y Prioridades](#8-effectsjson--motor-declarativo-de-efectos-y-prioridades)
9. [`towers.json` — Personal de Contención y Estructuras Defensivas](#9-towersjson--personal-de-contención-y-estructuras-defensivas)
10. [`scps.json` — Entidades SCP, Estadísticas y Bloques `behavior`](#10-scpsjson--entidades-scp-estadísticas-y-bloques-behavior)
11. [`designs.json` — Apariencia Visual, Sprites, Formas Vectoriales y UI](#11-designsjson--apariencia-visual-sprites-formas-vectoriales-y-ui)
12. [Guía Práctica: Crear una Misión Completa Desde Cero (Lápidas + Diálogos + Eventos + Efectos)](#12-guía-práctica-crear-una-misión-completa-desde-cero)

---

## 1. Resumen de Archivos JSON y Carga Segura

Todos los datos se encuentran en `src/data/json/`:

| Archivo | Formato Raíz | Estado inicial | Qué controla |
| :--- | :--- | :--- | :--- |
| `config.json` | Objeto `{ ... }` | Configurado | Parámetros globales, rejilla base, velocidades base de proyectiles, energía del cielo, puertas Tesla y secreto Admin. |
| `levels.json` | Arreglo `[ ... ]` | Configurado / Editable | Niveles, tamaño del mapa, `boardOverride`, `tileOverrides`, `tileModifiers`, `obstacles`/`tombstones`, entidades iniciales, diálogos, condiciones de victoria y línea de oleadas. |
| `events.json` | Diccionario `{ "id": {...} }` o Arreglo `[{ "id": ... }]` | Vacío `{}` (listo para empezar desde 0) | Eventos reutilizables o automáticos por disparador que alteran tablero, clima, invocaciones, diálogos, lápidas y atributos de SCPs específicos. |
| `characters.json` | Diccionario `{ "id": {...} }` o Arreglo `[{ "id": ... }]` | Vacío `{}` (listo para empezar desde 0) | Ficha de personajes narrativos con retratos PNG y soporte para múltiples expresiones faciales/emocionales. |
| `dialogues.json` | Diccionario `{ "id": {...} }` o Arreglo `[{ "id": ... }]` | Vacío `{}` (listo para empezar desde 0) | Conversaciones tipo novela visual con retratos dinámicos, opciones ramificadas, cambios de energía y disparo de eventos. |
| `effects.json` | Diccionario `{ "id": {...} }` | Catálogo base | Efectos `builtin` y `declarative` (auras, estados, triggers de impacto/muerte, rebotes en cadena, ejecución, división y transformación). |
| `towers.json` | Arreglo `[ ... ]` | Catálogo base | Unidades desplegables (`personal` y `estructura`), costes, recargas, reglas de colocación y efectos asociados. |
| `scps.json` | Arreglo `[ ... ]` | Catálogo base | Enemigos SCP, vida, velocidad, daño, inmunidades y configuraciones `behavior`. |
| `designs.json` | Objeto `{ ... }` | Catálogo base | Colores del tablero, HUD del canvas, proyectiles, sprites PNG/WebP y formas vectoriales (`customShapes`). |

> **Nota de robustez**: Los cargadores de `events.json`, `characters.json` y `dialogues.json` toleran tanto diccionarios `{ "mi_id": { ... } }` como arreglos `[{ "id": "mi_id", ... }]`, además de archivos vacíos `{}` o `[]`. Si una entrada en un diccionario omite `"id"`, el cargador asigna automáticamente la clave del diccionario como `id`.

> **Rutas de imágenes PNG**: Para retratos de personajes (`characters.json`), sprites de casillas (`tileOverrides`, `tileModifiers`), sprites de lápidas/obstáculos (`obstacles`, `tombstones`) o unidades (`designs.json`), puedes colocar los PNG en `public/assets/...` (y referenciarlos como `"/assets/mi_imagen.png"`) o usar rutas/URLs directas válidas.

---

## 2. Panel de Administrador y Herramientas del Archivo Táctico

### Panel de Administrador (`Admin`)
Accesible desde la pantalla principal con la contraseña definida en `config.json -> admin.secret`:

- **Desbloqueo Personalizado por Nivel (`1..N`)**:
  - Permite deslizar o escribir el número de nivel exacto que quieres liberar.
  - **Desbloquear hasta Nivel X**: habilita la selección libre desde el Nivel 1 hasta el Nivel X y desbloquea automáticamente las torres cuyo `unlockLevel` o recompensa sea menor o igual a X, **sin ensuciar tu progreso guardado** en `localStorage`.
  - **Completar Niveles 1–X**: marca esos niveles como superados y los persiste en `localStorage`.
  - **Restaurar bloqueo normal**: revierte el desbloqueo temporal de pruebas al progreso real.
- **Todas las Torres: ON/OFF**: libera todas las torres del catálogo independientemente de los niveles desbloqueados.
- **Desbloquear Todo / Marcar N/N Completados / Reiniciar Progreso**: accesos rápidos para pruebas completas.
- **Salto Directo a Nivel**: desbloquea hasta el nivel indicado y abre inmediatamente su partida o pantalla de selección de mazo.
- **Resumen en vivo del JSON cargado**: muestra el conteo actual de `Niveles`, `Torres`, `SCP`, `Efectos`, `Eventos`, `Personajes` y `Diálogos`.

### Archivo Táctico (`Archivo`)
- Pestañas: **Amenazas SCP**, **Personal y Estructuras**, **Efectos** (incluye **Editor / Constructor JSON** interactivo), **Eventos**, **Personajes** y **Diálogos**.

---

## 3. `config.json` — Configuración Global del Juego

Define los valores globales predeterminados cuando un nivel u objeto específico no los sobrescribe.

### Esquema completo

```json
{
  "app": {
    "title": "Sitio-19: Defensa SCP",
    "storageKey": "sitio19_completed_levels_v1",
    "sectorBackdropImage": "/assets/fondo.webp"
  },
  "grid": {
    "rows": 6,
    "cols": 9
  },
  "boardLayout": {
    "gateWidth": 52,
    "breachMargin": 26,
    "padTop": 18,
    "padBottom": 18,
    "cellSize": 96
  },
  "progression": {
    "autoDeckMaxLevel": 2,
    "defaultStarterDeck": ["researcher", "guard", "barricade"],
    "defaultDeckPriority": ["researcher", "guard", "medic", "barricade", "mine"],
    "sectors": [
      { "id": 1, "label": "Sector Ligero", "start": 1, "end": 5 }
    ]
  },
  "gameplay": {
    "energyDropAmount": 25,
    "initialSkyEnergyDelaySec": 4.5,
    "skyEnergyIntervalMinSec": 7.5,
    "skyEnergyIntervalVarianceSec": 4.0,
    "skyEnergyColMin": 1,
    "skyEnergyColSpan": 7,
    "energyDropLifetimeSec": 12.0,
    "energyDropCollectRadiusPx": 34,
    "removeRefundRatio": 0.25,
    "announcementDurationSec": 4.5,
    "flagBannerDurationSec": 3.8,
    "defaultFlagBanner": "¡SE ACERCA UNA GRAN HORDA!",
    "projectileSpeeds": {
      "standard": 8.5,
      "mtf": 10.5,
      "cryo": 8.0,
      "turret": 12.5,
      "sniper": 18.0,
      "shotgun": 10.0,
      "pyro": 7.5,
      "heavy": 11.5,
      "grenade": 7.0,
      "psionic": 8.5
    },
    "doors079": {
      "minCol": 3,
      "toggleMinSec": 5.5,
      "toggleVarianceSec": 4.0
    },
    "teslaGate": {
      "firingDurationSec": 1.15,
      "sweepSpeedColsPerSec": 10.5
    }
  },
  "trackUi": {
    "nodeSpacing": 130,
    "trackHeight": 230,
    "waveAmplitude": 46
  },
  "admin": {
    "secret": "O5-ADMIN",
    "quickJumpLevels": [1, 5, 10, 15]
  }
}
```

### Notas clave de `config.json`
- `progression.autoDeckMaxLevel`: hasta este número de nivel el juego asigna automáticamente las torres desbloqueadas sin abrir el selector de mazo (a menos que el nivel defina `lockedDeck`).
- `boardLayout.cellSize`: tamaño en píxeles de cada casilla lógica. El renderizador, las zonas de aura, los sprites de casillas y el cálculo de clics usan este valor dinámicamente.

---

## 4. `levels.json` — Niveles, Tablero, Casillas, Lápidas/Obstáculos y Oleadas

Archivo raíz: arreglo de objetos `RawLevelConfig[]`.

### 4.1 Propiedades principales de cada nivel

| Campo | Tipo | Obligatorio | Descripción |
| :--- | :--- | :--- | :--- |
| `level` | `number` | Sí | Número único del nivel (`1`, `2`, `3`, ...). |
| `title` | `string` | Sí | Título mostrado en el selector de niveles y en la barra superior. |
| `description` | `string` | Sí | Breve resumen estratégico mostrado antes de jugar. |
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
| `globalEffects` | `string[]` | No | Lista de IDs de `effects.json` aplicados automáticamente por el entorno del nivel a las unidades que correspondan por `targetSide`. |
| `levelEvents` | `Array<string \| object>` | No | Lista de eventos dinámicos (IDs de `events.json`, eventos inline o `{ "eventId": "...", ...overrides }`). |
| `introDialogueId` | `string` | No | ID de diálogo que se reproduce automáticamente al empezar el nivel. |
| `victoryDialogueId` | `string` | No | ID de diálogo que se reproduce al cumplir la victoria, justo antes del modal de Nivel Completado. |
| `defeatDialogueId` | `string` | No | ID de diálogo que se reproduce si ocurre una brecha antes de mostrar la pantalla de Derrota. |
| `inlineDialogues` | `Record<string, DialogueDefinition>` | No | Diálogos locales definidos dentro del propio nivel (prioridad sobre `dialogues.json` si comparten ID). |
| `victoryCondition` | `LevelVictoryCondition` | No | Condición alternativa de victoria (`standard`, `survive_time`, `kill_count`). |
| `enemiesPresent` | `EnemyType[]` | No | Si se omite, el motor los deduce de `events`, `startingEnemies`, `obstacles[].spawnOnDestroy` y `events.json`. |
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

### 4.6 Condición de Victoria (`victoryCondition`)

```json
"victoryCondition": {
  "mode": "standard",
  "targetSeconds": 120,
  "targetKills": 45,
  "label": "Resiste 120s"
}
```
- `"standard"`: Todas las oleadas de `events[]` y apariciones escalonadas terminan y no quedan SCP vivos en el mapa.
- `"survive_time"`: Aguantar `targetSeconds` segundos sin sufrir brecha.
- `"kill_count"`: Contener al menos `targetKills` SCP.

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

## 11. `designs.json` — Apariencia Visual, Sprites, Formas Vectoriales y UI

Controla todo el renderizado en el `<canvas>`:

- **`board`**: `canvasBg`, `gateBg`, `breachBg`, `bgImage`, `bgImageOpacity`, `tileEven`, `tileOdd`, `tileSpriteEven`, `tileSpriteOdd`, `tileStroke`, `tileStrokeWidth`, `arrowFill`, `arrowColumns`, `adaptArrowsToGrid`, `laneStroke`, `laneStrokeWidth`, `breachStripeDark`, `breachStripeAmber`, `blinkOverlayRgb`.
- **`zones`, `gates`, `doors079`, `statuses`, `badges`, `effects`, `fonts`, `ui`**: personalización pixel-perfect de barras de vida, etiquetas, puertas Tesla, puertas 079, sombras y orbes de energía.
- **`defaultTower`, `defaultEnemy`, `defaultProjectile`**: diseño automático si añades un `type` nuevo en JSON sin entrada propia en `towers`/`enemies`/`projectiles`.
- **Sprites por entidad**: `sprite`, `spriteMode` (`"replace" | "under" | "over"`), `spriteWidth`, `spriteHeight`, `spriteOffsetX`, `spriteOffsetY`, `spriteFlipX`, `spriteOpacity`.
- **Formas vectoriales (`customShapes` y `layers`)**: primitivas (`rect`, `roundRect`, `circle`, `ellipse`, `polygon`, `line`, `arc`, `text`) con tokens `$body`, `$stroke`, `$head`, `$accent`, `$aura`, `$slowBody` y condiciones (`always`, `slowed`, `disabled`, `armed`, `enraged`, `convulsing`, `damaged`, `burning`).

---

## 12. Guía Práctica: Crear una Misión Completa Desde Cero

A continuación tienes un flujo real coordinado entre los archivos JSON nuevos (que parten vacíos) y `levels.json`:

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
