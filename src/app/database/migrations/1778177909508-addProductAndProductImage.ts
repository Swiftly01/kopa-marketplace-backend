import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductAndProductImage1778177909508 implements MigrationInterface {
  name = 'AddProductAndProductImage1778177909508';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "product_images" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "cloudinary_url" text NOT NULL, " cloudinary_public_id" character varying(255) NOT NULL, "order" integer NOT NULL, "filename" character varying(255), "file_size" bigint, "format" character varying(50), "is_main" boolean NOT NULL DEFAULT false, "uploadedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_6a13353ab3b04555733bb62f95b" UNIQUE (" cloudinary_public_id"), CONSTRAINT "PK_1974264ea7265989af8392f63a1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6a13353ab3b04555733bb62f95" ON "product_images" (" cloudinary_public_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_347673d7b5c70db1f5620273f2" ON "product_images" ("order") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4f166bb8c2bfcef2498d97b406" ON "product_images" ("product_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."products_status_enum" AS ENUM('draft', 'active', 'inactive', 'removed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."products_condition_enum" AS ENUM('new', 'like_new', 'good', 'fair')`,
    );
    await queryRunner.query(
      `CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "seller_id" uuid NOT NULL, "name" character varying(200) NOT NULL, "description" text, "category" character varying(100) NOT NULL, "price" bigint NOT NULL, "discount_percentage" integer NOT NULL DEFAULT '0', "stock" integer NOT NULL DEFAULT '0', "sku" character varying(100), "location" character varying(100) NOT NULL, "status" "public"."products_status_enum" NOT NULL DEFAULT 'draft', "is_active" boolean NOT NULL DEFAULT true, "condition" "public"."products_condition_enum" NOT NULL DEFAULT 'new', "views" integer NOT NULL DEFAULT '0', "rating" numeric(3,2) NOT NULL DEFAULT '0', "reviewCount" integer NOT NULL DEFAULT '0', "attributes" jsonb, "slug" character varying(255), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "sellerId" uuid, CONSTRAINT "UQ_c44ac33a05b144dd0d9ddcf9327" UNIQUE ("sku"), CONSTRAINT "UQ_464f927ae360106b783ed0b4106" UNIQUE ("slug"), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6d551dad98cdf98e0488f43703" ON "products" ("seller_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4dcd2cd0cf988da1681469a0f4" ON "products" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_995d8194c43edfc98838cabc5a" ON "products" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1846199852a695713b1f8f5e9a" ON "products" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9f27a26091871307fd82257512" ON "products" ("location") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c3932231d2385ac248d0888d95" ON "products" ("category") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_425ee27c69d6b8adc5d6475dcf" ON "products" ("seller_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" ADD CONSTRAINT "FK_4f166bb8c2bfcef2498d97b4068" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_e40a1dd2909378f0da1f34f7bd6" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_e40a1dd2909378f0da1f34f7bd6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" DROP CONSTRAINT "FK_4f166bb8c2bfcef2498d97b4068"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_425ee27c69d6b8adc5d6475dcf"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c3932231d2385ac248d0888d95"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9f27a26091871307fd82257512"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1846199852a695713b1f8f5e9a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_995d8194c43edfc98838cabc5a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4dcd2cd0cf988da1681469a0f4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6d551dad98cdf98e0488f43703"`,
    );
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TYPE "public"."products_condition_enum"`);
    await queryRunner.query(`DROP TYPE "public"."products_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4f166bb8c2bfcef2498d97b406"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_347673d7b5c70db1f5620273f2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6a13353ab3b04555733bb62f95"`,
    );
    await queryRunner.query(`DROP TABLE "product_images"`);
  }
}
