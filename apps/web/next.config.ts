import createNextIntlPlugin from 'next-intl/plugin';
import type {NextConfig} from 'next';
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const config:NextConfig={output:'standalone',transpilePackages:['@railraksha/ui','@railraksha/schemas'],poweredByHeader:false,reactStrictMode:true,
  async headers(){return [{source:'/:path*',headers:[
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'X-Frame-Options',value:'DENY'},
    {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
    {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
    ...(process.env.APP_ENV==='production'?[{key:'Strict-Transport-Security',value:'max-age=31536000'}]:[])
  ]}]}
};
export default withNextIntl(config);
