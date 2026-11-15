import {useEffect,useRef,useState} from 'react'
const songs=[
 {name:'Como si nada · Ni una sola palabra · Ven, devórame otra vez',file:'tema-1.mp3',start:142},
 {name:'For Fun · Cicatrices · Pensamientos',file:'tema-2.mp3'},
 {name:'Quédate · Soy Favela · Lo que hay x aquí',file:'tema-3.mp3'},
 {name:'Te pido que la dejes · Qué tal',file:'tema-4.mp3'},
 {name:'Ex de verdad',file:'tema-5.mp3'},
 {name:'Manos de tijera',file:'tema-6.mp3'},
 {name:'¿Quién te dijo?',file:'tema-7.mp3'},
]
export default function TeamMusic(){
 const audio=useRef<HTMLAudioElement|null>(null)
 const [index,setIndex]=useState(-1),[open,setOpen]=useState(false),[status,setStatus]=useState(''),[playing,setPlaying]=useState(false)
 function choose(){
  const n=Math.floor(Math.random()*(songs.length-(index>=0?1:0)));const chosen=index>=0&&n>=index?n+1:n
  let a=audio.current;if(!a){a=new Audio();a.volume=.15;audio.current=a}
  a.src=`/musica/${songs[chosen].file}`;a.currentTime=songs[chosen].start ?? 0;setIndex(chosen);setOpen(true);setStatus('');setPlaying(true)
  a.play().catch(()=>{setPlaying(false);setStatus('Tocá reproducir para escuchar.')})
 }
 function toggle(){const a=audio.current;if(!a)return;if(a.paused){a.play().then(()=>setPlaying(true)).catch(()=>setStatus('No se pudo reproducir el audio.'))}else{a.pause();setPlaying(false)}}
 function close(){audio.current?.pause();setPlaying(false);setOpen(false)}
 useEffect(()=>()=>{audio.current?.pause();audio.current=null},[])
 return <><button type="button" onClick={choose} aria-label="Reproducir una canción aleatoria de Q’ Lokura" className="absolute left-1 -top-10 h-44 w-44 sm:left-2 sm:-top-12 sm:h-52 sm:w-52"><img src="/qkodigo-logo.png" alt="Equipo QKODIGO" className="h-full w-full object-contain"/></button>{open&&index>=0&&<aside aria-label="Reproductor de música" className="fixed bottom-4 right-4 z-50 max-w-xs rounded-xl border border-white/20 bg-black p-4 text-white shadow-lg"><div className="flex justify-between gap-4"><strong>Q’ Lokura</strong><button onClick={close}>Cerrar</button></div><p className="my-2 text-sm">{songs[index].name}</p><div className="flex gap-4 text-sm"><button onClick={toggle} className="underline">{playing?'Pausar':'Reproducir'}</button><button onClick={choose} className="underline">Otra canción</button></div>{status&&<p role="status" className="mt-2 text-xs">{status}</p>}</aside>}</>
}
