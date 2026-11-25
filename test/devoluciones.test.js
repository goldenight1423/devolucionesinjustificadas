const { test } = require('node:test');
const assert = require('node:assert/strict');
const { crearApp } = require('../server');

const TOKEN = 'token-devoluciones-123';

const CUERPO = {
  devoluciones: [
    {
      guia: '1234567890',
      orden: 'ORD-001',
      transportadora: 'ENVIA',
      contador_novedades: 1,
      novedad: 'Dirección incorrecta',
      fue_solucionada: 'SI',
      solucion: 'Se contactó al cliente',
      fecha_novedad: '2026-07-20',
      fecha_solucion: '2026-07-21',
      fecha_devolucion: '2026-07-25',
    },
  ],
};

// Arranca la app en un puerto libre y la cierra al terminar.
async function conServidor(fn) {
  const app = crearApp({ servicioToken: TOKEN });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

function pedir(base, ruta, { cabecera, cuerpo, metodo = 'POST' } = {}) {
  const headers = {};
  if (cabecera !== undefined) headers.Authorization = cabecera;
  let body;
  if (cuerpo !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(cuerpo);
  }
  return fetch(`${base}${ruta}`, { method: metodo, headers, body });
}

test('crearApp se niega a arrancar sin SERVICIO_TOKEN', () => {
  assert.throws(() => crearApp({ servicioToken: '' }), /SERVICIO_TOKEN/);
  assert.throws(() => crearApp({}), /SERVICIO_TOKEN/);
});

test('POST /api/devoluciones sin Authorization responde 401', async () => {
  await conServidor(async (base) => {
    const r = await pedir(base, '/api/devoluciones', { cuerpo: CUERPO });
    assert.equal(r.status, 401);
    assert.equal(r.headers.get('www-authenticate'), 'Bearer realm="devoluciones"');
    assert.equal((await r.json()).success, false);
  });
});

test('POST /api/devoluciones con token malo o con otro esquema responde 401', async () => {
  await conServidor(async (base) => {
    const malo = await pedir(base, '/api/devoluciones', { cabecera: 'Bearer token-malo', cuerpo: CUERPO });
    assert.equal(malo.status, 401);

    const basic = `Basic ${Buffer.from(`u:${TOKEN}`).toString('base64')}`;
    const otro = await pedir(base, '/api/devoluciones', { cabecera: basic, cuerpo: CUERPO });
    assert.equal(otro.status, 401);
  });
});

test('POST /api/devoluciones con el token correcto procesa la petición', async () => {
  await conServidor(async (base) => {
    const r = await pedir(base, '/api/devoluciones', { cabecera: `Bearer ${TOKEN}`, cuerpo: CUERPO });
    assert.equal(r.status, 200);
    const datos = await r.json();
    assert.equal(datos.success, true);
    assert.equal(datos.resultados.length, 1);
  });
});

test('con el token correcto, la validación de entrada sigue igual (400)', async () => {
  await conServidor(async (base) => {
    const r = await pedir(base, '/api/devoluciones', { cabecera: `Bearer ${TOKEN}`, cuerpo: { devoluciones: [] } });
    assert.equal(r.status, 400);
  });
});

test('GET /api/health responde sin token', async () => {
  await conServidor(async (base) => {
    const r = await pedir(base, '/api/health', { metodo: 'GET' });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).status, 'ok');
  });
});
