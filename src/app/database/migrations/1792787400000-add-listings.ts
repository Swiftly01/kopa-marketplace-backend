import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddListings1792787400000 implements MigrationInterface {
  name = 'AddListings1792787400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // tables
    await queryRunner.query(
      `CREATE TABLE "listings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "category_id" uuid NOT NULL, "title" character varying(100) NOT NULL, "slug" character varying(160) NOT NULL, "description" text NOT NULL, "price" bigint NOT NULL, "negotiable" character varying(20) NOT NULL DEFAULT 'not_sure', "video_url" character varying(1024), "state_code" character varying(10) NOT NULL, "state_name" character varying(100) NOT NULL, "lga_name" character varying(100) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'draft', "views" integer NOT NULL DEFAULT '0', "published_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "UQ_23a9f6b054ab6ba43132dfec40c" UNIQUE ("slug"), CONSTRAINT "PK_520ecac6c99ec90bcf5a603cdcb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "listing_images" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "listing_id" uuid NOT NULL, "url" text NOT NULL, "thumbnail_url" text, "public_id" character varying(255) NOT NULL, "position" integer NOT NULL, "format" character varying(50), "size_bytes" bigint, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_87ed0b2be6e55881ff6b6c53f12" UNIQUE ("public_id"), CONSTRAINT "PK_2abb5c9d795f27dbc4b10ced9dc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "property_rent_details" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "listing_id" uuid NOT NULL, "address" character varying(60) NOT NULL, "estate_name" character varying(60), "property_size" character varying(30), "property_type" character varying(30) NOT NULL, "condition" character varying(30) NOT NULL, "furnishing" character varying(30) NOT NULL, "bedrooms" smallint NOT NULL, "bathrooms" smallint NOT NULL, "toilets" smallint, "facilities" text array NOT NULL DEFAULT '{}', "listed_by" character varying(20), "service_charge" boolean NOT NULL DEFAULT false, "minimum_rental_period" character varying(30) NOT NULL, "price_period" character varying(20) NOT NULL DEFAULT 'per_annum', CONSTRAINT "REL_982b27f652c62cf0ebe6e872c6" UNIQUE ("listing_id"), CONSTRAINT "PK_74c926ca5b7be3547a2d68faf8a" PRIMARY KEY ("id"))`,
    );
    // indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_ab19ee664dda76e6250bfc6c46" ON "listings" ("user_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_139d0d17dc81520f3693d758f3" ON "listings" ("category_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2be7fefda34368a70cbe3ef616" ON "listings" ("state_code", "lga_name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2f5d4099616aa3a1e9f0177c73" ON "listings" ("status", "published_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_762301a6a63a8a43d42fa26d49" ON "listing_images" ("listing_id", "position") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0e5a4e6582549a46594af8abbc" ON "property_rent_details" ("property_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_17a256ced2ebb53fe1f12ef96d" ON "property_rent_details" ("bedrooms") `,
    );
    // foreign keys
    await queryRunner.query(
      `ALTER TABLE "listings" ADD CONSTRAINT "FK_3f1539dda02eba4738ac5859ded" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" ADD CONSTRAINT "FK_9315deed3e8f6d9171c23131418" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing_images" ADD CONSTRAINT "FK_94041359df3c1b14c4420808d16" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_rent_details" ADD CONSTRAINT "FK_982b27f652c62cf0ebe6e872c64" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    // categories: Property > Houses & Apartments for Rent (skipped if they already exist)
    await queryRunner.query(
      `INSERT INTO "categories" ("code", "name", "slug", "description") VALUES ('property', 'Property', 'property', 'Houses, apartments, land and commercial property') ON CONFLICT DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO "categories" ("code", "name", "slug", "description", "parent_id") SELECT 'houses_apartments_for_rent', 'Houses & Apartments for Rent', 'houses-apartments-for-rent', 'Rent a house or an apartment', "id" FROM "categories" WHERE "code" = 'property' ON CONFLICT DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // categories are removed only while nothing else uses them
    await queryRunner.query(
      `DELETE FROM "categories" c WHERE c."code" = 'houses_apartments_for_rent' AND NOT EXISTS (SELECT 1 FROM "products" p WHERE p."category_id" = c."id")`,
    );
    await queryRunner.query(
      `DELETE FROM "categories" c WHERE c."code" = 'property' AND NOT EXISTS (SELECT 1 FROM "categories" child WHERE child."parent_id" = c."id") AND NOT EXISTS (SELECT 1 FROM "products" p WHERE p."category_id" = c."id")`,
    );
    // foreign keys
    await queryRunner.query(
      `ALTER TABLE "property_rent_details" DROP CONSTRAINT "FK_982b27f652c62cf0ebe6e872c64"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing_images" DROP CONSTRAINT "FK_94041359df3c1b14c4420808d16"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" DROP CONSTRAINT "FK_9315deed3e8f6d9171c23131418"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" DROP CONSTRAINT "FK_3f1539dda02eba4738ac5859ded"`,
    );
    // indexes
    await queryRunner.query(
      `DROP INDEX "public"."IDX_17a256ced2ebb53fe1f12ef96d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0e5a4e6582549a46594af8abbc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_762301a6a63a8a43d42fa26d49"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2f5d4099616aa3a1e9f0177c73"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2be7fefda34368a70cbe3ef616"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_139d0d17dc81520f3693d758f3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ab19ee664dda76e6250bfc6c46"`,
    );
    // tables
    await queryRunner.query(
      `DROP TABLE "property_rent_details"`,
    );
    await queryRunner.query(
      `DROP TABLE "listing_images"`,
    );
    await queryRunner.query(
      `DROP TABLE "listings"`,
    );
  }
}
