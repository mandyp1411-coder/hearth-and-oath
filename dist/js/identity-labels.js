// Interface labels only. Saved values and narrative pronoun grammar stay exact.
export const PRONOUN_LABELS = Object.freeze({
  'he/him': 'He/Him',
  'she/her': 'She/Her',
  'they/them': 'They/Them',
});
export function pronounDisplayLabel(value) {
  if (Object.hasOwn(PRONOUN_LABELS, value)) return PRONOUN_LABELS[value];
  // Preserve custom text; an absent or machine-shaped future enum is not a label.
  return typeof value === 'string' && value.trim() && !/^[a-z]+(?:_[a-z]+)+$/.test(value)
    ? value : 'Pronouns Unrecorded';
}
