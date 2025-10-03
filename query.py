#%%
# ---- Imports ----

import xarray as xr
import os
import earthaccess
import getpass
import requests
import numpy as np
import matplotlib.pyplot as plt
import sys
print(sys.executable)

import pydap
from pydap.net import create_session

import json
import pandas as pd

import logging

#%%
# ---- Config ----

# dataset = "M2T1NXRAD"
dataset = "M2T1NXFLX"
# dataset = "M2T1NXSLV"
dversion = "5.12.4"
year = 2020
start_date = "01-01"
end_date = "01-01"
bounding_box = (-180, 0, 180, 90)  # (min_lon, min_lat, max_lon, max_lat)
output_dir = "D:/NasaData/daily_missing"  # one file per day will be written here
file_suffix = "_v1"  # suffix for output files (versions)
mode  = "advanced"  # "simple" for (mean), "advanced" for others
                    # currently calculates (mean, max, min, var), go to line 141 to change

VAR_COLS = ["TLML", "SPEED"]
# VAR_COLS = ["TAUTOT"]
# VAR_COLS = ["SPEED", "TLML", "QSH", "PRECTOT", "PRECSNO"]
# VAR_COLS = ["T2M", "QV2M", "U2M", "V2M"]
COORD_COLS = ["lat", "lon", "time"]

os.makedirs(output_dir, exist_ok=True)

#%%
# ---- Logging setup ----

logging.addLevelName(25, 'MY_DEBUG')

# Add a convenience method to the Logger class
def my_debug(self, message, *args, **kws):
    if self.isEnabledFor(25):
        self._log(25, message, args, **kws)

logging.Logger.my_debug = my_debug

logging.basicConfig(
    level=25,  # Use the numeric value for MY_DEBUG level
    format="%(asctime)s [%(levelname)s] %(message)s",
    force=True  # Force reconfiguration in interactive environments
)

logger = logging.getLogger(__name__)
logger.setLevel(25)  # Ensure logger level is set explicitly

#%%
# ---- Downloading earthdata files ----

# Authenticate
auth = earthaccess.login()
my_session = create_session()

# Build the list of dates for the whole year
dates = pd.date_range(f"{year}-{start_date}", f"{year}-{end_date}", freq="D")

# Get OPeNDAP URLs from earthaccess search results
def _extract_opendap_urls(results):
    urls = []

    ce_vars = VAR_COLS + COORD_COLS
    ce = "/" + "%3B/".join(ce_vars)
    ce = f"?dap4.ce={ce}"

    for item in results:
        related = item.get("umm", {}).get("RelatedUrls", [])
        for r in related:
            desc = (r.get("Description") or "").upper()
            typ = (r.get("Type") or "").upper()
            if "OPENDAP" in desc or "OPENDAP" in typ:
                base = r["URL"].replace("https", "dap4")
                urls.append(base + ce)
    return urls

for day in dates:
    day_str = day.strftime("%Y-%m-%d")
    print(f"Processing {day_str} …")

    # Search the one day granule
    results = earthaccess.search_data(
        short_name=dataset,
        version=dversion,
        temporal=(day_str, day_str),
        bounding_box=bounding_box,
    )

    opendap_urls = _extract_opendap_urls(results)

    logger.my_debug(f"OPeNDAP URLs: {opendap_urls}")

    if not opendap_urls:
        print(f"[WARN] No OPeNDAP URLs found for {day_str}; skipping.")
        continue

    try:
        ds = xr.open_mfdataset(opendap_urls, engine="pydap", session=my_session)
        # Convert to DataFrame: columns => VAR_COLS + COORD_COLS
        # Only keep the VAR_COLS that are actually present in the dataset
        present_vars = [v for v in VAR_COLS if v in ds.variables or v in ds.data_vars]

        logger.my_debug(f"Dataset variables in dataset: {list(ds.variables)}")
        logger.my_debug(f"Requested variables: {present_vars}")

        if not present_vars:
            raise ValueError("None of the requested VAR_COLS were found in the dataset")
        df = ds[present_vars].to_dataframe().reset_index()

        # Add a date column
        df["date"] = df["time"].dt.date
        
        if mode == "simple":
            # Average across the times within the same day
            daily = (
                df.groupby(["lat", "lon"], as_index=False)
                .mean(numeric_only=True)
                .sort_values(["lat", "lon"])
            )
            # Add the date string column back as the first column
            daily.insert(0, "date", day_str)
        
        elif mode == "advanced":
            # Compute statistics per day per location
            grouped = df.groupby(["lat", "lon", "date"])

            # daily_mean = grouped.mean(numeric_only=True).rename(columns=lambda x: f"{x}_mean")
            daily_max = grouped.max(numeric_only=True).rename(columns=lambda x: f"{x}_max")
            daily_min = grouped.min(numeric_only=True).rename(columns=lambda x: f"{x}_min")
            daily_var = grouped.var(numeric_only=True).rename(columns=lambda x: f"{x}_var")

            # daily = pd.concat([daily_mean, daily_max, daily_min, daily_var], axis=1).reset_index()
            daily = pd.concat([daily_max, daily_min, daily_var], axis=1).reset_index()
            daily = daily.sort_values(["lat", "lon"])

        # Write to one JSON per day
        out_path = os.path.join(output_dir, f"{dataset}_{day_str}{file_suffix}.json")
        daily.to_json(out_path, orient="records", date_format="iso")
        print(f"Wrote EarthData file to {out_path}")

    except Exception as e:
        print(f"[ERROR] {day_str}: {e}")

    finally:
        try:
            ds.close()
        except Exception:
            pass

print("All done.")
#%%
# ---- Test querying the downloaded daily JSON files using bilinear interpolation ----

# Pure vibe coding regarding bilinear interpolation from daily JSON files

# Directory that holds one JSON per day created above
read_dir = output_dir  # reuse the same output directory


def load_daily_json(date_str: str, file_suffix: str) -> pd.DataFrame:
    """Load the per-day JSON file and return a DataFrame.
    Expects filename pattern: {dataset}_{YYYY-MM-DD}.json in read_dir.
    """
    logger.my_debug(f"Loading daily JSON for {dataset}_{date_str}{file_suffix}.json")
    path = os.path.join(read_dir, f"{dataset}_{date_str}{file_suffix}.json")
    if not os.path.exists(path):
        raise FileNotFoundError(f"Daily JSON not found: {path}")
    df = pd.read_json(path, orient="records")
    # Ensure column order/types
    if "date" in df.columns:
        # Normalize to string date like YYYY-MM-DD
        df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    return df


def _get_bounds(values: np.ndarray, q: float):
    """Return lower (<=q) and upper (>=q) bounds from a 1D array.
    If one side is missing (edge), returns the available side twice.
    """
    lower_vals = values[values <= q]
    upper_vals = values[values >= q]
    if lower_vals.size == 0 and upper_vals.size == 0:
        return None, None
    if lower_vals.size == 0:
        lo = upper_vals.min()
        return lo, lo
    if upper_vals.size == 0:
        hi = lower_vals.max()
        return hi, hi
    return lower_vals.max(), upper_vals.min()


def bilinear_from_dataframe(daily_df: pd.DataFrame, lat_q: float, lon_q: float,
                             var_cols=VAR_COLS, date_str: str | None = None,
                             lat_padding: float = 1.5, lon_padding: float = 1.5):
    """Perform bilinear interpolation from the four neighboring (lat, lon) points.

    - Filters to a date (optional; useful if the file somehow contains multiple days).
    - Optionally restricts to a +/- padding rectangle to avoid scanning the whole file.
    - If the exact (lat, lon) exists, returns it directly (no interpolation).
    - At edges where only a line/point is available, falls back to linear/nearest.

    Returns: dict with interpolated values for each var in var_cols and metadata.
    """
    logger.my_debug(f"Querying lat={lat_q}, lon={lon_q}, date={date_str}")
    df = daily_df.copy()
    if date_str is not None and "date" in df.columns:
        df = df[df["date"] == date_str]
        if df.empty:
            raise ValueError(f"No rows for date {date_str} in provided DataFrame")

    # Quick subset around the query to speed up
    df_sub = df[(df["lat"].between(lat_q - lat_padding, lat_q + lat_padding)) &
                (df["lon"].between(lon_q - lon_padding, lon_q + lon_padding))]
    if df_sub.empty:
        # If nothing in padding, just use entire df (small per-day files)
        df_sub = df

    # If exact grid point exists, return directly
    exact = df_sub[(df_sub["lat"] == lat_q) & (df_sub["lon"] == lon_q)]
    if not exact.empty:
        row = exact.iloc[0]
        return {
            "method": "exact",
            "lat": row["lat"],
            "lon": row["lon"],
            **{v: float(row[v]) for v in var_cols if v in row}
        }

    # Unique sorted coordinates
    lats = np.sort(df_sub["lat"].unique())
    lons = np.sort(df_sub["lon"].unique())

    lat0, lat1 = _get_bounds(lats, lat_q)
    lon0, lon1 = _get_bounds(lons, lon_q)
    if lat0 is None or lon0 is None:
        raise ValueError("Unable to determine bounding grid for interpolation")

    # If degenerate (edge), we may have lat0==lat1 or lon0==lon1; handle gracefully
    corners = (
        (lat0, lon0),
        (lat0, lon1),
        (lat1, lon0),
        (lat1, lon1),
    )
    # Fetch the four corner rows (some may duplicate at edges)
    def pick(latv, lonv):
        sub = df_sub[(df_sub["lat"] == latv) & (df_sub["lon"] == lonv)]
        if sub.empty:
            # If a corner is missing (sparse), expand search minimally
            # pick nearest within tiny tolerance
            tol = 1e-6
            sub = df_sub[(np.isclose(df_sub["lat"], latv, atol=tol)) &
                         (np.isclose(df_sub["lon"], lonv, atol=tol))]
        if sub.empty:
            return None
        return sub.iloc[0]

    p00 = pick(lat0, lon0)
    p01 = pick(lat0, lon1)
    p10 = pick(lat1, lon0)
    p11 = pick(lat1, lon1)

    # If some corners missing, degrade to linear/nearest as needed
    present = [p for p in (p00, p01, p10, p11) if p is not None]
    if len(present) == 0:
        raise ValueError("No grid points found around query location")

    if lat0 == lat1 and lon0 == lon1 and p00 is not None:
        # single point fallback
        return {
            "method": "nearest",
            "lat": float(p00["lat"]),
            "lon": float(p00["lon"]),
            **{v: float(p00[v]) for v in var_cols if v in p00}
        }

    # Compute weights
    # Guard zero denominators when lat0==lat1 or lon0==lon1
    if lat0 == lat1:
        ty = 0.0
    else:
        ty = (lat_q - lat0) / (lat1 - lat0)
    if lon0 == lon1:
        tx = 0.0
    else:
        tx = (lon_q - lon0) / (lon1 - lon0)

    out = {"method": "bilinear", "lat_bounds": [float(lat0), float(lat1)], "lon_bounds": [float(lon0), float(lon1)]}

    for v in var_cols:
        logger.my_debug(f"Interpolating variable: {v}")
        # Pull values; if missing, try to degrade
        def val(p):
            return None if (p is None or v not in p) else float(p[v])
        v00, v01, v10, v11 = val(p00), val(p01), val(p10), val(p11)
        vals = [v00, v01, v10, v11]
        have = [vv for vv in vals if vv is not None]
        if not have:
            continue  # skip variable if entirely missing

        if lat0 == lat1 and lon0 == lon1 and v00 is not None:
            out[v] = v00
            continue
        if lat0 == lat1:  # linear along lon
            # v = (1-tx)*v00 + tx*v01  (assuming p00@lon0, p01@lon1)
            if v00 is None and v01 is None:
                out[v] = have[0]
            else:
                a = v00 if v00 is not None else v01
                b = v01 if v01 is not None else v00
                out[v] = (1 - tx) * a + tx * b
            continue
        if lon0 == lon1:  # linear along lat
            # v = (1-ty)*v00 + ty*v10  (assuming p00@lat0, p10@lat1)
            if v00 is None and v10 is None:
                out[v] = have[0]
            else:
                a = v00 if v00 is not None else v10
                b = v10 if v10 is not None else v00
                out[v] = (1 - ty) * a + ty * b
            continue

        # Full bilinear if we have enough values; otherwise blend what's available
        # Standard formula: f = v00*(1-tx)*(1-ty) + v10*(1-ty)*tx + v01*(1-tx)*ty + v11*tx*ty
        w00, w10, w01, w11 = (1 - tx) * (1 - ty), tx * (1 - ty), (1 - tx) * ty, tx * ty
        terms = []
        if v00 is not None:
            terms.append(w00 * v00)
        if v10 is not None:
            terms.append(w10 * v10)
        if v01 is not None:
            terms.append(w01 * v01)
        if v11 is not None:
            terms.append(w11 * v11)
        if terms:
            # Normalize by sum of weights actually used (handles missing corners)
            used_w = ( (w00 if v00 is not None else 0.0) +
                       (w10 if v10 is not None else 0.0) +
                       (w01 if v01 is not None else 0.0) +
                       (w11 if v11 is not None else 0.0) )
            if used_w == 0:
                out[v] = have[0]
            else:
                out[v] = float(np.sum(terms) / used_w)

    # Also return the raw corner points used for transparency
    out["corners"] = [
        {"lat": float(p["lat"]), "lon": float(p["lon"]), **{v: float(p[v]) for v in var_cols if v in p}} for p in present[:4]
    ]
    out["tx"], out["ty"] = float(tx), float(ty)
    return out


# ---- Example usage ----
# Query parameters
query_date = "2020-01-01"
lat_q = 25.02
lon_q = 121.33
q_file_suffix = file_suffix  # to match the saved file

_daily = load_daily_json(query_date, q_file_suffix)

# all columns in the daily file except lon/lat/date
q_var_cols = [vc for vc in _daily.columns if vc not in ("lat", "lon", "date")]
logger.my_debug(f"Columns to interpolate: {q_var_cols}")

interp = bilinear_from_dataframe(_daily, lat_q, lon_q, q_var_cols, date_str=query_date)
print(json.dumps(interp, indent=2))