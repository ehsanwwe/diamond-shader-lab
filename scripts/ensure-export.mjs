import { existsSync, cpSync, rmSync } from 'node:fs';
if (!existsSync('build/index.html') && existsSync('out/index.html')) { rmSync('build',{recursive:true,force:true}); cpSync('out','build',{recursive:true}); rmSync('out',{recursive:true,force:true}); }
