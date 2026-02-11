# Resource icons (Catan)

Resource icons in the app are **not image files by default**. They come from:

**`HexLogicMobile/components/ResourceIcon.tsx`**
- **RESOURCE_LABELS** – emoji characters (🧱 🪵 🐑 🌾 ⛏) rendered as text
- **RESOURCE_COLORS** – background colors for each resource

Emojis are drawn by the OS, so they can look different on iOS, Android, and web (and change with OS updates). That’s why some “images” can look like they’re coming from somewhere else.

## Using your own images

1. Add one PNG per resource in **this folder** (`assets/images/resources/`):
   - `Brick.png`
   - `Lumber.png`
   - `Wool.png`
   - `Grain.png`
   - `Ore.png`  
   (Desert has no icon and stays hidden.)

2. Edit **`assets/images/resources/index.ts`** in this folder and uncomment / fill in the `RESOURCE_IMAGE_SOURCES` map so each resource points to its image (e.g. `Brick: require('./Brick.png')`).

3. Rebuild the app. `ResourceIcon` will use these images when they’re provided; otherwise it falls back to the emoji + color circle.
