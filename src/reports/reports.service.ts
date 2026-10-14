import { Injectable } from '@nestjs/common';
import { ReportsDto } from 'src/reports/dto/reports.dto';
import { DataSource } from 'typeorm';
@Injectable()
export class ReportsService {

  constructor(
    private readonly dataSource: DataSource
  ) {}

  async reportRegisterFingerPrints(filters: ReportsDto = {}): Promise<any> {
    try {

      const params: any[] = [];

      const dateFrom = filters.dateFrom;
      const dateTo = filters.dateTo;

      params.push(dateFrom);
      params.push(dateTo);

      const reportData = await this.dataSource.query(
        `
          SELECT
            ROW_NUMBER() OVER (
              ORDER BY MIN(pf.created_at) DESC
            ) AS "N°",
            pa_nup.type_id AS "NUP",
            p.identity_card AS "CI Beneficiario",

            CONCAT_WS(
              ' ',
              NULLIF(p.first_name, ''),
              NULLIF(p.second_name, ''),
              NULLIF(p.last_name, ''),
              NULLIF(p.mothers_last_name, '')
            ) AS "Nombre Completo",

            p_afiliado.identity_card AS "CI Afiliado",

            k.name AS "Parentesco con el afiliado"

          FROM beneficiaries."persons" p

          INNER JOIN beneficiaries."person_fingerprints" pf
            ON pf.person_id = p.id

          LEFT JOIN beneficiaries."person_affiliates" pa
            ON pa.person_id = p.id
            AND pa.type = 'persons'

          LEFT JOIN beneficiaries."persons" p_afiliado
            ON p_afiliado.id = pa.type_id

          LEFT JOIN public.kinships k
            ON k.id = pa.kinship_type

          LEFT JOIN beneficiaries."person_affiliates" pa_nup
            ON pa_nup.person_id = p.id
            AND pa_nup.type = 'affiliates'

          WHERE pf.created_at >= $1::date
            AND pf.created_at < ($2::date + INTERVAL '1 day')

          GROUP BY
            p.id,
            p.identity_card,
            p.first_name,
            p.second_name,
            p.last_name,
            p.mothers_last_name,
            pa_nup.type_id,
            p_afiliado.identity_card,
            k.name

          ORDER BY MIN(pf.created_at) DESC
        `,
        params,
      );

      const now = new Date();

      const header = {
        title: 'REPORTE DE BENEFICIARIOS CON HUELLAS DIGITALES REGISTRADAS',
        subtitle: `Desde: ${dateFrom} Hasta: ${dateTo}`,
        date: now.toLocaleDateString('es-BO', {
          timeZone: 'America/La_Paz',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),

        hour: now.toLocaleTimeString('es-BO', {
          timeZone: 'America/La_Paz',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
        user: filters.user,
      };

      return {
        error: false,
        message: 'Datos para el reporte de ventas generado correctamente',
        data: {
          header,
          reportData
        },
      }
    } catch {
      return {
        error: true,
        message: 'Error al obtener datos para el reporte de ventas',
        data: [],
      };
    }
  }
}
