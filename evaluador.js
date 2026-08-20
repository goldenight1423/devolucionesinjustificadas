/**
 * Motor de reglas para evaluación de devoluciones injustificadas.
 * Replica la lógica del Code.gs original.
 */

/**
 * Evalúa una guía y determina si es investigable o no.
 * @param {Object} devolucion - Objeto con los datos de la devolución
 * @returns {{ resultado: string, motivo: string }}
 */
function evaluarGuia(devolucion) {
  const {
    contador_novedades,
    fue_solucionada,
    solucion,
    fecha_novedad,
    fecha_solucion,
    fecha_devolucion
  } = devolucion;

  // Normalizar valores
  const contador = contador_novedades;
  const solucionadaNorm = String(fue_solucionada || '').trim().toUpperCase();
  const solucionNorm = String(solucion || '').trim().toUpperCase();

  // R005 - Sin novedades registradas
  if (contador === 0 || contador === '0' || contador === '' || contador == null) {
    return {
      resultado: 'REVISIÓN MANUAL',
      motivo: 'Sin novedades registradas en el sistema'
    };
  }

  // R001 - Múltiples novedades
  if (contador !== '' && !isNaN(contador) && Number(contador) > 1) {
    return {
      resultado: 'NO INVESTIGABLE',
      motivo: 'Múltiples novedades'
    };
  }

  // R002 - Novedad sin solucionar
  if (solucionadaNorm === 'NO') {
    return {
      resultado: 'NO INVESTIGABLE',
      motivo: 'Novedad sin solucionar'
    };
  }

  // R003 - Devolución autorizada
  if (solucionNorm.includes('DEVOLVER AL REMITENTE')) {
    return {
      resultado: 'NO INVESTIGABLE',
      motivo: 'Devolución autorizada'
    };
  }

  // R004 y R006 - Requieren las 3 fechas válidas
  const dNovedad = parseFecha(fecha_novedad);
  const dSolucion = parseFecha(fecha_solucion);
  const dDevolucion = parseFecha(fecha_devolucion);

  if (dNovedad && dSolucion && dDevolucion) {
    // Normalizar a medianoche para comparación
    const novedad = new Date(dNovedad.getFullYear(), dNovedad.getMonth(), dNovedad.getDate());
    const solucion = new Date(dSolucion.getFullYear(), dSolucion.getMonth(), dSolucion.getDate());
    const devolucion = new Date(dDevolucion.getFullYear(), dDevolucion.getMonth(), dDevolucion.getDate());

    const diffTiempo = solucion.getTime() - novedad.getTime();
    const diffDias = Math.round(diffTiempo / (1000 * 60 * 60 * 24));

    // R006 - Devolución el mismo día de la solución
    if (devolucion.getTime() === solucion.getTime()) {
      return {
        resultado: 'REVISIÓN MANUAL',
        motivo: 'Devolución el mismo día de la solución'
      };
    }

    // R004 - Solución fuera del tiempo permitido
    if (diffDias > 1) {
      return {
        resultado: 'NO INVESTIGABLE',
        motivo: 'Solución superior a 1 día'
      };
    }
  }

  // Si pasa todos los filtros, es investigable
  return {
    resultado: 'INVESTIGABLE',
    motivo: 'Cumple criterios iniciales'
  };
}

/**
 * Parsea una fecha en varios formatos posibles.
 * @param {string|Date} valor - Valor de fecha
 * @returns {Date|null}
 */
function parseFecha(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;

  const str = String(valor).trim();
  if (!str) return null;

  // Intentar parsear directamente
  const fecha = new Date(str);
  if (!isNaN(fecha.getTime())) return fecha;

  // Formato DD/MM/YYYY o DD-MM-YYYY
  const partes = str.split(/[/\-\s]/);
  if (partes.length >= 3) {
    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1;
    const anio = parseInt(partes[2], 10);
    const fechaManual = new Date(anio, mes, dia);
    if (!isNaN(fechaManual.getTime())) return fechaManual;
  }

  return null;
}

/**
 * Procesa un array de devoluciones y devuelve los resultados.
 * @param {Array} devoluciones - Array de objetos con datos de devolución
 * @returns {{ resultados: Array, resumen: Object }}
 */
function procesarDevoluciones(devoluciones) {
  const resultados = [];
  let totalInvestigable = 0;
  let totalNoInvestigable = 0;
  let totalRevisionManual = 0;

  for (const dev of devoluciones) {
    const { resultado, motivo } = evaluarGuia(dev);

    if (resultado === 'INVESTIGABLE') totalInvestigable++;
    else if (resultado === 'NO INVESTIGABLE') totalNoInvestigable++;
    else if (resultado === 'REVISIÓN MANUAL') totalRevisionManual++;

    resultados.push({
      guia: dev.guia,
      orden: dev.orden,
      resultado,
      motivo
    });
  }

  return {
    resultados,
    resumen: {
      total: devoluciones.length,
      investigable: totalInvestigable,
      noInvestigable: totalNoInvestigable,
      revisionManual: totalRevisionManual
    }
  };
}

module.exports = { evaluarGuia, procesarDevoluciones, parseFecha };
