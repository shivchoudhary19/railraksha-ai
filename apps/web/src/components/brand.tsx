import {ShieldCheck} from 'lucide-react';
import Link from 'next/link';
export function Brand({locale,tagline}:{locale:string;tagline:string}){
  return <Link href={`/${locale}`} className="brand" aria-label="RailRaksha AI"><span className="brand-mark"><ShieldCheck size={25} strokeWidth={1.8} aria-hidden="true"/></span><span><span className="wordmark">RailRaksha<span className="wordmark-ai">AI</span></span><span className="brand-tagline">{tagline}</span></span></Link>;
}
