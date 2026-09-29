# mfe-carrito

Micro frontend del carrito de compras. Escucha `carrito:agregar` y publica
`carrito:actualizado` (v2) y `pedido:confirmado` (v1).

## Puerto
`http://localhost:8083`

Ejemplo:
    python -m http.server 8083

## Tecnología
JavaScript puro, sin framework.

## Contrato de montaje / desmontaje
- `window.renderCarrito(idContenedor)`
- `window.unmountCarrito(idContenedor)`

## Eventos
- **Escucha:** `carrito:agregar`
  - `detail`: `{ id, nombre, precio }`
- **Publica:** `carrito:actualizado`
  - `detail`: `{ cantidad, subtotal, servicio, total, version }`
  - Versión: **2** (compatible hacia atrás con v1).
  - Nota: `servicio` es el 10 % del subtotal.
- **Publica:** `pedido:confirmado`
  - `detail`: `{ id, items, total, version }`
  - Versión: 1.
  - Se emite **antes** de vaciar el carrito.

## Compatibilidad hacia atrás
`carrito:actualizado` v2 agrega los campos `subtotal`, `servicio` y `version`.
El contenedor sigue leyendo solo `cantidad` y `total` (v1) sin cambios.

## Modo independiente
Abrir `http://localhost:8083/` para simular platos con botones y ver
los eventos que publica el carrito.

## Prueba de contrato
Abrir `http://localhost:8083/contrato.html`.
Verifica funciones expuestas, montaje, estructura de `carrito:actualizado` v2
y estructura de `pedido:confirmado` v1.

## Versión visible
`VERSION = '1.1.0'` (mostrado en pantalla bajo el título).