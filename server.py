from flask import Flask, request, jsonify
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests

def add_numbers(a, b):
    return a + b

@app.route("/add", methods=["POST"])
def add():
    data = request.json

    # Extract values from frontend
    a = data.get("a")
    b = data.get("b")
    latitude = data.get("latitude")
    longitude = data.get("longitude")

    result = add_numbers(a, b)

    # Build filename using latitude_longitude
    if latitude is not None and longitude is not None:
        filename = f"{latitude}_{longitude}.json"
    else:
        filename = "result.json"

    # Write JSON file
    output_data = {
        "a": a,
        "b": b,
        "result": result,
        "latitude": latitude,
        "longitude": longitude
    }
    with open(filename, "w") as f:
        json.dump(output_data, f, indent=2)

    return jsonify({"result": result, "filename": filename})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
