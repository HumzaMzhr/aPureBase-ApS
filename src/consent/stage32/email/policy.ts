import {parseEmailEvidence} from '../hardening/parser';
import {resolveEvidence} from '../hardening/resolution';
/** The only C32 acquisition policy. Stage1/C31 do not import this composition. */
export const hardenedEmailPolicy=Object.freeze({parse:parseEmailEvidence,resolve:resolveEvidence});
