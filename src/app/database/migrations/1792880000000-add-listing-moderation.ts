import { MigrationInterface, QueryRunner } from 'typeorm';

// adds the admin review columns; statuses are plain varchar so no enum change is needed
export class AddListingModeration1792880000000 implements MigrationInterface {
  name = 'AddListingModeration1792880000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "listings" ADD "rejection_reason" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" ADD "reviewed_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`ALTER TABLE "listings" ADD "reviewed_by" uuid`);
    // ads that were live before moderation existed stay live (they keep status 'active')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // pending/rejected ads go back to draft so the old code can still handle them
    await queryRunner.query(
      `UPDATE "listings" SET "status" = 'draft' WHERE "status" IN ('pending_review', 'rejected')`,
    );
    await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "reviewed_by"`);
    await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "reviewed_at"`);
    await queryRunner.query(
      `ALTER TABLE "listings" DROP COLUMN "rejection_reason"`,
    );
  }
}
