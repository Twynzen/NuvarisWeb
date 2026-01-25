# PORTAL CONTROL - Lista Completa de Assets Requeridos

> **Versión:** 1.0
> **Fecha:** 2026-01-25
> **Estilo Visual:** Comic/Novela Gráfica - Tono oscuro, burocrático, con toques de horror cósmico

---

## 📐 ESPECIFICACIONES TÉCNICAS GLOBALES

### Formato de Archivos
- **Formato:** PNG con transparencia (fondo transparente)
- **Profundidad de color:** 32-bit RGBA
- **Resolución base:** 512x768 px para sprites de personajes
- **Resolución mínima:** 256x384 px (para versiones reducidas)

### Estilo Visual
- **Género:** Comic/Novela Gráfica estilo "Papers, Please" + "Men in Black"
- **Paleta:** Colores desaturados con acentos de neón (verde QDT, púrpura dimensional)
- **Iluminación:** Luz frontal suave, sombras definidas pero no duras
- **Contornos:** Líneas negras definidas (2-3px a resolución 512px)
- **Expresiones:** Sutiles, profesionales, con capacidad de mostrar nerviosismo

### Reglas de Color para Modificación por Código
Los assets deben usar colores que permitan modificación por hue-shift:
- **Piel/cuerpo:** Tonos neutros que cambien bien con hue-rotation
- **Ropa:** Colores base que se vean bien en múltiples tonos
- **Evitar:** Blancos puros (#FFFFFF) y negros puros (#000000) en áreas colorizeables

---

## 🧬 SPRITES DE ESPECIES

### 1. HUMANOS

#### 1.1 Cuerpos Base (3 variantes)
| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `humano_cuerpo_1.png` | Cuerpo Masculino Promedio | Complexión media, postura formal de pie | 512x768 |
| `humano_cuerpo_2.png` | Cuerpo Femenino Promedio | Complexión media, postura formal de pie | 512x768 |
| `humano_cuerpo_3.png` | Cuerpo Andrógino/Neutro | Complexión delgada, unisex | 512x768 |

**Especificaciones de diseño:**
- Vista frontal, ligeramente de 3/4
- Brazos visibles a los lados
- Ropa neutra (camisa/camiseta simple)
- Tono de piel base: #E8BEAC (será modificado por código)
- Sin rasgos faciales detallados (se añade capa de cara encima)

#### 1.2 Caras (3 expresiones)
| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `humano_cara_neutral.png` | Expresión Neutral | Cara relajada, profesional | 200x250 |
| `humano_cara_nervioso.png` | Expresión Nerviosa | Cejas levantadas, sudor sutil | 200x250 |
| `humano_cara_serio.png` | Expresión Seria | Ceño fruncido, mandíbula tensa | 200x250 |

**Especificaciones:**
- Debe encajar en la zona de cabeza del cuerpo base
- 2 ojos claramente visibles
- Variedad étnica neutra (modificable por hue-shift)

#### 1.3 Ropa (4 tipos)
| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `ropa_civil.png` | Ropa Civil | Camisa/camiseta casual | 512x768 |
| `ropa_formal.png` | Ropa Formal | Traje/vestido de negocios | 512x768 |
| `ropa_obrero.png` | Ropa de Trabajo | Overol, ropa de trabajo manual | 512x768 |
| `ropa_refugiado.png` | Ropa Desgastada | Ropa rota, sucia, de viajero | 512x768 |

#### 1.4 Accesorios Humanos (5 opcionales)
| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `acc_gafas.png` | Gafas | Gafas normales | 100x50 |
| `acc_sombrero.png` | Sombrero | Gorra o sombrero casual | 150x100 |
| `acc_cicatriz.png` | Cicatriz Facial | Cicatriz en mejilla | 80x40 |
| `acc_barba.png` | Barba | Barba corta/media | 120x80 |
| `acc_traductor_humano.png` | Traductor de Oreja | Dispositivo en oreja | 60x80 |

---

### 2. VULNARI (Los Melancólicos con Ulnar)

#### 2.1 Cuerpos Base (3 variantes)
| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `vulnari_cuerpo_esbelto.png` | Cuerpo Esbelto | Alto, delgado, etéreo | 512x768 |
| `vulnari_cuerpo_delgado.png` | Cuerpo Muy Delgado | Extremadamente delgado, frágil | 512x768 |
| `vulnari_cuerpo_etereo.png` | Cuerpo Etéreo | Semi-transparente en bordes | 512x768 |

**Especificaciones de diseño:**
- Piel con tonos púrpura/azul/plateado base (#8B5CF6)
- Cuerpo alargado, elegante
- Brazos largos y delgados
- Postura ligeramente inclinada (melancolía)
- SIN Ulnar (se añaden como capa separada)

#### 2.2 Ulnar/Tentáculos Cerebrales (3 variantes)
| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `ulnar_4.png` | 4 Ulnar | 4 tentáculos emergiendo de la cabeza | 300x200 |
| `ulnar_6.png` | 6 Ulnar | 6 tentáculos (configuración común) | 300x200 |
| `ulnar_8.png` | 8 Ulnar | 8 tentáculos (anciano/noble) | 300x200 |

**Especificaciones CRÍTICAS:**
- Los Ulnar son ESENCIALES para identificar a un Vulnari
- Deben emerger claramente de la parte superior/posterior de la cabeza
- Aspecto orgánico, ligeramente luminoso
- Color base que permita hue-shift (#9D4EDD)
- Cada tentáculo debe ser distinguible y contable

#### 2.3 Caras Vulnari (3 expresiones)
| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `vulnari_cara_melancolico.png` | Melancolía | Expresión triste por defecto, ojos caídos | 200x280 |
| `vulnari_cara_sereno.png` | Serenidad | Paz triste, aceptación | 200x280 |
| `vulnari_cara_triste.png` | Tristeza Profunda | Muy triste, casi llorando | 200x280 |

**Especificaciones:**
- Ojos grandes, luminosos, con brillo interno
- Sin pupilas definidas (ojos etéreos)
- Tono de piel que coincida con cuerpos

#### 2.4 Vestimenta Vulnari (3 tipos)
| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `tunica_simple.png` | Túnica Simple | Túnica fluida, tonos apagados | 512x768 |
| `vestimenta_noble.png` | Vestimenta Noble | Túnica elaborada con bordados | 512x768 |
| `ropas_peregrino.png` | Ropas de Peregrino | Túnica de viaje, desgastada | 512x768 |

#### 2.5 Accesorios Vulnari (4 opcionales)
| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `joyas_resonantes.png` | Joyas Resonantes | Collar/brazalete que "suena" | 150x200 |
| `cristal_musical.png` | Cristal Musical | Cristal colgante luminoso | 80x120 |
| `velo_etereo.png` | Velo Etéreo | Velo semi-transparente | 200x300 |
| `ninguno.png` | Sin Accesorio | Imagen vacía/transparente | 1x1 |

---

### 3. EXÓPODOS (Hormigas Humanoides)

#### 3.1 Cuerpos Base (3 castas)
| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `exopodo_obrero.png` | Casta Obrera | Pequeño, 4 brazos, humilde | 512x768 |
| `exopodo_soldado.png` | Casta Soldado | Grande, mandíbulas prominentes | 512x768 |
| `exopodo_noble.png` | Casta Noble | Elegante, 6 brazos, colores brillantes | 512x768 |

**Especificaciones de diseño:**
- Exoesqueleto visible (textura de quitina)
- Color base marrón/ámbar (#8B4513)
- Segmentación clara del cuerpo (cabeza, tórax, abdomen)
- 4-6 extremidades según casta
- Postura erguida pero ligeramente encorvada

#### 3.2 Cabezas Exópodo (3 variantes)
| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `exopodo_cabeza_standard.png` | Cabeza Estándar | Ojos compuestos, mandíbulas pequeñas | 200x220 |
| `exopodo_cabeza_soldado.png` | Cabeza Soldado | Mandíbulas grandes, ojos más pequeños | 200x220 |
| `exopodo_cabeza_reina.png` | Cabeza Noble/Reina | Más grande, ornamentada | 250x280 |

**Especificaciones:**
- Ojos compuestos (facetados) claramente visibles
- Mandíbulas articuladas
- Sin expresión humana (insectoide)

#### 3.3 Antenas (3 variantes)
| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `antenas_cortas.png` | Antenas Cortas | Par de antenas cortas | 100x80 |
| `antenas_largas.png` | Antenas Largas | Par de antenas largas, curvadas | 100x120 |
| `antenas_dañadas.png` | Antenas Dañadas | Una antena rota/dañada | 100x80 |

#### 3.4 Marca de Colmena (3 variantes)
| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `marca_colmena_activa.png` | Colmena Activa | Marca brillante, código visible | 80x80 |
| `marca_colmena_extinta.png` | Colmena Extinta | Marca apagada, código 000000 | 80x80 |
| `marca_colmena_noble.png` | Colmena Noble | Marca dorada, elaborada | 80x80 |

**Especificaciones CRÍTICAS:**
- Debe verse en el tórax del Exópodo
- Visible bajo luz normal pero más claro bajo UV
- Código de 6 dígitos legible

#### 3.5 Accesorios Exópodo (4 opcionales)
| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `herramienta_obrero.png` | Herramienta | Herramienta de trabajo en manos | 150x200 |
| `armadura_soldado.png` | Armadura | Placas de armadura en tórax | 400x500 |
| `insignia_noble.png` | Insignia | Insignia de rango en pecho | 60x60 |
| `ninguno.png` | Sin Accesorio | Imagen vacía | 1x1 |

---

### 4. REPTILIANOS (Guerreros de Sangre Fría)

#### 4.1 Cuerpos Base (3 variantes)
| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `reptiliano_masivo.png` | Cuerpo Masivo | Muy grande, musculoso, imponente | 512x768 |
| `reptiliano_atletico.png` | Cuerpo Atlético | Grande pero ágil | 512x768 |
| `reptiliano_anciano.png` | Cuerpo Anciano | Grande, escamas desgastadas | 512x768 |

**Especificaciones de diseño:**
- ALTURA MÍNIMA: Deben verse significativamente más altos que humanos
- PESO VISUAL: Deben verse pesados, musculosos (mínimo 120kg lore)
- Escamas visibles en toda la piel
- Color base verde oscuro/marrón (#2F4F4F)
- Cola visible (0.5-1m)
- Garras en manos/pies

#### 4.2 Escamas (3 tipos)
| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `escamas_metalicas.png` | Escamas Metálicas | Brillo metálico, reflejos | Overlay 512x768 |
| `escamas_volcanicas.png` | Escamas Volcánicas | Tonos rojizos, aspecto fundido | Overlay 512x768 |
| `escamas_acuaticas.png` | Escamas Acuáticas | Tonos azul-verde, lisas | Overlay 512x768 |

**Especificaciones CRÍTICAS:**
- Las escamas METÁLICAS deben tener brillo metálico
- Esto es DETECTABLE por el magnetómetro en el juego

#### 4.3 Crestas de Cabeza (4 variantes)
| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `cresta_guerrero.png` | Cresta Guerrero | Cresta grande, agresiva | 150x100 |
| `cresta_noble.png` | Cresta Noble | Cresta elaborada, decorada | 150x100 |
| `cresta_obrero.png` | Cresta Obrero | Cresta pequeña o ausente | 150x100 |
| `sin_cresta.png` | Sin Cresta | Cabeza lisa | 150x100 |

#### 4.4 Cicatrices/Marcas (4 opcionales)
| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `cicatriz_combate.png` | Cicatriz de Combate | Marcas de garras/espadas | Overlay variable |
| `cicatriz_ritual.png` | Marcas Rituales | Patrones tribales | Overlay variable |
| `quemaduras.png` | Quemaduras | Escamas dañadas por fuego | Overlay variable |
| `ninguno.png` | Sin Marcas | Imagen vacía | 1x1 |

#### 4.5 Vestimenta Reptiliana (4 tipos)
| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `armadura_guerrero.png` | Armadura Guerrera | Armadura de combate pesada | 512x768 |
| `vestimenta_civil.png` | Vestimenta Civil | Ropa casual reptiliana | 512x768 |
| `uniforme_guardia.png` | Uniforme Guardia | Uniforme militar/policial | 512x768 |
| `ninguno.png` | Sin Ropa | Solo cuerpo base | 1x1 |

---

### 5. INMIGRANTES DIMENSIONALES (Los Impredecibles)

#### 5.1 Cuerpos Base (6 morfologías)
| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `inmigrante_humanoide.png` | Forma Humanoide | Similar a humano pero "off" | 512x768 |
| `inmigrante_amorfo.png` | Forma Amorfa | Masa sin forma definida | 512x768 |
| `inmigrante_etereo.png` | Forma Etérea | Semi-transparente, gaseoso | 512x768 |
| `inmigrante_mecanico.png` | Forma Mecánica | Robótico/cibernético | 512x768 |
| `inmigrante_cristalino.png` | Forma Cristalina | Hecho de cristales | 512x768 |
| `inmigrante_tentacular.png` | Forma Tentacular | Múltiples tentáculos | 512x768 |

**Especificaciones de diseño:**
- VARIEDAD EXTREMA: Cada tipo debe ser muy diferente
- Colores variados (se modificarán por código)
- Aspecto "alienígena" pero no aterrador
- Algunos pueden tener "ruido visual" o distorsión

#### 5.2 Características Especiales (7 opcionales)
| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `ojos_multiples.png` | Ojos Múltiples | 3-8 ojos en diferentes posiciones | 200x200 |
| `sin_ojos.png` | Sin Ojos | Cara lisa sin ojos visibles | 200x200 |
| `tentaculos.png` | Tentáculos Extra | Tentáculos adicionales | 300x400 |
| `alas.png` | Alas | Alas de varios tipos | 400x300 |
| `cristales.png` | Cristales Externos | Cristales emergiendo del cuerpo | 200x300 |
| `vapores.png` | Emanación de Vapores | Humo/vapor saliendo del cuerpo | 400x500 |
| `ninguno.png` | Normal | Sin característica especial | 1x1 |

#### 5.3 Auras/Efectos (5 tipos)
| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `aura_energia.png` | Aura de Energía | Resplandor energético | 600x900 |
| `aura_oscura.png` | Aura Oscura | Sombras que emanan | 600x900 |
| `aura_brillante.png` | Aura Brillante | Luz intensa | 600x900 |
| `distorsion.png` | Distorsión Visual | Efecto de glitch/distorsión | 600x900 |
| `ninguno.png` | Sin Aura | Normal | 1x1 |

#### 5.4 Accesorios Inmigrantes (4 tipos)
| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `traductor_universal.png` | Traductor Universal | Dispositivo de traducción visible | 80x80 |
| `contenedor_atmosfera.png` | Contenedor Atmosférico | Casco/máscara para respirar | 200x250 |
| `dispositivo_desconocido.png` | Dispositivo Desconocido | Tecnología alienígena | 100x100 |
| `ninguno.png` | Sin Accesorio | Normal | 1x1 |

---

## 🖼️ ELEMENTOS DE UI

### 6. Marco de Ventanilla

| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `ventanilla_marco.png` | Marco de Ventanilla | Marco metálico de la ventanilla | 400x600 |
| `ventanilla_cristal.png` | Cristal de Ventanilla | Overlay de cristal (semi-transparente) | 400x600 |
| `ventanilla_luz_roja.png` | Luz Indicadora Roja | Luz de "ocupado" | 30x30 |
| `ventanilla_luz_verde.png` | Luz Indicadora Verde | Luz de "disponible" | 30x30 |

### 7. Documentos

| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `documento_pasaporte_fondo.png` | Fondo Pasaporte | Plantilla de pasaporte vacía | 300x400 |
| `documento_visa_fondo.png` | Fondo Visa | Plantilla de visa vacía | 250x150 |
| `documento_salud_fondo.png` | Fondo Certificado Salud | Plantilla certificado | 300x400 |
| `sello_ithor.png` | Sello Ithor | Sello oficial de Ithor | 80x80 |
| `sello_qdt.png` | Sello QDT | Sello de QDT Corporation | 80x80 |
| `sello_invalido.png` | Sello Inválido | Sello falso/caducado | 80x80 |

### 8. Iconos de Herramientas

| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `icon_escaner_masa.png` | Escáner de Masa | Báscula digital | 64x64 |
| `icon_termografo.png` | Termógrafo | Termómetro infrarrojo | 64x64 |
| `icon_luz_uv.png` | Luz UV | Linterna UV | 64x64 |
| `icon_magnetometro.png` | Magnetómetro | Detector de metales | 64x64 |
| `icon_visor_dimensional.png` | Visor Dimensional | Gafas con efecto dimensional | 64x64 |
| `icon_detector_intencion.png` | Detector Intención | Cerebro con ondas | 64x64 |
| `icon_resonador_ulnar.png` | Resonador Ulnar | Dispositivo de ondas | 64x64 |
| `icon_lupa.png` | Lupa | Lupa clásica | 64x64 |
| `icon_verificador_sellos.png` | Verificador Sellos | Sello con checkmark | 64x64 |
| `icon_base_datos.png` | Base de Datos | Carpeta con foto | 64x64 |

### 9. Iconos de Estado/Alertas

| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `icon_aprobado.png` | Aprobado | Checkmark verde | 48x48 |
| `icon_denegado.png` | Denegado | X roja | 48x48 |
| `icon_detenido.png` | Detenido | Esposas | 48x48 |
| `icon_cuarentena.png` | Cuarentena | Cruz médica | 48x48 |
| `icon_omega.png` | Sector Omega | Símbolo de peligro | 48x48 |
| `icon_alerta.png` | Alerta | Triángulo de advertencia | 48x48 |
| `icon_fugitivo.png` | Fugitivo | Silueta con "WANTED" | 48x48 |

---

## 🎨 EFECTOS ESPECIALES

### 10. Overlays y Efectos

| ID | Nombre | Descripción | Dimensiones |
|----|--------|-------------|-------------|
| `effect_scan_line.png` | Línea de Escaneo | Línea horizontal de escaneo | 512x10 |
| `effect_uv_glow.png` | Brillo UV | Overlay de luz ultravioleta | 512x768 |
| `effect_thermal.png` | Vista Térmica | Overlay de colores térmicos | 512x768 |
| `effect_dimensional_static.png` | Estática Dimensional | Ruido visual tipo VHS | 512x768 |
| `effect_nervous_sweat.png` | Gotas de Sudor | Gotas de sudor animables | 100x100 |

---

## 📊 RESUMEN DE ASSETS

### Conteo Total por Categoría

| Categoría | Cantidad |
|-----------|----------|
| **Humanos** | 15 assets |
| **Vulnari** | 16 assets |
| **Exópodos** | 17 assets |
| **Reptilianos** | 16 assets |
| **Inmigrantes** | 19 assets |
| **UI - Ventanilla** | 4 assets |
| **UI - Documentos** | 6 assets |
| **UI - Iconos Herramientas** | 10 assets |
| **UI - Iconos Estado** | 7 assets |
| **Efectos Especiales** | 5 assets |
| **TOTAL** | **~115 assets** |

### Con Variaciones por Código
Con las modificaciones de color y escala por código, estos 115 assets base pueden generar:
- **500+ variaciones de personajes únicos**
- **Documentos dinámicos ilimitados**
- **Combinaciones visuales casi infinitas**

---

## 🎯 PRIORIDAD DE CREACIÓN

### FASE 1: Mínimo Viable (40 assets)
1. Siluetas base de cada especie (5)
2. Cuerpos base de cada especie (1 por raza = 5)
3. Caras/cabezas básicas (5)
4. Iconos de herramientas (10)
5. Iconos de estado (7)
6. Documentos básicos (3)
7. Marco de ventanilla (2)
8. Efectos básicos (3)

### FASE 2: Versión Completa (75 assets adicionales)
1. Variantes de cuerpos adicionales
2. Todas las ropas/vestimentas
3. Accesorios
4. Todas las capas específicas de especie (Ulnar, Escamas, etc.)
5. Efectos especiales completos

---

## 💡 NOTAS PARA GENERACIÓN CON IA

### Prompts Sugeridos por Especie

**Humanos:**
```
portrait of a human bureaucrat, frontal view, neutral expression,
office worker style, solid dark background, comic book art style,
thick outlines, muted colors, slightly worried expression,
papers please game aesthetic
```

**Vulnari:**
```
portrait of ethereal alien being with purple skin, tentacle appendages
emerging from head (exactly 6 tentacles), melancholic expression,
luminous eyes without pupils, elegant flowing robes, comic book style,
thick outlines, dark cosmic background
```

**Exópodos:**
```
portrait of humanoid ant alien, compound eyes, mandibles,
exoskeleton texture, 4 arms, worker caste, industrial clothing,
frontal view, comic book art style, thick outlines,
insectoid but not scary, professional demeanor
```

**Reptilianos:**
```
portrait of massive reptilian alien warrior, metallic scales,
vertical slit pupils, intimidating but calm, military posture,
cold-blooded appearance, thick neck, comic book art style,
frontal view, dark background
```

**Inmigrantes:**
```
portrait of strange interdimensional being, [morphology type],
unusual colors, slight visual distortion, otherworldly appearance,
could be friendly or dangerous, frontal view, comic book style
```

### Notas Importantes para IA
1. Pedir siempre "solid background" para facilitar recorte
2. Especificar "frontal view" o "slight 3/4 angle"
3. Mencionar "thick outlines" para estilo comic
4. Usar "papers please aesthetic" como referencia
5. Evitar fondos complejos
6. Mantener iluminación consistente entre generaciones

---

## 📁 ESTRUCTURA DE CARPETAS

```
frontend/nuvaris-temp/src/assets/portal-control/
├── sprites/
│   ├── humano/
│   │   ├── humano_cuerpo_1.png
│   │   ├── humano_cuerpo_2.png
│   │   ├── humano_cara_neutral.png
│   │   └── ...
│   ├── vulnari/
│   │   ├── vulnari_cuerpo_esbelto.png
│   │   ├── ulnar_4.png
│   │   ├── ulnar_6.png
│   │   └── ...
│   ├── exopodo/
│   ├── reptiliano/
│   ├── inmigrante/
│   └── common/
│       └── silhouette_*.png
├── ui/
│   ├── ventanilla/
│   ├── documentos/
│   └── iconos/
├── effects/
└── audio/
    └── (sonidos ambientales, beeps, etc.)
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

Para cada asset, verificar:
- [ ] Fondo transparente (PNG)
- [ ] Dimensiones correctas
- [ ] Colores que permitan hue-shift
- [ ] Contornos definidos
- [ ] Consistencia de estilo con otros assets
- [ ] Nombre de archivo correcto
- [ ] Ubicación en carpeta correcta

---

*Documento generado para el proyecto Portal Control - Nuvaris*
*Última actualización: 2026-01-25*
