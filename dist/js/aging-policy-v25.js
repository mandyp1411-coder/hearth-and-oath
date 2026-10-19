// Prospective physiology. Saved death dates and likenesses are never recalculated.
const policy={human:[65,90,105,120],elf:[100,140,155,180],dwarf:[80,105,125,145],halfling:[70,95,110,130],orc:[55,75,90,105],goblin:[50,70,85,100],tiefling:[85,110,130,155],beastfolk:[60,80,100,115]};
export function agingPolicy(person){const ancestry=person?.appearance?.ancestry||'human',[elder,frail,late,extreme]=policy[ancestry]||policy.human;return {ancestry,elder,frail,late,extreme};}
