# LuSam Shop — Editorial Rosé (Tienda pública)

Este repositorio contiene el diseño **Editorial Rosé aprobado**, la tienda web y las interfaces del administrador y caja. Las interfaces de admin y caja son accesibles mediante URL, **pero los datos privados solo se leen y escriben con un token autorizado de GitHub**. No contiene contraseñas ni registros de clientes.

## Archivos

- `index.html`: tienda para clientes, filtros, tallas y carrito de consulta.
- `data/catalogo.json`: copia **pública** de productos y existencias; se reemplaza mediante GitHub Actions desde `lusam-shop-control`.
- `admin/`: interfaz de inventario adaptada a móvil.
- `caja/`: registro de ventas y recibo PNG.
- `assets/`: estilos, logo, conexión a la API y datos simulados para pruebas.
- `productos/`: fotos subidas desde el administrador; la carpeta se crea automáticamente al subir la primera foto.

## Publicar

1. Crear `lusam-shop-web` **público** en la cuenta `bellashopinsumos-dotcom` con rama `main`.
2. Subir **el contenido** de esta carpeta a la raíz del repositorio (`index.html` debe estar en la raíz).
3. En **Settings → Pages**, seleccionar **Deploy from a branch**, rama `main`, carpeta `/(root)`.
4. La tienda estará en `https://bellashopinsumos-dotcom.github.io/lusam-shop-web/` cuando termine el despliegue.
5. Las rutas de uso interno son `/lusam-shop-web/admin/` y `/lusam-shop-web/caja/`. Sus interfaces son públicas, **no** son páginas privadas en el sentido de ocultar el código. No muestran ni cambian los datos privados sin una credencial válida.

**No publicar como tienda definitiva hasta cargar datos reales:** los 12 productos iniciales son **DEMO** y el encabezado del catálogo lo indica. La tienda no acepta pagos, solo permite copiar el resumen de consulta al cliente.

## Conexión con `lusam-shop-control`

El repositorio privado guarda `data/negocio.json` con productos, stock, ventas y movimientos. Cada edición del administrador y cada venta realizan una actualización autenticada del archivo privado. GitHub Actions publica solo los campos autorizados en `data/catalogo.json`. La web vuelve a consultar el archivo cada 60 segundos mientras esté abierta.

Ver las instrucciones de la carpeta privada para la configuración de credenciales y automatización.

## Seguridad y limitaciones

- **Nunca** escribir tokens en HTML, JavaScript, README o capturas. El token se solicita durante la sesión y se mantiene únicamente en memoria.
- Cualquier persona puede ver el código de las interfaces `admin/` y `caja/`, pero no los datos privados sin autorización.
- La autenticación real es de **GitHub mediante token de acceso restringido**, no una contraseña independiente. Para cuentas de empleados y distintos permisos reales se necesitaría un servicio de autenticación/servidor adicional.
- Los tokens tienen riesgo si el dispositivo está infectado o se manipula el sitio. Usar cuentas con 2FA, token de duración limitada y permisos mínimos, sin acceso a repositorios de Bella Shop.
- GitHub como archivo de datos es apropiado **solo para una primera versión de bajo volumen**: no es una base de datos transaccional; puede haber retrasos de publicación y conflictos de ediciones simultáneas. El código reintenta conflictos, pero no reemplaza un sistema profesional de caja.
- Las imágenes subidas por el administrador se vuelven **públicas**.
- El recibo generado no es factura electrónica ni reemplaza las obligaciones que legalmente correspondan a la tienda.