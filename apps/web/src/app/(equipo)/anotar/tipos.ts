// Un servicio que se puede elegir para guardar la nota. La página lo arma en el servidor y el
// formulario (en el navegador) lo muestra y lo filtra al buscar.
export type OpcionDeServicio = {
  id: string;
  /** La dirección de la propiedad: lo primero que se lee. */
  titulo: string;
  /** El servicio, la comuna y el cliente. */
  detalle: string;
  /** true: es donde la persona tiene tareas hoy (la API lo propuso). */
  sugerido: boolean;
};
