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
import { LocationModule } from './location/location.module';
import { SavedProductModule } from './saved-products/saved-product.module';
import { PromotionModule } from './promotions/promotion.module';
import { ChatModule } from './chat/chat.module';
import { MessagesModule } from './messages/messages.module';
import { CallModule } from './call/call.module';
import { InteractionModule } from './interactions/interaction.module';
import { ReviewModule } from './reviews/review.module';
import interactionConfig from '../config/interaction.config';

//const ENV = process.env.NODE_ENV;
@Module({
  imports: [
    UserModule,
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      //envFilePath: !ENV ? '.env' : `.env.${ENV}`,
      load: [appConfig, databaseConfig, interactionConfig],
      validationSchema: environmentValidation,
    }),
    SellerModule,
    AdminModule,
    ProductModule,
    CategoryModule,
    LocationModule,
    SavedProductModule,
    PromotionModule,
    ChatModule,
    MessagesModule,
    CallModule,
    InteractionModule,
    ReviewModule,
  ],
})
export class DomainModule {}
