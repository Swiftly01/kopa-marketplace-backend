# Lodges module (Corpers Lodge)

Family house admins publish lodges; corpers browse them and book a bed.

## Roles and access
- `UserRole.FAMILY_HOUSE_ADMIN` is set when a super admin links a user to a family house (`PUT /admin/family-houses/:id/admin`).
- `FamilyHouseAdminGuard` re-reads role and house from the database on every request, then puts the house on the request. The house id is never taken from the client.
- Every manage service takes a `LodgeScope`; `LodgeAccessService.find` is the only lookup. Other houses' lodges return 404.
- Super admin (`UserRole.ADMIN`) uses `/admin/...` with `ANY_HOUSE` scope.

## Endpoints (all under /api/v1)
| Who | Path | What |
|---|---|---|
| house admin | `GET family-house/me`, `GET family-house/meta` | house info, wizard presets |
| house admin | `GET/POST family-house/lodges`, `GET/PATCH/DELETE .../:id` | list, create draft, read, edit, archive |
| house admin | `POST .../:id/publish`, `POST .../:id/unpublish`, `PATCH .../:id/availability` | go live, take down, open/close bookings |
| house admin | `GET/POST .../:id/images`, `PATCH/DELETE .../:id/images/:imageId` | photos (multipart field `images`), label, cover |
| house admin | `GET/POST .../:id/bed-slots`, `POST .../bed-slots/generate`, `PATCH/DELETE .../bed-slots/:slotId` | bed matrix |
| house admin | `PATCH .../:id/pickup`, `GET/POST .../pickup/batches`, `PATCH/DELETE .../pickup/batches/:batchId` | camp bus logistics |
| house admin | `GET family-house/bookings`, `GET .../passcode/:passcode`, `GET .../:id`, `POST .../:id/confirm\|reject\|check-in` | bookings and corpers list |
| super admin | `/admin/family-houses` (CRUD, `PUT/DELETE :id/admin`), `/admin/lodges` (list, get, unpublish, availability, archive), `GET /admin/lodges/bookings` | oversight |
| corper | `GET lodges`, `GET lodges/slug/:slug`, `GET lodges/:id`, `GET lodges/:id/bed-slots?gender=` | browse |
| corper | `POST lodges/:id/bookings/passcode`, `POST lodges/:id/bookings` (multipart, files `documents`) | booking steps 4 and submit |
| corper | `GET lodge-bookings/mine`, `GET lodge-bookings/:id`, `POST lodge-bookings/:id/cancel` | my bookings |
| corper | `PATCH lodge-bookings/:id`, `POST lodge-bookings/:id/documents`, `DELETE lodge-bookings/:id/documents/:documentId` | edit a submitted booking |

Replies are `{ success, message, data }`; lists use the shared pagination shape.

## Rules worth knowing
- Bed slots are optional per lodge (`bedSlotsEnabled`, default true). With them off, the bed step counts as done, bookings carry no bed, and an optional `capacity` caps active bookings. Bed tracking cannot be switched while bookings are active.
- Publish needs all five wizard steps complete (`setup` in the manage view says which are missing). Min 5, max 8 photos.
- Booking is one transaction: lock the bed, check wing vs gender, one active booking per corper, pickup batch capacity, then bed -> `in_transit`. Confirm keeps it held, check-in -> `occupied`, reject/cancel -> `available`.
- A corper holds one active booking across all houses and lodges: checked before the passcode is issued and before upload, then again in the transaction, with the unique index as backstop.
- Editing: pending bookings allow every field and a bed change; confirmed bookings lock name, call-up number, gender and bed. Checked-in, rejected and cancelled bookings are read-only. Changing documents resets the exco's verification.
- Passcode is issued by `POST .../bookings/passcode` as a signed token (30 min) and must be sent back on submit.
- Unique partial indexes enforce one active booking per corper and per bed, and one cover photo per lodge.
- Archive is a soft delete and is blocked while bookings are active.
