import { Logger } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import * as readline from 'readline';
import { NatsService } from 'src/common';
import { NastEnvs } from 'src/config';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';

export class ImportPhotosPersons1793295187024 implements Seeder {
    private readonly logger = new Logger('BeneficiaryImportPhotos');
    track = false;
    async promptUser(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
        });
    });
    }

    public async run(dataSource: DataSource): Promise<any> {
    this.logger.log('Ejecutando BeneficiaryImportPhotos');
    const client: ClientProxy = ClientProxyFactory.create({
        transport: Transport.NATS,
        options: {
        servers: NastEnvs.natsServers,
        },
    });
    const nats = new NatsService(client);

    const path = "/Person/Photos";

    const initialFolder: {
        totalReadFolder: number;
        validReadFolder: number;
        totalErrorReadFolder: number;
        dataErrorReadFolder: any;
    } = {
        totalReadFolder: 0,
        validReadFolder: 0,
        totalErrorReadFolder: 0,
        dataErrorReadFolder: []
    };

    await nats.firstValue('ftp.connectSwitch', { value: 'true' });
    const filesCore = await nats.firstValue('ftp.listFiles', { path: path });
    const personIdentityCards = filesCore.data.map(file => {
        return file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    });

    const validPhotos = await dataSource.query(
        `SELECT id,identity_card
        FROM beneficiaries.persons
        WHERE identity_card = ANY($1)`,
        [personIdentityCards],
    );

    const validSet = new Set(validPhotos.map(item => String(item.identity_card)));

    initialFolder.totalReadFolder = personIdentityCards.length;
    initialFolder.validReadFolder = validPhotos.length;
    initialFolder.totalErrorReadFolder = personIdentityCards.length - validPhotos.length;

    initialFolder.dataErrorReadFolder = personIdentityCards.filter(
        (item) => !validSet.has(String(item))
    );

    await nats.firstValue('ftp.connectSwitch', { value: 'false' });

    this.logger.log('Lectura de photos:');
    this.logger.log(`Total fotos: ${initialFolder.totalReadFolder}`);
    this.logger.log(`Total fotos validos: ${initialFolder.validReadFolder}`);
    this.logger.log(`Total archivos con errores: ${initialFolder.totalErrorReadFolder}`);
    this.logger.log(`Fotos con errores: ${initialFolder.dataErrorReadFolder}`);
    // //this.logger.log('Archivos validos:', dataValidReal);
    const answer = await this.promptUser(`¿Deseas continuar con la importación de ${initialFolder.validReadFolder} fotos validos? (y/n): `);

    if (answer.toLowerCase() !== 'y') {
        this.logger.log('Abortando ejecución del seeder.');
        return;
    }

    let cont: number = 0;
    await dataSource.transaction(async (transactionalEntityManager) => {
        const inserts = [];
        for (const { id, identity_card } of validPhotos) {
            inserts.push(
            `(${id}, '${path}/${identity_card}.jpg')`,
            );
            cont++;
        }

        if (inserts.length > 0) {
            await transactionalEntityManager.query(
                `INSERT INTO beneficiaries.person_photos (person_id, path) VALUES ${inserts.join(',')}`,
            );
        }
        this.logger.log(
        `Todas las inserciones,${cont} se completaron exitosamente en una transacción.`,
        );
    });
    }
}
// pnpm seed:run --name src/database/seeds/1793295187024-importPhotosPersons.ts
