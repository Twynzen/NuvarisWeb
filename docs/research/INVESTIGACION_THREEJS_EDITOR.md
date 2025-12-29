# INVESTIGACION THREE.JS - EDITOR DE MAPAS
## Instructivo de Documentacion Tecnica

> **Proyecto:** NuvarisWeb - Map Editor
> **Objetivo:** Recopilar documentacion, ejemplos y patrones para implementar un editor de mapas 3D
> **Fecha:** 2025-11-28

---

## ESTRUCTURA DE INVESTIGACION

Para cada tema, necesitamos:
1. **Documentacion oficial** (enlace y resumen)
2. **Ejemplo de codigo funcional**
3. **Parametros y opciones disponibles**
4. **Integracion con Angular** (si aplica)
5. **Casos de uso especificos para nuestro editor**

---

## 1. TRANSFORM CONTROLS

### Que es?
Sistema de Three.js para manipular objetos en la escena (mover, rotar, escalar) mediante gizmos visuales interactivos.

### Donde buscar?
```
URL Oficial: https://threejs.org/docs/#examples/en/controls/TransformControls
Ejemplos: https://threejs.org/examples/#misc_controls_transform
GitHub: https://github.com/mrdoob/three.js/blob/dev/examples/jsm/controls/TransformControls.js
```

### Que necesitamos documentar?

#### 1.1 Inicializacion Basica
```typescript
// Ejemplo que necesitamos adaptar a Angular
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';

// Como se instancia?
// Como se vincula a la camara y renderer?
// Como se agrega a la escena?
```

#### 1.2 Modos de Transformacion
```typescript
// Documentar cada modo:
controls.setMode('translate');  // Mover - que hace exactamente?
controls.setMode('rotate');     // Rotar - sobre que ejes?
controls.setMode('scale');      // Escalar - uniforme o por eje?

// Como cambiar entre modos con teclado? (tipicamente W, E, R)
```

#### 1.3 Eventos Importantes
```typescript
// Necesitamos saber que eventos dispara:
controls.addEventListener('change', () => {});        // Cuando se dispara?
controls.addEventListener('dragging-changed', () => {}); // Para que sirve?
controls.addEventListener('objectChange', () => {});  // Diferencia con change?

// Como desactivar OrbitControls mientras se usa TransformControls?
```

#### 1.4 Configuracion de Ejes
```typescript
// Como limitar a ciertos ejes?
controls.showX = true/false;
controls.showY = true/false;
controls.showZ = true/false;

// Como cambiar el espacio de transformacion?
controls.setSpace('world');  // vs 'local' - cual es la diferencia?
```

#### 1.5 Snap (Ajuste a Grid)
```typescript
// Como hacer que se mueva en incrementos?
controls.setTranslationSnap(5);  // Mover en pasos de 5 units
controls.setRotationSnap(Math.PI / 4);  // Rotar en pasos de 45 grados
controls.setScaleSnap(0.5);  // Escalar en pasos de 0.5

// Como habilitar/deshabilitar snap dinamicamente?
```

#### 1.6 Preguntas Especificas
- Como adjuntar TransformControls a un objeto seleccionado?
- Como detectar cuando el usuario termina de transformar?
- Como obtener la nueva posicion/rotacion/escala del objeto?
- Como resetear la transformacion?
- Funciona bien con sprites (nuestros personajes 2D)?

---

## 2. ORBIT CONTROLS

### Que es?
Controles de camara que permiten orbitar alrededor de un punto, hacer zoom y pan.

### Donde buscar?
```
URL Oficial: https://threejs.org/docs/#examples/en/controls/OrbitControls
Ejemplos: https://threejs.org/examples/#misc_controls_orbit
```

### Que necesitamos documentar?

#### 2.1 Inicializacion
```typescript
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Como instanciar con camara y elemento DOM?
// Parametros minimos requeridos?
```

#### 2.2 Limites de Movimiento
```typescript
// Para nuestro editor necesitamos limitar la camara al mapa
controls.minDistance = ?;    // Zoom minimo
controls.maxDistance = ?;    // Zoom maximo
controls.minPolarAngle = ?;  // Angulo vertical minimo (0 = arriba)
controls.maxPolarAngle = ?;  // Angulo vertical maximo (PI = abajo)

// Como limitar el pan a los bounds del mapa?
controls.minPan = new THREE.Vector3(-100, 0, -100);
controls.maxPan = new THREE.Vector3(100, 50, 100);
// Existe esto? O hay que implementarlo custom?
```

#### 2.3 Comportamiento
```typescript
controls.enableDamping = true;  // Suavizado - como funciona?
controls.dampingFactor = 0.05;  // Que valor es optimo?
controls.enablePan = true;      // Mover camara lateralmente
controls.enableZoom = true;     // Zoom con scroll
controls.enableRotate = true;   // Orbitar

// Como actualizar en el loop de render?
controls.update();  // Es obligatorio en cada frame?
```

#### 2.4 Target (Punto de Enfoque)
```typescript
controls.target.set(x, y, z);  // Hacia donde mira la camara
controls.update();

// Como animar el target para hacer "fly to" a un objeto?
```

#### 2.5 Integracion con TransformControls
```typescript
// IMPORTANTE: Como deshabilitar OrbitControls mientras se usa TransformControls?
transformControls.addEventListener('dragging-changed', (event) => {
    orbitControls.enabled = !event.value;
});
// Es este el patron correcto?
```

#### 2.6 Preguntas Especificas
- Como guardar/restaurar la posicion de la camara?
- Como hacer reset a una vista predeterminada (top-down, isometric)?
- Como implementar vistas predefinidas (Norte, Sur, Este, Oeste, Top)?
- Como limitar el pan para que no salga del mapa?

---

## 3. RAYCASTER

### Que es?
Sistema para detectar que objetos estan bajo el cursor del mouse en el espacio 3D.

### Donde buscar?
```
URL Oficial: https://threejs.org/docs/#api/en/core/Raycaster
Ejemplos: https://threejs.org/examples/#webgl_interactive_cubes
```

### Que necesitamos documentar?

#### 3.1 Configuracion Basica
```typescript
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Como convertir coordenadas de mouse a normalized device coordinates?
function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

// Esto funciona si el canvas no ocupa toda la ventana?
```

#### 3.2 Deteccion de Intersecciones
```typescript
raycaster.setFromCamera(mouse, camera);
const intersects = raycaster.intersectObjects(scene.children);

// Que contiene el array intersects?
// intersects[0].object - el objeto
// intersects[0].point - punto de interseccion
// intersects[0].distance - distancia desde la camara
// intersects[0].face - cara del mesh
// Hay mas propiedades?
```

#### 3.3 Filtrado de Objetos
```typescript
// Como filtrar solo ciertos objetos?
const selectableObjects = [wall1, wall2, portal1];
const intersects = raycaster.intersectObjects(selectableObjects, recursive);

// Que hace el parametro recursive?
// Como ignorar objetos hijos?
```

#### 3.4 Objetos por Capa
```typescript
// Como usar layers para filtrar?
raycaster.layers.set(1);  // Solo objetos en layer 1

// Como asignar layers a objetos?
mesh.layers.set(1);
mesh.layers.enable(2);
```

#### 3.5 Rendimiento
```typescript
// Mejores practicas para no hacer raycast cada frame
// Throttle o debounce?
// Usar requestAnimationFrame o eventos de mouse?
```

#### 3.6 Preguntas Especificas
- Como detectar click vs drag (para no seleccionar al mover camara)?
- Como hacer multi-seleccion (Shift+Click)?
- Como detectar interseccion con el suelo para placement?
- El Raycaster funciona bien con Sprites?
- Como obtener la posicion en el suelo donde se hizo click?

---

## 4. GLTF EXPORTER / IMPORTER

### Que es?
Sistema para exportar e importar escenas 3D en formato GLTF/GLB.

### Donde buscar?
```
GLTFExporter: https://threejs.org/docs/#examples/en/exporters/GLTFExporter
GLTFLoader: https://threejs.org/docs/#examples/en/loaders/GLTFLoader
Ejemplos: https://threejs.org/examples/#misc_exporter_gltf
```

### Que necesitamos documentar?

#### 4.1 Exportar Escena
```typescript
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';

const exporter = new GLTFExporter();
exporter.parse(scene, (gltf) => {
    // gltf es un objeto JSON o ArrayBuffer?
    // Como guardarlo como archivo?
}, options);

// Que opciones hay disponibles?
// binary: true/false - GLB vs GLTF
// Que se incluye y que no?
```

#### 4.2 Importar Escena
```typescript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const loader = new GLTFLoader();
loader.load('path/to/model.gltf', (gltf) => {
    scene.add(gltf.scene);
}, onProgress, onError);

// Como acceder a objetos individuales despues de cargar?
// Se preservan los nombres de los objetos?
```

#### 4.3 Alternativa: JSON Serialization
```typescript
// Para nuestro caso, puede ser mejor JSON custom
// Three.js tiene toJSON() y ObjectLoader

scene.toJSON();  // Que incluye?
const loader = new THREE.ObjectLoader();
loader.parse(json);  // Como funciona?
```

#### 4.4 Preguntas Especificas
- GLTF preserva los userData de los objetos?
- Como exportar solo ciertos objetos (no toda la escena)?
- Que pasa con los Sprites (personajes 2D)?
- Es mejor GLTF o un formato JSON custom para nuestro caso?
- Como manejar texturas y assets referenciados?

---

## 5. HELPERS Y GIZMOS ADICIONALES

### Que son?
Objetos visuales de ayuda para debugging y edicion.

### Donde buscar?
```
BoxHelper: https://threejs.org/docs/#api/en/helpers/BoxHelper
GridHelper: https://threejs.org/docs/#api/en/helpers/GridHelper
AxesHelper: https://threejs.org/docs/#api/en/helpers/AxesHelper
```

### Que necesitamos documentar?

#### 5.1 BoxHelper (Bounding Box)
```typescript
const box = new THREE.BoxHelper(object, color);
scene.add(box);

// Como actualizar cuando el objeto se mueve?
box.update();

// Se actualiza automaticamente o hay que llamar update()?
```

#### 5.2 GridHelper (Ya lo usamos)
```typescript
const grid = new THREE.GridHelper(size, divisions, color1, color2);

// Como hacer un grid que se ajuste al snap?
// Podemos hacer grid con lineas mas gruesas cada N celdas?
```

#### 5.3 AxesHelper
```typescript
const axes = new THREE.AxesHelper(size);
scene.add(axes);

// Colores: X = rojo, Y = verde, Z = azul
// Util para debugging de orientacion
```

#### 5.4 PlaneHelper
```typescript
const plane = new THREE.Plane(normal, constant);
const helper = new THREE.PlaneHelper(plane, size, color);

// Util para visualizar planos de corte o limites
```

---

## 6. INTEGRACION CON ANGULAR

### Que necesitamos saber?

#### 6.1 Lifecycle Hooks
```typescript
// En que hook inicializar Three.js?
ngAfterViewInit() {
    // Aqui o en ngOnInit?
}

// Como limpiar recursos?
ngOnDestroy() {
    // Dispose de geometrias, materiales, texturas
    // Remover event listeners
    // Cancelar animation frame
}
```

#### 6.2 Change Detection
```typescript
// Three.js corre fuera de Angular zone
this.ngZone.runOutsideAngular(() => {
    this.animate();
});

// Cuando necesitamos volver a entrar en la zone?
this.ngZone.run(() => {
    this.selectedObject = object;  // Para que Angular detecte cambio
});
```

#### 6.3 Servicios
```typescript
// Es mejor tener Three.js en un servicio o en el componente?
// Como compartir la escena entre componentes (Viewport, Inspector)?
```

#### 6.4 Comunicacion entre Componentes
```typescript
// Toolbar -> Viewport: "cambiar a modo translate"
// Viewport -> Inspector: "objeto seleccionado cambio"
// Hierarchy -> Viewport: "seleccionar este objeto"

// Usar Subject/BehaviorSubject?
// Usar un servicio compartido?
```

---

## 7. PATRONES DE EDITOR

### Que patrones usar?

#### 7.1 Command Pattern (Undo/Redo)
```typescript
interface Command {
    execute(): void;
    undo(): void;
}

class MoveCommand implements Command {
    constructor(
        private object: THREE.Object3D,
        private oldPosition: THREE.Vector3,
        private newPosition: THREE.Vector3
    ) {}

    execute() { this.object.position.copy(this.newPosition); }
    undo() { this.object.position.copy(this.oldPosition); }
}

// Como implementar la pila de undo/redo?
```

#### 7.2 Selection Manager
```typescript
class SelectionManager {
    private selected: THREE.Object3D[] = [];

    select(object: THREE.Object3D): void;
    deselect(object: THREE.Object3D): void;
    clear(): void;
    getSelected(): THREE.Object3D[];
}

// Como visualizar la seleccion (outline, bounding box)?
```

#### 7.3 Object Factory
```typescript
// Para crear objetos desde el editor
class MapObjectFactory {
    createWall(config: WallConfig): THREE.Mesh;
    createPortal(config: PortalConfig): THREE.Group;
    createBiome(config: BiomeConfig): THREE.Mesh;
}
```

---

## 8. EJEMPLOS DE REFERENCIA

### Editores existentes para estudiar:

#### 8.1 Three.js Editor Oficial
```
URL: https://threejs.org/editor/
GitHub: https://github.com/mrdoob/three.js/tree/dev/editor
```
- Como manejan la seleccion?
- Como implementan undo/redo?
- Como estructuran los paneles?

#### 8.2 A-Frame Inspector
```
GitHub: https://github.com/aframevr/aframe-inspector
```
- Enfocado en VR pero tiene buenas ideas

#### 8.3 PlayCanvas Editor
```
URL: https://playcanvas.com/
```
- Editor comercial, ver conceptos de UX

---

## 9. PREGUNTAS PARA RESOLVER

### Arquitectura
1. El editor debe ser un modulo Angular separado del juego?
2. Como compartir assets/tipos entre editor y juego?
3. El editor corre en el navegador o es una app Electron?

### UX/UI
4. Que atajos de teclado usar (basarse en Blender, Unity, o custom)?
5. Como manejar las vistas (single viewport vs split)?
6. Como implementar el drag & drop desde palette a escena?

### Datos
7. Donde guardar los mapas (localStorage, servidor, archivos)?
8. Como versionar los mapas (compatibilidad hacia atras)?
9. Como manejar assets grandes (texturas, modelos)?

### Performance
10. Cuantos objetos puede manejar el editor sin lag?
11. Necesitamos Level of Detail (LOD) para mapas grandes?
12. Como optimizar el rendering mientras se edita?

---

## 10. FORMATO DE RESPUESTA ESPERADO

Para cada tema investigado, proporcionar:

```markdown
## [NOMBRE DEL TEMA]

### Documentacion
- URL: [enlace]
- Version de Three.js: [version]

### Codigo de Ejemplo Funcional
\`\`\`typescript
// Codigo que funciona y esta probado
\`\`\`

### Parametros Importantes
| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| ... | ... | ... | ... |

### Eventos
| Evento | Payload | Cuando se dispara |
|--------|---------|-------------------|
| ... | ... | ... |

### Gotchas / Problemas Comunes
- Problema 1: ...
- Solucion: ...

### Integracion con Nuestro Proyecto
\`\`\`typescript
// Como se veria en nuestro codigo Angular
\`\`\`

### Recursos Adicionales
- [Enlace a tutorial]
- [Enlace a ejemplo similar]
```

---

## 11. ORDEN DE PRIORIDAD

Investigar en este orden:

1. **ALTA**: Raycaster (seleccion de objetos)
2. **ALTA**: TransformControls (manipulacion)
3. **ALTA**: OrbitControls (navegacion de camara)
4. **MEDIA**: BoxHelper/GridHelper (feedback visual)
5. **MEDIA**: Serialization (JSON custom)
6. **BAJA**: GLTFExporter (exportacion avanzada)

---

## 12. RECURSOS DE DOCUMENTACION

### Oficiales
- Three.js Docs: https://threejs.org/docs/
- Three.js Examples: https://threejs.org/examples/
- Three.js GitHub: https://github.com/mrdoob/three.js

### Tutoriales
- Three.js Fundamentals: https://threejsfundamentals.org/
- Discover Three.js: https://discoverthreejs.com/
- Three.js Journey: https://threejs-journey.com/

### Comunidad
- Three.js Discourse: https://discourse.threejs.org/
- Stack Overflow tag: [three.js]
- Reddit: r/threejs

---

> **NOTA PARA EL INVESTIGADOR**:
> Cuando encuentres informacion relevante, anotala siguiendo el formato de la seccion 10.
> Prioriza codigo funcional sobre teoria.
> Si algo no esta documentado oficialmente, buscar en los issues de GitHub.
> Marcar claramente que version de Three.js aplica (nosotros usamos 0.181.2).

---

## CHECKLIST DE INVESTIGACION

- [ ] TransformControls - inicializacion y modos
- [ ] TransformControls - eventos
- [ ] TransformControls - snap to grid
- [ ] OrbitControls - limites de camara
- [ ] OrbitControls - integracion con TransformControls
- [ ] Raycaster - seleccion basica
- [ ] Raycaster - filtrado por layers
- [ ] Raycaster - click en suelo para placement
- [ ] Helpers - BoxHelper para seleccion
- [ ] Serialization - scene.toJSON() y ObjectLoader
- [ ] Angular - integracion optima
- [ ] Patrones - Command para undo/redo

