// "Samuel Adeyemi O." -> "Samuel A." for the bed grid
export const shortName = (fullName: string): string => {
  const [first, second] = fullName.trim().split(/\s+/);
  return second ? `${first} ${second[0].toUpperCase()}.` : first;
};
