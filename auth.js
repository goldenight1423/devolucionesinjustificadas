const { createHash, timingSafeEqual } = require('node:crypto');

const RE_BEARER = /^Bearer\s+(\S+)$/i;

// SHA-256 de cada valor: ambos tienen 32 bytes, así que timingSafeEqual compara
// en tiempo constante sin revelar la longitud del token.
function huella(valor) {
  return createHash('sha256').update(valor, 'utf8').digest();
}

// Valida `Authorization: Bearer <SERVICIO_TOKEN>` (mismo mecanismo que enviascraping y seguimientocapp).
function tokenValido(cabecera, tokenEsperado) {
  if (typeof cabecera !== 'string' || !tokenEsperado) return false;
  const coincidencia = RE_BEARER.exec(cabecera.trim());
  if (!coincidencia) return false;
  return timingSafeEqual(huella(coincidencia[1]), huella(tokenEsperado));
}

module.exports = { tokenValido };
