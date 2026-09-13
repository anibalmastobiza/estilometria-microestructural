# Corpus abiertos en español

Fuentes consultadas el 13-09-2026. Acceso a repositorios sin registro. Las cifras siguientes proceden de sus README y no son un recuento local completo.

| Corpus | Disponible públicamente | Formato y derechos | Uso propuesto |
|---|---|---|---|
| [ELTeC-spa](https://github.com/COST-ELTeC/ELTeC-spa) | El README de v0.9.1 declara 84 novelas; el repositorio paraguas declara 83. Fijar versión y contar antes de publicar. | TEI; textos de dominio público, marcado CC BY 4.0. [Versión archivada](https://doi.org/10.5281/zenodo.4662603). | Comparación histórica con una colección diseñada para análisis literario. |
| [conha19](https://github.com/cligs/conha19) | 234 textos públicos, de 256 novelas del corpus completo; Argentina, Cuba y México, 1830–1910. | TXT/TEI; Public Domain Mark para textos y marcado. Seleccionar `metadata_free.csv`, `tei/` o `txt/`. | Replicación geográfica y contraste entre géneros y autores. |
| [CoNSSA](https://github.com/cligs/conssa) | 217 novelas públicas de 358; España, 1880–1939. | Textos de dominio público; marcado/metadatos CC BY 4.0. Revisar la estructura de `master/` y los archivos disponibles. | Edad de Plata, trayectorias de autores y subgéneros. |

No utilizar las cifras del corpus completo como N descargado. Verificar la edición y los derechos aplicables a cada texto. No sumar los corpus sin deduplicar.

## Descarga reproducible

```sh
git clone --depth 1 https://github.com/COST-ELTeC/ELTeC-spa.git data/ELTeC-spa
git -C data/ELTeC-spa rev-parse HEAD
python3 scripts/extract_microstructure.py data/ELTeC-spa/level1 data/rasgos-eltec.csv
```

Registrar el SHA devuelto; comprobar la carpeta de TEI antes de ejecutar si cambia el repositorio. El extractor añade SHA-256 de cada archivo. Los otros corpus se pueden clonar desde sus URLs equivalentes, seleccionando una sola representación por obra, no todas las versiones derivadas.

## Sesgos y decisión filológica

La puntuación puede proceder de una edición posterior, del corrector o del OCR. Conservar lecturas originales de TEI cuando existen; revisar manualmente `choice`, notas y marcas de diálogo. El extractor es heurístico: cuenta caracteres y no identifica automáticamente qué puntos cierran oraciones. Mantiene elipsis Unicode y tripletes ASCII distinguibles. Los mapas de distancias deben controlar idioma, autor, género, edición y longitud.

Para convertir fragmentos en estímulos, documentar archivo y pasaje exactos, licencia, cambios y valoración de naturalidad. Los ocho textos del experimento actual son controles originales, no textos extraídos de estos datasets.

## Referencias de las colecciones

- Navarro Colorado, Borja (ed.). ELTeC-spa, v0.9.1. https://doi.org/10.5281/zenodo.4662603
- Henny-Krahmer, Ulrike (ed.). (2021). Corpus de novelas hispanoamericanas del siglo XIX, v1.0.1. https://doi.org/10.5281/zenodo.4766987
- Calvo Tello, José. (2021). Corpus of Novels of the Spanish Silver Age. https://github.com/cligs/conssa

Completar y cotejar los metadatos bibliográficos al fijar las versiones para el manuscrito.
