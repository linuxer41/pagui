// Extender el objeto Window para nuestra variable global
interface EmpsaatData {
  deudasAgua: any[];
  deudasServicios: any[];
  totales: {
    totalAgua: number;
    totalServicios: number;
    totalDeuda: number;
  };
}

