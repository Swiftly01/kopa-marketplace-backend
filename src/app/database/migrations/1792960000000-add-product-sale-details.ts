import { MigrationInterface, QueryRunner } from 'typeorm';

// details table of the generic "item for sale" listing form
export class AddProductSaleDetails1792960000000 implements MigrationInterface {
  name = 'AddProductSaleDetails1792960000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "product_sale_details" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "listing_id" uuid NOT NULL, "condition" character varying(30) NOT NULL, "brand" character varying(60), "quantity" integer NOT NULL DEFAULT '1', CONSTRAINT "REL_1ce1fd49461d4506b30dd4c8b7" UNIQUE ("listing_id"), CONSTRAINT "PK_13c2bf9a73298c97303b6dc65d8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_sale_details" ADD CONSTRAINT "FK_1ce1fd49461d4506b30dd4c8b74" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_sale_details" DROP CONSTRAINT "FK_1ce1fd49461d4506b30dd4c8b74"`,
    );
    await queryRunner.query(`DROP TABLE "product_sale_details"`);
  }
}
