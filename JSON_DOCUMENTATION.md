# Documentación Completa de los Archivos JSON (Sitio-19)

Todo el contenido del juego —niveles, oleadas, personal/torres, SCPs, efectos, configuración global y diseños visuales— se controla desde los archivos JSON ubicados en `src/data/json/`:

| Archivo | Qué controla |
| :--- | :--- |
| `config.json` | Reglas globales, tamaño por defecto del tablero, sectores, velocidades base de proyectiles y panel admin. |
| `levels.json` | Niveles, tamaño de mapa por nivel, reglas especiales del nivel, oleadas y recompensas. |
| `towers.json` | Estadísticas, coste, reglas de colocación, proyectiles y efectos del personal y estructuras. |
| `scps.json` | Vida, velocidad, daño, comportamiento especial y efectos de cada SCP. |
| `effects.json` | Catálogo de efectos (`builtin` y `declarative` creados con JSON o con el Editor Master de Efectos). |
| `designs.json` | Colores, tamaños, sprites, formas vectoriales (`customShapes`), animaciones, fuentes y fallbacks por defecto. |

---

## 1. `config.json` — Configuración Global

Controla los parámetros por defecto que aplican a todo el juego si un nivel o entidad no los sobrescribe.

### Bloques principales

- **`app`**:
  - `title`: Título de la aplicación.
  - `storageKey`: Clave de `localStorage` donde se guarda el progreso de niveles completados.
  - `sectorBackdropImage`: Ruta de la imagen de fondo del mapa de sectores.
- **`grid`**:
  - `rows`: Filas por defecto del tablero (ej. `6`).
  - `cols`: Columnas por defecto del tablero (ej. `9`).
- **`boardLayout`**:
  - `gateWidth`: Ancho (px) de la zona izquierda de Compuertas Tesla.
  - `breachMargin`: Ancho (px) de la franja derecha de brecha.
  - `padTop`, `padBottom`: Márgenes superior e inferior (px).
  - `cellSize`: Tamaño (px) de cada casilla cuadrada.
- **`progression`**:
  - `autoDeckMaxLevel`: Hasta qué nivel el mazo se equipa automáticamente sin pantalla de selección (ej. `2` = niveles 1 y 2).
  - `defaultStarterDeck`: Torres iniciales disponibles desde el nivel 1.
  - `defaultDeckPriority`: Orden de prioridad para rellenar automáticamente el mazo cuando no se elige manualmente.
  - `sectors`: Lista de sectores de la línea de niveles (`id`, `label`, `start`, `end`).
- **`gameplay`**:
  - `energyDropAmount`: Energía por cápsula caída del cielo (`50`).
  - `initialSkyEnergyDelaySec`: Segundos antes de la primera energía del cielo.
  - `skyEnergyIntervalMinSec`, `skyEnergyIntervalVarianceSec`: Intervalo entre caídas (`min + random * variance`).
  - `skyEnergyColMin`, `skyEnergyColSpan`: Columna inicial y rango de columnas donde caen.
  - `energyDropLifetimeSec`: Tiempo antes de que desaparezca una cápsula sin recoger.
  - `energyDropCollectRadiusPx`: Radio de clic para recoger energía.
  - `removeRefundRatio`: Porcentaje de reembolso al retirar una torre (`0.25` = 25%).
  - `announcementDurationSec`, `flagBannerDurationSec`, `defaultFlagBanner`: Textos y tiempos de avisos.
  - `projectileSpeeds`: Velocidad base (casillas/segundo) por `projectileKind` (`standard`, `mtf`, `cryo`, `pyro`, `psionic`, `grenade`, `turret`, `shotgun`, `heavy`, `sniper`, o claves nuevas).
  - `doors079`: `minCol`, `toggleMinSec`, `toggleVarianceSec` para las puertas de SCP-079.
  - `teslaGate`: `firingDurationSec`, `sweepSpeedColsPerSec` para las compuertas de emergencia.
- **`trackUi`**: Parámetros visuales de la línea de niveles estilo PvZ2 (`nodeSpacing`, `trackHeight`, `waveAmplitude`).
- **`admin`**: `secret` (contraseña opcional extra en config) y `quickJumpLevels` (botones de salto rápido en el panel admin).

---

## 2. `levels.json` — Niveles, Mapas y Oleadas

Es un arreglo (`[...]`) de niveles. El motor calcula automáticamente las rutas, la duración total, las banderas de horda y los enemigos presentes a partir de tus eventos.

### Campos de cada nivel

| Campo | Tipo | Obligatorio | Descripción |
| :--- | :--- | :--- | :--- |
| `level` | `number` | Sí | Número único del nivel (`1`, `2`, `3`...). |
| `title` | `string` | Sí | Nombre mostrado en el mapa y HUD. |
| `description` | `string` | Sí | Descripción táctica del nivel. |
| `startingEnergy` | `number` | Sí | Energía inicial. |
| `maxDeckSlots` | `number` | Sí | Máximo de torres que el jugador puede llevar (ej. `6`, `8`, `10`). |
| `grid` | `{ rows, cols }` | No | Tamaño personalizado del mapa para ese nivel (también admite `rows` y `cols` sueltos). Si se omite, usa `config.json`. |
| `boardOverride` | `object` | No | Sobrescribe colores o imágenes de `designs.json -> board` solo para este nivel (ej. `tileEven`, `tileOdd`, `bgImage`, `canvasBg`, `laneStroke`, etc.). |
| `disableTeslaGates` | `boolean` | No | Si es `true`, desactiva las compuertas Tesla de emergencia en este nivel (modo desafío). |
| `autoCollectEnergy` | `boolean` | No | Si es `true`, las cápsulas de energía se recogen solas al tocar el suelo. |
| `skyEnergy` | `object` | No | Personaliza o desactiva la energía del cielo en este nivel (ver abajo). |
| `rewardLabel` | `string \| null` | No | Texto de recompensa (ej. `"Desbloquea: Médico de campo"` o `null` si no desbloquea torre). |
| `unlockTower` | `string` | No | `type` de la torre que se desbloquea al completar el nivel (opcional). |
| `enemiesPresent` | `string[]` | No | Si se omite, se deduce automáticamente de `events`. |
| `durationSeconds` | `number` | No | Si se omite, se calcula automáticamente según los tiempos acumulados de `events`. |
| `flagMarkers` | `number[]` | No | Si se omite, el sistema coloca automáticamente banderas en la barra donde haya `isFlagHorde: true`. |
| `events` | `RawLevelEvent[]` | Sí | Lista cronológica de oleadas. |

#### Objeto opcional `skyEnergy`
```json
"skyEnergy": {
  "disabled": false,
  "amount": 50,
  "initialDelaySec": 8,
  "intervalMinSec": 5,
  "intervalVarianceSec": 2
}
```
> Si `"disabled": true`, no caerá energía del cielo y el jugador dependerá de Investigadores o Generadores.

### Campos de cada evento en `events`

| Campo | Tipo | Obligatorio | Descripción |
| :--- | :--- | :--- | :--- |
| `time` | `number` | Sí | **Segundos relativos desde la oleada anterior** (en el primer evento, desde el inicio). Ej: `12`, luego `8` (= segundo 20). |
| `type` | `string` | Sí | ID del SCP en `scps.json` (ej. `"scp_008"`, `"scp_682"`). |
| `row` | `number \| [x1, x2]` | No | Fila `0..rows-1`. Si se omite, es aleatoria (y se adapta al `grid.rows` del nivel). Para enemigos de 2 líneas usa `[x1, x2]` (si se omite, elige 2 filas adyacentes al azar). |
| `rows` | `Array<number \| [x1, x2]>` | No | Lista explícita de filas para generar varios en la misma oleada. |
| `count` | `number` | No | Cantidad de enemigos a generar si no pasas `rows`. Por defecto `1` (o `defaultPackCount` en enemigos como `scp_939`). |
| `isFlagHorde` | `boolean` | No | Marca la oleada como Gran Horda con bandera automática en la barra de progreso. |
| `hordeLabel` | `string` | No | Texto del aviso cuando llega esa horda con bandera. |
| `hpMultiplier` | `number` | No | Multiplica la vida base del SCP en esta oleada (ej. `1.5` = +50% HP). |
| `speedMultiplier` | `number` | No | Multiplica la velocidad del SCP en esta oleada (ej. `1.25`). |
| `dpsMultiplier` | `number` | No | Multiplica el daño del SCP en esta oleada (ej. `1.4`). |
| `extraEffects` | `string[]` | No | Lista de IDs de `effects.json` aplicados extra solo a los enemigos de esta oleada (ej. `["plantilla_veneno_area"]`). |
| `announcement` | `string` | No | Mensaje personalizado que aparece en pantalla cuando sale esta oleada. |

### Ejemplo completo de nivel personalizado
```json
{
  "level": 31,
  "title": "Sector Especial: Alerta Roja",
  "description": "Pasillo estrecho de 4 filas sin compuertas Tesla.",
  "startingEnergy": 300,
  "maxDeckSlots": 8,
  "grid": { "rows": 4, "cols": 10 },
  "disableTeslaGates": true,
  "autoCollectEnergy": false,
  "skyEnergy": { "amount": 75, "intervalMinSec": 5.5 },
  "boardOverride": {
    "tileEven": "#1E1B2E",
    "tileOdd": "#171526",
    "laneStroke": "#4C1D95"
  },
  "rewardLabel": null,
  "events": [
    { "time": 10, "type": "scp_008", "count": 2 },
    { "time": 9, "type": "scp_008", "row": 1, "hpMultiplier": 1.3, "extraEffects": ["plantilla_veneno_area"], "announcement": "Variante tóxica detectada en fila 2." },
    { "time": 12, "type": "scp_682", "isFlagHorde": true, "hordeLabel": "¡Brecha de SCP-682 en el pasillo!" }
  ]
}
```

---

## 3. `towers.json` — Personal y Estructuras

Es un arreglo (`[...]`) con todas las torres disponibles en el juego.

### Campos principales

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `type` | `string` | ID único (usado en `unlockTower`, `designs.json` y mazos). |
| `name` | `string` | Nombre visible en tarjetas y HUD. |
| `category` | `"personal" \| "estructura"` | Importante para efectos que distinguen personal humano (como `scp_012` o `scp_106`). |
| `cost` | `number` | Coste en energía. |
| `cooldown` | `number` | Tiempo de recarga (segundos) tras desplegarla. |
| `maxHp` | `number` | Salud máxima. |
| `unlockLevel` | `number` | Nivel mínimo requerido (o `0` si es inicial). |
| `roleLabel` | `string` | Etiqueta corta en la tarjeta (ej. `"Rifle · 28 daño"`). |
| `description` | `string` | Descripción en la selección de mazo y Archivo SCP. |

### Campos de combate y comportamiento (todos opcionales)

- **Ataque a distancia**:
  - `fireRate`: Segundos entre disparos.
  - `damage`: Daño por proyectil.
  - `burstCount`: Cantidad de disparos por ráfaga (`1`, `3`, etc.).
  - `maxRangeCols`: Alcance máximo en casillas hacia la derecha (ej. `3.8` para Escopetero).
  - `splashRadius`: Radio en casillas para daño de área al impactar (ej. Granadero).
  - `aoeTargets`: Si es `> 0` (como Bobina Tesla), ataca a múltiples enemigos cercanos sin proyectil.
  - `passThrough`: `true` si el proyectil atraviesa enemigos o puertas.
  - `projectileKind`: Clave visual/de velocidad del proyectil (`standard`, `mtf`, `cryo`, `pyro`, `psionic`, `grenade`, `turret`, `shotgun`, `heavy`, `sniper`).
  - `projectileSpeed`: Velocidad personalizada en casillas/segundo para esta torre (sobrescribe `config.json -> projectileSpeeds`).
  - `slowFactor`, `slowDuration`: Ralentización (`0.45` = 45%) al impactar.
  - `burnDps`, `burnDuration`: Daño por segundo de quemadura al impactar.
  - `canBeHypnotized`: `true` si puede ser hipnotizada por SCP-035.
- **Producción / Curación / Defensa**:
  - `energyAmount`, `energyInterval`: Energía generada cada X segundos.
  - `healAmount`, `healInterval`: Salud restaurada cada X segundos en 3x3.
  - `armTime`, `explosionDamage`: Para minas (tiempo de armado y daño explosivo 3x3).
  - `thornsDps`: Daño por segundo reflejado al enemigo que la ataca cuerpo a cuerpo (ej. Búnker).
  - `floorTrapDps`: Daño continuo al enemigo que camine sobre su casilla (ej. Trampa Láser).
- **Reglas de colocación**:
  - `placementRule`: `"any"` (por defecto), `"frontHalf"` (solo mitad delantera derecha del tablero) o `"backHalf"` (solo mitad trasera izquierda).
  - `maxPerBoard`: Máximo simultáneo de esta torre en todo el tablero (ej. `2`).
  - `maxPerRow`: Máximo simultáneo de esta torre por cada fila (ej. `1`).
- **Efectos extra**:
  - `effects`: Arreglo de IDs de `effects.json` (tanto `builtin` como `declarative`), por ejemplo `["heal_pulse", "plantilla_aura_frenesi"]`.

---

## 4. `scps.json` — Enemigos y Anomalías

Es un arreglo (`[...]`) con la ficha técnica y comportamiento de cada SCP.

### Campos base

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `type` | `string` | ID único del SCP (usado en `levels.json` y `designs.json`). |
| `code` | `string` | Código visible (ej. `"SCP-008"`). |
| `name` | `string` | Nombre descriptivo. |
| `classification` | `string` | Subtítulo en el Archivo SCP. |
| `hp`, `speed`, `dps` | `number` | Vida base, velocidad (casillas/seg) y daño por segundo cuerpo a cuerpo. |
| `scoreValue` | `number` | Puntos al eliminarlo. |
| `portrait` | `string` | Imagen para la tarjeta del Archivo SCP y vista previa de nivel. |
| `summary`, `tacticalNote` | `string` | Textos del Archivo SCP. |
| `effects` | `string[]` | Lista de IDs de `effects.json` vinculados a este SCP. |
| `isSummon` | `boolean` | Si es `true`, se marca como invocación (ej. `scp_049_2`, `scp_019_2`). |
| `announcement` | `string` | Texto que se muestra la primera vez que entra en combate. |

### Bloque `behavior` (reglas especiales configurables)

- `laneSpan`: Número de filas que ocupa (`1` normal, `2` como SCP-682).
- `defaultPackCount`: Cantidad por defecto si en `levels.json` se omite `count` (ej. `3` para SCP-939).
- `immunities`: Arreglo de inmunidades: `"all_effects"`, `"explosion"`, `"slow"`, `"burn"`, `"stun"`, `"silence"`.
- `spawnRule`:
  - `mode`: `"edge"` (entra por la derecha) o `"sky"` (cae del cielo como 012/079).
  - `colRange`: `[minCol, maxCol]` donde puede aterrizar en modo `"sky"`.
  - `maxPerLevel`: Límite máximo de instancias de este SCP en un nivel (ej. `1` para SCP-079).
- `instakillTower`: `true` si mata cualquier torre al primer contacto.
- `disappearOnHit`: `true` si desaparece tras impactar (ej. SCP-018).
- `bounceAccel`: `{ "accelPerSec": 0.28, "maxSpeed": 3.4 }` (aceleración continua).
- Sub-comportamientos vinculados a IDs de `effects.json`: `blinkJump`, `plagueAura`, `sleepAura`, `hypnosisGlobal`, `skyPull`, `enrage096`, `vaseSpawner`, `pocketDimension`, `screamArea`, `doorController`.

---

## 5. `effects.json` y el **Editor Master de Efectos**

Es un diccionario `{ "id_efecto": { ... "engineMode": "declarative", ... } }`. 

### Uso del Editor Master dentro del juego
Accede desde **Archivo SCP -> Efectos**. El editor cuenta con dos modos:
1. **Editor Visual Avanzado**: Formularios organizados por pestañas/bloques para configurar ID, categoría, disparador (`trigger`), bando (`targetSide`), área (`areaShape`, `radiusCells`), modificadores de combate y efectos visuales/audio sin escribir JSON manualmente.
2. **Editor JSON Libre**: Pestaña de texto JSON con validación instantánea y botón para volcar los cambios al editor visual o copiarlos a portapapeles.

### Esquema completo de un efecto declarativo

| Campo | Valores | Descripción |
| :--- | :--- | :--- |
| `id` | `string` | Identificador único (debe coincidir con la clave en `effects.json`). |
| `name`, `description` | `string` | Nombre y descripción visibles en el Archivo SCP. |
| `engineMode` | `"declarative"` | Obligatorio para efectos dinámicos configurables. |
| `category` | `"aura" \| "status" \| "trigger" \| "combat" \| "summon" \| "utility" \| "immunity"` | Categoría organizativa. |
| `trigger` | `"continuous_aura" \| "periodic" \| "on_spawn" \| "on_attack" \| "on_hit" \| "on_kill" \| "on_death" \| "on_hp_below" \| "passive"` | Cuándo se dispara el efecto. |
| `targetSide` | `"opponents" \| "allies" \| "towers" \| "enemies" \| "self"` | A quién afecta en relación al emisor. |
| `targetCategories` | `["personal" \| "estructura"]` | Filtra torres por categoría (opcional). |
| `targetTypes`, `excludeTypes` | `string[]` | Incluye o excluye IDs concretos. |
| `excludeSelf` | `boolean` | Si es `true`, el emisor no se aplica el efecto a sí mismo. |
| `areaShape` | `"single" \| "self" \| "square" \| "rect" \| "lane" \| "global"` | Forma del área (`square` usa `radiusCells`: `1` = 3x3, `2` = 5x5; `rect` usa `radiusRows` y `radiusCols`). |
| `initialDelaySec`, `intervalSec`, `durationSec`, `cooldownSec` | `number` | Tiempos de retardo, frecuencia, duración y enfriamiento. |
| `hpThresholdRatio`, `chance`, `maxTriggers` | `number` | Umbrales de HP (`0.5`), probabilidad (`0..1`) y límite de activaciones. |
| `color`, `badgeLabel`, `badgeTextColor` | `string` | Color principal y etiqueta pequeña sobre las unidades afectadas. |

#### Bloque `modifiers` (qué hace el efecto)
- **Daño / Curación / Energía**: `damageInstant`, `damagePercentMaxHp`, `dotDps`, `healAmount`, `healPercent`, `hotHps`, `energyGain`.
- **Atributos y Control**: `speedMultiplier`, `slowFactor`, `fireRateMultiplier`, `damageMultiplier`, `disableTowerActions`, `hypnotizeTower`, `stunSec`, `deafSec`, `immuneToPsych`, `cleanseNegative`, `grantsImmunities`.
- **Movimiento**: `knockbackCols` (retroceso), `teleportCells`, `pullCells` (atracción).
- **Invocación y Muerte**: `spawnType`, `spawnCount`, `convertVictimTo`, `extraLives`, `reviveHpPercent`, `instakill`, `disappearOnHit`.
- **Inmunidad respetada**: `respectImmunity` (`"none" | "slow" | "burn" | "stun" | "explosion" | "silence" | "all_effects"`).

#### Bloque `visual` (retroalimentación en pantalla)
- `showZone`, `zoneRgb` (`"R, G, B"`), `zoneStroke`, `zonePulseSpeed`, `warnBeforeSec`: Dibuja el aura punteada en el mapa.
- `waveKind`: `"ring" | "explosion" | "stun_wave" | "scream_wave_066" | "heal_ring" | "revive_ring" | "cryo_hit" | "burn_hit" | "pocket_portal" | "bounce_impact"`.
- `waveColorRgb`, `waveRadiusPx`, `waveDurationSec`: Personaliza la onda expansiva.
- `floatingText`, `floatingTextColor`, `sound`, `targetTintColor`.

---

## 6. `designs.json` — Apariencia, Sprites y Formas (`customShapes`)

Controla absolutamente todo lo que se dibuja en el `<canvas>`.

### Secciones principales

- **`board`**: Fondo (`canvasBg`, `gateBg`, `breachBg`, `bgImage`, `bgImageOpacity`), baldosas (`tileEven`, `tileOdd`, `tileSpriteEven`, `tileSpriteOdd`, `tileStroke`, `tileStrokeWidth`), flechas de carril (`arrowFill`, `arrowColumns`, `adaptArrowsToGrid`), líneas divisorias (`laneStroke`, `laneStrokeWidth`), franja de brecha (`breachStripeDark`, `breachStripeAmber`, `breachStripeWidth`, `breachStripeHeight`) y parpadeo de 173 (`blinkOverlayRgb`, `blinkMaxAlpha`).
- **`zones`**: Colores y opacidad de auras (radio, médico, tesla, 966, 066 y previsualización de hover válido/inválido/retirar).
- **`gates`**, **`doors079`**, **`statuses`**, **`badges`**, **`effects`**, **`fonts`**, **`ui`**: Colores, radios, anchos de barras de HP, sprites y textos de etiquetas de estado.
- **`defaultTower`**, **`defaultEnemy`**, **`defaultProjectile`**: Diseño de respaldo automático si añades un nuevo `type` en `towers.json` o `scps.json` sin haber creado aún su entrada en `designs.json`.
- **`towers` / `enemies` / `projectiles`**: Diccionarios por ID (`guard`, `scp_008`, `standard`, etc.).

### Sprites externos en cualquier torre, enemigo o proyectil
Puedes usar una imagen PNG/WebP/SVG en lugar o en combinación con el dibujo vectorial:
```json
"guard": {
  "sprite": "/src/assets/images/mi_guardia.png",
  "spriteMode": "replace",
  "spriteWidth": 74,
  "spriteHeight": 74,
  "spriteOffsetX": 0,
  "spriteOffsetY": -2,
  "spriteFlipX": false,
  "spriteOpacity": 1
}
```
- `spriteMode`: `"replace"` (oculta el vector), `"under"` (sprite debajo del vector) o `"over"` (sprite encima del vector).

### Constructor de Formas Vectoriales (`customShapes` o `layers` directo)

Puedes definir geometrías reutilizables dentro de `"customShapes"` y referenciarlas con `"shape": "mi_forma"`, o poner `"layers": [...]` directamente dentro de una torre, enemigo o proyectil.

#### Primitivas disponibles (`type`)
1. `rect`: `x, y, w, h`
2. `roundRect`: `x, y, w, h, r`
3. `circle`: `x, y, r`
4. `ellipse`: `x, y, rx, ry`
5. `polygon`: `points: [[x1, y1], [x2, y2], ...]`, `closed` (opcional)
6. `line`: `x, y, x2, y2`
7. `arc`: `x, y, r, startDeg, endDeg`
8. `text`: `x, y, text, font, textAlign`

#### Tokens de color dinámicos
En `fill` y `stroke` puedes usar colores HEX/RGBA normales o tokens que leen la paleta de la entidad:
- `$body`, `$stroke`, `$head`, `$headOrTop`, `$accent`, `$weapon`, `$weaponOrDetail`, `$secondary`, `$detail`, `$aura`, `$glow`, `$core`, `$color`, `$slowBody`, `$slowHead`.

#### Condiciones y animaciones por capa
- `condition`: `"always"`, `"slowed"`, `"notSlowed"`, `"disabled"`, `"enabled"`, `"armed"`, `"unarmed"`, `"enraged"`, `"convulsing"`, `"damaged"` (<50% HP), `"burning"`.
- `applyBob`: `true` (aplica rebote de caminata).
- `applyRecoil`: número (ej. `0.5`, retroceso al disparar).
- `applyShake`: `true` (temblor).
- `pulseSpeed`, `pulseMinAlpha`, `pulseMaxAlpha`: parpadeo suave de opacidad/color.
- `rotationDeg`, `opacity`, `lineWidth`.

### Ejemplo rápido de forma personalizada en `designs.json`
```json
"customShapes": {
  "scp_cristal": {
    "layers": [
      { "type": "circle", "x": 0, "y": 0, "r": 24, "fill": "$aura", "pulseSpeed": 5, "pulseMinAlpha": 0.4, "pulseMaxAlpha": 0.95 },
      { "type": "polygon", "points": [[0, -22], [14, 0], [0, 20], [-14, 0]], "fill": "$body", "stroke": "$stroke", "lineWidth": 2.2, "applyBob": true },
      { "type": "circle", "x": 0, "y": -4, "r": 4, "fill": "$accent", "condition": "notSlowed", "applyBob": true },
      { "type": "circle", "x": 0, "y": -4, "r": 4, "fill": "$slowHead", "condition": "slowed", "applyBob": true }
    ]
  }
}
```
Y luego en `"enemies"`:
```json
"scp_nuevo": {
  "shape": "scp_cristal",
  "body": "#0EA5E9",
  "stroke": "#0369A1",
  "head": "#38BDF8",
  "accent": "#F43F5E",
  "aura": "56, 189, 248",
  "hpBar": "#38BDF8",
  "barWidth": 42,
  "codeLabel": "NEW"
}
```

---

## Flujo recomendado para añadir contenido sin tocar código

1. **Nuevo efecto**: Créalo desde el juego (**Archivo SCP -> Efectos -> + Nuevo Efecto** con el **Editor Master**) y copia el JSON resultante en `effects.json`.
2. **Nuevo SCP o Torre**: Añade su bloque en `scps.json` o `towers.json` con sus stats y su array `"effects": [...]`.
3. **Apariencia personalizada**: Añade su clave en `designs.json` (`enemies` / `towers`) usando `sprite`, colores o `customShapes` (si omites esto, usará `defaultEnemy` / `defaultTower` automáticamente).
4. **Nivel personalizado**: Añade el nivel en `levels.json` con su propio `grid: { rows, cols }`, `boardOverride`, `skyEnergy` y `events`.
