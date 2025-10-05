from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from datetime import datetime, timedelta
import random

NASA_DATA_ROOT = "C:/User/users/Desktop/NASA/merged/"
app = Flask(__name__)
CORS(app)

def get_25y_weather_data(lat_q: float, lon_q: float, month: int, day: int, root_dir: str):
    """
    從指定的根目錄中提取並處理指定座標和日期的25年氣象資料。

    Args:
        lat_q (float): 查詢的緯度。
        lon_q (float): 查詢的經度。
        month (int): 查詢的月份。
        day (int): 查詢的日期。
        root_dir (str): 包含年份子目錄（例如 "2000", "2001"）的根目錄路徑。

    Returns:
        dict: 一個字典，鍵為 "緯度_經度_日期"，值為該日期的衍生氣象數據。
    """
    # ---- 內部輔助函式 ----
    def _get_bounds(values: np.ndarray, q: float):
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
                                var_cols, date_str: str | None = None,
                                lat_padding: float = 1.5, lon_padding: float = 1.5):
        df = daily_df.copy()
        if date_str is not None and "date" in df.columns:
            df = df[df["date"] == date_str]
            if df.empty:
                raise ValueError(f"No rows for date {date_str} in provided DataFrame")
        df_sub = df[(df["lat"].between(lat_q - lat_padding, lat_q + lat_padding)) &
                    (df["lon"].between(lon_q - lon_padding, lon_q + lon_padding))]
        if df_sub.empty:
            df_sub = df
        exact = df_sub[(df_sub["lat"] == lat_q) & (df_sub["lon"] == lon_q)]
        if not exact.empty:
            row = exact.iloc[0]
            return {
                "method": "exact",
                "lat": row["lat"], "lon": row["lon"],
                **{v: (float(row[v]) if v in row else None) for v in var_cols}
            }
        lats = np.sort(df_sub["lat"].unique()); lons = np.sort(df_sub["lon"].unique())
        lat0, lat1 = _get_bounds(lats, lat_q); lon0, lon1 = _get_bounds(lons, lon_q)
        if lat0 is None or lon0 is None:
            raise ValueError("Unable to determine bounding grid for interpolation")

        def pick(latv, lonv):
            sub = df_sub[(df_sub["lat"] == latv) & (df_sub["lon"] == lonv)]
            if sub.empty:
                tol = 1e-6
                sub = df_sub[(np.isclose(df_sub["lat"], latv, atol=tol)) &
                             (np.isclose(df_sub["lon"], lonv, atol=tol))]
            return sub.iloc[0] if not sub.empty else None

        p00 = pick(lat0, lon0); p01 = pick(lat0, lon1); p10 = pick(lat1, lon0); p11 = pick(lat1, lon1)
        present = [p for p in (p00, p01, p10, p11) if p is not None]
        if not present: raise ValueError("No grid points found around query location")

        if lat0 == lat1 and lon0 == lon1 and p00 is not None:
            return {"method": "nearest", "lat": float(p00["lat"]), "lon": float(p00["lon"]),
                    **{v: (float(p00[v]) if (p00 is not None and v in p00) else None) for v in var_cols}}

        ty = 0.0 if lat0 == lat1 else (lat_q - lat0) / (lat1 - lat0)
        tx = 0.0 if lon0 == lon1 else (lon_q - lon0) / (lon1 - lon0)
        out = {"method": "bilinear", "lat_bounds": [float(lat0), float(lat1)], "lon_bounds": [float(lon0), float(lon1)]}

        for v in var_cols:
            def val(p): return None if (p is None or v not in p) else float(p[v])
            v00, v01, v10, v11 = val(p00), val(p01), val(p10), val(p11)
            have = [vv for vv in (v00, v01, v10, v11) if vv is not None]
            if not have: continue

            if lat0 == lat1 and lon0 == lon1 and v00 is not None:
                out[v] = v00; continue
            if lat0 == lat1:
                a = v00 if v00 is not None else v01
                b = v01 if v01 is not None else v00
                out[v] = (1 - tx) * a + tx * b; continue
            if lon0 == lon1:
                a = v00 if v00 is not None else v10
                b = v10 if v10 is not None else v00
                out[v] = (1 - ty) * a + ty * b; continue

            w00, w10, w01, w11 = (1 - tx) * (1 - ty), tx * (1 - ty), (1 - tx) * ty, tx * ty
            used_w = ((w00 if v00 is not None else 0.0) +
                      (w10 if v10 is not None else 0.0) +
                      (w01 if v01 is not None else 0.0) +
                      (w11 if v11 is not None else 0.0))
            num = ((w00 * (v00 or 0.0)) + (w10 * (v10 or 0.0)) +
                   (w01 * (v01 or 0.0)) + (w11 * (v11 or 0.0)))
            out[v] = float(num / used_w) if used_w else have[0]

        out["corners"] = [{"lat": float(p["lat"]), "lon": float(p["lon"])} for p in present[:4]]
        out["tx"], out["ty"] = float(tx), float(ty)
        return out

    def find_daily_file(year: int, month: int, day: int, root: str):
        d = f"{year}-{month:02d}-{day:02d}"
        patt = os.path.join(root, f"{year}", f"*{d}*.json")
        hits = sorted(glob.glob(patt))
        return hits[0] if hits else None

    # ---- 啟發式規則 / 閾值 ----
    PRECIP_RAIN_THRESH = 0.5   # mm → rain=1 if >= this
    SNOW_THRESH = 0.1          # mm → snow=1 if >= this
    TAU_CLEAR_MAX = 5.0        # TAUTOT < 5  → "Clear"
    TAU_PARTLY_MAX = 20.0      # 5–20        → "partly cloudy"
    # >20 → "mostly cloudy"

    def classify_rain(precip):
        if precip is None or np.isnan(precip): return "Unknown"
        if precip < PRECIP_RAIN_THRESH: return "No Rain"
        if precip < 5: return "Light"
        if precip < 20.0: return "Moderate"
        if precip < 50.0: return "Heavy"
        if precip < 100.0: return "Very Heavy"
        return "Extreme"

    def classify_cloud(tau):
        if tau is None or np.isnan(tau): return "unknown"
        if tau < TAU_CLEAR_MAX: return "Clear"
        if tau <= TAU_PARTLY_MAX: return "Partly Cloudy"
        return "Mostly Cloudy"

    def derive_payload(rec_in: dict) -> dict:
        TLML = rec_in.get("TLML")
        SPEED = rec_in.get("SPEED")
        QSH = rec_in.get("QSH")
        PR2 = rec_in.get("PRECTOT")
        SNOWF = rec_in.get("PRECSNO")
        TAU = rec_in.get("TAUTOT")

        precip = PR2 * 86400 if PR2 is not None else None
        temp_c = (TLML - 273.15) if TLML is not None else None
        wind = SPEED
        qsh_out = (QSH * 1000.0) if (QSH is not None and QSH <= 1.0) else QSH
        snowfall = SNOWF

        return {
            "temp_c": None if temp_c is None else round(float(temp_c), 2),
            "total_precipitation": None if precip is None else round(float(precip), 2),
            "rain": None if precip is None else (1 if precip >= PRECIP_RAIN_THRESH else 0),
            "rain_level": classify_rain(precip),
            "snowfall": None if snowfall is None else round(float(snowfall), 2),
            "snow": None if snowfall is None else (1 if snowfall >= SNOW_THRESH else 0),
            "windspeed": None if wind is None else round(float(wind), 2),
            "QSH": None if qsh_out is None else round(float(qsh_out), 2),
            "TAUTOT": None if TAU is None else round(float(TAU), 2),
            "cloud": classify_cloud(TAU),
        }

    # ---- 主邏輯 ----
    var_cols = ["TLML", "SPEED", "QSH", "total_precipitation", "PRECTOT", "PRECSNO", "TAUTOT"]
    output_obj = {}

    for year in range(2000, 2024 + 1):
        y, m, dd = year, month, day
        used_fallback_0228 = False
        if m == 2 and dd == 29:
            try:
                date(y, 2, 29)
            except ValueError:
                dd = 28
                used_fallback_0228 = True

        fp = find_daily_file(y, m, dd, root_dir)
        if not fp:
            continue

        try:
            df = pd.read_json(fp, orient="records")
            if "date" not in df.columns:
                continue
            
            date_str = pd.to_datetime(df["date"].iloc[0]).strftime("%Y-%m-%d")
            res = bilinear_from_dataframe(df, lat_q, lon_q, var_cols=var_cols, date_str=date_str)

            rec_in = {k: v for k, v in res.items()
                      if k not in ("method", "lat_bounds", "lon_bounds", "corners", "tx", "ty", "lat", "lon")}

            payload = derive_payload(rec_in)
            if used_fallback_0228:
                payload["used_fallback_0228"] = True

            key = f"{lat_q:.4f}_{lon_q:.4f}_{date_str}"
            output_obj[key] = payload

        except Exception as e:
            # 在伺服器環境中，印出錯誤日誌可能比靜默跳過更好
            print(f"Error processing file for date {y}-{m}-{dd}: {e}")
            pass

    return output_obj

@app.route("/getWeather", methods=["POST"])
def get_weather():
    data = request.json

    lat_q = data.get("latitude")
    lon_q = data.get("longitude")
    or_date = data.get("date")
    start_date = data.get("startDate")
    end_date = data.get("endDate")

    if start_date is None or end_date is None:
        start_date = or_date
        end_date = or_date

    ## TODO: Replace with real data fetching logic
    # if latitude is None or longitude is None:
    #     return jsonify({"error": "Missing latitude or longitude"}), 400

    for date in (start_date, end_date):
        month, day = map(int, date.split("-")[1:])
        weather = get_25y_weather_data(lat_q, lon_q, month, day, NASA_DATA_ROOT)

        filename = f"{lat_q}_{lon_q}_{date}.json"
        with open(filename, "w") as f:
            json.dump(weather, f, indent=2)

    return jsonify(weather)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
