import {
  ListingCardView,
  ListingDetailView,
  ListingImageView,
} from '../dtos/listing-response.dto';
import { ListingImage } from '../entities/listing-image.entity';
import { Listing } from '../entities/listing.entity';

export function toImageView(image: ListingImage): ListingImageView {
  return {
    id: image.id,
    url: image.url,
    thumbnailUrl: image.thumbnailUrl,
    position: image.position,
  };
}

// the title picture is the image at the lowest position
function titleImage(images: ListingImage[] | undefined): ListingImage | null {
  if (!images?.length) return null;
  return images.reduce((first, image) =>
    image.position < first.position ? image : first,
  );
}

export function toCardView(listing: Listing): ListingCardView {
  const cover = titleImage(listing.images);
  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    price: listing.price,
    negotiable: listing.negotiable,
    categoryId: listing.categoryId,
    stateCode: listing.stateCode,
    stateName: listing.stateName,
    lgaName: listing.lgaName,
    status: listing.status,
    rating: Number(listing.rating ?? 0),
    reviewCount: listing.reviewCount ?? 0,
    rejectionReason: listing.rejectionReason,
    thumbnailUrl: cover ? (cover.thumbnailUrl ?? cover.url) : null,
    publishedAt: listing.publishedAt,
    createdAt: listing.createdAt,
  };
}

// expects category and images to be loaded; user is optional (public view only)
export function toDetailView(
  listing: Listing,
  details: Record<string, unknown> | null,
): ListingDetailView {
  const images = [...(listing.images ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  return {
    ...toCardView(listing),
    description: listing.description,
    videoUrl: listing.videoUrl,
    views: listing.views,
    category: {
      id: listing.category.id,
      code: listing.category.code,
      name: listing.category.name,
    },
    images: images.map(toImageView),
    details,
    seller: listing.user
      ? {
          id: listing.user.id,
          name: `${listing.user.firstName} ${listing.user.lastName}`.trim(),
          phoneNumber: listing.user.phoneNumber ?? null,
          isEmailVerified: Boolean(listing.user.isEmailVerified),
          joinedAt: listing.user.createdAt ?? null,
        }
      : null,
  };
}
