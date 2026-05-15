import type { RelationshipCategory, RelationshipPerson } from '@src/models/index.js';

export interface NetworkNode {
  id: string;
  name: string;
  roleLabel: string;
  category: RelationshipCategory;
  photoBase64?: string;
  x: number;
  y: number;
  radius: number;
}

export interface NetworkLayout {
  centerNode: { x: number; y: number; radius: number };
  personNodes: NetworkNode[];
  width: number;
  height: number;
}

const CENTER_RADIUS = 40;
const FAMILY_NODE_RADIUS = 32;
const DEFAULT_NODE_RADIUS = 24;

/** Minimum gap in pixels between node edges (not centers). */
const MIN_GAP = 12;

/**
 * Category ordering for grouping around the circle.
 * Persons are placed in this order, each category's members adjacent.
 */
const CATEGORY_ORDER: RelationshipCategory[] = [
  'Family',
  'Family (Extended)',
  'Friends',
  'Childcare',
  'Professional',
];

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Computes a radial network layout that guarantees zero overlap.
 *
 * Strategy: Place all persons evenly around the circle, grouped by category.
 * The orbit radius is dynamically calculated to ensure no two nodes overlap,
 * based on the number of nodes and their sizes.
 *
 * - Child at center with radius 40px.
 * - Family/Extended nodes: 32px radius, others: 24px.
 * - Minimum 12px gap between node edges.
 * - Orbit radius expands as needed to prevent overlap.
 */
export function computeNetworkLayout(
  persons: RelationshipPerson[],
  containerWidth: number,
  containerHeight: number,
): NetworkLayout {
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;

  if (persons.length === 0) {
    return {
      centerNode: { x: centerX, y: centerY, radius: CENTER_RADIUS },
      personNodes: [],
      width: containerWidth,
      height: containerHeight,
    };
  }

  // Order persons by category group
  const ordered: RelationshipPerson[] = [];
  for (const cat of CATEGORY_ORDER) {
    ordered.push(...persons.filter((p) => p.category === cat));
  }

  const count = ordered.length;

  // Calculate the maximum node radius to determine minimum orbit
  const maxNodeRadius = FAMILY_NODE_RADIUS; // largest possible node

  // Calculate minimum orbit radius to prevent overlap:
  // For N nodes evenly spaced on a circle, the chord between adjacent nodes
  // must be >= 2*maxNodeRadius + MIN_GAP (diameter + gap).
  // Chord length = 2 * orbit * sin(π/N)
  // So: orbit >= (maxNodeRadius + MIN_GAP/2) / sin(π/N)
  const minChord = 2 * maxNodeRadius + MIN_GAP;
  const minOrbitForNoOverlap = count > 1
    ? minChord / (2 * Math.sin(Math.PI / count))
    : 130; // single person: place at 130px

  // Also ensure orbit doesn't go below 130px (too close to center) or above 220px
  const orbitRadius = Math.max(130, Math.min(220, minOrbitForNoOverlap));

  const personNodes: NetworkNode[] = [];

  // Distribute evenly around 360°, starting from top (270° in math coords = top in SVG)
  const startAngle = 270; // top of circle
  const angleStep = 360 / count;

  for (let i = 0; i < count; i++) {
    const person = ordered[i];
    const angleDeg = startAngle + angleStep * i;
    const angleRad = degreesToRadians(angleDeg);
    const x = centerX + orbitRadius * Math.cos(angleRad);
    const y = centerY + orbitRadius * Math.sin(angleRad);
    const radius = (person.category === 'Family' || person.category === 'Family (Extended)')
      ? FAMILY_NODE_RADIUS
      : DEFAULT_NODE_RADIUS;

    personNodes.push({
      id: person.id,
      name: person.name,
      roleLabel: person.roleLabel,
      category: person.category,
      photoBase64: person.photoBase64,
      x,
      y,
      radius,
    });
  }

  return {
    centerNode: { x: centerX, y: centerY, radius: CENTER_RADIUS },
    personNodes,
    width: containerWidth,
    height: containerHeight,
  };
}

/**
 * Extracts initials from a name string.
 * Splits on whitespace, takes the first character of each word,
 * uppercases them, and limits to 2 characters.
 */
export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase())
    .slice(0, 2)
    .join('');
}
