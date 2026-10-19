// Authored terms belong to a particular dilemma, not a universal moral price list.
// Tuples are attended days, fee and proceeds. Social effects are captured at opening.
const schedules={
  cracked_mark:[[[4,12,0],[3,6,28],[2,0,16]],[[5,10,0],[3,0,24],[2,0,0]],[[3,4,0],[2,18,0],[4,26,0]]],
  two_names:[[[6,8,0],[2,4,22],[2,0,34]],[[3,6,0],[5,0,42],[4,0,12]],[[2,14,0],[3,8,28],[4,20,0]]],
  winter_commons:[[[4,10,0],[5,0,36],[3,4,0]],[[2,12,0],[1,0,18],[3,0,24]],[[3,6,0],[2,8,0],[4,30,0]]],
  hearth_letter:[[[2,3,0],[2,12,18],[1,0,12]],[[3,2,0],[4,0,26],[2,8,0]],[[2,4,0],[1,6,0],[3,0,16]]],
  night_door:[[[1,10,0],[2,4,18],[1,0,22]],[[3,12,0],[4,6,28],[4,0,0]],[[4,16,0],[4,12,32],[3,24,0]]],
  own_key:[[[5,4,0],[4,0,32],[2,0,14]],[[2,0,0],[5,2,44],[3,8,0]],[[4,6,0],[3,4,24],[5,18,0]]],
  buried_bell:[[[3,4,0],[4,0,24],[2,0,18]],[[4,8,0],[3,4,30],[3,0,0]],[[2,6,0],[5,8,34],[4,12,16]]],
  water_second_face:[[[2,4,0],[4,0,24],[2,0,20]],[[3,8,0],[5,4,32],[4,0,14]],[[2,2,0],[3,6,24],[4,18,0]]],
  hollow_mask:[[[3,2,0],[4,0,24],[2,0,18]],[[2,6,0],[4,4,26],[3,0,8]],[[4,4,0],[3,6,30],[5,16,0]]],
  moth_window:[[[2,6,0],[4,0,24],[3,0,14]],[[3,8,0],[2,4,18],[4,2,12]],[[2,4,0],[4,10,32],[3,8,18]]],
  silverleaf_names:[[[4,4,0],[4,0,24],[2,0,20]],[[3,2,0],[5,6,30],[3,0,14]],[[2,6,0],[4,8,26],[5,12,0]]],
  stone_last_note:[[[4,6,0],[4,0,24],[2,0,18]],[[3,4,0],[5,6,36],[4,0,12]],[[2,4,0],[3,8,28],[5,10,16]]],
  ninth_hearth:[[[2,8,0],[4,0,24],[3,0,12]],[[3,10,0],[4,4,26],[2,0,18]],[[4,6,0],[3,8,28],[5,16,0]]],
  bannerless_oath:[[[3,2,0],[4,0,24],[2,0,16]],[[4,4,0],[3,6,28],[5,0,12]],[[2,2,0],[4,8,30],[3,14,0]]],
  drain_lullaby:[[[3,4,0],[4,0,24],[2,0,18]],[[4,6,0],[3,4,26],[4,0,14]],[[2,4,0],[5,8,32],[3,12,16]]],
  horns_candle:[[[2,4,0],[4,0,24],[3,0,20]],[[4,8,0],[3,6,28],[2,0,12]],[[3,6,0],[4,10,34],[5,16,0]]],
  road_four_tracks:[[[4,6,0],[4,0,24],[2,0,22]],[[3,4,0],[5,8,36],[4,0,16]],[[2,6,0],[3,10,30],[5,18,0]]],
  moon_broken_roof:[[[3,4,0],[4,0,24],[2,0,16]],[[4,6,0],[3,8,28],[5,0,22]],[[2,4,0],[5,12,38],[3,20,0]]],
  marriage_second_chair:[[[2,0,0],[5,8,32],[3,0,18]],[[4,14,0],[5,10,34],[2,0,0]],[[5,24,0],[4,12,28],[3,6,0]]],
  festival_hollow_lantern:[[[3,8,0],[4,10,28],[2,0,16]],[[4,18,0],[3,12,30],[5,0,20]],[[5,24,0],[4,30,0],[3,0,22]]],
  deserter_unfinished_boot:[[[2,12,0],[5,6,26],[3,0,0]],[[4,16,0],[5,12,38],[3,0,26]],[[3,8,0],[4,10,30],[5,0,12]]],
  false_accusation_ash_coat:[[[3,6,0],[5,8,32],[2,0,12]],[[5,22,0],[4,14,30],[3,0,16]],[[2,10,0],[3,4,22],[4,0,0]]],
  child_other_road:[[[3,16,0],[5,8,0],[2,0,0]],[[4,18,0],[5,24,0],[3,0,12]],[[3,12,0],[5,28,0],[4,8,0]]],
  curse_survivor_last_lamp:[[[4,18,0],[2,20,0],[3,0,0]],[[5,24,0],[5,18,30],[3,0,14]],[[3,8,0],[4,16,0],[2,0,20]]],
};
const ids=['care','enterprise','coercion'];
const make=(label,outcome,deed,extra={})=>({label,outcome,deed,...extra});

export function recordedDeed(a,choice){
  if(choice.deed)return choice.deed;
  const text=choice.label.toLowerCase();
  if(/restore.*authorship|correct.*report|restore.*credit/.test(text))return 'restore_credit';
  if(/unpaid|demand service|service in exchange/.test(text))return 'unpaid_work';
  if(/false report|invented fault/.test(text))return 'false_report';
  if(/erase.*name|take their credit|claim sole authority/.test(text))return 'take_credit';
  if(/reserve.*record|control who may learn|exclusive.*teaching|exclude.*account|control of.*archive/.test(text))return 'exclude_archive';
  if(/sell.*route/.test(text))return 'sell_route';
  if(/release.*route/.test(text))return 'release_route';
  if(/exclusive.*gate|exclusive admission/.test(text))return 'exclude_gate';
  if(/silence|suppress|pressure.*withdraw|buy the record/.test(text))return 'suppress_account';
  if(/both names|shared credit|credited copy|shared attribution|joint correction/.test(text))return 'share_credit';
  const index=a.choices.indexOf(choice);
  return `${a.id}:${index<0?a.chapter:index}:${choice.id}`;
}

export function storyDeeds(a){
  const facts={credit:false,unpaid:false,falseReport:false,archive:false,route:false,gate:false,shared:false,suppressed:false};
  for(const choice of a.choices){
    const deed=recordedDeed(a,choice);
    if(deed==='take_credit')facts.credit=true;
    if(deed==='share_credit')facts.shared=true;
    if(deed==='unpaid_work')facts.unpaid=true;
    if(deed==='false_report')facts.falseReport=true;
    if(deed==='exclude_archive')facts.archive=true;
    if(deed==='sell_route')facts.route=true;
    if(deed==='exclude_gate')facts.gate=true;
    if(deed==='suppress_account')facts.suppressed=true;
    if(['restore_credit','restore_credit_access'].includes(deed)){facts.credit=false;facts.falseReport=false;facts.shared=true;facts.suppressed=false;}
    if(['restore_access','restore_credit_access'].includes(deed)){facts.archive=false;facts.suppressed=false;}
    if(deed==='pay_arrears')facts.unpaid=false;
    if(deed==='release_route')facts.route=false;
    if(deed==='open_gate')facts.gate=false;
  }
  // Remedies change the present dispute without rewriting a saved decision.
  const kinds={take_credit:'credit',unpaid_work:'unpaid',false_report:'falseReport',exclude_archive:'archive',sell_route:'route',exclude_gate:'gate',suppress_account:'suppressed'};
  for(const r of a.repairAccounts||[]){
    const original=a.choices[r.index];
    if(!original||original.day>r.day||kinds[recordedDeed(a,original)]!==r.kind)continue;
    if(!a.choices.slice(r.index+1).some(c=>kinds[recordedDeed(a,c)]===r.kind&&c.day>=r.day))facts[r.kind]=false;
  }
  return facts;
}

export function continuityRow(a,base){
  if(!a.choices.length||a.chapter>=3)return base;
  const f=storyDeeds(a),last=a.choices.at(-1);
  if(a.id==='two_names'){
    if(a.chapter===1&&/credited copy/.test(last.label.toLowerCase()))return [
      '{name} brings the credited copying contract. A flood has moved its crossing, and the caravan leaves tomorrow. The buyer now demands a fresh survey without paying for more field work.',
      make('Defend the limit and share the urgent correction','You record the changed crossing and both contributors. The buyer must obtain agreement before requesting more work.','share_credit'),
      make('Agree a new paid survey with both names','The extra field work has its own fee and deadline. Both surveyors keep their credit.','share_credit'),
      make('Force the colleague to finish unpaid work','You keep the buyer’s extension fee while requiring unpaid field work. A dated wage grievance remains beside the credited map.','unpaid_work'),
    ];
    if(a.chapter===1)return [
      `{name} has measured a crossing washed away since the first map. The caravan needs a corrected route before tomorrow.${f.credit?' Their original signed pages also expose your earlier claim to sole authorship.':' Your earlier signatures remain on the first account.'}`,
      make(f.credit?'Correct your claim and credit the new observations':'Compare the changed crossing together',f.credit?'You publicly correct the authorship claim and record both surveyors. The correction costs your local standing; the new crossing is documented.':'The caravan receives a newly measured crossing, signed by both surveyors. The old map remains dated in the record.',f.credit?'restore_credit':'share_credit',f.credit?{reputationCost:true}:{}),
      make('Sell a bounded inspection under your own name','You check only the section you personally inspected and state the limits. The original fieldworker’s account remains available.','bounded_inspection'),
      make('Send a false report about the rival’s new route','You invent a fault in their new route. The buyer suspends the rival’s work; the measured crossing can still expose your allegation.','false_report'),
    ];
    const grievance=f.unpaid?'The archive hearing now includes the colleague’s unpaid-work tally. The survey’s shared credit remains on the map.':f.falseReport?'The new crossing measurements contradict the false report you sent. The hearing names your disputed allegation and preserves the measurement beside it.':f.suppressed?'The patron has withheld the account you paid to suppress. The archive now requires its original pages, including every maker’s signature.':f.credit?'The permanent archive requests the original signed field pages. Your claim to their authorship is still unresolved.':'The ferry archive needs one dated account of the changed crossing. Both surveyors bring their earlier pages; the keeper will preserve disagreement as well as corrections.';
    return [grievance+' {name} asks what the next caravan should be allowed to read.',
      f.unpaid?make('Pay the arrears and keep both names','You pay the recorded arrears and preserve the colleague’s credited work. The archive records the wage grievance and its settlement.','pay_arrears'):
        make(f.credit||f.falseReport?'Correct your claim before the public archive':'File both accounts beside a joint correction',f.credit||f.falseReport?'You correct the exact disputed claim. The named maker’s account is restored; the public correction costs your own local standing.':'The archive keeps the old disagreement and the new measured crossing, with both contributors named.',f.credit||f.falseReport?'restore_credit':'share_credit',f.credit||f.falseReport?{reputationCost:true}:{}),
      make(f.unpaid?'Fund an independent wage review':'Pay for an independent archive review',f.unpaid?'An independent reviewer examines the unpaid-work account. Paying for the review does not itself settle the wages.':'An independent reviewer keeps the original pages and disputed claims distinct. You pay for the review rather than selling a verdict.','independent_review',{review:true}),
      make('Use the patron to exclude the rival’s account','The keeper restricts the archive under pressure. The surviving pages and any unsettled wage or authorship grievance remain outside your control.','exclude_archive'),
    ];
  }
  if(a.id==='own_key'){
    if(a.chapter===1)return [
      `{name} has won a new commission and needs a reference before its deadline. The patron asks whether their methods may belong to their own practice.${f.credit?' Their dated contributions still contradict the sole credit you claimed.':' Your earlier agreement already credits both contributions.'}`,
      make(f.credit?'Restore their authorship and endorse their practice':'Endorse their independent practice with a clear limit',f.credit?'You correct the authorship record at a cost to your local standing. The new commission belongs to its maker.':'Your reference names only the work you observed. The new practice keeps control of its own methods and time.',f.credit?'restore_credit':'independent_reference',f.credit?{reputationCost:true}:{}),
      make('Compete through a separate paid commission','You complete your own paid contribution and keep each maker’s credit separate. The buyer can choose between independent practices.','share_credit'),
      make('Reserve the teaching record and control who may learn','You restrict access to the teaching record. Existing authorship credits remain written; the grievance is exclusion from the archive.','exclude_archive'),
    ];
    return [
      `{name} returns with a learner of their own. The next workbench needs permission to copy the old teaching record.${f.archive?' Your restriction still blocks access; that restriction did not erase the names already on the work.':f.credit?' The original maker’s missing credit must also be addressed.':' The earlier contributions remain separately credited.'}`,
      make(f.credit?'Restore authorship and open the teaching record':'Open the record to independent learners',f.credit?'The correction costs your local standing and restores the maker’s name. Independent learners receive an agreed copy.':'You attend the copying work and agree access at the existing workbench. Each learner keeps control of their own future.',f.credit?'restore_credit_access':'restore_access',f.credit?{reputationCost:true}:{}),
      make('Fund an independent copy without owning the new school','You pay for a separately held copy. Each practice keeps its own prices and names; the original archive’s restrictions remain recorded.','independent_copy',{review:true}),
      make('Retain exclusive control of the archive','You pay to maintain the restricted archive. The other learners keep their own account of exclusion. The existing credits remain visible while access is denied.','exclude_archive'),
    ];
  }
  if(a.id==='night_door'){
    if(a.chapter===1)return [
      `Winter fuel now limits the existing room to one more week. {name} brings the hosts’ proposed rota.${f.route?' The traveler also brings the private route you sold; that disclosure is still a separate grievance.':' The earlier room agreement did not purchase the traveler’s future service.'}`,
      make(f.route?'Release the sold route and agree a limited shelter rota':'Agree a shelter rota with an end date',f.route?'You release the private route and fund the agreed week. The household chooses what may be recorded afterward.':'The hosts fund one agreed week and name when their shifts end. They promise no endless unpaid care.',f.route?'release_route':'shelter_limit'),
      make('Offer paid work with hours and an end date','The traveler accepts a bounded paid contribution. The room and work agreements remain separate.','paid_work'),
      make('Require unpaid service in exchange for shelter','You make shelter conditional on unpaid service. The household records the imposed shifts and the hours it worked.','unpaid_work'),
    ];
    return [
      `The gatekeeper is leaving, and the hosts must choose who controls the existing door.${f.unpaid?' Their tally lists the unpaid service you required.':f.route?' The sold route remains in the gate account.':f.gate?' Your exclusive admission rule is still disputed.':' The winter agreement has reached its recorded end.'} {name} brings a proposed charter covering the hosts’ existing rooms and agreed rota.`,
      make(f.unpaid?'Pay the shelter arrears and open the shared door':'Agree a shared door with willing hosts',f.unpaid?'You pay the service arrears and attend the charter work. The existing room opens under a rota the hosts can end.':'You fund supplies and attend the charter work for the existing room. Hosts keep a limited rota and travelers keep their private routes.',f.unpaid?'pay_arrears':'open_gate'),
      make('Run the existing rooms as a private inn','The hosts agree prices and boundaries for their existing rooms. Buying a room never buys its guest’s service.','priced_door'),
      make('Buy the patron’s exclusive admission charter','You pay for control of the existing door. Refused households retain the account of the restriction and seek other hosts.','exclude_gate'),
    ];
  }
  return base;
}

export function chapterTerms(a,pick,row){
  const option=row[ids.indexOf(pick)+1];
  if(option.terms)return {...option.terms};
  if(a.contentVersion!==4)return {days:{care:6,enterprise:4,coercion:3}[pick],cost:pick==='care'?8+a.chapter*8:0,reward:pick==='enterprise'?24+a.chapter*18:pick==='coercion'?60+a.chapter*30:0,bond:pick==='care'?8:pick==='enterprise'?2:-18,standing:option.reputationCost||/costs your reputation/.test(option.outcome)?-3:pick==='care'?3:pick==='coercion'?-5:0,career:option.reputationCost||/costs your reputation/.test(option.outcome)?-5:pick==='care'?5:pick==='enterprise'?2:-12,skill:pick==='care'?1:0,visit:false};
  const [days,cost,reward]=schedules[a.id][Math.min(a.chapter,2)][ids.indexOf(pick)];
  const terms={days,cost,reward,bond:pick==='care'?6:pick==='enterprise'?2:-14,standing:pick==='care'?2:pick==='enterprise'?0:-4,career:pick==='care'?3:pick==='enterprise'?2:-8,skill:pick==='care'?1:0,visit:false};
  if(a.id==='child_other_road'){terms.standing=0;terms.bond=pick==='coercion'?-18:pick==='care'?4:1;}
  if(option.reputationCost){terms.standing=-3;terms.career=-5;terms.bond=10;}
  if(option.review){terms.reward=0;terms.bond=2;terms.standing=0;terms.career=0;}
  if(/^(pay|buy|fund|purchase)\b/i.test(option.label))terms.cost=Math.max(terms.cost,4);
  if(a.id==='two_names'&&a.chapter===2&&pick==='care'&&storyDeeds(a).unpaid)terms.cost=18;
  if(a.id==='night_door'&&a.chapter===2&&pick==='care'&&storyDeeds(a).unpaid)terms.cost=22;
  // Only hands-on work needs the recorded site; letters and bounded agreements do not.
  terms.visit=(a.id==='winter_commons'&&a.chapter===0&&pick==='care')||(a.id==='cracked_mark'&&a.chapter<2&&pick==='care')||(a.id==='festival_hollow_lantern'&&a.chapter===1&&pick==='care');
  return terms;
}

export function captureStoryRow(a,base){
  const row=continuityRow(a,base);
  return [row[0],...row.slice(1).map((option,i)=>({...option,deed:recordedDeed(a,{...option,id:ids[i]}),terms:chapterTerms({...a,contentVersion:4},ids[i],row)}))];
}

export function validStoryTerms(t){
  const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
  return t&&integer(t.days,1,14)&&integer(t.cost,0,1000)&&integer(t.reward,0,1000)&&integer(t.bond,-25,25)&&integer(t.standing,-20,20)&&integer(t.career,-25,25)&&integer(t.skill,0,2)&&typeof t.visit==='boolean';
}
