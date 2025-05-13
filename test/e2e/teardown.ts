// test/e2e/teardown.ts

import dataSource from '../data-source-test';

const teardown = async () => {
  console.log('Cerrando la conexión a la base de datos de prueba...');

  await dataSource.destroy(); // Asegúrate de destruir la conexión cuando terminen las pruebas

  console.log('Conexión cerrada correctamente');
};

export default teardown;
