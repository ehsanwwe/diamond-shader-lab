'use client';
import { useEffect, useRef, useState } from 'react';
import type { MeshSettings, RingSettings, StudioSettings } from './types';
import { createMeshDiamond } from '@/lib/three/meshDiamond';
import { createStudioDiamond } from '@/lib/three/studioDiamond';
import { createRingScene } from '@/lib/three/ringScene';

export type DiamondMode = 'mesh' | 'studio' | 'ring';

const loadingNames: Record<DiamondMode, string> = {
  mesh: 'Multi-Bounce Diamond Refraction',
  studio: 'Monochrome Studio Orbit',
  ring: 'Silver Halo Diamond Ring',
};

export function DiamondCanvas({mode,settings}:{mode:DiamondMode;settings:MeshSettings|StudioSettings|RingSettings}){
 const canvas=useRef<HTMLCanvasElement>(null),settingsRef=useRef(settings);
 const [status,setStatus]=useState<'loading'|'ready'|'error'|'unsupported'>('loading');
 useEffect(()=>{settingsRef.current=settings},[settings]);
 useEffect(()=>{
  if(!canvas.current)return;
  if(!window.WebGL2RenderingContext){const id=requestAnimationFrame(()=>setStatus('unsupported'));return()=>cancelAnimationFrame(id)}
  let disposed=false;const create=mode==='mesh'?createMeshDiamond:mode==='studio'?createStudioDiamond:createRingScene;
  try{const instance=create(canvas.current,()=>settingsRef.current,()=>!disposed&&setStatus('ready'),()=>!disposed&&setStatus('error'));return()=>{disposed=true;instance.dispose()}}
  catch(error){console.warn('Diamond renderer unavailable:',error);const id=requestAnimationFrame(()=>setStatus('unsupported'));return()=>{disposed=true;cancelAnimationFrame(id)}}
 },[mode]);
 return <div className="canvas-wrap"><canvas ref={canvas} aria-label={`${mode} interactive diamond rendering`}/>{status!=='ready'&&<div className="canvas-status" role="status">{status==='loading'?loadingNames[mode]:status==='unsupported'?'WebGL2 is unavailable or disabled in this browser.':'The renderer could not initialize.'}</div>}</div>
}
