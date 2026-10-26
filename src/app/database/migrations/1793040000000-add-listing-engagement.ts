import { MigrationInterface, QueryRunner } from 'typeorm';

// lets reviews, saved items and contact tracking point at an ad (listing) instead of a product
export class AddListingEngagement1793040000000 implements MigrationInterface {
  name = 'AddListingEngagement1793040000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "listings" ADD "rating" numeric(3,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" ADD "review_count" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ALTER COLUMN "product_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD "listing_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_da74291938b03c356816a42371" ON "reviews" ("listing_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_da74291938b03c356816a423712" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "chk_reviews_one_target" CHECK (("product_id" IS NOT NULL) <> ("listing_id" IS NOT NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_products" ALTER COLUMN "product_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_products" ADD "listing_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_64b6c847719095b208c1eca84e" ON "saved_products" ("listing_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_products" ADD CONSTRAINT "FK_64b6c847719095b208c1eca84ed" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_products" ADD CONSTRAINT "chk_saved_products_one_target" CHECK (("product_id" IS NOT NULL) <> ("listing_id" IS NOT NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "buyer_seller_interactions" ALTER COLUMN "product_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "buyer_seller_interactions" ADD "listing_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2c083156c63de603434890c1de" ON "buyer_seller_interactions" ("listing_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "buyer_seller_interactions" ADD CONSTRAINT "FK_2c083156c63de603434890c1de4" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "buyer_seller_interactions" ADD CONSTRAINT "chk_interactions_one_target" CHECK (("product_id" IS NOT NULL) <> ("listing_id" IS NOT NULL))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_review_one_per_buyer_per_listing" ON "reviews" ("buyer_id", "listing_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_products" ADD CONSTRAINT "UQ_68ce2e55fb745edc011b74229a3" UNIQUE ("buyer_id", "listing_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // rows about ads have no product, so they are removed before product_id becomes required again
    await queryRunner.query(
      `DELETE FROM "reviews" WHERE "product_id" IS NULL`,
    );
    await queryRunner.query(
      `DELETE FROM "saved_products" WHERE "product_id" IS NULL`,
    );
    await queryRunner.query(
      `DELETE FROM "buyer_seller_interactions" WHERE "product_id" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_products" DROP CONSTRAINT "UQ_68ce2e55fb745edc011b74229a3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_review_one_per_buyer_per_listing"`,
    );
    await queryRunner.query(
      `ALTER TABLE "buyer_seller_interactions" DROP COLUMN "listing_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2c083156c63de603434890c1de"`,
    );
    await queryRunner.query(
      `ALTER TABLE "buyer_seller_interactions" DROP CONSTRAINT "FK_2c083156c63de603434890c1de4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "buyer_seller_interactions" DROP CONSTRAINT "chk_interactions_one_target"`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_products" DROP COLUMN "listing_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_64b6c847719095b208c1eca84e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_products" DROP CONSTRAINT "FK_64b6c847719095b208c1eca84ed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_products" DROP CONSTRAINT "chk_saved_products_one_target"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP COLUMN "listing_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_da74291938b03c356816a42371"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_da74291938b03c356816a423712"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "chk_reviews_one_target"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" DROP COLUMN "review_count"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" DROP COLUMN "rating"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ALTER COLUMN "product_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_products" ALTER COLUMN "product_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "buyer_seller_interactions" ALTER COLUMN "product_id" SET NOT NULL`,
    );
  }
}
