import type {MetadataRoute} from 'next';
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:'*',allow:'/',disallow:['/api/','/en/dashboard','/hi/dashboard','/en/profile','/hi/profile','/en/operator','/hi/operator']}};}
