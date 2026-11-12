import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTablePersonPhotos1792071609371
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE beneficiaries.person_photos (
        id SERIAL PRIMARY KEY,
        person_id INTEGER NOT NULL,
        path VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,

        CONSTRAINT fk_person_photos_person
          FOREIGN KEY (person_id)
          REFERENCES beneficiaries.persons(id)
          ON DELETE CASCADE
          ON UPDATE CASCADE
      );

      CREATE INDEX idx_person_photos_person_id
        ON beneficiaries.person_photos(person_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS beneficiaries.person_photos;
    `);
  }
}