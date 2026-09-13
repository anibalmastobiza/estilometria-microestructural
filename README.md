# Estilometría microestructural evolutiva

Experimento breve en español sobre puntuación, lectura e interrupciones. Investigador: **Aníbal Astobiza (UGR)**, amastobiza@ugr.es. Destino editorial previsto: Revista de Humanidades Digitales, UNED.

## Qué incluye

- Sitio estático para GitHub Pages en `docs/`, con jsPsych 8.3.0 y WebGazer cargado únicamente después del consentimiento de cámara.
- Diseño 2 × 2, cuatro lecturas por participante, ocho estímulos de control, listas contrabalanceadas y orden aleatorio.
- Información, consentimiento, demografía, cámara opcional, calibración, validación, retirada y explicación final.
- Receptor Google Apps Script con confirmación de escritura, validación de campos y deduplicación.
- Protocolo, corpus abiertos, plan para RHD, extracción textual y análisis R.

**Estado inicial: demostración, sin envío de datos.** La hoja se ha creado; esto no significa que el receptor Apps Script esté desplegado. Consultar `DESPLIEGUE.md` y `research/VERIFICACION.md` para conocer las comprobaciones y acciones pendientes. No hay resultados de participantes.

El límite de participación es 4:50 desde abrir la pantalla de consentimiento. Un equipo lento, lectura detenida de información o calibración incompleta pueden hacer que la sesión termine sin datos. Validar la tasa de finalización antes de reclutar. La confirmación de red posterior puede tardar adicionalmente.

## Uso local

```sh
npm test
python3 -m http.server 8000 --bind 127.0.0.1 --directory docs
```

Abrir http://127.0.0.1:8000. La cámara necesita HTTPS o localhost. Las dependencias se descargan de sus distribuidores; hace falta Internet. No hay npm install ni paso de compilación.

## Investigación

El contraste es una **interacción**: la ventaja de segmentar debería ser mayor con interrupción. El experimento no demuestra por sí solo selección cultural. Los estímulos actuales son textos originales de control con asistencia de IA, no extractos atribuidos a los corpus.

- [Protocolo y análisis](research/PROTOCOLO.md)
- [Corpus y acceso](research/DATASETS.md)
- [Preparación para RHD](research/RHD.md)
- [Despliegue y Google Sheets](DESPLIEGUE.md)
- [Verificaciones](research/VERIFICACION.md)

La mirada se utiliza de forma exploratoria sobre el área del texto; no mide fijaciones sobre comas. Se guardan agregados, no imágenes ni coordenadas crudas. No publicar datos individuales en este repositorio.

## Licencias

Código propio: MIT (`LICENSE`). Estímulos originales de `docs/stimuli.js`: CC0-1.0. Documentación propia: CC BY 4.0. Las bibliotecas externas y los corpus conservan sus licencias; el fork de WebGazer se carga externamente y no se relicencia bajo MIT. Revisar sus condiciones al redistribuir una copia local. Véase `THIRD_PARTY.md`.
