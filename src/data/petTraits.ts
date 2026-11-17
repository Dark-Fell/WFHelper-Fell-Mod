// Typed shim over the generated table (scripts/pets/build-pet-traits.mjs writes
// the JSON; sources are DE's PublicExport ExportFlavour plus the browse.wf
// swatch art the hex is averaged from).
import data from "./petTraits.json";
import type { LocaleCode } from "../lib/i18n.js";

// English is the only name guaranteed; petGenetics falls back to it when a
// locale has no translated swatch name, so adding a UI locale never needs the
// generated table to be rebuilt.
type PetTraitName = { en: string } & Partial<Record<Exclude<LocaleCode, "en">, string>>;

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
