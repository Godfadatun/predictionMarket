// Categorical identity for the state map. Fixed order, max 3 named entities (validated all-pairs), everyone else = Other.
// Color follows the entity, never its rank.
export const LEADER_SLOTS = [
  { match: 'Tinubu', var: '--series-1' },
  { match: 'Atiku', var: '--series-2' },
  { match: 'Obi', var: '--series-3' },
] as const;

export const leaderColor = (label: string | null) => {
  const slot = label ? LEADER_SLOTS.find((s) => label.includes(s.match)) : undefined;
  return slot ? `var(${slot.var})` : 'var(--series-other)';
};
