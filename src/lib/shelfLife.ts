import type { Location } from './types';
import { addDays } from './dates';

/**
 * Typical shelf life per product type. Receipts never carry expiry dates, so
 * when a date isn't scanned or typed in we estimate one from these rules.
 * The values are deliberately conservative ("bäst före" for unopened goods
 * bought fresh in a Swedish store).
 */
export interface ShelfRule {
  category: string;
  /** Lower-case substrings matched against the product name. */
  keywords: string[];
  defaultLocation: Location;
  /** Days of shelf life per storage location (unopened). */
  days: Partial<Record<Location, number>>;
  /** Days the product keeps once opened (in the fridge). */
  openedDays?: number;
}

export const SHELF_RULES: ShelfRule[] = [
  { category: 'Mjölk & fil', keywords: ['mjölk', 'mjolk', 'fil ', 'filmjölk', 'yoghurt', 'yogurt', 'kvarg', 'grädde', 'gradde', 'creme fraiche', 'crème fraiche', 'gräddfil', 'kefir', 'havredryck', 'oatly'], defaultLocation: 'kyl', days: { kyl: 9, frys: 60 }, openedDays: 4 },
  { category: 'Ost', keywords: ['ost', 'cheddar', 'brie', 'mozzarella', 'parmesan', 'halloumi', 'fetaost', 'feta', 'philadelphia', 'keso', 'cottage'], defaultLocation: 'kyl', days: { kyl: 30, frys: 120 }, openedDays: 14 },
  { category: 'Smör & margarin', keywords: ['smör', 'smor', 'bregott', 'lätta', 'margarin', 'flora'], defaultLocation: 'kyl', days: { kyl: 60, frys: 180 }, openedDays: 30 },
  { category: 'Ägg', keywords: ['ägg', 'agg '], defaultLocation: 'kyl', days: { kyl: 28 } },
  { category: 'Kött', keywords: ['köttfärs', 'kottfars', 'färs', 'fars', 'nötkött', 'fläsk', 'flask', 'karré', 'entrecote', 'oxfilé', 'biff', 'kotlett', 'lamm', 'ryggbiff'], defaultLocation: 'kyl', days: { kyl: 4, frys: 120 }, openedDays: 1 },
  { category: 'Fågel', keywords: ['kyckling', 'kalkon', 'kycklingfilé', 'lårfilé', 'larfile'], defaultLocation: 'kyl', days: { kyl: 4, frys: 120 }, openedDays: 1 },
  { category: 'Fisk & skaldjur', keywords: ['lax', 'torsk', 'fisk', 'räkor', 'rakor', 'sej', 'tonfisk färsk', 'kolja', 'sill'], defaultLocation: 'kyl', days: { kyl: 3, frys: 90 }, openedDays: 1 },
  { category: 'Chark', keywords: ['skinka', 'korv', 'falukorv', 'salami', 'bacon', 'kalkonbröst', 'pålägg', 'palagg', 'leverpastej', 'prosciutto'], defaultLocation: 'kyl', days: { kyl: 14, frys: 60 }, openedDays: 5 },
  { category: 'Färdigmat', keywords: ['färdigrätt', 'lasagne', 'pizza', 'pirog', 'soppa', 'sallad färdig', 'wrap'], defaultLocation: 'kyl', days: { kyl: 4, frys: 90 }, openedDays: 2 },
  { category: 'Frukt', keywords: ['äpple', 'apple', 'banan', 'päron', 'paron', 'apelsin', 'citron', 'lime', 'kiwi', 'druvor', 'vindruvor', 'mango', 'melon', 'avokado', 'clementin', 'mandarin', 'ananas', 'plommon', 'nektarin', 'persika'], defaultLocation: 'skafferi', days: { skafferi: 7, kyl: 14, frys: 180 } },
  { category: 'Bär', keywords: ['jordgubb', 'hallon', 'blåbär', 'blabar', 'lingon', 'björnbär', 'bär'], defaultLocation: 'kyl', days: { kyl: 4, frys: 240 } },
  { category: 'Grönsaker', keywords: ['tomat', 'gurka', 'paprika', 'sallad', 'isberg', 'spenat', 'broccoli', 'blomkål', 'blomkal', 'zucchini', 'morot', 'morötter', 'selleri', 'purjo', 'champinjon', 'svamp', 'rucola', 'kål', 'kal ', 'sparris', 'majs', 'ärtor', 'bönor färska', 'örter', 'basilika', 'koriander', 'persilja', 'dill'], defaultLocation: 'kyl', days: { kyl: 7, frys: 240, skafferi: 4 } },
  { category: 'Rotfrukter & lök', keywords: ['potatis', 'lök', 'lok ', 'rödlök', 'vitlök', 'vitlok', 'sötpotatis', 'rödbeta', 'palsternacka', 'ingefära'], defaultLocation: 'skafferi', days: { skafferi: 21, kyl: 30 } },
  { category: 'Bröd', keywords: ['bröd', 'brod', 'limpa', 'baguette', 'fralla', 'frallor', 'tortilla', 'bulle', 'kanelbulle', 'hamburgerbröd', 'korvbröd', 'pitabröd', 'toast'], defaultLocation: 'skafferi', days: { skafferi: 5, frys: 90, kyl: 7 } },
  { category: 'Juice & dryck', keywords: ['juice', 'apelsinjuice', 'smoothie', 'läsk', 'cola', 'saft', 'öl', 'vatten', 'mineralvatten'], defaultLocation: 'kyl', days: { kyl: 21, skafferi: 180 }, openedDays: 5 },
  { category: 'Frysvaror', keywords: ['glass', 'fryst', 'frysta', 'pommes', 'fiskpinnar', 'frysgrönsaker', 'wokgrönsaker'], defaultLocation: 'frys', days: { frys: 180 } },
  { category: 'Såser & dressing', keywords: ['ketchup', 'senap', 'majonnäs', 'majonas', 'dressing', 'sås', 'sas ', 'pesto', 'soja', 'salsa', 'sylt', 'marmelad', 'dip ', 'dipp', 'aioli', 'bearnaise'], defaultLocation: 'skafferi', days: { skafferi: 180, kyl: 180 }, openedDays: 30 },
  { category: 'Torrvaror', keywords: ['pasta', 'spaghetti', 'makaroner', 'ris', 'mjöl', 'mjol', 'socker', 'havregryn', 'flingor', 'müsli', 'musli', 'bulgur', 'couscous', 'linser', 'nudlar', 'kaffe', 'te ', 'kakao', 'knäckebröd', 'knackebrod', 'nötter', 'mandel', 'kex', 'chips'], defaultLocation: 'skafferi', days: { skafferi: 270 } },
  { category: 'Konserver', keywords: ['krossade tomater', 'konserv', 'burk', 'kokosmjölk', 'tonfisk', 'kikärtor', 'bönor', 'majs burk', 'cornichon', 'pickles', 'oliver', 'inlagd', 'jalapeno'], defaultLocation: 'skafferi', days: { skafferi: 365 }, openedDays: 3 },
];

export const FALLBACK_RULE: ShelfRule = {
  category: 'Övrigt',
  keywords: [],
  defaultLocation: 'kyl',
  days: { kyl: 7, frys: 90, skafferi: 30 },
  openedDays: 4,
};

const FALLBACK_DAYS: Record<Location, number> = { kyl: 7, frys: 90, skafferi: 30 };

export const CATEGORIES = [...SHELF_RULES.map((r) => r.category), FALLBACK_RULE.category];

/** Find the best matching rule for a product name (longest keyword wins). */
export function matchRule(name: string): ShelfRule {
  const n = ` ${name.toLowerCase()} `;
  let best: ShelfRule | null = null;
  let bestLen = 0;
  for (const rule of SHELF_RULES) {
    for (const kw of rule.keywords) {
      if (kw.length > bestLen && n.includes(kw)) {
        best = rule;
        bestLen = kw.length;
      }
    }
  }
  return best ?? FALLBACK_RULE;
}

export function ruleForCategory(category: string): ShelfRule {
  return SHELF_RULES.find((r) => r.category === category) ?? FALLBACK_RULE;
}

export function shelfDays(rule: ShelfRule, location: Location, opened = false): number {
  const base = rule.days[location] ?? FALLBACK_DAYS[location];
  if (opened && rule.openedDays !== undefined && location !== 'frys') {
    return Math.min(base, rule.openedDays);
  }
  return base;
}

/** Estimated expiry date for a product stored at `location` from `fromDate`. */
export function estimateExpiry(rule: ShelfRule, location: Location, fromDate: string, opened = false): string {
  return addDays(fromDate, shelfDays(rule, location, opened));
}
