import { MigrationInterface, QueryRunner } from 'typeorm';

export class PromotionSchema1781924855453 implements MigrationInterface {
  name = 'PromotionSchema1781924855453';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "promotion_claims" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "slot_number" integer NOT NULL, "asset_url" character varying(2048), "claimed_at" TIMESTAMP NOT NULL DEFAULT now(), "promotionId" uuid, "userId" uuid, CONSTRAINT "PK_9afa383224819449140ee82f5dc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."promotions_asset_type_enum" AS ENUM('pdf', 'video', 'link')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."promotions_status_enum" AS ENUM('active', 'paused', 'ended')`,
    );
    await queryRunner.query(
      `CREATE TABLE "promotions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying, "description" text, "slot_limit" integer, "asset_url" character varying(2048), "asset_type" "public"."promotions_asset_type_enum" NOT NULL DEFAULT 'pdf', "status" "public"."promotions_status_enum" NOT NULL DEFAULT 'active', "starts_at" TIMESTAMP, "ends_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_380cecbbe3ac11f0e5a7c452c34" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotion_claims" ADD CONSTRAINT "FK_54140ecc7667b3fee14c573876c" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotion_claims" ADD CONSTRAINT "FK_3fab05d00b69873a0380524733a" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "promotion_claims" DROP CONSTRAINT "FK_3fab05d00b69873a0380524733a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotion_claims" DROP CONSTRAINT "FK_54140ecc7667b3fee14c573876c"`,
    );
    await queryRunner.query(`DROP TABLE "promotions"`);
    await queryRunner.query(`DROP TYPE "public"."promotions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."promotions_asset_type_enum"`);
    await queryRunner.query(`DROP TABLE "promotion_claims"`);
  }
}
