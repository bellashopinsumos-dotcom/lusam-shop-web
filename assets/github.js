const OWNER='bellashopinsumos-dotcom';
const PRIVATE='lusam-shop-control';
const PUBLIC='lusam-shop-web';
const PRIVATE_PATH='data/negocio.json';
const DEMO_KEY='lusam_shop_solo_demostracion_v2';
let token='';let mode='none';
const fmt=n=>'$'+Number(n||0).toLocaleString('es-CO');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stockTotal=p=>Object.values(p.stock||{}).reduce((a,n)=>a+Number(n||0),0);
function sumItems(sale){return (sale.items||[]).reduce((a,p)=>a+p.qty*p.unitPrice,0)}
function base64ToUtf8(s){const bytes=Uint8Array.from(atob(s.replace(/\s/g,'')),c=>c.charCodeAt(0));return new TextDecoder().decode(bytes)}
function utf8ToBase64(s){const bytes=new TextEncoder().encode(s);let binary='';for(let i=0;i<bytes.length;i+=4096)binary+=String.fromCharCode(...bytes.subarray(i,i+4096));return btoa(binary)}
function authHeaders(){return {'Accept':'application/vnd.github+json','Authorization':`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28'}}
async function githubRequest(url,options={}){
 const r=await fetch(url,{...options,headers:{...authHeaders(),...(options.headers||{})}});
 if(!r.ok){let reason='';try{reason=(await r.json()).message||''}catch{} const e=new Error(`GitHub ${r.status}: ${reason||r.statusText}`);e.status=r.status;throw e}
 return r.json();
}
async function readOnline(){
 const file=await githubRequest(`https://api.github.com/repos/${OWNER}/${PRIVATE}/contents/${PRIVATE_PATH}?ref=main&t=${Date.now()}`);
 return {doc:JSON.parse(base64ToUtf8(file.content)),sha:file.sha};
}
async function saveOnline(doc,sha,message){
 await githubRequest(`https://api.github.com/repos/${OWNER}/${PRIVATE}/contents/${PRIVATE_PATH}`,{
  method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,content:utf8ToBase64(JSON.stringify(doc,null,2)+'\n'),sha,branch:'main'})
 });
}
async function getDemo(){
 const res=await fetch('../assets/demo.json',{cache:'no-store'});
 if(!res.ok)throw Error('No se encontró el demo');
 const plantilla=await res.json();
 const raw=localStorage.getItem(DEMO_KEY);
 if(!raw){localStorage.setItem(DEMO_KEY,JSON.stringify(plantilla));return plantilla}
 const doc=JSON.parse(raw);
 // Conserva las pruebas anteriores pero incorpora costos de EJEMPLO donde antes no existían.
 const ejemplos=new Map((plantilla.products||[]).map(p=>[p.sku,p]));
 for(const p of (doc.products||[])){
   if(!Object.prototype.hasOwnProperty.call(p,'cost')){
     p.cost=ejemplos.get(p.sku)?.cost??null;
   }
 }
 localStorage.setItem(DEMO_KEY,JSON.stringify(doc));
 return doc;
}
async function login(t){token=t.trim();mode='online';try{const result=await readOnline();return result.doc}catch(e){token='';mode='none';throw e}}
async function demo(){mode='demo';token='';return getDemo()}
function logout(){token='';mode='none'}
async function read(){if(mode==='demo')return getDemo();if(mode==='online')return (await readOnline()).doc;throw Error('Inicia sesión primero')}
async function mutate(change,message='Actualizar inventario LuSam'){
 if(mode==='demo'){
  const doc=await getDemo(),result=change(doc);doc.lastUpdated=new Date().toISOString();localStorage.setItem(DEMO_KEY,JSON.stringify(doc));return {doc,result};
 }
 if(mode!=='online')throw Error('Inicia sesión primero');
 for(let attempt=0;attempt<4;attempt++){
  const {doc,sha}=await readOnline();
  const result=change(doc);doc.lastUpdated=new Date().toISOString();
  try{await saveOnline(doc,sha,message);return {doc,result}}catch(e){if(e.status!==409||attempt===3)throw e}
 }
 throw Error('No se pudo guardar: intenta nuevamente');
}
async function uploadPhoto(file,sku){
 if(mode!=='online')throw Error('La subida de fotografías solo funciona conectado a GitHub');
 if(!file||!file.type.startsWith('image/'))throw Error('Selecciona una imagen JPG o PNG');
 const image=await new Promise((res,rej)=>{const x=new Image();const url=URL.createObjectURL(file);x.onload=()=>{URL.revokeObjectURL(url);res(x)};x.onerror=()=>{URL.revokeObjectURL(url);rej(Error('No se pudo abrir la fotografía'))};x.src=url});
 const max=1150,ratio=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
 const canvas=document.createElement('canvas');canvas.width=Math.round(image.naturalWidth*ratio);canvas.height=Math.round(image.naturalHeight*ratio);
 const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
 let quality=.79,data=canvas.toDataURL('image/jpeg',quality);while(data.length>950000&&quality>.4){quality-=.1;data=canvas.toDataURL('image/jpeg',quality)}
 if(data.length>950000)throw Error('Foto demasiado grande. Utiliza una imagen más pequeña');
 const safe=String(sku||'producto').toLowerCase().replace(/[^a-z0-9-]/g,'-').slice(0,50);
 const filename=`productos/${safe}-${Date.now()}.jpg`;
 await githubRequest(`https://api.github.com/repos/${OWNER}/${PUBLIC}/contents/${filename}`,{
 method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:`Imagen ${safe}`,content:data.split(',')[1],branch:'main'})
 });
 return `https://${OWNER}.github.io/${PUBLIC}/${filename}`;
}
export {OWNER,PRIVATE,PUBLIC,fmt,esc,stockTotal,sumItems,login,logout,demo,read,mutate,uploadPhoto};
export const isDemo=()=>mode==='demo';