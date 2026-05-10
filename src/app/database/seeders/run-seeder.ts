import { AppDataSource } from '../data-source';
import { seedLocations } from './location.seeder';
import { error } from 'console';

async function bootstrap(): Promise<void> {
  console.log('Starting location seeding...');

  const dataSource = await AppDataSource.initialize();

  try {
    await seedLocations(dataSource);
    console.log('Location seeding completed successfully.');
  } catch (error) {
    console.error('Location seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
}

bootstrap().catch(() => {
  console.error('Failed to start application', error);
  process.exit(1);
});
