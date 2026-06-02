import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSavedProductsTable1780243069844 implements MigrationInterface {
  name = 'AddSavedProductsTable1780243069844';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "saved_products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "buyer_id" uuid NOT NULL, "product_id" uuid NOT NULL, "note" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "UQ_519efa0366ac1f07e0c2400b6ce" UNIQUE ("buyer_id", "product_id"), CONSTRAINT "PK_129ca3de9f2fc98e3f571029fe1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0bb32027fd767b6615585f81c9" ON "saved_products" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2abd54a954e42558765a486c58" ON "saved_products" ("buyer_id", "deleted_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5399766c0c857aa5c3ff348c4c" ON "saved_products" ("product_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c60be53ffbb172f8a7b64ab5cf" ON "saved_products" ("buyer_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_products" ADD CONSTRAINT "FK_c60be53ffbb172f8a7b64ab5cf3" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_products" ADD CONSTRAINT "FK_5399766c0c857aa5c3ff348c4ca" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "saved_products" DROP CONSTRAINT "FK_5399766c0c857aa5c3ff348c4ca"`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_products" DROP CONSTRAINT "FK_c60be53ffbb172f8a7b64ab5cf3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c60be53ffbb172f8a7b64ab5cf"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5399766c0c857aa5c3ff348c4c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2abd54a954e42558765a486c58"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0bb32027fd767b6615585f81c9"`,
    );
    await queryRunner.query(`DROP TABLE "saved_products"`);
  }
}
