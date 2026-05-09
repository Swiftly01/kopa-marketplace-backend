import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOtpLogs1778345012414 implements MigrationInterface {
  name = 'AddOtpLogs1778345012414';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."otps_purpose_enum" AS ENUM('email_verification', 'password_reset')`,
    );
    await queryRunner.query(
      `CREATE TABLE "otps" ("id" SERIAL NOT NULL, "code" character varying NOT NULL, "purpose" "public"."otps_purpose_enum" NOT NULL, "isUsed" boolean NOT NULL DEFAULT false, "expiresAt" TIMESTAMP NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "isBlocked" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "PK_91fef5ed60605b854a2115d2410" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."oauth_accounts_provider_enum" AS ENUM('google', 'apple', 'github')`,
    );
    await queryRunner.query(
      `CREATE TABLE "oauth_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "provider" "public"."oauth_accounts_provider_enum" NOT NULL, "provider_id" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "profile_picture" text, "user_id" uuid NOT NULL, "last_login_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_710a81523f515b78f894e33bb10" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_283c974372e384adfc2c51ae18" ON "oauth_accounts" ("provider", "provider_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."seller_onboarding_documents_documenttype_enum" AS ENUM('id_front', 'id_back', 'selfie', 'store_logo')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."seller_onboarding_documents_verification_status_enum" AS ENUM('pending', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "seller_onboarding_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "onboarding_progress_id" uuid NOT NULL, "documentType" "public"."seller_onboarding_documents_documenttype_enum" NOT NULL, "cloudinary_public_id" character varying(500) NOT NULL, "cloudinary_url" text NOT NULL, "cloudinary_thumbnail_url" text, "original_file_name" character varying(255), "file_size" integer, "dimensions" character varying(50), "format" character varying(20), "verification_status" "public"."seller_onboarding_documents_verification_status_enum" NOT NULL DEFAULT 'pending', "rejection_reason" text, "reviewed_by_admin" uuid, "reviewed_at" TIMESTAMP, "cloudinary_metadata" jsonb, "admin_notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8f215fe90632429552a4c57d493" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."seller_onboarding_progress_status_enum" AS ENUM('not_stated', 'in_progress', 'pending_review', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."seller_onboarding_progress_id_verification_status_enum" AS ENUM('pending', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."seller_onboarding_progress_face_verification_status_enum" AS ENUM('pending', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."seller_onboarding_progress_store_profile_status_enum" AS ENUM('pending', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "seller_onboarding_progress" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "current_step" integer NOT NULL DEFAULT '1', "steps_completed" integer NOT NULL DEFAULT '0', "status" "public"."seller_onboarding_progress_status_enum" NOT NULL DEFAULT 'not_stated', "is_id_verification_completed" boolean NOT NULL DEFAULT false, "is_face_verification_completed" boolean NOT NULL DEFAULT false, "is_store_profile_completed" boolean NOT NULL DEFAULT false, "is_admin_verification_completed" boolean NOT NULL DEFAULT false, "id_verification_status" "public"."seller_onboarding_progress_id_verification_status_enum" DEFAULT 'pending', "face_verification_status" "public"."seller_onboarding_progress_face_verification_status_enum" DEFAULT 'pending', "face_verification_data" jsonb, "store_profile_status" "public"."seller_onboarding_progress_store_profile_status_enum" DEFAULT 'pending', "rejection_reason" text, "reviewed_by_admin_id" uuid, "reviewed_at" TIMESTAMP, "store_profile_data" jsonb, "id_verification_data" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "completed_at" TIMESTAMP, "approved_at" TIMESTAMP, CONSTRAINT "UQ_2516f07a919c3d9387b56a0ec18" UNIQUE ("user_id"), CONSTRAINT "REL_2516f07a919c3d9387b56a0ec1" UNIQUE ("user_id"), CONSTRAINT "PK_648b073e7b0918e28ca4401121a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2af0071a01fd84496e48f20c56" ON "seller_onboarding_progress" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1a0f8d1cf62202ee88a97b95a1" ON "seller_onboarding_progress" ("current_step") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ef0a72375b2c7b83fe4a88653c" ON "seller_onboarding_progress" ("status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2516f07a919c3d9387b56a0ec1" ON "seller_onboarding_progress" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "first_name" character varying(100) NOT NULL, "last_name" character varying(100) NOT NULL, "phone_number" character varying(20), "password" character varying(255), "role" character varying NOT NULL DEFAULT 'buyer', "is_email_verified" boolean NOT NULL DEFAULT false, "email_verification_token" character varying(255), "email_verification_token_expires_at" TIMESTAMP, "password_reset_token" character varying(255), "password_reset_token_expires_at" TIMESTAMP, "otp_secret" character varying(255), "is_otp_enabled" boolean NOT NULL DEFAULT false, "failed_login_attempts" integer NOT NULL DEFAULT '0', "locked_until" TIMESTAMP, "is_active" boolean NOT NULL DEFAULT true, "last_login_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_baf4ca2a5aa907023a2f3748be" ON "users" ("email_verification_token") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_17d1817f241f10a3dbafb169fd" ON "users" ("phone_number") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."password_reset_logs_status_enum" AS ENUM('pending', 'completed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "password_reset_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "token" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "status" "public"."password_reset_logs_status_enum" NOT NULL, "expires_at" TIMESTAMP NOT NULL, "completed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5a2466492ed9d71ecb1cdb211cc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f01f0067552ab4377ea660cf00" ON "password_reset_logs" ("token") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d3bdd60cbf2613e562dc5676b4" ON "password_reset_logs" ("userId", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."otp_logs_type_enum" AS ENUM('generate', 'verify_success', 'verify_failed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."otp_logs_delivery_channel_enum" AS ENUM('email', 'sms')`,
    );
    await queryRunner.query(
      `CREATE TABLE "otp_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "type" "public"."otp_logs_type_enum" NOT NULL, "delivery_channel" "public"."otp_logs_delivery_channel_enum" NOT NULL DEFAULT 'email', "recipient" character varying(255) NOT NULL, "ip_address" character varying(50), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e40afc7741f20895f967dc22d85" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_afa8768be4cf53168a70da662c" ON "otp_logs" ("user_id", "type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ed045cc5ec0aadf373a2dfee1c" ON "otp_logs" ("user_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."email_verification_logs_status_enum" AS ENUM('pending', 'verified', 'expired')`,
    );
    await queryRunner.query(
      `CREATE TABLE "email_verification_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "status" "public"."email_verification_logs_status_enum" NOT NULL DEFAULT 'pending', "verified_at" TIMESTAMP, "expires_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c543ff99b383ed6349a5c45f1af" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a169ea7130edbcec83e8dac8bf" ON "email_verification_logs" ("token") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a308ae46f407e7503afffbc282" ON "email_verification_logs" ("user_id", "created_at") `,
    );
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
      `CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(100) NOT NULL, "name" character varying(100) NOT NULL, "slug" character varying(150) NOT NULL, "description" character varying(300), "icon" character varying(50), "parent_id" uuid, "is_active" boolean NOT NULL DEFAULT true, "is_featured" boolean NOT NULL DEFAULT false, "sort_order" integer NOT NULL DEFAULT '0', "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_77d7eff8a7aaa05457a12b8007a" UNIQUE ("code"), CONSTRAINT "UQ_420d9f679d41281f282f5bc7d09" UNIQUE ("slug"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_083b4657d537e819d86961f4aa" ON "categories" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_88cea2dc9c31951d06437879b4" ON "categories" ("parent_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_420d9f679d41281f282f5bc7d0" ON "categories" ("slug") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_77d7eff8a7aaa05457a12b8007" ON "categories" ("code") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."products_status_enum" AS ENUM('draft', 'active', 'inactive', 'removed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."products_condition_enum" AS ENUM('new', 'like_new', 'good', 'fair')`,
    );
    await queryRunner.query(
      `CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "seller_id" uuid NOT NULL, "name" character varying(200) NOT NULL, "description" text, "category_id" uuid NOT NULL, "price" bigint NOT NULL, "discount_percentage" integer NOT NULL DEFAULT '0', "stock" integer NOT NULL DEFAULT '0', "sku" character varying(100), "location" character varying(100) NOT NULL, "status" "public"."products_status_enum" NOT NULL DEFAULT 'draft', "is_active" boolean NOT NULL DEFAULT true, "condition" "public"."products_condition_enum" NOT NULL DEFAULT 'new', "views" integer NOT NULL DEFAULT '0', "rating" numeric(3,2) NOT NULL DEFAULT '0', "reviewCount" integer NOT NULL DEFAULT '0', "attributes" jsonb, "slug" character varying(255), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_c44ac33a05b144dd0d9ddcf9327" UNIQUE ("sku"), CONSTRAINT "UQ_464f927ae360106b783ed0b4106" UNIQUE ("slug"), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
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
      `CREATE INDEX "IDX_425ee27c69d6b8adc5d6475dcf" ON "products" ("seller_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9a5f6868c96e0069e699f33e12" ON "products" ("category_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "otps" ADD CONSTRAINT "FK_3938bb24b38ad395af30230bded" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oauth_accounts" ADD CONSTRAINT "FK_22a05e92f51a983475f9281d3b0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_onboarding_documents" ADD CONSTRAINT "FK_d7c35ec8b70a2f88aec1cce3e44" FOREIGN KEY ("onboarding_progress_id") REFERENCES "seller_onboarding_progress"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_onboarding_progress" ADD CONSTRAINT "FK_2516f07a919c3d9387b56a0ec18" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_logs" ADD CONSTRAINT "FK_0f3c207d1b0e80b51164b317ad2" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_logs" ADD CONSTRAINT "FK_95c760086ec4292bbbef02dbd12" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification_logs" ADD CONSTRAINT "FK_77d47d1e9bfd25b777b463c8b95" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" ADD CONSTRAINT "FK_4f166bb8c2bfcef2498d97b4068" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_425ee27c69d6b8adc5d6475dcfe" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_9a5f6868c96e0069e699f33e124" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_9a5f6868c96e0069e699f33e124"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_425ee27c69d6b8adc5d6475dcfe"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" DROP CONSTRAINT "FK_4f166bb8c2bfcef2498d97b4068"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification_logs" DROP CONSTRAINT "FK_77d47d1e9bfd25b777b463c8b95"`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_logs" DROP CONSTRAINT "FK_95c760086ec4292bbbef02dbd12"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_logs" DROP CONSTRAINT "FK_0f3c207d1b0e80b51164b317ad2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_onboarding_progress" DROP CONSTRAINT "FK_2516f07a919c3d9387b56a0ec18"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_onboarding_documents" DROP CONSTRAINT "FK_d7c35ec8b70a2f88aec1cce3e44"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oauth_accounts" DROP CONSTRAINT "FK_22a05e92f51a983475f9281d3b0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "otps" DROP CONSTRAINT "FK_3938bb24b38ad395af30230bded"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9a5f6868c96e0069e699f33e12"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_425ee27c69d6b8adc5d6475dcf"`,
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
      `DROP INDEX "public"."IDX_77d7eff8a7aaa05457a12b8007"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_420d9f679d41281f282f5bc7d0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_88cea2dc9c31951d06437879b4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_083b4657d537e819d86961f4aa"`,
    );
    await queryRunner.query(`DROP TABLE "categories"`);
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
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a308ae46f407e7503afffbc282"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a169ea7130edbcec83e8dac8bf"`,
    );
    await queryRunner.query(`DROP TABLE "email_verification_logs"`);
    await queryRunner.query(
      `DROP TYPE "public"."email_verification_logs_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ed045cc5ec0aadf373a2dfee1c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_afa8768be4cf53168a70da662c"`,
    );
    await queryRunner.query(`DROP TABLE "otp_logs"`);
    await queryRunner.query(
      `DROP TYPE "public"."otp_logs_delivery_channel_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."otp_logs_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d3bdd60cbf2613e562dc5676b4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f01f0067552ab4377ea660cf00"`,
    );
    await queryRunner.query(`DROP TABLE "password_reset_logs"`);
    await queryRunner.query(
      `DROP TYPE "public"."password_reset_logs_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_17d1817f241f10a3dbafb169fd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_baf4ca2a5aa907023a2f3748be"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2516f07a919c3d9387b56a0ec1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ef0a72375b2c7b83fe4a88653c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1a0f8d1cf62202ee88a97b95a1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2af0071a01fd84496e48f20c56"`,
    );
    await queryRunner.query(`DROP TABLE "seller_onboarding_progress"`);
    await queryRunner.query(
      `DROP TYPE "public"."seller_onboarding_progress_store_profile_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."seller_onboarding_progress_face_verification_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."seller_onboarding_progress_id_verification_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."seller_onboarding_progress_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "seller_onboarding_documents"`);
    await queryRunner.query(
      `DROP TYPE "public"."seller_onboarding_documents_verification_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."seller_onboarding_documents_documenttype_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_283c974372e384adfc2c51ae18"`,
    );
    await queryRunner.query(`DROP TABLE "oauth_accounts"`);
    await queryRunner.query(
      `DROP TYPE "public"."oauth_accounts_provider_enum"`,
    );
    await queryRunner.query(`DROP TABLE "otps"`);
    await queryRunner.query(`DROP TYPE "public"."otps_purpose_enum"`);
  }
}
