import * as THREE from 'three';
import { CarModelId } from '../types/game';
import {
  addOrientedStrut,
  BodySculptOptions,
  BodyStation,
  CabinStation,
  createExtrudedShapeGeo,
  sampleBodyStationAtZ,
} from './carGeometry';

export type GreenhouseStyle =
  | 'notchback'
  | 'hatchback'
  | 'fastback'
  | 'teardrop'
  | 'wedge'
  | 'crewcab'
  | 'monoposto';

export interface CarBlueprint {
  bodyWidth: number;
  cabinWidth: number;
  wheelBaseHalf: number;
  wheelRadius: number;
  rearWheelRadius?: number;
  tireWidth: number;
  rearTireWidth?: number;
  trackHalf: number;
  beltlineY: number;
  roofY: number;
  mirrorY: number;
  mirrorZ: number;
  wingY: number;
  wingZ: number;
  greenhouse: GreenhouseStyle;
  sculpt: BodySculptOptions;
  stations: BodyStation[];
  cabin: CabinStation[];
  plateCoords: {
    rearY: number;
    rearZ: number;
    frontY: number;
    frontZ: number;
    frontScale?: number;
    rearScale?: number;
  };
  exhaustLayout: {
    xList: number[];
    y: number;
    z: number;
    radius: number;
    titanium?: boolean;
    rectangular?: boolean;
  };
  caliperColor: number;
  hasRollCage?: boolean;
  carbonRoof?: boolean;
  visorCanopy?: boolean;
  matteArchFlares?: boolean;
  hasRoofFin?: boolean;
}

export interface CarMaterialsBundle {
  paint: THREE.MeshPhysicalMaterial;
  carbon: THREE.MeshStandardMaterial;
  matteTrim: THREE.MeshStandardMaterial;
  glossBlack: THREE.MeshPhysicalMaterial;
  grille: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  titanium: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  headLight: THREE.MeshStandardMaterial;
  drl: THREE.MeshStandardMaterial;
  tailLight: THREE.MeshStandardMaterial;
  reverseLight: THREE.MeshStandardMaterial;
  amber: THREE.MeshStandardMaterial;
  engineAccent: THREE.MeshStandardMaterial;
  flameMat: THREE.MeshBasicMaterial;
}

export interface FeatureBuildContext {
  modelId: CarModelId;
  bp: CarBlueprint;
  chassisGroup: THREE.Group;
  stockWingGroup: THREE.Group;
  stockLowerAeroGroup: THREE.Group;
  mats: CarMaterialsBundle;
  unitBoxGeo: THREE.BufferGeometry;
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T;
  trackMat: <T extends THREE.Material>(m: T) => T;
  flameMeshes: THREE.Mesh[];
}

export function getCarBlueprint(modelId: CarModelId): CarBlueprint {
  switch (modelId) {
    case 'dogan':
      // Real-world Fiat 131 / Tofaş Doğan SLX (4.32m x 1.68m, crisp 3-box classic creases)
      return {
        bodyWidth: 1.74,
        cabinWidth: 1.44,
        wheelBaseHalf: 1.26,
        wheelRadius: 0.315,
        tireWidth: 0.21,
        trackHalf: 0.85,
        beltlineY: 0.83,
        roofY: 1.38,
        mirrorY: 0.91,
        mirrorZ: -0.52,
        wingY: 0.86,
        wingZ: 1.98,
        greenhouse: 'notchback',
        caliperColor: 0x9ca3af,
        sculpt: {
          subdivisions: 2,
          wheelBaseHalf: 1.26,
          wheelRadius: 0.315,
          waistPinch: 0.0,
          fenderFlare: 0.012,
          hoodRidge: 0.0,
          creaseAngleDeg: 22,
        },
        stations: [
          { z: -2.08, bottomY: 0.29, bottomHalfW: 0.78, rockerY: 0.43, rockerHalfW: 0.84, beltY: 0.72, beltHalfW: 0.83, shoulderY: 0.76, shoulderHalfW: 0.79, crownY: 0.78 },
          { z: -1.86, bottomY: 0.28, bottomHalfW: 0.82, rockerY: 0.45, rockerHalfW: 0.87, beltY: 0.81, beltHalfW: 0.87, shoulderY: 0.84, shoulderHalfW: 0.83, crownY: 0.86 },
          { z: -0.84, bottomY: 0.27, bottomHalfW: 0.83, rockerY: 0.45, rockerHalfW: 0.87, beltY: 0.84, beltHalfW: 0.87, shoulderY: 0.87, shoulderHalfW: 0.83, crownY: 0.885 },
          { z: 0.96, bottomY: 0.27, bottomHalfW: 0.83, rockerY: 0.45, rockerHalfW: 0.87, beltY: 0.84, beltHalfW: 0.87, shoulderY: 0.87, shoulderHalfW: 0.83, crownY: 0.885 },
          { z: 1.94, bottomY: 0.29, bottomHalfW: 0.81, rockerY: 0.45, rockerHalfW: 0.86, beltY: 0.82, beltHalfW: 0.85, shoulderY: 0.85, shoulderHalfW: 0.81, crownY: 0.86 },
          { z: 2.08, bottomY: 0.32, bottomHalfW: 0.76, rockerY: 0.45, rockerHalfW: 0.82, beltY: 0.78, beltHalfW: 0.81, shoulderY: 0.81, shoulderHalfW: 0.78, crownY: 0.82 },
        ],
        cabin: [
          { z: -0.8, baseY: 0.82, baseHalfW: 0.76, roofY: 0.87, roofHalfW: 0.72, crownY: 0.88 },
          { z: -0.34, baseY: 0.84, baseHalfW: 0.75, roofY: 1.36, roofHalfW: 0.63, crownY: 1.39 },
          { z: 0.82, baseY: 0.84, baseHalfW: 0.75, roofY: 1.36, roofHalfW: 0.63, crownY: 1.39 },
          { z: 1.24, baseY: 0.82, baseHalfW: 0.76, roofY: 0.87, roofHalfW: 0.71, crownY: 0.88 },
        ],
        plateCoords: { rearY: 0.58, rearZ: 2.14, frontY: 0.34, frontZ: -2.215 },
        exhaustLayout: { xList: [0.54], y: 0.26, z: 2.11, radius: 0.044 },
      };

    case 'hatch':
      // VW Golf GTI Mk8 (4.29m x 1.79m, cab-forward rising beltline, sweeping hatch)
      return {
        bodyWidth: 1.84,
        cabinWidth: 1.48,
        wheelBaseHalf: 1.27,
        wheelRadius: 0.34,
        tireWidth: 0.25,
        trackHalf: 0.9,
        beltlineY: 0.85,
        roofY: 1.38,
        mirrorY: 0.93,
        mirrorZ: -0.46,
        wingY: 1.39,
        wingZ: 1.68,
        greenhouse: 'hatchback',
        caliperColor: 0xdc2626,
        matteArchFlares: true,
        hasRoofFin: true,
        sculpt: {
          subdivisions: 2,
          wheelBaseHalf: 1.27,
          wheelRadius: 0.34,
          waistPinch: 0.025,
          fenderFlare: 0.024,
          hoodRidge: 0.015,
          creaseAngleDeg: 32,
        },
        stations: [
          { z: -1.94, bottomY: 0.22, bottomHalfW: 0.77, rockerY: 0.38, rockerHalfW: 0.87, beltY: 0.62, beltHalfW: 0.85, shoulderY: 0.69, shoulderHalfW: 0.76, crownY: 0.73 },
          { z: -1.66, bottomY: 0.21, bottomHalfW: 0.84, rockerY: 0.42, rockerHalfW: 0.92, beltY: 0.76, beltHalfW: 0.9, shoulderY: 0.82, shoulderHalfW: 0.83, crownY: 0.85 },
          { z: -0.78, bottomY: 0.21, bottomHalfW: 0.85, rockerY: 0.44, rockerHalfW: 0.92, beltY: 0.85, beltHalfW: 0.91, shoulderY: 0.89, shoulderHalfW: 0.84, crownY: 0.91 },
          { z: 0.98, bottomY: 0.22, bottomHalfW: 0.85, rockerY: 0.45, rockerHalfW: 0.93, beltY: 0.89, beltHalfW: 0.92, shoulderY: 0.93, shoulderHalfW: 0.85, crownY: 0.94 },
          { z: 1.78, bottomY: 0.25, bottomHalfW: 0.82, rockerY: 0.46, rockerHalfW: 0.9, beltY: 0.87, beltHalfW: 0.88, shoulderY: 0.91, shoulderHalfW: 0.82, crownY: 0.92 },
          { z: 1.92, bottomY: 0.3, bottomHalfW: 0.74, rockerY: 0.46, rockerHalfW: 0.83, beltY: 0.82, beltHalfW: 0.81, shoulderY: 0.86, shoulderHalfW: 0.76, crownY: 0.87 },
        ],
        cabin: [
          { z: -0.84, baseY: 0.83, baseHalfW: 0.79, roofY: 0.89, roofHalfW: 0.74, crownY: 0.91 },
          { z: -0.22, baseY: 0.85, baseHalfW: 0.78, roofY: 1.36, roofHalfW: 0.64, crownY: 1.4 },
          { z: 1.24, baseY: 0.87, baseHalfW: 0.78, roofY: 1.34, roofHalfW: 0.62, crownY: 1.38 },
          { z: 1.74, baseY: 0.85, baseHalfW: 0.76, roofY: 0.93, roofHalfW: 0.69, crownY: 0.95 },
        ],
        plateCoords: { rearY: 0.53, rearZ: 1.985, frontY: 0.34, frontZ: -2.015 },
        exhaustLayout: { xList: [-0.56, 0.56], y: 0.27, z: 1.96, radius: 0.052 },
      };

    case 'gt':
      // Apex GT — Modern Aston/GT3 sculpted front-engine grand tourer
      return {
        bodyWidth: 1.94,
        cabinWidth: 1.42,
        wheelBaseHalf: 1.34,
        wheelRadius: 0.355,
        tireWidth: 0.28,
        trackHalf: 0.94,
        beltlineY: 0.82,
        roofY: 1.24,
        mirrorY: 0.88,
        mirrorZ: -0.34,
        wingY: 1.12,
        wingZ: 2.02,
        greenhouse: 'fastback',
        caliperColor: 0xdc2626,
        hasRollCage: true,
        hasRoofFin: true,
        sculpt: {
          subdivisions: 3,
          wheelBaseHalf: 1.34,
          wheelRadius: 0.355,
          waistPinch: 0.052,
          fenderFlare: 0.04,
          hoodRidge: 0.025,
          creaseAngleDeg: 34,
        },
        stations: [
          { z: -2.18, bottomY: 0.19, bottomHalfW: 0.79, rockerY: 0.34, rockerHalfW: 0.9, beltY: 0.54, beltHalfW: 0.88, shoulderY: 0.61, shoulderHalfW: 0.78, crownY: 0.64 },
          { z: -1.78, bottomY: 0.19, bottomHalfW: 0.88, rockerY: 0.38, rockerHalfW: 0.97, beltY: 0.74, beltHalfW: 0.96, shoulderY: 0.81, shoulderHalfW: 0.87, crownY: 0.84 },
          { z: -0.68, bottomY: 0.19, bottomHalfW: 0.87, rockerY: 0.39, rockerHalfW: 0.94, beltY: 0.81, beltHalfW: 0.93, shoulderY: 0.86, shoulderHalfW: 0.85, crownY: 0.88 },
          { z: 0.9, bottomY: 0.19, bottomHalfW: 0.91, rockerY: 0.42, rockerHalfW: 1.0, beltY: 0.86, beltHalfW: 0.99, shoulderY: 0.91, shoulderHalfW: 0.89, crownY: 0.92 },
          { z: 1.94, bottomY: 0.23, bottomHalfW: 0.86, rockerY: 0.44, rockerHalfW: 0.95, beltY: 0.84, beltHalfW: 0.93, shoulderY: 0.88, shoulderHalfW: 0.85, crownY: 0.89 },
          { z: 2.14, bottomY: 0.3, bottomHalfW: 0.77, rockerY: 0.45, rockerHalfW: 0.86, beltY: 0.79, beltHalfW: 0.84, shoulderY: 0.84, shoulderHalfW: 0.77, crownY: 0.85 },
        ],
        cabin: [
          { z: -0.68, baseY: 0.8, baseHalfW: 0.76, roofY: 0.85, roofHalfW: 0.71, crownY: 0.87 },
          { z: -0.06, baseY: 0.82, baseHalfW: 0.74, roofY: 1.22, roofHalfW: 0.59, crownY: 1.26 },
          { z: 0.74, baseY: 0.84, baseHalfW: 0.74, roofY: 1.2, roofHalfW: 0.56, crownY: 1.24 },
          { z: 1.62, baseY: 0.83, baseHalfW: 0.74, roofY: 0.89, roofHalfW: 0.66, crownY: 0.91 },
        ],
        plateCoords: { rearY: 0.52, rearZ: 2.205, frontY: 0.34, frontZ: -2.255 },
        exhaustLayout: { xList: [-0.62, -0.49, 0.49, 0.62], y: 0.25, z: 2.16, radius: 0.044 },
      };

    case 'rally':
      // WRC Group-A / Subaru-Evo Wide-Arch Rally Weapon
      return {
        bodyWidth: 1.96,
        cabinWidth: 1.5,
        wheelBaseHalf: 1.3,
        wheelRadius: 0.36,
        tireWidth: 0.27,
        trackHalf: 0.96,
        beltlineY: 0.89,
        roofY: 1.37,
        mirrorY: 0.97,
        mirrorZ: -0.44,
        wingY: 1.36,
        wingZ: 1.92,
        greenhouse: 'hatchback',
        caliperColor: 0xf59e0b,
        hasRollCage: true,
        matteArchFlares: true,
        sculpt: {
          subdivisions: 2,
          wheelBaseHalf: 1.3,
          wheelRadius: 0.36,
          waistPinch: 0.032,
          fenderFlare: 0.052,
          hoodRidge: 0.02,
          creaseAngleDeg: 28,
        },
        stations: [
          { z: -2.06, bottomY: 0.26, bottomHalfW: 0.84, rockerY: 0.46, rockerHalfW: 0.94, beltY: 0.69, beltHalfW: 0.92, shoulderY: 0.77, shoulderHalfW: 0.84, crownY: 0.81 },
          { z: -1.72, bottomY: 0.25, bottomHalfW: 0.9, rockerY: 0.48, rockerHalfW: 1.0, beltY: 0.82, beltHalfW: 0.98, shoulderY: 0.88, shoulderHalfW: 0.9, crownY: 0.91 },
          { z: -0.78, bottomY: 0.25, bottomHalfW: 0.89, rockerY: 0.48, rockerHalfW: 0.96, beltY: 0.89, beltHalfW: 0.95, shoulderY: 0.93, shoulderHalfW: 0.88, crownY: 0.95 },
          { z: 0.84, bottomY: 0.25, bottomHalfW: 0.91, rockerY: 0.49, rockerHalfW: 1.0, beltY: 0.92, beltHalfW: 0.99, shoulderY: 0.96, shoulderHalfW: 0.91, crownY: 0.97 },
          { z: 1.88, bottomY: 0.27, bottomHalfW: 0.88, rockerY: 0.5, rockerHalfW: 0.97, beltY: 0.9, beltHalfW: 0.95, shoulderY: 0.94, shoulderHalfW: 0.88, crownY: 0.95 },
          { z: 2.04, bottomY: 0.34, bottomHalfW: 0.8, rockerY: 0.5, rockerHalfW: 0.89, beltY: 0.85, beltHalfW: 0.87, shoulderY: 0.9, shoulderHalfW: 0.81, crownY: 0.91 },
        ],
        cabin: [
          { z: -0.82, baseY: 0.88, baseHalfW: 0.81, roofY: 0.94, roofHalfW: 0.75, crownY: 0.96 },
          { z: -0.28, baseY: 0.9, baseHalfW: 0.8, roofY: 1.35, roofHalfW: 0.65, crownY: 1.39 },
          { z: 0.82, baseY: 0.9, baseHalfW: 0.8, roofY: 1.35, roofHalfW: 0.64, crownY: 1.39 },
          { z: 1.5, baseY: 0.88, baseHalfW: 0.79, roofY: 0.94, roofHalfW: 0.72, crownY: 0.96 },
        ],
        plateCoords: { rearY: 0.56, rearZ: 2.105, frontY: 0.37, frontZ: -2.135 },
        exhaustLayout: { xList: [-0.56, 0.56], y: 0.3, z: 2.08, radius: 0.056, titanium: true },
      };

    case 'pickup':
      // Ford F-150 Raptor 4x4 — True recessed hollow cargo bed + wide lifted stance
      return {
        bodyWidth: 2.1,
        cabinWidth: 1.68,
        wheelBaseHalf: 1.48,
        wheelRadius: 0.43,
        tireWidth: 0.33,
        trackHalf: 1.03,
        beltlineY: 1.08,
        roofY: 1.64,
        mirrorY: 1.18,
        mirrorZ: -0.56,
        wingY: 1.62,
        wingZ: 1.0,
        greenhouse: 'crewcab',
        caliperColor: 0xf59e0b,
        matteArchFlares: true,
        sculpt: {
          subdivisions: 2,
          wheelBaseHalf: 1.48,
          wheelRadius: 0.43,
          waistPinch: 0.0,
          fenderFlare: 0.048,
          hoodRidge: 0.032,
          creaseAngleDeg: 24,
          pickupBed: {
            startZ: 0.68,
            endZ: 2.16,
            floorY: 0.74,
            wallHalfW: 0.8,
          },
        },
        stations: [
          { z: -2.3, bottomY: 0.44, bottomHalfW: 0.92, rockerY: 0.68, rockerHalfW: 1.02, beltY: 0.99, beltHalfW: 1.01, shoulderY: 1.06, shoulderHalfW: 0.94, crownY: 1.1 },
          { z: -1.9, bottomY: 0.4, bottomHalfW: 0.97, rockerY: 0.68, rockerHalfW: 1.06, beltY: 1.05, beltHalfW: 1.05, shoulderY: 1.11, shoulderHalfW: 0.98, crownY: 1.14 },
          { z: -0.75, bottomY: 0.39, bottomHalfW: 0.97, rockerY: 0.68, rockerHalfW: 1.05, beltY: 1.08, beltHalfW: 1.04, shoulderY: 1.12, shoulderHalfW: 0.98, crownY: 1.14 },
          { z: 0.65, bottomY: 0.39, bottomHalfW: 0.97, rockerY: 0.68, rockerHalfW: 1.05, beltY: 1.08, beltHalfW: 1.04, shoulderY: 1.11, shoulderHalfW: 0.98, crownY: 1.12 },
          { z: 2.12, bottomY: 0.4, bottomHalfW: 0.96, rockerY: 0.68, rockerHalfW: 1.05, beltY: 1.07, beltHalfW: 1.03, shoulderY: 1.1, shoulderHalfW: 0.96, crownY: 1.1 },
          { z: 2.28, bottomY: 0.45, bottomHalfW: 0.9, rockerY: 0.68, rockerHalfW: 0.99, beltY: 1.05, beltHalfW: 0.98, shoulderY: 1.08, shoulderHalfW: 0.93, crownY: 1.09 },
        ],
        cabin: [
          { z: -0.84, baseY: 1.06, baseHalfW: 0.89, roofY: 1.13, roofHalfW: 0.83, crownY: 1.15 },
          { z: -0.44, baseY: 1.08, baseHalfW: 0.88, roofY: 1.61, roofHalfW: 0.75, crownY: 1.65 },
          { z: 0.46, baseY: 1.08, baseHalfW: 0.88, roofY: 1.61, roofHalfW: 0.75, crownY: 1.65 },
          { z: 0.62, baseY: 1.06, baseHalfW: 0.88, roofY: 1.56, roofHalfW: 0.75, crownY: 1.61 },
        ],
        plateCoords: { rearY: 0.74, rearZ: 2.35, frontY: 0.56, frontZ: -2.39 },
        exhaustLayout: { xList: [-0.66, 0.66], y: 0.38, z: 2.28, radius: 0.062 },
      };

    case 'muscle':
      // Ford Mustang GT Fastback V8 — Long power-dome hood, shark nose, muscular haunches
      return {
        bodyWidth: 1.96,
        cabinWidth: 1.44,
        wheelBaseHalf: 1.35,
        wheelRadius: 0.36,
        tireWidth: 0.28,
        trackHalf: 0.95,
        beltlineY: 0.87,
        roofY: 1.31,
        mirrorY: 0.94,
        mirrorZ: -0.34,
        wingY: 0.94,
        wingZ: 2.02,
        greenhouse: 'fastback',
        caliperColor: 0xdc2626,
        sculpt: {
          subdivisions: 3,
          wheelBaseHalf: 1.35,
          wheelRadius: 0.36,
          waistPinch: 0.044,
          fenderFlare: 0.044,
          hoodRidge: 0.042,
          creaseAngleDeg: 28,
        },
        stations: [
          { z: -2.22, bottomY: 0.21, bottomHalfW: 0.82, rockerY: 0.4, rockerHalfW: 0.93, beltY: 0.68, beltHalfW: 0.91, shoulderY: 0.74, shoulderHalfW: 0.83, crownY: 0.77 },
          { z: -1.82, bottomY: 0.2, bottomHalfW: 0.89, rockerY: 0.43, rockerHalfW: 0.98, beltY: 0.8, beltHalfW: 0.97, shoulderY: 0.86, shoulderHalfW: 0.88, crownY: 0.9 },
          { z: -0.62, bottomY: 0.2, bottomHalfW: 0.89, rockerY: 0.44, rockerHalfW: 0.96, beltY: 0.87, beltHalfW: 0.95, shoulderY: 0.91, shoulderHalfW: 0.87, crownY: 0.94 },
          { z: 0.88, bottomY: 0.2, bottomHalfW: 0.92, rockerY: 0.46, rockerHalfW: 1.01, beltY: 0.92, beltHalfW: 1.0, shoulderY: 0.96, shoulderHalfW: 0.91, crownY: 0.97 },
          { z: 1.94, bottomY: 0.24, bottomHalfW: 0.88, rockerY: 0.47, rockerHalfW: 0.97, beltY: 0.88, beltHalfW: 0.95, shoulderY: 0.92, shoulderHalfW: 0.86, crownY: 0.93 },
          { z: 2.15, bottomY: 0.31, bottomHalfW: 0.8, rockerY: 0.48, rockerHalfW: 0.89, beltY: 0.83, beltHalfW: 0.87, shoulderY: 0.87, shoulderHalfW: 0.8, crownY: 0.88 },
        ],
        cabin: [
          { z: -0.66, baseY: 0.85, baseHalfW: 0.77, roofY: 0.91, roofHalfW: 0.72, crownY: 0.93 },
          { z: -0.06, baseY: 0.87, baseHalfW: 0.75, roofY: 1.29, roofHalfW: 0.61, crownY: 1.33 },
          { z: 0.74, baseY: 0.88, baseHalfW: 0.75, roofY: 1.27, roofHalfW: 0.59, crownY: 1.31 },
          { z: 1.66, baseY: 0.87, baseHalfW: 0.76, roofY: 0.93, roofHalfW: 0.68, crownY: 0.95 },
        ],
        plateCoords: { rearY: 0.52, rearZ: 2.215, frontY: 0.34, frontZ: -2.295 },
        exhaustLayout: { xList: [-0.62, -0.49, 0.49, 0.62], y: 0.27, z: 2.17, radius: 0.048 },
      };

    case 'm3gtr':
      // BMW M3 GTR E46 ALMS (4.62m x 1.88m wide DTM fenders, iconic kidney nose & DTM wing)
      return {
        bodyWidth: 1.96,
        cabinWidth: 1.46,
        wheelBaseHalf: 1.35,
        wheelRadius: 0.35,
        tireWidth: 0.28,
        trackHalf: 0.96,
        beltlineY: 0.84,
        roofY: 1.3,
        mirrorY: 0.91,
        mirrorZ: -0.42,
        wingY: 1.26,
        wingZ: 1.98,
        greenhouse: 'notchback',
        caliperColor: 0xdc2626,
        hasRollCage: true,
        hasRoofFin: true,
        sculpt: {
          subdivisions: 3,
          wheelBaseHalf: 1.35,
          wheelRadius: 0.35,
          waistPinch: 0.036,
          fenderFlare: 0.056,
          hoodRidge: 0.026,
          creaseAngleDeg: 28,
        },
        stations: [
          { z: -2.18, bottomY: 0.19, bottomHalfW: 0.83, rockerY: 0.37, rockerHalfW: 0.93, beltY: 0.64, beltHalfW: 0.91, shoulderY: 0.71, shoulderHalfW: 0.83, crownY: 0.74 },
          { z: -1.8, bottomY: 0.19, bottomHalfW: 0.9, rockerY: 0.4, rockerHalfW: 0.99, beltY: 0.78, beltHalfW: 0.98, shoulderY: 0.84, shoulderHalfW: 0.9, crownY: 0.87 },
          { z: -0.76, bottomY: 0.19, bottomHalfW: 0.89, rockerY: 0.41, rockerHalfW: 0.96, beltY: 0.84, beltHalfW: 0.95, shoulderY: 0.88, shoulderHalfW: 0.87, crownY: 0.9 },
          { z: 0.9, bottomY: 0.19, bottomHalfW: 0.92, rockerY: 0.43, rockerHalfW: 1.0, beltY: 0.87, beltHalfW: 0.99, shoulderY: 0.91, shoulderHalfW: 0.9, crownY: 0.92 },
          { z: 1.92, bottomY: 0.22, bottomHalfW: 0.88, rockerY: 0.44, rockerHalfW: 0.96, beltY: 0.84, beltHalfW: 0.94, shoulderY: 0.88, shoulderHalfW: 0.86, crownY: 0.89 },
          { z: 2.12, bottomY: 0.28, bottomHalfW: 0.8, rockerY: 0.44, rockerHalfW: 0.88, beltY: 0.8, beltHalfW: 0.86, shoulderY: 0.84, shoulderHalfW: 0.79, crownY: 0.85 },
        ],
        cabin: [
          { z: -0.78, baseY: 0.82, baseHalfW: 0.78, roofY: 0.88, roofHalfW: 0.73, crownY: 0.9 },
          { z: -0.22, baseY: 0.84, baseHalfW: 0.77, roofY: 1.28, roofHalfW: 0.62, crownY: 1.32 },
          { z: 0.78, baseY: 0.85, baseHalfW: 0.77, roofY: 1.28, roofHalfW: 0.61, crownY: 1.32 },
          { z: 1.34, baseY: 0.84, baseHalfW: 0.77, roofY: 0.89, roofHalfW: 0.7, crownY: 0.91 },
        ],
        plateCoords: { rearY: 0.53, rearZ: 2.185, frontY: 0.33, frontZ: -2.255 },
        exhaustLayout: { xList: [-0.36, -0.22, 0.22, 0.36], y: 0.25, z: 2.14, radius: 0.045, titanium: true },
      };

    case 'jdm':
      // Nissan Skyline GT-R R34 — Muscular JDM notchback, FMIC, quad round afterburner lights
      return {
        bodyWidth: 1.92,
        cabinWidth: 1.44,
        wheelBaseHalf: 1.33,
        wheelRadius: 0.35,
        tireWidth: 0.27,
        trackHalf: 0.94,
        beltlineY: 0.84,
        roofY: 1.31,
        mirrorY: 0.91,
        mirrorZ: -0.44,
        wingY: 1.22,
        wingZ: 1.96,
        greenhouse: 'notchback',
        caliperColor: 0xdc2626,
        hasRoofFin: true,
        sculpt: {
          subdivisions: 2,
          wheelBaseHalf: 1.33,
          wheelRadius: 0.35,
          waistPinch: 0.024,
          fenderFlare: 0.045,
          hoodRidge: 0.022,
          creaseAngleDeg: 25,
        },
        stations: [
          { z: -2.16, bottomY: 0.19, bottomHalfW: 0.82, rockerY: 0.37, rockerHalfW: 0.92, beltY: 0.64, beltHalfW: 0.9, shoulderY: 0.71, shoulderHalfW: 0.82, crownY: 0.74 },
          { z: -1.8, bottomY: 0.19, bottomHalfW: 0.88, rockerY: 0.4, rockerHalfW: 0.96, beltY: 0.78, beltHalfW: 0.95, shoulderY: 0.84, shoulderHalfW: 0.87, crownY: 0.86 },
          { z: -0.78, bottomY: 0.19, bottomHalfW: 0.88, rockerY: 0.41, rockerHalfW: 0.95, beltY: 0.84, beltHalfW: 0.94, shoulderY: 0.88, shoulderHalfW: 0.86, crownY: 0.895 },
          { z: 0.92, bottomY: 0.19, bottomHalfW: 0.9, rockerY: 0.43, rockerHalfW: 0.98, beltY: 0.86, beltHalfW: 0.97, shoulderY: 0.9, shoulderHalfW: 0.89, crownY: 0.91 },
          { z: 1.92, bottomY: 0.22, bottomHalfW: 0.87, rockerY: 0.44, rockerHalfW: 0.95, beltY: 0.84, beltHalfW: 0.93, shoulderY: 0.87, shoulderHalfW: 0.85, crownY: 0.88 },
          { z: 2.12, bottomY: 0.28, bottomHalfW: 0.8, rockerY: 0.44, rockerHalfW: 0.88, beltY: 0.8, beltHalfW: 0.86, shoulderY: 0.84, shoulderHalfW: 0.8, crownY: 0.85 },
        ],
        cabin: [
          { z: -0.8, baseY: 0.82, baseHalfW: 0.78, roofY: 0.88, roofHalfW: 0.73, crownY: 0.89 },
          { z: -0.26, baseY: 0.84, baseHalfW: 0.76, roofY: 1.29, roofHalfW: 0.62, crownY: 1.33 },
          { z: 0.76, baseY: 0.85, baseHalfW: 0.76, roofY: 1.29, roofHalfW: 0.61, crownY: 1.33 },
          { z: 1.32, baseY: 0.84, baseHalfW: 0.76, roofY: 0.89, roofHalfW: 0.7, crownY: 0.91 },
        ],
        plateCoords: { rearY: 0.49, rearZ: 2.185, frontY: 0.32, frontZ: -2.255 },
        exhaustLayout: { xList: [0.58], y: 0.25, z: 2.16, radius: 0.072, titanium: true },
      };

    case 'porsche':
      // Porsche 911 GT3 (992) — Iconic teardrop sloping roof, raised front fender barrels, continuous lightbar
      return {
        bodyWidth: 1.94,
        cabinWidth: 1.38,
        wheelBaseHalf: 1.28,
        wheelRadius: 0.35,
        rearWheelRadius: 0.365,
        tireWidth: 0.27,
        rearTireWidth: 0.31,
        trackHalf: 0.94,
        beltlineY: 0.78,
        roofY: 1.22,
        mirrorY: 0.85,
        mirrorZ: -0.44,
        wingY: 1.15,
        wingZ: 1.92,
        greenhouse: 'fastback',
        caliperColor: 0xdc2626,
        hasRollCage: true,
        carbonRoof: true,
        hasRoofFin: true,
        sculpt: {
          subdivisions: 3,
          wheelBaseHalf: 1.28,
          frontWheelRadius: 0.35,
          rearWheelRadius: 0.365,
          waistPinch: 0.058,
          fenderFlare: 0.048,
          hoodRidge: -0.015,
          creaseAngleDeg: 40,
        },
        stations: [
          { z: -2.1, bottomY: 0.17, bottomHalfW: 0.74, rockerY: 0.32, rockerHalfW: 0.86, beltY: 0.51, beltHalfW: 0.84, shoulderY: 0.56, shoulderHalfW: 0.74, crownY: 0.55 },
          { z: -1.68, bottomY: 0.17, bottomHalfW: 0.85, rockerY: 0.36, rockerHalfW: 0.94, beltY: 0.69, beltHalfW: 0.93, shoulderY: 0.75, shoulderHalfW: 0.83, crownY: 0.72 },
          { z: -0.78, bottomY: 0.17, bottomHalfW: 0.84, rockerY: 0.38, rockerHalfW: 0.92, beltY: 0.78, beltHalfW: 0.91, shoulderY: 0.82, shoulderHalfW: 0.82, crownY: 0.83 },
          { z: 0.84, bottomY: 0.18, bottomHalfW: 0.91, rockerY: 0.42, rockerHalfW: 1.0, beltY: 0.86, beltHalfW: 0.99, shoulderY: 0.91, shoulderHalfW: 0.89, crownY: 0.92 },
          { z: 1.88, bottomY: 0.22, bottomHalfW: 0.87, rockerY: 0.43, rockerHalfW: 0.96, beltY: 0.82, beltHalfW: 0.93, shoulderY: 0.86, shoulderHalfW: 0.84, crownY: 0.87 },
          { z: 2.08, bottomY: 0.29, bottomHalfW: 0.76, rockerY: 0.44, rockerHalfW: 0.85, beltY: 0.75, beltHalfW: 0.82, shoulderY: 0.8, shoulderHalfW: 0.75, crownY: 0.81 },
        ],
        cabin: [
          { z: -0.78, baseY: 0.76, baseHalfW: 0.74, roofY: 0.82, roofHalfW: 0.69, crownY: 0.84 },
          { z: -0.18, baseY: 0.78, baseHalfW: 0.72, roofY: 1.2, roofHalfW: 0.56, crownY: 1.24 },
          { z: 0.54, baseY: 0.8, baseHalfW: 0.72, roofY: 1.18, roofHalfW: 0.53, crownY: 1.22 },
          { z: 1.62, baseY: 0.82, baseHalfW: 0.74, roofY: 0.87, roofHalfW: 0.64, crownY: 0.89 },
        ],
        plateCoords: { rearY: 0.48, rearZ: 2.145, frontY: 0.3, frontZ: -2.175 },
        exhaustLayout: { xList: [-0.11, 0.11], y: 0.25, z: 2.11, radius: 0.052, titanium: true },
      };

    case 'amggt':
      // Mercedes-AMG GT Black Series — Ultra-long V8 hood, cab-rearward coupe, Panamericana grille, twin-tier wing
      return {
        bodyWidth: 2.02,
        cabinWidth: 1.4,
        wheelBaseHalf: 1.38,
        wheelRadius: 0.355,
        rearWheelRadius: 0.37,
        tireWidth: 0.29,
        rearTireWidth: 0.32,
        trackHalf: 0.98,
        beltlineY: 0.81,
        roofY: 1.21,
        mirrorY: 0.88,
        mirrorZ: -0.16,
        wingY: 1.22,
        wingZ: 1.98,
        greenhouse: 'fastback',
        caliperColor: 0xf59e0b,
        hasRollCage: true,
        carbonRoof: true,
        hasRoofFin: true,
        sculpt: {
          subdivisions: 3,
          wheelBaseHalf: 1.38,
          frontWheelRadius: 0.355,
          rearWheelRadius: 0.37,
          waistPinch: 0.06,
          fenderFlare: 0.052,
          hoodRidge: 0.032,
          creaseAngleDeg: 34,
        },
        stations: [
          { z: -2.32, bottomY: 0.16, bottomHalfW: 0.81, rockerY: 0.33, rockerHalfW: 0.93, beltY: 0.56, beltHalfW: 0.9, shoulderY: 0.63, shoulderHalfW: 0.81, crownY: 0.66 },
          { z: -1.84, bottomY: 0.16, bottomHalfW: 0.9, rockerY: 0.37, rockerHalfW: 1.0, beltY: 0.74, beltHalfW: 0.98, shoulderY: 0.81, shoulderHalfW: 0.89, crownY: 0.84 },
          { z: -0.44, bottomY: 0.17, bottomHalfW: 0.89, rockerY: 0.39, rockerHalfW: 0.96, beltY: 0.81, beltHalfW: 0.95, shoulderY: 0.86, shoulderHalfW: 0.87, crownY: 0.88 },
          { z: 0.96, bottomY: 0.18, bottomHalfW: 0.94, rockerY: 0.42, rockerHalfW: 1.04, beltY: 0.86, beltHalfW: 1.03, shoulderY: 0.91, shoulderHalfW: 0.93, crownY: 0.92 },
          { z: 1.96, bottomY: 0.22, bottomHalfW: 0.9, rockerY: 0.43, rockerHalfW: 0.99, beltY: 0.82, beltHalfW: 0.96, shoulderY: 0.86, shoulderHalfW: 0.87, crownY: 0.87 },
          { z: 2.16, bottomY: 0.28, bottomHalfW: 0.79, rockerY: 0.44, rockerHalfW: 0.88, beltY: 0.76, beltHalfW: 0.85, shoulderY: 0.8, shoulderHalfW: 0.78, crownY: 0.81 },
        ],
        cabin: [
          { z: -0.42, baseY: 0.79, baseHalfW: 0.75, roofY: 0.85, roofHalfW: 0.7, crownY: 0.87 },
          { z: 0.12, baseY: 0.81, baseHalfW: 0.73, roofY: 1.19, roofHalfW: 0.56, crownY: 1.23 },
          { z: 0.84, baseY: 0.83, baseHalfW: 0.73, roofY: 1.17, roofHalfW: 0.54, crownY: 1.21 },
          { z: 1.7, baseY: 0.82, baseHalfW: 0.74, roofY: 0.87, roofHalfW: 0.65, crownY: 0.89 },
        ],
        plateCoords: { rearY: 0.49, rearZ: 2.225, frontY: 0.28, frontZ: -2.41 },
        exhaustLayout: { xList: [-0.66, -0.52, 0.52, 0.66], y: 0.25, z: 2.18, radius: 0.046 },
      };

    case 'hyper':
      // Aston Martin Valkyrie-inspired Hypercar — Underfloor Venturi tunnels, dorsal fin, teardrop canopy
      return {
        bodyWidth: 2.04,
        cabinWidth: 1.26,
        wheelBaseHalf: 1.38,
        wheelRadius: 0.35,
        rearWheelRadius: 0.37,
        tireWidth: 0.3,
        rearTireWidth: 0.34,
        trackHalf: 0.99,
        beltlineY: 0.7,
        roofY: 1.1,
        mirrorY: 0.78,
        mirrorZ: -0.58,
        wingY: 1.06,
        wingZ: 2.04,
        greenhouse: 'teardrop',
        caliperColor: 0x0ea5e9,
        carbonRoof: true,
        visorCanopy: true,
        sculpt: {
          subdivisions: 3,
          wheelBaseHalf: 1.38,
          frontWheelRadius: 0.35,
          rearWheelRadius: 0.37,
          waistPinch: 0.14,
          fenderFlare: 0.056,
          hoodRidge: 0.0,
          creaseAngleDeg: 34,
        },
        stations: [
          { z: -2.28, bottomY: 0.14, bottomHalfW: 0.76, rockerY: 0.26, rockerHalfW: 0.9, beltY: 0.44, beltHalfW: 0.88, shoulderY: 0.51, shoulderHalfW: 0.76, crownY: 0.53 },
          { z: -1.78, bottomY: 0.14, bottomHalfW: 0.88, rockerY: 0.3, rockerHalfW: 1.0, beltY: 0.64, beltHalfW: 0.98, shoulderY: 0.72, shoulderHalfW: 0.86, crownY: 0.71 },
          { z: -0.78, bottomY: 0.15, bottomHalfW: 0.8, rockerY: 0.32, rockerHalfW: 0.9, beltY: 0.7, beltHalfW: 0.9, shoulderY: 0.75, shoulderHalfW: 0.8, crownY: 0.76 },
          { z: 0.9, bottomY: 0.16, bottomHalfW: 0.94, rockerY: 0.36, rockerHalfW: 1.04, beltY: 0.78, beltHalfW: 1.03, shoulderY: 0.84, shoulderHalfW: 0.9, crownY: 0.84 },
          { z: 1.98, bottomY: 0.21, bottomHalfW: 0.89, rockerY: 0.4, rockerHalfW: 0.99, beltY: 0.77, beltHalfW: 0.96, shoulderY: 0.82, shoulderHalfW: 0.86, crownY: 0.82 },
          { z: 2.18, bottomY: 0.28, bottomHalfW: 0.79, rockerY: 0.42, rockerHalfW: 0.89, beltY: 0.72, beltHalfW: 0.86, shoulderY: 0.77, shoulderHalfW: 0.78, crownY: 0.77 },
        ],
        cabin: [
          { z: -0.92, baseY: 0.68, baseHalfW: 0.67, roofY: 0.74, roofHalfW: 0.62, crownY: 0.76 },
          { z: -0.32, baseY: 0.7, baseHalfW: 0.64, roofY: 1.08, roofHalfW: 0.49, crownY: 1.12 },
          { z: 0.56, baseY: 0.72, baseHalfW: 0.63, roofY: 1.06, roofHalfW: 0.46, crownY: 1.1 },
          { z: 1.48, baseY: 0.75, baseHalfW: 0.66, roofY: 0.82, roofHalfW: 0.56, crownY: 0.84 },
        ],
        plateCoords: { rearY: 0.39, rearZ: 2.245, frontY: 0.29, frontZ: -2.355 },
        exhaustLayout: { xList: [-0.24, 0.24], y: 0.56, z: 2.18, radius: 0.056, titanium: true },
      };

    case 'laferrari':
      // Ferrari LaFerrari V12 — F1 floating nose, blacked fighter canopy, exposed red V12 bay, quad round Ferrari lights
      return {
        bodyWidth: 2.06,
        cabinWidth: 1.3,
        wheelBaseHalf: 1.38,
        wheelRadius: 0.35,
        rearWheelRadius: 0.375,
        tireWidth: 0.3,
        rearTireWidth: 0.35,
        trackHalf: 1.0,
        beltlineY: 0.69,
        roofY: 1.1,
        mirrorY: 0.78,
        mirrorZ: -0.62,
        wingY: 0.84,
        wingZ: 2.12,
        greenhouse: 'teardrop',
        caliperColor: 0xdc2626,
        carbonRoof: true,
        visorCanopy: true,
        sculpt: {
          subdivisions: 3,
          wheelBaseHalf: 1.38,
          frontWheelRadius: 0.35,
          rearWheelRadius: 0.375,
          waistPinch: 0.11,
          fenderFlare: 0.055,
          hoodRidge: -0.02,
          creaseAngleDeg: 32,
        },
        stations: [
          { z: -2.36, bottomY: 0.14, bottomHalfW: 0.76, rockerY: 0.25, rockerHalfW: 0.91, beltY: 0.42, beltHalfW: 0.88, shoulderY: 0.49, shoulderHalfW: 0.76, crownY: 0.51 },
          { z: -1.82, bottomY: 0.14, bottomHalfW: 0.9, rockerY: 0.3, rockerHalfW: 1.01, beltY: 0.64, beltHalfW: 0.99, shoulderY: 0.72, shoulderHalfW: 0.87, crownY: 0.7 },
          { z: -0.78, bottomY: 0.15, bottomHalfW: 0.84, rockerY: 0.32, rockerHalfW: 0.94, beltY: 0.69, beltHalfW: 0.93, shoulderY: 0.75, shoulderHalfW: 0.83, crownY: 0.76 },
          { z: 0.94, bottomY: 0.16, bottomHalfW: 0.96, rockerY: 0.36, rockerHalfW: 1.06, beltY: 0.78, beltHalfW: 1.05, shoulderY: 0.84, shoulderHalfW: 0.92, crownY: 0.84 },
          { z: 2.02, bottomY: 0.21, bottomHalfW: 0.91, rockerY: 0.4, rockerHalfW: 1.01, beltY: 0.77, beltHalfW: 0.98, shoulderY: 0.82, shoulderHalfW: 0.87, crownY: 0.82 },
          { z: 2.22, bottomY: 0.27, bottomHalfW: 0.81, rockerY: 0.42, rockerHalfW: 0.91, beltY: 0.72, beltHalfW: 0.88, shoulderY: 0.77, shoulderHalfW: 0.79, crownY: 0.78 },
        ],
        cabin: [
          { z: -0.96, baseY: 0.67, baseHalfW: 0.69, roofY: 0.73, roofHalfW: 0.63, crownY: 0.75 },
          { z: -0.34, baseY: 0.69, baseHalfW: 0.66, roofY: 1.08, roofHalfW: 0.51, crownY: 1.12 },
          { z: 0.52, baseY: 0.71, baseHalfW: 0.65, roofY: 1.06, roofHalfW: 0.48, crownY: 1.1 },
          { z: 1.46, baseY: 0.75, baseHalfW: 0.68, roofY: 0.81, roofHalfW: 0.58, crownY: 0.83 },
        ],
        plateCoords: { rearY: 0.47, rearZ: 2.29, frontY: 0.28, frontZ: -2.435 },
        exhaustLayout: { xList: [-0.64, -0.5, 0.5, 0.64], y: 0.27, z: 2.24, radius: 0.048, titanium: true },
      };

    case 'lambo':
      // Lamborghini Aventador SVJ — Razor-sharp origami wedge, Y-LEDs front & rear, hexagonal V12 louvers
      return {
        bodyWidth: 2.08,
        cabinWidth: 1.32,
        wheelBaseHalf: 1.4,
        wheelRadius: 0.355,
        rearWheelRadius: 0.375,
        tireWidth: 0.31,
        rearTireWidth: 0.35,
        trackHalf: 1.01,
        beltlineY: 0.69,
        roofY: 1.09,
        mirrorY: 0.78,
        mirrorZ: -0.64,
        wingY: 1.08,
        wingZ: 2.1,
        greenhouse: 'wedge',
        caliperColor: 0xf59e0b,
        carbonRoof: true,
        sculpt: {
          subdivisions: 2,
          wheelBaseHalf: 1.4,
          frontWheelRadius: 0.355,
          rearWheelRadius: 0.375,
          waistPinch: 0.048,
          fenderFlare: 0.052,
          hoodRidge: 0.018,
          creaseAngleDeg: 20,
        },
        stations: [
          { z: -2.36, bottomY: 0.14, bottomHalfW: 0.8, rockerY: 0.26, rockerHalfW: 0.94, beltY: 0.43, beltHalfW: 0.91, shoulderY: 0.49, shoulderHalfW: 0.8, crownY: 0.51 },
          { z: -1.84, bottomY: 0.14, bottomHalfW: 0.91, rockerY: 0.3, rockerHalfW: 1.03, beltY: 0.63, beltHalfW: 1.01, shoulderY: 0.7, shoulderHalfW: 0.9, crownY: 0.71 },
          { z: -0.82, bottomY: 0.15, bottomHalfW: 0.88, rockerY: 0.33, rockerHalfW: 0.98, beltY: 0.69, beltHalfW: 0.97, shoulderY: 0.74, shoulderHalfW: 0.88, crownY: 0.75 },
          { z: 0.94, bottomY: 0.16, bottomHalfW: 0.96, rockerY: 0.37, rockerHalfW: 1.07, beltY: 0.78, beltHalfW: 1.06, shoulderY: 0.83, shoulderHalfW: 0.95, crownY: 0.84 },
          { z: 2.02, bottomY: 0.2, bottomHalfW: 0.92, rockerY: 0.4, rockerHalfW: 1.02, beltY: 0.77, beltHalfW: 1.0, shoulderY: 0.82, shoulderHalfW: 0.9, crownY: 0.82 },
          { z: 2.22, bottomY: 0.27, bottomHalfW: 0.83, rockerY: 0.42, rockerHalfW: 0.93, beltY: 0.73, beltHalfW: 0.9, shoulderY: 0.78, shoulderHalfW: 0.82, crownY: 0.79 },
        ],
        cabin: [
          { z: -1.04, baseY: 0.67, baseHalfW: 0.72, roofY: 0.72, roofHalfW: 0.66, crownY: 0.73 },
          { z: -0.34, baseY: 0.69, baseHalfW: 0.68, roofY: 1.07, roofHalfW: 0.52, crownY: 1.1 },
          { z: 0.56, baseY: 0.71, baseHalfW: 0.67, roofY: 1.06, roofHalfW: 0.5, crownY: 1.09 },
          { z: 1.62, baseY: 0.76, baseHalfW: 0.72, roofY: 0.81, roofHalfW: 0.62, crownY: 0.82 },
        ],
        plateCoords: { rearY: 0.37, rearZ: 2.29, frontY: 0.28, frontZ: -2.435 },
        exhaustLayout: { xList: [-0.2, 0.2], y: 0.54, z: 2.24, radius: 0.06, titanium: true },
      };

    case 'mclarenp1':
      // McLaren P1 GTR — Shrink-wrapped organic sculpture, boomerang LEDs, roof snorkel, ribbon loop taillights
      return {
        bodyWidth: 2.04,
        cabinWidth: 1.28,
        wheelBaseHalf: 1.36,
        wheelRadius: 0.35,
        rearWheelRadius: 0.37,
        tireWidth: 0.3,
        rearTireWidth: 0.34,
        trackHalf: 0.99,
        beltlineY: 0.7,
        roofY: 1.12,
        mirrorY: 0.8,
        mirrorZ: -0.58,
        wingY: 1.16,
        wingZ: 2.06,
        greenhouse: 'teardrop',
        caliperColor: 0xf59e0b,
        carbonRoof: true,
        visorCanopy: true,
        sculpt: {
          subdivisions: 3,
          wheelBaseHalf: 1.36,
          frontWheelRadius: 0.35,
          rearWheelRadius: 0.37,
          waistPinch: 0.13,
          fenderFlare: 0.056,
          hoodRidge: -0.02,
          creaseAngleDeg: 40,
        },
        stations: [
          { z: -2.3, bottomY: 0.14, bottomHalfW: 0.75, rockerY: 0.27, rockerHalfW: 0.89, beltY: 0.45, beltHalfW: 0.87, shoulderY: 0.52, shoulderHalfW: 0.76, crownY: 0.53 },
          { z: -1.78, bottomY: 0.14, bottomHalfW: 0.88, rockerY: 0.31, rockerHalfW: 1.0, beltY: 0.65, beltHalfW: 0.98, shoulderY: 0.73, shoulderHalfW: 0.86, crownY: 0.71 },
          { z: -0.74, bottomY: 0.15, bottomHalfW: 0.81, rockerY: 0.33, rockerHalfW: 0.91, beltY: 0.7, beltHalfW: 0.9, shoulderY: 0.75, shoulderHalfW: 0.81, crownY: 0.76 },
          { z: 0.92, bottomY: 0.16, bottomHalfW: 0.94, rockerY: 0.37, rockerHalfW: 1.04, beltY: 0.79, beltHalfW: 1.03, shoulderY: 0.85, shoulderHalfW: 0.91, crownY: 0.85 },
          { z: 1.98, bottomY: 0.21, bottomHalfW: 0.89, rockerY: 0.4, rockerHalfW: 0.99, beltY: 0.77, beltHalfW: 0.96, shoulderY: 0.82, shoulderHalfW: 0.86, crownY: 0.82 },
          { z: 2.18, bottomY: 0.28, bottomHalfW: 0.78, rockerY: 0.42, rockerHalfW: 0.88, beltY: 0.72, beltHalfW: 0.85, shoulderY: 0.77, shoulderHalfW: 0.77, crownY: 0.78 },
        ],
        cabin: [
          { z: -0.94, baseY: 0.68, baseHalfW: 0.68, roofY: 0.74, roofHalfW: 0.62, crownY: 0.76 },
          { z: -0.32, baseY: 0.7, baseHalfW: 0.65, roofY: 1.1, roofHalfW: 0.5, crownY: 1.14 },
          { z: 0.54, baseY: 0.72, baseHalfW: 0.64, roofY: 1.08, roofHalfW: 0.47, crownY: 1.12 },
          { z: 1.48, baseY: 0.75, baseHalfW: 0.67, roofY: 0.82, roofHalfW: 0.57, crownY: 0.84 },
        ],
        plateCoords: { rearY: 0.39, rearZ: 2.25, frontY: 0.28, frontZ: -2.375 },
        exhaustLayout: { xList: [-0.09, 0.09], y: 0.62, z: 2.19, radius: 0.068, titanium: true },
      };

    case 'bugatti':
      // Bugatti Chiron W16 — Iconic horseshoe grille, quad-LED eyes, chrome C-line, single crimson lightbar
      return {
        bodyWidth: 2.08,
        cabinWidth: 1.42,
        wheelBaseHalf: 1.38,
        wheelRadius: 0.36,
        rearWheelRadius: 0.38,
        tireWidth: 0.31,
        rearTireWidth: 0.36,
        trackHalf: 1.01,
        beltlineY: 0.76,
        roofY: 1.17,
        mirrorY: 0.84,
        mirrorZ: -0.52,
        wingY: 0.96,
        wingZ: 2.08,
        greenhouse: 'teardrop',
        caliperColor: 0x0ea5e9,
        hasRoofFin: true,
        sculpt: {
          subdivisions: 3,
          wheelBaseHalf: 1.38,
          frontWheelRadius: 0.36,
          rearWheelRadius: 0.38,
          waistPinch: 0.056,
          fenderFlare: 0.048,
          hoodRidge: 0.015,
          creaseAngleDeg: 38,
        },
        stations: [
          { z: -2.28, bottomY: 0.16, bottomHalfW: 0.81, rockerY: 0.32, rockerHalfW: 0.94, beltY: 0.54, beltHalfW: 0.92, shoulderY: 0.61, shoulderHalfW: 0.82, crownY: 0.64 },
          { z: -1.8, bottomY: 0.16, bottomHalfW: 0.91, rockerY: 0.36, rockerHalfW: 1.03, beltY: 0.7, beltHalfW: 1.01, shoulderY: 0.77, shoulderHalfW: 0.91, crownY: 0.79 },
          { z: -0.74, bottomY: 0.17, bottomHalfW: 0.9, rockerY: 0.38, rockerHalfW: 1.0, beltY: 0.76, beltHalfW: 0.99, shoulderY: 0.81, shoulderHalfW: 0.89, crownY: 0.82 },
          { z: 0.94, bottomY: 0.18, bottomHalfW: 0.96, rockerY: 0.4, rockerHalfW: 1.07, beltY: 0.83, beltHalfW: 1.06, shoulderY: 0.88, shoulderHalfW: 0.95, crownY: 0.89 },
          { z: 2.0, bottomY: 0.22, bottomHalfW: 0.92, rockerY: 0.42, rockerHalfW: 1.02, beltY: 0.81, beltHalfW: 1.0, shoulderY: 0.85, shoulderHalfW: 0.9, crownY: 0.86 },
          { z: 2.2, bottomY: 0.28, bottomHalfW: 0.84, rockerY: 0.44, rockerHalfW: 0.94, beltY: 0.77, beltHalfW: 0.91, shoulderY: 0.81, shoulderHalfW: 0.83, crownY: 0.82 },
        ],
        cabin: [
          { z: -0.9, baseY: 0.74, baseHalfW: 0.74, roofY: 0.8, roofHalfW: 0.69, crownY: 0.82 },
          { z: -0.26, baseY: 0.76, baseHalfW: 0.72, roofY: 1.15, roofHalfW: 0.56, crownY: 1.19 },
          { z: 0.64, baseY: 0.78, baseHalfW: 0.71, roofY: 1.14, roofHalfW: 0.54, crownY: 1.18 },
          { z: 1.56, baseY: 0.8, baseHalfW: 0.74, roofY: 0.86, roofHalfW: 0.64, crownY: 0.88 },
        ],
        plateCoords: { rearY: 0.47, rearZ: 2.27, frontY: 0.28, frontZ: -2.355 },
        exhaustLayout: {
          xList: [-0.46, -0.26, 0.26, 0.46],
          y: 0.29,
          z: 2.21,
          radius: 0.048,
          rectangular: true,
        },
      };

    case 'jesko':
      // Koenigsegg Jesko — Wraparound jet-fighter glass canopy, top-mounted swan-neck mega wing
      return {
        bodyWidth: 2.06,
        cabinWidth: 1.3,
        wheelBaseHalf: 1.4,
        wheelRadius: 0.355,
        rearWheelRadius: 0.38,
        tireWidth: 0.3,
        rearTireWidth: 0.35,
        trackHalf: 1.0,
        beltlineY: 0.7,
        roofY: 1.13,
        mirrorY: 0.79,
        mirrorZ: -0.64,
        wingY: 1.24,
        wingZ: 2.12,
        greenhouse: 'teardrop',
        caliperColor: 0xf59e0b,
        carbonRoof: true,
        visorCanopy: true,
        sculpt: {
          subdivisions: 3,
          wheelBaseHalf: 1.4,
          frontWheelRadius: 0.355,
          rearWheelRadius: 0.38,
          waistPinch: 0.095,
          fenderFlare: 0.052,
          hoodRidge: 0.015,
          creaseAngleDeg: 32,
        },
        stations: [
          { z: -2.4, bottomY: 0.14, bottomHalfW: 0.78, rockerY: 0.26, rockerHalfW: 0.92, beltY: 0.43, beltHalfW: 0.89, shoulderY: 0.5, shoulderHalfW: 0.77, crownY: 0.52 },
          { z: -1.84, bottomY: 0.14, bottomHalfW: 0.9, rockerY: 0.3, rockerHalfW: 1.02, beltY: 0.64, beltHalfW: 1.0, shoulderY: 0.72, shoulderHalfW: 0.88, crownY: 0.72 },
          { z: -0.8, bottomY: 0.15, bottomHalfW: 0.86, rockerY: 0.33, rockerHalfW: 0.96, beltY: 0.7, beltHalfW: 0.95, shoulderY: 0.76, shoulderHalfW: 0.85, crownY: 0.77 },
          { z: 0.96, bottomY: 0.16, bottomHalfW: 0.96, rockerY: 0.37, rockerHalfW: 1.06, beltY: 0.79, beltHalfW: 1.05, shoulderY: 0.85, shoulderHalfW: 0.93, crownY: 0.85 },
          { z: 2.08, bottomY: 0.21, bottomHalfW: 0.91, rockerY: 0.4, rockerHalfW: 1.0, beltY: 0.77, beltHalfW: 0.97, shoulderY: 0.82, shoulderHalfW: 0.87, crownY: 0.83 },
          { z: 2.3, bottomY: 0.27, bottomHalfW: 0.81, rockerY: 0.42, rockerHalfW: 0.9, beltY: 0.72, beltHalfW: 0.87, shoulderY: 0.77, shoulderHalfW: 0.79, crownY: 0.78 },
        ],
        cabin: [
          { z: -1.0, baseY: 0.68, baseHalfW: 0.7, roofY: 0.74, roofHalfW: 0.64, crownY: 0.76 },
          { z: -0.34, baseY: 0.7, baseHalfW: 0.66, roofY: 1.11, roofHalfW: 0.51, crownY: 1.15 },
          { z: 0.56, baseY: 0.72, baseHalfW: 0.65, roofY: 1.09, roofHalfW: 0.48, crownY: 1.13 },
          { z: 1.54, baseY: 0.75, baseHalfW: 0.68, roofY: 0.82, roofHalfW: 0.58, crownY: 0.84 },
        ],
        plateCoords: { rearY: 0.36, rearZ: 2.37, frontY: 0.28, frontZ: -2.475 },
        exhaustLayout: { xList: [0], y: 0.54, z: 2.31, radius: 0.082, titanium: true },
      };

    case 'f1':
      // Open-Wheel Formula 1 Monoposto — Slim nosecone, sculpted sidepods, Halo, exposed suspension
      return {
        bodyWidth: 1.24,
        cabinWidth: 0.64,
        wheelBaseHalf: 1.54,
        wheelRadius: 0.36,
        rearWheelRadius: 0.38,
        tireWidth: 0.34,
        rearTireWidth: 0.42,
        trackHalf: 0.98,
        beltlineY: 0.56,
        roofY: 0.94,
        mirrorY: 0.66,
        mirrorZ: -0.52,
        wingY: 1.0,
        wingZ: 2.02,
        greenhouse: 'monoposto',
        caliperColor: 0xdc2626,
        sculpt: {
          subdivisions: 2,
          creaseAngleDeg: 32,
        },
        stations: [
          { z: -2.46, bottomY: 0.22, bottomHalfW: 0.14, rockerY: 0.26, rockerHalfW: 0.17, beltY: 0.34, beltHalfW: 0.16, shoulderY: 0.38, shoulderHalfW: 0.12, crownY: 0.4 },
          { z: -1.55, bottomY: 0.18, bottomHalfW: 0.22, rockerY: 0.28, rockerHalfW: 0.28, beltY: 0.46, beltHalfW: 0.27, shoulderY: 0.53, shoulderHalfW: 0.21, crownY: 0.56 },
          { z: -0.62, bottomY: 0.14, bottomHalfW: 0.34, rockerY: 0.26, rockerHalfW: 0.42, beltY: 0.56, beltHalfW: 0.4, shoulderY: 0.62, shoulderHalfW: 0.31, crownY: 0.64 },
          { z: 0.22, bottomY: 0.14, bottomHalfW: 0.62, rockerY: 0.28, rockerHalfW: 0.68, beltY: 0.58, beltHalfW: 0.62, shoulderY: 0.66, shoulderHalfW: 0.44, crownY: 0.72 },
          { z: 1.25, bottomY: 0.15, bottomHalfW: 0.44, rockerY: 0.28, rockerHalfW: 0.48, beltY: 0.54, beltHalfW: 0.42, shoulderY: 0.66, shoulderHalfW: 0.26, crownY: 0.76 },
          { z: 2.12, bottomY: 0.22, bottomHalfW: 0.22, rockerY: 0.34, rockerHalfW: 0.24, beltY: 0.5, beltHalfW: 0.2, shoulderY: 0.56, shoulderHalfW: 0.14, crownY: 0.58 },
        ],
        cabin: [
          { z: -0.42, baseY: 0.56, baseHalfW: 0.28, roofY: 0.62, roofHalfW: 0.24, crownY: 0.64 },
          { z: 0.18, baseY: 0.62, baseHalfW: 0.26, roofY: 0.92, roofHalfW: 0.16, crownY: 0.96 },
          { z: 0.76, baseY: 0.62, baseHalfW: 0.22, roofY: 0.88, roofHalfW: 0.12, crownY: 0.92 },
          { z: 1.48, baseY: 0.58, baseHalfW: 0.18, roofY: 0.68, roofHalfW: 0.1, crownY: 0.7 },
        ],
        plateCoords: { rearY: 0.62, rearZ: 2.18, frontY: 0.31, frontZ: -2.51, frontScale: 0.62, rearScale: 0.72 },
        exhaustLayout: { xList: [0], y: 0.44, z: 2.14, radius: 0.056, titanium: true },
      };

    case 'pagani':
      // Pagani Utopia V12 — Sculpted Italian teardrop art-car with iconic center-quad titanium exhausts
      return {
        bodyWidth: 2.06,
        cabinWidth: 1.32,
        wheelBaseHalf: 1.42,
        wheelRadius: 0.355,
        rearWheelRadius: 0.385,
        tireWidth: 0.31,
        rearTireWidth: 0.37,
        trackHalf: 0.94,
        beltlineY: 0.74,
        roofY: 1.1,
        mirrorY: 0.85,
        mirrorZ: -0.78,
        wingY: 0.96,
        wingZ: 2.14,
        greenhouse: 'teardrop',
        caliperColor: 0xd4af37,
        carbonRoof: true,
        visorCanopy: true,
        sculpt: {
          subdivisions: 3,
          wheelBaseHalf: 1.42,
          frontWheelRadius: 0.355,
          rearWheelRadius: 0.385,
          waistPinch: 0.11,
          fenderFlare: 0.058,
          hoodRidge: 0.014,
          creaseAngleDeg: 34,
        },
        stations: [
          { z: -2.38, bottomY: 0.145, bottomHalfW: 0.74, rockerY: 0.27, rockerHalfW: 0.9, beltY: 0.45, beltHalfW: 0.87, shoulderY: 0.53, shoulderHalfW: 0.74, crownY: 0.55 },
          { z: -1.78, bottomY: 0.145, bottomHalfW: 0.92, rockerY: 0.31, rockerHalfW: 1.03, beltY: 0.65, beltHalfW: 1.0, shoulderY: 0.73, shoulderHalfW: 0.87, crownY: 0.73 },
          { z: -0.72, bottomY: 0.15, bottomHalfW: 0.85, rockerY: 0.33, rockerHalfW: 0.94, beltY: 0.7, beltHalfW: 0.93, shoulderY: 0.76, shoulderHalfW: 0.83, crownY: 0.77 },
          { z: 0.92, bottomY: 0.16, bottomHalfW: 0.97, rockerY: 0.38, rockerHalfW: 1.06, beltY: 0.79, beltHalfW: 1.05, shoulderY: 0.85, shoulderHalfW: 0.92, crownY: 0.86 },
          { z: 2.02, bottomY: 0.21, bottomHalfW: 0.91, rockerY: 0.4, rockerHalfW: 1.0, beltY: 0.78, beltHalfW: 0.97, shoulderY: 0.84, shoulderHalfW: 0.86, crownY: 0.85 },
          { z: 2.32, bottomY: 0.27, bottomHalfW: 0.78, rockerY: 0.42, rockerHalfW: 0.88, beltY: 0.73, beltHalfW: 0.84, shoulderY: 0.78, shoulderHalfW: 0.74, crownY: 0.79 },
        ],
        cabin: [
          { z: -1.04, baseY: 0.69, baseHalfW: 0.69, roofY: 0.74, roofHalfW: 0.63, crownY: 0.76 },
          { z: -0.32, baseY: 0.71, baseHalfW: 0.65, roofY: 1.08, roofHalfW: 0.49, crownY: 1.12 },
          { z: 0.56, baseY: 0.72, baseHalfW: 0.63, roofY: 1.06, roofHalfW: 0.45, crownY: 1.1 },
          { z: 1.56, baseY: 0.76, baseHalfW: 0.66, roofY: 0.83, roofHalfW: 0.54, crownY: 0.85 },
        ],
        plateCoords: { rearY: 0.36, rearZ: 2.39, frontY: 0.29, frontZ: -2.47 },
        exhaustLayout: { xList: [-0.085, 0.085], y: 0.6, z: 2.33, radius: 0.056, titanium: true },
      };

    case 'bolide':
      // Bugatti Bolide X — Track-focused LMP hyper-prototype with X-lights & full dorsal shark fin
      return {
        bodyWidth: 2.12,
        cabinWidth: 1.24,
        wheelBaseHalf: 1.46,
        wheelRadius: 0.355,
        rearWheelRadius: 0.385,
        tireWidth: 0.33,
        rearTireWidth: 0.4,
        trackHalf: 0.97,
        beltlineY: 0.72,
        roofY: 1.04,
        mirrorY: 0.8,
        mirrorZ: -0.78,
        wingY: 1.12,
        wingZ: 2.24,
        greenhouse: 'teardrop',
        caliperColor: 0x2563eb,
        carbonRoof: true,
        visorCanopy: true,
        sculpt: {
          subdivisions: 3,
          wheelBaseHalf: 1.46,
          frontWheelRadius: 0.355,
          rearWheelRadius: 0.385,
          waistPinch: 0.13,
          fenderFlare: 0.068,
          hoodRidge: 0.018,
          creaseAngleDeg: 30,
        },
        stations: [
          { z: -2.44, bottomY: 0.135, bottomHalfW: 0.76, rockerY: 0.24, rockerHalfW: 0.94, beltY: 0.41, beltHalfW: 0.92, shoulderY: 0.48, shoulderHalfW: 0.78, crownY: 0.5 },
          { z: -1.82, bottomY: 0.135, bottomHalfW: 0.94, rockerY: 0.29, rockerHalfW: 1.06, beltY: 0.64, beltHalfW: 1.04, shoulderY: 0.72, shoulderHalfW: 0.92, crownY: 0.7 },
          { z: -0.76, bottomY: 0.14, bottomHalfW: 0.84, rockerY: 0.31, rockerHalfW: 0.94, beltY: 0.67, beltHalfW: 0.92, shoulderY: 0.73, shoulderHalfW: 0.8, crownY: 0.74 },
          { z: 0.96, bottomY: 0.145, bottomHalfW: 0.99, rockerY: 0.36, rockerHalfW: 1.09, beltY: 0.77, beltHalfW: 1.08, shoulderY: 0.83, shoulderHalfW: 0.96, crownY: 0.82 },
          { z: 2.08, bottomY: 0.19, bottomHalfW: 0.94, rockerY: 0.38, rockerHalfW: 1.04, beltY: 0.76, beltHalfW: 1.01, shoulderY: 0.81, shoulderHalfW: 0.9, crownY: 0.81 },
          { z: 2.36, bottomY: 0.25, bottomHalfW: 0.84, rockerY: 0.4, rockerHalfW: 0.94, beltY: 0.71, beltHalfW: 0.91, shoulderY: 0.76, shoulderHalfW: 0.82, crownY: 0.77 },
        ],
        cabin: [
          { z: -1.04, baseY: 0.66, baseHalfW: 0.64, roofY: 0.72, roofHalfW: 0.56, crownY: 0.74 },
          { z: -0.34, baseY: 0.68, baseHalfW: 0.6, roofY: 1.02, roofHalfW: 0.43, crownY: 1.06 },
          { z: 0.52, baseY: 0.7, baseHalfW: 0.58, roofY: 1.01, roofHalfW: 0.4, crownY: 1.05 },
          { z: 1.54, baseY: 0.74, baseHalfW: 0.56, roofY: 0.8, roofHalfW: 0.42, crownY: 0.82 },
        ],
        plateCoords: { rearY: 0.37, rearZ: 2.43, frontY: 0.28, frontZ: -2.51 },
        exhaustLayout: { xList: [-0.15, -0.05, 0.05, 0.15], y: 0.52, z: 2.37, radius: 0.044, titanium: true },
      };

    case 'solaris':
      // Apex Solaris Vision — Ultra-wide futuristic concept hypercar with flying buttresses & infinity halo LEDs
      return {
        bodyWidth: 2.14,
        cabinWidth: 1.28,
        wheelBaseHalf: 1.48,
        wheelRadius: 0.36,
        rearWheelRadius: 0.39,
        tireWidth: 0.34,
        rearTireWidth: 0.41,
        trackHalf: 0.98,
        beltlineY: 0.71,
        roofY: 1.05,
        mirrorY: 0.81,
        mirrorZ: -0.82,
        wingY: 1.06,
        wingZ: 2.26,
        greenhouse: 'wedge',
        caliperColor: 0x06b6d4,
        carbonRoof: true,
        visorCanopy: true,
        sculpt: {
          subdivisions: 3,
          wheelBaseHalf: 1.48,
          frontWheelRadius: 0.36,
          rearWheelRadius: 0.39,
          waistPinch: 0.125,
          fenderFlare: 0.064,
          hoodRidge: 0.016,
          creaseAngleDeg: 28,
        },
        stations: [
          { z: -2.48, bottomY: 0.135, bottomHalfW: 0.8, rockerY: 0.24, rockerHalfW: 0.96, beltY: 0.4, beltHalfW: 0.95, shoulderY: 0.46, shoulderHalfW: 0.82, crownY: 0.48 },
          { z: -1.84, bottomY: 0.135, bottomHalfW: 0.96, rockerY: 0.28, rockerHalfW: 1.08, beltY: 0.62, beltHalfW: 1.06, shoulderY: 0.7, shoulderHalfW: 0.94, crownY: 0.69 },
          { z: -0.78, bottomY: 0.14, bottomHalfW: 0.86, rockerY: 0.31, rockerHalfW: 0.96, beltY: 0.68, beltHalfW: 0.94, shoulderY: 0.74, shoulderHalfW: 0.83, crownY: 0.75 },
          { z: 0.96, bottomY: 0.145, bottomHalfW: 1.0, rockerY: 0.36, rockerHalfW: 1.1, beltY: 0.77, beltHalfW: 1.09, shoulderY: 0.83, shoulderHalfW: 0.98, crownY: 0.83 },
          { z: 2.1, bottomY: 0.19, bottomHalfW: 0.96, rockerY: 0.39, rockerHalfW: 1.05, beltY: 0.77, beltHalfW: 1.03, shoulderY: 0.82, shoulderHalfW: 0.92, crownY: 0.82 },
          { z: 2.4, bottomY: 0.25, bottomHalfW: 0.86, rockerY: 0.41, rockerHalfW: 0.96, beltY: 0.72, beltHalfW: 0.93, shoulderY: 0.78, shoulderHalfW: 0.84, crownY: 0.79 },
        ],
        cabin: [
          { z: -1.12, baseY: 0.65, baseHalfW: 0.67, roofY: 0.71, roofHalfW: 0.6, crownY: 0.73 },
          { z: -0.36, baseY: 0.67, baseHalfW: 0.63, roofY: 1.03, roofHalfW: 0.47, crownY: 1.07 },
          { z: 0.54, baseY: 0.69, baseHalfW: 0.61, roofY: 1.02, roofHalfW: 0.44, crownY: 1.06 },
          { z: 1.62, baseY: 0.74, baseHalfW: 0.6, roofY: 0.8, roofHalfW: 0.48, crownY: 0.82 },
        ],
        plateCoords: { rearY: 0.36, rearZ: 2.47, frontY: 0.28, frontZ: -2.555 },
        exhaustLayout: { xList: [-0.26, 0.26], y: 0.49, z: 2.41, radius: 0.064, rectangular: true, titanium: true },
      };
  }
}

/**
 * Adds bespoke model-specific bodywork features: hoods, scoops, visible V12/W16 engines,
 * side air intakes, Chiron C-line, Raptor rollbar, Porsche fender barrels, F1 aero & Halo.
 */
export function buildModelBodyFeatures(ctx: FeatureBuildContext): void {
  const { modelId, bp, chassisGroup, mats, unitBoxGeo, trackGeo, trackMat } = ctx;
  const { bodyWidth, trackHalf, wheelBaseHalf, roofY } = bp;

  if (modelId === 'dogan') {
    // Classic Fiat 131 / Doğan black side rub strips + chrome-trimmed black bumpers + rear trunk lip
    const moldingGeo = trackGeo(new THREE.BoxGeometry(0.036, 0.062, 2.28));
    for (const sx of [-(bodyWidth * 0.5 + 0.016), bodyWidth * 0.5 + 0.016]) {
      const strip = new THREE.Mesh(moldingGeo, mats.matteTrim);
      strip.position.set(sx, 0.55, 0.04);
      chassisGroup.add(strip);
    }
    const bumperGeo = trackGeo(new THREE.BoxGeometry(bodyWidth + 0.1, 0.15, 0.22));
    const chromeTrimGeo = trackGeo(new THREE.BoxGeometry(bodyWidth + 0.12, 0.028, 0.24));
    for (const bz of [-2.07, 2.06]) {
      const bmp = new THREE.Mesh(bumperGeo, mats.matteTrim);
      bmp.position.set(0, 0.34, bz);
      bmp.castShadow = true;
      chassisGroup.add(bmp);
      const trim = new THREE.Mesh(chromeTrimGeo, mats.chrome);
      trim.position.set(0, 0.385, bz);
      chassisGroup.add(trim);
    }
    const trunkLip = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(bodyWidth - 0.12, 0.044, 0.12)),
      mats.matteTrim,
    );
    trunkLip.position.set(0, 0.85, 2.0);
    chassisGroup.add(trunkLip);
  } else if (modelId === 'hatch') {
    // Signature GTI glowing crimson grille accent bar + black diffuser inserts
    const gtiRedMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xe11d48,
        emissive: 0x9f1239,
        emissiveIntensity: 0.55,
        roughness: 0.24,
        metalness: 0.45,
      }),
    );
    const redStripe = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.42, 0.032, 0.055)),
      gtiRedMat,
    );
    redStripe.position.set(0, 0.58, -1.955);
    chassisGroup.add(redStripe);
  } else if (modelId === 'gt') {
    // Dual carbon hood heat extractors + sculpted side fender vents
    const hoodY = sampleBodyStationAtZ(bp.stations, -1.28).crownY;
    for (const sx of [-0.36, 0.36]) {
      const hoodVent = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.24, 0.026, 0.42)),
        mats.carbon,
      );
      hoodVent.position.set(sx, hoodY + 0.022, -1.28);
      hoodVent.rotation.x = 0.1;
      chassisGroup.add(hoodVent);
    }
    const sideSt = sampleBodyStationAtZ(bp.stations, -0.78);
    for (const side of [-1, 1]) {
      const gill = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.03, 0.16, 0.32)),
        mats.carbon,
      );
      gill.position.set(side * (sideSt.beltHalfW + 0.012), 0.58, -0.78);
      chassisGroup.add(gill);
    }
  } else if (modelId === 'rally') {
    // Functional STI/Evo hood intercooler scoop + roof vent + 4-lamp WRC night stage pod + 4 mudflaps
    const hoodY = sampleBodyStationAtZ(bp.stations, -1.24).crownY;
    const scoop = new THREE.Mesh(
      trackGeo(
        createExtrudedShapeGeo(
          [
            [-0.26, 0],
            [0.32, 0],
            [0.24, 0.11],
            [-0.24, 0.12],
          ],
          0.66,
          0.02,
        ),
      ),
      mats.carbon,
    );
    scoop.position.set(0, hoodY - 0.01, -1.24);
    chassisGroup.add(scoop);

    const roofScoop = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.28, 0.075, 0.36)),
      mats.carbon,
    );
    roofScoop.position.set(0, roofY + 0.038, -0.05);
    chassisGroup.add(roofScoop);

    // 4-Lamp WRC Rally Light Pod
    const podHousing = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.96, 0.16, 0.2)),
      mats.matteTrim,
    );
    podHousing.position.set(0, 0.72, -2.07);
    chassisGroup.add(podHousing);

    const podLampGeo = trackGeo(new THREE.CylinderGeometry(0.064, 0.064, 0.06, 16));
    podLampGeo.rotateX(Math.PI / 2);
    for (const lx of [-0.34, -0.115, 0.115, 0.34]) {
      const lamp = new THREE.Mesh(podLampGeo, mats.headLight);
      lamp.position.set(lx, 0.72, -2.155);
      chassisGroup.add(lamp);
    }

    // WRC Mudflaps behind all 4 wheels
    const flapGeo = trackGeo(new THREE.BoxGeometry(0.3, 0.22, 0.024));
    for (const [fx, fz] of [
      [-trackHalf, -wheelBaseHalf + 0.37],
      [trackHalf, -wheelBaseHalf + 0.37],
      [-trackHalf, wheelBaseHalf + 0.37],
      [trackHalf, wheelBaseHalf + 0.37],
    ]) {
      const flap = new THREE.Mesh(flapGeo, mats.matteTrim);
      flap.position.set(fx, 0.18, fz);
      chassisGroup.add(flap);
    }
  } else if (modelId === 'pickup') {
    // Dark textured bed liner inside the TRUE recessed pickup bed + tubular rollbar + roof LED bar + steel skid plate
    const bedLiner = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.56, 0.04, 1.44)),
      mats.matteTrim,
    );
    bedLiner.position.set(0, 0.755, 1.42);
    chassisGroup.add(bedLiner);

    // Heavy-duty tubular sport rollbar behind crew cab
    const rollBarGeo = trackGeo(new THREE.CylinderGeometry(0.048, 0.048, 0.56, 10));
    for (const sx of [-0.82, 0.82]) {
      const post = new THREE.Mesh(rollBarGeo, mats.carbon);
      post.position.set(sx, 1.32, 0.84);
      chassisGroup.add(post);

      // Diagonal bed-rail brace
      addOrientedStrut(
        chassisGroup,
        unitBoxGeo,
        [sx, 1.56, 0.84],
        [sx, 1.09, 1.44],
        0.06,
        0.06,
        mats.carbon,
        [Math.sign(sx), 0, 0],
        0.02,
      );
    }
    const crossBarGeo = trackGeo(new THREE.CylinderGeometry(0.048, 0.048, 1.7, 10));
    crossBarGeo.rotateZ(Math.PI / 2);
    const crossBar = new THREE.Mesh(crossBarGeo, mats.carbon);
    crossBar.position.set(0, 1.58, 0.84);
    chassisGroup.add(crossBar);

    // Roof offroad LED bar
    const lightBarFrame = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.3, 0.11, 0.16)),
      mats.matteTrim,
    );
    lightBarFrame.position.set(0, 1.7, -0.4);
    chassisGroup.add(lightBarFrame);
    const lightBar = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.22, 0.072, 0.12)),
      mats.headLight,
    );
    lightBar.position.set(0, 1.7, -0.45);
    chassisGroup.add(lightBar);

    // Front brushed steel bash skid plate
    const skid = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.18, 0.26, 0.16)),
      mats.chrome,
    );
    skid.position.set(0, 0.42, -2.26);
    skid.rotation.x = -0.35;
    chassisGroup.add(skid);
  } else if (modelId === 'muscle') {
    // Sculpted V8 shaker hood scoop + dual hood vents + fastback quarter window louvers + rear ducktail
    const hoodY = sampleBodyStationAtZ(bp.stations, -1.32).crownY;
    const shakerDome = new THREE.Mesh(
      trackGeo(
        createExtrudedShapeGeo(
          [
            [-0.46, 0],
            [0.54, 0],
            [0.44, 0.092],
            [-0.38, 0.092],
          ],
          0.62,
          0.02,
        ),
      ),
      mats.carbon,
    );
    shakerDome.position.set(0, hoodY + 0.004, -1.32);
    chassisGroup.add(shakerDome);

    for (const sx of [-0.46, 0.46]) {
      const vent = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.14, 0.024, 0.46)),
        mats.glossBlack,
      );
      vent.position.set(sx, hoodY - 0.008, -1.24);
      vent.rotation.x = 0.06;
      chassisGroup.add(vent);
    }

    // Fastback side quarter louvers
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const louver = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.036, 0.026, 0.26)),
          mats.glossBlack,
        );
        louver.position.set(side * 0.72, 0.96 + i * 0.055, 0.96 + i * 0.02);
        louver.rotation.z = side * 0.35;
        chassisGroup.add(louver);
      }
    }

    const duck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(bodyWidth - 0.14, 0.11, 0.22)),
      mats.carbon,
    );
    duck.position.set(0, 0.91, 2.04);
    duck.rotation.x = -0.26;
    chassisGroup.add(duck);
  } else if (modelId === 'm3gtr') {
    // E46 M3 GTR V8 Hood Louvers + iconic BMW M fender side gills
    const hoodY = sampleBodyStationAtZ(bp.stations, -1.28).crownY;
    for (const sx of [-0.36, 0.36]) {
      for (let i = 0; i < 3; i++) {
        const louver = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.26, 0.02, 0.095)),
          mats.carbon,
        );
        louver.position.set(sx, hoodY + 0.018, -1.46 + i * 0.14);
        louver.rotation.x = 0.12;
        chassisGroup.add(louver);
      }
    }
    const gillSt = sampleBodyStationAtZ(bp.stations, -0.88);
    for (const side of [-1, 1]) {
      const gill = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.028, 0.08, 0.24)),
        mats.glossBlack,
      );
      gill.position.set(side * (gillSt.beltHalfW + 0.015), 0.72, -0.88);
      chassisGroup.add(gill);
      const chromeBar = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.034, 0.016, 0.2)),
        mats.chrome,
      );
      chromeBar.position.set(side * (gillSt.beltHalfW + 0.017), 0.72, -0.88);
      chassisGroup.add(chromeBar);
    }
  } else if (modelId === 'jdm') {
    // Exposed silver front-mount intercooler + chrome turbo charge pipes + NACA hood vent
    const intercooler = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.98, 0.23, 0.09)),
      mats.chrome,
    );
    intercooler.position.set(0, 0.31, -2.18);
    chassisGroup.add(intercooler);

    const pipeGeo = trackGeo(new THREE.CylinderGeometry(0.034, 0.034, 0.24, 10));
    pipeGeo.rotateZ(Math.PI / 2);
    for (const sx of [-0.55, 0.55]) {
      const pipe = new THREE.Mesh(pipeGeo, mats.chrome);
      pipe.position.set(sx, 0.31, -2.16);
      chassisGroup.add(pipe);
    }

    const hoodY = sampleBodyStationAtZ(bp.stations, -1.24).crownY;
    const vent = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.56, 0.03, 0.44)),
      mats.carbon,
    );
    vent.position.set(0, hoodY + 0.02, -1.24);
    vent.rotation.x = 0.07;
    chassisGroup.add(vent);
  } else if (modelId === 'porsche') {
    // Iconic Porsche 911 raised front fender barrels + rear engine decklid grille + GT3 RS fender louvers
    const fenderPodGeo = trackGeo(new THREE.CapsuleGeometry(0.185, 0.88, 8, 16));
    fenderPodGeo.rotateX(Math.PI / 2);
    for (const sx of [-0.67, 0.67]) {
      const pod = new THREE.Mesh(fenderPodGeo, mats.paint);
      pod.position.set(sx, 0.58, -1.48);
      pod.rotation.x = 0.14;
      chassisGroup.add(pod);

      // GT3 RS fender top extractor vents
      const vent = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.18, 0.024, 0.24)),
        mats.carbon,
      );
      vent.position.set(sx, 0.77, -1.26);
      vent.rotation.x = 0.12;
      chassisGroup.add(vent);
    }

    const deckY = sampleBodyStationAtZ(bp.stations, 1.5).crownY;
    const deckVent = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.06, 0.036, 0.42)),
      mats.grille,
    );
    deckVent.position.set(0, deckY + 0.02, 1.5);
    chassisGroup.add(deckVent);

    const ducktail = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(bodyWidth - 0.3, 0.075, 0.18)),
      mats.paint,
    );
    ducktail.position.set(0, 0.85, 1.9);
    ducktail.rotation.x = -0.2;
    chassisGroup.add(ducktail);
  } else if (modelId === 'amggt') {
    // Long V8 carbon hood extractor vents + front fender carbon side exits
    const hoodY = sampleBodyStationAtZ(bp.stations, -1.22).crownY;
    for (const sx of [-0.38, 0.38]) {
      const vent = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.28, 0.026, 0.56)),
        mats.carbon,
      );
      vent.position.set(sx, hoodY + 0.022, -1.22);
      vent.rotation.x = 0.08;
      chassisGroup.add(vent);
    }
    const sideSt = sampleBodyStationAtZ(bp.stations, -0.78);
    for (const side of [-1, 1]) {
      const vent = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.036, 0.18, 0.36)),
        mats.carbon,
      );
      vent.position.set(side * (sideSt.beltHalfW + 0.015), 0.56, -0.78);
      chassisGroup.add(vent);
    }
  } else if (modelId === 'hyper') {
    // Valkyrie dorsal shark fin + sculpted carbon Venturi underfloor tunnels + roof air intake
    const dorsal = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.06, 0.22, 1.02)),
      mats.carbon,
    );
    dorsal.position.set(0, 1.06, 0.94);
    chassisGroup.add(dorsal);

    const roofScoop = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.28, 0.1, 0.42)),
      mats.carbon,
    );
    roofScoop.position.set(0, 1.13, 0.18);
    chassisGroup.add(roofScoop);

    for (const side of [-1, 1]) {
      const tunnel = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.18, 0.26, 1.15)),
        mats.carbon,
      );
      tunnel.position.set(side * (bodyWidth * 0.45), 0.32, 0.05);
      chassisGroup.add(tunnel);
    }
  } else if (modelId === 'laferrari') {
    // Exposed glass engine cover showcasing bright crimson V12 intake plenums & gold headers + side air blades
    const bayGlass = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.86, 0.035, 0.92)),
      mats.glass,
    );
    bayGlass.position.set(0, 0.855, 1.38);
    bayGlass.rotation.x = 0.07;
    chassisGroup.add(bayGlass);

    // Sculpted V12 twin red intake manifolds + central carbon plenum
    for (const sx of [-0.21, 0.21]) {
      const bank = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.17, 0.12, 0.72)),
        mats.engineAccent,
      );
      bank.position.set(sx, 0.79, 1.38);
      bank.rotation.z = sx < 0 ? 0.26 : -0.26;
      chassisGroup.add(bank);
    }
    const plenum = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.16, 0.1, 0.68)),
      mats.carbon,
    );
    plenum.position.set(0, 0.81, 1.38);
    chassisGroup.add(plenum);

    // Sculpted side air-intake blades cutting into doors
    for (const side of [-1, 1]) {
      const scoop = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.18, 0.3, 0.82)),
        mats.carbon,
      );
      scoop.position.set(side * (bodyWidth * 0.46), 0.48, 0.42);
      scoop.rotation.y = side * -0.14;
      chassisGroup.add(scoop);
    }
  } else if (modelId === 'lambo') {
    // Massive side V12 intakes + staggered hexagonal carbon rear engine louvers + Y-intakes
    const intakeGeo = trackGeo(new THREE.BoxGeometry(0.22, 0.34, 0.98));
    for (const side of [-1, 1]) {
      const sx = side * (bodyWidth * 0.48);
      const intake = new THREE.Mesh(intakeGeo, mats.carbon);
      intake.position.set(sx, 0.5, 0.56);
      intake.rotation.y = side * -0.09;
      chassisGroup.add(intake);

      const mesh = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.036, 0.26, 0.74)),
        mats.grille,
      );
      mesh.position.set(sx + side * 0.11, 0.5, 0.56);
      mesh.rotation.y = side * -0.09;
      chassisGroup.add(mesh);
    }
    // Staggered hexagonal V12 engine deck louvers
    const slatGeo = trackGeo(new THREE.BoxGeometry(1.04, 0.038, 0.13));
    for (let i = 0; i < 4; i++) {
      const slat = new THREE.Mesh(slatGeo, mats.carbon);
      slat.position.set(0, 0.82 - i * 0.015, 0.96 + i * 0.22);
      slat.rotation.x = 0.2;
      chassisGroup.add(slat);
    }
  } else if (modelId === 'mclarenp1') {
    // Overhead carbon roof snorkel + sculpted hollow door air channels + rear mesh bay
    const snorkel = new THREE.Mesh(
      trackGeo(
        createExtrudedShapeGeo(
          [
            [-0.24, 0],
            [0.36, 0],
            [0.24, 0.11],
            [-0.22, 0.11],
          ],
          0.32,
          0.02,
        ),
      ),
      mats.carbon,
    );
    snorkel.position.set(0, 1.12, 0.18);
    chassisGroup.add(snorkel);

    for (const side of [-1, 1]) {
      const channel = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.19, 0.34, 0.98)),
        mats.carbon,
      );
      channel.position.set(side * (bodyWidth * 0.45), 0.5, 0.24);
      channel.rotation.y = side * -0.15;
      chassisGroup.add(channel);
    }
  } else if (modelId === 'bugatti') {
    // Iconic sweeping chrome/aluminum Bugatti "C-Line" framing the doors & side intake + exposed W16 deck
    const cArcGeo = trackGeo(
      new THREE.TorusGeometry(0.46, 0.028, 10, 24, Math.PI * 1.18),
    );
    cArcGeo.rotateY(Math.PI / 2);
    for (const side of [-1, 1]) {
      const cArc = new THREE.Mesh(cArcGeo, mats.chrome);
      cArc.position.set(side * (bodyWidth * 0.485), 0.68, 0.24);
      cArc.rotation.x = 0.18;
      chassisGroup.add(cArc);

      const intake = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.12, 0.36, 0.46)),
        mats.grille,
      );
      intake.position.set(side * (bodyWidth * 0.47), 0.56, 0.42);
      chassisGroup.add(intake);
    }
    // Exposed quad-turbo W16 rear spine & silver intake runners
    for (const sx of [-0.26, 0.26]) {
      const runner = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.16, 0.08, 0.68)),
        mats.chrome,
      );
      runner.position.set(sx, 0.88, 1.44);
      chassisGroup.add(runner);
    }
  } else if (modelId === 'jesko') {
    // Vertical front aero splitter fences + roof carbon air blade + gold V8 engine bay peek
    const fenceGeo = trackGeo(new THREE.BoxGeometry(0.036, 0.2, 0.36));
    for (const side of [-1, 1]) {
      const fence = new THREE.Mesh(fenceGeo, mats.carbon);
      fence.position.set(side * (bodyWidth * 0.48), 0.28, -2.18);
      chassisGroup.add(fence);

      const scoop = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.18, 0.3, 0.88)),
        mats.carbon,
      );
      scoop.position.set(side * (bodyWidth * 0.46), 0.5, 0.5);
      chassisGroup.add(scoop);
    }
    for (const sx of [-0.18, 0.18]) {
      const cover = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.15, 0.07, 0.64)),
        mats.engineAccent,
      );
      cover.position.set(sx, 0.85, 1.48);
      chassisGroup.add(cover);
    }
  } else if (modelId === 'f1') {
    // Full Open-Wheel Formula 1 Aerodynamic Package:
    // 3-element sweeping front wing + endplates + carbon sidepod radiator inlets + underfloor bargeboards
    // + exposed double-wishbone suspension + curved Halo + T-Cam + Shark Fin + Visored Driver Helmet!
    const fwMain = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.94, 0.045, 0.42)),
      mats.carbon,
    );
    fwMain.position.set(0, 0.14, -2.26);
    chassisGroup.add(fwMain);

    const fwUpper = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.86, 0.036, 0.2)),
      mats.paint,
    );
    fwUpper.position.set(0, 0.21, -2.14);
    fwUpper.rotation.x = 0.22;
    chassisGroup.add(fwUpper);

    const fwEndGeo = trackGeo(new THREE.BoxGeometry(0.04, 0.28, 0.54));
    for (const sx of [-0.97, 0.97]) {
      const endplate = new THREE.Mesh(fwEndGeo, mats.paint);
      endplate.position.set(sx, 0.24, -2.24);
      chassisGroup.add(endplate);
    }

    // Venturi floor plank & sculpted sidepod radiator inlets
    const floorPlank = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.52, 0.04, 2.38)),
      mats.carbon,
    );
    floorPlank.position.set(0, 0.12, 0.34);
    chassisGroup.add(floorPlank);

    for (const side of [-1, 1]) {
      const inlet = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.34, 0.22, 0.18)),
        mats.grille,
      );
      inlet.position.set(side * 0.44, 0.44, -0.18);
      chassisGroup.add(inlet);
    }

    // Exposed Carbon Double-Wishbone Suspension Arms (Front & Rear)
    const wishboneGeo = trackGeo(new THREE.BoxGeometry(1.76, 0.03, 0.075));
    for (const wz of [-wheelBaseHalf, wheelBaseHalf]) {
      const wbUpper = new THREE.Mesh(wishboneGeo, mats.carbon);
      wbUpper.position.set(0, 0.42, wz);
      chassisGroup.add(wbUpper);
      const wbLower = new THREE.Mesh(wishboneGeo, mats.carbon);
      wbLower.position.set(0, 0.28, wz);
      chassisGroup.add(wbLower);
    }

    // Curved Titanium/Carbon Halo + Overhead T-Cam + Shark Fin + Pilot Helmet with Visor
    const haloRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.28, 0.028, 10, 20, Math.PI * 1.15)),
      mats.carbon,
    );
    haloRing.rotation.x = Math.PI / 2 - 0.12;
    haloRing.rotation.z = -Math.PI * 0.075;
    haloRing.position.set(0, 0.8, -0.14);
    chassisGroup.add(haloRing);

    const haloCenterPost = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.022, 0.026, 0.26, 10)),
      mats.carbon,
    );
    haloCenterPost.position.set(0, 0.72, -0.4);
    haloCenterPost.rotation.x = 0.48;
    chassisGroup.add(haloCenterPost);

    const tCam = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.38, 0.032, 0.11)),
      mats.carbon,
    );
    tCam.position.set(0, 1.04, 0.24);
    chassisGroup.add(tCam);

    const sharkFin = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.036, 0.28, 0.8)),
      mats.paint,
    );
    sharkFin.position.set(0, 0.79, 0.94);
    chassisGroup.add(sharkFin);

    const helmet = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.175, 20, 16)),
      mats.amber,
    );
    helmet.position.set(0, 0.76, -0.04);
    chassisGroup.add(helmet);

    const visor = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.24, 0.072, 0.12)),
      mats.glass,
    );
    visor.position.set(0, 0.77, -0.16);
    chassisGroup.add(visor);
  } else if (modelId === 'pagani') {
    // Pagani Utopia V12: Crystal rear deck revealing twin gold-trimmed V12 banks + oval carbon side intakes
    const engineDeck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.84, 0.05, 0.96)),
      mats.glass,
    );
    engineDeck.position.set(0, 0.855, 1.38);
    engineDeck.rotation.x = 0.05;
    chassisGroup.add(engineDeck);

    const bankGeo = trackGeo(new THREE.BoxGeometry(0.18, 0.08, 0.74));
    for (const sx of [-0.21, 0.21]) {
      const bank = new THREE.Mesh(bankGeo, mats.engineAccent);
      bank.position.set(sx, 0.81, 1.38);
      bank.rotation.z = Math.sign(sx) * -0.18;
      chassisGroup.add(bank);
    }
    const plenum = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.12, 0.07, 0.68)),
      mats.titanium,
    );
    plenum.position.set(0, 0.82, 1.38);
    chassisGroup.add(plenum);

    // Sculpted carbon side air intakes + brushed gold beltline accent
    const scoopGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.26, 0.64));
    const accentBladeGeo = trackGeo(new THREE.BoxGeometry(0.03, 0.032, 1.65));
    for (const side of [-1, 1]) {
      const scoop = new THREE.Mesh(scoopGeo, mats.carbon);
      scoop.position.set(side * (bodyWidth * 0.48), 0.56, 0.54);
      scoop.rotation.y = side * -0.14;
      chassisGroup.add(scoop);

      const goldBlade = new THREE.Mesh(accentBladeGeo, mats.engineAccent);
      goldBlade.position.set(side * (bodyWidth * 0.49), 0.34, 0.06);
      chassisGroup.add(goldBlade);
    }
  } else if (modelId === 'bolide') {
    // Bugatti Bolide X: Roof snorkel intake + full-length LMP carbon dorsal shark fin + Venturi tunnels
    const roofScoop = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.32, 0.14, 0.58)),
      mats.carbon,
    );
    roofScoop.position.set(0, roofY + 0.06, 0.12);
    chassisGroup.add(roofScoop);

    const scoopInlet = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.24, 0.09, 0.08)),
      mats.grille,
    );
    scoopInlet.position.set(0, roofY + 0.06, -0.17);
    chassisGroup.add(scoopInlet);

    // Full-length dorsal carbon shark fin connecting roof to rear wing
    const dorsalFin = new THREE.Mesh(
      trackGeo(
        createExtrudedShapeGeo(
          [
            [-0.95, 0.0],
            [0.88, -0.02],
            [0.92, 0.26],
            [-0.86, 0.28],
          ],
          0.038,
          0.008,
        ),
      ),
      mats.carbon,
    );
    dorsalFin.position.set(0, 0.85, 1.28);
    chassisGroup.add(dorsalFin);

    // Massive side Venturi radiator channels + front aero dive-planes
    const venturiGeo = trackGeo(new THREE.BoxGeometry(0.2, 0.32, 1.18));
    const canardGeo = trackGeo(new THREE.BoxGeometry(0.16, 0.028, 0.34));
    for (const side of [-1, 1]) {
      const channel = new THREE.Mesh(venturiGeo, mats.carbon);
      channel.position.set(side * (bodyWidth * 0.48), 0.46, 0.36);
      chassisGroup.add(channel);

      const blueTrim = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.03, 0.032, 1.54)),
        mats.engineAccent,
      );
      blueTrim.position.set(side * (bodyWidth * 0.515), 0.28, 0.04);
      chassisGroup.add(blueTrim);

      const canard = new THREE.Mesh(canardGeo, mats.carbon);
      canard.position.set(side * (bodyWidth * 0.49), 0.34, -2.04);
      canard.rotation.x = 0.28;
      canard.rotation.z = side * -0.2;
      chassisGroup.add(canard);
    }
  } else if (modelId === 'solaris') {
    // Apex Solaris Vision: Sculpted Flying Buttresses + Glowing Hybrid Core Spine + Gold Aero Blades
    const buttressGeo = trackGeo(
      createExtrudedShapeGeo(
        [
          [-0.68, 0.24],
          [0.72, -0.02],
          [0.72, 0.08],
          [-0.58, 0.34],
        ],
        0.095,
        0.012,
      ),
    );
    for (const side of [-1, 1]) {
      const buttress = new THREE.Mesh(buttressGeo, mats.paint);
      buttress.position.set(side * 0.62, 0.78, 1.24);
      buttress.rotation.y = side * 0.14;
      buttress.castShadow = true;
      chassisGroup.add(buttress);

      const trimLine = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.032, 0.026, 1.72)),
        mats.engineAccent,
      );
      trimLine.position.set(side * (bodyWidth * 0.51), 0.32, 0.06);
      chassisGroup.add(trimLine);
    }

    // Glowing plasma hybrid energy core spine under louvered rear glass
    const coreSpine = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.14, 0.055, 1.12)),
      mats.engineAccent,
    );
    coreSpine.position.set(0, 0.83, 1.32);
    chassisGroup.add(coreSpine);

    const louverGeo = trackGeo(new THREE.BoxGeometry(0.66, 0.02, 0.075));
    for (let i = 0; i < 6; i++) {
      const louver = new THREE.Mesh(louverGeo, mats.carbon);
      louver.position.set(0, 0.87 - i * 0.008, 0.88 + i * 0.17);
      louver.rotation.x = -0.18;
      chassisGroup.add(louver);
    }
  }
}

/**
 * Builds authentic, immediately recognizable front grilles & multi-element LED headlight clusters.
 */
export function buildModelFrontFascia(ctx: FeatureBuildContext): void {
  const { modelId, bp, chassisGroup, mats, trackGeo } = ctx;
  const frontZ = bp.stations[0].z;

  if (modelId === 'f1') {
    // Nose sponsor badge + front aero camera pods
    const badge = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.18, 0.02, 0.24)),
      mats.amber,
    );
    badge.position.set(0, 0.41, frontZ + 0.26);
    chassisGroup.add(badge);
    return;
  }

  if (modelId === 'dogan') {
    const grille = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.92, 0.21, 0.07)),
      mats.grille,
    );
    grille.position.set(0, 0.6, frontZ - 0.01);
    chassisGroup.add(grille);

    for (const gy of [0.56, 0.64]) {
      const slat = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.88, 0.018, 0.085)),
        mats.chrome,
      );
      slat.position.set(0, gy, frontZ - 0.015);
      chassisGroup.add(slat);
    }

    const bucketGeo = trackGeo(new THREE.BoxGeometry(0.35, 0.2, 0.08));
    const hlGeo = trackGeo(new THREE.BoxGeometry(0.3, 0.15, 0.07));
    const blinkGeo = trackGeo(new THREE.BoxGeometry(0.11, 0.18, 0.09));
    for (const sx of [-0.61, 0.61]) {
      const bucket = new THREE.Mesh(bucketGeo, mats.chrome);
      bucket.position.set(sx, 0.6, frontZ + 0.01);
      chassisGroup.add(bucket);
      const hl = new THREE.Mesh(hlGeo, mats.headLight);
      hl.position.set(sx, 0.6, frontZ - 0.02);
      chassisGroup.add(hl);
      const blink = new THREE.Mesh(blinkGeo, mats.amber);
      blink.position.set(sx + Math.sign(sx) * 0.2, 0.6, frontZ + 0.01);
      chassisGroup.add(blink);
    }
    return;
  }

  if (modelId === 'm3gtr') {
    // Iconic BMW E46 Twin Kidney Grilles + Quad Circular Angel-Eye Halo Headlights!
    const kidneyFrameGeo = trackGeo(new THREE.BoxGeometry(0.3, 0.18, 0.06));
    const kidneyCoreGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.14, 0.07));
    for (const sx of [-0.18, 0.18]) {
      const frame = new THREE.Mesh(kidneyFrameGeo, mats.chrome);
      frame.position.set(sx, 0.56, frontZ - 0.01);
      chassisGroup.add(frame);
      const core = new THREE.Mesh(kidneyCoreGeo, mats.grille);
      core.position.set(sx, 0.56, frontZ - 0.02);
      chassisGroup.add(core);
    }
    const lowerIntake = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.18, 0.16, 0.07)),
      mats.grille,
    );
    lowerIntake.position.set(0, 0.32, frontZ - 0.005);
    chassisGroup.add(lowerIntake);

    const haloGeo = trackGeo(new THREE.TorusGeometry(0.055, 0.012, 8, 18));
    const housingGeo = trackGeo(new THREE.BoxGeometry(0.4, 0.15, 0.09));
    for (const side of [-1, 1]) {
      const hx = side * 0.62;
      const housing = new THREE.Mesh(housingGeo, mats.glossBlack);
      housing.position.set(hx, 0.58, frontZ + 0.02);
      housing.rotation.y = side * -0.12;
      chassisGroup.add(housing);
      for (const offset of [-0.09, 0.09]) {
        const halo = new THREE.Mesh(haloGeo, mats.headLight);
        halo.position.set(hx + offset, 0.58, frontZ - 0.032);
        chassisGroup.add(halo);
      }
    }
    return;
  }

  if (modelId === 'porsche') {
    // Iconic Porsche 911 Oval 4-Point LED Headlights nestled in raised fender barrels
    const bezelGeo = trackGeo(new THREE.CylinderGeometry(0.155, 0.155, 0.09, 20));
    bezelGeo.rotateX(Math.PI / 2);
    const hlGeo = trackGeo(new THREE.CylinderGeometry(0.125, 0.125, 0.1, 20));
    hlGeo.rotateX(Math.PI / 2);
    const dotGeo = trackGeo(new THREE.SphereGeometry(0.022, 8, 8));
    for (const sx of [-0.67, 0.67]) {
      const bezel = new THREE.Mesh(bezelGeo, mats.glossBlack);
      bezel.position.set(sx, 0.6, frontZ + 0.18);
      bezel.rotation.x = 0.34;
      chassisGroup.add(bezel);
      const hl = new THREE.Mesh(hlGeo, mats.headLight);
      hl.position.set(sx, 0.61, frontZ + 0.16);
      hl.rotation.x = 0.34;
      chassisGroup.add(hl);
      for (const [dx, dy] of [
        [-0.06, 0.05],
        [0.06, 0.05],
        [-0.06, -0.05],
        [0.06, -0.05],
      ]) {
        const dot = new THREE.Mesh(dotGeo, mats.drl);
        dot.position.set(sx + dx, 0.61 + dy, frontZ + 0.1);
        chassisGroup.add(dot);
      }
    }
    const lowerGrille = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.38, 0.16, 0.08)),
      mats.grille,
    );
    lowerGrille.position.set(0, 0.29, frontZ - 0.005);
    chassisGroup.add(lowerGrille);
    return;
  }

  if (modelId === 'bugatti') {
    // Iconic Bugatti Horseshoe Chrome Grille + Quad-Square LED Headlights (4 per side)
    const horseOuter = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.24, 0.032, 10, 22, Math.PI)),
      mats.chrome,
    );
    horseOuter.position.set(0, 0.38, frontZ - 0.015);
    chassisGroup.add(horseOuter);
    const horseCore = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.46, 0.3, 0.07)),
      mats.grille,
    );
    horseCore.position.set(0, 0.34, frontZ - 0.005);
    chassisGroup.add(horseCore);

    const hlBarGeo = trackGeo(new THREE.BoxGeometry(0.44, 0.095, 0.1));
    const quadLedGeo = trackGeo(new THREE.BoxGeometry(0.065, 0.052, 0.04));
    for (const side of [-1, 1]) {
      const bx = side * 0.65;
      const bar = new THREE.Mesh(hlBarGeo, mats.glossBlack);
      bar.position.set(bx, 0.54, frontZ + 0.03);
      bar.rotation.y = side * -0.18;
      chassisGroup.add(bar);
      for (let i = 0; i < 4; i++) {
        const led = new THREE.Mesh(quadLedGeo, mats.headLight);
        led.position.set(bx - 0.135 + i * 0.09, 0.54, frontZ - 0.025);
        chassisGroup.add(led);
      }
    }
    return;
  }

  if (modelId === 'pickup') {
    // Bold F-150 Raptor grille with 3 signature amber LED marker lights + C-clamp DRLs
    const grille = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.36, 0.36, 0.09)),
      mats.grille,
    );
    grille.position.set(0, 0.86, frontZ - 0.01);
    chassisGroup.add(grille);

    for (const ax of [-0.26, 0, 0.26]) {
      const marker = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.1, 0.032, 0.045)),
        mats.amber,
      );
      marker.position.set(ax, 1.01, frontZ - 0.03);
      chassisGroup.add(marker);
    }

    const hlGeo = trackGeo(new THREE.BoxGeometry(0.32, 0.24, 0.12));
    for (const sx of [-0.77, 0.77]) {
      const hl = new THREE.Mesh(hlGeo, mats.headLight);
      hl.position.set(sx, 0.86, frontZ + 0.01);
      chassisGroup.add(hl);
      const topBar = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.35, 0.032, 0.13)),
        mats.amber,
      );
      topBar.position.set(sx, 0.99, frontZ + 0.005);
      chassisGroup.add(topBar);
      const botBar = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.35, 0.032, 0.13)),
        mats.amber,
      );
      botBar.position.set(sx, 0.73, frontZ + 0.005);
      chassisGroup.add(botBar);
    }
    return;
  }

  if (modelId === 'lambo') {
    // Lamborghini Aventador SVJ aggressive Y-LED headlights + hexagonal intakes
    const grille = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.44, 0.15, 0.08)),
      mats.grille,
    );
    grille.position.set(0, 0.26, frontZ - 0.005);
    chassisGroup.add(grille);

    const housingGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.085, 0.22));
    for (const side of [-1, 1]) {
      const sx = side * 0.67;
      const housing = new THREE.Mesh(housingGeo, mats.glossBlack);
      housing.position.set(sx, 0.43, frontZ + 0.16);
      housing.rotation.y = side * -0.34;
      housing.rotation.x = 0.24;
      chassisGroup.add(housing);

      // Iconic Y-shaped LED signature
      const mainStem = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.32, 0.026, 0.06)),
        mats.headLight,
      );
      mainStem.position.set(sx, 0.44, frontZ + 0.12);
      mainStem.rotation.y = side * -0.34;
      chassisGroup.add(mainStem);

      const branch = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.16, 0.024, 0.06)),
        mats.drl,
      );
      branch.position.set(sx - side * 0.06, 0.47, frontZ + 0.13);
      branch.rotation.z = side * 0.45;
      branch.rotation.y = side * -0.34;
      chassisGroup.add(branch);
    }
    return;
  }

  if (modelId === 'mclarenp1') {
    // Iconic McLaren P1 curved boomerang LED headlights
    const grille = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.32, 0.15, 0.08)),
      mats.grille,
    );
    grille.position.set(0, 0.26, frontZ - 0.005);
    chassisGroup.add(grille);

    const boomGeo = trackGeo(new THREE.TorusGeometry(0.18, 0.024, 8, 16, Math.PI * 0.78));
    for (const side of [-1, 1]) {
      const boom = new THREE.Mesh(boomGeo, mats.headLight);
      boom.position.set(side * 0.66, 0.46, frontZ + 0.14);
      boom.rotation.x = 0.52;
      boom.rotation.y = side * -0.35;
      boom.rotation.z = side < 0 ? 0.6 : 2.1;
      chassisGroup.add(boom);
    }
    return;
  }

  if (modelId === 'pagani') {
    // Pagani Utopia Oval Carbon Mouth + Twin Recessed Jewel Headlights per side
    const mouth = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.16, 0.17, 0.08)),
      mats.grille,
    );
    mouth.position.set(0, 0.27, frontZ - 0.008);
    chassisGroup.add(mouth);

    const lipTrim = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.22, 0.024, 0.1)),
      mats.engineAccent,
    );
    lipTrim.position.set(0, 0.19, frontZ - 0.018);
    chassisGroup.add(lipTrim);

    const podGeo = trackGeo(new THREE.BoxGeometry(0.42, 0.11, 0.22));
    const jewelGeo = trackGeo(new THREE.CylinderGeometry(0.044, 0.044, 0.06, 14));
    jewelGeo.rotateX(Math.PI / 2);
    for (const side of [-1, 1]) {
      const px = side * 0.68;
      const pod = new THREE.Mesh(podGeo, mats.carbon);
      pod.position.set(px, 0.49, frontZ + 0.16);
      pod.rotation.y = side * -0.26;
      pod.rotation.x = 0.22;
      chassisGroup.add(pod);

      for (const offset of [-0.075, 0.075]) {
        const jewel = new THREE.Mesh(jewelGeo, mats.headLight);
        jewel.position.set(px + offset, 0.49, frontZ + 0.09);
        chassisGroup.add(jewel);
      }
      const drlArc = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.32, 0.018, 0.06)),
        mats.drl,
      );
      drlArc.position.set(px, 0.535, frontZ + 0.11);
      drlArc.rotation.y = side * -0.26;
      chassisGroup.add(drlArc);
    }
    return;
  }

  if (modelId === 'bolide') {
    // Bugatti Bolide X: Carbon Horseshoe Intake + Iconic X-Signature Laser Front Lights
    const horseOuter = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.22, 0.028, 10, 20, Math.PI)),
      mats.carbon,
    );
    horseOuter.position.set(0, 0.34, frontZ - 0.012);
    chassisGroup.add(horseOuter);
    const horseCore = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.42, 0.24, 0.07)),
      mats.grille,
    );
    horseCore.position.set(0, 0.3, frontZ - 0.005);
    chassisGroup.add(horseCore);

    const xBeamGeo = trackGeo(new THREE.BoxGeometry(0.34, 0.024, 0.08));
    for (const side of [-1, 1]) {
      const fx = side * 0.69;
      const housing = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.42, 0.16, 0.18)),
        mats.glossBlack,
      );
      housing.position.set(fx, 0.44, frontZ + 0.16);
      housing.rotation.y = side * -0.28;
      chassisGroup.add(housing);

      const armA = new THREE.Mesh(xBeamGeo, mats.headLight);
      armA.position.set(fx, 0.44, frontZ + 0.09);
      armA.rotation.z = 0.42;
      armA.rotation.y = side * -0.28;
      chassisGroup.add(armA);

      const armB = new THREE.Mesh(xBeamGeo, mats.drl);
      armB.position.set(fx, 0.44, frontZ + 0.09);
      armB.rotation.z = -0.42;
      armB.rotation.y = side * -0.28;
      chassisGroup.add(armB);
    }
    return;
  }

  if (modelId === 'solaris') {
    // Apex Solaris Vision: Full-Width Infinity Horizon DRL Blade + Vertical Corner Laser Fangs
    const intake = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.56, 0.14, 0.08)),
      mats.grille,
    );
    intake.position.set(0, 0.25, frontZ - 0.005);
    chassisGroup.add(intake);

    const horizonBar = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.62, 0.032, 0.08)),
      mats.drl,
    );
    horizonBar.position.set(0, 0.44, frontZ + 0.03);
    chassisGroup.add(horizonBar);

    const fangGeo = trackGeo(new THREE.BoxGeometry(0.034, 0.17, 0.08));
    const laserPodGeo = trackGeo(new THREE.BoxGeometry(0.28, 0.052, 0.1));
    for (const side of [-1, 1]) {
      const fx = side * 0.74;
      const fang = new THREE.Mesh(fangGeo, mats.headLight);
      fang.position.set(fx + side * 0.06, 0.37, frontZ + 0.04);
      fang.rotation.z = side * 0.18;
      chassisGroup.add(fang);

      const pod = new THREE.Mesh(laserPodGeo, mats.headLight);
      pod.position.set(fx - side * 0.08, 0.42, frontZ + 0.045);
      pod.rotation.y = side * -0.22;
      chassisGroup.add(pod);
    }
    return;
  }

  if (modelId === 'amggt') {
    // Massive Panamericana vertical-slat grille + sharp swept AMG headlights
    const grille = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.18, 0.24, 0.08)),
      mats.grille,
    );
    grille.position.set(0, 0.37, frontZ - 0.01);
    chassisGroup.add(grille);
    for (let i = -5; i <= 5; i++) {
      const slat = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.018, 0.22, 0.09)),
        mats.chrome,
      );
      slat.position.set(i * 0.095, 0.37, frontZ - 0.018);
      chassisGroup.add(slat);
    }
  } else {
    // Default sculpted wide front grille + twin side air intakes
    const grilleH = modelId === 'muscle' || modelId === 'rally' ? 0.22 : 0.16;
    const grilleY = modelId === 'muscle' || modelId === 'rally' ? 0.44 : 0.34;
    const grille = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(bp.bodyWidth * 0.56, grilleH, 0.08)),
      mats.grille,
    );
    grille.position.set(0, grilleY, frontZ - 0.005);
    chassisGroup.add(grille);
  }

  // Swept Multi-Element Projector Headlights + Sharp LED DRL Brow
  const frontSt = bp.stations[0];
  const hlY = frontSt.beltY - 0.04;
  const hlX = frontSt.beltHalfW * 0.72;
  const housingGeo = trackGeo(new THREE.BoxGeometry(0.42, 0.11, 0.16));
  const lensGeo = trackGeo(new THREE.BoxGeometry(0.36, 0.065, 0.12));
  const browGeo = trackGeo(new THREE.BoxGeometry(0.4, 0.022, 0.13));

  for (const side of [-1, 1]) {
    const housing = new THREE.Mesh(housingGeo, mats.glossBlack);
    housing.position.set(side * hlX, hlY, frontZ + 0.08);
    housing.rotation.y = side * -0.22;
    housing.rotation.x = 0.12;
    chassisGroup.add(housing);

    const lens = new THREE.Mesh(lensGeo, mats.headLight);
    lens.position.set(side * hlX, hlY - 0.005, frontZ + 0.045);
    lens.rotation.y = side * -0.22;
    chassisGroup.add(lens);

    const brow = new THREE.Mesh(browGeo, mats.drl);
    brow.position.set(side * hlX, hlY + 0.04, frontZ + 0.04);
    brow.rotation.y = side * -0.22;
    chassisGroup.add(brow);
  }
}

/**
 * Builds the iconic Rear Fascia (taillight signatures, exhaust tips & nitro flames) —
 * crafted with extra care since chase-camera players view the rear 95% of gameplay!
 */
export function buildModelRearFascia(ctx: FeatureBuildContext): void {
  const { modelId, bp, chassisGroup, mats, trackGeo, flameMeshes } = ctx;
  const rearSt = bp.stations[bp.stations.length - 1];
  const rearZ = rearSt.z;
  const tailY = rearSt.beltY - 0.08;

  // 1. Model-Authentic Taillight Signatures
  if (modelId === 'f1') {
    // Central vertical FIA rain light on rear crash structure
    const rainLight = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.065, 0.14, 0.06)),
      mats.tailLight,
    );
    rainLight.position.set(0, 0.34, rearZ + 0.02);
    chassisGroup.add(rainLight);
  } else if (modelId === 'dogan') {
    // Iconic Tofaş Doğan SLX 3-color rectangular tail clusters (Red + Amber + White reverse)
    const housingGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.16, 0.06));
    for (const side of [-1, 1]) {
      const tx = side * 0.56;
      const box = new THREE.Mesh(housingGeo, mats.matteTrim);
      box.position.set(tx, tailY, rearZ - 0.005);
      chassisGroup.add(box);

      const red = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.24, 0.13, 0.04)),
        mats.tailLight,
      );
      red.position.set(tx + side * 0.08, tailY, rearZ + 0.015);
      chassisGroup.add(red);

      const amb = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.11, 0.075, 0.04)),
        mats.amber,
      );
      amb.position.set(tx - side * 0.11, tailY + 0.028, rearZ + 0.015);
      chassisGroup.add(amb);

      const rev = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.11, 0.055, 0.04)),
        mats.reverseLight,
      );
      rev.position.set(tx - side * 0.11, tailY - 0.036, rearZ + 0.015);
      chassisGroup.add(rev);
    }
  } else if (modelId === 'muscle') {
    // Iconic Ford Mustang Tri-Bar Sequential Vertical Taillights (3 glowing crimson bars per side!)
    const panel = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(bp.bodyWidth * 0.84, 0.22, 0.05)),
      mats.glossBlack,
    );
    panel.position.set(0, tailY, rearZ - 0.005);
    chassisGroup.add(panel);

    const barGeo = trackGeo(new THREE.BoxGeometry(0.068, 0.175, 0.045));
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const bx = side * (0.42 + i * 0.135);
        const bar = new THREE.Mesh(barGeo, mats.tailLight);
        bar.position.set(bx, tailY, rearZ + 0.018);
        chassisGroup.add(bar);
      }
    }
  } else if (modelId === 'jdm') {
    // Iconic Nissan Skyline GT-R R34 Quad Round "Afterburner" Taillights (Large outer + Small inner rings)
    const panel = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(bp.bodyWidth * 0.84, 0.22, 0.05)),
      mats.glossBlack,
    );
    panel.position.set(0, tailY, rearZ - 0.005);
    chassisGroup.add(panel);

    const outerRingGeo = trackGeo(new THREE.TorusGeometry(0.082, 0.022, 10, 22));
    const innerRingGeo = trackGeo(new THREE.TorusGeometry(0.062, 0.018, 10, 20));
    for (const side of [-1, 1]) {
      const outer = new THREE.Mesh(outerRingGeo, mats.tailLight);
      outer.position.set(side * 0.66, tailY, rearZ + 0.02);
      chassisGroup.add(outer);

      const inner = new THREE.Mesh(innerRingGeo, mats.tailLight);
      inner.position.set(side * 0.44, tailY, rearZ + 0.02);
      chassisGroup.add(inner);
    }
  } else if (modelId === 'porsche') {
    // Iconic Porsche 992 Full-Width Continuous Sculpted Crimson Lightbar
    const housing = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(bp.bodyWidth * 0.86, 0.11, 0.06)),
      mats.glossBlack,
    );
    housing.position.set(0, tailY + 0.02, rearZ - 0.005);
    chassisGroup.add(housing);

    const lightbar = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(bp.bodyWidth * 0.83, 0.044, 0.05)),
      mats.tailLight,
    );
    lightbar.position.set(0, tailY + 0.02, rearZ + 0.018);
    chassisGroup.add(lightbar);
  } else if (modelId === 'bugatti') {
    // Iconic Bugatti Chiron Single Razor-Thin Full-Width Crimson LED Blade across open dark mesh
    const recess = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(bp.bodyWidth * 0.88, 0.28, 0.06)),
      mats.grille,
    );
    recess.position.set(0, tailY - 0.04, rearZ - 0.005);
    chassisGroup.add(recess);

    const blade = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(bp.bodyWidth * 0.84, 0.036, 0.05)),
      mats.tailLight,
    );
    blade.position.set(0, tailY + 0.01, rearZ + 0.022);
    chassisGroup.add(blade);
  } else if (modelId === 'laferrari') {
    // Iconic Ferrari Quad Round Taillights + Central FIA Rain Light over carbon rear mesh
    const meshBay = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(bp.bodyWidth * 0.86, 0.22, 0.06)),
      mats.grille,
    );
    meshBay.position.set(0, tailY - 0.02, rearZ - 0.005);
    chassisGroup.add(meshBay);

    const ringGeo = trackGeo(new THREE.TorusGeometry(0.088, 0.024, 10, 22));
    for (const side of [-1, 1]) {
      const lamp = new THREE.Mesh(ringGeo, mats.tailLight);
      lamp.position.set(side * 0.72, tailY + 0.01, rearZ + 0.024);
      chassisGroup.add(lamp);
    }
    const fia = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.075, 0.085, 0.04)),
      mats.tailLight,
    );
    fia.position.set(0, 0.27, rearZ + 0.03);
    chassisGroup.add(fia);
  } else if (modelId === 'lambo') {
    // Iconic Lamborghini Aventador SVJ 3-Prong Y-Signature LED Taillights
    const housing = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(bp.bodyWidth * 0.88, 0.16, 0.06)),
      mats.glossBlack,
    );
    housing.position.set(0, tailY, rearZ - 0.005);
    chassisGroup.add(housing);

    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const cx = side * (0.44 + i * 0.15);
        const topArm = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.095, 0.024, 0.045)),
          mats.tailLight,
        );
        topArm.position.set(cx, tailY + 0.024, rearZ + 0.02);
        topArm.rotation.z = side * -0.45;
        chassisGroup.add(topArm);

        const botArm = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.095, 0.024, 0.045)),
          mats.tailLight,
        );
        botArm.position.set(cx, tailY - 0.024, rearZ + 0.02);
        botArm.rotation.z = side * 0.45;
        chassisGroup.add(botArm);
      }
    }
  } else if (modelId === 'mclarenp1') {
    // Iconic McLaren P1 Sweeping Curved Ribbon LED Taillights framing open honeycomb rear
    const meshBay = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(bp.bodyWidth * 0.86, 0.32, 0.06)),
      mats.grille,
    );
    meshBay.position.set(0, tailY - 0.04, rearZ - 0.005);
    chassisGroup.add(meshBay);

    const ribbonGeo = trackGeo(new THREE.TorusGeometry(0.22, 0.018, 8, 22, Math.PI * 0.85));
    for (const side of [-1, 1]) {
      const rib = new THREE.Mesh(ribbonGeo, mats.tailLight);
      rib.position.set(side * 0.62, tailY - 0.02, rearZ + 0.022);
      rib.rotation.z = side < 0 ? 0.55 : 2.05;
      chassisGroup.add(rib);
    }
  } else if (modelId === 'pagani') {
    // Pagani Utopia: Iconic Circular Carbon Shroud for 2x2 Quad Exhausts + Vertical Triple-Ring LED Taillights
    const shroud = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.18, 0.026, 10, 24)),
      mats.titanium,
    );
    shroud.position.set(0, 0.66, rearZ + 0.025);
    chassisGroup.add(shroud);

    const shroudBack = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 20)),
      mats.carbon,
    );
    shroudBack.rotation.x = Math.PI / 2;
    shroudBack.position.set(0, 0.66, rearZ + 0.004);
    chassisGroup.add(shroudBack);

    // Upper pair of Pagani 2x2 quad titanium pipes (lower pair + flames handled by exhaustLayout)
    const upperPipeGeo = trackGeo(new THREE.CylinderGeometry(0.056, 0.06, 0.14, 14));
    upperPipeGeo.rotateX(Math.PI / 2);
    const upperBoreGeo = trackGeo(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 12));
    upperBoreGeo.rotateX(Math.PI / 2);
    for (const ux of [-0.085, 0.085]) {
      const upTip = new THREE.Mesh(upperPipeGeo, mats.titanium);
      upTip.position.set(ux, 0.72, rearZ + 0.01);
      chassisGroup.add(upTip);
      const upBore = new THREE.Mesh(upperBoreGeo, mats.matteTrim);
      upBore.position.set(ux, 0.72, rearZ + 0.066);
      chassisGroup.add(upBore);
    }

    // Iconic Vertical Triple-Ring Circular Taillights per side
    const ringGeo = trackGeo(new THREE.TorusGeometry(0.048, 0.015, 8, 18));
    for (const side of [-1, 1]) {
      const pod = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.16, 0.34, 0.07)),
        mats.carbon,
      );
      pod.position.set(side * 0.74, tailY + 0.02, rearZ - 0.005);
      chassisGroup.add(pod);
      for (const dy of [0.1, 0, -0.1]) {
        const ring = new THREE.Mesh(ringGeo, mats.tailLight);
        ring.position.set(side * 0.74, tailY + 0.02 + dy, rearZ + 0.024);
        chassisGroup.add(ring);
      }
    }
  } else if (modelId === 'bolide') {
    // Bugatti Bolide X: Colossal Full-Width Crimson X-Signature Laser Taillights
    const rearBay = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(bp.bodyWidth * 0.88, 0.34, 0.06)),
      mats.grille,
    );
    rearBay.position.set(0, tailY - 0.05, rearZ - 0.005);
    chassisGroup.add(rearBay);

    const xBeamGeo = trackGeo(new THREE.BoxGeometry(0.92, 0.032, 0.05));
    for (const side of [-1, 1]) {
      const armTop = new THREE.Mesh(xBeamGeo, mats.tailLight);
      armTop.position.set(side * 0.48, tailY + 0.02, rearZ + 0.026);
      armTop.rotation.z = side * 0.32;
      chassisGroup.add(armTop);

      const armBot = new THREE.Mesh(xBeamGeo, mats.tailLight);
      armBot.position.set(side * 0.48, tailY - 0.09, rearZ + 0.026);
      armBot.rotation.z = side * -0.32;
      chassisGroup.add(armBot);
    }
  } else if (modelId === 'solaris') {
    // Apex Solaris Vision: Dual-Tier Floating Infinity-Loop Crimson Lightbar + Central F1 Brake Blade
    const ventBay = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(bp.bodyWidth * 0.9, 0.28, 0.06)),
      mats.grille,
    );
    ventBay.position.set(0, tailY - 0.02, rearZ - 0.005);
    chassisGroup.add(ventBay);

    const upperBar = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(bp.bodyWidth * 0.88, 0.034, 0.055)),
      mats.tailLight,
    );
    upperBar.position.set(0, tailY + 0.07, rearZ + 0.026);
    chassisGroup.add(upperBar);

    const lowerBar = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(bp.bodyWidth * 0.82, 0.026, 0.052)),
      mats.tailLight,
    );
    lowerBar.position.set(0, tailY - 0.05, rearZ + 0.026);
    chassisGroup.add(lowerBar);

    const endLoopGeo = trackGeo(new THREE.BoxGeometry(0.036, 0.14, 0.055));
    for (const side of [-1, 1]) {
      const endLoop = new THREE.Mesh(endLoopGeo, mats.tailLight);
      endLoop.position.set(side * (bp.bodyWidth * 0.43), tailY + 0.01, rearZ + 0.026);
      chassisGroup.add(endLoop);
    }

    // Central vertical laser brake blade (positioned above rear license plate)
    const f1Blade = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.032, 0.12, 0.055)),
      mats.tailLight,
    );
    f1Blade.position.set(0, tailY - 0.1, rearZ + 0.028);
    chassisGroup.add(f1Blade);
  } else {
    // Sleek sculpted dual LED taillight clusters (Golf GTI, M3 GTR, AMG GT, GT, Rally, Pickup, Hyper, Jesko)
    const clusterW = modelId === 'pickup' ? 0.24 : 0.48;
    const clusterH = modelId === 'pickup' ? 0.32 : 0.11;
    const clusterX = rearSt.beltHalfW * 0.7;
    const housingGeo = trackGeo(new THREE.BoxGeometry(clusterW + 0.05, clusterH + 0.03, 0.06));
    const ledGeo = trackGeo(new THREE.BoxGeometry(clusterW, clusterH * 0.58, 0.045));
    const revGeo = trackGeo(new THREE.BoxGeometry(clusterW * 0.42, clusterH * 0.24, 0.045));

    for (const side of [-1, 1]) {
      const housing = new THREE.Mesh(housingGeo, mats.glossBlack);
      housing.position.set(side * clusterX, tailY, rearZ - 0.004);
      chassisGroup.add(housing);

      const led = new THREE.Mesh(ledGeo, mats.tailLight);
      led.position.set(side * clusterX, tailY + clusterH * 0.12, rearZ + 0.018);
      chassisGroup.add(led);

      const rev = new THREE.Mesh(revGeo, mats.reverseLight);
      rev.position.set(side * (clusterX - 0.06), tailY - clusterH * 0.24, rearZ + 0.018);
      chassisGroup.add(rev);
    }

    // Center connecting lightblade on Apex GT & Jesko
    if (modelId === 'gt' || modelId === 'jesko' || modelId === 'hyper') {
      const centerBar = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(clusterX * 1.4, 0.032, 0.042)),
        mats.tailLight,
      );
      centerBar.position.set(0, tailY + 0.012, rearZ + 0.016);
      chassisGroup.add(centerBar);
    }
  }

  // 2. Sculpted Exhaust Tips + Nitro Afterburner Flame Cones
  const ex = bp.exhaustLayout;
  const exMat = ex.titanium ? mats.titanium : mats.chrome;
  const flameGeo = trackGeo(new THREE.ConeGeometry(ex.radius * 1.15, 0.82, 10));
  flameGeo.rotateX(Math.PI / 2);

  for (const x of ex.xList) {
    let tip: THREE.Mesh;
    if (ex.rectangular) {
      tip = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(ex.radius * 2.4, ex.radius * 1.5, 0.14)),
        exMat,
      );
    } else {
      const cylGeo = trackGeo(
        new THREE.CylinderGeometry(ex.radius, ex.radius * 1.08, 0.14, 14),
      );
      cylGeo.rotateX(Math.PI / 2);
      tip = new THREE.Mesh(cylGeo, exMat);
    }
    tip.position.set(x, ex.y, ex.z);
    chassisGroup.add(tip);

    // Dark hollow exhaust bore
    const bore = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(ex.radius * 0.72, ex.radius * 0.72, 0.04, 12)),
      mats.matteTrim,
    );
    bore.rotation.x = Math.PI / 2;
    bore.position.set(x, ex.y, ex.z + 0.058);
    chassisGroup.add(bore);

    // Nitro exhaust flame cone
    const flame = new THREE.Mesh(flameGeo, mats.flameMat);
    flame.position.set(x, ex.y, ex.z + 0.44);
    flame.visible = false;
    chassisGroup.add(flame);
    flameMeshes.push(flame);
  }
}

/**
 * Builds model-accurate stock rear wings & lower splitters/diffusers.
 */
export function buildModelStockAero(ctx: FeatureBuildContext): void {
  const { modelId, bp, stockWingGroup, stockLowerAeroGroup, mats, unitBoxGeo, trackGeo } = ctx;
  const { bodyWidth, cabinWidth, wingY, wingZ } = bp;
  const frontZ = bp.stations[0].z;
  const rearZ = bp.stations[bp.stations.length - 1].z;

  // 1. Front Splitter + Rear Multi-Fin Diffuser
  if (modelId !== 'dogan' && modelId !== 'pickup' && modelId !== 'f1') {
    const splitterLen = rearZ - frontZ + 0.06;
    const splitter = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(bodyWidth * 0.96, 0.044, splitterLen)),
      mats.carbon,
    );
    splitter.position.set(0, Math.max(0.145, bp.stations[0].bottomY - 0.02), (frontZ + rearZ) * 0.5);
    splitter.castShadow = true;
    stockLowerAeroGroup.add(splitter);

    const diffuser = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(bodyWidth * 0.86, 0.12, 0.22)),
      mats.carbon,
    );
    diffuser.position.set(0, 0.2, rearZ - 0.04);
    stockLowerAeroGroup.add(diffuser);

    const finGeo = trackGeo(new THREE.BoxGeometry(0.03, 0.125, 0.22));
    for (const fx of [-0.54, -0.34, 0.34, 0.54]) {
      const fin = new THREE.Mesh(finGeo, mats.matteTrim);
      fin.position.set(fx, 0.2, rearZ - 0.02);
      stockLowerAeroGroup.add(fin);
    }
  }

  // 2. Signature Stock Wings
  if (modelId === 'jesko') {
    // Koenigsegg Top-Mounted Boomerang Swan-Neck Mega Wing
    const wingSpan = bodyWidth * 0.98;
    const wingBlade = new THREE.Mesh(
      trackGeo(
        createExtrudedShapeGeo(
          [
            [-0.22, 0],
            [0.24, 0.06],
            [0.22, 0.11],
            [-0.2, 0.04],
          ],
          wingSpan,
          0.014,
        ),
      ),
      mats.carbon,
    );
    wingBlade.position.set(0, wingY, wingZ);
    wingBlade.castShadow = true;
    stockWingGroup.add(wingBlade);

    const epGeo = trackGeo(
      createExtrudedShapeGeo(
        [
          [-0.25, -0.14],
          [0.25, -0.08],
          [0.21, 0.14],
          [-0.2, 0.11],
        ],
        0.036,
        0.008,
      ),
    );
    for (const sx of [-wingSpan * 0.5, wingSpan * 0.5]) {
      const ep = new THREE.Mesh(epGeo, mats.paint);
      ep.position.set(sx, wingY, wingZ);
      stockWingGroup.add(ep);
    }
    for (const sx of [-0.26, 0.26]) {
      addOrientedStrut(
        stockWingGroup,
        unitBoxGeo,
        [sx, 0.84, 1.5],
        [sx, wingY + 0.12, wingZ - 0.12],
        0.04,
        0.13,
        mats.carbon,
        [Math.sign(sx), 0, 0],
        0.02,
      );
      addOrientedStrut(
        stockWingGroup,
        unitBoxGeo,
        [sx, wingY + 0.12, wingZ - 0.12],
        [sx, wingY + 0.07, wingZ + 0.05],
        0.042,
        0.09,
        mats.carbon,
        [0, 1, 0],
        0.02,
      );
    }
  } else if (modelId === 'amggt') {
    // Mercedes-AMG GT Black Series Twin-Tier Carbon GT3 Wing
    const wingSpan = bodyWidth * 0.96;
    const upperBlade = new THREE.Mesh(
      trackGeo(
        createExtrudedShapeGeo(
          [
            [-0.2, 0],
            [0.21, 0.05],
            [0.19, 0.092],
            [-0.18, 0.038],
          ],
          wingSpan,
          0.014,
        ),
      ),
      mats.carbon,
    );
    upperBlade.position.set(0, wingY + 0.04, wingZ);
    upperBlade.castShadow = true;
    stockWingGroup.add(upperBlade);

    const lowerBlade = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(wingSpan * 0.92, 0.034, 0.18)),
      mats.carbon,
    );
    lowerBlade.position.set(0, wingY - 0.14, wingZ - 0.03);
    lowerBlade.rotation.x = 0.08;
    stockWingGroup.add(lowerBlade);

    const epGeo = trackGeo(
      createExtrudedShapeGeo(
        [
          [-0.22, -0.22],
          [0.22, -0.18],
          [0.2, 0.16],
          [-0.19, 0.12],
        ],
        0.038,
        0.008,
      ),
    );
    for (const sx of [-wingSpan * 0.5, wingSpan * 0.5]) {
      const ep = new THREE.Mesh(epGeo, mats.paint);
      ep.position.set(sx, wingY - 0.02, wingZ);
      stockWingGroup.add(ep);
    }
    for (const sx of [-0.46, 0.46]) {
      addOrientedStrut(
        stockWingGroup,
        unitBoxGeo,
        [sx, 0.82, wingZ - 0.12],
        [sx, wingY + 0.03, wingZ - 0.02],
        0.04,
        0.15,
        mats.carbon,
        [Math.sign(sx), 0, 0],
        0.02,
      );
    }
  } else if (modelId === 'pagani') {
    // Pagani Utopia Active Split Rear Aero Flaps (Left & Right sculpted carbon wings)
    const flapGeo = trackGeo(
      createExtrudedShapeGeo(
        [
          [-0.14, 0],
          [0.16, 0.04],
          [0.14, 0.072],
          [-0.13, 0.028],
        ],
        0.58,
        0.012,
      ),
    );
    for (const side of [-1, 1]) {
      const flap = new THREE.Mesh(flapGeo, mats.carbon);
      flap.position.set(side * 0.56, wingY - 0.05, wingZ);
      flap.rotation.z = side * -0.06;
      flap.castShadow = true;
      stockWingGroup.add(flap);

      const strut = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.034, 0.14, 0.12)),
        mats.titanium,
      );
      strut.position.set(side * 0.56, wingY - 0.12, wingZ - 0.02);
      stockWingGroup.add(strut);
    }
  } else if (modelId === 'bolide') {
    // Bugatti Bolide X: Colossal LMP Swan-Neck High-Downforce Wing with Sculpted Floating Endplates
    const wingSpan = bodyWidth * 1.02;
    const wingBlade = new THREE.Mesh(
      trackGeo(
        createExtrudedShapeGeo(
          [
            [-0.24, 0],
            [0.26, 0.065],
            [0.24, 0.115],
            [-0.22, 0.045],
          ],
          wingSpan,
          0.014,
        ),
      ),
      mats.carbon,
    );
    wingBlade.position.set(0, wingY, wingZ);
    wingBlade.castShadow = true;
    stockWingGroup.add(wingBlade);

    const epGeo = trackGeo(
      createExtrudedShapeGeo(
        [
          [-0.28, -0.22],
          [0.28, -0.16],
          [0.24, 0.18],
          [-0.24, 0.13],
        ],
        0.038,
        0.008,
      ),
    );
    for (const sx of [-wingSpan * 0.5, wingSpan * 0.5]) {
      const ep = new THREE.Mesh(epGeo, mats.paint);
      ep.position.set(sx, wingY - 0.02, wingZ);
      stockWingGroup.add(ep);
    }
    for (const sx of [-0.34, 0.34]) {
      addOrientedStrut(
        stockWingGroup,
        unitBoxGeo,
        [sx, 0.79, wingZ - 0.18],
        [sx, wingY + 0.1, wingZ - 0.04],
        0.042,
        0.16,
        mats.carbon,
        [Math.sign(sx), 0, 0],
        0.02,
      );
    }
  } else if (modelId === 'solaris') {
    // Apex Solaris Vision: Futuristic Split-Level Floating Halo Rear Wing spanning the flying buttresses
    const wingSpan = bodyWidth * 1.0;
    const mainHalo = new THREE.Mesh(
      trackGeo(
        createExtrudedShapeGeo(
          [
            [-0.19, 0],
            [0.21, 0.05],
            [0.19, 0.088],
            [-0.18, 0.035],
          ],
          wingSpan,
          0.014,
        ),
      ),
      mats.carbon,
    );
    mainHalo.position.set(0, wingY, wingZ);
    mainHalo.castShadow = true;
    stockWingGroup.add(mainHalo);

    const accentStrip = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(wingSpan * 0.96, 0.024, 0.03)),
      mats.engineAccent,
    );
    accentStrip.position.set(0, wingY + 0.075, wingZ + 0.2);
    stockWingGroup.add(accentStrip);

    const lowerBlade = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(wingSpan * 0.78, 0.028, 0.15)),
      mats.paint,
    );
    lowerBlade.position.set(0, wingY - 0.13, wingZ - 0.06);
    lowerBlade.rotation.x = 0.08;
    stockWingGroup.add(lowerBlade);

    for (const sx of [-0.62, 0.62]) {
      addOrientedStrut(
        stockWingGroup,
        unitBoxGeo,
        [sx, 0.81, wingZ - 0.24],
        [sx, wingY + 0.03, wingZ - 0.02],
        0.055,
        0.18,
        mats.paint,
        [Math.sign(sx), 0, 0],
        0.02,
      );
    }
  } else if (
    modelId === 'hatch' ||
    modelId === 'gt' ||
    modelId === 'rally' ||
    modelId === 'm3gtr' ||
    modelId === 'jdm' ||
    modelId === 'porsche' ||
    modelId === 'hyper' ||
    modelId === 'lambo' ||
    modelId === 'mclarenp1' ||
    modelId === 'bugatti' ||
    modelId === 'f1'
  ) {
    const wingSpan =
      modelId === 'f1'
        ? 1.78
        : modelId === 'hatch'
          ? cabinWidth * 0.88
          : modelId === 'mclarenp1' || modelId === 'm3gtr'
            ? bodyWidth * 0.96
            : bodyWidth * 0.92;
    const wingBlade = new THREE.Mesh(
      trackGeo(
        createExtrudedShapeGeo(
          [
            [-0.18, 0],
            [0.18, 0.04],
            [0.16, 0.075],
            [-0.17, 0.03],
          ],
          wingSpan,
          0.014,
        ),
      ),
      mats.carbon,
    );
    wingBlade.position.set(0, wingY, wingZ);
    wingBlade.castShadow = true;
    stockWingGroup.add(wingBlade);

    // DRS upper flap on F1
    if (modelId === 'f1') {
      const drsFlap = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(wingSpan * 0.96, 0.032, 0.12)),
        mats.paint,
      );
      drsFlap.position.set(0, wingY + 0.11, wingZ + 0.06);
      drsFlap.rotation.x = 0.25;
      stockWingGroup.add(drsFlap);
    }

    if (modelId !== 'hatch') {
      const epGeo = trackGeo(
        createExtrudedShapeGeo(
          [
            [-0.21, -0.11],
            [0.21, -0.07],
            [0.19, 0.13],
            [-0.19, 0.09],
          ],
          0.036,
          0.008,
        ),
      );
      for (const sx of [-wingSpan * 0.5, wingSpan * 0.5]) {
        const ep = new THREE.Mesh(epGeo, mats.paint);
        ep.position.set(sx, wingY, wingZ);
        stockWingGroup.add(ep);
      }

      const pylonHeight =
        modelId === 'f1'
          ? 0.56
          : modelId === 'rally' || modelId === 'm3gtr'
            ? 0.42
            : modelId === 'mclarenp1'
              ? 0.42
              : 0.32;
      const pylonX = modelId === 'f1' ? 0.22 : 0.46;
      const pylonGeo = trackGeo(new THREE.BoxGeometry(0.04, pylonHeight, 0.18));
      for (const sx of [-pylonX, pylonX]) {
        const pylon = new THREE.Mesh(pylonGeo, mats.carbon);
        pylon.position.set(sx, wingY - pylonHeight * 0.5, wingZ - 0.02);
        stockWingGroup.add(pylon);
      }
    }
  }
}
