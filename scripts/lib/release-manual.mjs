import {STATUSES} from './release-contract.mjs';

/** Evidence supplies observations, never permission to weaken the contract. */
export function manualAttestation(config,row){
  if(typeof config?.requiredForSoftwareGate!=='boolean')throw Error('Manual contract must explicitly declare software-gate requiredness.');
  if(!STATUSES.includes(row?.status)||typeof row.reason!=='string'||!row.reason.trim())throw Error('Manual evidence needs a valid status and nonempty reason.');
  if(row.status==='PASS'&&(
    typeof row.evidencePath!=='string'||!row.evidencePath.trim()||
    typeof row.reviewer!=='string'||!row.reviewer.trim()||
    typeof row.reviewedAt!=='string'||!Number.isFinite(Date.parse(row.reviewedAt))
  ))throw Error('Manual PASS needs an evidencePath, reviewer and valid reviewedAt.');
  return {...row,requiredForSoftwareGate:config.requiredForSoftwareGate,attestation:true};
}
