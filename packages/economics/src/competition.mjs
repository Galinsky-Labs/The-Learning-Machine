// TLM-069: entry costs for a new developer under different access-price regimes. Assumptions can reverse the ranking.
const assert=(c,m)=>{if(!c)throw new TypeError(m)};
export const REGIMES=Object.freeze(['per-work-license','collective-flat-license','learning-permission-with-lawful-copy']);
const FIELDS=['fixedEntryCostMinor','worksNeeded','perWorkLicenseMinor','collectiveFlatFeeMinor','lawfulCopyPriceMinor','expectedRevenueMinor'];
export function validateCompetitionAssumptions(a){
 assert(a&&typeof a==='object','Assumptions required');
 const keys=Object.keys(a).sort();assert(keys.join(',')===[...FIELDS].sort().join(','),'Competition requires exactly: '+FIELDS.join(', '));
 for(const k of FIELDS)assert(Number.isSafeInteger(a[k])&&a[k]>=0,k+' must be a nonnegative integer');
 return a;
}
export function entryCosts(raw){
 const a=validateCompetitionAssumptions(raw);
 const access={'per-work-license':a.perWorkLicenseMinor*a.worksNeeded,'collective-flat-license':a.collectiveFlatFeeMinor,'learning-permission-with-lawful-copy':a.lawfulCopyPriceMinor*a.worksNeeded};
 const rows=REGIMES.map(r=>{const total=a.fixedEntryCostMinor+access[r];return Object.freeze({regime:r,accessCostMinor:access[r],totalEntryCostMinor:total,marginMinor:a.expectedRevenueMinor-total,entryViable:a.expectedRevenueMinor>total})});
 const ranking=[...rows].sort((x,y)=>x.totalEntryCostMinor-y.totalEntryCostMinor||REGIMES.indexOf(x.regime)-REGIMES.indexOf(y.regime)).map(r=>r.regime);
 return Object.freeze({rows:Object.freeze(rows),cheapestForEntrant:ranking[0],ranking:Object.freeze(ranking),
  creatorSideNote:'The cheapest regime for an entrant is often the one paying creators least; compare with the earnings module before concluding.',
  evidenceClass:'illustrative'});
}
// Compares two assumption sets and reports whether the entrant's preferred regime reverses, and which inputs differ.
export function compareAssumptionSets(a,b){
 const x=entryCosts(a),y=entryCosts(b);
 return Object.freeze({first:x,second:y,reversed:x.cheapestForEntrant!==y.cheapestForEntrant,changedInputs:Object.freeze(FIELDS.filter(k=>a[k]!==b[k]))});
}
