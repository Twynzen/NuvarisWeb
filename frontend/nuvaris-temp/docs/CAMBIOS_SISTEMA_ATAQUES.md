# Sistema de Ataques - Cambios Implementados

## 🎯 Resumen

Se implementó un nuevo sistema donde:
- **Los enemigos ATACAN** en lugar de hacer daño continuo
- **Daño visual claro** al moment del ataque (flash rojo)
- **Speed control en debug** (Ctrl+1, 2, 3) para ver colisiones en cámara lenta

---

## 📝 Cambios Realizados

### 1. enemy.three.ts - Sistema de Ataque

**Agregado: Propiedades de ataque**
```typescript
// Attack system
private lastAttackTime = 0;
private attackCooldown = 1.0;           // 1 segundo entre ataques
private attackRange = 5;                // Rango para iniciar ataque
private attackDamage = 20;              // Daño del ataque
private isAttacking = false;
private attackDuration = 0.3;           // Duración visual del ataque
private attackStartTime = 0;
private originalColor = 0xffaaaa;
```

**Modificado: Método update()**
```typescript
// ANTES:
update(delta: number, player: PlayerThree, mapBounds: number = 98)

// AHORA:
update(delta: number, player: PlayerThree, mapBounds: number = 98, currentTime: number = 0)
```

**Nuevo: Lógica de ataque**
```typescript
// Check if should attack
if (distToPlayer < this.attackRange && (currentTime - this.lastAttackTime) > this.attackCooldown) {
    this.startAttack(currentTime);
}

// Update attack visual
if (this.isAttacking) {
    const attackElapsed = currentTime - this.attackStartTime;
    if (attackElapsed > this.attackDuration) {
        this.isAttacking = false;
        // Restore original color
        (this.sprite.material as THREE.SpriteMaterial).color.setHex(this.originalColor);
    }
}

// Movement - slower during attack
const moveSpeed = this.isAttacking ? this.speed * 0.3 : this.speed;
```

**Nuevos métodos públicos:**
```typescript
public isCurrentlyAttacking(): boolean
public getAttackDamage(): number
```

---

### 2. three-engine.service.ts - Sistema de Velocidad y Colisiones

**Agregado: Time Scale para debug**
```typescript
// Debug time scale (only in debug mode) - Ctrl+1, Ctrl+2, Ctrl+3
private timeScale = 1.0; // 1.0 = normal, 0.5 = slow, 0.25 = very slow
```

**Agregado: Controles de velocidad en setupInput()**
```typescript
// Speed control (only in debug mode)
if (this.gameState.debugMode && e.ctrlKey && !e.shiftKey && !e.altKey) {
    if (e.key === '1') {
        this.timeScale = 0.25; // Very slow
        console.log(`[DEBUG] Time Scale: 0.25x (Very Slow)`);
    } else if (e.key === '2') {
        this.timeScale = 0.5; // Slow
        console.log(`[DEBUG] Time Scale: 0.5x (Slow)`);
    } else if (e.key === '3') {
        this.timeScale = 1.0; // Normal
        console.log(`[DEBUG] Time Scale: 1.0x (Normal)`);
    }
}
```

**Modificado: render() - Aplicar timeScale**
```typescript
let delta = this.clock.getDelta();

// Apply time scale (debug speed control)
delta *= this.timeScale;

const currentTime = this.clock.getElapsedTime();
```

**Reemplazado: Colisión de enemigos**
```typescript
// ANTES: checkEnemyCollision(delta) - Daño continuo
// AHORA: checkEnemyAttackCollision(currentTime) - Daño solo en ataque
```

**Modificado: Actualización de enemigos**
```typescript
// ANTES:
this.enemies.forEach(enemy => enemy.update(delta, this.player, 98));

// AHORA:
this.enemies.forEach(enemy => enemy.update(delta, this.player, 98, currentTime));
```

---

## 🎮 Cómo Funciona Ahora

### Flujo de Ataque Enemigo

```
Enemy cerca del player (< 5 unidades)
    ↓
Tiempo desde último ataque > 1 segundo
    ↓
Enemigo inicia ataque (flash rojo)
    ↓
Enemigo toca al player MIENTRAS está atacando
    ↓
Player recibe daño (-20)
    ↓
Flash rojo en player
    ↓
Enemigo vuelve a color normal (0.3 seg)
    ↓
Espera 1 segundo antes del próximo ataque
```

### Speed Control (Debug)

```
Ctrl+D  → Activar debug mode
Ctrl+1  → 0.25x speed (muy lento)
Ctrl+2  → 0.5x speed (lento)
Ctrl+3  → 1.0x speed (normal)

Console muestra: [DEBUG] Time Scale: 0.25x (Very Slow)
```

---

## 📊 Valores Configurables

| Variable | Valor | Descripc ión |
|----------|-------|------------|
| `attackCooldown` | 1.0 seg | Tiempo entre ataques |
| `attackRange` | 5 unidades | Distancia para iniciar ataque |
| `attackDamage` | 20 | Daño del ataque |
| `attackDuration` | 0.3 seg | Duración del flash rojo |

**Para cambiar:** Edita `enemy.three.ts` líneas 23-29

---

## 🔍 Visual Feedback

### Enemy Attack (Flash Rojo)
```
Color normal: 0xffaaaa (rojo claro)
         ↓
Color ataque: 0xff0000 (rojo intenso - VISIBLE!)
         ↓
Dura 0.3 segundos
         ↓
Vuelve al color normal
```

### Player Hit (Flash Rojo)
```
Color normal: sprite original
         ↓
Toma daño: Color rojo (0xff3333)
         ↓
Dura 100ms
         ↓
Vuelve al original

Console debug:
[HIT] Enemy attack! Damage: 20, Health: 80
```

---

## 🎯 Casos de Uso

### Caso 1: Ver una colisión en tiempo real
```
1. Presiona Ctrl+D (activar debug)
2. Dejas que un enemigo se acerque
3. Verás: Enemy flash rojo + Player flash rojo + [HIT] en console
```

### Caso 2: Ver exactamente CUÁNDO ocurre la colisión
```
1. Presiona Ctrl+D (debug)
2. Presiona Ctrl+1 (0.25x speed - muy lento)
3. Observa: Enemy se vuelve rojo (está atacando)
4. Player se vuelve rojo (recibió daño)
5. Health disminuye de golpe
6. Console muestra: [HIT] Enemy attack! Damage: 20
```

### Caso 3: Ajustar difficulty
```
// Para enemigos más débiles:
private attackDamage = 10;  // Menos daño

// Para enemigos más fuertes:
private attackDamage = 50;  // Más daño

// Para más tiempo de reacción:
private attackCooldown = 2.0;  // Más tiempo entre ataques

// Para ataques más rápidos:
private attackCooldown = 0.5;  // Menos tiempo entre ataques
```

---

## 🚀 Comparación Antes vs Después

### ANTES (Daño continuo)
```
Enemy toca jugador
→ -0.16 HP/frame (60 FPS)
→ Casi invisible
→ No se ve cuándo es la colisión
→ Difícil de debugear
```

### DESPUÉS (Ataques)
```
Enemy se acerca
→ Espera 1 segundo
→ Se vuelve ROJO (flash visible)
→ Toca jugador
→ Player se vuelve ROJO
→ -20 HP de golpe (VISIBLE)
→ Console: [HIT] Enemy attack! Damage: 20
→ Espera 1 segundo antes del próximo ataque
```

---

## 🧪 Testing

### Test 1: Verifica que enemigos atacan
```
1. npm run start
2. Presiona Ctrl+D
3. Espera a que un enemigo se acerque
4. Debe ponerse rojo después de 1 segundo
```

### Test 2: Verifica el daño
```
1. Deja que el enemigo te golpee
2. Debe ver:
   - Enemy flash rojo
   - Player flash rojo
   - Health baja de golpe
   - Console: [HIT] Enemy attack!
```

### Test 3: Verifica speed control
```
1. Presiona Ctrl+D (debug)
2. Presiona Ctrl+1 (ralentiza a 0.25x)
3. Todo debe ir muy lento
4. Presiona Ctrl+3 (vuelve a normal)
5. Debe volver a velocidad normal
```

### Test 4: Verifica cooldown
```
1. Deja que un enemigo ataque
2. Flash rojo debe desaparecer
3. Espera ~1 segundo
4. Flash rojo debe aparecer de nuevo
5. Patrón repetido cada ~1 segundo
```

---

## 📋 Cambios en Archivos

| Archivo | Líneas | Cambios |
|---------|--------|---------|
| `enemy.three.ts` | 22-128 | +7 propiedades, update() mejorado, +3 métodos |
| `three-engine.service.ts` | 49, 99-111, 310-339, 454-516 | timeScale, speed control, colisiones solo en ataque |

---

## ✅ Checklist de Validación

- [x] Enemigos tienen sistema de ataque
- [x] Ataque tiene cooldown de 1 segundo
- [x] Ataque genera flash rojo visible
- [x] Daño se aplica SOLO cuando atacan
- [x] Speed control funciona (Ctrl+1, 2, 3)
- [x] Speed control SOLO en debug mode
- [x] Console logs muestran ataques
- [x] Player recibe feedback visual al ser golpeado

---

## 🔧 Cómo Modificar

### Cambiar cooldown entre ataques
```typescript
// enemy.three.ts línea 24
private attackCooldown = 1.0;  // Cambiar este valor

// 0.5 = ataques más rápido
// 2.0 = ataques más lento
```

### Cambiar daño del ataque
```typescript
// enemy.three.ts línea 26
private attackDamage = 20;  // Cambiar este valor

// 10 = enemigos más débiles
// 50 = enemigos más fuertes
```

### Cambiar rango de ataque
```typescript
// enemy.three.ts línea 25
private attackRange = 5;  // Cambiar este valor

// 3 = ataque de corto rango
// 10 = ataque de largo rango
```

---

## 📞 Notas Finales

**Ventajas:**
- ✅ Feedback visual CLARO de ataques
- ✅ Fácil debugear con speed control
- ✅ Gameplay más justo (se ve cuándo atacan)
- ✅ Configurable fácilmente

**Desventajas:**
- ❌ Enemigos más débiles (1 ataque por segundo)
- ❌ Puede ser aburridor si cooldown es largo

**Rebalanceo sugerido:**
- Reduce `attackCooldown` a 0.7 para más peligro
- Aumenta `attackDamage` a 25-30 para más desafío
- Reduce `attackRange` a 3 para atacar solo muy cerca

---

**Versión**: 1.0
**Fecha**: 2025-11-26
**Estado**: Implementado y listo para testing
