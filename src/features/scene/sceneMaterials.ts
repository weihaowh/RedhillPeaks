import * as THREE from 'three'

// Shared materials for fixed building elements, created once so every door and window reuses them.

export const MATERIALS = {
  aluminium: new THREE.MeshStandardMaterial({ color: '#d6d8da', metalness: 0.65, roughness: 0.32 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: '#dce9f0',
    metalness: 0,
    roughness: 0.03,
    transparent: true,
    opacity: 0.16,
    envMapIntensity: 1.6,
    depthWrite: false,
  }),
  doorStandard: new THREE.MeshStandardMaterial({ color: '#ece7df', roughness: 0.55 }),
  doorMain: new THREE.MeshStandardMaterial({ color: '#6c4c35', roughness: 0.48 }),
  doorShelter: new THREE.MeshStandardMaterial({ color: '#8f949a', metalness: 0.55, roughness: 0.42 }),
  frame: new THREE.MeshStandardMaterial({ color: '#f1eee8', roughness: 0.5 }),
  handle: new THREE.MeshStandardMaterial({ color: '#c9ccd0', metalness: 0.9, roughness: 0.22 }),
  skirting: new THREE.MeshStandardMaterial({ color: '#f3f0ea', roughness: 0.45 }),
} as const
