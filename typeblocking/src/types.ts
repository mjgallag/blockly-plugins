export type Option = string;

/** Any matching strategy must implement this signature. */
export interface Matcher {
  (options: Option[], query: string): Option[];
}
