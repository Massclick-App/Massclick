# Trichy (Tiruchirappalli) masterlocations — geo coverage audit

**Read-only.** Nothing was written. Source: `massClick_dev` @ `127.0.0.1:27019` (massclick-mongodb tunnel), 2026-08-29.
District key: `district: "Tiruchirappalli"` (no `"Trichy"` variant exists in `masterlocations`).

---

## 1. Counts by layer

| level | total docs | active | approved | pending |
|---|---|---|---|---|
| district | 1 | 1 | 1 | 0 |
| zone | 18 | 18 | 18 | 0 |
| ward | 215 | 156 | 156 | 0 |
| locality | 10,618 | 5,494 | 5,494 | 3,226 |

- 5,124 inactive localities (mostly the un-promoted tail of the enrichment import).
- **Structural gap:** wards/localities reference a zone named **`Tiruverumbur`** (94 active localities) for which **no zone document exists**. Separately, `Ariyamangalam` has a *ward* called `Thiruverumbur` — two spellings, two layers, same place.
- 845 active localities have **no ward** (`ward: null`) — they hang directly off a zone.
- Pincode coverage is fine: only 1 active locality lacks a pincode.

## 2. Coordinate coverage (active only)

| level | active | with coords | coverage |
|---|---|---|---|
| district | 1 | 1 | 100% |
| zone | 18 | 6 | **33.3%** |
| ward | 156 | 20 | **12.8%** |
| locality | 5,494 | 428 | **7.8%** |

Total docs carrying coordinates in the district: 461 (455 active).

### Where the existing coordinates came from

| level | source | confidence | n |
|---|---|---|---|
| district | derived-from-children | medium | 1 |
| zone | derived-from-children | medium / high | 4 / 2 |
| ward | derived-from-children | high / medium | 18 / 2 |
| locality | gmaps-leads-derived | high / medium | 216 / 147 |
| locality | mixed-derived | high | 18 |
| locality | business-derived | high / medium / low | 5 / 20 / 21 |
| locality | *(none — no meta at all)* | — | 1 |

Nothing in Trichy is currently `manual` or geocoder-verified. Every coordinate is inferred.

## 3. Zones — ward / locality counts and coordinate counts (active)

| zone | zone doc | zone coord | wards | wards w/ coord | localities | localities w/ coord |
|---|---|---|---|---|---|---|
| K. Abishekapuram | active | derived | 20 | 11 | 1744 | 207 |
| Ariyamangalam | active | derived | 14 | 4 | 662 | 56 |
| Golden Rock | active | derived | 13 | 1 | 473 | 15 |
| Srirangam | active | derived | 14 | 3 | 441 | 73 |
| Manachanallur | active | **MISSING** | 11 | 0 | 245 | 6 |
| Marungapuri | active | **MISSING** | 2 | 0 | 244 | 2 |
| Manapparai | active | **MISSING** | 19 | 0 | 221 | 19 |
| Musiri | active | **MISSING** | 9 | 0 | 203 | **0** |
| Lalgudi | active | **MISSING** | 13 | 0 | 190 | 4 |
| Thuraiyur | active | **MISSING** | 16 | 0 | 180 | 2 |
| Thottiyam | active | **MISSING** | 8 | 0 | 166 | 2 |
| Andanallur | active | derived | 2 | 0 | 130 | 3 |
| Thathaiyangarpettai | active | **MISSING** | 1 | 0 | 122 | 2 |
| Manikandam | active | **MISSING** | 3 | 1 | 113 | 19 |
| Vaiyampatti | active | derived | 1 | 0 | 103 | 5 |
| Pullambadi | active | **MISSING** | 8 | 0 | 101 | **0** |
| Tiruverumbur | **NO ZONE DOC** | — | 0 | 0 | 94 | 12 |
| Uppiliapuram | active | **MISSING** | 1 | 0 | 61 | 1 |
| Kattuputhur | active | **MISSING** | 1 | 0 | 1 | 0 |

12 of 18 zone docs have no coordinate; 136 of 156 active wards have no coordinate.

## 4. Missing coordinates

**Localities:** 5,066 active localities across 485 zone/ward groups have no coordinate.
Of those, 57 are junk address fragments (see 5h) — the other ~5,009 are real place names.
676 of the missing are the ward-less (`ward: null`) localities.

**Wards missing coordinates (136), by zone:**

| zone | missing wards |
|---|---|
| Manapparai (19) | Adi Dravidar Colony, Chinnapatti, East Colony, Gandhi Nagar, Idaiyapatti, Kamarajar Nagar, Kannuthu, Karuppur, Kumar Nagar, Melapatti, Moovendhar Nagar, New Bus Stand Area, Periyar Nagar, Pudupatti, Railway Station Area, South Colony, Sundar Nagar, Thirumalai Nagar, Vaiyampatti |
| Thuraiyur (16) | Adi Dravidar Colony, Anna Nagar, Bus Stand Area, Kamarajar Nagar, Kannabiran Nagar, Kattur, MGR Nagar, Mettupalayam, New Colony, Periyar Nagar, Puthur, Saminathapuram, Sengulam, Sengunthar Nagar, Sivaji Nagar, Thuraiyur West |
| Lalgudi (13) | Adi Dravidar Colony, Anbil, Anna Nagar, Bus Stand Area, Kallakudi, Kattur, New Colony, Periyar Nagar, Poovalur, Sundar Nagar, Thirumanamedu, VOC Nagar, Valadi |
| **Golden Rock (12)** | Airport Area, Ettarai, **Gandhi Market**, Golden Rock Railway Colony, Kattur Pappakurichi, **Khajapettai**, **Palakkarai**, Panjapur, Pirattiyur, Ponmalai East, **Ponmalaipatti**, Senthaneerpuram West |
| **Srirangam (11)** | Devadhanam, Gunaseelam, Koothur, Moolathoppu, Mutharasanallur, Pettavaithalai, Somarasampettai, Srirangam South, **Thiruvanaikoil**, Tirupparaithurai, Vayalur |
| Manachanallur (11) | Adi Dravidar Colony, Anna Nagar, Bus Stand Area, Kamarajar Nagar, New Colony, Periyar Nagar, Samayapuram, Siruganur, Sundar Nagar, Thiruvellarai, VOC Nagar |
| **Ariyamangalam (10)** | **BHEL Township**, Central Prison, **Edamalaipatti Pudur**, K. Sathanur, Navalpattu, Oyyamari, **Sangiliyandapuram**, **Thennur**, **Thiruverumbur**, **Varaganeri** |
| **K. Abishekapuram (9)** | Bikshandarkoil, **Crawford**, Edayarpalayam, Gundur, **Karumandapam**, Mahalakshmi Nagar, **Ramalinga Nagar**, **Subramaniapuram**, **Teppakulam** |
| Musiri (9) | Adi Dravidar Colony, Anna Nagar, Bus Stand Area, Cauvery Nagar, MGR Nagar, New Colony, Railway Station Area, Sivaji Nagar, Sundar Nagar |
| Thottiyam (8) | Adi Dravidar Colony, Anna Nagar, Bus Stand Area, Kamarajar Nagar, New Colony, Periyar Nagar, Sundar Nagar, VOC Nagar |
| Pullambadi (8) | Adi Dravidar Colony, Anna Nagar, Bus Stand Area, MGR Nagar, New Colony, Sivaji Nagar, Sundar Nagar, VOC Nagar |
| Marungapuri (2) | Marungapuri, Thuvarankurichi |
| Manikandam (2) | Inamkulathur, Manikandam |
| Andanallur (2) | Andanallur, Jeeyapuram |
| Kattuputhur / Uppiliapuram / Vaiyampatti / Thathaiyangarpettai (1 each) | eponymous ward |

**Zones missing coordinates (12):** Kattuputhur, Lalgudi, Manachanallur, Manapparai, Manikandam,
Marungapuri, Musiri, Pullambadi, Thathaiyangarpettai, Thottiyam, Thuraiyur, Uppiliapuram
(plus Tiruverumbur, which has no zone doc at all).

**Wards with 20+ active localities and zero coordinates anywhere beneath them** — the "dark" pockets
where the distance ranker has nothing to work with:

Manachanallur > *(no ward)* 78 · Golden Rock > Kattur Pappakurichi 70 · Musiri > *(no ward)* 68 ·
K. Abishekapuram > Teppakulam 46 · Vaiyampatti > *(no ward)* 39 · Manapparai > Sooliapatti 37 ·
Thathaiyangarpettai > *(no ward)* 32 · Ariyamangalam > Central Prison 31 · Thuraiyur > *(no ward)* 31 ·
Pullambadi > *(no ward)* 29 · Manachanallur > Neikuppai 27 · Ariyamangalam > Varaganeri 26 ·
Tiruverumbur > Alathur 23 · Marungapuri > Paluvanji 22 · Musiri > Thiruthiyamalai 22 ·
Marungapuri > Gundur 22 · Golden Rock > Pirattiyur 21 · Marungapuri > Palakurichi 21 ·
Thottiyam > Mavalipatti 21 · Srirangam > Somarasampettai 20

## 5. Suspicious existing coordinates

### 5a. Outside India — 1 (active)

- `Tiruverumbur > Tiruverumbur > Tiruverumbur` → **`[0, 0]`**, no `coordinatesMeta` at all.
  Null Island. The worst single record: any distance search anchored here returns garbage.

### 5b. Outside Tamil Nadu — 0

### 5c. Inside TN but outside the Trichy district box — 5 (all active)

Four of them sit near **77.70°E** instead of ~78.6–78.7°E — a systematic ~1° longitude error that
put them near Coimbatore/Erode, 107–111 km from their own zone. All are `business-derived / low / n=1`.

| location | coordinate | km from zone |
|---|---|---|
| Ariyamangalam > Sangiliyandapuram > Sangiliyandapuram | [77.704684, 10.79814] | 110.9 |
| Golden Rock > Palakkarai > Big Bazaar Street | [77.6976726, 10.825702] | 109.2 |
| K. Abishekapuram > Mahalakshmi Nagar > Mahalakshmi Nagar | [77.7045, 10.8938] | 107.5 |
| K. Abishekapuram > Bikshandarkoil > Bikshandarkoil | [77.709831, 10.8743] | 106.7 |
| Thottiyam > Bus Stand Area > Main Road | [79.5753594, 10.4712706] | (lands near Thanjavur) |

### 5d. One-point / low-confidence business-derived — 22 active

All 21 records with `derivedFromCount: 1`, plus the `[0,0]` record:

Bharathi Nagar · Old Karur Road · Sangiliyandapuram · Thennur · BHEL Township · Palakkarai ·
Big Bazaar Street · **Central Bus Stand** · Ayyappa Nagar · Vayalur Road · Subramaniapuram ·
Mahalakshmi Nagar · Bikshandarkoil · Thirumalai Nagar · Dindigul Road · Trichy Road · Mettupalayam ·
VOC Street · West Street · Main Road · Uppiliapuram · Tiruverumbur

Notable single-source errors:

- `Thuraiyur > Kamarajar Nagar > VOC Street` → [78.740868, 10.800958] — that point is in *Trichy city*, ~40 km from Thuraiyur.
- `Ariyamangalam > Thennur > Thennur` → [78.686646, 10.819458] — Thennur is a K. Abishekapuram-side name; the ward/zone assignment itself looks wrong.
- `K. Abishekapuram > Cantonment > Central Bus Stand` → a single lead's point for one of the highest-traffic search terms in the city.

### 5e. Far from parent (beyond the 4 outliers above)

- `K. Abishekapuram > Sastri Road > Kathalur` — 19.1 km from zone (`gmaps-leads-derived/medium/4`)
- `K. Abishekapuram > Sastri Road > Fathimanagar` — 17.8 km from zone (`medium/3`)
- `Ariyamangalam > Thiruverumbur > Sooriyur` — 17.6 km from zone (`medium/30`)
- `K. Abishekapuram > Officers Colony > Airport Road` — 8.0 km from its ward (`business-derived/medium/2`)

### 5f. Duplicate points (same coordinate on more than one active doc)

- `[78.4353122, 10.611023]` x4 — Manapparai: Thirumalai Nagar, Gandhi Nagar, Madurai Road, Dindigul Road (one lead reused for four localities)
- `[78.7057497, 10.7631467]` x2 — Bharathi Nagar **and** ward Senthaneerpuram
- `[78.6891344, 10.7885644]` x2 — ward Mannarpuram **and** Circuit House Colony
- `[78.6033428, 10.8438279]` x2 — zone Andanallur **and** Kulumani
- plus 5 more pairs (Moolathoppu / Moolathoppu Rd, Old Karur Road / Bus Stand, Annai Avenue / Kollidakarai, Karappalayam / Kattur Rd, Malligai Salai / malligai)

### 5g. Low precision

- `Uppiliapuram > Uppiliapuram > Uppiliapuram` → [78.566, 11.252] — 3 decimals (~±100 m), and `low/n=1`.

### 5h. Junk locality records (data hygiene, not coordinates)

60 active "localities" are address fragments harvested from business addresses, not places:
`opposite Arun Hospital`, `nearby Bharath Petrol Pump`, `NearHotel`, `main gate`, `company`,
`branch`, plus Google plus-codes (`QMXC+WMP`, `RM3F+QG5`, `QM4Q+QXX`, `RM4J+WRV`).
57 of them have no coordinate. **Do not geocode these — deactivate them.**

## 6. Business-density view (what search actually hits)

3,680 Trichy businesses are linked to 113 distinct masterlocation slugs (only 7 unlinked).
**352 businesses (9.6%) sit in a location that has no coordinate** — 20 distinct locations.

Top locations by linked business count and their coordinate state:

| biz | coord | source/conf/n | location |
|---|---|---|---|
| 762 | yes | derived-from-children/medium/433 | *(district-level fallback)* |
| 683 | yes | mixed-derived/high/1682 | K. Abishekapuram > Thillai Nagar Main > Thillai Nagar |
| 555 | yes | gmaps-leads-derived/high/921 | K. Abishekapuram > K.K. Nagar > K.K. Nagar |
| 382 | yes | derived-from-children/high/73 | Srirangam *(zone)* |
| 167 | yes | derived-from-children/high/13 | Thillai Nagar Main *(ward)* |
| **164** | **MISSING** | — | **Ariyamangalam > Thiruverumbur** *(ward)* |
| 97 | yes | mixed-derived/high/231 | Ariyamangalam > Tharanallur > Singarathope |
| **67** | **MISSING** | — | **Musiri** *(zone)* |
| **51** | **MISSING** | — | **Manapparai** *(zone)* |
| 49 | yes | mixed-derived/high/289 | K. Abishekapuram > Puthur > Puthur |
| **20** | **MISSING** | — | **Golden Rock > Airport Area > TVS Tolgate** |
| **13** | **MISSING** | — | **Ariyamangalam > Navalpattu > Pappakurichi** |
| **9** | **MISSING** | — | **K. Abishekapuram > Teppakulam > Teppakulam** |
| **5** | **MISSING** | — | **Ariyamangalam > Sangiliyandapuram > Gandhi Nagar** |
| **4** | **MISSING** | — | **Ariyamangalam > Edamalaipatti Pudur > Sakthi Nagar** |
| **3** | **MISSING** | — | **Golden Rock > Kattur Pappakurichi > Kattur Pappakurichi** |

### Search-term evidence (`logsearches` — only 108 rows in dev, weak signal but directional)

`trichy` 56 · `tiruchirappalli` 16 · `mukkompu` 6 · `palpannai junction` 4 · `trichy junction` 3 ·
`thiruverumbur` 3 · `golden rock` 2 · `sembattu`, `sangiliyandapuram`, `k.k. nagar`, `palakkarai`,
`palakarai road`, `palpannai`, `tirumanilaiyur` 1 each.

**Every searched-for junction/landmark record is coordinate-less:**

| record | status |
|---|---|
| `K. Abishekapuram > (no ward) > Tiruchirappalli Junction` | active, **NO COORD** |
| `K. Abishekapuram > Tennur > Palpannai Junction` | active, **NO COORD** |
| `K. Abishekapuram > Cantonment > Railway Junction Area` | active, **NO COORD** |
| `K. Abishekapuram > Railway Junction` *(ward)* | **INACTIVE**, no coord |
| `Andanallur > Andanallur > Mukkompu` | active, **NO COORD** |
| `Ariyamangalam > Thiruverumbur` *(ward, 164 businesses)* | active, **NO COORD** |
| `Golden Rock > Palakkarai` *(ward)* | active, **NO COORD** |
| `Ariyamangalam > Sangiliyandapuram` *(ward)* | active, **NO COORD** |
| `K. Abishekapuram > Railway Junction > Railway Junction` | has coord (`mixed/high/10`) |
| `Ariyamangalam > (no ward) > Palpannai` | has coord (`gmaps/high/37`) |

That is the Trichy Junction problem generalised: the *searched string* resolves to a record with no
coordinate, while a near-duplicate sibling record does have one.

---

## 7. Prioritised update plan

### Which layer first

**Zones and wards first, localities second.**

1. It is 174 records (18 zones + 156 wards) versus 5,494 — a day of work, not a quarter.
2. Ward/zone coordinates are the safe *fallback origin*. Right now a search in Musiri or Pullambadi
   has **no coordinate at any level below the district**, so the ranker falls back to the district
   centroid — exactly the "broad average is unsafe" failure you already hit.
3. Every ward coordinate you set becomes the parent-proximity sanity check for the thousands of
   localities beneath it (the errors in 5c/5d are only detectable *because* those parents have coordinates).
4. Locality coverage will never reach 100% by hand; there the goal is the ~200 that matter.

Suggested order:

- **P0 — fix the 6 poison records first** (~30 min, highest damage-per-record)
  - `Tiruverumbur > Tiruverumbur > Tiruverumbur` `[0,0]` → real coordinate (or deactivate)
  - the four `77.70°E` records (Sangiliyandapuram, Big Bazaar Street, Mahalakshmi Nagar, Bikshandarkoil)
  - `Thottiyam > Bus Stand Area > Main Road` `[79.575, 10.471]`
  - also `Thuraiyur > Kamarajar Nagar > VOC Street` (a Trichy-city point under a Thuraiyur ward)

- **P1 — the 12 zone docs missing coordinates, plus create the missing `Tiruverumbur` zone doc**
  (and settle `Tiruverumbur` vs `Ariyamangalam > Thiruverumbur` — one spelling, one place)

- **P2 — the 20 search-critical coordinate-less records from section 6**, in this order:
  `Ariyamangalam > Thiruverumbur` (ward, 164 biz) · `Tiruchirappalli Junction` · `Golden Rock > Palakkarai`
  (ward) · `Ariyamangalam > Sangiliyandapuram` (ward) · `TVS Tolgate` · `Palpannai Junction` ·
  `Railway Junction Area` · `K. Abishekapuram > Teppakulam` (ward + locality) · `Pappakurichi` ·
  `Mukkompu` · `Kattur Pappakurichi` · `BHEL Township` · `Edamalaipatti Pudur` · `Thennur` ·
  `Varaganeri` · `Karumandapam` · `Ramalinga Nagar` · `Subramaniapuram` · `Crawford` ·
  `Srirangam > Thiruvanaikoil`

- **P3 — the remaining 136 wards**, city zones before rural:
  K. Abishekapuram → Ariyamangalam → Golden Rock → Srirangam → Tiruverumbur, then the taluk zones
  (Manapparai, Thuraiyur, Lalgudi, Manachanallur, Musiri, Thottiyam, Pullambadi, Marungapuri...).
  In the rural zones, most missing wards are the same generic template names repeated per taluk
  (`Adi Dravidar Colony`, `Anna Nagar`, `Bus Stand Area`, `New Colony`, `Periyar Nagar`,
  `Sundar Nagar`, `VOC Nagar`) — those look *synthetic*, not real wards. Decide whether to geocode
  them to the taluk town centre or deactivate them before spending effort there.

- **P4 — the ~20 large "dark" wards from section 4** (Kattur Pappakurichi 70, Teppakulam 46,
  Sooliapatti 37, Central Prison 31, Neikuppai 27, Varaganeri 26, Alathur 23...) — one good ward
  coordinate each lights up 20–78 localities via fallback.

- **P5 — hygiene, not geocoding:** deactivate the 60 junk localities (5h) and review the 845
  ward-less active localities. Do this *before* any bulk locality pass, or you will geocode noise.

### What to write

`coordinates` — GeoJSON Point, **`[longitude, latitude]`** in that order (the existing data confirms it,
e.g. `[78.690538, 10.8495517]`). Trichy district sanity box: lon `78.05–79.10`, lat `10.35–11.45`.
Use 6–7 decimals.

```js
coordinates: { type: "Point", coordinates: [78.6906480, 10.7986590] }
```

`coordinatesMeta` — keep the existing shape and introduce a `manual` source, so hand-entered points
are never overwritten by a future derive pass:

| field | what to put for a manual update |
|---|---|
| `source` | `"manual"` (existing values in use: `gmaps-leads-derived`, `business-derived`, `mixed-derived`, `derived-from-children`) |
| `confidence` | `"high"` for a point you placed yourself on the map; `"medium"` for a town-centre approximation on a synthetic ward |
| `query` | the search string you used, matching the existing convention: `"Tiruchirappalli, <zone>, <ward>, <locality>, <pincode>"` |
| `formattedAddress` | the Google/OSM formatted address you took the point from. Derived rows currently use this field for free-text notes, so it also suits e.g. "placed at Trichy Jn main entrance" |
| `placeId` | Google `place_id` if you have one, else `""` |
| `derivedFromCount` | `0`, or omit — it means "how many leads were averaged" and is meaningless for a manual point. Do **not** leave a stale inherited value |
| `updatedAt` | ISO date of your edit (also bump the doc's own `updatedAt`) |

Two open questions I did **not** answer, because I have not read the backend code (say the word and I will):

1. Does the ranking code branch on `coordinatesMeta.source` / `confidence`, or only on the presence
   of `coordinates`? If it branches, `"manual"` must be added to whatever allow-list exists.
2. Is there a `2dsphere` index on `masterlocations.coordinates`, and does the origin resolver walk
   locality → ward → zone → district? The plan above assumes it does.

### Before any write

```bash
node db-backups/backup.js --collections masterlocations --query "{\"district\":\"Tiruchirappalli\"}" --label pre-trichy-geo --reason "manual coordinate updates"
```
