import type { RelationshipCategory } from '@src/models/index.js';
import type { DataStore } from '@src/data-store/data-store.js';

export interface ResolvedPerson {
  personId: string;
  name: string;
  category: RelationshipCategory;
  roleLabel: string;
  notes?: string;
}

export interface PersonResolutionResult {
  resolved: Map<string, ResolvedPerson>; // raw name → resolved person
  unresolved: string[]; // names that didn't match
}

export interface PersonResolutionService {
  resolve(extractedNames: string[], childProfileId: string): PersonResolutionResult;
}

export class PersonResolutionServiceImpl implements PersonResolutionService {
  private dataStore: DataStore;

  constructor(dataStore: DataStore) {
    this.dataStore = dataStore;
  }

  resolve(extractedNames: string[], childProfileId: string): PersonResolutionResult {
    const resolved = new Map<string, ResolvedPerson>();
    const unresolved: string[] = [];

    const persons = this.dataStore.getRelationshipPersons(childProfileId);

    for (const rawName of extractedNames) {
      const normalized = rawName.toLowerCase().trim();

      if (normalized === '') {
        unresolved.push(rawName);
        continue;
      }

      let matched = false;

      // Priority 1: Exact match on person name (case-insensitive)
      for (const person of persons) {
        if (person.name.toLowerCase().trim() === normalized) {
          resolved.set(rawName, {
            personId: person.id,
            name: person.name,
            category: person.category,
            roleLabel: person.roleLabel,
            notes: person.notes,
          });
          matched = true;
          break;
        }
      }

      if (matched) continue;

      // Priority 2: Exact match on roleLabel (case-insensitive)
      for (const person of persons) {
        if (person.roleLabel.toLowerCase().trim() === normalized) {
          resolved.set(rawName, {
            personId: person.id,
            name: person.name,
            category: person.category,
            roleLabel: person.roleLabel,
            notes: person.notes,
          });
          matched = true;
          break;
        }
      }

      if (matched) continue;

      // Priority 3: Partial substring match
      for (const person of persons) {
        const personNameNorm = person.name.toLowerCase().trim();
        if (personNameNorm.includes(normalized) || normalized.includes(personNameNorm)) {
          resolved.set(rawName, {
            personId: person.id,
            name: person.name,
            category: person.category,
            roleLabel: person.roleLabel,
            notes: person.notes,
          });
          matched = true;
          break;
        }
      }

      if (!matched) {
        unresolved.push(rawName);
      }
    }

    return { resolved, unresolved };
  }
}
