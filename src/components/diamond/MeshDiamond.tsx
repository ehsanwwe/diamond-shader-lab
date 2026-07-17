'use client';
import { useState } from 'react';
import { DiamondCanvas } from './DiamondCanvas';
import { Controls } from './Controls';
import type { MeshSettings } from './types';
const defaults:MeshSettings={ior:2.42,dispersion:.045,tint:0,brightness:1,rotation:.12};
export function MeshDiamond(){const [settings,setSettings]=useState(defaults);return <div className="demo-grid"><div className="viewport"><DiamondCanvas mode="mesh" settings={settings}/><div className="viewport-label"><span>GLTF · BACKFACE PASS</span><span>DRAG TO ORBIT</span></div></div><Controls value={settings} onChange={setSettings} onReset={()=>setSettings(defaults)} fields={[{key:'ior',label:'Index of refraction',min:1.1,max:2.8,step:.01},{key:'dispersion',label:'Chromatic fire',min:0,max:.12,step:.005},{key:'tint',label:'Champagne tint',min:0,max:1,step:.01},{key:'brightness',label:'Exposure',min:.5,max:1.8,step:.01},{key:'rotation',label:'Rotation speed',min:0,max:.5,step:.01}]}/></div>}
