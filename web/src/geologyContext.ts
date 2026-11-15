// Polygon context at centroid; never an assertion about the whole 20km window.
export function insideRing(point:number[],ring:number[][]){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside}
export function inPolygon(point:number[],rings:number[][][]){return !!rings.length&&insideRing(point,rings[0])&&!rings.slice(1).some(r=>insideRing(point,r))}
export type GeologyFeature={geometry:{type:string;coordinates:number[][][]|number[][][][]};properties:Record<string,unknown>}
export function geologyAt(lon:number,lat:number,features:GeologyFeature[]){return features.filter(f=>f.geometry.type==='Polygon'?inPolygon([lon,lat],f.geometry.coordinates as number[][][]):f.geometry.type==='MultiPolygon'?(f.geometry.coordinates as number[][][][]).some(r=>inPolygon([lon,lat],r)):false).map(f=>f.properties)}
