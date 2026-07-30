import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChatTable1785184761614 implements MigrationInterface {
  name = 'ChatTable1785184761614';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."messages_type_enum" AS ENUM('text', 'image', 'file', 'audio', 'system')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."messages_status_enum" AS ENUM('sent', 'delivered', 'read')`,
    );
    await queryRunner.query(
      `CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "conversationId" uuid NOT NULL, "senderId" uuid NOT NULL, "content" text, "type" "public"."messages_type_enum" NOT NULL DEFAULT 'text', "status" "public"."messages_status_enum" NOT NULL DEFAULT 'sent', "mediaUrl" character varying, "fileName" character varying, "replyToId" character varying, "deletedAt" TIMESTAMP WITH TIME ZONE, "isEdited" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_751332fc6cc6fc576c6975cd07" ON "messages" ("conversationId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."conversations_type_enum" AS ENUM('direct', 'group')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."conversations_lastmessagetype_enum" AS ENUM('text', 'image', 'file', 'audio', 'system')`,
    );
    await queryRunner.query(
      `CREATE TABLE "conversations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."conversations_type_enum" NOT NULL DEFAULT 'direct', "name" character varying, "lastMessagePreview" text, "lastMessageAt" TIMESTAMP WITH TIME ZONE, "lastMessageMediaUrl" character varying, "lastMessageFileName" character varying, "lastMessageType" "public"."conversations_lastmessagetype_enum", "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ee34f4f7ced4ec8681f26bf04ef" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chat_participants_role_enum" AS ENUM('member', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TABLE "chat_participants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "conversationId" uuid NOT NULL, "userId" uuid NOT NULL, "role" "public"."chat_participants_role_enum" NOT NULL DEFAULT 'member', "lastReadAt" TIMESTAMP WITH TIME ZONE, "isMuted" boolean NOT NULL DEFAULT false, "leftAt" TIMESTAMP WITH TIME ZONE, "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ebf68c52a2b4dceb777672b782d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_79a34cee1c3ef6075996fda91b" ON "chat_participants" ("conversationId", "userId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."call_sessions_type_enum" AS ENUM('video', 'voice')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."call_sessions_status_enum" AS ENUM('initiated', 'ringing', 'active', 'ended', 'declined', 'missed', 'cancelled', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "call_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "callerId" uuid NOT NULL, "calleeId" uuid NOT NULL, "type" "public"."call_sessions_type_enum" NOT NULL, "status" "public"."call_sessions_status_enum" NOT NULL DEFAULT 'initiated', "startedAt" TIMESTAMP WITH TIME ZONE, "endedAt" TIMESTAMP WITH TIME ZONE, "durationSeconds" integer, "conversationId" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_43019a4ddb87c365c3d13fbe9e0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dd79f737385a61710ba38f6b33" ON "call_sessions" ("calleeId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_025dac4eb122c220a752b8ccfe" ON "call_sessions" ("callerId", "createdAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "chatStatus" character varying(50) NOT NULL DEFAULT 'offline'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "last_seen_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_e5663ce0c730b2de83445e2fd19" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" ADD CONSTRAINT "FK_ffa48c8c78e4c4d0cb29bd6d123" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" ADD CONSTRAINT "FK_fb6add83b1a7acc94433d385692" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_sessions" ADD CONSTRAINT "FK_521c32a59a44cd7646c0d13c995" FOREIGN KEY ("callerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_sessions" ADD CONSTRAINT "FK_0b2d2b9f09f3881a3a708eb477d" FOREIGN KEY ("calleeId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "call_sessions" DROP CONSTRAINT "FK_0b2d2b9f09f3881a3a708eb477d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_sessions" DROP CONSTRAINT "FK_521c32a59a44cd7646c0d13c995"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" DROP CONSTRAINT "FK_fb6add83b1a7acc94433d385692"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" DROP CONSTRAINT "FK_ffa48c8c78e4c4d0cb29bd6d123"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_e5663ce0c730b2de83445e2fd19"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_seen_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "chatStatus"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_025dac4eb122c220a752b8ccfe"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dd79f737385a61710ba38f6b33"`,
    );
    await queryRunner.query(`DROP TABLE "call_sessions"`);
    await queryRunner.query(`DROP TYPE "public"."call_sessions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."call_sessions_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_79a34cee1c3ef6075996fda91b"`,
    );
    await queryRunner.query(`DROP TABLE "chat_participants"`);
    await queryRunner.query(`DROP TYPE "public"."chat_participants_role_enum"`);
    await queryRunner.query(`DROP TABLE "conversations"`);
    await queryRunner.query(
      `DROP TYPE "public"."conversations_lastmessagetype_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."conversations_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_751332fc6cc6fc576c6975cd07"`,
    );
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TYPE "public"."messages_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."messages_type_enum"`);
  }
}
