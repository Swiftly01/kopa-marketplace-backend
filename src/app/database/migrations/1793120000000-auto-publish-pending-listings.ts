import { MigrationInterface, QueryRunner } from 'typeorm';

// ads no longer wait for approval: publish the ones still queued and never reviewed
export class AutoPublishPendingListings1793120000000 implements MigrationInterface {
  name = 'AutoPublishPendingListings1793120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "listings" SET "status" = 'active', "published_at" = COALESCE("published_at", now()) WHERE "status" = 'pending_review' AND "reviewed_at" IS NULL`,
    );
  }

  public async down(): Promise<void> {
    // not reversible: the previous status of each row is not kept
  }
}
