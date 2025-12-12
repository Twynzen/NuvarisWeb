# Sistema de Animación Skeletal 2D Custom para Three.js
## Alternativa Gratuita a Spine

> **Objetivo**: Crear un sistema propio de animación skeletal 2D que se integre con Three.js, soportando mesh deformation, IK, y física reactiva - sin costos de licencia.

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    SKELETAL 2D SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │  Skeleton     │  │  Animation    │  │  Mesh         │   │
│  │  (Bones+      │──│  Player       │──│  Deformer     │   │
│  │   Joints)     │  │  (Keyframes)  │  │  (Skinning)   │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
│          │                  │                  │            │
│          ▼                  ▼                  ▼            │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              THREE.js Mesh (PlaneGeometry)            │ │
│  │              con vertices deformados                  │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Fase 1: Estructura de Datos del Skeleton

### 1.1 Formato JSON del Skeleton

```typescript
// types/skeleton.types.ts

export interface Bone {
  id: string;
  name: string;
  parentId: string | null;  // null = root
  length: number;           // Longitud del hueso
  rotation: number;         // Ángulo en radianes (pose inicial)
  localPosition: { x: number; y: number };  // Offset del parent
}

export interface Slot {
  id: string;
  boneId: string;           // Hueso al que está attachado
  attachment: string;       // Nombre de la textura/región
  zIndex: number;           // Orden de renderizado
}

export interface SkeletonData {
  name: string;
  bones: Bone[];
  slots: Slot[];
  skins: { [skinName: string]: SkinAttachments };
  animations: { [animName: string]: AnimationData };
}

export interface SkinAttachments {
  [slotId: string]: {
    type: 'region' | 'mesh';
    // Para region (sprite simple)
    region?: {
      path: string;         // Ruta a textura
      width: number;
      height: number;
      offset: { x: number; y: number };
      rotation: number;
    };
    // Para mesh (deformable)
    mesh?: {
      path: string;
      vertices: number[];   // [x1,y1, x2,y2, ...]
      uvs: number[];        // UV coordinates
      triangles: number[];  // Indices de triángulos
      weights?: number[];   // Weights para skinning (opcional)
    };
  };
}
```

### 1.2 Ejemplo de Skeleton JSON

```json
{
  "name": "character",
  "bones": [
    { "id": "root", "name": "root", "parentId": null, "length": 0, "rotation": 0, "localPosition": { "x": 0, "y": 0 } },
    { "id": "torso", "name": "torso", "parentId": "root", "length": 2, "rotation": 0, "localPosition": { "x": 0, "y": 0 } },
    { "id": "head", "name": "head", "parentId": "torso", "length": 1, "rotation": 0, "localPosition": { "x": 0, "y": 2 } },
    { "id": "arm_l", "name": "arm_l", "parentId": "torso", "length": 1.5, "rotation": -1.57, "localPosition": { "x": -0.5, "y": 1.5 } },
    { "id": "arm_r", "name": "arm_r", "parentId": "torso", "length": 1.5, "rotation": 1.57, "localPosition": { "x": 0.5, "y": 1.5 } },
    { "id": "leg_l", "name": "leg_l", "parentId": "root", "length": 2, "rotation": 3.14, "localPosition": { "x": -0.3, "y": 0 } },
    { "id": "leg_r", "name": "leg_r", "parentId": "root", "length": 2, "rotation": 3.14, "localPosition": { "x": 0.3, "y": 0 } }
  ],
  "slots": [
    { "id": "slot_torso", "boneId": "torso", "attachment": "torso", "zIndex": 0 },
    { "id": "slot_head", "boneId": "head", "attachment": "head", "zIndex": 1 },
    { "id": "slot_arm_l", "boneId": "arm_l", "attachment": "arm", "zIndex": -1 },
    { "id": "slot_arm_r", "boneId": "arm_r", "attachment": "arm", "zIndex": -1 },
    { "id": "slot_leg_l", "boneId": "leg_l", "attachment": "leg", "zIndex": -2 },
    { "id": "slot_leg_r", "boneId": "leg_r", "attachment": "leg", "zIndex": -2 }
  ]
}
```

---

## Fase 2: Clase Skeleton Runtime

```typescript
// engine/skeletal/Skeleton.ts

import * as THREE from 'three';

export class Bone2D {
  id: string;
  name: string;
  parent: Bone2D | null = null;
  children: Bone2D[] = [];
  
  // Pose local (relativa al parent)
  localPosition = new THREE.Vector2(0, 0);
  localRotation = 0;
  localScale = new THREE.Vector2(1, 1);
  
  // Transform calculado (world space)
  worldPosition = new THREE.Vector2(0, 0);
  worldRotation = 0;
  worldMatrix = new THREE.Matrix3();
  
  length: number;
  
  constructor(data: { id: string; name: string; length: number }) {
    this.id = data.id;
    this.name = data.name;
    this.length = data.length;
  }
  
  // Actualizar transformación world desde parent
  updateWorldTransform(): void {
    if (this.parent) {
      this.worldRotation = this.parent.worldRotation + this.localRotation;
      
      // Rotar posición local por rotación del parent
      const cos = Math.cos(this.parent.worldRotation);
      const sin = Math.sin(this.parent.worldRotation);
      const lx = this.localPosition.x;
      const ly = this.localPosition.y;
      
      this.worldPosition.x = this.parent.worldPosition.x + (lx * cos - ly * sin);
      this.worldPosition.y = this.parent.worldPosition.y + (lx * sin + ly * cos);
    } else {
      // Root bone
      this.worldPosition.copy(this.localPosition);
      this.worldRotation = this.localRotation;
    }
    
    // Actualizar matrix
    this.worldMatrix.identity();
    this.worldMatrix.translate(this.worldPosition.x, this.worldPosition.y);
    this.worldMatrix.rotate(this.worldRotation);
    this.worldMatrix.scale(this.localScale.x, this.localScale.y);
    
    // Recursivamente actualizar hijos
    for (const child of this.children) {
      child.updateWorldTransform();
    }
  }
  
  // Obtener posición del extremo del hueso (tip)
  getTipPosition(): THREE.Vector2 {
    const cos = Math.cos(this.worldRotation);
    const sin = Math.sin(this.worldRotation);
    return new THREE.Vector2(
      this.worldPosition.x + cos * this.length,
      this.worldPosition.y + sin * this.length
    );
  }
}

export class Skeleton2D {
  bones: Map<string, Bone2D> = new Map();
  rootBone: Bone2D | null = null;
  
  constructor(data: SkeletonData) {
    this.buildFromData(data);
  }
  
  private buildFromData(data: SkeletonData): void {
    // Crear todos los huesos
    for (const boneData of data.bones) {
      const bone = new Bone2D({
        id: boneData.id,
        name: boneData.name,
        length: boneData.length
      });
      bone.localRotation = boneData.rotation;
      bone.localPosition.set(boneData.localPosition.x, boneData.localPosition.y);
      this.bones.set(bone.id, bone);
    }
    
    // Establecer jerarquía parent-child
    for (const boneData of data.bones) {
      const bone = this.bones.get(boneData.id)!;
      if (boneData.parentId) {
        const parent = this.bones.get(boneData.parentId)!;
        bone.parent = parent;
        parent.children.push(bone);
      } else {
        this.rootBone = bone;
      }
    }
  }
  
  // Actualizar toda la jerarquía
  update(): void {
    if (this.rootBone) {
      this.rootBone.updateWorldTransform();
    }
  }
  
  // Obtener hueso por nombre
  getBone(name: string): Bone2D | undefined {
    return this.bones.get(name);
  }
  
  // Aplicar pose desde keyframe
  applyPose(pose: { [boneId: string]: { rotation?: number; position?: { x: number; y: number }; scale?: { x: number; y: number } } }): void {
    for (const [boneId, transform] of Object.entries(pose)) {
      const bone = this.bones.get(boneId);
      if (!bone) continue;
      
      if (transform.rotation !== undefined) {
        bone.localRotation = transform.rotation;
      }
      if (transform.position) {
        bone.localPosition.set(transform.position.x, transform.position.y);
      }
      if (transform.scale) {
        bone.localScale.set(transform.scale.x, transform.scale.y);
      }
    }
    this.update();
  }
}
```

---

## Fase 3: Sistema de Animación

```typescript
// engine/skeletal/AnimationPlayer.ts

export interface Keyframe {
  time: number;  // Tiempo en segundos
  bones: {
    [boneId: string]: {
      rotation?: number;
      position?: { x: number; y: number };
      scale?: { x: number; y: number };
    };
  };
  // Easing function
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface AnimationClip {
  name: string;
  duration: number;
  loop: boolean;
  keyframes: Keyframe[];
}

export class AnimationPlayer {
  private skeleton: Skeleton2D;
  private currentClip: AnimationClip | null = null;
  private time = 0;
  private speed = 1;
  private isPlaying = false;
  
  // Blending entre animaciones
  private blendFrom: AnimationClip | null = null;
  private blendFromTime = 0;
  private blendDuration = 0;
  private blendProgress = 0;
  
  constructor(skeleton: Skeleton2D) {
    this.skeleton = skeleton;
  }
  
  play(clip: AnimationClip, blendTime = 0.2): void {
    if (this.currentClip && blendTime > 0) {
      // Iniciar blend desde animación actual
      this.blendFrom = this.currentClip;
      this.blendFromTime = this.time;
      this.blendDuration = blendTime;
      this.blendProgress = 0;
    }
    
    this.currentClip = clip;
    this.time = 0;
    this.isPlaying = true;
  }
  
  stop(): void {
    this.isPlaying = false;
    this.currentClip = null;
  }
  
  update(deltaTime: number): void {
    if (!this.isPlaying || !this.currentClip) return;
    
    this.time += deltaTime * this.speed;
    
    // Loop
    if (this.currentClip.loop && this.time >= this.currentClip.duration) {
      this.time = this.time % this.currentClip.duration;
    } else if (!this.currentClip.loop && this.time >= this.currentClip.duration) {
      this.time = this.currentClip.duration;
      this.isPlaying = false;
    }
    
    // Blending
    if (this.blendFrom && this.blendDuration > 0) {
      this.blendProgress += deltaTime / this.blendDuration;
      if (this.blendProgress >= 1) {
        this.blendFrom = null;
        this.blendProgress = 0;
      }
    }
    
    // Calcular pose
    const pose = this.sampleAnimation(this.currentClip, this.time);
    
    // Blend con animación anterior si existe
    if (this.blendFrom && this.blendProgress < 1) {
      const prevPose = this.sampleAnimation(this.blendFrom, this.blendFromTime);
      this.blendPoses(prevPose, pose, this.blendProgress);
      this.skeleton.applyPose(prevPose);
    } else {
      this.skeleton.applyPose(pose);
    }
  }
  
  private sampleAnimation(clip: AnimationClip, time: number): { [boneId: string]: any } {
    // Encontrar keyframes antes y después del tiempo actual
    let prevFrame: Keyframe | null = null;
    let nextFrame: Keyframe | null = null;
    
    for (let i = 0; i < clip.keyframes.length; i++) {
      if (clip.keyframes[i].time <= time) {
        prevFrame = clip.keyframes[i];
      }
      if (clip.keyframes[i].time > time && !nextFrame) {
        nextFrame = clip.keyframes[i];
        break;
      }
    }
    
    if (!prevFrame) return {};
    if (!nextFrame) return prevFrame.bones;
    
    // Interpolar entre keyframes
    const t = (time - prevFrame.time) / (nextFrame.time - prevFrame.time);
    const easedT = this.applyEasing(t, nextFrame.easing || 'linear');
    
    return this.interpolatePoses(prevFrame.bones, nextFrame.bones, easedT);
  }
  
  private interpolatePoses(a: any, b: any, t: number): any {
    const result: any = {};
    
    const allBones = new Set([...Object.keys(a), ...Object.keys(b)]);
    
    for (const boneId of allBones) {
      result[boneId] = {};
      
      // Rotation
      if (a[boneId]?.rotation !== undefined || b[boneId]?.rotation !== undefined) {
        const rotA = a[boneId]?.rotation ?? 0;
        const rotB = b[boneId]?.rotation ?? 0;
        result[boneId].rotation = this.lerpAngle(rotA, rotB, t);
      }
      
      // Position
      if (a[boneId]?.position || b[boneId]?.position) {
        const posA = a[boneId]?.position ?? { x: 0, y: 0 };
        const posB = b[boneId]?.position ?? { x: 0, y: 0 };
        result[boneId].position = {
          x: posA.x + (posB.x - posA.x) * t,
          y: posA.y + (posB.y - posA.y) * t
        };
      }
      
      // Scale
      if (a[boneId]?.scale || b[boneId]?.scale) {
        const scaleA = a[boneId]?.scale ?? { x: 1, y: 1 };
        const scaleB = b[boneId]?.scale ?? { x: 1, y: 1 };
        result[boneId].scale = {
          x: scaleA.x + (scaleB.x - scaleA.x) * t,
          y: scaleA.y + (scaleB.y - scaleA.y) * t
        };
      }
    }
    
    return result;
  }
  
  private lerpAngle(a: number, b: number, t: number): number {
    // Shortest path interpolation
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }
  
  private applyEasing(t: number, easing: string): number {
    switch (easing) {
      case 'ease-in': return t * t;
      case 'ease-out': return 1 - (1 - t) * (1 - t);
      case 'ease-in-out': return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      default: return t; // linear
    }
  }
  
  private blendPoses(target: any, source: any, t: number): void {
    for (const boneId of Object.keys(source)) {
      if (!target[boneId]) target[boneId] = {};
      
      if (source[boneId].rotation !== undefined) {
        const from = target[boneId].rotation ?? 0;
        target[boneId].rotation = this.lerpAngle(from, source[boneId].rotation, t);
      }
      if (source[boneId].position) {
        const from = target[boneId].position ?? { x: 0, y: 0 };
        target[boneId].position = {
          x: from.x + (source[boneId].position.x - from.x) * t,
          y: from.y + (source[boneId].position.y - from.y) * t
        };
      }
    }
  }
}
```

---

## Fase 4: Mesh Deformation (Skinning 2D)

```typescript
// engine/skeletal/MeshDeformer.ts

import * as THREE from 'three';

export interface DeformableMesh {
  geometry: THREE.PlaneGeometry;
  originalVertices: Float32Array;  // Posiciones originales
  weights: Float32Array;           // [boneIndex, weight, boneIndex, weight, ...] por vertex
  maxInfluences: number;           // Típicamente 2-4
}

export class MeshDeformer {
  private skeleton: Skeleton2D;
  private meshes: Map<string, DeformableMesh> = new Map();
  
  constructor(skeleton: Skeleton2D) {
    this.skeleton = skeleton;
  }
  
  // Crear mesh deformable para un slot
  createDeformableMesh(
    slotId: string,
    vertices: number[],      // [x1,y1, x2,y2, ...]
    uvs: number[],           // [u1,v1, u2,v2, ...]
    triangles: number[],     // [i1,i2,i3, ...]
    weights: number[]        // [boneIdx, weight, boneIdx, weight, ...] x vertex
  ): THREE.Mesh {
    // Crear geometry custom
    const geometry = new THREE.BufferGeometry();
    
    const vertexCount = vertices.length / 2;
    const positions = new Float32Array(vertexCount * 3);
    const uvArray = new Float32Array(uvs);
    
    // Convertir 2D positions a 3D (z = 0)
    for (let i = 0; i < vertexCount; i++) {
      positions[i * 3] = vertices[i * 2];
      positions[i * 3 + 1] = vertices[i * 2 + 1];
      positions[i * 3 + 2] = 0;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
    geometry.setIndex(triangles);
    geometry.computeVertexNormals();
    
    // Guardar datos para deformación
    this.meshes.set(slotId, {
      geometry: geometry as any,
      originalVertices: new Float32Array(vertices),
      weights: new Float32Array(weights),
      maxInfluences: 2  // Asumiendo 2 bones por vertex
    });
    
    const material = new THREE.MeshStandardMaterial({
      transparent: true,
      side: THREE.DoubleSide
    });
    
    return new THREE.Mesh(geometry, material);
  }
  
  // Actualizar vertices basado en pose del skeleton
  update(): void {
    for (const [slotId, meshData] of this.meshes) {
      this.deformMesh(meshData);
    }
  }
  
  private deformMesh(meshData: DeformableMesh): void {
    const positions = meshData.geometry.attributes.position;
    const original = meshData.originalVertices;
    const weights = meshData.weights;
    const maxInf = meshData.maxInfluences;
    
    const vertexCount = original.length / 2;
    const bones = Array.from(this.skeleton.bones.values());
    
    for (let v = 0; v < vertexCount; v++) {
      const ox = original[v * 2];
      const oy = original[v * 2 + 1];
      
      let x = 0, y = 0;
      let totalWeight = 0;
      
      // Aplicar influencia de cada hueso
      for (let i = 0; i < maxInf; i++) {
        const weightIdx = v * maxInf * 2 + i * 2;
        const boneIdx = weights[weightIdx];
        const weight = weights[weightIdx + 1];
        
        if (weight === 0) continue;
        
        const bone = bones[boneIdx];
        if (!bone) continue;
        
        // Transformar vertex por matrix del hueso
        const cos = Math.cos(bone.worldRotation);
        const sin = Math.sin(bone.worldRotation);
        const tx = bone.worldPosition.x + (ox * cos - oy * sin) * bone.localScale.x;
        const ty = bone.worldPosition.y + (ox * sin + oy * cos) * bone.localScale.y;
        
        x += tx * weight;
        y += ty * weight;
        totalWeight += weight;
      }
      
      // Normalizar
      if (totalWeight > 0) {
        x /= totalWeight;
        y /= totalWeight;
      } else {
        x = ox;
        y = oy;
      }
      
      positions.setXYZ(v, x, y, 0);
    }
    
    positions.needsUpdate = true;
  }
}
```

---

## Fase 5: Integración con Three.js

```typescript
// engine/skeletal/SkeletalMesh.ts

import * as THREE from 'three';

export class SkeletalMesh extends THREE.Group {
  skeleton: Skeleton2D;
  animationPlayer: AnimationPlayer;
  meshDeformer: MeshDeformer;
  
  private slotMeshes: Map<string, THREE.Mesh> = new Map();
  private slots: Slot[];
  
  constructor(skeletonData: SkeletonData, textures: Map<string, THREE.Texture>) {
    super();
    
    this.skeleton = new Skeleton2D(skeletonData);
    this.animationPlayer = new AnimationPlayer(this.skeleton);
    this.meshDeformer = new MeshDeformer(this.skeleton);
    this.slots = skeletonData.slots;
    
    // Crear meshes para cada slot
    this.buildSlotMeshes(skeletonData, textures);
  }
  
  private buildSlotMeshes(data: SkeletonData, textures: Map<string, THREE.Texture>): void {
    const defaultSkin = data.skins['default'];
    if (!defaultSkin) return;
    
    for (const slot of this.slots) {
      const attachment = defaultSkin[slot.id];
      if (!attachment) continue;
      
      let mesh: THREE.Mesh;
      
      if (attachment.type === 'region' && attachment.region) {
        // Sprite simple (PlaneGeometry)
        const region = attachment.region;
        const geometry = new THREE.PlaneGeometry(region.width, region.height);
        const material = new THREE.MeshStandardMaterial({
          map: textures.get(region.path),
          transparent: true,
          alphaTest: 0.5,
          side: THREE.DoubleSide
        });
        mesh = new THREE.Mesh(geometry, material);
        
      } else if (attachment.type === 'mesh' && attachment.mesh) {
        // Mesh deformable
        mesh = this.meshDeformer.createDeformableMesh(
          slot.id,
          attachment.mesh.vertices,
          attachment.mesh.uvs,
          attachment.mesh.triangles,
          attachment.mesh.weights || []
        );
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.map = textures.get(attachment.mesh.path) || null;
      } else {
        continue;
      }
      
      mesh.renderOrder = slot.zIndex;
      this.add(mesh);
      this.slotMeshes.set(slot.id, mesh);
    }
  }
  
  // Actualizar cada frame
  update(deltaTime: number, camera: THREE.Camera): void {
    // 1. Actualizar animación
    this.animationPlayer.update(deltaTime);
    
    // 2. Actualizar skeleton
    this.skeleton.update();
    
    // 3. Deformar meshes
    this.meshDeformer.update();
    
    // 4. Posicionar slot meshes según huesos
    for (const slot of this.slots) {
      const mesh = this.slotMeshes.get(slot.id);
      const bone = this.skeleton.getBone(slot.boneId);
      if (!mesh || !bone) continue;
      
      mesh.position.set(bone.worldPosition.x, bone.worldPosition.y, 0);
      mesh.rotation.z = bone.worldRotation;
      mesh.scale.set(bone.localScale.x, bone.localScale.y, 1);
    }
    
    // 5. Billboard (opcional)
    // this.quaternion.copy(camera.quaternion);
  }
  
  // Reproducir animación
  playAnimation(name: string, blendTime = 0.2): void {
    const clip = this.getAnimationClip(name);
    if (clip) {
      this.animationPlayer.play(clip, blendTime);
    }
  }
  
  private getAnimationClip(name: string): AnimationClip | null {
    // Buscar en data cargada
    // ...
    return null;
  }
}
```

---

## Fase 6: Editor Visual (Herramienta de Creación)

Para crear skeletons y animaciones necesitas un editor. Opciones:

### Opción A: Editor Web Propio (Recomendado)
Crear un editor Angular/Three.js para:
- Colocar huesos visualmente
- Definir weights arrastrando vertices
- Grabar keyframes en timeline
- Exportar a JSON

### Opción B: Usar Editor Externo Gratuito
- **Synfig Studio** (open source): Exportar a formato custom
- **OpenToonz**: Animación 2D profesional gratuita
- **Blender** (modo 2D): Usar Grease Pencil + Armature

### Opción C: Scripted Animations
Definir animaciones programáticamente:

```typescript
// Animación de caminar definida en código
const walkAnimation: AnimationClip = {
  name: 'walk',
  duration: 0.8,
  loop: true,
  keyframes: [
    { time: 0, bones: { 
      'leg_l': { rotation: -0.3 },
      'leg_r': { rotation: 0.3 },
      'arm_l': { rotation: 0.3 },
      'arm_r': { rotation: -0.3 }
    }},
    { time: 0.4, bones: { 
      'leg_l': { rotation: 0.3 },
      'leg_r': { rotation: -0.3 },
      'arm_l': { rotation: -0.3 },
      'arm_r': { rotation: 0.3 }
    }},
    { time: 0.8, bones: { 
      'leg_l': { rotation: -0.3 },
      'leg_r': { rotation: 0.3 },
      'arm_l': { rotation: 0.3 },
      'arm_r': { rotation: -0.3 }
    }}
  ]
};
```

---

## Orden de Implementación

```
[ ] 1. Bone2D + Skeleton2D (estructura base)
[ ] 2. AnimationPlayer (keyframes + interpolación)
[ ] 3. Integración básica Three.js (sin deformation)
[ ] 4. Prueba con skeleton simple
[ ] 5. MeshDeformer (skinning 2D)
[ ] 6. Animation blending
[ ] 7. IK procedural (opcional)
[ ] 8. Editor visual (fase final)
```

---

## Estimación de Tiempo

| Fase | Tiempo Estimado |
|------|-----------------|
| Fase 1-3 (Core) | 2-3 días |
| Fase 4 (Deformer) | 2 días |
| Fase 5 (Integration) | 1 día |
| Testing + Debug | 2 días |
| **Total MVP** | **7-8 días** |

---

## Ventajas vs Spine

| Aspecto | Spine | Sistema Propio |
|---------|-------|----------------|
| Costo | $369 | $0 |
| Features | Completo | Lo que necesites |
| Customización | Limitado a API | Total |
| Mantenimiento | Ellos | Tú |
| Learning curve | Media | Alta inicial |
| Editor | Profesional | DIY o externo |

**Conclusión**: Si solo necesitas animación skeletal básica + física (que manejarás con Rapier.js), el sistema propio es viable y gratuito. Para features avanzados como mesh deformation compleja, IK constraints encadenados, y physics bones automáticos, Spine sigue siendo más rápido de implementar.
