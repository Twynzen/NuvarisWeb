# NUVARIZ - Plan de Monetización e Integración de Pagos

## Resumen Ejecutivo

Este documento detalla las opciones de monetización de Nuvariz, las plataformas de pago recomendadas, y los aspectos legales críticos a considerar.

---

## Opciones de Monetización

### 1. Donación Libre
**Estado:** ✅ Implementar ahora

| Aspecto | Detalle |
|---------|---------|
| Descripción | El usuario elige cuánto donar libremente |
| Mínimo sugerido | $1 USD |
| Plataforma | Ko-fi (0% comisión) o Stripe (3-5%) |
| Recompensas | Actualizaciones, feedback prioritario, correo directo |

### 2. Introduce tu Personaje
**Estado:** ✅ Implementar ahora

| Aspecto | Detalle |
|---------|---------|
| Precio | $100 USD |
| Incluye | Diseño de assets, planificación de comportamiento, integración |
| Proceso | Contacto por email → Pago → Desarrollo → Entrega |
| Plataforma | Stripe (pago único) |

### 3. Moneda del Juego (QDT Coins)
**Estado:** ⏳ Próximamente (requiere investigación legal)

| Aspecto | Detalle |
|---------|---------|
| Descripción | Moneda in-game comprable con dinero real |
| Objetivo futuro | Permitir venta/comercio entre jugadores |
| Complejidad legal | ALTA - Ver sección de regulaciones |

---

## Plataformas de Pago Recomendadas

### Ko-fi (Recomendado para donaciones)
- **URL:** https://ko-fi.com
- **Comisión:** 0% en donaciones, 5% en membresías
- **Ventajas:**
  - Sin comisión en tips/donaciones
  - Integración simple (embed o link)
  - Popular en comunidad gaming/indie
  - Payouts instantáneos
- **Integraciones:** PayPal, Stripe, Discord, Twitch

### Stripe (Recomendado para pagos custom)
- **URL:** https://stripe.com
- **Comisión:** 2.9% + $0.30 por transacción
- **Ventajas:**
  - Control total sobre la experiencia
  - API robusta para integración custom
  - Soporta pagos únicos y recurrentes
  - Checkout embebido o redirect
- **Requisitos:**
  - Cuenta de negocio/empresa
  - Verificación de identidad
  - Términos de servicio claros

### PayPal (Alternativa/Backup)
- **Comisión:** 3.49% + tarifa fija
- **Ventajas:**
  - Reconocimiento mundial
  - Fácil para usuarios sin tarjeta
- **Desventajas:**
  - Comisiones más altas
  - Puede retener fondos

---

## Proceso de Implementación

### Fase 1: Donación Libre (Inmediato)
1. Crear cuenta en Ko-fi
2. Configurar página de creator
3. Obtener link de donación
4. Integrar botón/link en página de Support

### Fase 2: Personaje Custom ($100)
1. Crear cuenta Stripe (si no existe)
2. Crear producto "Custom Character" en Stripe
3. Generar link de pago o integrar Checkout
4. Configurar webhook para confirmación (opcional)
5. Establecer proceso de comunicación post-pago

### Fase 3: Moneda del Juego (Futuro)
1. Definir estructura legal (ver sección siguiente)
2. Consultar con abogado especializado en fintech/gaming
3. Redactar términos de servicio específicos
4. Implementar sistema de wallet in-game
5. Integrar pasarela de pago
6. (Opcional) Implementar sistema de trading entre jugadores

---

## ⚠️ ASPECTOS LEGALES CRÍTICOS - MONEDA DEL JUEGO

### Escenario Deseado
- Comprar moneda con dinero real ✓
- Usar moneda dentro del juego ✓
- Vender moneda de vuelta por dinero real ⚠️
- Comerciar moneda entre jugadores ⚠️

### Regulaciones EU (2025)

**Fuente:** [EU Consumer Protection Guidelines for Virtual Currencies](https://www.mygamecounsel.com/2025/04/articles/virtual-currency/eu-new-european-consumer-protection-guidelines-for-virtual-currencies-in-video-games/)

**Principios clave:**
1. **Transparencia de precios:** Los precios deben mostrarse en dinero real, no solo en moneda virtual
2. **Cantidad flexible:** El usuario debe poder elegir la cantidad exacta a comprar (no paquetes forzados)
3. **Derecho de retiro:** 14 días para cancelar y obtener reembolso (excepto si se usó el contenido digital)
4. **Protección de menores:** Controles parentales obligatorios, comunicación apropiada
5. **No explotar vulnerabilidades:** Diseño del juego no debe forzar compras

**Penalidades:** Hasta 4% de ingresos anuales en multas

**Legislación próxima:** Digital Fairness Act (esperado 2026) - Regulará videojuegos específicamente

### Regulaciones USA (FinCEN)

**Fuente:** [Regulatory Risks of In-Game Virtual Currency](https://www.lexology.com/library/detail.aspx?g=a0243a6e-75e2-4dd3-9bb0-72a720837f85)

**Problema crítico:** Si la moneda se puede:
- Vender por dinero real
- Transferir entre jugadores
- Convertir a otras monedas

→ **FinCEN te clasifica como "Money Transmitter"**

**Requisitos de Money Transmitter:**
- Registro federal con FinCEN
- Licencias estatales (hasta 50 diferentes)
- Programa anti-lavado de dinero (AML)
- Programa Know Your Customer (KYC)
- Reportes de transacciones sospechosas
- **Costo estimado:** $50,000 - $500,000+ en setup legal

### Cómo EVITAR ser Money Transmitter

**Opción A: Moneda cerrada (recomendado inicialmente)**
```
✅ Se compra con dinero real
✅ Se usa solo dentro del juego
❌ NO se puede vender de vuelta
❌ NO se puede transferir entre jugadores
❌ NO tiene valor fuera del juego
```

**Términos de uso requeridos:**
> "La moneda virtual de Nuvariz representa una licencia limitada, no transferible y no exclusiva para usar contenido digital dentro del juego. No tiene valor monetario real y no puede ser canjeada, reembolsada, transferida ni vendida por dinero real."

**Opción B: Moneda comercializable (requiere estructura legal)**
- Formar empresa en jurisdicción favorable (Malta, Gibraltar, Estonia)
- Obtener licencias necesarias
- Implementar KYC/AML completo
- Contratar compliance officer
- Auditorías regulares
- **Timeline:** 6-18 meses
- **Costo:** $100,000+

### Riesgos de Lavado de Dinero

**Fuente:** [Video Games, Virtual Currencies, and Money Laundering](https://newtech.law/en/articles/video-games-virtual-currencies-and-money-laundering)

**Casos documentados:**
- **Fortnite:** Criminales usaron tarjetas robadas para comprar V-Bucks y revenderlas
- **CS:GO:** Valve deshabilitó reventa de llaves por explotación de lavado
- **Clash of Clans:** Fraudes similares reportados

**Implicación:** Si permites comercio entre jugadores, necesitas:
- Verificación de identidad
- Límites de transacción
- Monitoreo de actividad sospechosa
- Reportes a autoridades

---

## Recomendación Final

### Corto plazo (Ahora)
1. ✅ Implementar donación libre con Ko-fi
2. ✅ Implementar pago de personaje con Stripe
3. ⏳ Moneda del juego como "Próximamente"

### Mediano plazo (3-6 meses)
1. Consultar abogado especializado en gaming/fintech
2. Definir si moneda será cerrada o comercializable
3. Preparar términos de servicio apropiados

### Largo plazo (6-12 meses)
1. Si se decide por comercializable: iniciar proceso de licencias
2. Implementar sistema de wallet con controles apropiados
3. Lanzar moneda del juego

---

## Checklist de Implementación

### Antes de lanzar donaciones
- [ ] Crear cuenta Ko-fi
- [ ] Configurar página de creator
- [ ] Crear correo corporativo (soporte@nuvaris.com o similar)
- [ ] Redactar términos de servicio básicos
- [ ] Agregar política de privacidad

### Antes de lanzar personaje custom
- [ ] Crear cuenta Stripe
- [ ] Verificar identidad/negocio
- [ ] Crear producto en Stripe
- [ ] Definir proceso de comunicación con cliente
- [ ] Preparar contrato/acuerdo de servicio

### Antes de lanzar moneda (futuro)
- [ ] Consultar abogado
- [ ] Definir modelo (cerrado vs comercializable)
- [ ] Redactar términos específicos de moneda virtual
- [ ] Implementar sistema técnico de wallet
- [ ] (Si comercializable) Obtener licencias necesarias
- [ ] (Si comercializable) Implementar KYC/AML

---

## Referencias

1. [EU Virtual Currency Guidelines 2025](https://www.mygamecounsel.com/2025/04/articles/virtual-currency/eu-new-european-consumer-protection-guidelines-for-virtual-currencies-in-video-games/)
2. [Bird & Bird - Virtual Currency vs Consumer Law](https://www.twobirds.com/en/insights/2025/global/regulatory-spotlight-virtual-currency-vs-consumer-law-part-2)
3. [Reed Smith - EU Guidance Q&A](https://www.reedsmith.com/en/perspectives/2025/03/qas-on-the-eu-consumer-protection-authorities-joint-guidance-paper)
4. [Lexology - Regulatory Risks](https://www.lexology.com/library/detail.aspx?g=a0243a6e-75e2-4dd3-9bb0-72a720837f85)
5. [NewTech Law - Money Laundering](https://newtech.law/en/articles/video-games-virtual-currencies-and-money-laundering)
6. [Ko-fi vs Patreon](https://more.ko-fi.com/patreon-alternative)
7. [Patreon Alternatives 2025](https://www.uscreen.tv/blog/patreon-alternatives/)

---

*Documento creado: 2026-01-02*
*Última actualización: 2026-01-02*
