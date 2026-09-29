#!/usr/bin/env python3
"""
CivicFix — D0 Authoritative Administrative District Boundary Ingestion Script
=============================================================================
Ingests canonical district boundary polygons (EPSG:4326 MultiPolygon) for the 24
districts of Jharkhand into `public.districts.boundary`.

Data Source:
- Datasets_Backend/jharkhand/D0_Boundaries/jharkhand_districts.geojson
  (Census of India 2011 / Survey of India administrative boundary delineations)

Generates:
- supabase/migrations/0062_seed_jharkhand_district_boundaries.sql

Usage:
  python3 scripts/import_jharkhand_district_boundaries.py
"""

import os
import json
import sys

CANONICAL_DISTRICTS = {
    "Bokaro": "IN-D0229",
    "Chatra": "IN-D0230",
    "Deoghar": "IN-D0231",
    "Dhanbad": "IN-D0232",
    "Dumka": "IN-D0233",
    "East Singhbhum": "IN-D0234",
    "Garhwa": "IN-D0235",
    "Giridih": "IN-D0236",
    "Godda": "IN-D0237",
    "Gumla": "IN-D0238",
    "Hazaribagh": "IN-D0239",
    "Jamtara": "IN-D0240",
    "Khunti": "IN-D0241",
    "Koderma": "IN-D0242",
    "Latehar": "IN-D0243",
    "Lohardaga": "IN-D0244",
    "Pakur": "IN-D0245",
    "Palamu": "IN-D0246",
    "Ramgarh": "IN-D0247",
    "Ranchi": "IN-D0248",
    "Sahibganj": "IN-D0249",
    "Saraikela Kharsawan": "IN-D0250",
    "Simdega": "IN-D0251",
    "West Singhbhum": "IN-D0252",
}

NAME_ALIASES = {
    "saraikela-kharsawan": "Saraikela Kharsawan",
    "saraikela kharsawan": "Saraikela Kharsawan",
    "seraikela-kharsawan": "Saraikela Kharsawan",
    "seraikela kharsawan": "Saraikela Kharsawan",
    "hazaribag": "Hazaribagh",
    "pashchim singhbhum": "West Singhbhum",
    "purba singhbhum": "East Singhbhum",
    "east singhbhum": "East Singhbhum",
    "west singhbhum": "West Singhbhum",
}

def main():
    geojson_path = "Datasets_Backend/jharkhand/D0_Boundaries/jharkhand_districts.geojson"
    out_sql_path = "supabase/migrations/0062_seed_jharkhand_district_boundaries.sql"

    if not os.path.exists(geojson_path):
        print(f"Error: GeoJSON file not found at {geojson_path}", file=sys.stderr)
        sys.exit(1)

    with open(geojson_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    features = data.get("features", [])
    print(f"Loaded {len(features)} features from {geojson_path}")

    features_by_id = {}
    for f in features:
        props = f.get("properties", {})
        raw_name = props.get("district", "").strip()
        norm_name = NAME_ALIASES.get(raw_name.lower(), raw_name)
        cid = CANONICAL_DISTRICTS.get(norm_name)
        if not cid:
            print(f"Warning: Could not match district name '{raw_name}' (norm: '{norm_name}') to canonical ID", file=sys.stderr)
            continue
        geom = f.get("geometry")
        if not geom:
            print(f"Warning: District {cid} ({norm_name}) has no geometry", file=sys.stderr)
            continue
        features_by_id[cid] = (norm_name, geom)

    matched_count = len(features_by_id)
    print(f"Matched {matched_count} / {len(CANONICAL_DISTRICTS)} canonical districts.")

    if matched_count != len(CANONICAL_DISTRICTS):
        missing = set(CANONICAL_DISTRICTS.values()) - set(features_by_id.keys())
        print(f"Error: Missing {len(missing)} canonical districts: {missing}", file=sys.stderr)
        sys.exit(1)

    sql_lines = [
        "-- ============================================================================",
        "-- CivicFix Infrastructure Workflow: Migration 0062",
        "-- D0 Canonical District Boundary Data Foundation (Jharkhand Sample - 24 Districts)",
        "-- ============================================================================",
        "-- Description:",
        "-- Seeds authoritative administrative boundary polygons (EPSG:4326 MultiPolygon)",
        "-- for all 24 canonical districts of Jharkhand into public.districts.boundary.",
        "--",
        "-- Data Source:",
        "-- Census of India 2011 / Survey of India Administrative Boundaries (EPSG:4326).",
        "--",
        "-- Security & Invariant Rules:",
        "-- - Updates existing canonical district rows (IN-D0229 through IN-D0252).",
        "-- - Does NOT create duplicate district rows or alter canonical IDs.",
        "-- - ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(...), 4326)) ensures strict MultiPolygon type.",
        "-- - Preserves all existing D1-D8 data and workflow state.",
        "-- ============================================================================",
        "",
    ]

    for cid in sorted(features_by_id.keys()):
        dname, geom = features_by_id[cid]
        geom_json = json.dumps(geom)
        sql_lines.append(f"-- {cid}: {dname}")
        sql_lines.append("UPDATE public.districts")
        sql_lines.append(f"SET boundary = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON('{geom_json}'), 4326)),")
        sql_lines.append("    updated_at = now()")
        sql_lines.append(f"WHERE id = '{cid}';")
        sql_lines.append("")

    sql_lines.append("-- Verification: Confirm spatial index maintenance")
    sql_lines.append("ANALYZE public.districts;")
    sql_lines.append("")

    migration_content = "\n".join(sql_lines)

    with open(out_sql_path, "w", encoding="utf-8") as f:
        f.write(migration_content)

    print(f"Successfully generated {out_sql_path} ({len(migration_content)} bytes).")

if __name__ == "__main__":
    main()
