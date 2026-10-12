export async function GET(){
  const contact=process.env.SECURITY_CONTACT;
  if(!contact||contact.endsWith('.invalid'))return new Response('# This local development installation has no public disclosure mailbox.\n# Ask the installation operator for their private reporting channel.\n',{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact))return new Response('Invalid disclosure configuration',{status:503});
  const expires=new Date(Date.now()+180*86400000).toISOString();
  return new Response(`Contact: mailto:${contact}\nExpires: ${expires}\nPreferred-Languages: en, hi\n`,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=86400'}});
}
