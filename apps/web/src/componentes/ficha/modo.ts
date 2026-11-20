// Quién está mirando la ficha. «equipo» es Proges (ve todo, incluidos costos de maestros y márgenes);
// «dueno» es el dueño de la propiedad (etapa 3): la API ya le recorta lo que no debe ver, y los
// componentes además no dibujan lo que no llega ni muestran botones de edición interna.
export type ModoFicha = "equipo" | "dueno";
