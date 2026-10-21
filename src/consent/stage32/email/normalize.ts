import type {Normalization} from './types';

export function validEmail(value:string) {
 if(value.length>254 || !/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/u.test(value))return false;
 const [local,domain]=value.split('@');
 return local.length<=64 && !local.startsWith('.') && !local.endsWith('.') && !local.includes('..') && domain.split('.').every(label=>label.length<=63 && !label.startsWith('-') && !label.endsWith('-') && label.length>0);
}
/** Domain case is insensitive; local-part case, dots and plus tags remain exact. */
export function normalizeEmail(value:string):{value:string; operations:Normalization[]} {
 const at=value.indexOf('@');
 const normalized=at<0?value:value.slice(0,at+1)+value.slice(at+1).toLowerCase();
 return {value:normalized,operations:normalized===value?[]:[{operation:'DOMAIN_CASE_FOLD',before:value,after:normalized}]};
}
