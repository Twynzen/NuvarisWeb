# INSTRUCTIVO DE INVESTIGACION: Sistema de Iluminacion y Fog Avanzado en Three.js

## CONTEXTO DEL PROYECTO

Estamos desarrollando un juego roguelite 2.5D con Three.js donde necesitamos:
- **Fog que oscurezca TODO excepto el area del jugador**
- **Luz focalizada que "corte" la niebla** alrededor del jugador
- **Control dinamico** de parametros de iluminacion en tiempo real
- **Diferentes presets** de iluminacion por bioma/habitacion

### Estado Actual
- Usamos `THREE.Fog(color, near, far)` - fog lineal basado en distancia a camara
- Tenemos `THREE.PointLight` siguiendo al jugador (playerLight)
- El fog es GLOBAL - no podemos hacer que la luz "corte" el fog
- Camara ortografica top-down (isometrica)

### Problema Principal
Three.js Fog estandar calcula la niebla basandose en la **distancia a la camara**, no en la **distancia a una fuente de luz**. Necesitamos que el area iluminada por el jugador este libre de fog.

---

## PREGUNTAS DE INVESTIGACION

### SECCION 1: Fog Personalizado con Shaders

**Pregunta 1.1**: Como crear un shader personalizado de fog en Three.js que calcule la densidad de niebla basandose en la distancia a un punto especifico (posicion del jugador) en lugar de la distancia a la camara?

Necesito:
- Codigo de vertex shader y fragment shader
- Como pasar la posicion del jugador como uniform
- Como integrar con ShaderMaterial o modificar MeshStandardMaterial
- Ejemplo funcional completo

**Pregunta 1.2**: Como usar `THREE.ShaderMaterial` o `onBeforeCompile` para modificar el comportamiento del fog en materiales existentes sin reescribir todo el shader?

Necesito:
- Ejemplo de onBeforeCompile para inyectar codigo de fog personalizado
- Como acceder y modificar los chunks de fog en Three.js
- Referencia a los shader chunks: `fog_vertex`, `fog_fragment`, `fog_pars_vertex`, `fog_pars_fragment`

**Pregunta 1.3**: Es posible tener multiples "fuentes de claridad" que reduzcan el fog? (ej: jugador + antorchas en la pared)

---

### SECCION 2: Post-Processing para Fog

**Pregunta 2.1**: Como implementar fog como efecto de post-procesamiento usando `EffectComposer` de Three.js?

Necesito:
- Configuracion basica de EffectComposer
- Como crear un ShaderPass personalizado para fog
- Como acceder al depth buffer para calcular distancias
- Ejemplo de fog radial centrado en un punto de la escena

**Pregunta 2.2**: Existe algun pass de post-processing existente (como en pmndrs/postprocessing) que permita fog basado en posicion de objeto?

---

### SECCION 3: Volumetric Lighting / God Rays

**Pregunta 3.1**: Como implementar volumetric light scattering (god rays) en Three.js que emane desde la posicion del jugador?

Necesito:
- Tecnica de volumetric light scattering
- Ejemplo con EffectComposer
- Performance considerations para juegos en tiempo real

**Pregunta 3.2**: Como usar `THREE.SpotLight` con volumetric cone visible?

---

### SECCION 4: Tecnicas Alternativas

**Pregunta 4.1**: Como usar un segundo render pass con una mascara circular para crear un efecto de "vision limitada" donde solo el area del jugador es visible?

**Pregunta 4.2**: Como implementar un efecto de vignette dinamico centrado en el jugador usando shaders?

**Pregunta 4.3**: Es posible usar `THREE.Layers` combinado con fog para que ciertos objetos ignoren el fog?

---

### SECCION 5: Configuracion de Luces

**Pregunta 5.1**: Cual es la diferencia practica entre `THREE.PointLight`, `THREE.SpotLight`, y `THREE.RectAreaLight` para iluminar un area alrededor del jugador en un juego top-down?

Necesito:
- Comparacion de performance
- Configuracion optima de cada tipo
- Cual es mejor para "cortar" visualmente la oscuridad

**Pregunta 5.2**: Como configurar sombras (shadow mapping) para crear contraste dramatico entre areas iluminadas y oscuras?

**Pregunta 5.3**: Como usar `THREE.HemisphereLight` o `THREE.AmbientLight` en combinacion con luces focalizadas para crear atmosfera?

---

### SECCION 6: Integracion y Control en Tiempo Real

**Pregunta 6.1**: Como crear un panel de debug con dat.GUI o lil-gui para controlar parametros de iluminacion y fog en tiempo real en Three.js?

Necesito:
- Ejemplo de integracion con Three.js
- Como bindear valores de luces, fog, materiales
- Presets guardables

**Pregunta 6.2**: Como interpolar suavemente entre diferentes configuraciones de iluminacion (para transiciones entre habitaciones)?

---

## EJEMPLOS DE CODIGO QUE NECESITO

### Ejemplo 1: Fog Shader Basico
```glsl
// Fragment shader que calcula fog basado en distancia a playerPosition
uniform vec3 playerPosition;
uniform float fogNear;
uniform float fogFar;
uniform vec3 fogColor;

void main() {
    float dist = distance(worldPosition, playerPosition);
    float fogFactor = smoothstep(fogNear, fogFar, dist);
    gl_FragColor = mix(baseColor, fogColor, fogFactor);
}
```
Necesito la version completa y funcional de esto.

### Ejemplo 2: Modificar Material Existente
```javascript
material.onBeforeCompile = (shader) => {
    shader.uniforms.playerPos = { value: new THREE.Vector3() };
    // Como inyectar fog personalizado aqui?
};
```
Necesito el codigo completo.

### Ejemplo 3: Post-Processing Fog
```javascript
const fogPass = new ShaderPass({
    uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        playerPosition: { value: new THREE.Vector3() },
        // ...
    },
    vertexShader: '...',
    fragmentShader: '...'
});
composer.addPass(fogPass);
```
Necesito la implementacion completa.

---

## RECURSOS OFICIALES A CONSULTAR

1. **Three.js Documentation**:
   - https://threejs.org/docs/#api/en/materials/ShaderMaterial
   - https://threejs.org/docs/#api/en/scenes/Fog
   - https://threejs.org/docs/#api/en/renderers/shaders/ShaderChunk
   - https://threejs.org/docs/#examples/en/postprocessing/EffectComposer

2. **Three.js Examples**:
   - https://threejs.org/examples/?q=fog
   - https://threejs.org/examples/?q=postprocessing
   - https://threejs.org/examples/?q=shader

3. **Shader Chunks de Three.js** (GitHub):
   - https://github.com/mrdoob/three.js/tree/dev/src/renderers/shaders/ShaderChunk

4. **pmndrs/postprocessing** (libreria avanzada):
   - https://github.com/pmndrs/postprocessing

---

## CRITERIOS DE EVALUACION DE SOLUCIONES

La solucion ideal debe cumplir:

| Criterio | Importancia | Descripcion |
|----------|-------------|-------------|
| Performance | ALTA | Debe correr a 60fps con ~100 enemigos |
| Flexibilidad | ALTA | Facil de ajustar near/far/color en runtime |
| Calidad Visual | MEDIA | Transiciones suaves, no artefactos |
| Simplicidad | MEDIA | Codigo mantenible, no hack |
| Compatibilidad | ALTA | Funcionar con MeshStandardMaterial existente |

---

## RESULTADO ESPERADO DE LA INVESTIGACION

Necesito que el documento de investigacion me proporcione:

1. **Solucion recomendada** con justificacion tecnica
2. **Codigo funcional** copy-paste ready
3. **Configuracion de parametros** optimos para nuestro caso (top-down, ortografico)
4. **Alternativas** en caso de problemas de performance
5. **Ejemplos visuales** o referencias a demos funcionales

---

## PALABRAS CLAVE PARA BUSQUEDA

```
three.js custom fog shader player position
three.js fog based on object distance not camera
three.js postprocessing depth fog
three.js volumetric lighting god rays
three.js shader material onBeforeCompile fog
three.js radial fog from point
three.js fog mask circle around player
three.js vision range shader roguelike
three.js darkness fog of war shader
webgl custom fog fragment shader distance
```

---

## NOTAS ADICIONALES

- Usamos Three.js r150+
- Camara: `THREE.OrthographicCamera` (top-down)
- Renderer: `THREE.WebGLRenderer` con `antialias: true`
- Ya tenemos: `scene.fog = new THREE.Fog(color, near, far)`
- Ya tenemos: `playerLight = new THREE.PointLight()` siguiendo al jugador
- Materiales actuales: `MeshStandardMaterial` para pisos y paredes

---

*Este instructivo fue creado para guiar una investigacion profunda sobre iluminacion y fog en Three.js*
