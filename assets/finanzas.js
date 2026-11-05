// Cálculos privados del administrador. No modifica los precios visibles al cliente.
export const tieneCosto = value => value !== null && value !== undefined && value !== '' && Number.isSafeInteger(Number(value)) && Number(value) >= 0;
export const pesos = value => Math.round(Number(value) || 0);
export function calcularVenta(venta) {
  const items = Array.isArray(venta.items) ? venta.items : [];
  const subtotal = items.reduce((s, i) => s + pesos(i.unitPrice) * pesos(i.qty), 0);
  const descuento = Math.min(subtotal, Math.max(0, pesos(venta.discount)));
  let asignado = 0;
  const lineas = items.map((item, index) => {
    const cantidad = pesos(item.qty);
    const precioVenta = pesos(item.unitPrice);
    const bruto = cantidad * precioVenta;
    // El descuento se prorratea entre prendas; la última absorbe los pesos de redondeo.
    const descuentoLinea = index === items.length - 1
      ? descuento - asignado
      : Math.min(descuento - asignado, subtotal ? Math.round(descuento * bruto / subtotal) : 0);
    asignado += descuentoLinea;
    const ingreso = bruto - descuentoLinea;
    const conocido = tieneCosto(item.unitCost);
    const costoUnitario = conocido ? pesos(item.unitCost) : null;
    const costo = conocido ? costoUnitario * cantidad : null;
    const ganancia = conocido ? ingreso - costo : null;
    // El diezmo es el 10 % de cada ganancia positiva, no del valor total vendido.
    const diezmo = conocido ? Math.round(Math.max(0, ganancia) * 0.10) : null;
    return { sku: item.sku, name: item.name, size: item.size, qty: cantidad,
      unitPrice: precioVenta, unitCost: costoUnitario, revenue: ingreso,
      cost: costo, profit: ganancia, tithe: diezmo,
      afterTithe: conocido ? ganancia - diezmo : null, known: conocido };
  });
  const completo = lineas.every(l => l.known);
  const ingresos = lineas.reduce((s, l) => s + l.revenue, 0);
  const costos = completo ? lineas.reduce((s, l) => s + l.cost, 0) : null;
  const ganancia = completo ? ingresos - costos : null;
  const diezmo = completo ? lineas.reduce((s, l) => s + l.tithe, 0) : null;
  return { lines: lineas, complete: completo, revenue: ingresos,
    costs: costos, profit: ganancia, tithe: diezmo,
    afterTithe: completo ? ganancia - diezmo : null,
    pending: lineas.filter(l => !l.known).length };
}
export function hoyLocal(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
}
export function rangoFinanzas(tipo, mes, quincena, inicio, fin) {
  if (tipo === 'todos') return { start: null, end: null, label: 'Todas las fechas' };
  if (tipo === 'personalizado') return { start: inicio, end: fin, label: 'Del ' + inicio + ' al ' + fin, invalid: !inicio || !fin || inicio > fin };
  const valido = /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);
  if (!valido) return { start: null, end: null, label: 'Selecciona un mes', invalid: true };
  const [year, month] = mes.split('-').map(Number);
  const last = String(new Date(year, month, 0).getDate()).padStart(2,'0');
  if (tipo === 'quincena') {
    const firstHalf = quincena === '1';
    return { start: mes + '-' + (firstHalf ? '01' : '16'),
      end: mes + '-' + (firstHalf ? '15' : last),
      label: (firstHalf ? 'Primera' : 'Segunda') + ' quincena de ' + mes };
  }
  return { start: mes + '-01', end: mes + '-' + last, label: 'Mes de ' + mes };
}
export function ventasPeriodo(ventas, rango) {
  if (rango.invalid) return [];
  return (ventas || []).filter(v => {
    if (v.status === 'anulada') return false;
    const fecha = hoyLocal(new Date(v.createdAt));
    return (!rango.start || fecha >= rango.start) && (!rango.end || fecha <= rango.end);
  }).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
}
export function resumenFinanzas(ventas) {
  const calculadas = ventas.map(v => ({ venta: v, calculo: calcularVenta(v) }));
  const completas = calculadas.filter(x => x.calculo.complete);
  const sumar = clave => completas.reduce((s,x) => s + x.calculo[clave], 0);
  return { calculadas, cantidad: ventas.length, pendiente: calculadas.length - completas.length,
    ingresos: calculadas.reduce((s,x) => s + x.calculo.revenue, 0),
    costos: sumar('costs'), ganancia: sumar('profit'), diezmo: sumar('tithe'),
    despuesDiezmo: sumar('afterTithe') };
}
