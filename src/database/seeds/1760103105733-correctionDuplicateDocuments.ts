import { Logger } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { NatsService } from 'src/common';
import { NastEnvs } from 'src/config';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';

export class CorrectionDuplicateDocuments1760103105733 implements Seeder {
  track = true;
  private readonly logger = new Logger('CorrectionDuplicateDocuments');

  public async run(dataSource: DataSource): Promise<any> {
    this.logger.log('Ejecutando CorrectionDuplicateDocuments1760103105733');

    const client: ClientProxy = ClientProxyFactory.create({
      transport: Transport.NATS,
      options: {
        servers: NastEnvs.natsServers,
      },
    });

    const nats = new NatsService(client);

    await dataSource.query(`
            UPDATE beneficiaries.affiliate_documents
            SET path = '/' || path
            WHERE path NOT LIKE '/%';
        `);
    this.logger.log(`Se actualizaron los paths de documentos.`);

    await dataSource.query(`
            UPDATE beneficiaries.affiliate_file_dossiers
            SET path = '/' || path
            WHERE path NOT LIKE '/%';
        `);
    this.logger.log(`Se actualizaron los paths de expedientes.`);

    await dataSource.query(`
            UPDATE beneficiaries.person_fingerprints
            SET path = '/' || path
            WHERE path NOT LIKE '/%';
        `);
    this.logger.log(`Se actualizaron los paths de huellas.`);

    const duplicatesQuery = `
            SELECT ad.*
            FROM beneficiaries.affiliate_documents ad
            JOIN beneficiaries.affiliate_documents ad2
            ON ad.affiliate_id = ad2.affiliate_id
            AND ad.procedure_document_id = ad2.procedure_document_id
            AND ad.id > ad2.id
            ORDER BY ad.affiliate_id, ad.procedure_document_id, ad.id;
        `;

    const duplicates = await dataSource.query(duplicatesQuery);

    const idsToDelete = duplicates.map((dup: any) => dup.id);
    const pathsToDelete = duplicates.map((dup: any) => dup.path);

    if (!duplicates.length) {
      this.logger.log('No se encontraron documentos duplicados.');
      return;
    }

    await dataSource.query(`DELETE FROM beneficiaries.affiliate_documents WHERE id = ANY($1)`, [
      idsToDelete,
    ]);

    await nats.firstValue('ftp.removeFile', pathsToDelete);

    this.logger.log(`Se eliminó ${duplicates.length} duplicados:`);
  }
}
//yarn seed:run --name src/database/seeds/1760103105733-correctionDuplicateDocuments.ts
