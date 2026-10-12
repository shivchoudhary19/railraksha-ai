'use client';
export default function ErrorPage({reset}:{reset:()=>void}){
  const hi=typeof document!=='undefined'&&document.documentElement.lang==='hi';
  return <section className="container content-page"><h1>{hi?'यह पेज अभी उपलब्ध नहीं है।':'This page is temporarily unavailable.'}</h1><p>{hi?'कृपया थोड़ी देर में फिर कोशिश करें।':'Please try again shortly.'}</p><button className="button" onClick={reset}>{hi?'फिर कोशिश करें':'Try again'}</button></section>;
}
