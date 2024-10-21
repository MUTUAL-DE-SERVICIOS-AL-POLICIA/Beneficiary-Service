import { FingerprintType } from 'src/persons/entities';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';

export class CreateFingerprintsTypes implements Seeder {
  track = true;

  public async run(dataSource: DataSource): Promise<any> {
    const repository = dataSource.getRepository(FingerprintType);
    await repository.insert([
      {
        name: 'Pulgar Derecho',
      },
      {
        name: 'Índice Derecho',
      },
      {
        name: 'Pulgar Izquierdo',
      },
      {
        name: 'Índice Izquierdo',
      },
    ]);
  }
}
