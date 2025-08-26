# habilitacion-personal

Aplicación HTML para el seguimiento de habilitaciones.

## Configuración

Para resguardar las credenciales, el HTML carga las API keys desde un Web App de Google Sheets. Edita el bloque de configuración al inicio de `YPFBREV31.html` y coloca la URL del Web App (`sheetWebAppUrl`). Todas las API keys (Firebase, Gemini, etc.) se almacenan en la hoja `CLAVES` del Spreadsheet y se cargan dinámicamente, de modo que el archivo HTML se puede compartir sin exponerlas.  
La función de proxy para Gemini también recupera la clave directamente desde la celda `P1` de la hoja **Hoja 1**.

## Novedades

- Pestaña **YPFB** con tarjetas de los proyectos asignados al usuario conectado.
- Los proyectos almacenan responsables SST, MA y RSE por proyecto.
- El historial de revisiones guarda nombre y correo del responsable.
- Las revisiones solo se añaden al historial cuando se pulsa **Registrar** o se genera un reporte.
- Cada proyecto puede asignarse a múltiples tipos de carpeta (CI, HP, DB, HV).
- Se envían notificaciones iniciales a SST/MA/RSE y se verifica automáticamente cuando los tres han concluido.
- El Web App ahora puede recibir datos mediante un formulario que se envía a un iframe oculto y responde usando `postMessage`, lo que permite utilizar el HTML desde `file://` sin errores de CORS. Mantiene además la respuesta JSON con cabeceras `Access-Control-Allow-*` por si se usa `fetch` desde un origen HTTPS.
- La función `enviarASheet` envía el JSON como `text/plain` para evitar el preflight y captura errores de red si la URL del Web App no es accesible.
- El Web App ahora registra `correoSST` además de `correoMA` y `correoRSE` y notifica a todos los responsables.
