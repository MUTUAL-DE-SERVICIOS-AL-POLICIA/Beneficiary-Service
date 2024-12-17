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
        short_name: 'r_thumb',
      },
      {
        name: 'Índice Derecho',
        short_name: 'r_index',
      },
      {
        name: 'Pulgar Izquierdo',
        short_name: 'l_thumb',
      },
      {
        name: 'Índice Izquierdo',
        short_name: 'l_index',
      },
    ]);
  }
}

//yarn seed:run --name src/database/seeds/1729535116092-create_fingerprints_types.ts
