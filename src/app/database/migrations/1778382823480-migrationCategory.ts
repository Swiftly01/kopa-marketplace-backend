import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationCategory1778382823480 implements MigrationInterface {
  name = 'MigrationCategory1778382823480';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."locations_type_enum" AS ENUM('COUNTRY', 'STATE', 'LGA')`,
    );
    await queryRunner.query(
      `CREATE TABLE "locations" ("id" SERIAL NOT NULL, "code" character varying NOT NULL, "name" character varying NOT NULL, "slug" character varying, "display_name" character varying, "parent_id" uuid, "type" "public"."locations_type_enum" NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "sortOrder" integer NOT NULL DEFAULT '0', "latitude" numeric, "longitude" numeric, "region" character varying, "metadata" jsonb, "parentId" integer, CONSTRAINT "PK_7cc1c9e3853b94816c094825e74" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1c65ef243169e51b514c814eea" ON "locations" ("code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_227023051ab1fedef7a3b6c7e2" ON "locations" ("name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ce8370570fc9bb582e9510b94a" ON "locations" ("parent_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2627bb0624a973aa66aefa101e" ON "locations" ("type") `,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ADD CONSTRAINT "FK_9f238930bae84c7eafad3785d7b" FOREIGN KEY ("parentId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "locations" DROP CONSTRAINT "FK_9f238930bae84c7eafad3785d7b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2627bb0624a973aa66aefa101e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ce8370570fc9bb582e9510b94a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_227023051ab1fedef7a3b6c7e2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1c65ef243169e51b514c814eea"`,
    );
    await queryRunner.query(`DROP TABLE "locations"`);
    await queryRunner.query(`DROP TYPE "public"."locations_type_enum"`);
  }
}
