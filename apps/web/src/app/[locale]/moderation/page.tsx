import {ToolPage} from '@/components/tool-page';
export const metadata={title:'Review reports',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{locale:string}>}){const {locale}=await params;return <ToolPage mode="moderation" locale={locale}/>;}
