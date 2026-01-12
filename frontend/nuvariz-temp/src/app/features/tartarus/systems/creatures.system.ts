import * as THREE from 'three';
import { PlanetLayer, TartarusConfig } from './magma-core.system';

class SteamWorm {
  private segments: THREE.Mesh[] = [];
  private group: THREE.Group;
  private path!: THREE.CatmullRomCurve3;
  private pathProgress: number = 0;
  private speed: number;
  private segmentCount: number;
  private waveOffset: number;
  private waveSpeed: number;
  private size: number;

  constructor(
    private orbitRadius: number,
    private verticalRange: number,
    private verticalOffset: number
  ) {
    this.group = new THREE.Group();
    this.speed = 0.015 + Math.random() * 0.02;
    this.segmentCount = 15 + Math.floor(Math.random() * 10);
    this.waveOffset = Math.random() * Math.PI * 2;
    this.waveSpeed = 2 + Math.random() * 2;
    this.size = 0.6 + Math.random() * 0.6;

    this.generatePath();
    this.createSegments();
  }

  private generatePath(): void {
    const points: THREE.Vector3[] = [];
    const segments = 30;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = t * Math.PI * 2;

      // Create organic undulating path
      const radiusVar = this.orbitRadius + Math.sin(angle * 3) * 2 + Math.cos(angle * 5) * 1;
      const heightVar = Math.sin(angle * 2) * this.verticalRange + Math.cos(angle * 4) * (this.verticalRange * 0.3);

      points.push(new THREE.Vector3(
        Math.cos(angle) * radiusVar,
        heightVar + this.verticalOffset,
        Math.sin(angle) * radiusVar
      ));
    }

    this.path = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5);
  }

  private createSegments(): void {
    // Create worm body material
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x7a6550,
      roughness: 0.75,
      metalness: 0.15,
      emissive: 0x332211,
      emissiveIntensity: 0.2,
    });

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6633,
      transparent: true,
      opacity: 0.6,
    });

    // Head
    const headGeometry = new THREE.SphereGeometry(0.35 * this.size, 16, 16);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    this.addEyes(head);
    this.addMandibles(head);
    this.segments.push(head);
    this.group.add(head);

    // Body segments
    for (let i = 1; i < this.segmentCount - 1; i++) {
      const progress = i / (this.segmentCount - 1);
      const scale = 1 - progress * 0.5;
      const segmentRadius = (0.3 - progress * 0.1) * this.size;

      const segmentGeometry = new THREE.SphereGeometry(segmentRadius, 12, 12);
      const segment = new THREE.Mesh(segmentGeometry, bodyMaterial.clone());

      // Add glowing markings every few segments
      if (i % 3 === 0) {
        const markingGeometry = new THREE.TorusGeometry(segmentRadius * 0.9, 0.02, 8, 16);
        const marking = new THREE.Mesh(markingGeometry, glowMaterial.clone());
        marking.rotation.x = Math.PI / 2;
        segment.add(marking);
      }

      this.segments.push(segment);
      this.group.add(segment);
    }

    // Tail
    const tailGeometry = new THREE.ConeGeometry(0.15 * this.size, 0.4 * this.size, 8);
    const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
    tail.rotation.x = Math.PI / 2;
    this.segments.push(tail);
    this.group.add(tail);
  }

  private addEyes(head: THREE.Mesh): void {
    const eyeGeometry = new THREE.SphereGeometry(0.08 * this.size, 12, 12);
    const eyeMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4400,
    });
    const pupilGeometry = new THREE.SphereGeometry(0.04 * this.size, 8, 8);
    const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

    [-1, 1].forEach(side => {
      const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      eye.position.set(side * 0.15 * this.size, 0.12 * this.size, 0.25 * this.size);

      const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
      pupil.position.z = 0.05 * this.size;
      eye.add(pupil);

      // Eye glow
      const glowGeometry = new THREE.SphereGeometry(0.1 * this.size, 8, 8);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.3,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      eye.add(glow);

      head.add(eye);
    });
  }

  private addMandibles(head: THREE.Mesh): void {
    const mandibleGeometry = new THREE.ConeGeometry(0.04 * this.size, 0.15 * this.size, 6);
    const mandibleMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.6,
      metalness: 0.3,
    });

    [-1, 1].forEach(side => {
      const mandible = new THREE.Mesh(mandibleGeometry, mandibleMaterial);
      mandible.position.set(side * 0.1 * this.size, -0.05 * this.size, 0.3 * this.size);
      mandible.rotation.x = -Math.PI / 4;
      mandible.rotation.z = side * Math.PI / 6;
      head.add(mandible);
    });
  }

  update(time: number, delta: number): void {
    this.pathProgress += this.speed * delta;
    if (this.pathProgress > 1) this.pathProgress -= 1;

    // Position each segment along the path with delay
    for (let i = 0; i < this.segmentCount; i++) {
      const segmentDelay = i * 0.015;
      let segmentProgress = (this.pathProgress - segmentDelay + 1) % 1;

      const position = this.path.getPointAt(segmentProgress);
      const tangent = this.path.getTangentAt(segmentProgress);

      // Add undulation
      const wave = Math.sin(time * this.waveSpeed + i * 0.4 + this.waveOffset) * 0.15;
      const perpendicular = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      position.add(perpendicular.multiplyScalar(wave));

      // Vertical wave
      position.y += Math.sin(time * this.waveSpeed * 0.7 + i * 0.3 + this.waveOffset) * 0.1;

      this.segments[i].position.copy(position);

      // Look in direction of movement
      const nextProgress = (segmentProgress + 0.01) % 1;
      const nextPosition = this.path.getPointAt(nextProgress);
      this.segments[i].lookAt(nextPosition);

      // Add some roll for natural movement
      if (i === 0) {
        this.segments[i].rotation.z = Math.sin(time * this.waveSpeed) * 0.2;
      }
    }
  }

  getObject(): THREE.Group {
    return this.group;
  }

  dispose(): void {
    this.segments.forEach(segment => {
      segment.geometry.dispose();
      if (Array.isArray(segment.material)) {
        segment.material.forEach(m => m.dispose());
      } else {
        segment.material.dispose();
      }

      // Dispose children (eyes, markings, etc.)
      segment.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
  }
}

// Flying ash birds - smaller creatures
class AshBird {
  private group: THREE.Group;
  private body!: THREE.Mesh;
  private wings: THREE.Mesh[] = [];
  private orbitAngle: number;
  private orbitRadius: number;
  private orbitSpeed: number;
  private verticalOffset: number;
  private flapSpeed: number;

  constructor(coreRadius: number) {
    this.group = new THREE.Group();
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.orbitRadius = coreRadius * (1.5 + Math.random() * 1.5);
    this.orbitSpeed = 0.3 + Math.random() * 0.4;
    this.verticalOffset = (Math.random() - 0.5) * 6;
    this.flapSpeed = 8 + Math.random() * 4;

    this.createBody();
  }

  private createBody(): void {
    // Body
    const bodyGeometry = new THREE.ConeGeometry(0.08, 0.25, 6);
    bodyGeometry.rotateX(Math.PI / 2);

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      roughness: 0.8,
      emissive: 0x221100,
      emissiveIntensity: 0.3,
    });

    this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.group.add(this.body);

    // Wings
    const wingGeometry = new THREE.PlaneGeometry(0.2, 0.08);
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.7,
      side: THREE.DoubleSide,
      emissive: 0x110800,
      emissiveIntensity: 0.2,
    });

    [-1, 1].forEach(side => {
      const wing = new THREE.Mesh(wingGeometry, wingMaterial);
      wing.position.set(side * 0.1, 0.02, 0);
      wing.rotation.y = side * 0.3;
      this.wings.push(wing);
      this.group.add(wing);
    });

    // Glowing eyes
    const eyeGeometry = new THREE.SphereGeometry(0.015, 6, 6);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff3300 });

    [-1, 1].forEach(side => {
      const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      eye.position.set(side * 0.03, 0.02, 0.12);
      this.group.add(eye);
    });
  }

  update(time: number, delta: number): void {
    // Orbit movement
    this.orbitAngle += this.orbitSpeed * delta;

    const x = Math.cos(this.orbitAngle) * this.orbitRadius;
    const z = Math.sin(this.orbitAngle) * this.orbitRadius;
    const y = this.verticalOffset + Math.sin(time * 2 + this.orbitAngle) * 0.5;

    this.group.position.set(x, y, z);

    // Face direction of movement
    this.group.lookAt(
      x - Math.sin(this.orbitAngle) * 2,
      y,
      z + Math.cos(this.orbitAngle) * 2
    );

    // Wing flapping
    const flapAngle = Math.sin(time * this.flapSpeed) * 0.6;
    this.wings[0].rotation.z = flapAngle;
    this.wings[1].rotation.z = -flapAngle;
  }

  getObject(): THREE.Group {
    return this.group;
  }

  dispose(): void {
    this.body.geometry.dispose();
    (this.body.material as THREE.Material).dispose();
    this.wings.forEach(wing => {
      wing.geometry.dispose();
      (wing.material as THREE.Material).dispose();
    });
  }
}

export class CreaturesSystem implements PlanetLayer {
  name = 'creatures';
  mesh: THREE.Group;

  private worms: SteamWorm[] = [];
  private birds: AshBird[] = [];

  constructor(private config: TartarusConfig) {
    this.mesh = new THREE.Group();
    this.createWorms();
    this.createBirds();
  }

  private createWorms(): void {
    const { creatureCount, coreRadius, atmosphereRadius } = this.config;
    const wormCount = Math.floor(creatureCount * 0.4);

    for (let i = 0; i < wormCount; i++) {
      const orbitRadius = coreRadius * 1.5 + Math.random() * (atmosphereRadius - coreRadius * 1.5) * 0.5;
      const verticalRange = 1.5 + Math.random() * 3;
      const verticalOffset = (Math.random() - 0.5) * 4;

      const worm = new SteamWorm(orbitRadius, verticalRange, verticalOffset);
      this.worms.push(worm);
      this.mesh.add(worm.getObject());
    }
  }

  private createBirds(): void {
    const { creatureCount, coreRadius } = this.config;
    const birdCount = Math.floor(creatureCount * 0.8);

    for (let i = 0; i < birdCount; i++) {
      const bird = new AshBird(coreRadius);
      this.birds.push(bird);
      this.mesh.add(bird.getObject());
    }
  }

  update(time: number, delta: number): void {
    this.worms.forEach(worm => worm.update(time, delta));
    this.birds.forEach(bird => bird.update(time, delta));
  }

  dispose(): void {
    this.worms.forEach(worm => worm.dispose());
    this.birds.forEach(bird => bird.dispose());
  }
}
