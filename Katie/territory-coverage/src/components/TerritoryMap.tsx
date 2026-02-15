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
  onHover?: (state: string | null, data: TerritoryData | null) => void;
  onStateClick?: (stateAbbr: string, data: TerritoryData | null) => void;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace(/^#/, ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function createOverlapPattern(colors: string[]): { width: number; height: number; data: Uint8Array } {
  const size = 32;
  const data = new Uint8Array(size * size * 4);
  const stripeWidth = 4;
  const rgb = colors.slice(0, 2).map(hexToRgb);
  if (rgb.length === 1) rgb.push([200, 200, 200]);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const stripeIndex = Math.floor((x + y) / stripeWidth) % 2;
      const [r, g, b] = rgb[stripeIndex];
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return { width: size, height: size, data };
}

function overlapPatternId(colors: string[]): string {
  const key = [...colors].sort().map((c) => c.replace(/^#/, "")).join("");
  return "overlap-" + key.slice(0, 24);
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

// Alaska: scale down, place west of California. Hawaii: scale slightly, place below CA.
const AK_CENTER = [-153.5, 64];
const HI_CENTER = [-155.5, 19.5];
const INSET_TARGET_AK = [-128, 32];
const INSET_TARGET_HI = [-117, 27];

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
  onHover,
  onStateClick,
}: TerritoryMapProps) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const stateBboxesRef = useRef<Map<string, [number, number, number, number]>>(new Map());
  const clickHandlerRef = useRef<((e: maplibregl.MapMouseEvent) => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [],
      },
      center: [-95.7129, 37.0902],
      zoom: 3,
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const loadData = async () => {
      const res = await fetch("/data/geo/states.geojson");
      const geojson = await res.json();
      const overlapPatternsToAdd: { id: string; colors: string[] }[] = [];

      const features = geojson.features.map((f: GeoJSON.Feature) => {
        const rawId = f.id ?? (f.properties as { id?: string })?.id;
        const fips = typeof rawId === "string" ? (rawId.length === 1 ? `0${rawId}` : rawId) : String(rawId ?? "");
        let geometry = f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
        if (fips === "02" && geometry) {
          geometry = transformGeometryScale2(
            geometry,
            0.28,
            0.35,
            AK_CENTER[0],
            AK_CENTER[1],
            INSET_TARGET_AK[0],
            INSET_TARGET_AK[1]
          );
        } else if (fips === "15" && geometry) {
          geometry = transformGeometry(
            geometry,
            1.2,
            HI_CENTER[0],
            HI_CENTER[1],
            INSET_TARGET_HI[0],
            INSET_TARGET_HI[1]
          );
        }
        const stateAbbr = getStateAbbrFromFeature(f);
        const data = stateAbbr ? stateData.get(stateAbbr) : null;
        const overlap = stateAbbr ? overlapStates.has(stateAbbr) : false;
        const overlapColors =
          overlap && data
            ? (data.groups?.map((g) => g.colorHex) ?? data.reps?.map((r) => r.colorHex) ?? [data.color])
            : [];
        if (overlap && overlapColors.length > 0) {
          overlapPatternsToAdd.push({ id: overlapPatternId(overlapColors), colors: overlapColors });
        }
        if (stateAbbr) stateBboxesRef.current.set(stateAbbr, bboxFromGeometry(geometry));
        return {
          ...f,
          geometry,
          properties: {
            ...(f.properties || {}),
            stateAbbr: stateAbbr || "",
            fillColor: data?.color ?? "#e2e8f0",
            overlap,
            ...(overlap && overlapColors.length > 0 ? { overlapPatternId: overlapPatternId(overlapColors) } : {}),
          },
        };
      });

      const sourceData = { type: "FeatureCollection" as const, features };

      if (map.getSource("states")) {
        (map.getSource("states") as maplibregl.GeoJSONSource).setData(sourceData);
      } else {
        map.addSource("states", { type: "geojson", data: sourceData });
      }

      if (!map.hasImage("zebra-hatch")) {
        const zebra = createZebraPattern();
        map.addImage("zebra-hatch", zebra, { pixelRatio: 2 });
      }
      const addedPatternIds = new Set<string>();
      for (const { id, colors } of overlapPatternsToAdd) {
        if (!addedPatternIds.has(id)) {
          addedPatternIds.add(id);
          if (!map.hasImage(id)) {
            const pattern = createOverlapPattern(colors);
            map.addImage(id, pattern, { pixelRatio: 2 });
          }
        }
      }

      const fillLayer = map.getLayer("states-fill");
      if (fillLayer) map.removeLayer("states-fill");
      const overlapLayer = map.getLayer("states-overlap");
      if (overlapLayer) map.removeLayer("states-overlap");
      const outlineLayer = map.getLayer("states-outline");
      if (outlineLayer) map.removeLayer("states-outline");

      map.addLayer({
        id: "states-fill",
        type: "fill",
        source: "states",
        paint: {
          "fill-color": ["get", "fillColor"],
          "fill-opacity": 0.85,
        },
      });

      map.addLayer({
        id: "states-overlap",
        type: "fill",
        source: "states",
        filter: ["==", ["get", "overlap"], true],
        paint: {
          "fill-pattern": ["coalesce", ["get", "overlapPatternId"], "zebra-hatch"],
          "fill-opacity": 0.9,
        },
      });

      map.addLayer({
        id: "states-outline",
        type: "line",
        source: "states",
        paint: {
          "line-color": "#64748b",
          "line-width": 1,
        },
      });

      if (clickHandlerRef.current) map.off("click", clickHandlerRef.current);
      clickHandlerRef.current = (e: maplibregl.MapMouseEvent) => {
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
      map.on("click", clickHandlerRef.current);

      // County-level coverage (when servicesWholeState=false or rep has county-only)
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
                  overlapPatternsToAdd.push({ id: overlapPatternId(overlapColors), colors: overlapColors });
                }
                countyFeatures.push({
                  ...f,
                  properties: {
                    ...(f.properties || {}),
                    stateAbbr,
                    countyFips: fips5,
                    fillColor: data.color,
                    overlap,
                    ...(overlap && overlapColors.length > 0 ? { overlapPatternId: overlapPatternId(overlapColors) } : {}),
                  },
                });
              }
            } catch {
              // ignore fetch errors for county data
            }
          })
        );
      }

      for (const { id, colors } of overlapPatternsToAdd) {
        if (!map.hasImage(id)) {
          map.addImage(id, createOverlapPattern(colors), { pixelRatio: 2 });
        }
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
              "fill-opacity": 0.9,
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

      // Zoom to highlighted territory at ~80% of view (10% padding on each side)
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
        const rect = containerRef.current.getBoundingClientRect();
        const pad = Math.min(rect.width, rect.height) * 0.1;
        map.fitBounds(bounds, { padding: pad, duration: 500, maxZoom: 10 });
      }
    };

    if (map.isStyleLoaded()) {
      loadData();
    } else {
      map.once("load", loadData);
    }
  }, [stateData, countyData, overlapStates, overlapCounties, onStateClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedState) return;
    const bbox = stateBboxesRef.current.get(selectedState);
    if (bbox) {
      map.fitBounds(bbox, { padding: 60, duration: 500, maxZoom: 8 });
    }
  }, [selectedState]);

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
        if (data && popupRef.current && stateAbbr) {
          const names =
            mode === "group" && data.groups
              ? data.groups.flatMap((g) =>
                  g.reps.map((r) => `${r.name} (${g.name})`)
                )
              : data.reps
                ? data.reps.map((r) => r.name)
                : [];
          const label = f.properties?.countyFips ? `${stateAbbr} (county ${f.properties.countyFips})` : stateAbbr;
          popupRef.current
            .setLngLat(e.lngLat)
            .setHTML(
              `<div class="p-2 text-sm max-w-xs"><strong>${label}</strong><br/>${names.join(", ") || "—"}</div>`
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
  }, [stateData, countyData, mode, onHover]);

  return <div ref={containerRef} className="w-full h-full min-h-[400px]" />;
}
