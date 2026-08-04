import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInteractionsTable1785700716498 implements MigrationInterface {
    name = 'AddInteractionsTable1785700716498'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."buyer_seller_interactions_type_enum" AS ENUM('whatsapp', 'call')`);
        await queryRunner.query(`CREATE TABLE "buyer_seller_interactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "buyer_id" uuid NOT NULL, "seller_id" uuid NOT NULL, "product_id" uuid NOT NULL, "type" "public"."buyer_seller_interactions_type_enum" NOT NULL, "review_request_job_id" character varying, "review_request_scheduled_for" TIMESTAMP, "review_request_sent_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3715c1e9ffbe29344e94cdc6745" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8a8ed5a43192d5f2381c38490f" ON "buyer_seller_interactions" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_973944523fa4745432566acc6f" ON "buyer_seller_interactions" ("product_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_53e64792188631f9fbddbadfd5" ON "buyer_seller_interactions" ("seller_id") `);
        await queryRunner.query(`CREATE INDEX "idx_interaction_eligibility" ON "buyer_seller_interactions" ("buyer_id", "seller_id", "product_id") `);
        await queryRunner.query(`CREATE TYPE "public"."reviews_status_enum" AS ENUM('published', 'flagged', 'removed')`);
        await queryRunner.query(`CREATE TABLE "reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "buyer_id" uuid NOT NULL, "seller_id" uuid NOT NULL, "product_id" uuid NOT NULL, "interaction_id" uuid, "rating" smallint NOT NULL, "comment" text, "status" "public"."reviews_status_enum" NOT NULL DEFAULT 'published', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "CHK_e87bbcfbe3ea0dda3d626010ee" CHECK ("rating" >= 1 AND "rating" <= 5), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7b06c23cf52ca8aea0dcaf0ee2" ON "reviews" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_9482e9567d8dcc2bc615981ef4" ON "reviews" ("product_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_b138f300626648e9107e5521d0" ON "reviews" ("seller_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_review_one_per_buyer_per_product" ON "reviews" ("buyer_id", "product_id") `);
        await queryRunner.query(`ALTER TABLE "users" ADD "seller_average_rating" numeric(3,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "seller_review_count" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "buyer_seller_interactions" ADD CONSTRAINT "FK_1d4cdaa40e0c0e21a9039ad27a1" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "buyer_seller_interactions" ADD CONSTRAINT "FK_53e64792188631f9fbddbadfd50" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "buyer_seller_interactions" ADD CONSTRAINT "FK_973944523fa4745432566acc6f0" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_fbde84e628534cdfba82c231c88" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_b138f300626648e9107e5521d0b" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_9482e9567d8dcc2bc615981ef44" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_8508c3a9f665bea299685dcfac6" FOREIGN KEY ("interaction_id") REFERENCES "buyer_seller_interactions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_8508c3a9f665bea299685dcfac6"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_9482e9567d8dcc2bc615981ef44"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_b138f300626648e9107e5521d0b"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_fbde84e628534cdfba82c231c88"`);
        await queryRunner.query(`ALTER TABLE "buyer_seller_interactions" DROP CONSTRAINT "FK_973944523fa4745432566acc6f0"`);
        await queryRunner.query(`ALTER TABLE "buyer_seller_interactions" DROP CONSTRAINT "FK_53e64792188631f9fbddbadfd50"`);
        await queryRunner.query(`ALTER TABLE "buyer_seller_interactions" DROP CONSTRAINT "FK_1d4cdaa40e0c0e21a9039ad27a1"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "seller_review_count"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "seller_average_rating"`);
        await queryRunner.query(`DROP INDEX "public"."idx_review_one_per_buyer_per_product"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b138f300626648e9107e5521d0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9482e9567d8dcc2bc615981ef4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7b06c23cf52ca8aea0dcaf0ee2"`);
        await queryRunner.query(`DROP TABLE "reviews"`);
        await queryRunner.query(`DROP TYPE "public"."reviews_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_interaction_eligibility"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_53e64792188631f9fbddbadfd5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_973944523fa4745432566acc6f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8a8ed5a43192d5f2381c38490f"`);
        await queryRunner.query(`DROP TABLE "buyer_seller_interactions"`);
        await queryRunner.query(`DROP TYPE "public"."buyer_seller_interactions_type_enum"`);
    }

}
