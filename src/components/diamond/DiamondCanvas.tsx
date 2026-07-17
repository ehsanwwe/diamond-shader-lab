'use client';
import { useEffect, useRef, useState } from 'react';
import type { MeshSettings, ProceduralSettings } from './types';
import { createMeshDiamond } from '@/lib/three/meshDiamond';
import { createProceduralDiamond } from '@/lib/three/proceduralDiamond';

export function DiamondCanvas({mode,settings}:{mode:'mesh'|'procedural';settings:MeshSettings|ProceduralSettings}){
 const canvas=useRef<HTMLCanvasElement>(null), settingsRef=useRef(settings); const [status,setStatus]=useState<'loading'|'ready'|'error'|'unsupported'>('loading');
 useEffect(()=>{settingsRef.current=settings},[settings]);
 useEffect(()=>{if(!canvas.current)return; if(!window.WebGLRenderingContext){const id=requestAnimationFrame(()=>setStatus('unsupported'));return()=>cancelAnimationFrame(id)} let disposed=false; const create=mode==='mesh'?createMeshDiamond:createProceduralDiamond; const lifecycle=create(canvas.current,()=>settingsRef.current,()=>!disposed&&setStatus('ready'),()=>!disposed&&setStatus('error')); return()=>{disposed=true;lifecycle.dispose()};},[mode]);
 return <div className="canvas-wrap"><canvas ref={canvas} aria-label={`${mode} interactive diamond rendering`}/>{status!=='ready'&&<div className="canvas-status" role="status">{status==='loading'?'Cutting light…':status==='unsupported'?'WebGL is not supported by this browser.':'The renderer could not initialize.'}</div>}</div>
}
