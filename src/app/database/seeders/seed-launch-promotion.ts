import { DataSource } from 'typeorm';
import {
  Promotion,
  PromotionAssetType,
  PromotionStatus,
} from '../../domain/promotions/entities/promotion.entity';

export async function seedLaunchPromotion(
  dataSource: DataSource,
): Promise<void> {
  const repo = dataSource.getRepository(Promotion);

  const existing = await repo.findOne({
    where: { name: 'Launch Day PDF Giveaway' },
  });
  if (existing) {
    console.log(`Promotion already seeded (id: ${existing.id})`);
    return;
  }

  const promo = repo.create({
    name: 'Launch Day PDF Giveaway',
    description:
      'The first 50 users to register get a free exclusive PDF download.',
    slotLimit: 50,
    assetUrl:
      'https://res.cloudinary.com/dgecvdtih/image/upload/v1781924242/NEW_CECILIA_NYSC_EBOOK_fwetqu.pdf',
    assetType: PromotionAssetType.PDF,
    status: PromotionStatus.ACTIVE,
    startsAt: null, // starts immediately
    endsAt: null, // no end date; closes when slots run out
  });

  const saved = await repo.save(promo);
  console.log(` Seeded promotion: ${saved.name} (id: ${saved.id})`);
  console.log(`   Share this ID with the frontend: ${saved.id}`);
}
