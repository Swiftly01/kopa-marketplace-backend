import { Module } from '@nestjs/common';
import { UserModule } from './users/user.module';
import { ConfigModule } from '@nestjs/config';
import appConfig from '../config/app.config';
import environmentValidation from '../config/environment.validation';
import databaseConfig from '../config/database.config';
import { AuthModule } from '../auth/auth.module';
import { SellerModule } from './sellers/seller.module';
import { AdminModule } from './admin/admin.module';
import { ProductModule } from './products/product.module';
import { CategoryModule } from './category/category.module';

//const ENV = process.env.NODE_ENV;
@Module({
  imports: [
    UserModule,
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      // envFilePath: !ENV ? '.env' : `.env.${ENV}`,
      load: [appConfig, databaseConfig],
      validationSchema: environmentValidation,
    }),
    SellerModule,
    AdminModule,
    ProductModule,
    CategoryModule,
  ],
})
export class DomainModule {}
