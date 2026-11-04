// escapes % and _ so user input is matched literally inside ILIKE
export const likeContains = (term: string): string =>
  `%${term.trim().replace(/[\\%_]/g, '\\$&')}%`;
