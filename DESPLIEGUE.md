# Publicar y conectar Google Sheets

## 1. Hoja ya creada

Hoja privada entregada al investigador en la conversación. Su URL no se publica en GitHub.

ID: `TU_ID_DE_HOJA_PRIVADA`. Pestañas `Sesiones` y `Diccionario`. No cambiar las cabeceras de Sesiones. No activar «cualquier persona con el enlace» ni publicar la hoja. El ID no es una clave de acceso, pero no se necesita incluirlo en el navegador del participante.

La hoja se ha creado en la cuenta Google conectada. Antes de recoger datos institucionales, confirmar que esa cuenta y su configuración son apropiadas para el estudio de UGR.

## 2. Receptor de Google Apps Script

1. Desde la hoja: **Extensiones**, **Apps Script**.
2. Copiar `backend/Code.gs` al archivo `Code.gs`.
3. Crear archivo HTML llamado **Bridge** y copiar `backend/Bridge.html`.
4. En Configuración del proyecto, mostrar `appsscript.json` y copiar el manifiesto suministrado. El alcance `spreadsheets` permite acceder a hojas como titular; Google solicitará autorización. No se guarda ningún token en GitHub.
5. En **Propiedades del script** añadir:

| Propiedad | Valor |
|---|---|
| SHEET_ID | TU_ID_DE_HOJA_PRIVADA |
| ALLOWED_ORIGIN | https://anibalmastobiza.github.io |
| COLLECTION_OPEN | false |

6. **Implementar**, **Nueva implementación**, **Aplicación web**. Ejecutar como titular del script; acceso «Cualquier persona» si la cuenta lo permite. Esto hace público el receptor de escritura, no la hoja. El titular completa personalmente cualquier autorización o aviso de Google.
7. Copiar la URL terminada en `/exec` a `endpoint` en `docs/config.js`. No utilizar la URL `/dev`.
8. Mantener `mode:'demo'` para comprobar el sitio. Cuando el receptor y la información de consentimiento estén comprobados, poner `COLLECTION_OPEN=true` y `mode:'live'` para una prueba supervisada de punta a punta.

El receptor carga en un iframe y utiliza `google.script.run`; devuelve confirmación mediante `postMessage`. Se verifican el origen configurado, la ventana fuente y un identificador de solicitud. El navegador no anuncia recepción hasta la confirmación. No se usa `fetch(...,{mode:'no-cors'})`, que no permite saber si Google guardó la fila.

**Límite de esta arquitectura:** el endpoint es público. La comprobación de origen en el puente no es autenticación criptográfica ni una defensa completa frente a envíos automatizados. Hay validación de tamaño/campos, escritura de columnas permitidas, un límite diario global de 1.000 sesiones y un candado contra duplicados. Para reclutamiento masivo o incentivos, añadir credenciales de participación de un solo uso mediante un backend autenticado; no introducir un «secreto» en el JavaScript público.

## 3. GitHub Pages

Repositorio: `anibalmastobiza/estilometria-microestructural`.

En **Settings**, **Pages**, **Build and deployment**, elegir **Deploy from a branch**, rama `main`, carpeta `/docs`, y guardar. La URL esperada es:

https://anibalmastobiza.github.io/estilometria-microestructural/

Es una URL esperada hasta que se verifique su respuesta y contenido. El sitio no necesita Actions ni secretos. Conservar `docs/.nojekyll`.

## 4. Comprobación real antes de reclutar

Con una persona que consienta el piloto, completar una sesión y verificar: aparece exactamente una fila; `trials_json` contiene cuatro ítems y cuatro celdas experimentales; la cámara se apaga; el mensaje de recepción llega solo al guardar. Reintentar el mismo envío no debe crear otra fila. Una sesión retirada, una demostración o una sesión sin consentimiento no debe aparecer. Comprobar permiso de cámara denegado, falta de señal, salida y ventana pequeña. En la versión 1.2, comprobar también que la calibración avanza sin clics, que la validación se realiza una sola vez y que una señal suficiente pero imprecisa permite continuar conservando `gaze_status=invalid` y sus errores de validación en la hoja.

El ensayo de transmisión debe identificarse y separarse del análisis, con autorización para eliminar su fila. No afirmar que la conexión ha sido probada si solo han pasado pruebas locales del receptor.

## 5. Conservación y retirada

Ejecutar desde el editor `installRetentionTrigger_` para instalar una purga diaria de filas de más de 12 meses. No está instalado por incluir el archivo. Revisar permisos, cuotas, historial/versiones y copias: borrar filas no garantiza eliminar todas las copias del proveedor. Exportaciones locales deben entrar en la misma política.

No se entrega un código de retirada al participante. Las solicitudes llegan por contacto con el investigador y requieren identificar con certeza la sesión antes de eliminarla y gestionar sus exportaciones. `session_id` permanece como identificador interno y control de duplicados. No existe un endpoint público de lectura o borrado. Cerrar la recogida con `COLLECTION_OPEN=false`.

## Actualización a la versión 1.2

Actualizar primero `Code.gs` en el proyecto Apps Script existente y publicar una nueva versión de su implementación conservando la URL `/exec`. El receptor conserva compatibilidad con sesiones 1.0 y 1.1 ya abiertas. Para la versión 1.2 admite cámara consentida, señal suficiente, trayectoria y un estado de mirada `valid` o `invalid` coherente con los resultados de la comprobación. Una precisión insuficiente conserva `invalid`; no debe convertirse en `valid` para aceptar el envío. Después publicar `docs/app.js` y `docs/config.js`, con protocolo EME-INT-1.2.0. El consentimiento permanece en EME-CI-1.1.0 porque se conservan los tipos de datos recogidos. No cambiar las 17 cabeceras de `Sesiones`: `gaze_path` y los tiempos de interrupción siguen dentro de `trials_json`, en la columna Q. No activar el formulario 1.2 antes de actualizar el receptor, pues el receptor anterior rechaza la nueva versión.

## 6. Exportar y analizar

Descargar **solo Sesiones** como CSV a una carpeta privada `data/`. Ejecutar:

```sh
python3 scripts/export_sessions.py data/Sesiones.csv data/ensayos.csv
Rscript scripts/analyze.R data/ensayos.csv data/analisis
```

No subir `data/` a GitHub. `scripts/analyze.R` acepta las versiones 1.0, 1.1 y 1.2, con una sola versión por ejecución. Su modelo analiza comprensión y no establece precisión de las trayectorias. Conservar `gaze_status` y separar la calidad de mirada al analizar coordenadas; las trayectorias `invalid` no deben interpretarse como precisas o fiables. Las reglas de exclusión y modelos están en el protocolo; el script no sustituye su preregistro.

Fuentes técnicas: [Apps Script web apps](https://developers.google.com/apps-script/guides/web), [comunicación cliente-servidor](https://developers.google.com/apps-script/guides/html/communication), [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
