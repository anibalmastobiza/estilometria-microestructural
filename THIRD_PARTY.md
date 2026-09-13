# Dependencias y fuentes

- jsPsych 8.3.0, distribución unpkg. Proyecto y documentación: https://www.jspsych.org/ . Licencia MIT del proyecto, consultar distribución fijada.
- WebGazer, fork de jsPsych fijado al tag jspsych@7.0.0, cargado desde jsDelivr según la documentación de jsPsych. Fuente: https://github.com/jspsych/jsPsych/blob/main/docs/overview/eye-tracking.md . No se utiliza `latest`. Condiciones de WebGazer y dependencias: https://github.com/brownhci/WebGazer . No confundir la licencia de jsPsych con la de WebGazer; comprobar GPL y componentes al redistribuir.
- APIs nativas de Google Apps Script y Google Sheets: https://developers.google.com/apps-script/guides/html/communication
- brms para el análisis: https://paulbuerkner.com/brms/ . El script de análisis no instala ni fija una versión automáticamente; archivar `sessionInfo()` al ejecutar y crear un entorno reproducible para la versión final.
- Textos de corpus y marcado: véase `research/DATASETS.md`; se conservan sus condiciones y atribuciones.

El código original de este repositorio está separado de las bibliotecas remotas. Para una liberación reproducible definitiva conviene archivar las distribuciones exactas, sus licencias y hashes, además del commit de este repositorio.
