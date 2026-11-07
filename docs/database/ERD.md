# ERD implementation mapping

The SQL schema is in `database/migrations/001_initial.sql`.

All twelve supplied entities are implemented: `users`, `rooms`, `room_images`, `reservations`, `hotel_reservations`, `restaurant_reservations`, `reservation_status_history`, `payments`, `refunds`, `notifications`, `admin_activity_logs`, and `restaurant_settings`.

Normalizations applied to the image:

- `phone num` → `phone_number`; `updated-at` → `updated_at`.
- Duplicated `reservation_id` entries in subtype tables become a single primary key that is also a foreign key. Each booking has one hotel or restaurant detail row, created atomically by its feature API.
- The ambiguous `Row` entry in status history is represented by `reason`; `changed_by` links the actor for traceability.
- `room_images` is the gallery. `rooms.image_url` remains the cover image, matching the supplied fields.
- UUIDs identify records. Monetary columns use exact `numeric(12,2)`. Room pricing is copied onto the hotel booking and total charge at reservation time.
- Hotel dates and restaurant dates/times are property-local; audit timestamps use `timestamptz`. Foreign keys, unique identifiers/references, checks, and query indexes enforce core invariants.
- `auth_sessions` is an additional operational table containing hashed opaque session tokens, user links, and expirations. Passwords use salted scrypt hashes. Tokens are stored in HTTP-only cookies; raw tokens are not stored in PostgreSQL.
- `schema_migrations` records version/checksum/application time for repeatable SQL migrations.

Inventory and financial writes use transactions plus room/settings/reservation row locks. All writes must go through the application to enforce subtype/status and aggregate-capacity rules. Direct SQL administration can bypass application workflow safeguards.

`restaurant_settings` is a single row (`id=1`). Its capacity can only be reduced if existing future active reservations still fit. Gallery URLs are HTTP(S); image uploads and local file storage are outside this prototype.
