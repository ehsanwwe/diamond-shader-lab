'use client';
import { useEffect, useRef, useState } from 'react';
import type { RingSettings } from './types';
import { createRingScene } from '@/lib/three/ringScene';

export function RingCanvas({settings}:{settings:RingSettings}){
 const canvas=useRef<HTMLCanvasElement>(null),settingsRef=useRef(settings);
 const [status,setStatus]=useState<'loading'|'ready'|'error'|'unsupported'>('loading');
 useEffect(()=>{settingsRef.current=settings},[settings]);
 useEffect(()=>{
  if(!canvas.current)return;
  if(!window.WebGL2RenderingContext){const id=requestAnimationFrame(()=>setStatus('unsupported'));return()=>cancelAnimationFrame(id)}
  let disposed=false;
  try{const instance=createRingScene(canvas.current,()=>settingsRef.current,()=>!disposed&&setStatus('ready'),()=>!disposed&&setStatus('error'));return()=>{disposed=true;instance.dispose()}}
  catch(error){console.warn('Ring renderer unavailable:',error);const id=requestAnimationFrame(()=>setStatus('unsupported'));return()=>{disposed=true;cancelAnimationFrame(id)}}
 },[]);
 return <div className="canvas-wrap"><canvas ref={canvas} aria-label="interactive diamond ring"/>{status!=='ready'&&<div className="canvas-status" role="status">{status==='unsupported'?'WebGL2 is unavailable or disabled in this browser.':status==='error'?'The renderer could not initialize.':''}</div>}</div>
}
