# 💧 CycleWater

> Find water points along your cycling routes. Plan smarter, ride safer.

![CycleWater App](https://img.shields.io/badge/PWA-Ready-0EA5E9?style=flat-square) ![License](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square) ![Data](https://img.shields.io/badge/Data-OpenStreetMap-EAB308?style=flat-square)

---

## What is CycleWater?

CycleWater is a free, open-source **Progressive Web App (PWA)** for cyclists who want to know where they can refill their water bottles — before and during a ride.

It combines **OpenStreetMap's global database of drinking water points** with a **community layer** where cyclists can add water sources they discover in the field. No sign-up needed to use the core features.

---

## Features

### 📊 Analyse GPX
Upload an existing GPX route and instantly see:
- All water points (fountains, taps, springs, shops) along the route
- **Dry zone alerts** — stretches with no water beyond your threshold (default 30km, adjustable)
- Download an **enriched GPX** with water points as waypoints — loads directly on Garmin, Wahoo, Hammerhead

### 🗺️ Plan Route
Build a new route directly on the map:
- Click waypoints on the map (start, intermediate stops, finish)
- The app calculates a **real cycling road route** via OSRM
- Water points appear instantly along the planned route
- Adjust waypoints until dry zones are covered
- Download as GPX with water waypoints included

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
- Points shared with all users via Supabase (free to set up)

### 📱 Works Like a Native App
- **Install to home screen** on iPhone (Safari) and Android (Chrome)
- Full-screen mode, custom icon, splash screen
- **Offline support** — cached map tiles and app shell work without internet

---

## Live Demo

🔗 **[cyclewater.yourdomain.com](https://github.com)** *(replace with your GitHub Pages URL)*

---

## Data Sources

| Source | What it provides | License |
|---|---|---|
| [OpenStreetMap](https://www.openstreetmap.org) | Drinking fountains, taps, springs | ODbL |
| [OpenFreeMap](https://openfreemap.org) | Map tiles | MIT |
| [OSRM](https://project-osrm.org) | Cycling route calculation | BSD-2 |
| Community (Supabase) | User-added water points | Your own data |

> Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the Open Database License.

---

## Getting Started

### Option 1: Use it directly
Visit the live URL and add it to your home screen. No installation required.

### Option 2: Deploy your own instance

**Requirements:** A GitHub account (free). That's it.

#### 1. Fork or clone this repository
```bash
git clone https://github.com/yourusername/cyclewater.git
cd cyclewater
```

#### 2. Enable GitHub Pages
1. Go to your repo → **Settings** → **Pages**
2. Branch: `main` / Folder: `/ (root)` → **Save**
3. Your app will be live at `https://yourusername.github.io/cyclewater/`

#### 3. (Optional) Set up community water points
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

Then open the app → **Settings → Community DB** → paste your Supabase URL and Anon Key.

---

## Install on Your Phone

### iPhone (Safari)
1. Open the app URL in **Safari** (not Chrome)
2. Tap the **Share** button `□↑`
3. Tap **"Add to Home Screen"**
4. Tap **Add**

### Android (Chrome)
1. Open the app URL in **Chrome**
2. Tap the **3-dot menu** `⋮`
3. Tap **"Add to Home screen"**
4. Tap **Add**

The app opens full-screen from your home screen, exactly like a native app.

---

## How to Use

### Before your ride — Analyse an existing route
1. Export your route from Komoot, Strava, Garmin Connect, or any GPS app as a `.gpx` file
2. Open CycleWater → **Analyse GPX** tab
3. Upload the file (drag & drop or tap to browse)
4. The map shows all water points along your route within 500m (adjustable)
5. Check the **Dry Zone Alerts** — any gap over 30km is flagged
6. Tap **Download Enriched GPX** → load it on your Garmin/Wahoo/Hammerhead

### Before your ride — Plan a new route around water
1. Open CycleWater → **Plan Route** tab
2. Tap **"Click map to add waypoints"**
3. Tap your start point, any intermediate points, and your destination
4. Tap **Calculate Route** — a real cycling road route is calculated
5. Check where dry zones are, adjust waypoints to pass near water
6. Download the enriched GPX when happy

### During your ride — Live Mode
1. Load your route (Analyse or Plan)
2. Tap **📍 Live Mode** on the map
3. Your position appears as a yellow pin
4. A blue alert banner appears at the bottom whenever water is within 2km of you
5. Tap **Navigate →** to get directions to the nearest water point

### Add a water point you found
1. Tap the green **+** button on the map
2. Tap the exact location on the map
3. Choose the water type and add notes
4. Tap **Save** — it appears for everyone using your instance

---

## Configuration

All settings are accessible in the **⚙️ Settings** panel:

| Setting | Default | Description |
|---|---|---|
| Search radius | 500m | How far from the route to look for water |
| Dry zone alert | 30km | Minimum gap to trigger a warning |
| Nearby alert | 2km | Live mode detection radius |

---

## File Structure

```
cyclewater/
├── index.html    # The entire app (single file)
├── sw.js         # Service worker for offline support
└── README.md     # This file
```

The app is intentionally built as a **single HTML file** with no build step, no dependencies to install, and no server-side code. Everything runs in the browser.

---

## Technology

| Component | Technology | Cost |
|---|---|---|
| App framework | Vanilla JavaScript | Free |
| Maps | [MapLibre GL JS](https://maplibre.org) | Free (MIT) |
| Map tiles | [OpenFreeMap](https://openfreemap.org) | Free |
| Water point data | [Overpass API](https://overpass-api.de) (OpenStreetMap) | Free |
| Cycling routing | [OSRM](https://router.project-osrm.org) | Free |
| Community database | [Supabase](https://supabase.com) | Free tier |
| Hosting | [GitHub Pages](https://pages.github.com) | Free |
| **Total running cost** | | **$0** |

---

## Roadmap

- [ ] Route search by city name (no GPX needed)
- [ ] Water point photos
- [ ] "Still works / Broken" community validation
- [ ] Komoot and Strava route import
- [ ] Filter by water type (potable only, natural springs, etc.)
- [ ] Multi-day route planning with water stops

---

## Contributing

Water points missing in your area? The best way to help is to add them to [OpenStreetMap](https://www.openstreetmap.org) directly — they'll appear in CycleWater for everyone worldwide within days.

Found a water point on a ride that isn't on the map? Use the **Add Water Point** feature in the app.

---

## License

MIT License — free to use, modify, and distribute.

---

## Acknowledgements

- [OpenStreetMap](https://www.openstreetmap.org) community for the incredible global map data
- [MapLibre](https://maplibre.org) for the open-source map rendering engine
- [OpenFreeMap](https://openfreemap.org) for free, no-limit map tiles
- [OSRM](https://project-osrm.org) for free cycling routing
- [Watrify](https://watrify.de) for proving that one person can build something meaningful for the cycling community

---

*Made with 💧 for cyclists, by a cyclist.*
