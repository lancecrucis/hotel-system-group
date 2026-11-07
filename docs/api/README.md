# API reference

All routes are under `/api`. JSON requests and responses; validation/business errors return `{ "error": "message" }`. Authentication uses a same-origin HTTP-only session cookie. Customer requests are scoped to their own reservations; staff access is enforced by the backend.

| Method / path                                                        | Access      | Purpose                                                                             |
| -------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------- |
| GET `/health`, `/health/database`                                    | Public      | Liveness and PostgreSQL readiness                                                   |
| POST `/auth/register`                                                | Public      | Create customer; first/last name, email, password, phone_number                     |
| POST `/auth/login`                                                   | Public      | Email/password sign-in                                                              |
| POST `/auth/logout`                                                  | Any         | Revoke current session                                                              |
| GET `/auth/me`                                                       | Any         | Current user or null                                                                |
| PATCH `/auth/profile`                                                | Signed in   | Name, phone, optional date_of_birth                                                 |
| GET `/hotel/rooms?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&guests=2` | Public      | Available rooms; staff can also see unavailable inventory                           |
| POST `/hotel/rooms`                                                  | Staff       | Create room with full room fields and optional images array                         |
| PATCH `/hotel/rooms/:id`                                             | Staff       | Edit room with full room fields and images array                                    |
| POST `/hotel/reservations`                                           | Signed in   | Hold room using room_id, dates, guest_count and contact fields                      |
| GET `/restaurant/settings`                                           | Public      | Hours, capacity, max party                                                          |
| PUT `/restaurant/settings`                                           | Staff       | Update hours/capacity/party limit                                                   |
| GET `/restaurant/availability?date=YYYY-MM-DD&guests=2`              | Public      | Available 90-minute dining intervals                                                |
| POST `/restaurant/reservations`                                      | Signed in   | Hold dining time using reservation_date, start_time, guest_count and contact fields |
| GET `/reservations?type=all&status=all&search=`                      | Signed in   | Search own bookings; staff see all; latest 500                                      |
| GET `/reservations/:id`                                              | Owner/staff | Booking, history, payments, refunds, allowed_actions                                |
| PATCH `/reservations/:id/status`                                     | Owner/staff | `{status, reason}`; transition and role validated                                   |
| POST `/reservations/:id/payments`                                    | Staff       | `{amount,payment_method,transaction_reference}`; manually record receipt            |
| POST `/reservations/:id/refunds`                                     | Staff       | `{payment_id,refund_amount,refund_reason}`; manually record refund                  |
| GET `/notifications`                                                 | Signed in   | Own notifications, latest 200                                                       |
| PATCH `/notifications/read`                                          | Signed in   | Mark own notifications read                                                         |
| GET `/dashboard`                                                     | Staff       | Daily operational summary                                                           |
| GET `/activity`                                                      | Staff       | Latest 200 staff changes                                                            |
| GET `/users`                                                         | Admin       | Latest 500 accounts, excluding password hashes                                      |
| PATCH `/users/:id/role`                                              | Admin       | `{role}`; cannot change own role; target sessions revoked                           |

Shared booking contact fields: `contact_name`, `contact_email`, `contact_phone`, `special_requests` (optional). New bookings return `{reservation}` with a pending state/reference/hold expiry; the UI then calls the status endpoint to confirm. No public lookup exposes guest data by reference alone.

Amounts are JSON numbers with at most two decimal places; PostgreSQL numeric values are returned as decimal strings. Payment methods are `cash`, `bank_transfer`, `external_card`. This is an accounting record API, not a payment gateway.

HTTP statuses: 400 validation/policy, 401 sign-in required, 403 role/origin, 404 missing or inaccessible resource, 409 inventory/state/duplicate/financial conflict, 429 authentication rate limit, 503 database readiness failure.
