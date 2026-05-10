import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLocationIdToProduct1778451426425 implements MigrationInterface {
  name = 'AddLocationIdToProduct1778451426425';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9f27a26091871307fd82257512"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" RENAME COLUMN "location" TO "location_id"`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "location_id"`);
    await queryRunner.query(
      `ALTER TABLE "products" ADD "location_id" integer NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2cc97d4367771c8aeb5e6a0f10" ON "products" ("location_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_2cc97d4367771c8aeb5e6a0f10d" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_2cc97d4367771c8aeb5e6a0f10d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2cc97d4367771c8aeb5e6a0f10"`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "location_id"`);
    await queryRunner.query(
      `ALTER TABLE "products" ADD "location_id" character varying(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" RENAME COLUMN "location_id" TO "location"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9f27a26091871307fd82257512" ON "products" ("location") `,
    );
  }
}
