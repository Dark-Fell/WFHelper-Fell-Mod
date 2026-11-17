// Typed shim over the generated table (scripts/pets/build-pet-traits.mjs writes
// the JSON; sources are DE's PublicExport ExportFlavour plus the browse.wf
// swatch art the hex is averaged from).
import data from "./petTraits.json";

// en/de/zh come from the generated table; Spanish has no PET_TRAITS entry yet, so
// petGenetics falls back to English for it. Keeping the type free of LocaleCode
// avoids dragging the DOM-using i18n module into the main-process typecheck.
interface PetTraitName {
  en: string;
  de: string;
  zh: string;
  es?: string;
}

interface PetColorTrait {
  name: PetTraitName;
  /** Average sRGB of the store swatch; DE ships no colour value of its own. */
  hex: string;
}

interface PetTraitTable {
  colors: Record<string, PetColorTrait>;
  patterns: Record<string, { name: PetTraitName }>;
}

export const PET_TRAITS: PetTraitTable = data;
