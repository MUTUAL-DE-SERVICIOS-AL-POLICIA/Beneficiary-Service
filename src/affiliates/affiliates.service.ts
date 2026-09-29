import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationDto, NatsService } from 'src/common';
import { LessThan, Repository } from 'typeorm';
import { Affiliate, AffiliateDocument, AffiliateFileDossier, DocumentImportPlan } from './entities';
import { RpcException } from '@nestjs/microservices';
import { DataSource } from 'typeorm';
import { envsFtp } from 'src/config/envs';

const DOCUMENT_IMPORT_PLAN_TTL_MS = 15 * 60 * 1000;

interface DocumentImportActor {
  username: string;
  name?: string;
}

interface DocumentImportFile {
  affiliate_id: string;
  procedure_document_id: number;
  shortened: string;
  oldPath: string;
  newPath: string;
  personId: number;
}

interface DocumentImportAnalysis {
  totalFolder: number;
  readFolder: number;
  nonNumericIds: string[];
  validFolder: number;
  dataErrorReadFolder: number[];
  filesValidFolder: number;
  filesValid: number;
  dataErrorReadFiles: Record<string, string[]>;
  dataValidRealExist: DocumentImportFile[];
  dataValidRealNotExist: DocumentImportFile[];
  duplicateData: Record<string, string[]>;
}

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
    @InjectRepository(DocumentImportPlan)
    private readonly documentImportPlanRepository: Repository<DocumentImportPlan>,
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

  async createAffiliateDocument(affiliateId: number, procedureDocumentId: number): Promise<any> {
    const [document, affiliateDocuments] = await Promise.all([
      this.nats.firstValue('procedureDocuments.findOne', { id: procedureDocumentId }),
      this.affiliateDocumentsRepository.findOne({
        where: {
          affiliateId,
          procedureDocumentId,
        },
      }),
    ]);

    const initialPath = `${envsFtp.ftpDocuments}/${affiliateId}/`;

    if (document.serviceStatus === false) {
      return {
        error: true,
        message: document.message || 'Servicio de documentos no disponible',
      };
    }

    if (affiliateDocuments) {
      return {
        error: true,
        message: 'Intento de creación de un documento ya existente',
      };
    }

    const affiliateDocument = new AffiliateDocument();
    affiliateDocument.affiliateId = affiliateId;
    affiliateDocument.procedureDocumentId = procedureDocumentId;
    affiliateDocument.path = `${initialPath}${document.shortened ?? document.name}.pdf`;
    await this.affiliateDocumentsRepository.save(affiliateDocument);

    return {
      error: false,
      message: `Documento ${document.shortened} registrado`,
      affiliateDocuments: [
        {
          fileId: affiliateDocument.procedureDocumentId,
          path: affiliateDocument.path,
        },
      ],
    };
  }

  async updateAffiliateDocument(affiliateId: number, procedureDocumentId: number): Promise<any> {
    const affiliateDocument = await this.affiliateDocumentsRepository.findOne({
      where: { affiliateId, procedureDocumentId },
    });

    if (!affiliateDocument) {
      return {
        error: true,
        message: 'Intento de actualización de un documento no existente',
        affiliateDocuments: [],
      };
    }

    affiliateDocument.updatedAt = new Date();
    await this.affiliateDocumentsRepository.save(affiliateDocument);
    const fileName = affiliateDocument.path.split('/').pop();

    return {
      error: false,
      message: `Documento ${fileName} actualizado`,
      affiliateDocuments: [
        {
          fileId: affiliateDocument.procedureDocumentId,
          path: affiliateDocument.path,
        },
      ],
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

  // TODO: Revisar sql para refactorizar el sql cuando se creen los demas microservicios
  async deleteDocument(affiliateId: number, procedureDocumentId: number): Promise<any> {
    const documents = await this.affiliateDocumentsRepository.findOne({
      where: { affiliateId, procedureDocumentId },
      select: ['path'],
    });

    if (!documents) {
      return {
        error: true,
        paths: [],
        message: 'Intento de eliminación de un documento no existente',
      };
    }

    const uploadedDocs = await this.affiliateDocumentsRepository.query(
      `
        SELECT source FROM (
          SELECT 'ret_fun' AS source, pr.procedure_document_id
          FROM ret_fun_submitted_documents s
          JOIN procedure_requirements pr ON pr.id = s.procedure_requirement_id
          JOIN retirement_funds rf ON rf.id = s.retirement_fund_id
          WHERE s.is_uploaded = TRUE and rf.affiliate_id = $2
          AND s.deleted_at IS NULL

          UNION ALL

          SELECT 'quota_aid' AS source, pr.procedure_document_id
          FROM quota_aid_submitted_documents s
          JOIN procedure_requirements pr ON pr.id = s.procedure_requirement_id
          JOIN quota_aid_mortuaries qm ON qm.id = s.quota_aid_mortuary_id
          WHERE s.is_uploaded = TRUE and qm.affiliate_id = $2
          AND s.deleted_at IS NULL

          UNION ALL

          SELECT 'eco_com' AS source, pr.procedure_document_id
          FROM eco_com_submitted_documents s
          JOIN procedure_requirements pr ON pr.id = s.procedure_requirement_id
          JOIN economic_complements ec ON ec.id = s.economic_complement_id
          WHERE s.is_uploaded = TRUE and ec.affiliate_id = $2
        ) AS t
        WHERE t.procedure_document_id = $1
        LIMIT 1;
      `,
      [procedureDocumentId, affiliateId],
    );

    const name = documents.path.split('/').pop();

    if (uploadedDocs.length > 0) {
      return {
        error: true,
        paths: [],
        message: `No se puede eliminar ${name} porque esta siendo utilizada en tramites de Beneficios`,
      };
    }

    await this.affiliateDocumentsRepository.delete({ affiliateId, procedureDocumentId });

    return { error: false, paths: [documents.path], message: `Documento ${name} eliminado` };
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

  async documentsAnalysis(actor: DocumentImportActor): Promise<any> {
    const trustedActor = this.validateImportActor(actor);
    const path = envsFtp.ftpImportDocumentsPvtbe;
    const pathFtp = envsFtp.ftpDocuments;
    const analysis: DocumentImportAnalysis = {
      totalFolder: 0,
      readFolder: 0,
      nonNumericIds: [],
      validFolder: 0,
      dataErrorReadFolder: [],
      filesValidFolder: 0,
      filesValid: 0,
      dataErrorReadFiles: {},
      dataValidRealExist: [],
      dataValidRealNotExist: [],
      duplicateData: {},
    };
    const dataRead: Record<string, string[]> = {};
    const dataValid: Record<
      string,
      Record<string, { id: number; shortened: string; personId: number }>
    > = {};
    const dataValidReal: DocumentImportFile[] = [];

    this.ensureFtpConnected(await this.nats.firstValue('ftp.connectSwitch', { value: 'true' }));
    try {
      const rootListing = await this.nats.firstValue('ftp.listFiles', { path });
      const rootFiles = this.ensureFtpListing(rootListing);

      const { affiliateIds, nonNumericIds } = rootFiles.reduce(
        (result: { affiliateIds: number[]; nonNumericIds: string[] }, file: unknown) => {
          const name = this.ftpEntryName(file);
          if (/^\d+$/.test(name)) result.affiliateIds.push(Number(name));
          else result.nonNumericIds.push(name);
          return result;
        },
        { affiliateIds: [], nonNumericIds: [] },
      );

      if (affiliateIds.length === 0) {
        throw new RpcException({ message: 'Ninguna Carpeta es Valida', code: 404 });
      }

      const validAffiliates: { id: number }[] = await this.dataSource.query(
        'SELECT id FROM beneficiaries.affiliates WHERE id = ANY($1::int[])',
        [affiliateIds],
      );
      if (validAffiliates.length === 0) {
        throw new RpcException({ message: 'Ninguna Carpeta es Valida', code: 404 });
      }

      analysis.totalFolder = affiliateIds.length + nonNumericIds.length;
      analysis.readFolder = affiliateIds.length;
      analysis.nonNumericIds = nonNumericIds;
      analysis.validFolder = validAffiliates.length;
      const validAffiliateIds = new Set(validAffiliates.map(({ id }) => Number(id)));
      analysis.dataErrorReadFolder = affiliateIds.filter((id) => !validAffiliateIds.has(id));

      let hasValidFiles = false;
      for (const { id: affiliateId } of validAffiliates) {
        const listing = await this.nats.firstValue('ftp.listFiles', {
          path: `${path}/${affiliateId}`,
        });
        const files = this.ensureFtpListing(listing);

        const fileNames = files.map((file: unknown) => this.ftpEntryName(file));
        const shortenedNames = fileNames.map((name: string) => name.replace(/\.pdf$/i, ''));
        if (shortenedNames.length === 0) continue;

        dataRead[String(affiliateId)] = fileNames;
        analysis.filesValidFolder += shortenedNames.length;
        const [validDocuments, dataPerson] = await Promise.all([
          this.dataSource.query(
            'SELECT id, shortened FROM public.procedure_documents WHERE shortened = ANY($1::text[])',
            [shortenedNames],
          ),
          this.affiliateIdForPersonId(affiliateId),
        ]);

        if (validDocuments.length > 0) hasValidFiles = true;
        analysis.filesValid += validDocuments.length;
        dataValid[String(affiliateId)] = {};
        for (const document of validDocuments) {
          dataValid[String(affiliateId)][document.shortened] = {
            id: Number(document.id),
            shortened: document.shortened,
            personId: Number(dataPerson.personId),
          };
        }
      }

      if (!hasValidFiles) {
        throw new RpcException({ message: 'No existen Archivos en las Carpetas', code: 404 });
      }

      let ignoredSystemFiles = 0;
      const uniqueDocuments = new Set<string>();
      for (const [affiliateId, fileNames] of Object.entries(dataRead)) {
        const validDocuments = dataValid[affiliateId];
        for (const fileName of fileNames) {
          const shortened = fileName.replace(/\.[^.]+$/, '');
          const validDocument = validDocuments[shortened];
          if (!validDocument) {
            if (fileName === 'Thumbs.db' || fileName === 'desktop.ini') {
              ignoredSystemFiles++;
            } else {
              (analysis.dataErrorReadFiles[affiliateId] ??= []).push(fileName);
            }
            continue;
          }

          const documentKey = `${affiliateId}_${validDocument.id}`;
          if (uniqueDocuments.has(documentKey)) {
            (analysis.duplicateData[affiliateId] ??= []).push(fileName);
            continue;
          }
          uniqueDocuments.add(documentKey);
          dataValidReal.push({
            affiliate_id: affiliateId,
            procedure_document_id: validDocument.id,
            shortened: fileName,
            oldPath: `${path}/${affiliateId}/${fileName}`,
            newPath: `${pathFtp}/${affiliateId}/${fileName}`,
            personId: validDocument.personId,
          });
        }
      }
      analysis.filesValidFolder -= ignoredSystemFiles;

      const existingDocuments: { affiliate_id: number; procedure_document_id: number }[] =
        dataValidReal.length === 0
          ? []
          : await this.dataSource.query(
              `SELECT affiliate_id, procedure_document_id
               FROM beneficiaries.affiliate_documents
               WHERE affiliate_id = ANY($1::int[])
                 AND procedure_document_id = ANY($2::int[])`,
              [
                dataValidReal.map((document) => Number(document.affiliate_id)),
                dataValidReal.map((document) => document.procedure_document_id),
              ],
            );
      const existingSet = new Set(
        existingDocuments.map(
          ({ affiliate_id, procedure_document_id }) => `${affiliate_id}-${procedure_document_id}`,
        ),
      );
      for (const document of dataValidReal) {
        const target = existingSet.has(`${document.affiliate_id}-${document.procedure_document_id}`)
          ? analysis.dataValidRealExist
          : analysis.dataValidRealNotExist;
        target.push(document);
      }

      const expiresAt = new Date(Date.now() + DOCUMENT_IMPORT_PLAN_TTL_MS);
      await this.documentImportPlanRepository.delete({ expiresAt: LessThan(new Date()) });
      const importPlan = this.documentImportPlanRepository.create({
        id: randomUUID(),
        ownerUsername: trustedActor.username,
        plan: analysis as unknown as Record<string, unknown>,
        expiresAt,
        consumedAt: null,
      });
      await this.documentImportPlanRepository.save(importPlan);

      return {
        ...analysis,
        importId: importPlan.id,
        expiresAt: expiresAt.toISOString(),
      };
    } finally {
      await this.nats.firstValue('ftp.connectSwitch', { value: 'false' });
    }
  }

  async documentsImports(importId: string, actor: DocumentImportActor): Promise<any> {
    if (!this.isUuid(importId)) {
      throw new RpcException({ message: 'Plan de importacion no disponible', code: 404 });
    }
    const trustedActor = this.validateImportActor(actor);
    this.ensureFtpConnected(await this.nats.firstValue('ftp.connectSwitch', { value: 'true' }));
    try {
      return await this.dataSource.transaction(async (manager) => {
        const plans = manager.getRepository(DocumentImportPlan);
        const storedPlan = await plans.findOne({
          where: { id: importId },
          lock: { mode: 'pessimistic_write' },
        });
        if (
          !storedPlan ||
          storedPlan.ownerUsername !== trustedActor.username ||
          storedPlan.consumedAt !== null ||
          storedPlan.expiresAt.getTime() <= Date.now()
        ) {
          throw new RpcException({ message: 'Plan de importacion no disponible', code: 404 });
        }

        const plan = this.validateStoredImportPlan(storedPlan.plan);
        let newFiles = 0;
        let updatedFiles = 0;
        for (const file of plan.dataValidRealNotExist) {
          this.ensureFtpMoved(
            await this.nats.firstValue('ftp.renameFile', {
              oldPath: file.oldPath,
              newPath: file.newPath,
            }),
          );
          await manager.getRepository(AffiliateDocument).insert({
            affiliateId: Number(file.affiliate_id),
            procedureDocumentId: file.procedure_document_id,
            path: file.newPath,
          });
          await this.insertDocumentImportRecord(manager, trustedActor, file, false);
          newFiles++;
        }

        for (const file of plan.dataValidRealExist) {
          this.ensureFtpMoved(
            await this.nats.firstValue('ftp.renameFile', {
              oldPath: file.oldPath,
              newPath: file.newPath,
            }),
          );
          await manager.getRepository(AffiliateDocument).update(
            {
              affiliateId: Number(file.affiliate_id),
              procedureDocumentId: file.procedure_document_id,
            },
            { path: file.newPath },
          );
          await this.insertDocumentImportRecord(manager, trustedActor, file, true);
          updatedFiles++;
        }

        storedPlan.consumedAt = new Date();
        await plans.save(storedPlan);
        this.logger.log(`Archivos nuevos procesados: ${newFiles}`);
        this.logger.log(`Archivos existentes actualizados: ${updatedFiles}`);
        return {
          totalFolder: plan.totalFolder,
          newFiles,
          updateFIles: updatedFiles,
          totalFiles: newFiles + updatedFiles,
          message: `Realizo la importacion de documentos, ${newFiles} nuevos archivos, ${updatedFiles} archivos actualizados.`,
        };
      });
    } finally {
      await this.nats.firstValue('ftp.connectSwitch', { value: 'false' });
    }
  }

  private validateImportActor(actor: DocumentImportActor): DocumentImportActor {
    if (
      !actor ||
      typeof actor !== 'object' ||
      typeof actor.username !== 'string' ||
      actor.username.trim().length === 0 ||
      (actor.name !== undefined && typeof actor.name !== 'string')
    ) {
      throw new RpcException({ message: 'Contexto de autorizacion invalido', code: 500 });
    }
    return {
      username: actor.username,
      ...(actor.name?.trim() ? { name: actor.name } : {}),
    };
  }

  private ftpEntryName(file: unknown): string {
    if (
      !file ||
      typeof file !== 'object' ||
      typeof (file as { name?: unknown }).name !== 'string' ||
      (file as { name: string }).name.length === 0
    ) {
      throw new RpcException({ message: 'Respuesta FTP invalida', code: 503 });
    }
    return (file as { name: string }).name;
  }

  private ensureFtpConnected(response: unknown): void {
    if (
      !response ||
      typeof response !== 'object' ||
      (response as { statusConnect?: unknown }).statusConnect !== true
    ) {
      throw new RpcException({ message: 'Servicio FTP no disponible', code: 503 });
    }
  }

  private ensureFtpListing(response: unknown): unknown[] {
    if (!Array.isArray(response)) {
      throw new RpcException({
        message: 'No se pudo analizar la carpeta de importacion',
        code: 503,
      });
    }
    return response;
  }

  private ensureFtpMoved(response: unknown): void {
    if (
      !response ||
      typeof response !== 'object' ||
      (response as { statusMoved?: unknown }).statusMoved !== true
    ) {
      throw new RpcException({ message: 'Servicio FTP no disponible', code: 503 });
    }
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private validateStoredImportPlan(plan: Record<string, unknown>): DocumentImportAnalysis {
    if (
      !plan ||
      typeof plan !== 'object' ||
      !Array.isArray(plan.dataValidRealExist) ||
      !Array.isArray(plan.dataValidRealNotExist) ||
      typeof plan.totalFolder !== 'number'
    ) {
      throw new RpcException({ message: 'Plan de importacion invalido', code: 500 });
    }
    const files = [...plan.dataValidRealExist, ...plan.dataValidRealNotExist];
    if (!files.every((file) => this.isStoredImportFile(file))) {
      throw new RpcException({ message: 'Plan de importacion invalido', code: 500 });
    }
    return plan as unknown as DocumentImportAnalysis;
  }

  private isStoredImportFile(file: unknown): file is DocumentImportFile {
    if (!file || typeof file !== 'object' || Array.isArray(file)) return false;
    const value = file as Record<string, unknown>;
    return (
      typeof value.affiliate_id === 'string' &&
      /^\d+$/.test(value.affiliate_id) &&
      typeof value.procedure_document_id === 'number' &&
      Number.isInteger(value.procedure_document_id) &&
      typeof value.shortened === 'string' &&
      typeof value.oldPath === 'string' &&
      typeof value.newPath === 'string' &&
      typeof value.personId === 'number' &&
      Number.isInteger(value.personId)
    );
  }

  private async insertDocumentImportRecord(
    manager: import('typeorm').EntityManager,
    actor: DocumentImportActor,
    file: DocumentImportFile,
    updated: boolean,
  ): Promise<void> {
    const actorName = actor.name ?? actor.username;
    const operation = updated ? 'actualizado' : 'registrado';
    const result = updated ? 'actualizo' : 'creo';
    await manager.query(
      `INSERT INTO records.records_beneficiaries
       ("user", action, description, input, output, person_id)
       VALUES ($1::jsonb, $2, $3, $4::jsonb, $5::jsonb, $6)`,
      [
        JSON.stringify(actor),
        'POST: AffiliatesController.documentsImports',
        `Documento importado, ${file.shortened} ${operation} por ${actorName}.`,
        JSON.stringify({ params: { affiliateId: file.affiliate_id } }),
        JSON.stringify({ message: `Se ${result} el documento ${file.shortened} exitosamente.` }),
        file.personId,
      ],
    );
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

  async createFileDossier(affiliateId: number) {
    const dataExist = await this.affiliateFileDossierRepository.find({
      where: {
        affiliateId,
      },
    });
    const disableData = dataExist.map((d) => d.fileDossierId.toString());
    const { data, serviceStatus } = await this.nats.firstValue('fileDossiers.findAll', [
      'id',
      'name',
      'shortened',
    ]);

    if (!serviceStatus) {
      return {
        error: true,
        data: [],
        message: 'Servicio de expedientes no disponible',
      };
    }

    return {
      error: false,
      data: {
        allData: data,
        disableData,
      },
      message: 'Datos para creación de expedientes',
    };
  }

  async createDocument(affiliateId: number) {
    const dataExist = await this.affiliateDocumentsRepository.find({
      where: {
        affiliateId,
      },
    });
    const disableData = dataExist.map((d) => d.procedureDocumentId.toString());
    const { data, serviceStatus } = await this.nats.firstValue('procedureDocuments.findAll', [
      'id',
      'name',
      'shortened',
    ]);

    if (!serviceStatus) {
      return {
        error: true,
        data: [],
        message: 'Servicio de documentos no disponible',
      };
    }

    return {
      error: false,
      data: {
        allData: data,
        disableData,
      },
      message: 'Datos para creación de documentos',
    };
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

  async createAffiliateFileDossier(affiliateId: number, fileDossierId: number): Promise<any> {
    const [fileDossier, affiliateFileDossiers] = await Promise.all([
      this.nats.firstValue('fileDossiers.findOne', { id: fileDossierId }),
      this.affiliateFileDossierRepository.findOne({
        where: {
          affiliateId,
          fileDossierId,
        },
      }),
    ]);

    const initialPath = `${envsFtp.ftpFileDossiers}/${affiliateId}/`;

    if (fileDossier.serviceStatus === false) {
      return {
        error: true,
        message: `Intento de crear expediente pero el servicio de archivos no estaba disponible`,
      };
    }

    if (affiliateFileDossiers) {
      return {
        error: true,
        message: `Intento crear expediente de ${fileDossier.name} ya existente`,
      };
    }

    const affiliateFileDossier = new AffiliateFileDossier();
    affiliateFileDossier.affiliateId = affiliateId;
    affiliateFileDossier.fileDossierId = fileDossierId;

    affiliateFileDossier.path = `${initialPath}${fileDossier.shortened ?? fileDossier.name}.pdf`;
    await this.affiliateFileDossierRepository.save(affiliateFileDossier);

    return {
      error: false,
      message: `Expediente de ${fileDossier.name} registrado`,
      affiliateFileDossiers: [
        {
          fileId: affiliateFileDossier.fileDossierId,
          path: affiliateFileDossier.path,
        },
      ],
    };
  }

  async updateAffiliateFileDossier(affiliateId: number, fileDossierId: number): Promise<any> {
    const affiliateFileDossier = await this.affiliateFileDossierRepository.findOne({
      where: { affiliateId, fileDossierId },
    });

    if (!affiliateFileDossier) {
      return {
        error: true,
        message: `Intento de actualización de expediente, pero no existe para este afiliado.`,
      };
    }

    const fileName = affiliateFileDossier.path.split('/').pop();
    affiliateFileDossier.updatedAt = new Date();
    await this.affiliateFileDossierRepository.save(affiliateFileDossier);

    return {
      error: false,
      message: `Expediente de ${fileName} actualizado`,
      affiliateFileDossiers: [
        {
          fileId: affiliateFileDossier.fileDossierId,
          path: affiliateFileDossier.path,
        },
      ],
    };
  }

  async deleteFileDossier(affiliateId: number, fileDossierId: number): Promise<any> {
    const fileDossiers = await this.affiliateFileDossierRepository.findOne({
      where: { affiliateId, fileDossierId },
      select: ['path'],
    });

    if (!fileDossiers) {
      return {
        error: true,
        paths: [],
        message: `Intento de eliminación de un expediente no existente`,
      };
    }

    const fileName = fileDossiers.path.split('/').pop();
    this.affiliateFileDossierRepository.delete({ affiliateId, fileDossierId });
    return {
      error: false,
      paths: [fileDossiers.path],
      message: `Expediente de ${fileName} eliminado`,
    };
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
}
