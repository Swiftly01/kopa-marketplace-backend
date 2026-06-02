import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import { SellerOnboardingProgress } from '../../sellers/entities/seller-onboarding-progress.entity';
import { UserRole } from '../../../common/enums/roles-enum';
import { SellerVerificationStatusEnum } from '../../../common/enums/seller-verification-status.enum';

// ─── Response shape ───────────────────────────────────────────────────────────

export interface DashboardOverview {
  stats: {
    totalUsers: number;
    totalListings: number;
    verifiedSellers: number;
    pendingApplications: number;
    activeNow: number;
  };
  currentlyActive: ActiveUser[];
  recentActivity: ActivityItem[];
}

export interface ActiveUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  lastLoginAt: Date;
}

export enum ActivityType {
  USER_REGISTERED = 'USER_REGISTERED',
  LISTING_CREATED = 'LISTING_CREATED',
  SELLER_APPLIED = 'SELLER_APPLIED',
  SELLER_APPROVED = 'SELLER_APPROVED',
  LISTING_DELETED = 'LISTING_DELETED',
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  actorId: string;
  actorName: string;
  actorEmail: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// ─── Threshold: users active within this window are "active now" ──────────────
const ACTIVE_WINDOW_MINUTES = 15;
const RECENT_ACTIVITY_LIMIT = 20;

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(SellerOnboardingProgress)
    private readonly sellerApplicationRepo: Repository<SellerOnboardingProgress>,
  ) {}

  async getDashboardOverview(): Promise<DashboardOverview> {
    const [stats, currentlyActive, recentActivity] = await Promise.all([
      this._getStats(),
      this._getActiveUsers(),
      this._getRecentActivity(),
    ]);

    return { stats, currentlyActive, recentActivity };
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  private async _getStats(): Promise<DashboardOverview['stats']> {
    const activeThreshold = this._activeThreshold();

    const [
      totalUsers,
      totalListings,
      verifiedSellers,
      pendingApplications,
      activeNow,
    ] = await Promise.all([
      // All non-deleted users
      this.userRepo.count({
        where: { deletedAt: IsNull() },
      }),

      // All non-deleted, active products
      this.productRepo.count({
        where: { deletedAt: IsNull(), isActive: true },
      }),

      // Users with role = 'seller' who are verified
      this.userRepo.count({
        where: { role: UserRole.SELLER, deletedAt: IsNull() },
      }),

      // Seller applications with status = 'pending'
      this.sellerApplicationRepo.count({
        where: { status: SellerVerificationStatusEnum.PENDING_REVIEW },
      }),

      // Users with lastLoginAt within the active window
      this.userRepo
        .createQueryBuilder('u')
        .where('u.deletedAt IS NULL')
        .andWhere('u.lastLoginAt >= :threshold', {
          threshold: activeThreshold,
        })
        .getCount(),
    ]);

    return {
      totalUsers,
      totalListings,
      verifiedSellers,
      pendingApplications,
      activeNow,
    };
  }

  // ─── Currently active users ──────────────────────────────────────────────────

  private async _getActiveUsers(): Promise<ActiveUser[]> {
    const threshold = this._activeThreshold();

    const users = await this.userRepo
      .createQueryBuilder('u')
      .select([
        'u.id',
        'u.firstName',
        'u.lastName',
        'u.email',
        'u.role',
        'u.lastLoginAt',
      ])
      .where('u.deletedAt IS NULL')
      .andWhere('u.lastLoginAt >= :threshold', { threshold })
      .orderBy('u.lastLoginAt', 'DESC')
      .limit(50)
      .getMany();

    return users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      lastLoginAt: u.lastLoginAt,
    }));
  }

  // ─── Recent activity ─────────────────────────────────────────────────────────
  // Merges the most recent users, products, and seller applications
  // into a unified activity feed, sorted by createdAt desc.

  private async _getRecentActivity(): Promise<ActivityItem[]> {
    const [recentUsers, recentProducts, recentApplications] = await Promise.all(
      [
        // Newly registered users
        this.userRepo
          .createQueryBuilder('u')
          .select([
            'u.id',
            'u.firstName',
            'u.lastName',
            'u.email',
            'u.role',
            'u.createdAt',
          ])
          .where('u.deletedAt IS NULL')
          .orderBy('u.createdAt', 'DESC')
          .limit(RECENT_ACTIVITY_LIMIT)
          .getMany(),

        // Recently created listings
        this.productRepo
          .createQueryBuilder('p')
          .leftJoinAndSelect('p.seller', 'seller')
          .select([
            'p.id',
            'p.name',
            'p.createdAt',
            'p.deletedAt',
            'seller.id',
            'seller.firstName',
            'seller.lastName',
            'seller.email',
          ])
          .orderBy('p.createdAt', 'DESC')
          .limit(RECENT_ACTIVITY_LIMIT)
          .getMany(),

        // Recent seller applications
        this.sellerApplicationRepo
          .createQueryBuilder('sa')
          .leftJoinAndSelect('sa.user', 'user')
          .select([
            'sa.id',
            'sa.status',
            'sa.createdAt',
            'user.id',
            'user.firstName',
            'user.lastName',
            'user.email',
          ])
          .orderBy('sa.createdAt', 'DESC')
          .limit(RECENT_ACTIVITY_LIMIT)
          .getMany(),
      ],
    );

    const items: ActivityItem[] = [
      ...recentUsers.map((u) => ({
        id: `user-reg-${u.id}`,
        type: ActivityType.USER_REGISTERED,
        actorId: u.id,
        actorName: `${u.firstName} ${u.lastName}`.trim(),
        actorEmail: u.email,
        description: `New ${u.role} registered`,
        metadata: { role: u.role },
        createdAt: u.createdAt,
      })),

      ...recentProducts.map((p) => ({
        id: `listing-${p.id}`,
        type: p.deletedAt
          ? ActivityType.LISTING_DELETED
          : ActivityType.LISTING_CREATED,

        actorId: p.seller?.id ?? '',
        actorName: p.seller
          ? `${p.seller.firstName} ${p.seller.lastName}`.trim()
          : 'Unknown',
        actorEmail: p.seller?.email ?? '',
        description: p.deletedAt
          ? `Listing "${p.name}" was deleted`
          : `New listing "${p.name}" created`,
        metadata: { productId: p.id, productName: p.name },
        createdAt: p.deletedAt ?? p.createdAt,
      })),

      ...recentApplications.map((sa) => ({
        id: `seller-app-${sa.id}`,
        type:
          sa.status === SellerVerificationStatusEnum.APPROVED
            ? ActivityType.SELLER_APPROVED
            : ActivityType.SELLER_APPLIED,

        actorId: sa.user?.id ?? '',
        actorName: sa.user
          ? `${sa.user.firstName} ${sa.user.lastName}`.trim()
          : 'Unknown',
        actorEmail: sa.user?.email ?? '',
        description:
          sa.status === SellerVerificationStatusEnum.APPROVED
            ? `Seller application approved`
            : `New seller application submitted`,
        metadata: { applicationId: sa.id, status: sa.status },
        createdAt: sa.createdAt,
      })),
    ];

    // Merge and return most recent RECENT_ACTIVITY_LIMIT items
    return items
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, RECENT_ACTIVITY_LIMIT);
  }

  // ─── Util ────────────────────────────────────────────────────────────────────

  private _activeThreshold(): Date {
    const d = new Date();
    d.setMinutes(d.getMinutes() - ACTIVE_WINDOW_MINUTES);
    return d;
  }
}
