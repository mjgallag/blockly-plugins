import {Matcher} from '../types';

/** “contains” substring matcher (case-insensitive). */
export const substringMatcher: Matcher = (options, query) => {
  const q = query.trim().toLowerCase();
  return q ? options.filter((o) => o.displayText.toLowerCase().includes(q)) : options;
};
