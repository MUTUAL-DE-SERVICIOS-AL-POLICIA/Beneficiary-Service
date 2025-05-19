import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationDto, FtpService, NatsService } from 'src/common';
import { Repository } from 'typeorm';
import { Affiliate, AffiliateDocument } from './entities';
import { RpcException } from '@nestjs/microservices';
import { DataSource } from 'typeorm';
import { envsFtp } from 'src/config/envs';

@Injectable()
export class AffiliatesService {
  private readonly logger = new Logger('AffiliateDocumentsService');

  constructor(
    @InjectRepository(Affiliate)
    private readonly affiliateRepository: Repository<Affiliate>,
    @InjectRepository(AffiliateDocument)
    private readonly affiliateDocumentsRepository: Repository<AffiliateDocument>,
    private readonly ftp: FtpService,
    private readonly nats: NatsService,
    private readonly dataSource: DataSource,
  ) {}

  findAll(paginationDto: PaginationDto) {
    const { limit = 10, page = 1 } = paginationDto;
    const offset = (page - 1) * limit;
    return this.affiliateRepository.find({
      take: limit,
      skip: offset,
    });
  }

  async findOne(id: number) {
    const affiliate = await this.affiliateRepository.findOneBy({ id });

    if (!affiliate)
      throw new RpcException({ message: `Affiliate with: ${id} not found`, code: 404 });
    return affiliate;
  }

  async findOneData(id: number): Promise<any> {
    const affiliate = await this.findAndVerifyAffiliateWithRelations(id, [
      'affiliateState',
      'affiliateState.stateType',
    ]);

    const { createdAt, updatedAt, deletedAt, degreeId, unitId, categoryId, ...dataAffiliate } =
      affiliate;

    const [degree, unit, category] = await Promise.all([
      this.nats.firstValueInclude({ id: degreeId }, 'degrees.findOne', ['id', 'name']),
      this.nats.firstValueInclude({ id: unitId }, 'units.findOne', ['id', 'district', 'name']),
      this.nats.firstValueInclude({ id: categoryId }, 'categories.findOne', [
        'id',
        'name',
        'percentage',
      ]),
    ]);

    return {
      ...dataAffiliate,
      degree,
      unit,
      category,
    };
  }

  async createOrUpdateDocument(
    affiliateId: number,
    procedureDocumentId: number,
    documentPdf: Buffer,
  ): Promise<{ status: boolean; message: string }> {
    const [document, affiliate] = await Promise.all([
      this.nats.firstValue('procedureDocuments.findOne', { id: procedureDocumentId }),
      this.findAndVerifyAffiliateWithRelationOneCondition(
        affiliateId,
        'affiliateDocuments',
        'procedureDocumentId',
        procedureDocumentId,
      ),
      this.ftp.connectToFtp(),
    ]);

    const initialPath = `${envsFtp.ftpDocuments}/${affiliateId}/`;

    if (document.status === false)
      throw new RpcException({ message: 'Servicio de documentos no disponible', code: 400 });

    let affiliateDocument: AffiliateDocument;
    let response: string;

    if (affiliate.affiliateDocuments.length === 0) {
      affiliateDocument = new AffiliateDocument();
      affiliateDocument.affiliate = affiliate;
      affiliateDocument.procedureDocumentId = procedureDocumentId;
      response = 'Creado';
    } else {
      affiliateDocument = affiliate.affiliateDocuments[0];
      affiliateDocument.updatedAt = new Date();
      response = 'Actualizado';
    }

    affiliateDocument.path = `${initialPath}${document.shortened ?? document.name}.pdf`;

    await Promise.all([
      this.affiliateDocumentsRepository.save(affiliateDocument),
      this.ftp.uploadFile(documentPdf, initialPath, affiliateDocument.path),
    ]);

    this.ftp.onDestroy();

    return {
      status: document.status,
      message: `${document.name} ${response} exitosamente`,
    };
  }

  async showDocuments(affiliateId: number): Promise<any> {
    const { affiliateDocuments } = await this.findAndVerifyAffiliateWithRelations(affiliateId, [
      'affiliateDocuments',
    ]);

    if (!affiliateDocuments.length) return affiliateDocuments;

    const procedureDocumentIds = affiliateDocuments.map(
      ({ procedureDocumentId }) => procedureDocumentId,
    );

    const documentNames = await this.nats.firstValue('procedureDocuments.findAllByIds', {
      ids: procedureDocumentIds,
    });

    const documentsAffiliate = affiliateDocuments.map(({ procedureDocumentId }) => ({
      procedureDocumentId,
      ...documentNames[procedureDocumentId],
    }));

    return { status: documentNames.status, documentsAffiliate };
  }

  async findDocument(affiliateId: number, procedureDocumentId: number): Promise<Buffer> {
    const relation = 'affiliateDocuments';
    const column = 'procedureDocumentId';
    const data = procedureDocumentId;

    const [affiliate] = await Promise.all([
      this.findAndVerifyAffiliateWithRelationOneCondition(affiliateId, relation, column, data),
      this.ftp.connectToFtp(),
    ]);

    const documents = affiliate.affiliateDocuments;

    if (documents.length === 0)
      throw new RpcException({ message: 'Document not found', code: 404 });

    const firstDocument = documents[0];

    const documentDownload = await this.ftp.downloadFile(firstDocument.path);

    this.ftp.onDestroy();

    return documentDownload;
  }

  async collateDocuments(affiliateId: number, modalityId: number): Promise<any> {
    const [affiliate, modality] = await Promise.all([
      this.findAndVerifyAffiliateWithRelations(affiliateId, ['affiliateDocuments']),
      this.nats.firstValue('modules.findDataRelations', {
        id: modalityId,
        relations: ['procedureRequirements', 'procedureRequirements.procedureDocument'],
        entity: 'procedureModality',
      }),
    ]);

    if (!modality.status) return modality;

    const { affiliateDocuments } = affiliate;
    const { procedureRequirements } = modality;

    if (!procedureRequirements.length) {
      return { status: false, message: 'No hay documentos requeridos' };
    }

    const affiliateDocumentsSet = new Set(affiliateDocuments.map((doc) => doc.procedureDocumentId));
    const requiredDocuments = new Map<number, any[]>();
    const additionallyDocumentsUpload: any[] = [];
    const additionallyDocuments: any[] = [];

    for (const { procedureDocument, id, number } of procedureRequirements) {
      const documentData = {
        procedureRequirementId: id,
        number,
        procedureDocumentId: procedureDocument.id,
        name: procedureDocument.name,
        shortened: procedureDocument.shortened,
        isUploaded: affiliateDocumentsSet.has(procedureDocument.id),
      };

      if (number === 0) {
        (documentData.isUploaded ? additionallyDocumentsUpload : additionallyDocuments).push(
          documentData,
        );
      } else {
        if (!requiredDocuments.has(number)) {
          requiredDocuments.set(number, []);
        }
        requiredDocuments.get(number)?.push(documentData);
      }
    }

    requiredDocuments.forEach((docs, key) => {
      requiredDocuments.set(
        key,
        docs.some((doc) => doc.isUploaded) ? [docs.find((doc) => doc.isUploaded)!] : docs,
      );
    });

    return {
      status: modality.status,
      requiredDocuments: Object.fromEntries(requiredDocuments),
      additionallyDocumentsUpload,
      additionallyDocuments,
    };
  }

  async documentsAnalysis(user: string, pass: string): Promise<any> {
    const path = envsFtp.ftpImportDocumentsPvtbe;
    const key = await this.nats.firstValue('auth.login', { username: user, password: pass });
    const pathFtp = envsFtp.ftpDocuments;

    if (!key.status) {
      throw new RpcException({ message: 'Credenciales incorrectas', code: 401 });
    }

    const initialFolder: {
      totalFolder: number;
      readFolder: number;
      nonNumericIds: any;
      validFolder: number;
      dataErrorReadFolder: any;
      filesValidFolder: number;
      filesValid: number;
      dataErrorReadFiles: any;
      dataValidRealExist: any;
      dataValidRealNotExist: any;
    } = {
      totalFolder: 0,
      readFolder: 0,
      nonNumericIds: {},
      validFolder: 0,
      dataErrorReadFolder: {},
      filesValidFolder: 0,
      filesValid: 0,
      dataErrorReadFiles: {},
      dataValidRealExist: [],
      dataValidRealNotExist: {},
    };

    const dataRead = {};
    const dataValid = {};
    const dataValidReal = [];

    await this.ftp.connectToFtp();
    const { affiliateIds, nonNumericIds } = (await this.ftp.listFiles(path)).reduce(
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

    if (affiliateIds.length === 0) {
      throw new RpcException({ message: 'Ninguna Carpeta es Válida', code: 404 });
    }

    const validAffiliates = await this.dataSource.query(`
      SELECT id FROM beneficiaries.affiliates WHERE id IN (${affiliateIds.join(',')})
    `);

    if (validAffiliates.length === 0) {
      throw new RpcException({ message: 'Ninguna Carpeta es Válida', code: 404 });
    }

    initialFolder.totalFolder = affiliateIds.length + nonNumericIds.length;
    initialFolder.readFolder = affiliateIds.length;
    initialFolder.nonNumericIds = nonNumericIds;
    initialFolder.validFolder = validAffiliates.length;
    initialFolder.dataErrorReadFolder = affiliateIds.filter(
      (item) => !new Set(validAffiliates.map((item) => Number(item.id))).has(item),
    );

    let notExistFiles = true;

    for (const affiliateId of validAffiliates) {
      const pathFile = `${path}/${affiliateId.id}`;

      const files = await this.ftp.listFiles(pathFile);
      const documentsOriginal = files.map((file) => `'${file.name.replace(/"/g, '')}'`);
      const documents = files.map(
        (file) => `'${file.name.replace(/"/g, '').replace(/\.pdf$/i, '')}'`,
      );
      if (documents.length != 0) {
        dataRead[affiliateId.id] = documentsOriginal;
        initialFolder.filesValidFolder += documents.length;

        const validDocuments = await this.dataSource.query(
          `SELECT id, shortened FROM public.procedure_documents WHERE shortened IN(${documents.join(',')})`,
        );

        if (validDocuments.length !== 0) {
          notExistFiles = false;
        }

        initialFolder.filesValid += validDocuments.length;

        dataValid[affiliateId.id] = {};
        validDocuments.forEach((doc) => {
          const shortened = doc.shortened;
          dataValid[affiliateId.id][shortened] = doc;
        });
      }
    }

    if (notExistFiles) {
      throw new RpcException({ message: 'No existen Archivos en las Carpetas', code: 404 });
    }

    await this.ftp.onDestroy();

    let totalThumbs: number = 0;

    for (const affiliateId in dataRead) {
      const validDocsMap = dataValid[affiliateId];
      dataRead[affiliateId].forEach((doc) => {
        const cleanedDoc = doc.replace(/^'|'$/g, '').replace(/\.[^.]+$/, '');
        const validDoc = validDocsMap[cleanedDoc];

        if (validDoc) {
          const short = `${doc.replace(/^'|'$/g, '')}`;
          dataValidReal.push({
            affiliate_id: affiliateId,
            procedure_document_id: validDoc.id,
            shortened: short,
            oldPath: `${path}/${affiliateId}/${short}`,
            newPath: `${pathFtp}/${affiliateId}/${short}`,
          });
        } else {
          if (
            doc.replace(/^'|'$/g, '') !== 'Thumbs.db' &&
            doc.replace(/^'|'$/g, '') !== 'desktop.ini'
          ) {
            if (!initialFolder.dataErrorReadFiles[affiliateId]) {
              initialFolder.dataErrorReadFiles[affiliateId] = [];
            }
            initialFolder.dataErrorReadFiles[affiliateId].push(doc.replace(/^'|'$/g, ''));
          } else {
            totalThumbs++;
          }
        }
      });
    }

    initialFolder.filesValidFolder -= totalThumbs;

    const values = dataValidReal
      .map((doc) => `(${doc.affiliate_id}, ${doc.procedure_document_id})`)
      .join(', ');

    const dataExist = await this.dataSource.query(`
      SELECT affiliate_id, procedure_document_id, path
      FROM beneficiaries.affiliate_documents
      WHERE (affiliate_id, procedure_document_id) IN (${values});
    `);

    const existingSet = new Set(
      dataExist.map(
        ({ affiliate_id, procedure_document_id }) => `${affiliate_id}-${procedure_document_id}`,
      ),
    );

    const [dataNotExist, dataYesExist] = dataValidReal.reduce(
      ([notExist, yesExist], doc) => {
        const key = `${doc.affiliate_id}-${doc.procedure_document_id}`;
        return existingSet.has(key)
          ? [notExist, [...yesExist, doc]]
          : [[...notExist, doc], yesExist];
      },
      [[], []] as [
        { affiliate_id: string; procedure_document_id: string }[],
        { affiliate_id: string; procedure_document_id: string }[],
      ],
    );

    initialFolder.dataValidRealExist = dataYesExist;
    initialFolder.dataValidRealNotExist = dataNotExist;

    return initialFolder;
  }

  async documentsImports(data: any): Promise<any> {
    await this.ftp.connectToFtp();
    const Archivos_validos_reales_Existentes = data.dataValidRealExist;
    const Archivos_validos_reales_No_Existentes = data.dataValidRealNotExist;

    let contNewFiles = 0;
    let contExistFiles = 0;

    await this.dataSource.transaction(async (transactionalEntityManager) => {
      const insertsNew: string[] = [];
      try {
        for (const file of Archivos_validos_reales_No_Existentes) {
          await this.ftp.renameFile(file.oldPath, file.newPath);
          insertsNew.push(
            `(${file.affiliate_id}, ${file.procedure_document_id}, '${file.newPath}')`,
          );
          contNewFiles++;
        }

        if (insertsNew.length > 0) {
          const queryNew = `
            INSERT INTO beneficiaries.affiliate_documents (affiliate_id, procedure_document_id, path)
            VALUES ${insertsNew.join(',')}`;
          await transactionalEntityManager.query(queryNew);
        }

        for (const file of Archivos_validos_reales_Existentes) {
          await this.ftp.renameFile(file.oldPath, file.newPath);

          const queryExist = `
            UPDATE beneficiaries.affiliate_documents
            SET updated_at = NOW(), path = '${file.newPath}'
            WHERE affiliate_id = ${file.affiliate_id} AND procedure_document_id = ${file.procedure_document_id}`;
          await transactionalEntityManager.query(queryExist);

          contExistFiles++;
        }
      } catch (error) {
        throw new RpcException({ message: 'Ya se realizo la importación', code: 404 });
      }

      this.logger.log(`Archivos nuevos procesados: ${contNewFiles}`);
      this.logger.log(`Archivos existentes actualizados: ${contExistFiles}`);
    });

    await this.ftp.onDestroy();

    return {
      totalFolder: data.totalFolder,
      newFiles: contNewFiles,
      updateFIles: contExistFiles,
      totalFiles: contNewFiles + contExistFiles,
    };
  }

  private async findAndVerifyAffiliateWithRelations(
    id: number,
    relations: string[] = [],
  ): Promise<Affiliate | null> {
    const affiliate = await this.affiliateRepository.findOne({
      where: { id },
      relations: relations.length > 0 ? relations : [],
    });
    if (!affiliate) {
      throw new RpcException({ message: `Affiliate with ID: ${id} not found`, code: 404 });
    }
    return affiliate;
  }

  private async findAndVerifyAffiliateWithRelationOneCondition(
    id: number,
    relation: string,
    column: string,
    data: any,
  ): Promise<Affiliate | null> {
    const affiliate = await this.affiliateRepository
      .createQueryBuilder('affiliate')
      .leftJoinAndSelect(`affiliate.${relation}`, 'relation', `relation.${column} = :data`, {
        data,
      })
      .where('affiliate.id = :id', { id })
      .getOne();

    if (!affiliate) {
      throw new RpcException({ message: `Affiliate with ID: ${id} not found`, code: 404 });
    }
    return affiliate;
  }
}
