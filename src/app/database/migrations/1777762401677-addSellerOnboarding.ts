import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSellerOnboarding1777762401677 implements MigrationInterface {
    name = 'AddSellerOnboarding1777762401677'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."seller_onboarding_documents_documenttype_enum" AS ENUM('id_front', 'id_back', 'selfie', 'store_logo')`);
        await queryRunner.query(`CREATE TYPE "public"."seller_onboarding_documents_verification_status_enum" AS ENUM('pending', 'approved', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "seller_onboarding_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "onboarding_progress_id" uuid NOT NULL, "documentType" "public"."seller_onboarding_documents_documenttype_enum" NOT NULL, "cloudinary_public_id" character varying(500) NOT NULL, "cloudinary_url" text NOT NULL, "cloudinary_thumbnail_url" text, "original_file_name" character varying(255), "file_size" integer, "dimensions" character varying(50), "format" character varying(20), "verification_status" "public"."seller_onboarding_documents_verification_status_enum" NOT NULL DEFAULT 'pending', "rejection_reason" text, "reviewed_by_admin" uuid, "reviewed_at" TIMESTAMP, "cloudinary_metadata" jsonb, "admin_notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8f215fe90632429552a4c57d493" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."seller_onboarding_progress_status_enum" AS ENUM('not_stated', 'in_progress', 'pending_review', 'approved', 'rejected')`);
        await queryRunner.query(`CREATE TYPE "public"."seller_onboarding_progress_id_verification_status_enum" AS ENUM('pending', 'approved', 'rejected')`);
        await queryRunner.query(`CREATE TYPE "public"."seller_onboarding_progress_face_verification_status_enum" AS ENUM('pending', 'approved', 'rejected')`);
        await queryRunner.query(`CREATE TYPE "public"."seller_onboarding_progress_store_profile_status_enum" AS ENUM('pending', 'approved', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "seller_onboarding_progress" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "current_step" integer NOT NULL DEFAULT '1', "steps_completed" integer NOT NULL DEFAULT '0', "status" "public"."seller_onboarding_progress_status_enum" NOT NULL DEFAULT 'not_stated', "is_id_verification_completed" boolean NOT NULL DEFAULT false, "is_face_verification_completed" boolean NOT NULL DEFAULT false, "is_store_profile_completed" boolean NOT NULL DEFAULT false, "is_admin_verification_completed" boolean NOT NULL DEFAULT false, "id_verification_status" "public"."seller_onboarding_progress_id_verification_status_enum" DEFAULT 'pending', "face_verification_status" "public"."seller_onboarding_progress_face_verification_status_enum" DEFAULT 'pending', "face_verification_data" jsonb, "store_profile_status" "public"."seller_onboarding_progress_store_profile_status_enum" DEFAULT 'pending', "rejection_reason" text, "reviewed_by_admin_id" uuid, "reviewed_at" TIMESTAMP, "store_profile_data" jsonb, "id_verification_data" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "completed_at" TIMESTAMP, "approved_at" TIMESTAMP, CONSTRAINT "UQ_2516f07a919c3d9387b56a0ec18" UNIQUE ("user_id"), CONSTRAINT "PK_648b073e7b0918e28ca4401121a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2af0071a01fd84496e48f20c56" ON "seller_onboarding_progress" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_1a0f8d1cf62202ee88a97b95a1" ON "seller_onboarding_progress" ("current_step") `);
        await queryRunner.query(`CREATE INDEX "IDX_ef0a72375b2c7b83fe4a88653c" ON "seller_onboarding_progress" ("status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2516f07a919c3d9387b56a0ec1" ON "seller_onboarding_progress" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "seller_onboarding_documents" ADD CONSTRAINT "FK_d7c35ec8b70a2f88aec1cce3e44" FOREIGN KEY ("onboarding_progress_id") REFERENCES "seller_onboarding_progress"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "seller_onboarding_progress" ADD CONSTRAINT "FK_2516f07a919c3d9387b56a0ec18" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "seller_onboarding_progress" DROP CONSTRAINT "FK_2516f07a919c3d9387b56a0ec18"`);
        await queryRunner.query(`ALTER TABLE "seller_onboarding_documents" DROP CONSTRAINT "FK_d7c35ec8b70a2f88aec1cce3e44"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2516f07a919c3d9387b56a0ec1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ef0a72375b2c7b83fe4a88653c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1a0f8d1cf62202ee88a97b95a1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2af0071a01fd84496e48f20c56"`);
        await queryRunner.query(`DROP TABLE "seller_onboarding_progress"`);
        await queryRunner.query(`DROP TYPE "public"."seller_onboarding_progress_store_profile_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."seller_onboarding_progress_face_verification_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."seller_onboarding_progress_id_verification_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."seller_onboarding_progress_status_enum"`);
        await queryRunner.query(`DROP TABLE "seller_onboarding_documents"`);
        await queryRunner.query(`DROP TYPE "public"."seller_onboarding_documents_verification_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."seller_onboarding_documents_documenttype_enum"`);
    }

}
