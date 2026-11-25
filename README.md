# API Devoluciones Injustificadas

API REST para evaluación de devoluciones injustificadas basada en reglas de negocio.

## Endpoint

```
POST /api/devoluciones
```

## Input JSON

```json
{
  "devoluciones": [
    {
      "guia": "124011574657",
      "orden": "84309825",
      "transportadora": "ENVIA",
      "contador_novedades": "1",
      "novedad": "Direccion incorrecta",
      "fue_solucionada": "SI",
      "solucion": "Se contacto al cliente",
      "fecha_novedad": "2026-07-20",
      "fecha_solucion": "2026-07-21",
      "fecha_devolucion": "2026-07-25"
    }
  ]
}
```

## Campos requeridos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `guia` | string | Número de guía |
| `orden` | string | ID de la orden |
| `transportadora` | string | Nombre transportadora |
| `contador_novedades` | string | Cantidad de novedades ("0", "1", "2"...) |
| `novedad` | string | Descripción de la novedad |
| `fue_solucionada` | string | "SI" o "NO" |
| `solucion` | string | Texto de la solución |
| `fecha_novedad` | string | Fecha (YYYY-MM-DD o DD/MM/YYYY) |
| `fecha_solucion` | string | Fecha de solución |
| `fecha_devolucion` | string | Fecha de devolución |

## Output JSON

```json
{
  "success": true,
  "resultados": [
    {
      "guia": "124011574657",
      "orden": "84309825",
      "resultado": "INVESTIGABLE",
      "motivo": "Cumple criterios iniciales"
    }
  ],
  "resumen": {
    "total": 1,
    "investigable": 1,
    "noInvestigable": 0,
    "revisionManual": 0
  }
}
```

## Resultados posibles

| Resultado | Descripción |
|-----------|-------------|
| `INVESTIGABLE` | Cumple criterios para investigación |
| `NO INVESTIGABLE` | No cumple criterios (múltiples novedades, sin solucionar, devolución autorizada, solución > 1 día) |
| `REVISIÓN MANUAL` | Requiere revisión manual (sin novedades, devolución mismo día de solución) |

## Reglas de negocio

- **R001**: Múltiples novedades → NO INVESTIGABLE
- **R002**: Novedad sin solucionar → NO INVESTIGABLE
- **R003**: Devolución autorizada (solución incluye "DEVOLVER AL REMITENTE") → NO INVESTIGABLE
- **R004**: Solución superior a 1 día → NO INVESTIGABLE
- **R005**: Sin novedades registradas → REVISIÓN MANUAL
- **R006**: Devolución el mismo día de la solución → REVISIÓN MANUAL

## Despliegue en Easypanel

### Configuración del servicio

- **Source**: GitHub
- **Repository**: `goldenight1423/devolucionesinjustificadas`
- **Branch**: `master`
- **Build Pack**: Dockerfile
- **Port**: 3000

### Variables de entorno

| Variable | Valor |
|----------|-------|
| `SERVICIO_TOKEN` | **Obligatoria**: token Bearer de los llamadores. Sin ella la API no arranca |
| `HOST` | `127.0.0.1` por defecto. La imagen Docker fija `0.0.0.0` |
| `PORT` | `3000` por defecto |

### Ejecución local

```bash
npm install
SERVICIO_TOKEN=<token> npm start
```

### Docker

```bash
docker build -t devoluciones-api .
docker run -p 3000:3000 -e SERVICIO_TOKEN=<token> devoluciones-api
```

## Autenticación

`POST /api/devoluciones` exige `Authorization: Bearer <SERVICIO_TOKEN>`, el mismo mecanismo que enviascraping y seguimientocapp. Sin cabecera, con otro token o con otro esquema responde `401`. La comparación es en tiempo constante. `GET /api/health` no exige token.

Las reglas de evaluación (R001–R006) no cambian. La API no guarda resultados.

## Pruebas

```bash
npm test
```

## Health check

```
GET /api/health
```

Respuesta:
```json
{ "status": "ok", "timestamp": "2026-08-20T17:18:21.144Z" }
```
