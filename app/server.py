from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from datetime import datetime, timedelta
import random

app = Flask(__name__)
CORS(app)

def generate_weather_data(lat, lng, start_date, end_date, years=None):
    """
    Generate dummy weather data for multiple years.
    
    Args:
        lat (str or float): Latitude.
        lng (str or float): Longitude.
        start_date (str): e.g., "2025-01-01"
        end_date (str): e.g., "2025-12-31"
        years (list of int, optional): e.g., [2023, 2024, 2025]. If None, use year from start_date.
    
    Returns:
        dict: Keyed by 'lat_lng_YYYY-MM-DD' with weather metrics.
    """
    weather_data = {}

    if years is None:
        years = [2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009,
                 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019,
                 2020, 2021, 2022, 2023, 2024, 2025]

    delta = timedelta(days=1)
    start_dt_orig = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt_orig = datetime.strptime(end_date, "%Y-%m-%d")
    
    for year in years:
        curr_dt = start_dt_orig.replace(year=year)
        end_dt = end_dt_orig.replace(year=year)
        while curr_dt <= end_dt:
            date_str = curr_dt.strftime("%Y-%m-%d")
            key = f"{lat}_{lng}_{date_str}"
            weather_data[key] = {
                "temp": 20 + (curr_dt.day % 10) + random.randint(0, 5),
                "rainChance": (curr_dt.day % 50) + random.randint(0, 5),
                "snowChance": (curr_dt.day % 10) + random.randint(0, 5),
                "precipitation": (curr_dt.day % 20),
                "wind": 5 + (curr_dt.day % 5) + random.randint(0, 5),
                "uvIndex": (curr_dt.day % 12),
                "humidity": 50 + (curr_dt.day % 50),
                "cloudCover": (curr_dt.day % 100),
            }
            curr_dt += delta

    return weather_data

@app.route("/getWeather", methods=["POST"])
def get_weather():
    data = request.json

    latitude = data.get("latitude")
    longitude = data.get("longitude")
    date = data.get("date")
    start_date = data.get("startDate")
    end_date = data.get("endDate")

    if start_date is None or end_date is None:
        start_date = date
        end_date = date

    if latitude is None or longitude is None:
        return jsonify({"error": "Missing latitude or longitude"}), 400

    weather = generate_weather_data(latitude, longitude, start_date, end_date)

    filename = f"{latitude}_{longitude}.json"
    with open(filename, "w") as f:
        json.dump(weather, f, indent=2)

    return jsonify(weather)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
