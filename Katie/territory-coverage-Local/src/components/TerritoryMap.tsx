"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const FIPS_TO_STATE: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO",
  "09": "CT", "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI",
  "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY",
  "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
  "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH",
  "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
  "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
  "54": "WV", "55": "WI", "56": "WY",
};

export type MapMode = "group" | "rep";

export interface TerritoryData {
  stateAbbr: string;
  color: string;
  groups?: { name: string; colorHex: string; reps: { name: string; colorHex: string }[] }[];
  reps?: { name: string; colorHex: string }[];
}

interface TerritoryMapProps {
  mode: MapMode;
  stateData: Map<string, TerritoryData>;
  countyData?: Map<string, Map<string, TerritoryData>>;
  overlapStates: Set<string>;
  overlapCounties?: Set<string>;
  selectedState?: string | null;
  zoomToStateTrigger?: number;
  onHover?: (state: string | null, data: TerritoryData | null) => void;
  onStateClick?: (stateAbbr: string, data: TerritoryData | null) => void;
  onClearState?: () => void;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace(/^#/, ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const TILE_SIZE = 256;
const PERIOD = 32;
const STRIPE_WIDTH = 20;
const STRIPE_ALPHA = 160;

function overlapPatternId(colors: string[]): string {
  const key = [...colors].sort().map((c) => c.replace(/^#/, "")).join("");
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h) ^ key.charCodeAt(i);
  return "overlap-" + (h >>> 0).toString(36);
}

function createOverlapPattern(colors: string[]): { width: number; height: number; data: Uint8Array } {
  const data = new Uint8Array(TILE_SIZE * TILE_SIZE * 4);
  const stripeColors =
    colors.length > 4
      ? [colors[1]]
      : colors.length > 1
        ? colors.slice(1)
        : [colors[0]];
  const rgb = stripeColors.map(hexToRgb);
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const i = (y * TILE_SIZE + x) * 4;
      const band = ((x - y) % PERIOD + PERIOD) % PERIOD;
      const inStripe = band < STRIPE_WIDTH;
      if (inStripe) {
        const colorIndex = Math.floor((x - y + TILE_SIZE) / PERIOD) % rgb.length;
        const [r, g, b] = rgb[colorIndex];
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = STRIPE_ALPHA;
      }
    }
  }
  return { width: TILE_SIZE, height: TILE_SIZE, data };
}

function createZebraPattern(): { width: number; height: number; data: Uint8Array } {
  const size = 16;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const stripe = (x + y) % 2 === 0 ? 0 : 255;
      data[i] = stripe;
      data[i + 1] = stripe;
      data[i + 2] = stripe;
      data[i + 3] = 180;
    }
  }
  return { width: size, height: size, data };
}

function getStateAbbrFromFeature(feature: GeoJSON.Feature): string | null {
  const id = feature.id ?? feature.properties?.id;
  if (typeof id === "string") {
    const fips = id.length === 1 ? `0${id}` : id;
    return FIPS_TO_STATE[fips] ?? null;
  }
  if (typeof id === "number") {
    const fips = id < 10 ? `0${id}` : String(id);
    return FIPS_TO_STATE[fips] ?? null;
  }
  return null;
}

function transformCoords(
  coords: number[][],
  scale: number,
  centerLon: number,
  centerLat: number,
  targetLon: number,
  targetLat: number
): number[][] {
  return coords.map(([lon, lat]) => [
    (lon - centerLon) * scale + targetLon,
    (lat - centerLat) * scale + targetLat,
  ]);
}

function transformCoordsScale2(
  coords: number[][],
  scaleX: number,
  scaleY: number,
  centerLon: number,
  centerLat: number,
  targetLon: number,
  targetLat: number
): number[][] {
  return coords.map(([lon, lat]) => [
    (lon - centerLon) * scaleX + targetLon,
    (lat - centerLat) * scaleY + targetLat,
  ]);
}

function transformGeometry(
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  scale: number,
  centerLon: number,
  centerLat: number,
  targetLon: number,
  targetLat: number
): GeoJSON.Polygon | GeoJSON.MultiPolygon {
  if (geom.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geom.coordinates.map((ring) =>
        transformCoords(ring, scale, centerLon, centerLat, targetLon, targetLat)
      ),
    };
  }
  return {
    type: "MultiPolygon",
    coordinates: geom.coordinates.map((poly) =>
      poly.map((ring) =>
        transformCoords(ring, scale, centerLon, centerLat, targetLon, targetLat)
      )
    ),
  };
}

function transformGeometryScale2(
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  scaleX: number,
  scaleY: number,
  centerLon: number,
  centerLat: number,
  targetLon: number,
  targetLat: number
): GeoJSON.Polygon | GeoJSON.MultiPolygon {
  if (geom.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geom.coordinates.map((ring) =>
        transformCoordsScale2(ring, scaleX, scaleY, centerLon, centerLat, targetLon, targetLat)
      ),
    };
  }
  return {
    type: "MultiPolygon",
    coordinates: geom.coordinates.map((poly) =>
      poly.map((ring) =>
        transformCoordsScale2(ring, scaleX, scaleY, centerLon, centerLat, targetLon, targetLat)
      )
    ),
  };
}

const AK_CENTER = [-153.5, 64];
const HI_CENTER = [-155.5, 19.5];
const INSET_TARGET_AK = [-128, 32];
const INSET_TARGET_HI = [-110, 27];

function bboxFromGeometry(geom: GeoJSON.Polygon | GeoJSON.MultiPolygon): [number, number, number, number] {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  const visit = (coords: number[][]) => {
    for (const [lng, lat] of coords) {
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }
  };
  if (geom.type === "Polygon") {
    for (const ring of geom.coordinates) visit(ring);
  } else {
    for (const poly of geom.coordinates) for (const ring of poly) visit(ring);
  }
  return [minLng, minLat, maxLng, maxLat];
}

function bboxFromFeature(f: GeoJSON.Feature): [number, number, number, number] | null {
  const geom = f.geometry;
  if (!geom || geom.type === "Point") return null;
  return bboxFromGeometry(geom as GeoJSON.Polygon | GeoJSON.MultiPolygon);
}

function unionBbox(
  a: [number, number, number, number] | null,
  b: [number, number, number, number] | null
): [number, number, number, number] | null {
  if (!a) return b;
  if (!b) return a;
  return [
    Math.min(a[0], b[0]),
    Math.min(a[1], b[1]),
    Math.max(a[2], b[2]),
    Math.max(a[3], b[3]),
  ];
}

export function TerritoryMap({
  mode,
  stateData,
  countyData = new Map(),
  overlapStates,
  overlapCounties = new Set(),
  selectedState = null,
  zoomToStateTrigger = 0,
  onHover,
  onStateClick,
  onClearState,
}: TerritoryMapProps) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const stateBboxesRef = useRef<Map<string, [number, number, number, number]>>(new Map());
  const dblClickHandlerRef = useRef<((e: maplibregl.MapMouseEvent) => void) | null>(null);
  const prevSelectedRef = useRef<string | null>(null);
  const allStateAbbrsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "ocean-bg",
            type: "background",
            paint: { "background-color": "#2d3748" },
          },
        ],
      },
      center: [-95.7129, 37.0902],
      zoom: 3,
      minZoom: 2,
    });

    map.doubleClickZoom.disable();
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ---------- data load ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const loadData = async () => {
      const res = await fetch("/data/geo/states.geojson");
      const geojson = await res.json();
      const overlapPatternsToAdd: { id: string; colors: string[] }[] = [];
      const stateAbbrList: string[] = [];

      const features = geojson.features.map((f: GeoJSON.Feature) => {
        const rawId = f.id ?? (f.properties as { id?: string })?.id;
        const fips = typeof rawId === "string" ? (rawId.length === 1 ? `0${rawId}` : rawId) : String(rawId ?? "");
        let geometry = f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
        if (fips === "02" && geometry) {
          geometry = transformGeometryScale2(geometry, 0.28, 0.35, AK_CENTER[0], AK_CENTER[1], INSET_TARGET_AK[0], INSET_TARGET_AK[1]);
        } else if (fips === "15" && geometry) {
          geometry = transformGeometry(geometry, 1.2, HI_CENTER[0], HI_CENTER[1], INSET_TARGET_HI[0], INSET_TARGET_HI[1]);
        }
        const stateAbbr = getStateAbbrFromFeature(f);
        if (stateAbbr) stateAbbrList.push(stateAbbr);
        const data = stateAbbr ? stateData.get(stateAbbr) : null;
        const overlap = stateAbbr ? overlapStates.has(stateAbbr) : false;
        const overlapColors =
          overlap && data
            ? (data.groups?.map((g) => g.colorHex) ?? data.reps?.map((r) => r.colorHex) ?? [data.color])
            : [];
        if (overlap && overlapColors.length > 0) {
          const effectiveColors = overlapColors.length > 4 ? [overlapColors[0], overlapColors[1]] : overlapColors;
          overlapPatternsToAdd.push({ id: overlapPatternId(effectiveColors), colors: overlapColors });
        }
        if (stateAbbr) stateBboxesRef.current.set(stateAbbr, bboxFromGeometry(geometry));
        const baseColor = overlap && overlapColors.length > 0 ? overlapColors[0] : (data?.color ?? "#e2e8f0");
        return {
          ...f,
          geometry,
          properties: {
            ...(f.properties || {}),
            stateAbbr: stateAbbr || "",
            fillColor: baseColor,
            overlap,
            ...(overlap && overlapColors.length > 0
              ? { overlapPatternId: overlapPatternId(overlapColors.length > 4 ? [overlapColors[0], overlapColors[1]] : overlapColors) }
              : {}),
          },
        };
      });

      allStateAbbrsRef.current = stateAbbrList;
      const sourceData = { type: "FeatureCollection" as const, features };

      if (map.getSource("states")) {
        (map.getSource("states") as maplibregl.GeoJSONSource).setData(sourceData);
      } else {
        map.addSource("states", {
          type: "geojson",
          data: sourceData,
          promoteId: "stateAbbr",
        });
      }

      if (!map.hasImage("zebra-hatch")) {
        const zebra = createZebraPattern();
        map.addImage("zebra-hatch", zebra, { pixelRatio: 2 });
      }
      const addedPatternIds = new Set<string>();
      for (const { id, colors } of overlapPatternsToAdd) {
        if (!addedPatternIds.has(id)) {
          addedPatternIds.add(id);
          if (map.hasImage(id)) map.removeImage(id);
          const pattern = createOverlapPattern(colors);
          map.addImage(id, pattern, { pixelRatio: 2 });
        }
      }

      // Remove old layers for clean rebuild
      for (const lid of [
        "states-fill", "states-overlap", "states-outline",
        "states-dim-overlay", "states-selected-halo", "states-selected-outline",
        "states-selected",
      ]) {
        if (map.getLayer(lid)) map.removeLayer(lid);
      }

      // --- Layer 1: base fill ---
      map.addLayer({
        id: "states-fill",
        type: "fill",
        source: "states",
        paint: {
          "fill-color": ["get", "fillColor"],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "dimmed"], false],
            0.3,
            0.85,
          ],
        },
      });

      // --- Layer 2: overlap pattern ---
      map.addLayer({
        id: "states-overlap",
        type: "fill",
        source: "states",
        filter: ["==", ["get", "overlap"], true],
        paint: {
          "fill-pattern": ["coalesce", ["get", "overlapPatternId"], "zebra-hatch"],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "dimmed"], false],
            0.15,
            0.7,
          ],
        },
      });

      // --- Layer 3: dim overlay (gray wash on non-selected) ---
      map.addLayer({
        id: "states-dim-overlay",
        type: "fill",
        source: "states",
        paint: {
          "fill-color": "#9ca3af",
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "dimmed"], false],
            0.4,
            0,
          ],
        },
      });

      // --- Layer 4: base outline ---
      map.addLayer({
        id: "states-outline",
        type: "line",
        source: "states",
        paint: {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "dimmed"], false],
            "#d1d5db",
            "#64748b",
          ],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "dimmed"], false],
            0.5,
            1,
          ],
        },
      });

      // --- Layer 5: selected state halo (wide, low-opacity glow) ---
      map.addLayer({
        id: "states-selected-halo",
        type: "line",
        source: "states",
        paint: {
          "line-color": "#38bdf8",
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            8,
            0,
          ],
          "line-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            0.35,
            0,
          ],
          "line-blur": 4,
        },
      });

      // --- Layer 6: selected state crisp outline ---
      map.addLayer({
        id: "states-selected-outline",
        type: "line",
        source: "states",
        paint: {
          "line-color": "#0ea5e9",
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            3.5,
            0,
          ],
          "line-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            1,
            0,
          ],
        },
      });

      // Apply feature-state for current selection (if any)
      applyFeatureState(map, selectedState);

      // Double-click handler for state selection
      if (dblClickHandlerRef.current) map.off("dblclick", dblClickHandlerRef.current);
      dblClickHandlerRef.current = (e: maplibregl.MapMouseEvent) => {
        e.preventDefault();
        const hasCounties = !!map.getLayer("counties-fill");
        const countyFeats = hasCounties ? map.queryRenderedFeatures(e.point, { layers: ["counties-fill"] }) : [];
        const stateFeats = map.queryRenderedFeatures(e.point, { layers: ["states-fill"] });
        const feats = countyFeats.length > 0 ? countyFeats : stateFeats;
        if (feats.length > 0) {
          const f = feats[0] as GeoJSON.Feature & { properties?: { stateAbbr?: string; countyFips?: string } };
          const stateAbbr = f.properties?.stateAbbr ?? (countyFeats.length ? null : getStateAbbrFromFeature(f));
          if (stateAbbr) {
            const data =
              countyFeats.length && f.properties?.countyFips
                ? countyData.get(stateAbbr)?.get(f.properties.countyFips) ?? stateData.get(stateAbbr) ?? null
                : stateData.get(stateAbbr) ?? null;
            onStateClick?.(stateAbbr, data);
          }
        }
      };
      map.on("dblclick", dblClickHandlerRef.current);

      // County-level coverage
      const countyFeatures: GeoJSON.Feature[] = [];
      if (countyData.size > 0) {
        const states = [...countyData.keys()];
        await Promise.all(
          states.map(async (stateAbbr) => {
            try {
              const r = await fetch(`/api/geo/counties/${stateAbbr}`);
              const fc = await r.json();
              const stateMap = countyData.get(stateAbbr)!;
              for (const f of fc.features || []) {
                const rawFips = String(f.id ?? f.properties?.GEO_ID ?? f.properties?.id ?? "");
                const fips5 = rawFips.padStart(5, "0");
                const data = stateMap.get(fips5) ?? stateMap.get(rawFips);
                if (!data) continue;
                const key = `${stateAbbr}:${fips5}`;
                const overlap = overlapCounties.has(key) || overlapCounties.has(`${stateAbbr}:${rawFips}`);
                const overlapColors = overlap
                  ? (data.groups?.map((g) => g.colorHex) ?? data.reps?.map((r) => r.colorHex) ?? [data.color])
                  : [];
                if (overlap && overlapColors.length > 0) {
                  const effectiveColors = overlapColors.length > 4 ? [overlapColors[0], overlapColors[1]] : overlapColors;
                  overlapPatternsToAdd.push({ id: overlapPatternId(effectiveColors), colors: overlapColors });
                }
                const countyBaseColor = overlap && overlapColors.length > 0 ? overlapColors[0] : data.color;
                countyFeatures.push({
                  ...f,
                  properties: {
                    ...(f.properties || {}),
                    stateAbbr,
                    countyFips: fips5,
                    fillColor: countyBaseColor,
                    overlap,
                    ...(overlap && overlapColors.length > 0
                      ? { overlapPatternId: overlapPatternId(overlapColors.length > 4 ? [overlapColors[0], overlapColors[1]] : overlapColors) }
                      : {}),
                  },
                });
              }
            } catch {
              // ignore fetch errors for county data
            }
          })
        );
      }

      const addedOverlapIds = new Set<string>();
      for (const { id, colors } of overlapPatternsToAdd) {
        if (addedOverlapIds.has(id)) continue;
        addedOverlapIds.add(id);
        if (map.hasImage(id)) map.removeImage(id);
        map.addImage(id, createOverlapPattern(colors), { pixelRatio: 2 });
      }

      const countySourceData = { type: "FeatureCollection" as const, features: countyFeatures };
      if (map.getSource("counties")) {
        (map.getSource("counties") as maplibregl.GeoJSONSource).setData(countySourceData);
      } else if (countyFeatures.length > 0) {
        map.addSource("counties", { type: "geojson", data: countySourceData });
      }

      if (countyFeatures.length > 0) {
        ["counties-fill", "counties-overlap", "counties-outline"].forEach((id) => {
          if (map.getLayer(id)) map.removeLayer(id);
        });
        if (!map.getSource("counties")) {
          map.addSource("counties", { type: "geojson", data: countySourceData });
        }
        map.addLayer(
          { id: "counties-fill", type: "fill", source: "counties", paint: { "fill-color": ["get", "fillColor"], "fill-opacity": 0.85 } },
          "states-outline"
        );
        map.addLayer(
          {
            id: "counties-overlap",
            type: "fill",
            source: "counties",
            filter: ["==", ["get", "overlap"], true],
            paint: {
              "fill-pattern": ["coalesce", ["get", "overlapPatternId"], "zebra-hatch"],
              "fill-opacity": 0.7,
            },
          },
          "states-outline"
        );
        map.addLayer(
          { id: "counties-outline", type: "line", source: "counties", paint: { "line-color": "#64748b", "line-width": 0.5 } },
          "states-outline"
        );
      } else if (map.getSource("counties")) {
        (map.getSource("counties") as maplibregl.GeoJSONSource).setData({ type: "FeatureCollection", features: [] });
        ["counties-fill", "counties-overlap", "counties-outline"].forEach((id) => {
          if (map.getLayer(id)) map.removeLayer(id);
        });
      }

      // Auto-zoom to regional bounds
      let bounds: [number, number, number, number] | null = null;
      for (const stateAbbr of stateData.keys()) {
        const b = stateBboxesRef.current.get(stateAbbr);
        if (b) bounds = unionBbox(bounds, b);
      }
      for (const f of countyFeatures) {
        const b = bboxFromFeature(f);
        if (b) bounds = unionBbox(bounds, b);
      }
      if (bounds && containerRef.current) {
        const [, , maxLng] = bounds;
        const spanLng = maxLng - bounds[0];
        if (spanLng < 35) {
          const rect = containerRef.current.getBoundingClientRect();
          const pad = Math.min(rect.width, rect.height) * 0.1;
          map.fitBounds(bounds, { padding: pad, duration: 500, maxZoom: 10 });
        }
      }
    };

    if (map.isStyleLoaded()) {
      loadData();
    } else {
      map.once("load", loadData);
    }
  }, [stateData, countyData, overlapStates, overlapCounties, onStateClick]);

  // ---------- feature-state helper ----------
  const applyFeatureState = useCallback((map: maplibregl.Map, selected: string | null) => {
    if (!map.getSource("states")) return;

    // Clear previous selection
    const prev = prevSelectedRef.current;
    if (prev) {
      map.setFeatureState({ source: "states", id: prev }, { selected: false, dimmed: false });
    }

    if (selected) {
      // Dim all states, then un-dim + select the chosen one
      for (const abbr of allStateAbbrsRef.current) {
        if (abbr === selected) {
          map.setFeatureState({ source: "states", id: abbr }, { selected: true, dimmed: false });
        } else {
          map.setFeatureState({ source: "states", id: abbr }, { selected: false, dimmed: true });
        }
      }
    } else {
      // Clear everything
      for (const abbr of allStateAbbrsRef.current) {
        map.setFeatureState({ source: "states", id: abbr }, { selected: false, dimmed: false });
      }
    }

    prevSelectedRef.current = selected;
  }, []);

  // ---------- selection changed: update feature-state + zoom ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource("states")) return;

    applyFeatureState(map, selectedState);

    if (selectedState) {
      popupRef.current?.remove();
      const bbox = stateBboxesRef.current.get(selectedState);
      if (bbox) {
        map.fitBounds(bbox, { padding: 60, duration: 500, maxZoom: 8 });
      }
    } else {
      map.easeTo({ center: [-95.7129, 37.0902], zoom: 3, duration: 500 });
    }
  }, [selectedState, applyFeatureState]);

  // ---------- zoom-to-state trigger (from panel button) ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedState || zoomToStateTrigger === 0) return;
    const bbox = stateBboxesRef.current.get(selectedState);
    if (bbox) {
      map.fitBounds(bbox, { padding: 60, duration: 500, maxZoom: 8 });
    }
  }, [zoomToStateTrigger, selectedState]);

  // ---------- popup on hover ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
      const layersToQuery = (["counties-fill", "states-fill"] as const).filter((l) => map.getLayer(l));
      const countyFeatures = layersToQuery.includes("counties-fill")
        ? map.queryRenderedFeatures(e.point, { layers: ["counties-fill"] })
        : [];
      const stateFeatures = layersToQuery.includes("states-fill")
        ? map.queryRenderedFeatures(e.point, { layers: ["states-fill"] })
        : [];
      const features = countyFeatures.length > 0 ? countyFeatures : stateFeatures;
      const layer = countyFeatures.length > 0 ? "counties-fill" : "states-fill";
      if (features.length > 0) {
        const f = features[0] as GeoJSON.Feature & { properties?: { stateAbbr?: string; countyFips?: string } };
        const stateAbbr = f.properties?.stateAbbr ?? (layer === "states-fill" ? getStateAbbrFromFeature(f) : null);
        let data: TerritoryData | null = null;
        if (layer === "counties-fill" && stateAbbr && f.properties?.countyFips) {
          data = countyData.get(stateAbbr)?.get(f.properties.countyFips) ?? null;
        } else if (stateAbbr) {
          data = stateData.get(stateAbbr) ?? null;
        }
        if (data && popupRef.current && stateAbbr && !selectedState) {
          const names =
            mode === "group" && data.groups
              ? data.groups.flatMap((g) =>
                  g.reps.map((r) => `${r.name} (${g.name})`)
                )
              : data.reps
                ? data.reps.map((r) => r.name)
                : [];
          const overlapCount =
            mode === "group" && data.groups
              ? data.groups.length
              : data.reps
                ? data.reps.length
                : 0;
          const moreLabel =
            overlapCount > 4
              ? `<br/><span class="text-slate-500 text-xs">+${overlapCount - 2} more (barber pole shows first 2)</span>`
              : "";
          const label = f.properties?.countyFips ? `${stateAbbr} (county ${f.properties.countyFips})` : stateAbbr;
          popupRef.current
            .setLngLat(e.lngLat)
            .setHTML(
              `<div class="p-2 text-sm max-w-xs"><strong>${label}</strong><br/>${names.join(", ") || "—"}${moreLabel}</div>`
            )
            .addTo(map);
        }
        onHover?.(stateAbbr, data ?? null);
        map.getCanvas().style.cursor = "pointer";
      } else {
        popupRef.current?.remove();
        onHover?.(null, null);
        map.getCanvas().style.cursor = "";
      }
    };

    const handleMouseLeave = () => {
      popupRef.current?.remove();
      onHover?.(null, null);
      map.getCanvas().style.cursor = "";
    };

    if (!popupRef.current) {
      popupRef.current = new maplibregl.Popup({ closeButton: false });
    }

    map.on("mousemove", handleMouseMove);
    map.on("mouseleave", handleMouseLeave);

    return () => {
      map.off("mousemove", handleMouseMove);
      map.off("mouseleave", handleMouseLeave);
    };
  }, [stateData, countyData, mode, onHover, selectedState]);

  return <div ref={containerRef} className="w-full h-full min-h-[400px]" />;
}
