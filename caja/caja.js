import {fmt,esc,stockTotal,sumItems,login,logout,demo,read,mutate,isDemo} from '../assets/github.js';
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
let database=null,selected=null,cart=[],busy=false,currentSale=null,receiptCanvas=null,tab='vender';
function notice(message,error=false){const x=$('#status');x.textContent=message;x.className='notice'+(error?' error':'');setTimeout(()=>{if(x.textContent===message)x.classList.add('hidden')},7000)}
function money(n){return Math.max(0,Number(n)||0)}
async function open(){ $('#login-view').classList.add('hidden');$('#app-view').classList.remove('hidden');$('#demo-alert').classList.toggle('hidden',!isDemo());render() }
$('#login-form').addEventListener('submit',async e=>{e.preventDefault();let btn=e.submitter;btn.disabled=true;$('#login-message').textContent='Conectando...';try{database=await login($('#auth').value);$('#auth').value='';$('#login-message').textContent='';open()}catch(e){$('#login-message').textContent=e.message}finally{btn.disabled=false}});
$('#demo-button').addEventListener('click',async()=>{try{database=await demo();open()}catch(e){$('#login-message').textContent=e.message}});
$('#logout').addEventListener('click',()=>{logout();database=null;cart=[];$('#app-view').classList.add('hidden');$('#login-view').classList.remove('hidden')});
$('#refresh').addEventListener('click',async()=>{try{database=await read();render();notice('Datos actualizados')}catch(e){notice(e.message,true)}});
$('#goto-admin').addEventListener('click',()=>{location.href='../admin/'});
$$('[data-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;$$('[data-tab]').forEach(x=>x.classList.toggle('selected',x.dataset.tab===tab));$('#vender').classList.toggle('hidden',tab!=='vender');$('#historial').classList.toggle('hidden',tab!=='historial');render()}));
$('#search').addEventListener('input',render);$('#discount').addEventListener('input',renderCart);$('#delivery').addEventListener('input',renderCart);
function render(){if(!database)return;const q=$('#search').value.toLowerCase().trim();const list=(database.products||[]).filter(p=>p.active!==false&&stockTotal(p)>0&&(!q||[p.sku,p.name].join(' ').toLowerCase().includes(q)));
 $('#sale-list').innerHTML=list.length?list.map(p=>`<div class="sale-choice"><img src="${esc(p.photo||'../assets/logo.png')}" loading="lazy" alt="${esc(p.name)}" onerror="this.src='../assets/logo.png'"><div class="details"><strong>${esc(p.name)}</strong><small>${esc(p.sku)} · ${fmt(p.price)} · ${stockTotal(p)} disponibles</small></div><button class="ghost small" data-select="${Number(p.id)}">Elegir</button></div>`).join(''):'<p class="empty">No hay prendas disponibles.</p>';
 $$('#sale-list [data-select]').forEach(b=>b.addEventListener('click',()=>selectProduct(Number(b.dataset.select))));
 if(selected){const p=database.products.find(x=>x.id===selected);if(p)selectProduct(selected,false)}
 renderCart();renderHistory();}
function selectProduct(id,reset=true){selected=id;const p=database.products.find(x=>x.id===id);if(!p)return;$('#selected-name').value=`${p.sku} · ${p.name}`;
 const prev=$('#selected-size').value;$('#selected-size').innerHTML=Object.entries(p.stock||{}).filter(([,n])=>n>0).map(([s,n])=>`<option value="${esc(s)}" ${!reset&&prev===s?'selected':''}>${esc(s)} · ${n} disponibles</option>`).join('');}
function renderCart(){const box=$('#cart-lines');box.innerHTML=cart.length?cart.map((x,i)=>`<div class="cart-line"><div class="line-text"><strong>${esc(x.name)} · ${esc(x.size)}</strong><span class="muted">${esc(x.sku)} · ${x.qty} × ${fmt(x.unitPrice)}</span></div><b>${fmt(x.qty*x.unitPrice)}</b><button class="danger small" data-remove="${i}" aria-label="Quitar">✕</button></div>`).join(''):'<p class="empty">Todavía no has agregado prendas.</p>';
 $$('#cart-lines [data-remove]').forEach(b=>b.addEventListener('click',()=>{cart.splice(Number(b.dataset.remove),1);renderCart()}));
 const subtotal=cart.reduce((s,x)=>s+x.qty*x.unitPrice,0);const discount=money($('#discount').value),delivery=money($('#delivery').value);
 $('#cart-total').textContent=fmt(Math.max(0,subtotal-discount)+delivery);
}
$('#add-product').addEventListener('click',()=>{const size=$('#selected-size').value,qty=Number($('#selected-qty').value);const p=database?.products.find(x=>x.id===selected);
 if(!p||!size){notice('Primero elige una prenda y una talla',true);return}
 if(!Number.isSafeInteger(qty)||qty<1){notice('Cantidad no válida',true);return}
 const key=x=>x.sku===p.sku&&x.size===size;const existing=cart.find(key),total=qty+(existing?.qty||0);
 if(total>Number(p.stock?.[size]||0)){notice('No hay suficientes unidades de esa talla',true);return}
 if(existing)existing.qty=total;else cart.push({sku:p.sku,name:p.name,size,qty,unitPrice:p.price});
 renderCart();notice('Prenda añadida al resumen');
});
function renderHistory(){const sales=(database.sales||[]).slice().reverse();const valid=sales.filter(x=>x.status!=='anulada');$('#history-summary').textContent=`${valid.length} ventas · ${fmt(valid.reduce((s,x)=>s+x.total,0))}`;
 $('#history-list').innerHTML=sales.length?`<table class="table"><thead><tr><th>Recibo</th><th>Fecha</th><th>Cliente</th><th>Pago</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${sales.map(s=>`<tr><td>#${String(s.number).padStart(4,'0')}</td><td>${esc(new Date(s.createdAt).toLocaleString('es-CO'))}</td><td>${esc(s.customer||'Consumidor final')}</td><td>${esc(s.payment)}</td><td>${fmt(s.total)}</td><td>${s.status==='anulada'?'<span class="pill bad">Anulada</span>':'<span class="pill good">Registrada</span>'}</td><td><button class="ghost small" data-receipt="${esc(s.id)}">Recibo</button> ${s.status==='anulada'?'':`<button class="danger small" data-cancel="${esc(s.id)}">Anular</button>`}</td></tr>`).join('')}</tbody></table>`:'<p class="empty">Aún no se han registrado ventas.</p>';
 $$('#history-list [data-receipt]').forEach(b=>b.addEventListener('click',()=>openReceipt(database.sales.find(x=>x.id===b.dataset.receipt))));
 $$('#history-list [data-cancel]').forEach(b=>b.addEventListener('click',()=>cancelSale(b.dataset.cancel)));
}
$('#confirm').addEventListener('click',async()=>{
 if(busy||!cart.length){notice('Agrega por lo menos una prenda',true);return}
 const items=cart.map(x=>({...x}));const subtotal=items.reduce((a,x)=>a+x.unitPrice*x.qty,0);const discount=money($('#discount').value),delivery=money($('#delivery').value);
 if(discount>subtotal){notice('El descuento no puede superar el subtotal',true);return}
 const saleId=(globalThis.crypto?.randomUUID?.()||'S-'+Date.now()+'-'+Math.random().toString(16).slice(2));
 busy=true;$('#confirm').disabled=true;notice('Guardando venta y verificando existencias...');try{
 const {doc,result}=await mutate(db=>{
  db.sales??=[];db.movements??=[];
  const prior=db.sales.find(s=>s.id===saleId);if(prior)return prior;
  for(const item of items){const p=db.products.find(p=>p.sku===item.sku&&p.active!==false);if(!p)throw Error('Producto no disponible: '+item.sku);
    if(!Number.isSafeInteger(item.qty)||item.qty<1||Number(p.stock?.[item.size]||0)<item.qty)throw Error('Existencias insuficientes para '+item.sku+' talla '+item.size);if(Number(p.price)!==item.unitPrice)throw Error('Cambió el precio de '+item.sku+'. Actualiza y vuelve a agregar la prenda.');
  }
  const sale={id:saleId,number:Number(db.nextReceipt||1),createdAt:new Date().toISOString(),status:'registrada',items,subtotal,discount,delivery,total:subtotal-discount+delivery,customer:$('#customer').value.trim().slice(0,100),payment:$('#payment').value,note:$('#note').value.trim().slice(0,250)};
  for(const item of items){const p=db.products.find(p=>p.sku===item.sku);p.stock[item.size]-=item.qty;db.movements.push({date:sale.createdAt,type:'Venta',sku:item.sku,detail:`Recibo ${sale.number} · Talla ${item.size} · -${item.qty}`})}
  db.sales.push(sale);db.nextReceipt=sale.number+1;return sale;
 },`Venta LuSam: ${saleId}`);
 database=doc;cart=[];$('#discount').value=0;$('#delivery').value=0;$('#customer').value='';$('#note').value='';render();notice('Venta confirmada y descontada del inventario.');await openReceipt(result);
 }catch(e){notice(e.message,true)}finally{busy=false;$('#confirm').disabled=false}
});
async function cancelSale(id){if(busy||!confirm('¿Anular esta venta y devolver sus unidades al inventario?'))return;busy=true;try{
 const {doc}=await mutate(db=>{const sale=db.sales.find(x=>x.id===id);if(!sale)throw Error('Venta no encontrada');if(sale.status==='anulada')return sale;
 sale.status='anulada';sale.cancelledAt=new Date().toISOString();for(const item of sale.items){const p=db.products.find(p=>p.sku===item.sku);if(!p)throw Error('No se puede anular: ya no existe la referencia '+item.sku);p.stock[item.size]=Number(p.stock[item.size]||0)+item.qty;db.movements.push({date:sale.cancelledAt,type:'Anulación',sku:item.sku,detail:`Recibo ${sale.number} · Talla ${item.size} · +${item.qty}`})}return sale},`Anular venta LuSam: ${id}`);
 database=doc;render();notice('Venta anulada y existencias devueltas');
 }catch(e){notice(e.message,true)}finally{busy=false}}
function wrap(ctx,text,x,y,maxw,lineHeight){let words=String(text).split(' '),line='',n=0;for(const word of words){const probe=line?line+' '+word:word;if(ctx.measureText(probe).width>maxw&&line){ctx.fillText(line,x,y+n*lineHeight);n++;line=word}else line=probe}if(line)ctx.fillText(line,x,y+n*lineHeight);return n+1}
async function drawReceipt(sale){const c=document.createElement('canvas'),w=720;const h=800+sale.items.length*75;c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#fffaf7';x.fillRect(0,0,w,h);
 x.fillStyle='#e9c5c1';x.fillRect(0,0,w,18);x.textAlign='center';try{const logo=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src='../assets/logo.png'});x.drawImage(logo,47,36,78,78)}catch{}x.fillStyle='#8c656b';x.font='bold 48px Georgia,serif';x.fillText('LuSam Shop',w/2,87);
 x.fillStyle='#6b5c5c';x.font='22px Arial';x.fillText('COMPROBANTE DE COMPRA',w/2,128);
 x.strokeStyle='#e2cdc7';x.lineWidth=2;x.beginPath();x.moveTo(44,158);x.lineTo(676,158);x.stroke();x.textAlign='left';x.fillStyle='#4f4242';x.font='22px Arial';
 x.fillText('Recibo: #'+String(sale.number).padStart(4,'0'),46,201);x.textAlign='right';x.fillText(new Date(sale.createdAt).toLocaleDateString('es-CO'),672,201);x.textAlign='left';
 x.font='20px Arial';x.fillText('Cliente: '+(sale.customer||'Consumidor final').slice(0,46),46,244);x.fillText('Pago: '+sale.payment,46,278);
 x.font='bold 22px Arial';x.fillText('Producto / talla',46,336);x.textAlign='right';x.fillText('Valor',672,336);x.textAlign='left';
 let y=372;x.font='20px Arial';for(const item of sale.items){x.fillStyle='#534849';const lines=wrap(x,item.name+' / '+item.size,46,y,450,23);x.font='17px Arial';x.fillStyle='#9a7c80';x.fillText(item.qty+' × '+fmt(item.unitPrice),46,y+25*lines);x.textAlign='right';x.fillStyle='#534849';x.font='bold 20px Arial';x.fillText(fmt(item.qty*item.unitPrice),670,y);x.textAlign='left';y+=72;x.font='20px Arial'}
 x.strokeStyle='#e2cdc7';x.beginPath();x.moveTo(45,y+6);x.lineTo(675,y+6);x.stroke();y+=43;
 x.font='20px Arial';x.fillText('Subtotal',46,y);x.textAlign='right';x.fillText(fmt(sale.subtotal),672,y);x.textAlign='left';y+=35;
 if(sale.discount){x.fillText('Descuento',46,y);x.textAlign='right';x.fillText('-'+fmt(sale.discount),672,y);x.textAlign='left';y+=35}
 if(sale.delivery){x.fillText('Domicilio',46,y);x.textAlign='right';x.fillText(fmt(sale.delivery),672,y);x.textAlign='left';y+=35}
 x.fillStyle='#a46b74';x.font='bold 34px Arial';x.fillText('TOTAL',46,y+21);x.textAlign='right';x.fillText(fmt(sale.total),672,y+21);x.textAlign='center';
 x.fillStyle='#816970';x.font='22px Georgia';x.fillText('¡Gracias por tu compra!',w/2,h-93);
 x.font='16px Arial';x.fillText('Comprobante interno · No es factura electrónica',w/2,h-52);
 if(sale.status==='anulada'){x.globalAlpha=.65;x.translate(w/2,h/2);x.rotate(-.35);x.textAlign='center';x.fillStyle='#b32632';x.font='bold 85px Arial';x.fillText('ANULADA',0,0);x.globalAlpha=1}
 return c;
}
async function openReceipt(sale){if(!sale)return;currentSale=sale;receiptCanvas=await drawReceipt(sale);$('#receipt-preview').src=receiptCanvas.toDataURL('image/png');$('#receipt-message').textContent='Recibo #'+String(sale.number).padStart(4,'0');$('#receipt-dialog').showModal()}
$('#close-receipt').addEventListener('click',()=>$('#receipt-dialog').close());
function getBlob(){return new Promise(resolve=>receiptCanvas.toBlob(resolve,'image/png'))}
$('#download-receipt').addEventListener('click',async()=>{if(!receiptCanvas)return;const b=await getBlob();const a=document.createElement('a'),url=URL.createObjectURL(b);a.href=url;a.download=`LuSam_Recibo_${String(currentSale.number).padStart(4,'0')}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),6000)});
$('#share-receipt').addEventListener('click',async()=>{if(!receiptCanvas)return;const blob=await getBlob();const file=new File([blob],`LuSam_Recibo_${currentSale.number}.png`,{type:'image/png'});try{if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Recibo LuSam Shop'});return}$('#receipt-message').textContent='Tu navegador no comparte imágenes directamente. Usa Guardar PNG y envíalo por WhatsApp.'}catch(e){if(e.name!=='AbortError')$('#receipt-message').textContent='Usa Guardar PNG para compartir el recibo.'}});