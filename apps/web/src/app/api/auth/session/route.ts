import {NextResponse} from 'next/server';
import {getSession} from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(){
  const session=await getSession();
  if(!session){
    return NextResponse.json(
      {authenticated:false,session:null},
      {headers:{'Cache-Control':'no-store, no-cache, must-revalidate, max-age=0'}}
    );
  }

  return NextResponse.json(
    {
      authenticated:true,
      session:{
        sub:session.sub,
        name:session.name,
        email:session.email,
        roles:session.roles,
        csrf:session.csrf,
      },
    },
    {headers:{'Cache-Control':'no-store, no-cache, must-revalidate, max-age=0'}}
  );
}
