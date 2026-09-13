# EME-INT: microestructura textual y lectura interrumpida

Versión 1.0.0 · 13 de septiembre de 2026. Investigador: Aníbal Astobiza, UGR, amastobiza@ugr.es. Documento de diseño, no preregistro ya depositado, aprobación ética ni resultados.

## 1. Pregunta y alcance de la hipótesis

Hipótesis del programa: ciertos entornos de recepción favorecen culturalmente microestructuras que abaratan la reanudación de la lectura. Mecanismo candidato: cierres oracionales más frecuentes proporcionan unidades de procesamiento y recuperación más pequeñas.

Este experimento identifica una consecuencia funcional: ¿una mayor segmentación reduce el coste de una interrupción en comprensión? No identifica por sí solo selección cultural, cambios históricos de atención, adopción editorial ni transmisión. La inferencia evolutiva requiere además documentar difusión y persistencia de las variantes en entornos definidos independientemente.

Predicción principal en probabilidades:

    Δ = [P(acierto | segmentado, interrumpido) − P(acierto | integrado, interrumpido)]
        − [P(acierto | segmentado, continuo) − P(acierto | integrado, continuo)] > 0

Rivales: (R1) beneficio general de segmentación, sin interacción; (R2) interrupción perjudica igualmente a ambas versiones; (R3) segmentar perjudica la integración semántica y Δ ≤ 0. Un efecto principal no establece H1. Una interacción en log-odds tampoco equivale automáticamente a una interacción en probabilidades: informar ambas.

## 2. Diseño implementado

Factorial 2 × 2 intraindividual: puntuación segmentada (cinco oraciones) o integrada (cinco cláusulas separadas por punto y coma), lectura continua o interrumpida. Se conservan las palabras y su orden; cambian signos y mayúsculas de comienzo. Misma tipografía, párrafo único, anchura y presentación. Es una manipulación de cierre oracional, no de subordinación ni longitud léxica.

Ocho textos originales de control, asistidos por IA, en dos bancos de cuatro. No son fragmentos de ELTeC, conha19 o CoNSSA. Cada participante ve un banco, cuatro ítems diferentes y una observación por condición. Cuatro listas rotan cada ítem por las cuatro condiciones; banco y lista se sortean con probabilidad uniforme. Orden aleatorio y respuestas barajadas. La asignación es equilibrada en expectativa, no mediante cupos de servidor. Se conservan banco, lista, ítem, orden y elección original para reproducir cada asignación.

La decisión punto y coma/punto es deliberada: evita introducir uniones de cláusulas por coma que resulten agramaticales. Su contrapartida es una variante integrada posiblemente poco natural; se debe evaluar en pretest. La versión actual solo permite generalizar a estos ocho materiales y a esta manipulación.

## 3. Procedimiento y tiempo

1. Información, consentimiento afirmativo y cámara opcional.
2. Edad y dominio del español obligatorios; género, educación y frecuencia de lectura opcionales. No se pregunta nombre, correo, fecha exacta de nacimiento, salud ni localización.
3. Si hay cámara: permiso, ajuste, nueve puntos con dos clics cada uno y cinco puntos nuevos de validación sin clic. No se usa la validación para entrenar.
4. Cuatro lecturas, cada una hasta 22 s de exposición activa. En dos se oculta el texto a los 7 s durante 4 s con clasificación par/impar. La interrupción termina a tiempo fijo aunque se haya respondido. Se registran sus tiempos reales.
5. Pregunta de tres alternativas, hasta 9 s, sin volver al texto. El botón de terminar lectura se habilita tras 8,5 s activos en ambas condiciones.
6. Explicación final, código de retirada y confirmación de envío.

Los ensayos consumen como máximo 132 s nominales. La página termina sin envío a los 290 s desde su apertura si aún no se ha confirmado el envío. Si no quedan 160 s al entrar a instrucciones o comenzar, finaliza sin iniciar una sesión inviable. Esto cumple un límite de participación a costa de poder descartar sesiones lentas; medir ese sesgo en el piloto. La red puede prolongar la confirmación posterior al último clic, y una pestaña suspendida no garantiza temporizadores de tiempo real.

Objetivo de pilotaje: 40–55 s información/demografía, 45–60 s cámara, 80–132 s tarea y 10 s cierre. Son previsiones, no tiempos empíricos. No presionar para que se omita la lectura del consentimiento. Si demasiadas personas no terminan, reducir textos/tiempos tras el pretest y versionar el protocolo; no anunciar una mediana aún desconocida.

## 4. Resultados y calidad

Primario: acierto dentro de los 9 s de respuesta. En el análisis primario, omisión = no acierto; el registro crudo conserva `correct=null`. Sensibilidad: analizar solo respuestas emitidas y modelar por separado la tasa de omisión.

Secundarios: tiempo de respuesta, tiempo activo de lectura y tasa de agotamiento del tiempo. Los tiempos de lectura tienen techo de 22 s y suelo de 8,5 s: no tratarlos como observaciones libres ni asumir que mayor rapidez equivale a mayor comprensión. Analizar censura o restringir interpretaciones a medidas descriptivas.

Exploratorio con WebGazer: retorno al área completa del texto tras interrupción. Se define como latencia hasta la tercera muestra consecutiva dentro de esa área, con muestreo retenido como máximo cercano a 10 Hz. No se denomina fijación, ni regresión ocular sobre palabras, ni tiempo de lectura de una coma. Se guardan conteos y AOI, no coordenadas crudas.

Validación operativa: los cinco puntos deben tener al menos cinco muestras y ≥50 % a ≤150 px del objetivo. Son criterios de este piloto, no estándares universales. Guardar error medio, porcentaje, n y tasa. Analizar también sensibilidad a umbrales alternativos fijados antes del análisis. Calibración fallida no elimina conducta. Sin retorno detectado es dato ausente/censurado, no cero. No hay validación final: es una limitación del formato breve.

Exclusiones primarias propuestas: sesión incompleta/no consentida, protocolo distinto, repetición del mismo ID, cambio de pestaña o tamaño durante la tarea. Registrar el flujo y repetir análisis sin excluir las dos últimas categorías. No excluir por errores de comprensión ni de paridad en el análisis principal. La aplicación no transmite sesiones retiradas o agotadas: sus tasas de abandono deberán estimarse en un piloto supervisado, sin inferirlas de la hoja de completados.

## 5. Plan estadístico y tamaño muestral

Piloto propuesto: 32–48 personas para usabilidad, duración, naturalidad y distribución de aciertos. No es un cálculo de potencia. Identificar efectos techo, suelo, calidad de mirada y desbalance de listas antes de congelar el estudio.

Modelo confirmatorio candidato: regresión logística jerárquica de acierto con segmentación, interrupción e interacción, orden y efectos de participante/ítem. Con solo ocho ítems, la varianza entre textos y las pendientes aleatorias se estiman débilmente; para un artículo sustantivo, ampliar el banco entre participantes manteniendo cuatro lecturas por persona. La ampliación requiere actualizar materiales, validación del servidor y versión.

Se entrega un script R/brms que estima la interacción en probabilidades mediante predicciones marginales, intervalos creíbles y P(Δ>0). Criterio sugerido de interés práctico: Δ de cinco puntos porcentuales, a justificar antes de preregistrar. No identificar esta probabilidad posterior con un factor de Bayes ni tomar una ausencia de significación como equivalencia.

Planificar N mediante simulación después del pretest, variando acierto basal, interacción, heterogeneidad de personas/ítems y pérdidas de cámara. No elegir N por significación intermedia. El piloto no se mezcla con la confirmación si cambian textos, tiempos o reglas. Registrar las decisiones y congelar el commit antes del reclutamiento principal.

## 6. Fase de corpus abierta

ELTeC-spa, conha19 y el subconjunto público de CoNSSA son materiales descargables, con marcado TEI y metadatos. Véase `DATASETS.md`. `extract_microstructure.py` conserva signos y extrae cuerpo TEI, tasas por 1.000 palabras, distancias y entropía. Requiere inspección filológica, no establece por sí solo segmentación sintáctica.

Muestrear por autor, fecha, género y edición. Distinguir fecha de composición, primera publicación y edición digitalizada. Deduplicar obras/ediciones entre corpus, conservar commit y hash, auditar OCR sobre imágenes fuente y revisar expansiones TEI. Los puntos de abreviaturas y las elipsis ASCII no son cierres oracionales. No usar versiones sin stopwords ni archivos lematizados para medir puntuación histórica.

Estos corpus históricos no contrastan directamente la lectura en teléfonos. Para el componente evolutivo, reconstruir publicaciones por entregas, condiciones de recepción documentadas y reediciones, y contrastar cambios dentro de obra/autor/editorial; no asignar «lectura interrumpida» a toda una década. La semejanza de estilo o una tendencia temporal aislada no prueba selección por atención.

Una fase de validación externa puede sustituir los estímulos de control por fragmentos con procedencia exacta y variantes manuales. Conservar texto fuente, versión manipulada, metadatos, licencia y valoración de naturalidad. La versión actual no presenta textos generados como patrimonio literario.

## 7. Datos, consentimiento y límites institucionales

Hoja privada de recogida. Sin imágenes, vídeo, audio ni coordenadas de mirada individuales. El código de sesión es seudónimo: no prometer anonimato absoluto. Cámara opcional y permiso separado; la app no solicita micrófono. No se activa WebGazer antes de aceptar.

Conservación acordada: 12 meses. El backend incluye purga por fecha y creación de un disparador diario; ambos requieren instalación por el titular. La eliminación de filas no garantiza purga inmediata del historial/versiones del proveedor. Gestionar también exportaciones, copias y políticas del servicio.

El consentimiento es un borrador personalizado, no una validación jurídica ni una aprobación del comité. Antes del reclutamiento real debe confirmarse con UGR quién es el responsable del tratamiento, la información institucional aplicable y la idoneidad de la cuenta de Google conectada. No se ha inventado un número de aprobación ética. Recursos oficiales: https://www.ugr.es/info/perfiles/personal/proteccion-datos-pdi y https://secretariageneral.ugr.es/areas-gestion/normativa-resoluciones-rector/instrucciones/recomendaciones-tratamiento-datos-investigacion

## 8. Reproducibilidad

Archivar versión del código y estímulos; fijar dependencias externas; conservar navegador/condiciones de prueba sin huellas digitales innecesarias. Publicar protocolo, scripts, diccionario y resultados agregados. Datos individuales y hoja privada no van en GitHub. Para evaluación anónima usar una copia de materiales sin nombres/correos ni enlaces que revelen autoría; el repositorio público actual sí identifica al investigador.
