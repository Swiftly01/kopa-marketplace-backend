import { DataSource } from 'typeorm';
import {
  Location,
  LocationType,
} from '../../domain/location/entities/location.entity';
import nigeria from '../seeders/data/nigeria-lga.json';

function generateSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      //  .replace(/[\/,]+/g, ' ')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
  );
}

function generateCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12);
}

export async function seedLocations(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(Location);

  // Prevent duplicate seeding
  const existing = await repo.count();

  if (existing > 0) {
    console.log('Locations already seeded. Skipping...');
    return;
  }

  console.log('Seeding Nigeria locations...');

  // Create country root
  const nigeriaEntity = await repo.save(
    repo.create({
      code: 'NG',
      name: 'Nigeria',
      slug: 'nigeria',
      displayName: 'Nigeria',
      type: LocationType.COUNTRY,
      isActive: true,
      sortOrder: 1,
    }),
  );

  let stateSortOrder = 1;

  for (const state of nigeria) {
    const stateEntity = await repo.save(
      repo.create({
        code: generateCode(state.name).slice(0, 3),
        name: state.name,
        slug: generateSlug(state.name),
        displayName: state.name,
        type: LocationType.STATE,
        parent: nigeriaEntity, // TypeORM automatically sets parentId
        isActive: true,
        sortOrder: stateSortOrder++,
      }),
    );

    let lgaSortOrder = 1;

    for (const lga of state.lgas) {
      await repo.save(
        repo.create({
          // Unique hierarchical code, e.g. OS-OSOGBO
          code: `${stateEntity.code}-${generateCode(lga)}`,
          name: lga,
          slug: generateSlug(lga),
          displayName: `${lga}, ${state.name}`,
          type: LocationType.LGA,
          parent: stateEntity, // TypeORM automatically sets parentId
          isActive: true,
          sortOrder: lgaSortOrder++,
        }),
      );
    }

    console.log(`Seeded ${state.name} with ${state.lgas.length} LGAs`);
  }

  console.log('Nigeria locations seeded successfully');
}
