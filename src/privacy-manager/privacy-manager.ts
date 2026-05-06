import type { ChildProfile } from '../models/child-profile';
import type { Person } from '../models/person';

export interface PrivacyOptions {
  useAlias: boolean;
  stripPersonNames: boolean;
}

export interface ExportableData {
  text: string;
  childProfile?: ChildProfile;
  persons?: Person[];
}

export interface PrivacyManager {
  applyAlias(content: string, childProfile: ChildProfile): string;
  stripPII(content: string, persons: Person[]): string;
  exportWithPrivacy(data: ExportableData, options: PrivacyOptions): ExportableData;
}

/**
 * Replace all occurrences of `search` in `text` with `replacement` (case-insensitive).
 * Preserves surrounding text.
 */
function replaceAllCaseInsensitive(text: string, search: string, replacement: string): string {
  if (search.length === 0) {
    return text;
  }
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(escaped, 'gi'), replacement);
}

export function createPrivacyManager(): PrivacyManager {
  return {
    applyAlias(content: string, childProfile: ChildProfile): string {
      const alias = childProfile.alias;
      // If alias is empty/undefined, fall back to displayName (no replacement)
      if (!alias || alias.trim().length === 0) {
        return content;
      }
      return replaceAllCaseInsensitive(content, childProfile.displayName, alias);
    },

    stripPII(content: string, persons: Person[]): string {
      let result = content;
      for (const person of persons) {
        const label = person.role && person.role.trim().length > 0 ? person.role : 'Person';
        result = replaceAllCaseInsensitive(result, person.name, label);
      }
      return result;
    },

    exportWithPrivacy(data: ExportableData, options: PrivacyOptions): ExportableData {
      let text = data.text;

      if (options.useAlias && data.childProfile) {
        text = this.applyAlias(text, data.childProfile);
      }

      if (options.stripPersonNames && data.persons) {
        text = this.stripPII(text, data.persons);
      }

      return { ...data, text };
    },
  };
}
