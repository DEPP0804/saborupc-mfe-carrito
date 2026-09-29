// Micro frontend: CARRITO  (equipo "Pedidos")
// Contrato: window.renderCarrito(idContenedor) / window.unmountCarrito(idContenedor)
// Escucha:  'carrito:agregar'      { id, nombre, precio }
// Publica:  'carrito:actualizado'  { cantidad, subtotal, servicio, total, version }  (v2)
// Publica:  'pedido:confirmado'    { id, items, total, version }                     (v1)
(function () {
  const VERSION = '1.1.0';
  const PORCENTAJE_SERVICIO = 0.10; // 10 %
  const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  const CSS = `
    @import url('http://localhost:8081/tokens.css');

    .car-titulo { color: var(--color-primario, #0b4f8a); margin: 0 0 4px; }
    .car-version { font-size: 12px; color: #888; }
    .car-tabla { width: 100%; border-collapse: collapse; margin: 16px 0; background: #fff; }
    .car-tabla th, .car-tabla td { padding: 10px; border-bottom: 1px solid #e3e7ec; text-align: left; }
    .car-tabla th { background: #eaf3fb; }
    .car-quitar {
      background: none; border: 1px solid var(--color-peligro, #c0392b);
      color: var(--color-peligro, #c0392b); border-radius: 4px; cursor: pointer; padding: 4px 8px;
    }
    .car-resumen { background: #fff; border: 1px solid #dde3ea; border-radius: 6px; padding: 12px 16px; margin-top: 12px; }
    .car-resumen .fila { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
    .car-resumen .total { font-size: 20px; font-weight: bold; border-top: 1px solid #e3e7ec; margin-top: 6px; padding-top: 8px; }
    .car-confirmar {
      background: var(--color-primario, #0b4f8a); color: #fff; border: 0;
      padding: 10px 18px; border-radius: 4px; cursor: pointer; float: right; margin-top: 12px;
    }
    .car-confirmar:disabled { background: #aaa; cursor: not-allowed; }
    .car-vacio { color: #777; }
    .car-exito { background: #eaf6ea; color: var(--color-exito, #1b7a3e); padding: 12px; border-radius: 4px; }
  `;

  // ---- Estado propio del micro frontend (vive mientras el script esté cargado)
  const items = [];          // [{ id, nombre, precio, cantidad }]
  let idMontado = null;      // si está en pantalla, dónde
  let mensaje = '';

  function asegurarEstilos() {
    if (document.getElementById('car-estilos')) return;
    const s = document.createElement('style');
    s.id = 'car-estilos';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function subtotal() {
    return items.reduce((acc, it) => acc + it.precio * it.cantidad, 0);
  }
  function servicio() {
    return Math.round(subtotal() * PORCENTAJE_SERVICIO);
  }
  function total() {
    return subtotal() + servicio();
  }

  // Publica el estado del carrito (v2: incluye subtotal, servicio y version)
  function publicarEstado() {
    const cantidad = items.reduce((acc, it) => acc + it.cantidad, 0);
    window.dispatchEvent(new CustomEvent('carrito:actualizado', {
      detail: {
        cantidad: cantidad,
        subtotal: subtotal(),
        servicio: servicio(),
        total: total(),
        version: 2
      }
    }));
  }

  // El carrito escucha desde que se carga su script (por eso el contenedor lo precarga)
  window.addEventListener('carrito:agregar', function (e) {
    const plato = e.detail;
    const existente = items.find(it => it.id === plato.id);
    if (existente) existente.cantidad += 1;
    else items.push({ id: plato.id, nombre: plato.nombre, precio: plato.precio, cantidad: 1 });
    mensaje = '';
    publicarEstado();
    if (idMontado) pintar();
  });

  function pintar() {
    const raiz = document.getElementById(idMontado);
    let html = `<h2 class="car-titulo">Tu carrito</h2>
                <span class="car-version">mfe-carrito v${VERSION}</span>`;
    if (mensaje) html += `<p class="car-exito">${mensaje}</p>`;

    if (items.length === 0) {
      html += '<p class="car-vacio">El carrito está vacío. Agrega platos desde el catálogo.</p>';
      raiz.innerHTML = html;
      return;
    }

    html += `<table class="car-tabla">
      <tr><th>Plato</th><th>Cantidad</th><th>Subtotal</th><th></th></tr>
      ${items.map(it => `<tr>
          <td>${it.nombre}</td><td>${it.cantidad}</td>
          <td>${pesos.format(it.precio * it.cantidad)}</td>
          <td><button class="car-quitar" data-id="${it.id}">Quitar</button></td>
        </tr>`).join('')}
    </table>

    <div class="car-resumen">
      <div class="fila"><span>Subtotal</span><span>${pesos.format(subtotal())}</span></div>
      <div class="fila"><span>Servicio (10 %)</span><span>${pesos.format(servicio())}</span></div>
      <div class="fila total"><span>Total</span><span>${pesos.format(total())}</span></div>
    </div>

    <button class="car-confirmar">Confirmar pedido</button>`;

    raiz.innerHTML = html;
  }

  function alHacerClic(e) {
    if (e.target.matches('.car-quitar')) {
      const i = items.findIndex(it => it.id === Number(e.target.dataset.id));
      if (i >= 0) items.splice(i, 1);
      publicarEstado();
      pintar();
    } else if (e.target.matches('.car-confirmar')) {
      // 1) Publicar el pedido ANTES de vaciar el carrito
      const idPedido = Date.now();
      window.dispatchEvent(new CustomEvent('pedido:confirmado', {
        detail: {
          id: idPedido,
          items: items.map(it => ({ id: it.id, nombre: it.nombre, precio: it.precio, cantidad: it.cantidad })),
          total: total(),
          version: 1
        }
      }));

      // 2) Confirmar al usuario y vaciar
      mensaje = 'Pedido #' + idPedido + ' confirmado por ' + pesos.format(total()) + '. ¡Gracias!';
      items.length = 0;
      publicarEstado();
      pintar();
    }
  }

  window.renderCarrito = function (idContenedor) {
    asegurarEstilos();
    idMontado = idContenedor;
    document.getElementById(idContenedor).addEventListener('click', alHacerClic);
    pintar();
  };

  window.unmountCarrito = function (idContenedor) {
    const raiz = document.getElementById(idContenedor);
    raiz.removeEventListener('click', alHacerClic);
    raiz.innerHTML = '';
    idMontado = null;
    mensaje = '';
  };
})();