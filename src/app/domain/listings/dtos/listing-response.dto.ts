import { ListingStatus } from '../enums/listing-status.enum';
import { NegotiationStatus } from '../enums/negotiation-status.enum';

export interface ListingImageView {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  position: number;
}

// compact shape for lists and search results
export interface ListingCardView {
  id: string;
  slug: string;
  title: string;
  price: number;
  negotiable: NegotiationStatus;
  categoryId: string;
  stateCode: string;
  stateName: string;
  lgaName: string;
  status: ListingStatus;
  rating: number;
  reviewCount: number;
  // only set while the ad is rejected
  rejectionReason: string | null;
  thumbnailUrl: string | null;
  publishedAt: Date | null;
  createdAt: Date;
}

// list row of the admin review queue
export interface AdminListingCardView extends ListingCardView {
  seller: { id: string; name: string; email: string; phoneNumber: string } | null;
}

// full shape for the detail screen; `details` is category-specific
export interface ListingDetailView extends ListingCardView {
  description: string;
  videoUrl: string | null;
  views: number;
  category: { id: string; code: string; name: string };
  images: ListingImageView[];
  details: Record<string, unknown> | null;
  seller: PublicSellerView | null;
}

// what the public ad page shows about the seller (same details the product page shows)
export interface PublicSellerView {
  id: string;
  name: string;
  phoneNumber: string | null;
  isEmailVerified: boolean;
  joinedAt: Date | null;
}

// admin detail: the public detail plus how to reach the owner and the review history
export interface AdminListingDetailView extends ListingDetailView {
  seller: (PublicSellerView & { email: string }) | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
}
