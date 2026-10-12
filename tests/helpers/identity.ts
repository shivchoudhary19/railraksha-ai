import {expect,type Page,type APIRequestContext} from '@playwright/test';
import {createHmac,randomBytes} from 'node:crypto';
export function demoPassword(){const password=process.env.DEMO_PASSWORD;if(!password||password==='CHANGE_ME')throw new Error('Run make bootstrap before authentication tests');return password;}
export async function signIn(page:Page,role='citizen'){
  await credentialsSignIn(page,`demo.${role}@example.test`,demoPassword());
}
export async function credentialsSignIn(page:Page,email:string,password:string){
  await page.goto('/api/auth/login?locale=en');
  await page.getByLabel(/Username|Email/i).fill(email);
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:/Sign In/i}).click();
}
export async function adminHeaders(request:APIRequestContext){
  const response=await request.post('http://localhost:8081/realms/master/protocol/openid-connect/token',{form:{client_id:'admin-cli',grant_type:'password',username:process.env.KEYCLOAK_ADMIN??'',password:process.env.KEYCLOAK_ADMIN_PASSWORD??''}});
  if(!response.ok())throw new Error('Local Keycloak admin fixture is unavailable');
  const body=await response.json() as {access_token:string};return {Authorization:`Bearer ${body.access_token}`};
}
export async function createUser(request:APIRequestContext,role='citizen',requiredActions:string[]=[]){
  const headers=await adminHeaders(request);const email=`demo.e2e.${randomBytes(6).toString('hex')}@example.test`;const password=randomBytes(24).toString('base64url');
  const users='http://localhost:8081/admin/realms/railraksha/users';
  const response=await request.post(users,{headers,data:{username:email,email,emailVerified:true,enabled:true,firstName:'DEMO',lastName:'Regression',requiredActions,credentials:[{type:'password',value:password,temporary:false}]}});
  if(response.status()!==201)throw new Error('Could not create the synthetic regression user');
  const location=response.headers().location;const id=location?.split('/').pop();
  if(!id||!/^[a-f0-9-]{36}$/.test(id))throw new Error('Unexpected local identity identifier');
  const roleResponse=await request.get(`http://localhost:8081/admin/realms/railraksha/roles/${role}`,{headers});
  if(!roleResponse.ok())throw new Error('Local regression role is unavailable');
  const grant=await request.post(`${users}/${id}/role-mappings/realm`,{headers,data:[await roleResponse.json()]});
  if(!grant.ok())throw new Error('Could not assign the regression role');
  return {email,password,id,dispose:async()=>{const freshHeaders=await adminHeaders(request);const removed=await request.delete(`${users}/${id}`,{headers:freshHeaders});expect(removed.status()).toBe(204);}};
}
export async function mailboxLink(request:APIRequestContext,email:string){
  let messageId='';
  await expect.poll(async()=>{
    const response=await request.get('http://localhost:8025/api/v1/messages');
    const data=await response.json() as {messages:{ID:string;To:{Address:string}[]}[]};
    messageId=data.messages.find(message=>message.To.some(to=>to.Address===email))?.ID??'';return Boolean(messageId);
  }).toBe(true);
  const message=await (await request.get(`http://localhost:8025/api/v1/message/${messageId}`)).json() as {Text:string};
  const url=message.Text.match(/http:\/\/localhost:8081\/[^\s<>]+/)?.[0];
  if(!url||!new URL(url).pathname.startsWith('/realms/railraksha/'))throw new Error('Expected a local verification/reset link');
  return url;
}
export function totp(secret:string):string{
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';
  for(const character of secret.replace(/\s/g,'').toUpperCase())bits+=alphabet.indexOf(character).toString(2).padStart(5,'0');
  const key=Buffer.from((bits.match(/.{8}/g)??[]).map(value=>parseInt(value,2)));
  const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
  const digest=createHmac('sha1',key).update(counter).digest();const offset=digest[19]&15;
  return ((digest.readUInt32BE(offset)&0x7fffffff)%1000000).toString().padStart(6,'0');
}
