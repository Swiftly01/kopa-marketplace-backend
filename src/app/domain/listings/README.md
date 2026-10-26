# Listings module (backend)

Lets users post ads (a house for rent, later phones, cars, ...) in the style of jiji.ng.

The module is built so that **every category shares one core** and **each category plugs in
its own fields**. Adding a category never means changing the core code.

---

## 1. The big idea

```
                    ┌─────────────────────────────────────────────┐
                    │                CORE (same for all)          │
                    │  Listing + ListingImage + ListingService    │
                    │  title, description, price, photos, place   │
                    └───────────────┬─────────────────────────────┘
                                    │ asks "who handles this category?"
                                    ▼
                          ListingCategoryRegistry
                     (category code  ->  handler class)
                                    │
              ┌─────────────────────┼──────────────────────┐
              ▼                     ▼                      ▼
     PropertyRentHandler     (future) PhoneHandler   (future) CarHandler
     table: property_rent_   table: phone_details    table: car_details
            details
```

Three rules keep it clean:

1. **The core never imports a concrete category.** It only talks to the
   `ListingCategoryHandler` interface.
2. **Each category owns its own table** (`property_rent_details`, ...) joined to a listing
   by `listing_id`. Core columns stay small; no giant table full of nullable columns.
3. **The backend describes the form.** `GET /listings/categories/:id/form` returns the
   fields, options, required flags and limits. The app draws the form from that, so a new
   category needs **no app release**.

---

## 2. The posting flow

```
1. GET   /listings/categories              which categories can I post into?
2. GET   /listings/categories/:id/form     what does the form look like?
3. POST  /listings                         save a DRAFT (core + details)
4. POST  /listings/:id/images              upload photos (multipart, field "images")
5. POST  /listings/:id/publish             needs >= 5 photos, becomes ACTIVE
```

Listing status: `draft -> active <-> inactive`, and `removed` (soft deleted).

### All endpoints

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/listings/categories` | logged in | Category tree (only branches that accept ads) |
| GET | `/listings/categories/:categoryId/form` | logged in | Form description for a category |
| POST | `/listings` | logged in | Create a draft |
| PATCH | `/listings/:id` | owner | Edit core fields and/or `details` |
| POST | `/listings/:id/images` | owner | Add photos (appended after existing ones) |
| PATCH | `/listings/:id/images/order` | owner | Reorder photos (`{ imageIds: [...] }`) |
| DELETE | `/listings/:id/images/:imageId` | owner | Remove one photo |
| POST | `/listings/:id/publish` | owner | Make it live |
| POST | `/listings/:id/deactivate` | owner | Pause a live ad |
| DELETE | `/listings/:id` | owner | Soft delete + remove photos from storage |
| GET | `/listings/mine` | logged in | My ads (`?status=&page=&limit=&search=`) |
| GET | `/listings/:id` | owner | One of my ads, any status |
| GET | `/listings` | public | Browse live ads (`categoryId, stateCode, lgaName, minPrice, maxPrice, search`) |
| GET | `/listings/slug/:slug` | public | Public ad page (live ads only) |

All replies look like `{ success, message, data }`. Validation errors look like
`{ statusCode: 400, error: 'ValidationError', message: [{ field, message }] }`, the same as
the rest of the API. Fields inside `details` are reported as `details.bedrooms` etc.

Other people's ads return **404**, not 403, so ids are not leaked.

---

## 3. Folder map and what every file does

```
listings/
├── listing.module.ts
├── controllers/
│   └── listing.controller.ts
├── services/
│   ├── listing.service.ts
│   ├── listing-image.service.ts
│   └── listing-category.service.ts
├── categories/
│   ├── listing-categories.ts
│   ├── listing-category-handler.interface.ts
│   ├── base-listing-category.handler.ts
│   ├── listing-category.registry.ts
│   └── property-rent/
│       ├── property-rent.constants.ts
│       ├── property-rent.enums.ts
│       ├── property-rent-details.entity.ts
│       ├── property-rent-details.dto.ts
│       ├── property-rent.form.ts
│       └── property-rent.handler.ts
├── entities/
│   ├── listing.entity.ts
│   └── listing-image.entity.ts
├── dtos/
│   ├── create-listing.dto.ts
│   ├── update-listing.dto.ts
│   ├── listing-query.dto.ts
│   ├── reorder-images.dto.ts
│   └── listing-response.dto.ts
├── mappers/
│   └── listing.mapper.ts
├── form-schema/
│   ├── form-schema.types.ts
│   ├── core-fields.ts
│   ├── field-builders.ts
│   └── option.utils.ts
├── enums/
│   ├── listing-status.enum.ts
│   └── negotiation-status.enum.ts
├── constants/
│   └── listing.constants.ts
└── utils/
    ├── bigint.transformer.ts
    ├── cloudinary-folder.util.ts
    ├── pick-defined.ts
    ├── slug.util.ts
    ├── trim.decorator.ts
    └── validation-errors.ts
```

### Wiring

| File | Purpose |
|---|---|
| `listing.module.ts` | Registers everything with Nest. Reads `LISTING_CATEGORIES` and automatically provides every handler, registers every category entity with TypeORM, and builds the handler list the registry receives. You rarely edit this. |

### Controller

| File | Purpose |
|---|---|
| `controllers/listing.controller.ts` | HTTP layer only: routes, guards, file-upload settings, `{ success, message, data }` wrapping. No business logic. Static routes (`categories`, `mine`) are declared before `:id` so `:id` never swallows them. |

### Services (the business logic)

| File | Class | Purpose |
|---|---|---|
| `services/listing.service.ts` | `ListingService` | The listing lifecycle: `create` (draft), `update`, `publish` (checks the photo minimum), `deactivate`, `remove`, `getOwned`, `getPublicBySlug`, `listMine`, `search`. Works for **every** category; it validates `details` through the handler and saves core + details in one transaction. |
| `services/listing-image.service.ts` | `ListingImageService` | The photo gallery: upload to Cloudinary (all or nothing, cleans up on failure), delete (and close the gap in positions), reorder, enforce min/max rules. Locks the listing row in a transaction so two uploads cannot clash. |
| `services/listing-category.service.ts` | `ListingCategoryService` | Answers "where can I post?" (category tree filtered to categories with a handler) and "what does the form look like?" `requirePostable` is the single check that a category is active and has a handler. |

### Category plug-in system (`categories/`)

| File | Purpose |
|---|---|
| `listing-category-handler.interface.ts` | The **contract** every category implements: `categoryCode`, `formVersion`, `buildFormFields()`, `validateDetails()`, `saveDetails()`, `findDetails()`. Also holds the `LISTING_CATEGORY_HANDLERS` injection token. |
| `base-listing-category.handler.ts` | `BaseListingCategoryHandler`: shared plumbing so a category only writes what is unique. It already implements validation (class-validator, same error format as the rest of the API), saving and loading. A category just supplies its DTO class, entity class, and two mapping functions. |
| `listing-category.registry.ts` | `ListingCategoryRegistry`: a lookup `category code -> handler`. **Throws at startup** if two handlers claim the same code, instead of failing on the first user. `get()` returns a clear 400 if a category has no handler. |
| `listing-categories.ts` | **The one list where you register a new category** (handler class + its entities). |

### First category: Houses & Apartments for Rent (`categories/property-rent/`)

| File | Purpose |
|---|---|
| `property-rent.constants.ts` | The category code (`houses_apartments_for_rent`, must match the seeded `categories.code`), form version, field length limits, room-count limits, "Popular" bedroom/bathroom values. |
| `property-rent.enums.ts` | Property type, condition, furnishing, listed-by, facilities, minimum rental period, price period. Each enum is paired with a `Record<Enum, string>` label map, so **adding an enum value without a label will not compile**. |
| `property-rent-details.entity.ts` | The `property_rent_details` table (one row per listing, linked by `listing_id`). |
| `property-rent-details.dto.ts` | Validation rules for the `details` object (address max 60, bedrooms 1-20, enums, ...). |
| `property-rent.form.ts` | The ordered list of form fields, mirroring the "Post new ad" screen top to bottom. Mixes shared fields (`coreFields.*`) and its own (`field.*`). |
| `property-rent.handler.ts` | `PropertyRentHandler extends BaseListingCategoryHandler`. Only contains `toRow` (DTO -> table row, using `null` for omitted optional columns so edits fully replace old values) and `toView` (row -> API shape). |

### Entities (`entities/`)

| File | Purpose |
|---|---|
| `listing.entity.ts` | Table `listings`: owner, category, title, unique `slug`, description, `price` (whole Naira, bigint), `negotiable`, `videoUrl`, location (`stateCode`, `stateName`, `lgaName`), `status`, `views`, `publishedAt`, soft delete. Indexed for the common queries. |
| `listing-image.entity.ts` | Table `listing_images`: url, thumbnail, Cloudinary `publicId`, `position` (0 = title picture), format, size. |

### DTOs (`dtos/`)

| File | Purpose |
|---|---|
| `create-listing.dto.ts` | Core fields for creating a draft. `details` is only checked as "an object" here; the category handler validates its contents. |
| `update-listing.dto.ts` | Same fields, all optional. Category cannot change. If `details` is sent it **replaces** the stored details (send the whole object). `stateCode` and `lgaName` must come together. |
| `listing-query.dto.ts` | Query strings for public browse (`ListingQueryDto`) and my ads (`MyListingsQueryDto`). Both extend the existing pagination DTO. |
| `reorder-images.dto.ts` | `{ imageIds: [...] }`, in the order you want; first becomes the title picture. |
| `listing-response.dto.ts` | The shapes sent to clients: `ListingCardView` (lists) and `ListingDetailView` (detail page). |

### Mapper

| File | Purpose |
|---|---|
| `mappers/listing.mapper.ts` | Entity -> response shape (`toCardView`, `toDetailView`, `toImageView`). Keeps entities from leaking to clients. |

### Form description (`form-schema/`)

| File | Purpose |
|---|---|
| `form-schema.types.ts` | The types of the form description: `FormField`, `FormFieldType` (`text`, `textarea`, `number`, `url`, `select`, `multiselect`, `radio`, `checkbox`, `photos`, `location`), `ListingFormSchema`. This is the contract with the app. A field's `key` is its place in the request (`title`, `details.bedrooms`). |
| `core-fields.ts` | Ready-made shared fields: title, photos, video link, location, description, price, negotiable. Categories place them wherever they like. |
| `field-builders.ts` | Short helpers for category-specific fields: `field.text`, `field.number`, `field.checkbox`, `field.select`, `field.multiselect`. |
| `option.utils.ts` | `enumOptions(labels)` turns an enum label map into picker options; `numberOptions(from, to, popular)` builds number pickers with the "Popular" values first. |

### Enums and constants

| File | Purpose |
|---|---|
| `enums/listing-status.enum.ts` | `draft`, `active`, `inactive`, `removed`. |
| `enums/negotiation-status.enum.ts` | `yes`, `no`, `not_sure` plus display labels. |
| `constants/listing.constants.ts` | Platform-wide rules in one place: min 5 photos to publish, max 20, 10 MB per photo, allowed formats, title/description lengths, `MAX_PRICE`, video-link pattern, Cloudinary root folder. Change a rule here and the whole module follows. |

### Utils

| File | Purpose |
|---|---|
| `utils/bigint.transformer.ts` | Postgres returns `bigint` as text; this turns it into a number. |
| `utils/cloudinary-folder.util.ts` | Builds the photo folder `kopamart/listings/<userId>/<listingId>`. |
| `utils/pick-defined.ts` | Drops `undefined` keys so a partial update never overwrites a column with nothing (keeps `null`). |
| `utils/slug.util.ts` | Title -> URL slug with a random suffix, so identical titles never collide. |
| `utils/trim.decorator.ts` | `@Trim()` for DTO string fields. |
| `utils/validation-errors.ts` | Builds the same 400 error shape as the global validation pipe, used for `details`. |

### Files outside this folder that were touched

| File | Change |
|---|---|
| `database/migrations/…-add-listings.ts` | Creates `listings`, `listing_images`, `property_rent_details`, and seeds the Property > Houses & Apartments for Rent categories. |
| `database/database.module.ts` | Added the three new entities to the entity list. |
| `domain/domain.module.ts` | Imports `ListingModule`. |
| `domain/location/location.service.ts` | Added `resolveLocality(stateCode, lgaName)`: validates the state and local area and returns canonical names. |

---

## 4. How to add a new category (example: "Phones for Sale")

Everything below is **new files in a new folder**, plus one line in the registration list.

### Step 1: folder
Create `categories/phones/` with these files (mirror `property-rent/`):

### Step 2: constants and enums
```ts
// phones.constants.ts
export const PHONES_CATEGORY_CODE = 'phones_for_sale'; // must match categories.code
export const PHONES_FORM_VERSION = 1;
```
```ts
// phones.enums.ts
export enum PhoneBrand { APPLE = 'apple', SAMSUNG = 'samsung', TECNO = 'tecno' }
export const PHONE_BRAND_LABELS: Record<PhoneBrand, string> = {
  [PhoneBrand.APPLE]: 'Apple',
  [PhoneBrand.SAMSUNG]: 'Samsung',
  [PhoneBrand.TECNO]: 'Tecno',
};
```

### Step 3: the table (entity)
```ts
// phone-details.entity.ts
@Entity('phone_details')
export class PhoneDetails {
  @PrimaryGeneratedColumn('uuid') id!: string;

  @OneToOne(() => Listing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing!: Listing;

  @Column({ name: 'listing_id', type: 'uuid' }) listingId!: string; // required name
  @Column({ type: 'varchar', length: 30 }) brand!: PhoneBrand;
  @Column({ type: 'smallint', nullable: true }) storageGb!: number | null;
}
```
The base handler needs the property called **`listingId`**.

### Step 4: validation of `details` (DTO)
```ts
// phone-details.dto.ts
export class PhoneDetailsDto {
  @IsEnum(PhoneBrand) brand!: PhoneBrand;
  @IsOptional() @IsInt() @Min(1) storageGb?: number;
}
```

### Step 5: the form
```ts
// phones.form.ts
export function buildPhonesForm(): FormField[] {
  return [
    coreFields.title(),
    coreFields.photos(),
    coreFields.location('Location'),
    field.select('details.brand', 'Brand', enumOptions(PHONE_BRAND_LABELS), { required: true, searchable: true }),
    field.number('details.storageGb', 'Storage (GB)'),
    coreFields.description(),
    coreFields.price(),
    coreFields.negotiable(),
  ];
}
```
Order here = order on screen.

### Step 6: the handler
```ts
// phones.handler.ts
@Injectable()
export class PhonesHandler extends BaseListingCategoryHandler<PhoneDetailsDto, PhoneDetails> {
  readonly categoryCode = PHONES_CATEGORY_CODE;
  readonly formVersion = PHONES_FORM_VERSION;
  protected readonly detailsDto = PhoneDetailsDto;
  protected readonly detailsEntity = PhoneDetails;

  buildFormFields() { return buildPhonesForm(); }

  protected toRow(listingId: string, input: PhoneDetailsDto) {
    return { listingId, brand: input.brand, storageGb: input.storageGb ?? null };
  }
  protected toView(row: PhoneDetails) {
    return { brand: row.brand, storageGb: row.storageGb };
  }
}
```
Always map omitted optional fields to `null` in `toRow`, otherwise editing an ad cannot clear a value.

### Step 7: register it (the one line in shared code)
```ts
// categories/listing-categories.ts
export const LISTING_CATEGORIES: ListingCategoryRegistration[] = [
  { handler: PropertyRentHandler, entities: [PropertyRentDetails] },
  { handler: PhonesHandler, entities: [PhoneDetails] }, // <-- add
];
```

### Step 8: database
1. Add `PhoneDetails` to the `entities` array in `database/database.module.ts` (the project lists entities explicitly).
2. Create a migration for the `phone_details` table **and** the category rows
   (`phones_for_sale`, with the parent category you want). Copy the shape of `add-listings.ts`.
3. Run `typeorm migration:generate` afterwards; it should report no changes.

### Step 9: done
Restart. `GET /listings/categories` now lists the category and
`GET /listings/categories/:id/form` returns the new form. The app shows it with no change.
Core files (`ListingService`, controller, entities) are untouched.

---

## 5. How to add other kinds of features

| I want to... | Do this |
|---|---|
| Change a platform rule (photo count, size, title length) | Edit `constants/listing.constants.ts` only. |
| Add a value to a dropdown (e.g. a new property type) | Add it to the enum **and** its label map in `property-rent.enums.ts` (the compiler forces the label). No migration needed, columns are plain varchar. |
| Remove or reorder a field in a form | Edit the category's `*.form.ts`. Bump `formVersion` in its constants. |
| Add a field to an existing category | Add a column (entity + migration), a DTO property, a form field, and map it in `toRow` and `toView`. |
| Add a brand-new kind of input (e.g. date) | Add the type to `FormFieldType` in `form-schema.types.ts`, a builder in `field-builders.ts`, and a case in the frontend `DynamicField`. |
| Filter public browse by a category field (e.g. bedrooms) | Add the optional query param to `listing-query.dto.ts` and join the details table in `ListingService.search`. If many categories need it, add an optional `applyFilters()` to the handler contract. |
| Add moderation (review before live) | Add a `pending_review` status, make `publish` set it, add an admin approve endpoint. |
| Add listing edit in the app | The backend is ready: `PATCH /listings/:id`, plus the image endpoints. |

---

## 6. Design decisions worth knowing

- **Draft first, then photos, then publish.** Photos can be 10 MB each, which does not fit in a JSON body, and a draft lets a failed upload be retried without retyping.
- **Photos are all-or-nothing.** If one of five uploads fails, the ones that succeeded are deleted from Cloudinary.
- **Positions are always contiguous** (0, 1, 2, ...). Deleting a photo closes the gap; position 0 is the title picture.
- **A published ad cannot drop below 5 photos.**
- **Details are replaced, not merged, on edit.** Simple and predictable: the app always sends the whole form.
- **Slugs never change** when the title is edited, so shared links keep working.
- **`price` is whole Naira**, stored as bigint and converted to a number by `bigint.transformer.ts`.
- **Deleting an ad** soft-deletes the row (kept for audit) and removes the photos from storage.
- **Enum columns are `varchar`, not Postgres enums**, so adding an option never needs a migration.

## 7. Tests worth writing next

The sandbox this was built in could not run Nest or Postgres, so these were exercised only
against stand-ins. Before relying on it, run in your real environment:
`npm run build`, `typeorm migration:generate` (expect no changes), then try the posting flow end to end.
Good first automated tests: `ListingImageService` (reorder/remove/limits),
`BaseListingCategoryHandler.validateDetails` (error format), and `ListingService.publish`.

## 8. Moderation (admin review)

Ads no longer go live by themselves.

```
draft --publish--> pending_review --approve--> active --deactivate--> inactive
                        |   ^                    |  ^________publish_______|
                        |   |                    |
                     reject  resubmit (publish)  reject (take down)
                        v   |                    v
                       rejected <----------------+
```

- `POST /listings/:id/publish` = "submit for review" for draft/rejected ads (clears the old reason). A paused ad goes straight back to `active`.
- **Editing a live or paused ad (fields or photos) sends it back to `pending_review`** (`utils/listing-status.util.ts`). Admin edits do not change the status.
- Admin endpoints (`controllers/admin-listing.controller.ts`, admin role only), base `/admin/listings`:
  `GET /` (queue; `status`, `search`, `categoryId`), `GET /stats` (count per status), `GET /:id`, `PATCH /:id` (edit), `POST /:id/approve`, `POST /:id/reject` (`{ reason }`, 5-500 chars), `PATCH /:id/images/order`, `DELETE /:id/images/:imageId`.
- `services/listing-moderation.service.ts`: queue, stats, approve, reject (row locked, status checked, owner notified; a failed notification never undoes the decision).
- New columns: `rejection_reason`, `reviewed_at`, `reviewed_by` (migration `1792880000000-add-listing-moderation.ts`). Ads already `active` before this stay live.
- Public browse (`GET /listings`) now accepts `categorySlug` and `stateName` (what the homepage filter sends) and includes ads in child categories. `GET /listings/categories` and `/categories/:id/form` are public so anonymous visitors can see ad pages with labels.

## 9. The fallback "item for sale" form

`categories/product-sale/` is a handler with `isFallback = true`. Every **leaf** category that has no handler of its own (Phones, Fashion, ...) uses it: condition, brand, quantity plus the shared fields. Table: `product_sale_details` (migration `1792960000000-add-product-sale-details.ts`).

- A category with its own handler always wins (`registry.find`). A branch that owns a specific form (Property) never falls back, so its other leaves stay hidden until they get a handler (`ListingCategoryService.postableChecker`).
- To give a category its own form later, add a normal handler for its code (section 4); the fallback stops applying to it automatically.
- Only one fallback may be registered (checked at boot).
- Note: ads of a category keep their details row; adding a specific handler later does not migrate old `product_sale_details` rows.

## 10. Ratings, reviews, saving and contacting the seller

Ads reuse the product code for these. Product ids and ad ids are both UUIDs, so one id says which it is: `EngagementTargetService` (`domain/engagement/`) looks it up in `products`, then `listings`. The DTO field is still called `productId` and accepts either; `reviews`, `saved_products` and `buyer_seller_interactions` got a nullable `listing_id` next to `product_id`, plus a CHECK that exactly one is set (migration `1793040000000-add-listing-engagement.ts`).

- Reviews: `POST /reviews`, `GET /reviews/product/:id` (also works for an ad id), `GET /reviews/eligibility`. The average rating and count are kept on `listings.rating` / `listings.review_count` by `RatingAggregationService.recalculateForTarget`.
- Saved: `POST /saved-products/:id/toggle`, `GET /saved-products/:id/status` accept an ad id. `GET /saved-products/ads` lists saved ads.
- Contact: `POST /interaction` accepts an ad id. For ads no review-request reminder is scheduled (products only); the buyer can still review from the ad page 24h after contacting the seller.
- The public ad payload (`GET /listings/slug/:slug`) now has `rating`, `reviewCount` and a seller with `phoneNumber`, `isEmailVerified`, `joinedAt`.

### Who can post
Only approved sellers: create draft, upload photos and submit require `role = seller` plus `SellerApprovedGuard` (buyers get 403).
