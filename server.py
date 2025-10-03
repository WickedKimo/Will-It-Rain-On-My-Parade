from flask import Flask, request, jsonify

app = Flask(__name__)

# Example Python function
def add_numbers(a, b):
    return a + b

# API endpoint
@app.route("/add", methods=["POST"])
def add():
    data = request.json
    result = add_numbers(data["a"], data["b"])
    return jsonify({"result": result})

if __name__ == "__main__":
    app.run(debug=True, port=5000)