import {z} from 'zod';
import Link from 'next/link';
export const metadata={title:'Reviewed scam reports'};
const rows=z.array(z.object({kind:z.string(),excerpt:z.string(),reviewed_at:z.string()}));
export default async function Page({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;const hi=locale==='hi';let reports:z.infer<typeof rows>=[];let failed=false;
  try{const response=await fetch(`${process.env.API_INTERNAL_URL??'http://localhost:8000'}/v1/scams/recent`,{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!response.ok)failed=true;else reports=rows.parse(await response.json());}catch{failed=true;}
  return <section className="container dashboard-page"><span className="eyebrow">RAILRAKSHA · DEMO</span><h1>{hi?'समीक्षित धोखाधड़ी रिपोर्ट':'Reviewed scam reports'}</h1><p>{hi?'विश्लेषक द्वारा स्वीकार की गई रिपोर्ट के निजी जानकारी रहित सारांश।':'Anonymous summaries of reports approved by an analyst.'}</p>{failed?<p role="alert">{hi?'सेवा अस्थायी रूप से उपलब्ध नहीं है।':'The feed is temporarily unavailable.'}</p>:<div className="record-list">{!reports.length&&<p>{hi?'अभी कोई समीक्षित रिपोर्ट नहीं है।':'No reviewed reports yet.'}</p>}{reports.map((row,index)=><article className="tool-panel" key={`${row.reviewed_at}-${index}`}><h2>{row.kind}</h2><p>{hi?'एक पहचान की समीक्षा की गई और उसे धोखाधड़ी सूची में जोड़ा गया।':row.excerpt}</p><time dateTime={row.reviewed_at}>{new Date(row.reviewed_at).toLocaleDateString(hi?'hi-IN':'en-IN')}</time></article>)}</div>}<Link className="button" href={`/${locale}/reports`}>{hi?'धोखाधड़ी की रिपोर्ट करें':'Report a scam'}</Link></section>;
}
