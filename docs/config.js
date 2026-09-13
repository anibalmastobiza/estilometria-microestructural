export const CONFIG = Object.freeze({
  mode: 'demo', // Cambiar a 'live' solo tras desplegar y probar el receptor.
  endpoint: 'https://script.google.com/macros/s/AKfycbybu7e0vvartUyZIybQs3lVGOsOc5PXJZHaeeM0FbwA7u3lEvfSl-6F7foLKLW6i6F_7A/exec', // URL /exec de la aplicación web de Google Apps Script.
  researcher: 'Aníbal Astobiza',
  institution: 'Universidad de Granada (UGR)',
  email: 'amastobiza@ugr.es',
  retentionMonths: 12,
  protocol: 'EME-INT-1.0.0',
  consent: 'EME-CI-1.0.0',
  totalBudgetMs: 290000,
  taskBudgetMs: 150000,
  readingMs: 22000,
  interruptAtMs: 7000,
  interruptionMs: 4000,
  answerMs: 9000,
  webgazerURL: 'https://cdn.jsdelivr.net/gh/jspsych/jspsych@jspsych@7.0.0/examples/js/webgazer/webgazer.js',
});
