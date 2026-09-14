# Dashboard artwork

Generated with the built-in image-generation tool for the supplied dashboard reference. These illustrations are decorative, not photographs of actual MassClick premises. WebP files here are the production assets; the original PNGs are kept in `tmp/dashboard-review/artwork/` for this workspace.

## Prompt set

**temple-panorama.webp:** Create a production website decorative background asset, a very wide panoramic Tamil Nadu temple landscape for a business dashboard welcome banner. No text, no letters, no logos, no UI. Composition: leftmost 40% largely empty rich cobalt and azure blue soft atmospheric sky for white text overlay. Center has blue mountains and luminous lavender peach sunset clouds. Right half detailed photorealistic ornate South Indian Tamil Nadu gopuram temple towers, largest tower at 74% width and smaller towers continuing right, green treetops at base. Sophisticated luminous blue sky, golden sunlight on temples, similar to premium tourism photography composited as a website header. Wide landscape aspect ratio 3:1, 1536x512 or larger. Keep all architectural subjects concentrated in lower half so asset can be cropped into a shallow 11:1 banner.

**local-businesses.webp:** Create a wide panoramic decorative illustration for the bottom banner of a premium Indian local business dashboard. No text, no letters, no typography. A charming detailed miniature 3D Indian neighborhood with colorful local storefronts, terracotta roofs, a cafe and a small shop, green trees, blue and white clouds, floating orange and blue map location pins. Premium polished realistic 3D illustration, bright sky blue and white palette with orange highlights. Composition all buildings concentrated on the right two thirds, lower half of image, left third pale sky blue clear negative space for dark blue text. Landscape 3:1 aspect ratio. Soft luminous morning daylight, crisp clean website banner artwork.

**rocket.webp:** A polished premium 3D illustration for a small vertical website sidebar promotion. A playful white and orange rocket with a blue circular window lifting off above miniature green trees and small green islands, glossy clean 3D style, bright orange flame and soft clouds. Deep navy blue to royal blue gradient background. Place rocket on the RIGHT HALF and bottom right; keep LEFT HALF mostly clear dark blue for white text overlay. No text or lettering. Landscape 3:2 composition.

The map uses visible OpenStreetMap tiles and attribution, not generated imagery. Its tile endpoint can be configured with `REACT_APP_DASHBOARD_MAP_TILE_URL`; providers must use the same `{z}/{x}/{y}` tile scheme and require compatible attribution. See the [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/).

## Data definitions

- Date and creator filters scope business counts; user and enquiry totals remain account-wide. Sparkline changes compare equal halves of the visible chart, not a historical active-business snapshot.
- Active-business trend counts currently active listings created on each chart day.
- Map cluster counts include only businesses with saved, valid coordinates. Clicking a cluster opens all matching listings for its location.
- SEO score is the completeness of titles, descriptions and canonical URLs across active SEO records. Google indexing, broken links and schema coverage remain unmeasured until a source supplies those audit results.
- The bulk upload shortcut opens the existing documents workspace, which supports multiple supporting files. Payout reporting has no connected data source.
- Browser review fixtures live only under `tmp/dashboard-review`; their example metrics are never imported by the production app.
