export type Cover={id:string;valid_fraction:number;water:number|null;built:number|null;vegetation:number|null;ndvi:number|null}
export type MaskPolicy={enabled:boolean;waterMax:number;builtMax:number;vegetationMax:number;ndviMax:number|null}
export const DEFAULT_MASK:MaskPolicy={enabled:false,waterMax:.01,builtMax:.01,vegetationMax:.1,ndviMax:null}
export function maskDecision(c:Cover|undefined,p:MaskPolicy){
 if(!p.enabled)return {status:'off',reasons:[]}
 for(const t of [p.waterMax,p.builtMax,p.vegetationMax])if(!Number.isFinite(t)||t<0||t>1)throw Error('Umbral inválido')
 if(p.ndviMax!==null&&(!Number.isFinite(p.ndviMax)||p.ndviMax< -1||p.ndviMax>1))throw Error('Umbral NDVI inválido')
 const reasons:string[]=[];let unknown=!c||!Number.isFinite(c.valid_fraction)||c.valid_fraction<.99
 for(const [key,limit] of [['water',p.waterMax],['built',p.builtMax],['vegetation',p.vegetationMax]] as const){const v=c?.[key];if(v==null||!Number.isFinite(v)||v<0||v>1)unknown=true;else if(v>limit)reasons.push(key)}
 if(p.ndviMax!==null){const v=c?.ndvi;if(v==null||!Number.isFinite(v)||v< -1||v>1)unknown=true;else if(v>=p.ndviMax)reasons.push('ndvi')}
 return {status:reasons.length?'excluded':unknown?'unknown':'pass',reasons}
}
