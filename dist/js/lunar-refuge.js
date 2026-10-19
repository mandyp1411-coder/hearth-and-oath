// Shared refuge bookkeeping stays independent of contacts and workshop rules.
// This lets the standalone game preserve the same dependency order as modules.
export function recordIndependentRefuge(s) {
  if(s.sanctuaries&&s.hero.condition?.type==='lycanthrope')s.sanctuaries.independentPreparedUntil=Math.max(s.sanctuaries.independentPreparedUntil,s.hero.condition.preparedUntil||0);
}
