import type en from "./messages/en.json";

// DECISION: typed message keys via Next-Intl's augmentation. Using EN as the source of truth
// keeps the keys in one place; ID mirrors the structure.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface IntlMessages extends Messages {}
  type Messages = typeof en;
}

export {};
