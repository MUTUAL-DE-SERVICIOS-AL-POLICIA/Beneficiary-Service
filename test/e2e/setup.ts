// test/e2e/setup.ts
import dataSource from '../data-source-test';

const setup = async () => {
  console.log('Iniciando la conexión a la base de datos de prueba...');

  // Inicializa el dataSource con las variables de entorno
  await dataSource.initialize();

  console.log('Base de datos de prueba conectada correctamente');
};

export default setup;
