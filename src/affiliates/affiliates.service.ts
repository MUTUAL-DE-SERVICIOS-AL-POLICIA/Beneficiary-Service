import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationDto, NatsService } from 'src/common';
import { Repository } from 'typeorm';
import { Affiliate, AffiliateDocument, AffiliateFileDossier } from './entities';
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
    @InjectRepository(AffiliateFileDossier)
    private readonly affiliateFileDossierRepository: Repository<AffiliateFileDossier>,
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

  async createOrUpdateDocument(affiliateId: number, procedureDocumentId: number): Promise<any> {
    const [document, affiliate] = await Promise.all([
      this.nats.firstValue('procedureDocuments.findOne', { id: procedureDocumentId }),
      this.findAndVerifyAffiliateWithRelationOneCondition(
        affiliateId,
        'affiliateDocuments',
        'procedureDocumentId',
        procedureDocumentId,
      ),
    ]);

    const initialPath = `${envsFtp.ftpDocuments}/${affiliateId}/`;

    if (document.serviceStatus === false) {
      return {
        serviceStatus: document.serviceStatus,
        message: document.message || 'Servicio de documentos no disponible',
      };
    }

    let affiliateDocument: AffiliateDocument;
    let response: string;

    if (affiliate.affiliateDocuments.length === 0) {
      affiliateDocument = new AffiliateDocument();
      affiliateDocument.affiliate = affiliate;
      affiliateDocument.procedureDocumentId = procedureDocumentId;
      response = 'creado';
    } else {
      affiliateDocument = affiliate.affiliateDocuments[0];
      affiliateDocument.updatedAt = new Date();
      response = 'actualizado';
    }

    affiliateDocument.path = `${initialPath}${document.shortened ?? document.name}.pdf`;

    const affiliateDocuments = [
      {
        fileId: affiliateDocument.procedureDocumentId,
        path: affiliateDocument.path,
      },
    ];

    affiliate.affiliateDocuments.push(affiliateDocument);

    await this.affiliateDocumentsRepository.save(affiliateDocument);

    return {
      serviceStatus: document.serviceStatus,
      message: `${document.shortened} ${response} exitosamente`,
      affiliateDocuments,
    };
  }

  async showDocuments(affiliateId: number): Promise<any> {
    const affiliateDocuments = await this.affiliateDocumentsRepository.find({
      where: { affiliateId },
      order: {
        procedureDocumentId: 'ASC',
      },
    });

    if (!affiliateDocuments.length) return affiliateDocuments;

    const procedureDocumentIds = affiliateDocuments.map(
      ({ procedureDocumentId }) => procedureDocumentId,
    );

    const documentNames = await this.nats.firstValue('procedureDocuments.findAllByIds', {
      ids: procedureDocumentIds,
      columns: ['id', 'name', 'shortened'],
    });

    if (!documentNames.serviceStatus) {
      return { serviceStatus: documentNames.serviceStatus, documentsAffiliate: affiliateDocuments };
    }

    const mappedDocumentNames = documentNames.data.reduce(
      (acc, item) => {
        acc[item.id] = {
          name: item.name,
          shortened: item.shortened,
        };
        return acc;
      },
      {} as Record<number, { name: string; shortened: string }>,
    );

    const documentsAffiliate = affiliateDocuments.map(({ procedureDocumentId }) => ({
      procedureDocumentId,
      ...mappedDocumentNames[procedureDocumentId],
    }));

    return { serviceStatus: documentNames.serviceStatus, documentsAffiliate };
  }

  async findDocument(
    affiliateId: number,
    procedureDocumentId: number,
  ): Promise<AffiliateDocument[]> {
    const affiliateDocuments = await this.affiliateDocumentsRepository.find({
      where: {
        affiliateId,
        procedureDocumentId,
      },
    });

    if (affiliateDocuments.length === 0)
      throw new RpcException({ message: 'Document not found', code: 404 });
    return affiliateDocuments;
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

    if (!modality.serviceStatus) return modality;

    const { affiliateDocuments } = affiliate;
    const { procedureRequirements } = modality;

    if (!procedureRequirements.length) {
      return { serviceStatus: false, message: 'No hay documentos requeridos' };
    }

    const affiliateDocumentsSet = new Set(affiliateDocuments.map((doc) => doc.procedureDocumentId));
    const requiredDocuments = new Map<number, any[]>();
    const additionallyDocuments: any[] = [];

    for (const { procedureDocument, id, number } of procedureRequirements) {
      const documentData = {
        procedureRequirementId: id,
        number,
        procedureDocumentId: procedureDocument.id,
        name: procedureDocument.name,
        shortened: procedureDocument.shortened,
        isUploaded: affiliateDocumentsSet.has(procedureDocument.id),
        status: false,
      };

      if (number === 0) { 
        additionallyDocuments.push(documentData);
      } else {
        if (!requiredDocuments.has(number)) {
          requiredDocuments.set(number, []);
        }
        requiredDocuments.get(number)?.push(documentData);
      }
    }

    return {
      serviceStatus: modality.serviceStatus,
      requiredDocuments: Object.fromEntries(requiredDocuments),
      additionallyDocuments,
    };
  }

  async documentsAnalysis(user: string, pass: string): Promise<any> {
    const path = envsFtp.ftpImportDocumentsPvtbe;
    const key = await this.nats.firstValue('auth.login', { username: user, password: pass });
    const pathFtp = envsFtp.ftpDocuments;
    if (!key.serviceStatus) {
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
      duplicateData: any;
      user: any;
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
      duplicateData: {},
      user: key.user,
    };
    const dataRead = {};
    const dataValid = {};
    const dataValidReal = [];

    await this.nats.firstValue('ftp.connectSwitch', { value: 'true' });
    const { data } = await this.nats.firstValue('ftp.listFiles', { path: path });
    const { affiliateIds, nonNumericIds } = data.reduce(
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

      const { data } = await this.nats.firstValue('ftp.listFiles', { path: pathFile });
      const files = data;
      const documentsOriginal = files.map((file) => `'${file.name.replace(/"/g, '')}'`);
      const documents = files.map(
        (file) => `'${file.name.replace(/"/g, '').replace(/\.pdf$/i, '')}'`,
      );
      if (documents.length != 0) {
        dataRead[affiliateId.id] = documentsOriginal;
        initialFolder.filesValidFolder += documents.length;
        const [validDocuments, dataPerson] = await Promise.all([
          this.dataSource.query(
            `SELECT id, shortened FROM public.procedure_documents WHERE shortened IN(${documents.join(',')})`
          ),
          this.affiliateIdForPersonId(affiliateId.id),
        ]);

        if (validDocuments.length !== 0) {
          notExistFiles = false;
        }

        initialFolder.filesValid += validDocuments.length;
        dataValid[affiliateId.id] = {};
        validDocuments.forEach((doc) => {
          const shortened = doc.shortened;
          doc.personId = dataPerson.personId;
          dataValid[affiliateId.id][shortened] = doc;
        });
      }
    }

    if (notExistFiles) {
      throw new RpcException({ message: 'No existen Archivos en las Carpetas', code: 404 });
    }
    await this.nats.firstValue('ftp.connectSwitch', { value: 'false' });
    let totalThumbs: number = 0;
    const shortenedMap: Record<string, boolean> = {};

    for (const affiliateId in dataRead) {
      const validDocsMap = dataValid[affiliateId];
      dataRead[affiliateId].forEach((doc) => {
        const cleanedDoc = doc.replace(/^'|'$/g, '').replace(/\.[^.]+$/, '');
        const validDoc = validDocsMap[cleanedDoc];
        if (validDoc) {
          const short = `${doc.replace(/^'|'$/g, '')}`;
          const key = `${affiliateId}_${validDoc.id}`;
          const personId = validDoc.personId;

          if (shortenedMap[key]) {
            if (!initialFolder.duplicateData[affiliateId]) {
              initialFolder.duplicateData[affiliateId] = [];
            }
            initialFolder.duplicateData[affiliateId].push(short);
          } else {
            shortenedMap[key] = true;
            dataValidReal.push({
              affiliate_id: affiliateId,
              procedure_document_id: validDoc.id,
              shortened: short,
              oldPath: `${path}/${affiliateId}/${short}`,
              newPath: `${pathFtp}/${affiliateId}/${short}`,
              personId: personId,
            });
          }
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
    await this.nats.firstValue('ftp.connectSwitch', { value: 'true' });
    const Archivos_validos_reales_Existentes = data.dataValidRealExist;
    const Archivos_validos_reales_No_Existentes = data.dataValidRealNotExist;
    let contNewFiles = 0;
    let contExistFiles = 0;

    await this.dataSource.transaction(async (transactionalEntityManager) => {
      const insertsNew: string[] = [];
      const insertsRecords: string[] = [];
      try {
        for (const file of Archivos_validos_reales_No_Existentes) {
          await this.nats.firstValue('ftp.renameFile', {
            oldPath: file.oldPath,
            newPath: file.newPath,
          });
          insertsNew.push(
            `(${file.affiliate_id}, ${file.procedure_document_id}, '${file.newPath}')`,
          );
          insertsRecords.push(
            `('${JSON.stringify(data.user)}','POST: AffiliatesController.documentsImports','${data.user.name} creó el documento ${file.shortened} al beneficiario con NUP ${file.affiliate_id} por importación','{"params": {"affiliateId": "${file.affiliate_id}"}}','{"message": "Se creó el documento ${file.shortened} exitosamente."}',${file.personId})`,
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
          await this.nats.firstValue('ftp.renameFile', {
            oldPath: file.oldPath,
            newPath: file.newPath,
          });

          insertsRecords.push(
            `('${JSON.stringify(data.user)}','POST: AffiliatesController.documentsImports','${data.user.name} actualizó el documento ${file.shortened} al beneficiario con NUP ${file.affiliate_id} por importación','{"params": {"affiliateId": "${file.affiliate_id}"}}','{"message": "Se actualizó el documento ${file.shortened} exitosamente."}',${file.personId})`,
          );
          const queryExist = `
            UPDATE beneficiaries.affiliate_documents
            SET updated_at = NOW(), path = '${file.newPath}'
            WHERE affiliate_id = ${file.affiliate_id} AND procedure_document_id = ${file.procedure_document_id}`;
          await transactionalEntityManager.query(queryExist);

          contExistFiles++;
        }

        if (insertsRecords.length > 0) {
          const queryRecords = `
            INSERT INTO records.records_beneficiaries ("user", action, description, input, output, person_id)
            VALUES ${insertsRecords.join(',')}`;
          await transactionalEntityManager.query(queryRecords);
        }
      } catch (error) {
        throw new RpcException({ message: 'Ya se realizo la importación', code: 404 });
      }
      this.logger.log(`Archivos nuevos procesados: ${contNewFiles}`);
      this.logger.log(`Archivos existentes actualizados: ${contExistFiles}`);
    });

    await this.nats.firstValue('ftp.connectSwitch', { value: 'false' });

    return {
      totalFolder: data.totalFolder,
      newFiles: contNewFiles,
      updateFIles: contExistFiles,
      totalFiles: contNewFiles + contExistFiles,
      message: `${contNewFiles} nuevos archivos, ${contExistFiles} archivos actualizados.`,
    };
  }

  async showFileDossiers(affiliateId: number): Promise<any> {
    const affiliateFileDossiers = await this.affiliateFileDossierRepository.find({
      where: { affiliateId },
      order: {
        fileDossierId: 'ASC',
      },
    });

    if (!affiliateFileDossiers.length) return affiliateFileDossiers;

    const fileDossierIds = affiliateFileDossiers.map(({ fileDossierId }) => fileDossierId);

    const fileDossierNames = await this.nats.firstValue('fileDossiers.findAllByIds', {
      ids: fileDossierIds,
      columns: ['id', 'name', 'shortened'],
    });

    if (!fileDossierNames.serviceStatus) {
      return {
        serviceStatus: fileDossierNames.serviceStatus,
        fileDossiersAffiliate: affiliateFileDossiers,
      };
    }

    const mappedDocumentNames = fileDossierNames.data.reduce(
      (acc, item) => {
        acc[item.id] = {
          name: item.name,
          shortened: item.shortened,
        };
        return acc;
      },
      {} as Record<number, { name: string; shortened: string }>,
    );

    const fileDossiersAffiliate = affiliateFileDossiers.map(({ affiliateId, fileDossierId }) => ({
      affiliateId,
      fileDossierId,
      ...mappedDocumentNames[fileDossierId],
    }));

    return { serviceStatus: fileDossierNames.serviceStatus, fileDossiersAffiliate };
  }

  async findAllFileDossiers() {
    return this.nats.firstValue('fileDossiers.findAll', ['id', 'name', 'shortened']);
  }

  async findAllDocuments() {
    return this.nats.firstValue('procedureDocuments.findAll', ['id', 'name', 'shortened']);
  }

  async findFileDossier(
    affiliateId: number,
    fileDossierId: number,
  ): Promise<AffiliateFileDossier[]> {
    const AffiliateFileDossier = await this.affiliateFileDossierRepository.find({
      where: {
        affiliateId,
        fileDossierId,
      },
    });
    if (AffiliateFileDossier.length === 0)
      throw new RpcException({ message: 'Dossier not found', code: 404 });

    return AffiliateFileDossier;
  }

  async createOrUpdateFileDossier(affiliateId: number, fileDossierId: number): Promise<any> {
    const [fileDossier, affiliateFileDossiers] = await Promise.all([
      this.nats.firstValue('fileDossiers.findOne', { id: fileDossierId }),
      this.affiliateFileDossierRepository.find({
        where: {
          affiliateId,
          fileDossierId,
        },
      }),
    ]);

    const initialPath = `${envsFtp.ftpFileDossiers}/${affiliateId}/`;
    if (fileDossier.serviceStatus === false) {
      return {
        serviceStatus: fileDossier.serviceStatus,
        message: fileDossier.message || 'Servicio de expedientes no disponible',
      };
    }

    let affiliateFileDossier: AffiliateFileDossier;
    let response: string;

    if (affiliateFileDossiers.length === 0) {
      affiliateFileDossier = new AffiliateFileDossier();
      affiliateFileDossier.affiliateId = affiliateId;
      affiliateFileDossier.fileDossierId = fileDossierId;
      response = 'Creado';
    } else {
      affiliateFileDossier = affiliateFileDossiers[0];
      affiliateFileDossier.updatedAt = new Date();
      response = 'Actualizado';
    }

    affiliateFileDossier.path = `${initialPath}${fileDossier.shortened ?? fileDossier.name}.pdf`;

    const fileDossiers = [
      {
        fileId: affiliateFileDossier.fileDossierId,
        path: affiliateFileDossier.path,
      },
    ];

    await this.affiliateFileDossierRepository.save(affiliateFileDossier);
    return {
      serviceStatus: fileDossier.serviceStatus,
      message: `${fileDossier.name} ${response} exitosamente`,
      affiliateFileDossiers: fileDossiers,
    };
  }

  async deleteFileDossier(affiliateId: number, fileDossierId: number): Promise<any> {
    const fileDossiers = await this.affiliateFileDossierRepository.find({
      where: { affiliateId, fileDossierId },
      select: ['path'],
    });

    if (fileDossiers.length === 0)
      return {
        paths: [],
        message: 'No existe el expediente para eliminar',
      };

    const paths = fileDossiers.map((f) => f.path);

    const [{ name }] = await Promise.all([
      this.nats.firstValue('fileDossiers.findOne', { id: fileDossierId }),
      this.affiliateFileDossierRepository.delete({ affiliateId, fileDossierId }),
    ]);

    return { paths, message: `Expediente ${name} eliminado exitosamente` };
  }

  public async affiliateIdForPersonId(affiliateId: number): Promise<{ personId: number }> {
    const result = await this.dataSource.query(
      `
      SELECT person_id
      FROM beneficiaries.person_affiliates
      WHERE type = 'affiliates' AND type_id = $1
      LIMIT 1
      `,
      [affiliateId],
    );

    return { personId: result[0].person_id };
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
