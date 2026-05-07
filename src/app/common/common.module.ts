import { Global, Module } from '@nestjs/common';
import { PaginationModule } from './pagination/pagination.module';
import { QueryFilterProvider } from './providers/query-filter-provider';

@Global()
@Module({
  imports: [PaginationModule],
  providers: [QueryFilterProvider],
  exports: [QueryFilterProvider, PaginationModule],
})
export class CommonModule {}
