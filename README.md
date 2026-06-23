# 💧 CycleWater

> Find water points along your cycling routes. Plan smarter, ride safer.

![CycleWater App](https://img.shields.io/badge/PWA-Ready-0EA5E9?style=flat-square) ![License](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square) ![Data](https://img.shields.io/badge/Data-OpenStreetMap-EAB308?style=flat-square)

---

## What is CycleWater?

CycleWater is a free, open-source **Progressive Web App (PWA)** for cyclists who want to know where they can refill their water bottles — before and during a ride.

It combines **OpenStreetMap's global database of 900,000+ drinking water points** with a **community layer** where cyclists can add water sources they discover in the field. No sign-up needed to use the core features.

---

## Live App

🔗 **[aitormaa.github.io/cyclewater](https://aitormaa.github.io/cyclewater/)**

---

## Features

### 📊 Analyse GPX
Upload an existing GPX route and instantly see:
- All water points (fountains, taps, springs, shops) along the route
- **Dry zone alerts** — stretches with no water beyond your threshold (default 30km, adjustable)
- Download an **enriched GPX** with water points as waypoints — loads directly on Garmin, Wahoo, Hammerhead
- Download a **CSV / Excel** file with all water points for planning and sharing

### 🗺️ Plan Route
Build a new route directly on the map:
- Click waypoints on the map (start, intermediate stops, finish)
- The app calculates a **real cycling road route** via OSRM
- Water points appear instantly along the planned route
- Adjust waypoints until dry zones are covered
- Download as GPX or CSV with water points included

### 📍 Live Mode (during the ride)
- Activates your phone GPS
- Shows your position on the map in real time
- **Alerts you when a water point is within X km** of your current position — even if it's off your route
- Tap "Navigate →" to open Google Maps with turn-by-turn directions to the nearest water point
- Configurable alert radius (default 2km)

### ➕ Community Water Points
- Add water points you discover that aren't on the map
- Choose the type: fountain, tap, spring, shop, bar/cafe, other
- Add notes (e.g. "behind the church", "open 24h", "potable")
- Points shared with all users via Supabase (free to set up — optional)

### 📱 Works Like a Native App
- **Install to home screen** on iPhone (Safari) and Android (Chrome)
- Full-screen mode, custom 💧 icon, splash screen
- **Offline support** — cached map tiles and app shell work without internet

---

## Install on Your Phone

### iPhone (Safari)
1. Open **[aitormaa.github.io/cyclewater](https://aitormaa.github.io/cyclewater/)** in Safari
2. Tap the **Share** button `□↑`
3. Tap **"Add to Home Screen"**
4. Tap **Add**

### Android (Chrome)
1. Open **[aitormaa.github.io/cyclewater](https://aitormaa.github.io/cyclewater/)** in Chrome
2. Tap the **3-dot menu** `⋮`
3. Tap **"Add to Home screen"**
4. Tap **Add**

The app opens full-screen from your home screen, exactly like a native app.

---

## How to Use

### Before your ride — Analyse an existing route
1. Export your route from Komoot, Strava, Garmin Connect as a `.gpx` file
2. Open CycleWater → **Analyse GPX** tab
3. Upload the file (drag & drop or tap to browse)
4. Check the **Dry Zone Alerts** — any gap over 30km is flagged
5. Tap **⬇️ GPX for GPS** → load it on your Garmin/Wahoo/Hammerhead
6. Or tap **📊 CSV / Excel** → open in Google Sheets for planning

### Before your ride — Plan a new route around water
1. Open CycleWater → **Plan Route** tab
2. Tap **"Click map to add waypoints"**
3. Tap your start, any stops, and your destination
4. Tap **Calculate Route** — a real cycling road route is calculated
5. Check dry zones, adjust waypoints to pass near water
6. Download enriched GPX when happy

### During your ride — Live Mode
1. Load your route (Analyse or Plan)
2. Tap **📍 Live Mode** on the map
3. Your position appears as a yellow pin
4. A blue alert appears at the bottom when water is within 2km of you
5. Tap **Navigate →** for directions to the nearest water point

### Add a water point you found
1. Tap the green **+** button on the map
2. Tap the exact location
3. Choose type and add notes
4. Tap **Save**

---

## Settings

| Setting | Default | Description |
|---|---|---|
| Search radius | 500m | How far from the route to look for water |
| Dry zone alert | 30km | Minimum gap without water to trigger a warning |
| Nearby alert | 2km | Live mode detection radius |

---

## (Optional) Set up community water points

To enable the collaborative feature, create a free [Supabase](https://supabase.com) account and run this SQL in the SQL Editor:

```sql
CREATE TABLE community_water_points (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lat         FLOAT NOT NULL,
  lng         FLOAT NOT NULL,
  water_type  TEXT NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE community_water_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read"
  ON community_water_points FOR SELECT USING (true);

CREATE POLICY "Anyone can insert"
  ON community_water_points FOR INSERT WITH CHECK (true);
```

Then open the app → **🔧 Community DB** → paste your Supabase URL and Anon Key.

---

## Data Sources

| Source | What it provides | License |
|---|---|---|
| [OpenStreetMap](https://www.openstreetmap.org) | 900,000+ drinking water points globally | ODbL |
| [OpenFreeMap](https://openfreemap.org) | Map tiles | MIT |
| [OSRM](https://project-osrm.org) | Cycling road route calculation | BSD-2 |
| Community (Supabase) | User-added water points | Your own data |

> Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the Open Database License.

---

## File Structure

```
cyclewater/
├── index.html    # The entire app (single file, no build step)
├── sw.js         # Service worker for offline support
└── README.md     # This file
```

---

## Technology & Cost

| Component | Technology | Cost |
|---|---|---|
| Maps | MapLibre GL JS | Free (MIT) |
| Map tiles | OpenFreeMap | Free |
| Water point data | Overpass API (OpenStreetMap) | Free |
| Cycling routing | OSRM | Free |
| Community database | Supabase | Free tier |
| Hosting | GitHub Pages | Free |
| **Total running cost** | | **$0** |

---

## Roadmap

- [ ] Water point photos
- [ ] "Still works / Broken" community validation
- [ ] Filter by water type (potable only, natural springs, etc.)
- [ ] Search route by city name (no GPX needed)
- [ ] Multi-day route planning with water stops

---

## Contributing

Water points missing in your area? Add them to [OpenStreetMap](https://www.openstreetmap.org) directly — they appear in CycleWater for everyone within days.

Found a water point on a ride? Use the **Add Water Point** feature in the app.

---

## License

MIT — free to use, modify, and distribute.

---

*Made with 💧 for cyclists, by a cyclist.*
