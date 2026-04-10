"""
ACLED aggregated regional Excel files -> cleaned Parquet/CSV + regional splits.
Used by acled_preprocessing.ipynb (can also run: python -m acled_preprocessing.acled_pipeline).
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

# Six regional downloads -> logical table name (Milestone 2 multi-table design)
FILE_TO_DDL_TABLE: dict[str, str] = {
    "Africa_aggregated_data_up_to-2026-02-14.xlsx": "Africa",
    "Asia-Pacific_aggregated_data_up_to-2026-02-14.xlsx": "Asia_Pacific",
    "Europe-Central-Asia_aggregated_data_up_to-2026-02-14.xlsx": "Europe_Central_Asia",
    "Latin-America-the-Caribbean_aggregated_data_up_to-2026-02-14.xlsx": "Latin_America_Caribbean",
    "Middle-East_aggregated_data_up_to-2026-02-14.xlsx": "Middle_East",
    "US-and-Canada_aggregated_data_up_to-2026-02-14.xlsx": "US_and_Canada",
}

# ACLED country label -> World Bank WDI `country` string in world_bank_development_indicators.csv
ACLED_TO_WDI_COUNTRY: dict[str, str] = {
    "Egypt": "Egypt, Arab Rep.",
    "Russia": "Russian Federation",
    "Democratic Republic of Congo": "Congo, Dem. Rep.",
    "Republic of Congo": "Congo, Rep.",
    "Ivory Coast": "Cote d'Ivoire",
    "East Timor": "Timor-Leste",
    "Iran": "Iran, Islamic Rep.",
    "North Korea": "Korea, Dem. People's Rep.",
    "South Korea": "Korea, Rep.",
    "Brunei": "Brunei Darussalam",
    "Cape Verde": "Cabo Verde",
    "Gambia": "Gambia, The",
    "Bahamas": "Bahamas, The",
    "Laos": "Lao PDR",
    "Micronesia": "Micronesia, Fed. Sts.",
    "Kyrgyzstan": "Kyrgyz Republic",
    "Palestine": "West Bank and Gaza",
    "Sint Maarten": "Sint Maarten (Dutch part)",
    "Saint Kitts and Nevis": "St. Kitts and Nevis",
    "Saint Lucia": "St. Lucia",
    "Saint Vincent and the Grenadines": "St. Vincent and the Grenadines",
    "Swaziland": "Eswatini",
    "Macedonia": "North Macedonia",
}


def project_root() -> Path:
    return Path(__file__).resolve().parent.parent


def load_and_merge(acled_dir: Path) -> pd.DataFrame:
    files = sorted(acled_dir.glob("*.xlsx"))
    expected = set(FILE_TO_DDL_TABLE.keys())
    found = {f.name for f in files}
    if expected != found:
        raise ValueError(f"Expected xlsx files {expected}, found {found}")

    frames: list[pd.DataFrame] = []
    for f in files:
        df = pd.read_excel(f, engine="openpyxl")
        df["source_file"] = f.name
        df["ddl_table_key"] = FILE_TO_DDL_TABLE[f.name]
        frames.append(df)

    cols0 = set(frames[0].columns) - {"source_file", "ddl_table_key"}
    for d in frames[1:]:
        c = set(d.columns) - {"source_file", "ddl_table_key"}
        assert c == cols0, (cols0, c)

    return pd.concat(frames, ignore_index=True)


def clean_dataframe(raw: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Returns cleaned df and a stats dict for reporting."""
    stats: dict = {"input_rows": len(raw)}
    df = raw.copy()

    rename = {
        "WEEK": "week",
        "REGION": "region",
        "COUNTRY": "country",
        "ADMIN1": "admin1",
        "EVENT_TYPE": "event_type",
        "SUB_EVENT_TYPE": "sub_event_type",
        "EVENTS": "events",
        "FATALITIES": "fatalities",
        "POPULATION_EXPOSURE": "population_exposure",
        "DISORDER_TYPE": "disorder_type",
        "ID": "source_area_id",
        "CENTROID_LATITUDE": "centroid_latitude",
        "CENTROID_LONGITUDE": "centroid_longitude",
    }
    df = df.rename(columns=rename)

    df["week"] = pd.to_datetime(df["week"], errors="coerce").dt.normalize()
    bad_week = df["week"].isna()
    stats["rows_week_parse_failed"] = int(bad_week.sum())
    df = df.loc[~bad_week].copy()

    for col in ("events", "fatalities", "population_exposure", "source_area_id", "centroid_latitude", "centroid_longitude"):
        df[col] = pd.to_numeric(df[col], errors="coerce")

    for col in ("country", "region", "admin1", "event_type", "sub_event_type", "disorder_type"):
        df[col] = df[col].astype("string").str.strip()

    stats["rows_null_source_area_id"] = int(df["source_area_id"].isna().sum())
    df = df.dropna(subset=["source_area_id"])
    df["source_area_id"] = df["source_area_id"].astype("Int64")

    stats["rows_null_admin1"] = int(df["admin1"].isna().sum())
    df = df.dropna(subset=["admin1"])

    # Exact duplicate rows (should be none)
    dup_full = df.duplicated().sum()
    stats["duplicate_full_rows"] = int(dup_full)
    if dup_full:
        df = df.drop_duplicates()

    # Uniqueness at event-grain (see notebook: PK (week, source_area_id) is insufficient)
    key = ["week", "source_area_id", "event_type", "sub_event_type"]
    stats["duplicate_event_grain"] = int(df.duplicated(subset=key).sum())
    if stats["duplicate_event_grain"]:
        df = df.drop_duplicates(subset=key, keep="first")

    # Coordinates
    lat_ok = df["centroid_latitude"].between(-90.0, 90.0)
    lon_ok = df["centroid_longitude"].between(-180.0, 180.0)
    bad_coord = ~(lat_ok & lon_ok)
    stats["rows_invalid_coordinates"] = int(bad_coord.sum())
    df = df.loc[~bad_coord].copy()

    stats["rows_negative_events_or_fatalities"] = int(((df["events"] < 0) | (df["fatalities"] < 0)).sum())
    df = df.loc[(df["events"] >= 0) & (df["fatalities"] >= 0)]

    def map_country(c: str) -> str:
        if not c or pd.isna(c):
            return c
        return ACLED_TO_WDI_COUNTRY.get(c, c)

    df["country_wdi"] = df["country"].map(map_country).astype("string")

    stats["output_rows"] = len(df)
    return df, stats


def build_bcnf_tables(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, dict]:
    """
    Split into BCNF / 3NF tables:
      - acled_country: country -> country_wdi (one row per ACLED country label)
      - acled_source_area: source_area_id -> geography (no repeating geo per event row)
      - acled_weekly_events: (week, source_area_id, event_type, sub_event_type) -> measures
    """
    extra: dict = {}

    country_tbl = (
        df[["country", "country_wdi"]]
        .drop_duplicates(subset=["country"])
        .sort_values("country")
        .reset_index(drop=True)
    )

    area_cols = [
        "source_area_id",
        "region",
        "country",
        "admin1",
        "centroid_latitude",
        "centroid_longitude",
        "ddl_table_key",
    ]
    areas = df[area_cols].copy()
    conflict_rows = 0
    for col in ("region", "country", "admin1", "centroid_latitude", "centroid_longitude", "ddl_table_key"):
        nu = areas.groupby("source_area_id")[col].nunique()
        conflict_rows = max(conflict_rows, int((nu > 1).sum()))
    extra["source_area_id_geo_conflicts"] = conflict_rows
    areas = areas.groupby("source_area_id", as_index=False).first()

    event_cols = [
        "week",
        "source_area_id",
        "event_type",
        "sub_event_type",
        "events",
        "fatalities",
        "population_exposure",
        "disorder_type",
    ]
    events = df[event_cols].copy()

    missing_fk = set(events["source_area_id"]) - set(areas["source_area_id"])
    extra["events_missing_area_fk"] = len(missing_fk)
    if missing_fk:
        raise ValueError(f"event rows reference unknown source_area_id: {list(missing_fk)[:5]}")

    missing_country = set(areas["country"]) - set(country_tbl["country"])
    extra["areas_missing_country_fk"] = len(missing_country)
    if missing_country:
        raise ValueError(f"area rows reference unknown country: {list(missing_country)[:5]}")

    extra["rows_acled_country"] = len(country_tbl)
    extra["rows_acled_source_area"] = len(areas)
    extra["rows_acled_weekly_events"] = len(events)

    return country_tbl, areas, events, extra


def export_artifacts(
    df: pd.DataFrame,
    out_dir: Path,
    stats: dict,
) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)

    country_tbl, areas, events, norm_stats = build_bcnf_tables(df)
    stats["bcnf"] = norm_stats

    # BCNF relational load files (see load_acled.sql)
    country_tbl.to_parquet(out_dir / "acled_country.parquet", index=False)
    country_tbl.to_csv(out_dir / "acled_country.csv", index=False)
    areas.to_parquet(out_dir / "acled_source_area.parquet", index=False)
    areas.to_csv(out_dir / "acled_source_area.csv", index=False)
    events.to_parquet(out_dir / "acled_weekly_events.parquet", index=False)
    events.to_csv(out_dir / "acled_weekly_events.csv", index=False)

    # Optional denormalized view for ad hoc analysis (same grain as cleaned fact rows)
    joined = events.merge(areas, on="source_area_id", how="left").merge(
        country_tbl, on="country", how="left", validate="many_to_one"
    )
    joined.to_parquet(out_dir / "acled_denormalized_joined.parquet", index=False)
    joined.to_csv(out_dir / "acled_denormalized_joined.csv", index=False)

    meta = out_dir / "preprocessing_summary.json"
    meta.write_text(json.dumps(stats, indent=2), encoding="utf-8")

    mapping_path = out_dir / "country_name_mappings.csv"
    rows = [{"acled_country": a, "wdi_country": w} for a, w in sorted(ACLED_TO_WDI_COUNTRY.items())]
    pd.DataFrame(rows).to_csv(mapping_path, index=False)

    region_dir = out_dir / "by_ddl_table"
    region_dir.mkdir(exist_ok=True)
    for key, part in events.merge(areas[["source_area_id", "ddl_table_key"]], on="source_area_id").groupby(
        "ddl_table_key", sort=True
    ):
        part.drop(columns=["ddl_table_key"]).to_csv(region_dir / f"{key}.csv", index=False)


def run_pipeline(acled_dir: Path | None = None, out_dir: Path | None = None) -> tuple[pd.DataFrame, dict]:
    root = project_root()
    acled_dir = acled_dir or (root / "ACLED Data")
    out_dir = out_dir or (root / "acled_preprocessing" / "output")
    raw = load_and_merge(acled_dir)
    clean, stats = clean_dataframe(raw)
    export_artifacts(clean, out_dir, stats)
    return clean, stats


if __name__ == "__main__":
    df, stats = run_pipeline()
    b = stats.get("bcnf", {})
    print(
        "Done.",
        stats["output_rows"],
        "event rows;",
        b.get("rows_acled_country"),
        "countries,",
        b.get("rows_acled_source_area"),
        "areas -> output/ (BCNF)",
    )
