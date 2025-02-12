import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { FtpService } from 'src/common';
import * as readline from 'readline';

export class BeneficiaryImportRequirements implements Seeder {
  track = true;
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
    console.log('Ejecutando BeneficiaryImportRequirements');
    const ftp = new FtpService();
    const path = 'Affiliate/Documents';

    const initialFolder: {
      totalFolder: number;
      readFolder: number;
      validFolder: number;
      dataErrorReadFolder: any;
      filesValidFolder: number;
      filesValid: number;
      dataErrorReadFiles: any;
    } = {
      totalFolder: 0,
      readFolder: 0,
      validFolder: 0,
      dataErrorReadFolder: {},
      filesValidFolder: 0,
      filesValid: 0,
      dataErrorReadFiles: {},
    };

    const dataRead = {};
    const dataValid = {};
    const dataValidReal = {};

    await ftp.connectToFtp();
    const { affiliateIds, nonNumericIds } = (await ftp.listFiles(path)).reduce(
      (result, file) => {
        const isOnlyNumbers = file.name.match(/^\d+$/);
        if (isOnlyNumbers) {
          result.affiliateIds.push(Number(file.name));
        } else {
          result.nonNumericIds.push(file.name);
        }
        return result;
      },
      { affiliateIds: [], nonNumericIds: [] },
    );

    const validAffiliates = await dataSource.query(`
            SELECT id FROM beneficiaries.affiliates WHERE id IN (${affiliateIds.join(',')})
        `);

    initialFolder.totalFolder = affiliateIds.length + nonNumericIds.length;
    initialFolder.readFolder = affiliateIds.length;
    initialFolder.validFolder = validAffiliates.length;
    initialFolder.dataErrorReadFolder = affiliateIds.filter(
      (item) => !new Set(validAffiliates.map((item) => Number(item.id))).has(item),
    );

    for (const affiliateId of validAffiliates) {
      const pathFile = `${path}/${affiliateId.id}`;

      const files = await ftp.listFiles(pathFile);
      const documentsOriginal = files.map((file) => `'${file.name.replace(/"/g, '')}'`);
      const documents = files.map(
        (file) => `'${file.name.replace(/"/g, '').replace(/\.pdf$/i, '')}'`,
      );

      if (documents.length != 0) {
        dataRead[affiliateId.id] = documentsOriginal;
        initialFolder.filesValidFolder += documents.length;

        const validDocuments = await dataSource.query(
          `SELECT id, name, shortened FROM public.procedure_documents WHERE shortened IN(${documents.join(',')}) OR name IN (${documents.join(',')})`,
        );

        initialFolder.filesValid += validDocuments.length;

        dataValid[affiliateId.id] = {};

        validDocuments.forEach((doc) => {
          const docName = doc.name.replace(/\.[^.]+$/, '');
          const shortenedName = doc.shortened;

          dataValid[affiliateId.id][docName] = doc;
          dataValid[affiliateId.id][shortenedName] = doc;
        });
      }
    }
    let totalErrors: number = 0;
    let totalThumbs: number = 0;
    for (const affiliateId in dataRead) {
      dataValidReal[affiliateId] = [];
      const validDocsMap = dataValid[affiliateId];

      dataRead[affiliateId].forEach((doc) => {
        const cleanedDoc = doc.replace(/^'|'$/g, '').replace(/\.[^.]+$/, '');
        const validDoc = validDocsMap[cleanedDoc];

        if (validDoc) {
          dataValidReal[affiliateId].push({
            id: validDoc.id,
            path: doc.replace(/^'|'$/g, ''),
          });
        } else {
          if (
            doc.replace(/^'|'$/g, '') != 'Thumbs.db' &&
            doc.replace(/^'|'$/g, '') != 'desktop.ini'
          ) {
            if (!initialFolder.dataErrorReadFiles[affiliateId]) {
              initialFolder.dataErrorReadFiles[affiliateId] = [];
            }
            initialFolder.dataErrorReadFiles[affiliateId].push(doc.replace(/^'|'$/g, ''));
            totalErrors++;
          } else {
            totalThumbs++;
          }
        }
      });
    }

    initialFolder.filesValidFolder -= totalThumbs;

    await ftp.onDestroy();
    console.log('Lectura de carpetas:');
    console.log('Total Carpetas: ', initialFolder.totalFolder);
    console.log('Carpetas leídas:', initialFolder.readFolder);
    console.log('Carpetas validas:', initialFolder.validFolder);
    console.log('Carpetas con errores:', initialFolder.dataErrorReadFolder);
    console.log('Archivos total de las carpetas validas', initialFolder.filesValidFolder);
    console.log('Archivos validos para subir', initialFolder.filesValid);
    //console.log('Archivos validos:', dataValidReal);
    console.log('Numero de Archivos con errores:', totalErrors);
    console.log('Archivos con errores:', initialFolder.dataErrorReadFiles);
    const answer = await this.promptUser('¿Deseas continuar? (y/n): ');

    if (answer.toLowerCase() !== 'y') {
      console.log('Abortando ejecución del seeder.');
      return;
    }
    let cont: number = 0;
    await dataSource.transaction(async (transactionalEntityManager) => {
      const inserts = [];
      for (const affiliateId in dataValidReal) {
        for (const document of dataValidReal[affiliateId]) {
          inserts.push(
            `(${affiliateId}, ${document.id}, '${path}/${affiliateId}/${document.path}')`,
          );
          cont++;
        }
      }

      if (inserts.length > 0) {
        await transactionalEntityManager.query(
          `INSERT INTO beneficiaries.affiliate_documents (affiliate_id, procedure_document_id, path) VALUES ${inserts.join(',')}`,
        );
      }
      console.log(`Todas las inserciones,${cont} se completaron exitosamente en una transacción.`);
    });
  }
}

//yarn seed:create --name src/database/seeds/import_requirements.ts
//yarn seed:run --name src/database/seeds/1730293751153-import_requirements.ts
