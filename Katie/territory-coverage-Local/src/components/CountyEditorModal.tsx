"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

function bboxFromGeoJSON(fc: GeoJSON.FeatureCollection): [number, number, number, number] | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  const visitCoords = (coords: number[][]) => {
    for (const [lng, lat] of coords) {
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }
  };
  for (const f of fc.features || []) {
    const geom = f.geometry;
    if (!geom || geom.type === "Point") continue;
    if (geom.type === "Polygon") {
      for (const ring of geom.coordinates) visitCoords(ring);
    } else if (geom.type === "MultiPolygon") {
      for (const poly of geom.coordinates) {
        for (const ring of poly) visitCoords(ring);
      }
    }
  }
  if (minLng === Infinity) return null;
  return [minLng, minLat, maxLng, maxLat];
}

interface CountyEditorModalProps {
  repId: string;
  stateAbbr: string;
  initialCountyFips: string[];
  repColor: string;
  onSave: (countyFips: string[]) => void;
  onClose: () => void;
}

export function CountyEditorModal({
  repId,
  stateAbbr,
  initialCountyFips,
  repColor,
  onSave,
  onClose,
}: CountyEditorModalProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const [selectedFips, setSelectedFips] = useState<Set<string>>(
    new Set(initialCountyFips)
  );
  const [loading, setLoading] = useState(true);
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    fetch(`/api/geo/counties/${stateAbbr}`)
      .then((r) => r.json())
      .then((data) => {
        setGeojson(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [stateAbbr]);

  useEffect(() => {
    if (!mapRef.current || !geojson) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [],
      },
      center: [-95, 38],
      zoom: 4,
    });

    const features = geojson.features.map((f: GeoJSON.Feature) => {
      const fips = String(f.id ?? f.properties?.GEO_ID?.replace("0500000US", "") ?? "");
      const selected = selectedFips.has(fips);
      return {
        ...f,
        properties: {
          ...(f.properties || {}),
          fips,
          fillColor: selected ? repColor : "#e2e8f0",
          selected,
        },
      };
    });

    const sourceData = { type: "FeatureCollection" as const, features };

    map.on("load", () => {
      map.addSource("counties", { type: "geojson", data: sourceData });
      map.addLayer({
        id: "counties-fill",
        type: "fill",
        source: "counties",
        paint: {
          "fill-color": ["get", "fillColor"],
          "fill-opacity": 0.8,
        },
      });
      map.addLayer({
        id: "counties-outline",
        type: "line",
        source: "counties",
        paint: {
          "line-color": "#94a3b8",
          "line-width": 1,
        },
      });

      map.on("click", "counties-fill", (e) => {
        if (!e.features?.[0]) return;
        const f = e.features[0] as GeoJSON.Feature & { properties?: { fips?: string } };
        const fips = f.properties?.fips ?? (f.id as string);
        if (fips) {
          setSelectedFips((prev) => {
            const next = new Set(prev);
            if (next.has(String(fips))) next.delete(String(fips));
            else next.add(String(fips));
            return next;
          });
        }
      });

      mapInstanceRef.current = map;

      const doFitBounds = () => {
        const bbox = bboxFromGeoJSON(geojson);
        if (bbox) {
          map.resize();
          map.fitBounds(bbox, { padding: 60, duration: 0, maxZoom: 7 });
        }
      };
      doFitBounds();
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [geojson, stateAbbr]);

  useEffect(() => {
    if (!loading && geojson) {
      const t = setTimeout(() => {
        const map = mapInstanceRef.current;
        if (!map || !geojson || !map.getSource("counties")) return;
        const bbox = bboxFromGeoJSON(geojson);
        if (bbox) {
          map.resize();
          map.fitBounds(bbox, { padding: 60, duration: 0, maxZoom: 7 });
        }
      }, 50);
      return () => clearTimeout(t);
    }
  }, [loading, geojson]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !geojson || !map.getSource("counties")) return;

    const features = geojson.features.map((f: GeoJSON.Feature) => {
      const fips = String(f.id ?? f.properties?.GEO_ID?.replace("0500000US", "") ?? "");
      const selected = selectedFips.has(fips);
      return {
        ...f,
        properties: {
          ...(f.properties || {}),
          fips,
          fillColor: selected ? repColor : "#e2e8f0",
          selected,
        },
      };
    });

    (map.getSource("counties") as maplibregl.GeoJSONSource).setData({
      type: "FeatureCollection",
      features,
    });
  }, [selectedFips, repColor, geojson]);

  const handleSave = () => {
    onSave(Array.from(selectedFips));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-medium">
            Edit counties: {stateAbbr}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-4 flex-1 min-h-0">
          {loading ? (
            <p className="text-slate-500">Loading counties...</p>
          ) : (
            <div
              ref={mapRef}
              className="w-full h-96 rounded-lg overflow-hidden"
            />
          )}
          <p className="text-sm text-slate-500 mt-2">
            Click counties to toggle selection. Selected: {selectedFips.size}
          </p>
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
