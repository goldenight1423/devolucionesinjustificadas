const express = require('express');
const cors = require('cors');
const { procesarDevoluciones } = require('./evaluador');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

/**
 * POST /api/devoluciones
 * 
 * Evalúa un array de devoluciones y devuelve el resultado de cada una.
 * 
 * Input JSON:
 * {
 *   "devoluciones": [
 *     {
 *       "guia": "1234567890",
 *       "orden": "ORD-001",
 *       "transportadora": "SERVIENTREGA",
 *       "contador_novedades": 1,
 *       "novedad": "Dirección incorrecta",
 *       "fue_solucionada": "SI",
 *       "solucion": "Se contactó al cliente",
 *       "fecha_novedad": "2026-07-20",
 *       "fecha_solucion": "2026-07-21",
 *       "fecha_devolucion": "2026-07-25"
 *     }
 *   ]
 * }
 */
app.post('/api/devoluciones', (req, res) => {
  try {
    const { devoluciones } = req.body;

    // Validar que se envíe el array
    if (!Array.isArray(devoluciones) || devoluciones.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un array "devoluciones" con al menos un elemento'
      });
    }

    // Validar campos requeridos en cada devolución
    const camposRequeridos = ['guia', 'orden', 'contador_novedades', 'fue_solucionada', 'solucion', 'fecha_novedad', 'fecha_solucion', 'fecha_devolucion'];
    const errores = [];

    devoluciones.forEach((dev, index) => {
      const faltantes = camposRequeridos.filter(campo => dev[campo] === undefined || dev[campo] === null);
      if (faltantes.length > 0) {
        errores.push(`Devolución[${index}]: faltan campos ${faltantes.join(', ')}`);
      }
    });

    if (errores.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos faltantes',
        detalles: errores
      });
    }

    // Procesar
    const resultado = procesarDevoluciones(devoluciones);

    res.json({
      success: true,
      ...resultado
    });

  } catch (error) {
    console.error('Error procesando devoluciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`API Devoluciones corriendo en http://localhost:${PORT}`);
  console.log(`POST http://localhost:${PORT}/api/devoluciones`);
});
