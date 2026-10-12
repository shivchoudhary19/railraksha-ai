'use client';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {useEffect,useSyncExternalStore} from 'react';
import {Languages,Moon,Sun} from 'lucide-react';
function subscribe(listener:()=>void){window.addEventListener('storage',listener);window.addEventListener('railraksha-theme',listener);return()=>{window.removeEventListener('storage',listener);window.removeEventListener('railraksha-theme',listener);};}
function darkSnapshot(){try{return localStorage.getItem('railraksha-theme')==='dark';}catch{return document.documentElement.dataset.theme==='dark';}}
export function Controls({locale,languageLabel,themeLabel}:{locale:string;languageLabel:string;themeLabel:string}){
  const path=usePathname();const other=locale==='en'?'hi':'en';const dark=useSyncExternalStore(subscribe,darkSnapshot,()=>false);
  useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';},[dark]);
  function toggle(){const theme=dark?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('railraksha-theme',theme);}catch{/* Theme still works when browser storage is disabled. */}window.dispatchEvent(new Event('railraksha-theme'));}
  return <div className="controls"><Link className="language-control" href={path.replace(/^\/(en|hi)(?=\/|$)/,`/${other}`)} aria-label={languageLabel}><Languages size={17} aria-hidden="true"/><span>{other==='hi'?'हिंदी':'EN'}</span></Link><button className="icon-button" onClick={toggle} aria-label={themeLabel} aria-pressed={dark}>{dark?<Sun size={18} aria-hidden="true"/>:<Moon size={18} aria-hidden="true"/>}</button></div>;
}
