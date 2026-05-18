import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterProductTable1779090860385 implements MigrationInterface {
  name = 'AlterProductTable1779090860385';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_2cc97d4367771c8aeb5e6a0f10d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2cc97d4367771c8aeb5e6a0f10"`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "location_id"`);
    await queryRunner.query(
      `ALTER TABLE "products" ADD "state_name" character varying(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD "state_code" character varying(10) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD "lga_name" character varying(100) NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_85918bbd2d933bf1cd6cfcba27" ON "products" ("state_name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6e73ea1aaaef2a196fd370669f" ON "products" ("state_code") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6e73ea1aaaef2a196fd370669f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_85918bbd2d933bf1cd6cfcba27"`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "lga_name"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "state_code"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "state_name"`);
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
}
