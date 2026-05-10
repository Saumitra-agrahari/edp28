# Features.md — Feature Specifications
# Smart Bag-Pack: IoT-Based Intelligent Backpack System

---

## Module Overview

| Module | Code | Description |
|---|---|---|
| Authentication | AUTH | User registration, login, session management |
| Device Management | DEV | Bag pairing, device status, connectivity |
| RFID Item Tracking | RFID | Real-time item detection, aliases, alerts |
| GPS Tracking | GPS | Live location, geofence, location history |
| Smart Lock | LOCK | Remote lock/unlock, lock status, breach alerts |
| Notifications | NOTIF | Push alerts, in-app notification center, preferences |
| Activity Log | LOG | Full event history, filtering, export |
| Settings | SET | Profile, geofence config, alert preferences, quiet hours |

---

## Module 1: Authentication (AUTH)

### AUTH-01: User Registration

**Description:** New users create an account using their name, email, and password.

**Functional Requirements:**
- User provides: full name, email address, password, confirm password
- Email must be unique in the system
- Password must meet complexity rules (defined in Security.md)
- On success: account created, JWT access token and refresh token issued, user directed to Device Pairing screen
- On failure: specific field-level error messages returned

**Acceptance Criteria:**
- [ ] User can register with valid credentials
- [ ] Duplicate email returns error: "An account with this email already exists"
- [ ] Weak password returns validation error with specific rule that failed
- [ ] Mismatched confirm password shows inline error before submission
- [ ] Registered user is persisted in the `users` table
- [ ] JWT token is returned and stored securely on device

**Non-Functional Requirements:**
- Registration API must respond within 1 second under normal load
- Password is never stored in plaintext (bcrypt, cost factor 12)

**MVP:** ✅ v1

---

### AUTH-02: User Login

**Description:** Existing users authenticate with email and password.

**Functional Requirements:**
- User provides email and password
- On success: JWT access token and refresh token returned
- On failure: generic error "Invalid email or password" (no user enumeration)
- "Remember me" toggle: if enabled, refresh token TTL extended to 30 days; if disabled, 7 days
- Failed login attempts tracked; account locked after 5 consecutive failures for 15 minutes

**Acceptance Criteria:**
- [ ] Valid credentials return JWT tokens
- [ ] Invalid credentials return 401 with generic message
- [ ] Account locks after 5 failed attempts; returns 429 with lockout duration
- [ ] Tokens are stored in encrypted AsyncStorage on the device
- [ ] User is navigated to Dashboard on success

**MVP:** ✅ v1

---

### AUTH-03: Token Refresh

**Description:** Silently refresh the access token using the refresh token so the user stays logged in.

**Functional Requirements:**
- Access token TTL: 15 minutes
- Refresh token TTL: 7 days (or 30 days with "remember me")
- App automatically calls refresh endpoint when access token expires
- If refresh token is also expired: user is logged out and directed to Login screen
- Refresh token rotation: each refresh issues a new refresh token and invalidates the old one

**Acceptance Criteria:**
- [ ] Expired access token silently refreshed without user action
- [ ] Expired refresh token logs user out
- [ ] Old refresh token is invalidated after rotation
- [ ] Concurrent refresh calls (race condition) handled gracefully — only one succeeds

**MVP:** ✅ v1

---

### AUTH-04: Logout

**Description:** User logs out of the app, invalidating their session.

**Functional Requirements:**
- Logout endpoint called on backend: refresh token invalidated in DB
- Local tokens cleared from AsyncStorage
- User navigated to Login screen
- FCM device token unregistered from user's account on logout

**Acceptance Criteria:**
- [ ] Logout clears all local tokens
- [ ] Server-side refresh token is invalidated
- [ ] FCM token is removed from user record
- [ ] After logout, accessing protected screens redirects to Login

**MVP:** ✅ v1

---

### AUTH-05: Password Reset (Forgot Password)

**Description:** User who forgot their password can reset it via email link.

**Functional Requirements:**
- User enters their email on Forgot Password screen
- If email exists: 6-digit OTP sent (or reset link); valid for 15 minutes
- User enters OTP and new password
- Old refresh tokens are all invalidated on password reset

**Acceptance Criteria:**
- [ ] Valid email triggers OTP delivery
- [ ] Unknown email shows generic success message (no enumeration)
- [ ] Expired OTP returns error
- [ ] Password successfully updated on valid OTP + new password
- [ ] All sessions invalidated after reset

**MVP:** ✅ v1

---

## Module 2: Device Management (DEV)

### DEV-01: Bag Pairing

**Description:** User links their app account to their physical Smart Bag-Pack hardware.

**Functional Requirements:**
- User enters the Device ID (alphanumeric, 12 characters) printed on the hardware
- Alternatively, user scans a QR code on the hardware that encodes the Device ID
- Backend validates: Device ID exists in `devices` table AND is not already paired to another user
- On success: device record updated with `owner_user_id`; user record updated with `device_id`
- One user → one device in v1; if user has existing device, prompt to re-pair

**Acceptance Criteria:**
- [ ] Valid unregistered Device ID pairs successfully
- [ ] Already-paired Device ID returns error: "This device is already linked to another account"
- [ ] Invalid Device ID returns error: "Device not found"
- [ ] After pairing, dashboard shows real data from the device

**MVP:** ✅ v1

---

### DEV-02: Device Status Monitoring

**Description:** App shows whether the bag hardware is currently online or offline.

**Functional Requirements:**
- Backend tracks device heartbeat via MQTT (device publishes heartbeat every 30 seconds)
- If no heartbeat for 60 seconds: device marked as `offline`
- App displays: online (green dot), offline (grey dot), or connecting (spinner)
- When device goes offline: push notification sent — "Your Smart Bag-Pack is offline"
- All real-time features show a "Bag Offline" banner when device is not connected

**Acceptance Criteria:**
- [ ] Online device shows green connectivity indicator
- [ ] Device offline for > 60s triggers offline state in app
- [ ] "Bag Offline" banner shown across all live-data screens
- [ ] Notification sent within 5 seconds of device going offline

**MVP:** ✅ v1

---

### DEV-03: Device Unpair / Re-pair

**Description:** User can unpair their bag (e.g., hardware replaced) and pair a new one.

**Functional Requirements:**
- Available in Settings → Device → Unpair
- Requires confirmation dialog: "Are you sure? All device data will be cleared."
- On unpair: device record cleared of owner, user's device_id set to null
- User redirected to Device Pairing screen

**Acceptance Criteria:**
- [ ] Unpair clears device association on both user and device records
- [ ] Confirmation dialog shown before unpairing
- [ ] After unpair, user can pair a new device

**MVP:** ✅ v1

---

## Module 3: RFID Item Tracking (RFID)

### RFID-01: Real-Time Item List

**Description:** App displays a live list of all RFID-tagged items currently detected inside the bag.

**Functional Requirements:**
- Backend receives RFID scan data from Raspberry Pi via MQTT
- Data includes: EPC (tag ID), RSSI, antenna ID, timestamp
- Backend updates `tag_readings` and broadcasts to the mobile app via WebSocket
- App shows: item name (alias), status (IN BAG / MISSING), last seen timestamp, signal strength indicator
- List refreshes in real time — no manual pull-to-refresh needed
- If a tag has no alias: display the raw EPC with a "Name this item" prompt

**Acceptance Criteria:**
- [ ] Items detected by RFID reader appear in app within 2 seconds
- [ ] Items removed from bag are marked MISSING within 5 seconds (after read threshold confirmation)
- [ ] Each item shows its assigned name or raw EPC
- [ ] RSSI visualized as signal bars (1–3 bars based on RSSI range)
- [ ] WebSocket reconnects automatically if connection drops

**MVP:** ✅ v1

---

### RFID-02: Assign/Edit Item Aliases

**Description:** User assigns human-readable names to RFID tag EPCs.

**Functional Requirements:**
- User taps an item in the list → Edit Item screen
- User enters a name (max 50 chars, required), optionally selects an icon from a predefined set
- Name saved to `rfid_tags` table associated with the user's device
- Duplicate names allowed (two identical items are valid)
- User can edit or delete aliases at any time

**Acceptance Criteria:**
- [ ] User can name any detected RFID tag
- [ ] Name appears in item list immediately after saving
- [ ] Deleting alias reverts display to raw EPC
- [ ] Name max 50 chars enforced with character counter
- [ ] Icon selection persists with the tag

**MVP:** ✅ v1

---

### RFID-03: Item Missing Alert

**Description:** When a previously-detected RFID tag is no longer seen by the reader, an alert is triggered.

**Functional Requirements:**
- A tag is considered "missing" only if it was detected in the last 60 seconds AND has not been seen for 10 consecutive seconds (debounce to avoid false positives from read variations)
- Alert triggers only for tags that have an alias assigned (unnamed tags are silently tracked)
- Push notification: "⚠️ [Item Name] is missing from your bag"
- In-app alert banner shown on Dashboard
- Alert logged to `activity_logs` with type `ITEM_MISSING`

**Acceptance Criteria:**
- [ ] Alert fires within 15 seconds of item removal
- [ ] Alert does not fire for unnamed tags
- [ ] Push notification delivered to device
- [ ] Alert visible in notification center and activity log
- [ ] Alert clears when item is detected again

**MVP:** ✅ v1

---

### RFID-04: RFID Tag Management Screen

**Description:** Dedicated screen to view, add, edit, and delete all registered RFID tags.

**Functional Requirements:**
- Shows all known tags for the user's device (both currently present and absent)
- Each tag entry shows: name, EPC (truncated), last seen time, current status
- User can tap any tag to edit or delete
- "Register New Tag" flow: user places item near reader → new EPC appears → user names it
- Tags can be manually deleted (removed from alias list; EPC still tracked if detected)

**Acceptance Criteria:**
- [ ] All known tags listed with accurate status
- [ ] Tap to edit opens Edit Item screen
- [ ] Delete removes alias; EPC reverts to unnamed
- [ ] New tag registration flow works end-to-end

**MVP:** ✅ v1

---

## Module 4: GPS Tracking (GPS)

### GPS-01: Live Location Map View

**Description:** App displays the bag's current GPS location on an interactive map.

**Functional Requirements:**
- GPS module on hardware publishes coordinates (lat, lng, accuracy, altitude) via MQTT every 10 seconds
- Backend stores latest location and broadcasts via WebSocket
- App displays map (React Native Maps / Mapbox) centered on bag's location
- Map shows: bag marker (custom icon), accuracy circle, last updated timestamp
- If device offline: show last known location with "Last seen X minutes ago" label

**Acceptance Criteria:**
- [ ] Map loads with bag's current location within 5 seconds of opening GPS screen
- [ ] Location updates on map without user interaction
- [ ] Accuracy circle shown on map
- [ ] Offline device shows last known location with stale timestamp label
- [ ] Tapping bag marker shows: coordinates, last updated, accuracy

**MVP:** ✅ v1

---

### GPS-02: Geofence Configuration

**Description:** User defines a safe zone radius around a reference point. If the bag moves outside this zone, an alert is triggered.

**Functional Requirements:**
- Default geofence: centered on user's home location (set by user in Settings)
- Radius options: 50m, 100m, 200m, 500m (slider or preset selector)
- Geofence reference point: user manually pins a location on the map OR uses current phone location
- Geofence can be enabled/disabled independently of GPS tracking
- Geofence check runs server-side: backend computes haversine distance on each GPS update

**Acceptance Criteria:**
- [ ] User can set reference point on map
- [ ] Radius selection saved and applied immediately
- [ ] Enabling geofence shown visually as a circle on the map screen
- [ ] Geofence toggle persists across app restarts

**MVP:** ✅ v1

---

### GPS-03: Anti-Theft Geofence Alert

**Description:** When the bag's GPS position exits the configured geofence, an anti-theft alert fires.

**Functional Requirements:**
- Backend evaluates geofence on every GPS MQTT message
- If bag is outside geofence AND geofence is enabled: alert triggered
- Alert sent as push notification: "🚨 Anti-theft alert! Your bag has moved outside your safe zone."
- Alert also shown as high-priority in-app banner
- Alert not re-triggered on every update — re-fires only after bag re-enters and exits again (state machine: INSIDE → OUTSIDE → alert fires once → INSIDE → OUTSIDE → alert fires again)
- Alert logged to `activity_logs` with type `GEOFENCE_BREACH`

**Acceptance Criteria:**
- [ ] Alert fires within 15 seconds of geofence breach
- [ ] Alert not repeated for continuous out-of-zone GPS updates
- [ ] Push notification delivered and actionable (tapping opens GPS screen)
- [ ] Alert logged in activity log and notification center
- [ ] Alert clears when bag returns inside geofence

**MVP:** ✅ v1

---

### GPS-04: Location History

**Description:** User can view a timeline of the bag's historical GPS locations.

**Functional Requirements:**
- `gps_locations` table stores every GPS update (lat, lng, accuracy, timestamp)
- Location history screen shows: list view with timestamps and approximate address (reverse geocoded)
- User can filter by date range: Today, Last 7 Days, Custom Range
- Oldest data retained: 30 days (older records purged by a scheduled job)
- Map view option: show breadcrumb path of bag movement on map

**Acceptance Criteria:**
- [ ] Location history loads for current day by default
- [ ] Date filter works correctly
- [ ] Each entry shows timestamp and reverse-geocoded address (or coordinates if geocoding fails)
- [ ] Map breadcrumb path renders correctly
- [ ] Data older than 30 days is not shown

**MVP:** ✅ v1

---

## Module 5: Smart Lock (LOCK)

### LOCK-01: Lock/Unlock Command

**Description:** User can remotely lock or unlock the bag's servo-based smart lock from the app.

**Functional Requirements:**
- App sends lock/unlock command to backend via REST API
- Backend publishes MQTT command to the device topic
- Device firmware executes servo action and publishes confirmation
- App shows "Sending command..." loading state while awaiting confirmation
- Confirmation timeout: if no hardware ACK within 10 seconds → show "Command timed out. Check bag connectivity."
- Command logged to `activity_logs` with type `LOCK_COMMAND` or `UNLOCK_COMMAND`

**Acceptance Criteria:**
- [ ] Tapping Lock/Unlock sends command and shows loading state
- [ ] Lock state updates in app within 3 seconds on hardware ACK
- [ ] Timeout state shown if no ACK in 10 seconds
- [ ] Command logged in activity log with timestamp and result
- [ ] Lock/unlock button disabled while command is in-flight

**MVP:** ✅ v1

---

## Implemented Features (codebase scan)

The following features and modules are present and implemented in the backend code (routes/controllers under `backend/src/routes` and `backend/src/controllers`):

- **Authentication (AUTH):** registration, login, token refresh, logout, forgot password, OTP verify, password reset.
- **User / Profile:** get profile, update profile, change password, register/remove FCM token.
- **Device Management (DEV):** device pairing, get paired device, update device name, unpair.
- **RFID (RFID):** list aliases, register alias, update alias, delete alias, live RFID status.
- **GPS (GPS):** get current location, location history, get/update geofence.
- **Smart Lock (LOCK):** get lock status, send lock/unlock command (with idempotency key), lock history.
- **Notifications:** list notifications (cursor-based), mark read, mark all read, get/update preferences.
- **Activity Logs:** paginated activity log retrieval.

Notes:
- The project routes and controllers for these features are located under `backend/src/routes` and `backend/src/controllers`.
- For exact API signatures and response envelopes, see `API.md` (updated to include the implemented endpoints list).

---

### LOCK-02: Real-Time Lock Status

**Description:** App displays the current lock state of the bag at all times.

**Functional Requirements:**
- Hardware publishes lock status on MQTT whenever state changes
- Lock status also included in device heartbeat payload
- App shows: LOCKED (padlock closed icon, red/green tint), UNLOCKED (padlock open icon)
- Lock status displayed on Dashboard and Lock screen prominently
- Status persists from last known state when device is offline

**Acceptance Criteria:**
- [ ] Lock state accurately reflects hardware state within 2 seconds
- [ ] Dashboard shows lock state prominently (not buried in menus)
- [ ] Offline device shows last known lock state with "Offline" indicator
- [ ] Lock state icon animates on state change

**MVP:** ✅ v1

---

### LOCK-03: Unauthorized Access Alert

**Description:** If the bag is physically opened (zipper sensor / accelerometer detects opening) while the lock is in LOCKED state, an alert fires.

**Functional Requirements:**
- Hardware detects unauthorized opening and publishes MQTT event: `bag_opened_while_locked`
- Backend receives event → sends push notification + WebSocket alert to app
- Push notification: "🔓 Alert! Your bag was opened while locked."
- Alert logged as `UNAUTHORIZED_ACCESS` in `activity_logs`
- Alert includes timestamp and GPS coordinates at time of event

**Acceptance Criteria:**
- [ ] Alert fires within 5 seconds of unauthorized opening
- [ ] Push notification delivered and opens Lock screen when tapped
- [ ] Alert logged with timestamp and location
- [ ] Alert shown in notification center

**MVP:** ✅ v1

---

## Module 6: Notifications (NOTIF)

### NOTIF-01: Push Notifications via FCM

**Description:** The system delivers real-time push notifications to the user's device via Firebase Cloud Messaging.

**Functional Requirements:**
- FCM token registered on login / app start
- Token stored in `user_devices` table (supports multiple devices per user in future; v1: one device)
- Notification types and their priority:

| Notification Type | Priority | Sound | Badge |
|---|---|---|---|
| ITEM_MISSING | High | Yes | Yes |
| GEOFENCE_BREACH | Critical | Yes | Yes |
| UNAUTHORIZED_ACCESS | Critical | Yes | Yes |
| LOCK_STATE_CHANGE | Normal | No | Yes |
| DEVICE_OFFLINE | Normal | No | No |
| DEVICE_ONLINE | Low | No | No |

- Notifications contain: title, body, `type` data field, `screen` deep link field

**Acceptance Criteria:**
- [ ] FCM token registered and stored on app launch
- [ ] Each notification type delivered with correct priority
- [ ] Tapping notification opens the relevant screen in the app (deep linking)
- [ ] Notifications delivered even when app is in background or killed

**MVP:** ✅ v1

---

### NOTIF-02: In-App Notification Center

**Description:** A dedicated screen listing all notifications the user has received.

**Functional Requirements:**
- All notifications stored in `notifications` table in backend (regardless of FCM delivery status)
- Notification center shows: icon (by type), title, body, timestamp, read/unread status
- Unread count badge shown on bottom navigation Notifications icon
- Tapping a notification marks it as read and navigates to relevant screen
- "Mark all as read" action available
- Notifications paginated (20 per page, infinite scroll)
- Notifications older than 90 days auto-deleted

**Acceptance Criteria:**
- [ ] All received notifications visible in notification center
- [ ] Unread count badge accurate
- [ ] Tapping notification marks it read and deep-links to relevant screen
- [ ] "Mark all as read" works
- [ ] Infinite scroll loads older notifications

**MVP:** ✅ v1

---

### NOTIF-03: Notification Preferences

**Description:** User can toggle individual alert types on or off.

**Functional Requirements:**
- Settings screen shows a list of all notification types with toggle switches
- Toggling a type saves preference to `notification_preferences` table
- Backend checks preference before sending push notification (but still logs to notifications table)
- Quiet hours: user sets a time range (e.g., 11pm–7am) during which only Critical notifications are sent

**Acceptance Criteria:**
- [ ] Each alert type can be independently enabled/disabled
- [ ] Disabled alert type does not trigger push notification
- [ ] Quiet hours setting saved and respected by backend
- [ ] Critical alerts (GEOFENCE_BREACH, UNAUTHORIZED_ACCESS) cannot be fully disabled — only quieted

**MVP:** ✅ v1

---

## Module 7: Activity Log (LOG)

### LOG-01: Full Event History

**Description:** Chronological log of all system events tied to the user's bag.

**Functional Requirements:**
- All events written to `activity_logs` table:
  - ITEM_DETECTED, ITEM_MISSING, LOCK_COMMAND, UNLOCK_COMMAND, LOCK_STATE_CHANGE
  - GEOFENCE_BREACH, GEOFENCE_RETURN, UNAUTHORIZED_ACCESS
  - DEVICE_ONLINE, DEVICE_OFFLINE
  - USER_LOGIN, TAG_ALIAS_ADDED, TAG_ALIAS_UPDATED, TAG_ALIAS_DELETED
- Activity log screen shows: icon, event description, timestamp, GPS location (if applicable)
- Filter by: event type, date range
- Paginated: 25 per page, infinite scroll

**Acceptance Criteria:**
- [ ] All event types are logged with accurate timestamps
- [ ] Filters correctly narrow results
- [ ] Infinite scroll works without duplicates
- [ ] Each log entry is human-readable (not raw codes)

**MVP:** ✅ v1

---

## Module 8: Settings (SET)

### SET-01: Profile Management

**Description:** User can view and update their profile information.

**Functional Requirements:**
- Editable fields: full name, profile photo (optional, v1 can skip photo upload)
- Email is displayed but not editable (requires account verification flow — v2)
- Change password: requires current password, new password, confirm new password

**Acceptance Criteria:**
- [ ] Name update saved and reflected immediately
- [ ] Change password works with correct current password
- [ ] Wrong current password returns error: "Current password is incorrect"

**MVP:** ✅ v1

---

### SET-02: Geofence Configuration

**Description:** (See GPS-02 above — Settings is the entry point for geofence configuration.)

**MVP:** ✅ v1

---

### SET-03: Alert Preferences

**Description:** (See NOTIF-03 above — Settings is the entry point for notification preferences and quiet hours.)

**MVP:** ✅ v1

---

## User Role Permissions (v1)

In v1 there is a single role: **Owner**. The owner is the user who paired the device.

| Action | Owner |
|---|---|
| View RFID item list | ✅ |
| Add/edit/delete tag aliases | ✅ |
| View GPS location | ✅ |
| Configure geofence | ✅ |
| Lock/unlock bag | ✅ |
| View activity log | ✅ |
| View notification center | ✅ |
| Configure notification preferences | ✅ |
| Unpair device | ✅ |
| Delete account | ✅ |

**Future roles (v2+):** Guest (view-only), Family Member (view + alerts, no lock control), Admin (for multi-bag fleet management).

---

## Non-Functional Requirements (Global)

| Requirement | Target |
|---|---|
| API response time (p95) | < 500ms |
| WebSocket latency | < 1 second for broadcast |
| App bundle size | < 30MB |
| Minimum Android version | Android 8.0 (API 26) |
| Minimum iOS version | iOS 13.0 |
| Offline graceful degradation | Shows last known state, no crashes |
| Data retention — GPS locations | 30 days |
| Data retention — Activity logs | 90 days |
| Data retention — Notifications | 90 days |
| Accessibility | WCAG AA minimum (font size, contrast, tap targets) |
| Code coverage (unit tests) | > 60% on business logic |

---

## MVP vs Future Enhancements

| Feature | v1 MVP | v2+ Future |
|---|---|---|
| Email/password auth | ✅ | — |
| Google OAuth | — | ✅ |
| Single bag per account | ✅ | — |
| Multiple bags per account | — | ✅ |
| Basic geofence (circle) | ✅ | — |
| Polygon geofence | — | ✅ |
| RFID item list | ✅ | — |
| Item usage statistics | — | ✅ |
| GPS live location | ✅ | — |
| Route playback on map | — | ✅ |
| Smart lock basic | ✅ | — |
| Biometric lock | — | ✅ |
| FCM push notifications | ✅ | — |
| SMS alerts | — | ✅ |
| Activity log | ✅ | — |
| Analytics dashboard | — | ✅ |
| Single user per bag | ✅ | — |
| Shared bag access (family) | — | ✅ |
| English only | ✅ | — |
| Multi-language | — | ✅ |
| Manual OTA via cable | ✅ | — |
| OTA firmware updates | — | ✅ |
