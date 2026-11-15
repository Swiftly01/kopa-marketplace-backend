import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../../common/enums/roles-enum';
import { AppLogger } from '../../../logger/logger.service';
import { BroadcastAudience } from '../../../notification/dtos/broadcast-notification.dto';
import { NotificationChannel } from '../../../notification/enums/notification-channel.enum';
import { NotificationType } from '../../../notification/enums/notification-type.enum';
import { NotificationBroadcastService } from '../../../notification/services/notification-broadcast.service';
import { NewProductListingEmailData } from '../../../notification/templates/template.service';
import { Listing } from '../entities/listing.entity';
import { ListingStatus } from '../enums/listing-status.enum';

// tells buyers when a new ad goes live (the listings equivalent of the old product notification)
@Injectable()
export class ListingNotifyService {
  constructor(
    @InjectRepository(Listing)
    private readonly listings: Repository<Listing>,
    private readonly broadcast: NotificationBroadcastService,
    private readonly config: ConfigService,
    private readonly logger: AppLogger,
  ) {}

  // fire-and-forget safe: never throws, so it can't break publish/approve
  notifyBuyersOfNewListing(listingId: string): void {
    this.send(listingId).catch((error: unknown) => {
      this.logger.error(
        `Failed to notify buyers of new ad ${listingId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
        ListingNotifyService.name,
      );
    });
  }

  private async send(listingId: string): Promise<void> {
    const listing = await this.listings.findOne({
      where: { id: listingId },
      relations: ['images', 'user', 'category'],
    });

    // only live ads are announced
    if (!listing || listing.status !== ListingStatus.ACTIVE) {
      return;
    }

    const frontendUrl = this.config.get<string>('appConfig.frontEndUrl') ?? '';
    const appName = this.config.get<string>('appConfig.appName') ?? 'Kopa Mart';
    const whatsappNumber = this.config.get<string>(
      'appConfig.supportWhatsappNumber',
    );

    const images = (listing.images ?? [])
      .slice()
      .sort((a, b) => a.position - b.position);
    const [mainImage, ...others] = images;

    // price is stored in whole Naira
    const priceDisplay = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(listing.price);

    const sellerName =
      `${listing.user?.firstName ?? ''} ${listing.user?.lastName ?? ''}`.trim() ||
      'A Kopa Mart seller';

    const emailData: NewProductListingEmailData = {
      productName: listing.title,
      priceDisplay,
      categoryName: listing.category?.name ?? 'General',
      conditionLabel: '',
      locationLabel: `${listing.lgaName}, ${listing.stateName}`,
      storeName: sellerName,
      shortDescription: listing.description ?? '',
      mainImageUrl: mainImage?.url ?? '',
      thumbnailUrls: others.slice(0, 3).map((image) => image.url),
      productUrl: `${frontendUrl}/listing/${listing.slug}`,
      marketplaceLogoUrl: this.config.get<string>('appConfig.appLogoUrl'),
      contactEmail: this.config.get<string>('appConfig.mailFrom'),
      unsubscribeUrl: `${frontendUrl}/unsubscribe`,
      preferencesUrl: `${frontendUrl}/notifications`,
      facebookUrl: this.config.get<string>('appConfig.facebookUrl'),
      instagramUrl: this.config.get<string>('appConfig.instagramUrl'),
      twitterUrl: this.config.get<string>('appConfig.twitterUrl'),
      whatsappUrl: whatsappNumber
        ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`
        : undefined,
    };

    await this.broadcast.broadcast({
      audience: BroadcastAudience.ALL,
      roleFilter: UserRole.BUYER,
      type: NotificationType.NEW_PRODUCT_LISTING,
      title: `✨ ${listing.title} just landed on ${appName}`,
      body: `${listing.title} is now available for ${priceDisplay} from ${sellerName}.`,
      channels: [NotificationChannel.PUSH],
      data: emailData as unknown as Record<string, unknown>,
      // same key per ad, so republishing or approving later can't double-send
      broadcastKey: `new-listing_${listing.id}`,
    });

    this.logger.log(
      `Queued new-ad notification to BUYER role for listing ${listing.id}`,
      ListingNotifyService.name,
    );
  }
}
