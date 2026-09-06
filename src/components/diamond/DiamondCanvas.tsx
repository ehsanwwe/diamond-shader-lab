'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { MeshSettings, RingSettings, RingView, StudioSettings } from './types';
import { createMeshDiamond } from '@/lib/three/meshDiamond';
import { createStudioDiamond } from '@/lib/three/studioDiamond';
import { createRingScene } from '@/lib/three/ringScene';

export type DiamondMode = 'mesh' | 'studio' | 'ring';

// imperative access to the camera of renderers that expose one (the ring box)
export type DiamondCanvasHandle = { getView(): RingView | undefined; setView(view: RingView): void };

type Instance = { dispose(): void; getView?(): RingView; setView?(view: RingView): void };

const loadingNames: Record<DiamondMode, string> = {
  mesh: 'Multi-Bounce Diamond Refraction',
  studio: 'Monochrome Studio Orbit',
  ring: 'Silver Halo Diamond Ring',
};

const sameView = (a: RingView | undefined, b: RingView) =>
  !!a && Math.abs(a.azimuth - b.azimuth) < 0.05 && Math.abs(a.polar - b.polar) < 0.05 && Math.abs(a.zoom - b.zoom) < 0.005;

export const DiamondCanvas = forwardRef<DiamondCanvasHandle, {mode:DiamondMode;settings:MeshSettings|StudioSettings|RingSettings;onView?:(view:RingView)=>void}>(
 function DiamondCanvas({mode,settings,onView},ref){
 const canvas=useRef<HTMLCanvasElement>(null),settingsRef=useRef(settings),onViewRef=useRef(onView),instanceRef=useRef<Instance|null>(null);
 const [status,setStatus]=useState<'loading'|'ready'|'error'|'unsupported'>('loading');
 useEffect(()=>{settingsRef.current=settings},[settings]);
 useEffect(()=>{onViewRef.current=onView},[onView]);
 useImperativeHandle(ref,()=>({getView:()=>instanceRef.current?.getView?.(),setView:(v)=>instanceRef.current?.setView?.(v)}),[]);
 useEffect(()=>{
  if(!canvas.current)return;
  if(!window.WebGL2RenderingContext){const id=requestAnimationFrame(()=>setStatus('unsupported'));return()=>cancelAnimationFrame(id)}
  let disposed=false;const create=mode==='mesh'?createMeshDiamond:mode==='studio'?createStudioDiamond:createRingScene;
  try{
   const instance:Instance=create(canvas.current,()=>settingsRef.current,()=>!disposed&&setStatus('ready'),()=>!disposed&&setStatus('error'));
   instanceRef.current=instance;
   // report the camera a few times a second, only when it actually moved
   let last:RingView|undefined;
   const poll=window.setInterval(()=>{const v=instance.getView?.();if(v&&!sameView(last,v)){last=v;onViewRef.current?.(v)}},250);
   return()=>{disposed=true;clearInterval(poll);instanceRef.current=null;instance.dispose()}
  }
  catch(error){console.warn('Diamond renderer unavailable:',error);const id=requestAnimationFrame(()=>setStatus('unsupported'));return()=>{disposed=true;cancelAnimationFrame(id)}}
 },[mode]);
 return <div className="canvas-wrap"><canvas ref={canvas} aria-label={`${mode} interactive diamond rendering`}/>{status!=='ready'&&<div className="canvas-status" role="status">{status==='loading'?loadingNames[mode]:status==='unsupported'?'WebGL2 is unavailable or disabled in this browser.':'The renderer could not initialize.'}</div>}</div>
});
