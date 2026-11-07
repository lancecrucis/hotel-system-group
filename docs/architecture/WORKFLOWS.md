# Real-world workflow research and prototype decisions

Reviewed first-party product documentation on November 7, 2026:

- [Cloudbeds: Reservations page](https://myfrontdesk.cloudbeds.com/hc/en-us/articles/28409627448091-How-to-use-the-Reservations-Page) describes date/status filtering for confirmations, in-house guests, checkouts, cancellations, and no-shows.
- [Cloudbeds: Reservation update API](https://developers.cloudbeds.com/v1.2/reference/put_putreservation-1) includes reservation and arrival/departure status updates.
- [OpenTable: Making a reservation](https://help.opentable.com/s/article/How-do-I-make-a-reservation-1505260085031?language=en_US) describes selecting dates/times/party size, availability, confirmation, and restaurant-specific policies.
- [OpenTable: Managing reservations](https://support.opentable.com/s/article/Manage-reservations-on-OpenTable?language=en_US) describes arrival/seating/finished states, no-shows, guest notes, and reservation management.

The prototype follows those operational patterns with a simplified UI. Numerical policies below are implementation choices, not universal rules from these products.

## Guest journey

Search dates and guest count → review availability → provide contact details and requests → 15-minute inventory hold → confirm → track reference and history. Cancellation releases inventory and writes a reason/history/notification. Payment records do not independently change reservation status.

## Staff journey

A daily overview shows arrivals, departures due, in-house reservations, dining covers, pending confirmations, and net recorded receipts. Staff open a booking for its allowed next action. They can search all bookings, maintain inventory, record collected payments/refunds, and review an audit trail.

| Type           | State progression                                  |
| -------------- | -------------------------------------------------- |
| Hotel          | pending → confirmed → checked_in → checked_out     |
| Restaurant     | pending → confirmed → arrived → seated → completed |
| Pending        | may become cancelled or expired                    |
| Confirmed      | may become cancelled or no_show                    |
| Arrived dining | may become cancelled before seating                |

State transitions are checked on the server while locking the reservation row. Customers can confirm/cancel their own eligible bookings. Arrival and departure actions are staff-only. Terminal states have no outgoing transitions.

## Inventory rules

Hotel intervals are `[check_in, check_out)`. A room row is locked when booking, checking in, or editing inventory. Pending unexpired holds and confirmed/in-house reservations block conflicts. The previous guest must check out before the next guest checks in.

Dining uses the ERD's overall capacity, not specific tables. The settings row serializes bookings/configuration edits. A sweep over interval start/end events computes peak occupancy, rather than summing every booking that touches a candidate interval. Dining visits last 90 minutes; offered starts are 30 minutes apart. The restaurant cannot operate across midnight in this initial model.

## Financial boundaries

Rates are captured at booking time. Staff record external payments against the remaining charge, and refund records cannot exceed the original payment less prior refunds. Reservation-row locks serialize competing financial writes. Booking confirmation does not require online payment; checkout requires settlement. Cancelling does not automatically refund a payment.

## Deliberate prototype simplifications

USD demo prices, Asia/Taipei property time, one property, no tax/fee calculator, no date amendments (cancel/rebook instead), no table map, no menu/POS bill, no channel manager, and no real payment/email/SMS provider. These are recorded explicitly so demo behavior is not mistaken for a configured business policy.
