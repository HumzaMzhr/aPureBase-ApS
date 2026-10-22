// Grammar tokens, not address/clinic replacement rules. No campaign transcript.
export const separators:Readonly<Record<string,string>>=Object.freeze({snabela:'@','snabel-a':'@','snabel a':'@',at:'@','@':'@',punktum:'.',dot:'.','.':'.',bindestreg:'-',streg:'-',hyphen:'-','-':'-',underscore:'_',understreg:'_',understregning:'_','_':'_',plus:'+','+':'+'});
export const digits:Readonly<Record<string,string>>=Object.freeze({nul:'0',en:'1',et:'1',to:'2',tre:'3',fire:'4',fem:'5',seks:'6',syv:'7',otte:'8',ni:'9'});
export const letterNames:Readonly<Record<string,string>>=Object.freeze({a:'a',be:'b',se:'c',de:'d',e:'e',ef:'f',ge:'g',hå:'h',i:'i',jå:'j',kå:'k',el:'l',em:'m',en:'n',o:'o',pe:'p',ku:'q',er:'r',es:'s',te:'t',u:'u',ve:'v',dobbeltve:'w',eks:'x',y:'y',sæt:'z'});
export const spellingWords:Readonly<Record<string,string>>=Object.freeze(Object.fromEntries(['anna','børge','cecilie','dora','erik','frederik','georg','hans','ida','jens','knud','ludvig','marie','niels','oskar','peter','quintus','rasmus','søren','theodor','ulla','viggo','william','xenia','yrsa','zacharias'].map((s,i)=>[s,'abcdefghijklmnopqrstuvwxyz'[i]])));
export function naturalNumber(word:string):string|undefined {
 const teens=['ti','elleve','tolv','tretten','fjorten','femten','seksten','sytten','atten','nitten'];
 if(teens.includes(word))return String(teens.indexOf(word)+10);
 const tens:Record<string,number>={tyve:20,tredive:30,fyrre:40,halvtreds:50,tres:60,halvfjerds:70,firs:80,halvfems:90};
 if(tens[word])return String(tens[word]);
 const m=/^(en|to|tre|fire|fem|seks|syv|otte|ni)og(.+)$/u.exec(word);
 return m&&tens[m[2]]?String(tens[m[2]]+Number(digits[m[1]])):undefined;
}
