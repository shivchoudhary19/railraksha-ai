import {ToolPage} from '@/components/tool-page';
export const metadata={title:'Report tracking',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{locale:string}>}){const {locale}=await params;return <ToolPage mode="reports" locale={locale}/>;}
