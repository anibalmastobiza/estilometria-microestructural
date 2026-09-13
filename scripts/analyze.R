# Rscript scripts/analyze.R data/ensayos.csv data/analisis
# Requiere R y brms con backend Stan. No ejecutado sin datos humanos.
suppressPackageStartupMessages(library(brms))
args <- commandArgs(trailingOnly=TRUE)
stopifnot(length(args)==2)
d <- read.csv(args[1], na.strings=c('', 'null', 'None'), stringsAsFactors=FALSE)
stopifnot(nrow(d)>0, all(d$protocol_version=='EME-INT-1.0.0'))
out <- args[2];dir.create(out,recursive=TRUE,showWarnings=FALSE)
# Reglas propuestas: congelar antes de la recogida confirmatoria.
d <- d[d$hidden==0 & d$resize==0, ]
stopifnot(nrow(d)>0)
d$success <- ifelse(is.na(d$correct),0,d$correct)
d$S <- d$segmented-.5;d$I <- d$interrupted-.5
d$order_c <- d$order-1.5
d$session_id <- factor(d$session_id);d$item_id <- factor(d$item_id)
priors <- c(prior(normal(0, .5),class='b'),prior(normal(1,1),class='Intercept'),prior(exponential(1),class='sd'))
fit <- brm(success ~ S*I + order_c + (1|session_id)+(1|item_id),data=d,
 family=bernoulli(),prior=priors,chains=4,cores=4,iter=4000,warmup=2000,
 seed=20260913,control=list(adapt_delta=.95),file=file.path(out,'modelo'))
capture.output(summary(fit),file=file.path(out,'resumen.txt'))
# Promedio entre los ítems observados, con interceptos de ítem; participante típico.
# Esto no integra toda la heterogeneidad de nuevos participantes.
base <- expand.grid(S=c(-.5,.5),I=c(-.5,.5),item_id=levels(d$item_id))
base$order_c <- 0;base$session_id <- levels(d$session_id)[1]
p <- posterior_epred(fit,newdata=base,re_formula=~(1|item_id))
cell <- function(s,i)rowMeans(p[,base$S==s & base$I==i,drop=FALSE])
delta <- (cell(.5,.5)-cell(-.5,.5))-(cell(.5,-.5)-cell(-.5,-.5))
result <- data.frame(median=median(delta),lower=quantile(delta,.025),upper=quantile(delta,.975),p_positive=mean(delta>0),p_above_5pp=mean(delta>.05))
write.csv(result,file.path(out,'interaccion_probabilidades.csv'),row.names=FALSE)
pdf(file.path(out,'comprobacion_predictiva.pdf'));print(pp_check(fit));dev.off()
capture.output(sessionInfo(),file=file.path(out,'sessionInfo.txt'))
message('Revisar R-hat, ESS, divergencias y predicción posterior antes de interpretar. No es un factor de Bayes.')
