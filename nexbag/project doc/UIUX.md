# UIUX.md — UI/UX Specifications
# Smart Bag-Pack: IoT-Based Intelligent Backpack System

---

## 1. Design Principles

1. **Clarity over cleverness** — Every screen must communicate bag status at a glance. No hunting for information.
2. **Real-time first** — Data must feel live. Use animations, transitions, and visual indicators to signal freshness.
3. **Alert hierarchy** — Critical alerts (anti-theft, unauthorized access) must visually dominate. Never bury them.
4. **Minimum taps** — Core actions (lock/unlock, check items) must be reachable in ≤ 2 taps from Dashboard.
5. **Graceful degradation** — Offline or stale states must be communicated clearly without crashing or showing blank screens.
6. **Accessible by default** — Sufficient contrast, minimum 44×44pt tap targets, readable font sizes.

---

## 2. Visual Style Guide

### Color Palette

| Role | Color | Hex |
|---|---|---|
| Primary | Deep Indigo | `#3D3BF3` |
| Primary Dark | Midnight Blue | `#1A1870` |
| Accent | Electric Teal | `#00C9B1` |
| Background | Off-White | `#F5F7FA` |
| Surface | White | `#FFFFFF` |
| Dark Background | Dark Slate | `#12141C` |
| Success / Online | Green | `#22C55E` |
| Warning / Missing | Amber | `#F59E0B` |
| Danger / Alert | Red | `#EF4444` |
| Neutral Text | Dark Grey | `#1E2A3B` |
| Muted Text | Medium Grey | `#6B7280` |
| Border / Divider | Light Grey | `#E5E7EB` |
| Locked State | Indigo | `#3D3BF3` |
| Unlocked State | Amber | `#F59E0B` |

### Typography

| Style | Font | Size | Weight |
|---|---|---|---|
| Display | Inter | 28sp | 700 Bold |
| Title | Inter | 22sp | 600 SemiBold |
| Heading | Inter | 18sp | 600 SemiBold |
| Body | Inter | 15sp | 400 Regular |
| Body Small | Inter | 13sp | 400 Regular |
| Label | Inter | 12sp | 500 Medium |
| Caption | Inter | 11sp | 400 Regular |

### Iconography
- Library: `react-native-vector-icons` (MaterialCommunityIcons)
- Icon size: 24dp standard, 20dp small, 32dp feature icons
- All icons have accessible labels

### Spacing System
- Base unit: 4dp
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 48, 64

### Border Radius
- Small (chips, tags): 6dp
- Medium (cards): 12dp
- Large (bottom sheets): 20dp
- Full (buttons, avatars): 100dp

---

## 3. Information Architecture

```
App
├── Onboarding Flow (unauthenticated)
│   ├── Splash Screen
│   ├── Onboarding Carousel (3 slides)
│   ├── Login Screen
│   ├── Register Screen
│   └── Forgot Password Screen
│       └── OTP Verification Screen
│           └── New Password Screen
│
├── Device Pairing Flow (authenticated, no device)
│   └── Pair Device Screen
│
└── Main App (authenticated + paired)
    ├── Bottom Navigation
    │   ├── Dashboard (Home)
    │   ├── RFID Items
    │   ├── GPS Map
    │   ├── Notifications
    │   └── Settings
    │
    ├── Dashboard
    │   ├── Device Status Banner
    │   ├── Lock Control Widget
    │   ├── Items Summary Widget
    │   ├── GPS Mini-Map Widget
    │   └── Recent Alerts Widget
    │
    ├── RFID Items
    │   ├── Item List Screen
    │   ├── Edit/Name Item Screen
    │   └── Register New Tag Screen
    │
    ├── GPS Map
    │   ├── Live Map Screen
    │   ├── Geofence Setup Screen
    │   └── Location History Screen
    │
    ├── Notifications
    │   └── Notification Center Screen
    │
    ├── Settings
    │   ├── Profile Settings
    │   ├── Change Password
    │   ├── Alert Preferences
    │   ├── Quiet Hours
    │   ├── Device Settings
    │   │   └── Unpair Device
    │   └── About / App Version
    │
    └── Lock Screen (accessible from Dashboard widget or deep link)
```

---

## 4. Navigation Structure

### Bottom Navigation Tabs

| Tab | Icon | Label | Badge |
|---|---|---|---|
| Dashboard | `home` | Home | None |
| Items | `tag-multiple` | Items | Unread missing count |
| Map | `map-marker` | Map | None |
| Alerts | `bell` | Alerts | Unread notification count |
| Settings | `cog` | Settings | None |

### Navigation Rules
- Bottom nav is always visible in the main app (except during onboarding and pairing flows)
- Stack navigation within each tab (tab maintains its own stack)
- Deep links from push notifications navigate to a specific tab + screen
- Modal sheets used for: Edit Item, Register Tag, Geofence Setup, Confirm dialogs

---

## 5. Screen-by-Screen UI Specification

---

### SCR-01: Splash Screen
**Purpose:** Brand identity shown during app initialization.
**Duration:** Max 2 seconds; dismissed as soon as auth state is resolved.

**Elements:**
- App logo (centered, 80×80dp)
- App name "Smart Bag-Pack" below logo
- Tagline: "Your bag, always in control."
- Loading indicator: subtle pulsing animation on logo
- Background: Primary dark gradient (#1A1870 → #3D3BF3)

**Logic:**
- If user has valid token → navigate to Dashboard
- If user has no device paired → navigate to Pair Device
- If user not authenticated → navigate to Onboarding

---

### SCR-02: Onboarding Carousel
**Purpose:** Introduce key features to new users. Shown only once.

**Slides:**
1. "Never lose your items" — RFID item tracking illustration
2. "Know where your bag is" — GPS map illustration
3. "Lock it from anywhere" — Smart lock illustration

**Elements per slide:**
- Full-screen illustration (top 60%)
- Title (heading style)
- Subtitle (body style, 2 lines max)
- Dot indicators (3 dots, active dot = primary color)
- "Next" button (primary) / "Skip" text button (last slide: "Get Started")

**Logic:** Skip stores `onboarding_shown = true` in AsyncStorage. Never shown again.

---

### SCR-03: Login Screen

**Elements:**
- Logo + "Welcome back" heading
- Email input field (with email keyboard)
- Password input field (with show/hide toggle)
- "Remember me" checkbox
- Primary "Login" button (full width)
- "Forgot password?" text link (right-aligned)
- Divider "— or —"
- "Create an account" text button
- Keyboard avoidance scroll view

**Validation (inline, on blur):**
- Email: required, valid format
- Password: required, min 8 chars

**States:**
- Default → Loading (button shows spinner) → Success (navigate) / Error (show toast)

---

### SCR-04: Register Screen

**Elements:**
- "Create your account" heading
- Full Name input
- Email input
- Password input (with strength indicator below: Weak / Medium / Strong)
- Confirm Password input
- Primary "Create Account" button (full width)
- "Already have an account? Login" text link

**Validation (inline, on blur):**
- Name: required, 2–50 chars
- Email: required, valid format, unique (server-side)
- Password: min 8 chars, at least 1 uppercase, 1 number, 1 special char
- Confirm password: must match password

**Password Strength Indicator:**
- Bar below password field, 3 segments
- Red (1 segment) = weak, Orange (2) = medium, Green (3) = strong

---

### SCR-05: Forgot Password / OTP / New Password (3-step flow)

**Step 1 — Enter Email:**
- "Forgot Password" heading
- Email input
- "Send OTP" primary button
- On success: show step 2

**Step 2 — Enter OTP:**
- "Check your email" heading + email shown masked
- 6-digit OTP input (individual boxes, auto-advance)
- Countdown timer: "Resend in 00:58"
- "Resend OTP" button (active after countdown)
- "Verify" button

**Step 3 — New Password:**
- "Create new password" heading
- New password input + strength indicator
- Confirm password input
- "Update Password" button
- On success: navigate to Login with success toast

---

### SCR-06: Pair Device Screen

**Purpose:** One-time screen shown after registration or after unpairing.

**Elements:**
- Illustration of Smart Bag-Pack hardware
- "Connect your Smart Bag-Pack" heading
- Description: "Enter the Device ID found on the label inside your bag."
- Device ID input (12-char, auto uppercase, monospace font)
- QR scan button (icon) opens camera for QR code scanning
- "Connect Device" primary button
- Loading state while pairing in progress

**States:**
- Default → Loading → Success (navigate to Dashboard) / Error (show inline error)

**Errors:**
- "Device not found" — invalid ID
- "Device already linked" — ID belongs to another account
- "Connection failed" — network error

---

### SCR-07: Dashboard (Home Tab)

**Purpose:** Central overview of bag status. Most important screen.

**Layout (vertical scroll):**

```
┌─────────────────────────────────────┐
│ 🎒 Smart Bag-Pack         [●] Online│  ← Header with device status
│ Good morning, Arjun 👋              │
├─────────────────────────────────────┤
│  ╔═══════════════════════════╗      │
│  ║  🔒 LOCKED                ║      │  ← Lock Widget (tap to go to Lock)
│  ║  [  UNLOCK  ]             ║      │
│  ╚═══════════════════════════╝      │
├─────────────────────────────────────┤
│  ╔════════════╗  ╔════════════╗     │
│  ║  Items     ║  ║  Alerts   ║     │  ← Stats row
│  ║  4/5 ✅   ║  ║  1 ⚠️    ║     │
│  ╚════════════╝  ╚════════════╝     │
├─────────────────────────────────────┤
│  Items in Bag                       │
│  ─────────────────────────────────  │
│  ✅ Laptop            RSSI ███░     │  ← Quick item list (top 4)
│  ✅ ID Card           RSSI ████     │
│  ✅ Charger           RSSI ██░░     │
│  ⚠️  Wallet            MISSING      │
│  [View all items →]                 │
├─────────────────────────────────────┤
│  📍 Bag Location                    │
│  ┌─────────────────────────────┐    │  ← Mini map (tappable)
│  │    [Map Preview]            │    │
│  └─────────────────────────────┘    │
│  IIIT Campus, Jabalpur • 2s ago     │
├─────────────────────────────────────┤
│  Recent Activity                    │
│  ─────────────────────────────────  │  ← Last 3 events
│  🔒 Bag locked               2m ago │
│  ⚠️  Wallet removed          5m ago │
│  📍 Location updated         8m ago │
│  [View full log →]                  │
└─────────────────────────────────────┘
```

**Lock Widget Behavior:**
- Shows LOCKED (indigo background, padlock closed) or UNLOCKED (amber background, padlock open)
- Tap UNLOCK/LOCK button → confirmation dialog → send command → loading state → update
- While bag is offline: button is disabled, shows "Bag Offline"

**Alert Banner (conditional, shown above lock widget):**
- High-priority red banner: "🚨 Anti-theft alert! Bag moved outside safe zone."
- Dismissible with X (but also remains in notification center)

---

### SCR-08: RFID Items Screen

**Purpose:** Full list of all registered RFID tags and their current status.

**Header:**
- "My Items" title
- "+" button (top right) → Register New Tag flow
- Filter chips: All | In Bag | Missing

**Item Card:**
```
┌──────────────────────────────────────┐
│ 💻  Laptop                      ✅   │
│     EPC: E2004700...           IN BAG│
│     RSSI: -52 dBm  ███░  Last: 2s   │
└──────────────────────────────────────┘
```
- Status chip: IN BAG (green), MISSING (red), UNKNOWN (grey)
- Tap item → Edit Item bottom sheet

**Empty State (no tags registered):**
```
[Illustration: Empty bag with tags floating]
No items registered yet
Add RFID tags to your items to start tracking them.
[+ Register First Item] button
```

**Missing Item State:**
- MISSING items shown at top of list regardless of filter
- Red pulsing dot on item card

---

### SCR-09: Edit Item Screen (Bottom Sheet)

**Purpose:** Assign/edit a name and icon for an RFID tag.

**Elements:**
- "Edit Item" or "Name this item" heading
- Icon picker: horizontal scroll of 20 icons (laptop, phone, wallet, book, key, bottle, etc.)
- Name input (max 50 chars, character counter)
- EPC display (read-only, truncated with copy button)
- Last seen: timestamp
- "Save" primary button
- "Delete Tag" danger text button (confirmation dialog before deleting)

---

### SCR-10: Register New Tag Screen

**Purpose:** Guide user through registering a new RFID-tagged item.

**Steps:**
1. Instruction screen: "Hold item near the front pocket of your bag" + animated GIF/Lottie
2. Scanning state: spinner + "Waiting for new tag..."
3. Tag detected: EPC shown, proceed to naming
4. Name the item (same as Edit Item form)
5. Success: "Laptop has been added!" + confetti Lottie

**Cancel button** available at all steps.

---

### SCR-11: GPS Map Screen

**Purpose:** Live map showing bag's current location.

**Elements:**
- Full-screen map (react-native-maps, Google Maps provider)
- Custom bag marker (backpack icon)
- Accuracy circle (semi-transparent, radius = accuracy in meters)
- Geofence circle (blue dashed border, if enabled)
- Bottom sheet (drag up):
  - Bag location address (reverse geocoded)
  - Last updated: "Updated 3 seconds ago"
  - Accuracy: "±12 meters"
  - "View History" button → Location History screen
  - "Edit Geofence" button → Geofence Setup screen
- Map controls: zoom in/out, re-center on bag

**Offline / Stale State:**
- Marker shown but greyed out
- Banner: "⚠️ Showing last known location — bag is offline"
- Last seen timestamp shown prominently

---

### SCR-12: Geofence Setup Screen (Modal)

**Elements:**
- Map view (takes 60% of screen)
- Drag pin to set reference point, OR "Use my current location" button
- Radius selector: segmented control [50m | 100m | 200m | 500m]
- Live preview of geofence circle on map as user adjusts
- "Enable Geofence" toggle
- "Save" primary button
- "Cancel" text button

---

### SCR-13: Location History Screen

**Elements:**
- Header: "Location History"
- Date filter: Today | 7 Days | Custom (date picker)
- Toggle: List View | Map View

**List View:**
- Each entry: timestamp, address, accuracy indicator
- Pull-to-refresh
- Infinite scroll (25 per page)

**Map View:**
- Breadcrumb polyline of location history
- Tap on polyline point → popup with timestamp

**Empty State:**
```
No location history found for this period.
```

---

### SCR-14: Lock Screen (accessible from Dashboard widget or deep link)

**Purpose:** Dedicated screen for lock control.

**Elements:**
- Large animated padlock icon (locked = indigo, closed; unlocked = amber, open; animates on change)
- Status text: "BAG IS LOCKED" / "BAG IS UNLOCKED"
- Last changed: "Locked 5 minutes ago"
- Primary action button: "Unlock Bag" / "Lock Bag" (switches based on state)
- "Lock History" section: last 5 lock/unlock events with timestamps
- Offline state: button disabled, "Bag must be online to control lock"

**Confirmation Dialog on lock/unlock action:**
- Title: "Unlock your bag?"
- Body: "This will physically unlock your Smart Bag-Pack."
- Buttons: "Cancel" | "Unlock" (destructive style for unlock, primary for lock)

---

### SCR-15: Notification Center Screen

**Purpose:** Full list of all notifications.

**Header:**
- "Notifications" title
- "Mark all read" text button (top right)

**Notification Card:**
```
┌──────────────────────────────────────┐
│ 🚨 [UNREAD dot]                      │
│ Anti-theft Alert                     │
│ Your bag has moved outside your      │
│ safe zone.                           │
│                              5m ago  │
└──────────────────────────────────────┘
```
- Unread: white background, left blue border accent
- Read: light grey background
- Tap: mark as read + navigate to relevant screen

**Filter chips:** All | Security | Items | Lock | System

**Empty State:**
```
[Bell illustration]
No notifications yet
You'll see alerts here when your bag needs attention.
```

---

### SCR-16: Settings Screen

**Sections:**

**Account**
- Profile (Name, Email)
- Change Password

**Device**
- Device ID (shown as label)
- Device Name (editable)
- Connectivity Status
- Unpair Device (danger, red text)

**Alerts**
- Notification Preferences (per-type toggles)
- Quiet Hours (time range picker)

**App**
- App Version
- Privacy Policy
- Terms of Service
- Logout (red text)

---

## 6. Component Inventory

| Component | Usage |
|---|---|
| `PrimaryButton` | Full-width CTA buttons |
| `SecondaryButton` | Outlined buttons |
| `TextButton` | Inline text actions |
| `InputField` | All text inputs with label + error |
| `PasswordInput` | InputField + show/hide toggle |
| `OTPInput` | 6-box OTP entry |
| `StatusBadge` | IN BAG / MISSING / LOCKED / UNLOCKED chips |
| `ItemCard` | RFID item list card |
| `NotificationCard` | Notification center card |
| `ActivityLogItem` | Log entry row |
| `LockWidget` | Dashboard lock control widget |
| `MiniMap` | Embedded non-interactive map preview |
| `AlertBanner` | Full-width dismissible alert strip |
| `BottomSheet` | Draggable modal sheet |
| `LoadingOverlay` | Full-screen loading state |
| `EmptyState` | Illustration + text + optional CTA |
| `DeviceStatusDot` | Online/offline indicator dot |
| `RSSignalBars` | RSSI visualized as 1–4 bars |
| `ConfirmDialog` | Two-button modal dialog |
| `FilterChips` | Horizontal scrollable filter tabs |
| `SectionHeader` | Section label in settings |
| `ToggleRow` | Setting row with label + toggle |

---

## 7. Form Behaviors

- **Validation timing:** Validate on blur (when field loses focus). Also validate all fields on submit.
- **Error display:** Error message shown below the field in red, field border turns red.
- **Success clear:** Error clears as soon as user starts typing again.
- **Disabled submit:** Submit button disabled while loading or if required fields are empty.
- **Keyboard behavior:** Screen scrolls up when keyboard appears; input stays visible.
- **Auto-advance:** OTP input auto-advances to next box on digit entry.
- **Character counters:** Shown on fields with max length (name fields).

---

## 8. Empty States

Each empty state includes:
1. An illustration (SVG or Lottie) — never a blank screen
2. A short, friendly heading
3. One sentence of context
4. Optional CTA button

| Screen | Empty State Message |
|---|---|
| RFID Items | "No items registered yet. Tap + to add your first item." |
| Notifications | "You're all caught up! No notifications yet." |
| Location History | "No location history for this time period." |
| Activity Log | "No activity recorded yet." |

---

## 9. Loading States

- **Full-screen initial load:** Skeleton loaders (animated grey bars matching content shape) — not spinners
- **Button loading:** Button text replaced with spinner; button disabled
- **List loading (next page):** Footer spinner on scroll
- **Map loading:** Map greys out with "Fetching location..." text overlay
- **Lock command:** Padlock icon animates; button disabled with "Sending..." text

---

## 10. Error States

| Scenario | UI Treatment |
|---|---|
| API error (non-critical) | Toast at bottom: "Something went wrong. Please try again." |
| API error (form submit) | Inline field error or red banner below form |
| Network offline | Global banner: "No internet connection" (persistent until resolved) |
| WebSocket disconnected | Subtle status indicator on relevant screens: "Reconnecting..." |
| Device offline | "Bag Offline" banner on Dashboard and GPS/Lock screens |
| GPS no fix | Map shows last location with "No GPS fix" label |
| Server error (500) | Full-screen error state with "Try again" button |

---

## 11. Responsive Design Rules

- App is designed for a **375dp wide baseline** (iPhone SE / small Android)
- On larger screens (tablets, 600dp+): layout adjusts — 2-column grid for items list
- Font sizes use `sp` units that respect system font size settings
- All touch targets minimum **44×44dp**
- Landscape orientation: supported but not optimized in v1 (portrait is primary)

---

## 12. Accessibility Considerations

- All icons have `accessibilityLabel` props
- All interactive elements have `accessibilityRole` and `accessibilityHint`
- Color is never the only indicator of state (always paired with icon or text)
- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text
- Screen reader (TalkBack / VoiceOver) traversal order matches visual order
- Animated elements can be disabled via system "Reduce Motion" setting
- Alert banners announced by screen readers on appearance

---

## 13. Navigation & Deep Linking

| Notification Type | Deep Link Target |
|---|---|
| ITEM_MISSING | Items tab → Item List (with filter: Missing) |
| GEOFENCE_BREACH | Map tab → GPS Live Map |
| UNAUTHORIZED_ACCESS | Dashboard → Lock Widget highlighted |
| LOCK_STATE_CHANGE | Lock Screen |
| DEVICE_OFFLINE | Dashboard |

Deep link format: `smartbag://screen/{screenName}?params={json}`

---

## Implemented / Code Notes

- The UI/UX design is implemented in the mobile app under `mobile/src/` following the structure in this document. Key locations:
  - Screens: `mobile/src/screens/` (onboarding, pairing, dashboard, rfid, gps, lock, notifications, settings)
  - Components: `mobile/src/components/` (common UI building blocks listed in Component Inventory)
  - Navigation: `mobile/src/app/navigation/` (Root/Tab/Stack navigators)
  - State: `mobile/src/store/` (Zustand stores for auth, device, rfid, gps)
  - API clients: `mobile/src/api/` and `mobile/src/services/` (websocket, fcm, storage)

Notes:
- If you want, I can generate a short checklist mapping each SCR-* screen to the exact file path for quick verification.
