import { AppDataSource } from '../data-source';
import { seedLaunchPromotion } from './seed-launch-promotion';

async function bootstrap(): Promise<void> {
  console.log('Starting promotion seeding...');

  const dataSource = await AppDataSource.initialize();

  try {
    await seedLaunchPromotion(dataSource);
    console.log('Promotion seeding completed successfully.');
  } catch (error) {
    console.error('Promotion seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
}

bootstrap().catch((err) => {
  console.error('Failed to start application', err);
  process.exit(1);
});
