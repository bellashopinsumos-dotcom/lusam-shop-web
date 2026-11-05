import {fmt,esc,stockTotal,login,logout,demo,read,mutate,uploadPhoto,isDemo} from '../assets/github.js';
import {tieneCosto,calcularVenta,hoyLocal,rangoFinanzas,ventasPeriodo,resumenFinanzas} from '../assets/finanzas.js';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
let database=null,editing=null,tab='resumen',busy=false;
const SIZES=['XS','S','M','L','XL','XXL','Única'];
function notify(msg,error=false){const box=$('#sync-message');box.textContent=msg;box.className='notice'+(error?' error':'');setTimeout(()=>{if(box.textContent===msg)box.classList.add('hidden')},6000)}
function formMsg(msg,error=false){const el=$('#editor-message');el.textContent=msg;el.className=msg?'notice'+(error?' error':''):''}
function showApp(){ $('#login-view').classList.add('hidden');$('#app-view').classList.remove('hidden');$('#demo-alert').classList.toggle('hidden',!isDemo());render() }
async function load(){database=await read();render()}
$('#login-form').addEventListener('submit',async e=>{e.preventDefault();const btn=e.submitter;btn.disabled=true;$('#login-message').textContent='Conectando...';try{database=await login($('#auth').value);$('#auth').value='';$('#login-message').textContent='';showApp()}catch(err){$('#login-message').textContent=err.message}finally{btn.disabled=false}});
$('#demo-button').addEventListener('click',async()=>{try{database=await demo();showApp()}catch(e){$('#login-message').textContent=e.message}});
$('#logout').addEventListener('click',()=>{logout();database=null;$('#app-view').classList.add('hidden');$('#login-view').classList.remove('hidden')});
$('#refresh').addEventListener('click',async()=>{try{await load();notify('Datos actualizados')}catch(e){notify(e.message,true)}});
$('#goto-caja').addEventListener('click',()=>{location.href='../caja/'});
$$('[data-tab]').forEach(x=>x.addEventListener('click',()=>{tab=x.dataset.tab;$$('[data-tab]').forEach(b=>b.classList.toggle('selected',b.dataset.tab===tab));['resumen','productos','movimientos','finanzas'].forEach(id=>$('#'+id).classList.toggle('hidden',id!==tab));render()}));
$('#search').addEventListener('input',render);$('#filter').addEventListener('change',render);
function render(){if(!database)return;let p=database.products||[],sales=database.sales||[];
 const low=p.filter(x=>x.active!==false&&stockTotal(x)<=3);
 $('#stats').innerHTML=[['Prendas registradas',p.length],['Unidades disponibles',p.reduce((s,x)=>s+stockTotal(x),0)],['Referencias bajas',low.length],['Ventas registradas',sales.filter(s=>s.status!=='anulada').length]].map(x=>`<div class="stat"><small>${x[0]}</small><strong>${x[1]}</strong></div>`).join('');
 $('#updated').textContent=database.lastUpdated?'Último cambio: '+new Date(database.lastUpdated).toLocaleString('es-CO'):'Sin cambios';
 $('#low-stock').innerHTML=low.length?low.slice(0,8).map(x=>`<div class="cart-line"><div><strong>${esc(x.name)}</strong><small class="muted"> ${esc(x.sku)}</small></div><span class="pill bad">${stockTotal(x)} unid.</span></div>`).join(''):'<p class="muted">Todas las referencias tienen más de tres unidades.</p>';
 const cat=$('#filter').value;const cats=['Todas',...new Set(p.map(x=>x.category||'Otros'))];$('#filter').innerHTML=cats.map(x=>`<option value="${esc(x)}" ${x===cat?'selected':''}>${x==='Todas'?'Todas las categorías':esc(x)}</option>`).join('');
 const q=$('#search').value.toLowerCase().trim();let items=p.filter(x=>(cat==='Todas'||x.category===cat)&&(!q||[x.name,x.sku,x.category].join(' ').toLowerCase().includes(q)));
 $('#product-list').innerHTML=items.length?items.map(x=>`<article class="product"><img src="${esc(x.photo||'../assets/logo.png')}" alt="${esc(x.name)}" loading="lazy" onerror="this.src='../assets/logo.png'"><div class="info"><span class="pill ${!x.active?'bad':stockTotal(x)>0?'good':'bad'}">${!x.active?'Oculto':stockTotal(x)===0?'Agotado':'Disponible'}</span><h3>${esc(x.name)}</h3><p>${esc(x.sku)} · ${esc(x.category||'Otros')} ${x.colorName?'· '+esc(x.colorName):''}</p><b>Venta: ${fmt(x.price)}</b><p>${tieneCosto(x.cost)?`Costo: ${fmt(x.cost)} · Ganancia: ${fmt(Number(x.price)-Number(x.cost))}`:"Costo de compra pendiente"}</p><div class="sizes">${Object.entries(x.stock||{}).map(([s,n])=>`<span>${esc(s)}: ${Number(n||0)}</span>`).join('')}</div><button class="ghost small" data-edit="${Number(x.id)}">Editar producto</button></div></article>`).join(''):'<div class="panel empty">No hay productos con esos filtros.</div>';
 $$('#product-list [data-edit]').forEach(x=>x.addEventListener('click',()=>openEditor(Number(x.dataset.edit))));
 const m=(database.movements||[]).slice().reverse().slice(0,70);
 const ventaPorId=new Map(sales.map(v=>[v.id,v]));
 $('#movement-list').innerHTML=m.length?`<table class="table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Referencia</th><th>Detalle</th><th>Venta unid.</th><th>Costo unid.</th><th>Ganancia</th><th>Diezmo</th></tr></thead><tbody>${m.map(x=>{
   const venta=ventaPorId.get(x.saleId);
   const linea=venta?.status!=='anulada' && venta ? calcularVenta(venta).lines.find(l=>l.sku===x.sku&&l.size===x.size) : null;
   return `<tr><td>${esc(new Date(x.date).toLocaleString('es-CO'))}</td><td>${esc(x.type)}</td><td>${esc(x.sku||'')}</td><td>${esc(x.detail||'')}</td><td>${linea?fmt(linea.unitPrice):'—'}</td><td>${linea?(linea.known?fmt(linea.unitCost):'Pendiente'):'—'}</td><td>${linea?(linea.known?fmt(linea.profit):'Pendiente'):'—'}</td><td>${linea?(linea.known?fmt(linea.tithe):'Pendiente'):'—'}</td></tr>`;
 }).join('')}</tbody></table>`:'<div class="empty">Aún no hay movimientos registrados.</div>';
 if(tab==='finanzas')renderFinanzas();
}
function stockForm(stock={}){const merged=[...new Set([...SIZES,...Object.keys(stock)])];$('#stock-fields').innerHTML=merged.map(s=>`<div class="field"><label>Talla ${esc(s)}</label><input data-size="${esc(s)}" type="number" min="0" step="1" value="${Math.max(0,Number(stock[s]||0))}"></div>`).join('')}
function openEditor(id=null){editing=id;let p=id===null?null:(database.products||[]).find(x=>x.id===id);$('#editor-title').textContent=p?'Editar '+p.name:'Nueva prenda';$('#sku').value=p?.sku||'';$('#name').value=p?.name||'';$('#category').value=p?.category||'Vestidos';$('#price').value=p?.price??'';$('#cost').value=tieneCosto(p?.cost)?p.cost:'';$('#old').value=p?.old||0;$('#color-name').value=p?.colorName||'';$('#tag').value=p?.tag||'';$('#photo').value=p?.photo||'';$('#description').value=p?.description||'';$('#file').value='';$('#active').checked=p?.active!==false;$('#featured').checked=!!p?.featured;stockForm(p?.stock||{});formMsg('');showPreview();actualizarVistaCosto();$('#editor').showModal()}
function showPreview(){let src=$('#photo').value;$('#photo-preview').classList.toggle('hidden',!src);if(src)$('#photo-preview').src=src}
function actualizarVistaCosto(){
 const costo=$('#cost').value,precio=$('#price').value;
 if(costo===''||precio===''){$('#cost-preview').textContent='El precio de costo es privado. Se necesita para calcular ganancias y diezmo.';return}
 const margen=Number(precio)-Number(costo),diezmo=Math.round(Math.max(0,margen)*.1);
 $('#cost-preview').textContent='Por unidad: ganancia '+fmt(margen)+' · diezmo '+fmt(diezmo)+' · después del diezmo '+fmt(margen-diezmo)+'.';
}
$('#cost').addEventListener('input',actualizarVistaCosto);
$('#price').addEventListener('input',actualizarVistaCosto);
$('#photo').addEventListener('input',showPreview);$('#new-product').addEventListener('click',()=>openEditor());for(const id of ['close-editor','cancel-editor'])$('#'+id).addEventListener('click',()=>$('#editor').close());
$('#product-form').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;
 const sku=$('#sku').value.trim().toUpperCase();const name=$('#name').value.trim();const price=Number($('#price').value);if(!sku||!name||!Number.isSafeInteger(price)||price<0){formMsg('Revisa referencia, nombre y precio',true);return}
 const costText=$('#cost').value.trim();const cost=costText===''?null:Number(costText);
 if(cost!==null&&(!Number.isSafeInteger(cost)||cost<0)){formMsg('El precio de costo debe ser un número válido o dejarse pendiente',true);return}
 const stock={};for(const x of $$('#stock-fields [data-size]')){let n=Number(x.value);if(!Number.isSafeInteger(n)||n<0){formMsg('Las cantidades deben ser números enteros positivos',true);return}if(n||['S','M','L'].includes(x.dataset.size))stock[x.dataset.size]=n}
 let photo=$('#photo').value.trim(),file=$('#file').files[0];if(photo&&!/^https:\/\//i.test(photo)){formMsg('La URL de la foto debe comenzar por https://',true);return}
 busy=true;$('#save-product').disabled=true;formMsg('Guardando...');try{
  if(file){if(isDemo())formMsg('En modo demostración no se cargan fotografías a GitHub. Usa una URL pública.');else photo=await uploadPhoto(file,sku)}
  const data={sku,name,category:$('#category').value,price,cost,old:Number($('#old').value||0),colorName:$('#color-name').value.trim(),tag:$('#tag').value.trim(),photo,description:$('#description').value.trim(),stock,active:$('#active').checked,featured:$('#featured').checked};
  const result=await mutate(doc=>{
   if(doc.products.some(p=>p.sku===sku&&p.id!==editing))throw Error('Ya existe otra prenda con esa referencia');
   let current=editing==null?null:doc.products.find(p=>p.id===editing);
   if(editing!==null&&!current)throw Error('La referencia fue modificada o eliminada; actualiza el panel');
   let oldStock={...current?.stock};const id=current?.id??Math.max(0,...doc.products.map(p=>p.id))+1;
   const row={...(current||{}),...data,id};
   if(current)Object.assign(current,row);else doc.products.push(row);
   doc.movements??=[];
   for(const s of new Set([...Object.keys(oldStock),...Object.keys(stock)])){
    const diff=(stock[s]||0)-(oldStock[s]||0);
    if(diff)doc.movements.push({date:new Date().toISOString(),type:'Ajuste',sku,detail:`Talla ${s}: ${diff>0?'+':''}${diff}`});
   }
   return id;
  },`Inventario LuSam: ${sku}`);
  database=result.doc;$('#editor').close();render();notify('Producto guardado. GitHub publicará el catálogo cuando termine la acción automática.');
 }catch(err){formMsg(err.message,true)}finally{busy=false;$('#save-product').disabled=false}
});

const fechaHoy=hoyLocal(),mesActual=fechaHoy.slice(0,7);
$('#finance-month').value=mesActual;
$('#finance-half').value=Number(fechaHoy.slice(8))<=15?'1':'2';
$('#finance-start').value=mesActual+'-01';
$('#finance-end').value=fechaHoy;
for(const id of ['finance-mode','finance-month','finance-half','finance-start','finance-end']){
 $('#'+id).addEventListener('change',()=>{actualizarControlesFinanzas();renderFinanzas()});
}
function actualizarControlesFinanzas(){
 const tipo=$('#finance-mode').value;
 $('#finance-month-wrap').classList.toggle('hidden',tipo==='todos'||tipo==='personalizado');
 $('#finance-half-wrap').classList.toggle('hidden',tipo!=='quincena');
 $('#finance-start-wrap').classList.toggle('hidden',tipo!=='personalizado');
 $('#finance-end-wrap').classList.toggle('hidden',tipo!=='personalizado');
}
function reporteActual(){
 const rango=rangoFinanzas($('#finance-mode').value,$('#finance-month').value,$('#finance-half').value,$('#finance-start').value,$('#finance-end').value);
 return {rango,lista:ventasPeriodo(database?.sales||[],rango)};
}
function renderFinanzas(){
 if(!database)return;
 const {rango,lista}=reporteActual();
 $('#finance-period-label').textContent=rango.invalid?'Revisa el intervalo de fechas.':rango.label;
 const resumen=resumenFinanzas(lista), incompleto=resumen.pendiente>0;
 $('#finance-stats').innerHTML=[
  ['Ventas registradas',String(resumen.cantidad)],
  ['Ingresos netos por prendas',fmt(resumen.ingresos)],
  ['Costo de mercancía vendida',fmt(resumen.costos)+(incompleto?'*':'')],
  ['Ganancia bruta',fmt(resumen.ganancia)+(incompleto?'*':'')],
  ['Diezmo acumulado (10 %)',fmt(resumen.diezmo)+(incompleto?'*':'')],
  ['Ganancia después del diezmo',fmt(resumen.despuesDiezmo)+(incompleto?'*':'')]
 ].map(([label,value])=>`<div class="stat"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`).join('');
 $('#finance-sales-count').textContent=resumen.cantidad+' ventas en el período';
 const aviso=$('#finance-warning');
 aviso.classList.toggle('hidden',!incompleto);
 aviso.textContent=incompleto?resumen.pendiente+' venta(s) tienen costos pendientes. Los importes con * solo incluyen ventas con todos sus costos registrados. Completa los precios de costo ANTES de realizar las ventas para calcularlos correctamente.':'';
 const filas=resumen.calculadas.flatMap(({venta,calculo})=>calculo.lines.map(linea=>({venta,linea})));
 $('#finance-detail').innerHTML=filas.length?`<table class="table"><thead><tr>
 <th>Fecha</th><th>Recibo</th><th>Referencia</th><th>Prenda / talla</th><th>Unid.</th><th>Precio venta/unid.</th><th>Costo/unid.</th><th>Ingreso neto</th><th>Costo total</th><th>Ganancia</th><th>Diezmo</th><th>Ganancia final</th>
 </tr></thead><tbody>${filas.map(({venta,linea})=>`<tr><td>${esc(new Date(venta.createdAt).toLocaleDateString('es-CO'))}</td><td>#${esc(String(venta.number).padStart(4,'0'))}</td><td>${esc(linea.sku)}</td><td>${esc(linea.name+' · '+linea.size)}</td><td>${linea.qty}</td><td>${fmt(linea.unitPrice)}</td><td>${linea.known?fmt(linea.unitCost):'Pendiente'}</td><td>${fmt(linea.revenue)}</td><td>${linea.known?fmt(linea.cost):'Pendiente'}</td><td>${linea.known?fmt(linea.profit):'Pendiente'}</td><td>${linea.known?fmt(linea.tithe):'Pendiente'}</td><td>${linea.known?fmt(linea.afterTithe):'Pendiente'}</td></tr>`).join('')}</tbody></table>`:'<p class="empty">No hay ventas registradas en este período.</p>';
}
function csvSafe(value){
 let s=String(value??'');
 if(/^[=+@\-\t\r]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
$('#finance-csv').addEventListener('click',()=>{
 if(!database)return;
 const {rango,lista}=reporteActual();
 if(rango.invalid){notify('Revisa el período antes de exportar',true);return}
 const rows=[['Fecha','Recibo','Referencia','Prenda','Talla','Cantidad','Precio venta unitario','Precio costo unitario','Ingreso neto','Costo total','Ganancia','Diezmo 10%','Ganancia después del diezmo']];
 for(const venta of lista)for(const linea of calcularVenta(venta).lines){
  rows.push([hoyLocal(new Date(venta.createdAt)),venta.number,linea.sku,linea.name,linea.size,linea.qty,linea.unitPrice,linea.unitCost??'',linea.revenue,linea.cost??'',linea.profit??'',linea.tithe??'',linea.afterTithe??'']);
 }
 const resumen=resumenFinanzas(lista);
 rows.push([]);rows.push(['TOTALES','','','','','','','',resumen.ingresos,resumen.pendiente?'Incompleto':resumen.costos,resumen.pendiente?'Incompleto':resumen.ganancia,resumen.pendiente?'Incompleto':resumen.diezmo,resumen.pendiente?'Incompleto':resumen.despuesDiezmo]);
 const csv='\uFEFF'+rows.map(r=>r.map(csvSafe).join(';')).join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='LuSam_Ganancias_Diezmo_'+($('#finance-month').value||'reporte')+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
});
actualizarControlesFinanzas();
