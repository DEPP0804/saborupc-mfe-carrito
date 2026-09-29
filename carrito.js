// Micro frontend: CARRITO  (equipo "Pedidos")
// Contrato: window.renderCarrito(idContenedor) / window.unmountCarrito(idContenedor)
// Escucha:  'carrito:agregar'      { id, nombre, precio }
// Publica:  'carrito:actualizado'  { cantidad, subtotal, servicio, total, version }  (v2; total incluye el servicio)
// Publica:  'pedido:confirmado'    { id, items, total, version }                     (v1)
// Estado:   sessionStorage['saborupc:carrito'] (propio de este micro frontend)
// Config:   <script src="carrito.js" data-tokens="URL/tokens.css"></script>
(function () {
  if (window.renderCarrito) return;  // ya cargado

  const VERSION = '1.2.0';
  const PORCENTAJE_SERVICIO = 0.10; // 10 %
  const CLAVE = 'saborupc:carrito';
  const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  // document.currentScript solo existe mientras el script se ejecuta: se lee aquí, de forma síncrona
  const TOKENS_URL = (document.currentScript && document.currentScript.dataset.tokens)
    || 'https://design-tokens-saborupc.onrender.com/tokens.css';

  const esc = s => String(s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function cargarTokens() {
    if (document.getElementById('car-tokens')) return;
    if (!document.querySelector('link[href="' + TOKENS_URL + '"]')) {
      const link = document.createElement('link');
      link.id = 'car-tokens';
      link.rel = 'stylesheet';
      link.href = TOKENS_URL;
      document.head.appendChild(link);
    }
  }

  const CSS = `
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

  // ---- Estado propio del micro frontend, persistido en sessionStorage
  function cargar() {
    try {
      const g = JSON.parse(sessionStorage.getItem(CLAVE) || '[]');
      return Array.isArray(g)
        ? g.filter(it => it && it.id !== undefined && Number.isFinite(it.precio) && it.cantidad > 0)
        : [];
    } catch (e) {
      return [];              // storage bloqueado o JSON dañado: arranca vacío
    }
  }
  function guardar() {
    try { sessionStorage.setItem(CLAVE, JSON.stringify(items)); } catch (e) { /* sin storage: sigue en memoria */ }
  }

  const items = cargar();    // [{ id, nombre, precio, cantidad }]
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

  // Guarda y publica el estado del carrito (v2: incluye subtotal, servicio y version)
  function publicarEstado() {
    guardar();
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
    const precio = plato ? Number(plato.precio) : NaN;
    // Un evento mal formado de otro micro frontend no debe corromper los totales
    if (!plato || plato.id === undefined || plato.id === null || !Number.isFinite(precio)) return;

    const existente = items.find(it => String(it.id) === String(plato.id));
    if (existente) existente.cantidad += 1;
    else items.push({ id: plato.id, nombre: plato.nombre, precio: precio, cantidad: 1 });
    mensaje = '';
    publicarEstado();
    if (idMontado) pintar();
  });

  function pintar() {
    const raiz = idMontado && document.getElementById(idMontado);
    if (!raiz) return;   // el contenedor quitó el nodo sin llamar a unmountCarrito

    let html = `<h2 class="car-titulo">Tu carrito</h2>
                <span class="car-version">mfe-carrito v${VERSION}</span>`;
    if (mensaje) html += `<p class="car-exito">${esc(mensaje)}</p>`;

    if (items.length === 0) {
      html += '<p class="car-vacio">El carrito está vacío. Agrega platos desde el catálogo.</p>';
      raiz.innerHTML = html;
      return;
    }

    html += `<table class="car-tabla">
      <tr><th>Plato</th><th>Cantidad</th><th>Subtotal</th><th></th></tr>
      ${items.map(it => `<tr>
          <td>${esc(it.nombre)}</td><td>${it.cantidad}</td>
          <td>${pesos.format(it.precio * it.cantidad)}</td>
          <td><button class="car-quitar" data-id="${esc(it.id)}">Quitar</button></td>
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
      const i = items.findIndex(it => String(it.id) === e.target.dataset.id);
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
    const raiz = document.getElementById(idContenedor);
    if (!raiz) return;

    // Si estaba montado en otro contenedor, suelta ese
    if (idMontado && idMontado !== idContenedor) {
      const anterior = document.getElementById(idMontado);
      if (anterior) anterior.removeEventListener('click', alHacerClic);
    }

    cargarTokens();
    asegurarEstilos();
    idMontado = idContenedor;
    raiz.addEventListener('click', alHacerClic);
    pintar();
    publicarEstado();   // sincroniza el contador del contenedor al montar (p. ej. tras recargar)
  };

  window.unmountCarrito = function (idContenedor) {
    const raiz = document.getElementById(idContenedor);
    if (raiz) {
      raiz.removeEventListener('click', alHacerClic);
      raiz.innerHTML = '';
    }
    idMontado = null;
    mensaje = '';
  };
})();