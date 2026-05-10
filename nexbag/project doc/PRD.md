# PRD.md — Product Requirements Document
# Smart Bag-Pack: IoT-Based Intelligent Backpack System

---

## 1. Project Name

**Smart Bag-Pack** — IoT-Based Intelligent Backpack System
**Codename:** `smartbag`
**Version:** v1.0
**Institution:** PDPM IIITDM Jabalpur
**Mentor:** Prof. Dinesh Kumar Vishwakarma

---

## 2. Product Vision

To build a smart, connected backpack system that gives everyday users — students, professionals, and frequent travelers — complete awareness and control over their bag and its contents at all times, through a seamless mobile application backed by real-time IoT sensor data.

The system eliminates the anxiety of theft, forgotten belongings, and uncontrolled access by making the backpack an intelligent, responsive, and communicative object in the user's daily life.

---

## 3. Problem Statement

Everyday backpack users face a consistent set of problems that remain unsolved by traditional bags:

| Problem | % of Survey Respondents Affected |
|---|---|
| Theft or misplacement fears | 65% |
| Tangled cables / charging problems | 74% |
| Forgotten items inside the bag | 50% |
| No on-the-go charging | 60% |
| No way to know bag location | 65% |

Current solutions — padlocks, tracking tiles, cable pouches — are fragmented, passive, and require manual effort. There is no unified system that combines security, item tracking, smart locking, and real-time location into one coherent experience.

**Core insight:** Users do not need a smarter bag. They need a connected bag that communicates with them intelligently.

---

## 4. Target Users

### Primary Users
- **College/University students** who carry laptops, tablets, ID cards, stationery, and books daily for 4–6 hours.
- **Working professionals** commuting to offices with laptops, chargers, documents, and valuables.

### Secondary Users
- **Frequent travelers** who move between transit locations and need anti-theft and tracking capabilities.

### Demographics
- Age: 18–35
- Tech familiarity: Moderate to high (comfortable with smartphones and apps)
- Location: Urban/semi-urban India
- Primary device: Android smartphone (iOS secondary)

---

## 5. User Personas

### Persona 1 — Arjun, 21, Engineering Student
- Carries laptop, notebook, ID card, water bottle, and cables every day
- Has lost his ID card twice inside the bag
- Scared of bag theft in crowded public transport
- Wants an alert when he forgets his laptop charger
- Uses phone constantly; comfortable with apps
- **Pain points:** Forgetting items, no way to confirm if bag is locked, theft anxiety

### Persona 2 — Priya, 27, IT Professional
- Commutes via metro with a laptop bag
- Travels to client sites 3x/week
- Has had her bag unzipped without noticing in a crowd
- Wants to know if someone touches her bag when she's not watching
- **Pain points:** Unauthorized access, no real-time location when bag is left at desk, no remote lock

### Persona 3 — Rahul, 24, Frequent Traveler
- Uses backpack on buses, trains, and flights
- Worried about bag being swapped or stolen at airports
- Wants GPS tracking so he can verify bag location at all times
- **Pain points:** Bag theft, no geofence alerts, cannot lock bag remotely

---

## 6. Core Use Cases

### UC-01: Register and Pair Bag
User downloads the app, creates an account, and pairs it with their Smart Bag-Pack hardware via a unique device ID. After pairing, the app begins receiving live data from the bag's sensors.

### UC-02: Monitor RFID-Tagged Items in Real Time
User tags their important belongings (laptop, ID card, charger, wallet) with RFID stickers. The bag's embedded UHF RFID reader scans these tags continuously. The app shows which items are currently inside the bag. When a tagged item is missing, the user is alerted.

### UC-03: Track Bag Location via GPS
The app displays the bag's real-time GPS coordinates on a map. If the bag moves beyond a user-defined geofence radius without the user's phone being nearby (Bluetooth proximity check), an anti-theft alert is triggered immediately.

### UC-04: Control Smart Lock Remotely
The user can lock or unlock the backpack's servo-based smart lock from the app. A manual override is available on the bag itself. The app shows the current lock state at all times.

### UC-05: Receive Push Notifications and Alerts
The app sends push notifications for: item missing alerts, anti-theft geofence breach, bag opened while locked, lock state changes, and low device battery (hardware).

### UC-06: View Alert History and Activity Logs
User can view a chronological log of all events — lock/unlock actions, GPS location history, items detected/removed, and alerts triggered.

### UC-07: Manage RFID Tag Aliases
User can assign human-readable names to RFID tag EPCs (e.g., "MacBook Pro", "IIITDM ID Card", "Charger") so items are displayed with meaningful labels instead of raw codes.

### UC-08: Configure Geofence and Alert Preferences
User can set a geofence radius (50m–500m), toggle individual alert types, and configure quiet hours during which non-critical notifications are silenced.

---

## 7. Business Goals

Since this is a student portfolio/EDP project, "business goals" are defined as:

1. **Demonstrate technical feasibility** of a full-stack IoT mobile system as a capstone project.
2. **Showcase interdisciplinary integration** across CS, ECE, and mechanical engineering.
3. **Build a portfolio-grade, production-ready codebase** suitable for internship and job applications.
4. **Establish a working prototype** that can be demo-ed live with actual hardware.
5. **Lay groundwork for future commercialization** or startup pivot.

---

## 8. Success Metrics

| Metric | Target |
|---|---|
| App successfully pairs with hardware | 100% success in demo |
| Real-time RFID item list updates within | < 2 seconds of physical change |
| GPS location update latency | < 5 seconds |
| Smart lock command response time | < 3 seconds end-to-end |
| Push notification delivery | > 95% success rate |
| App crash-free sessions | > 99% |
| Cold start time (app launch to dashboard) | < 3 seconds |
| Alert false positive rate | < 5% |

---

## 9. Scope of v1

The following features are confirmed for v1:

| Module | Feature | Status |
|---|---|---|
| Auth | Email/password registration and login | ✅ v1 |
| Auth | JWT-based session management | ✅ v1 |
| Device | Pair bag hardware via Device ID | ✅ v1 |
| RFID | Real-time item list display | ✅ v1 |
| RFID | Item missing alert | ✅ v1 |
| RFID | Assign alias names to RFID tags | ✅ v1 |
| GPS | Live location map view | ✅ v1 |
| GPS | Geofence breach detection and alert | ✅ v1 |
| GPS | Location history log | ✅ v1 |
| Lock | Lock/unlock command from app | ✅ v1 |
| Lock | Real-time lock status display | ✅ v1 |
| Lock | Alert when bag opened while locked | ✅ v1 |
| Notifications | Push notifications via FCM | ✅ v1 |
| Notifications | In-app notification center | ✅ v1 |
| Notifications | Per-alert type toggle settings | ✅ v1 |
| Activity Log | Full chronological event history | ✅ v1 |
| Settings | Geofence radius configuration | ✅ v1 |
| Settings | Quiet hours configuration | ✅ v1 |
| Settings | Profile management | ✅ v1 |

---

## 10. Out of Scope (v1)

The following are explicitly excluded from v1:

- **Load/weight monitoring** — excluded per project decision
- **Solar panel / battery power monitoring** — excluded per project decision
- **Multiple bag support per user** — single bag per account in v1
- **Social/sharing features** — bag sharing with family or teammates
- **Offline mode with sync** — app requires active internet connection
- **Web dashboard** — mobile app only in v1
- **Biometric smart lock** — fingerprint or face unlock of the physical lock
- **OTA firmware updates** — manual only in v1
- **Third-party integrations** — Google Maps advanced routing, insurance APIs, etc.
- **Analytics dashboard** — usage analytics for the user
- **In-app chat or support** — no customer support module in v1
- **Payment / subscription** — free for v1 (portfolio project)

---

## 11. End-to-End User Journey

### First-Time Setup Journey

```
1. User downloads Smart Bag-Pack app
2. User registers with name, email, password
3. User receives email verification (optional in v1 — skipped for demo speed)
4. User lands on Setup screen
5. User enters the Device ID printed on hardware or scanned via QR
6. App sends pairing request to backend
7. Backend verifies device exists and is unregistered
8. Device is linked to user account
9. App transitions to Dashboard
10. User sees live RFID item list (empty until tags are added)
11. User adds RFID tags one by one — places item near bag's reader
    → Tag EPC appears in app → User assigns a name → Saved
12. User enables GPS tracking → map view activates
13. User sets geofence radius in Settings
14. User configures which alerts to receive
15. User tests smart lock: taps Lock → bag locks → taps Unlock → bag unlocks
16. System is fully operational
```

### Daily Usage Journey

```
Morning:
1. User packs bag
2. App dashboard shows all tagged items: "Laptop ✅, Charger ✅, ID Card ✅"
3. User locks bag from app
4. User leaves home

In Transit:
5. GPS map shows bag location (same as user's phone if bag is with them)
6. If bag left behind → geofence alert triggers → push notification sent

At Destination:
7. User sets bag down
8. If someone opens bag without unlocking → "Bag opened while locked" alert triggers
9. User checks RFID list to confirm all items inside

Leaving:
10. User checks item list before leaving — "Charger ❌ missing!"
11. Alert already fired → user retrieves charger
12. User unlocks bag, packs charger, locks again

Evening:
13. User reviews Activity Log → sees full event timeline for the day
```

---

## 12. Key Assumptions

1. The hardware (Raspberry Pi + UHF RFID reader + GPS module + servo lock + ESP32) is functional and tested independently.
2. The Raspberry Pi runs the backend MQTT publisher (App Backend as per App Backend Report).
3. The backend MQTT broker is accessible over the internet or local network during demo.
4. Each bag has a unique, pre-registered Device ID burned into hardware configuration.
5. The mobile app communicates with the backend over HTTPS REST API and WebSocket.
6. Push notifications are delivered via Firebase Cloud Messaging (FCM).
7. GPS coordinates are provided by the hardware GPS module, not the phone's GPS.
8. RFID tag EPCs are globally unique per physical tag.
9. One user account maps to exactly one bag in v1.
10. Internet connectivity is required for all real-time features.
11. The app's minimum Android version target is Android 8.0 (API 26).

---

## 13. Risks and Constraints

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Hardware MQTT connectivity drops | Medium | High | Implement reconnection logic; show "Bag Offline" state in app |
| GPS accuracy indoors is poor | High | Medium | Display accuracy radius on map; warn user when accuracy > 50m |
| RFID false negatives (tag not detected) | Medium | Medium | Use read count threshold before declaring item "missing" |
| FCM push delivery delays on some Android OEMs | Medium | Low | Also show in-app notification center as fallback |
| Smart lock servo mechanical failure | Low | High | App shows "command sent" status; hardware confirms separately |
| Single Raspberry Pi = single point of failure | High | High | Accepted for v1 demo scope; document for v2 improvement |
| React Native WebSocket reconnection complexity | Medium | Medium | Use battle-tested library (react-native-background-timer + socket.io-client) |
| Student team bandwidth | High | Medium | Strict MVP scope enforced; features.md defines MVP vs future |
