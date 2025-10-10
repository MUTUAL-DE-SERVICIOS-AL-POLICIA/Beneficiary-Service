import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { ClientProxyFactory, Transport, ClientProxy } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { NatsService } from 'src/common';
import { NastEnvs } from 'src/config';

export class BeneficiaryImportFingerprints implements Seeder {
  track = true;
  private readonly logger = new Logger('BeneficiaryImportFingerprints');

  private separarNombreYNumero(filename: string): { name: string; quality: number | null } {
    const match = filename.match(/^(.*)_(\d+)\.wsq$/);
    //    ^(.*) → Captura cualquier texto al inicio.
    //    _(\d+) → Captura el número después del guion bajo.
    //    \.wsq$ → Se asegura de que termine en .wsq.
    if (match) {
      return { name: match[1], quality: parseInt(match[2], 10) };
    }
    return { name: filename, quality: null };
  }

  private changeFingerprintType(name: string) {
    switch (name) {
      case 'r_thumb':
        return 1;
      case 'r_index':
        return 2;
      case 'l_thumb':
        return 3;
      case 'l_index':
        return 4;
      default:
        break;
    }
  }

  public async run(dataSource: DataSource): Promise<any> {
    const path = 'Person/Fingerprints';

    const client: ClientProxy = ClientProxyFactory.create({
      transport: Transport.NATS,
      options: {
        servers: NastEnvs.natsServers,
      },
    });
    const nats = new NatsService(client);

    await nats.firstValue('ftp.connectSwitch', { value: 'true' });
    const { data } = await nats.firstValue('ftp.listFiles', { path });
    const { personIds } = data.reduce(
      (result, file) => {
        const isOnlyNumbers = file.name.match(/^\d+$/);
        if (isOnlyNumbers) {
          result.personIds.push(Number(file.name));
        }
        return result;
      },
      { personIds: [] },
    );

    const validAffiliates = await dataSource.query(`
            SELECT id FROM beneficiaries.persons WHERE id IN (${personIds.join(',')})
        `);

    let cont: number = 0;
    await dataSource.transaction(async (transactionalEntityManager) => {
      const inserts = [];
      for (const personId of validAffiliates) {
        const pathFile = `${path}/${personId.id}`;

        const filesCore = await nats.firstValue('ftp.listFiles', { path: pathFile });
        const files = await filesCore.data;
        files.forEach(async (file) => {
          const res = this.separarNombreYNumero(file.name);
          const body = {
            quality: res.quality,
            path: `${pathFile}/${file.name}`,
            person_id: personId.id,
            fingerprint_type_id: this.changeFingerprintType(res.name),
          };
          inserts.push(
            `(${body.quality}, '${body.path}', ${body.person_id}, ${body.fingerprint_type_id})`,
          );
          cont++;
        });
      }
      await transactionalEntityManager.query(
        `INSERT INTO beneficiaries.person_fingerprints (quality, path, person_id, fingerprint_type_id) VALUES ${inserts.join(',')}`,
      );
      this.logger.log(cont + ' huellas registradas en base de datos');
    });
    await nats.firstValue('ftp.connectSwitch', { value: 'false' });
  }
}

//yarn seed:run --name src/database/seeds/1739939765121-import_fingerprints.ts
