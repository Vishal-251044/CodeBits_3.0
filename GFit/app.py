import os
import json
import requests
import time
from flask import Flask, redirect, request, session, jsonify, render_template, make_response
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from dotenv import load_dotenv
import google.generativeai as genai  # Import Gemini AI SDK
from flask_cors import CORS

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/": {"origins": ""}})  # Enable CORS for all routes
app.secret_key = os.urandom(24)  # Secure random key for session

# Google OAuth Credentials from .env
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
REDIRECT_URI = os.getenv("REDIRECT_URI")
SCOPES = [
    "https://www.googleapis.com/auth/fitness.activity.read",
    "https://www.googleapis.com/auth/fitness.location.read",
    "https://www.googleapis.com/auth/fitness.body.read",
    "https://www.googleapis.com/auth/fitness.nutrition.read",
    "https://www.googleapis.com/auth/fitness.heart_rate.read",
    "https://www.googleapis.com/auth/fitness.sleep.read"
]

# Initialize Gemini AI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

# Home Page
@app.route("/")
def index():
    return render_template("index.html")

# Step 1: Google OAuth Login
@app.route("/login")
def login():
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [REDIRECT_URI],
            }
        },
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
    )

    auth_url, _ = flow.authorization_url(
        prompt="consent", 
        access_type="offline",  # Ensure refresh token
        include_granted_scopes="true"
    )
    return redirect(auth_url)

# Step 2: Handle OAuth Callback
@app.route("/callback")
def callback():
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [REDIRECT_URI],
            }
        },
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
    )
    flow.fetch_token(authorization_response=request.url)

    credentials = flow.credentials

    # Store credentials in session
    session["credentials"] = {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": credentials.scopes,
    }

    # return redirect("/get_health_data")  # Redirect to fetch full health data
    return redirect("http://localhost:3000/google-fit-dashboard")

# Step 3: Fetch Google Fit Data (With CORS Fixes)
@app.route("/get_health_data", methods=["GET", "OPTIONS"])
def get_health_data():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response, 200

    if "credentials" not in session:
        return redirect("/login")

    credentials = Credentials(**session["credentials"])

    # Refresh token if expired
    if credentials.expired and credentials.refresh_token:
        credentials.refresh(Request())
        session["credentials"]["token"] = credentials.token

    headers = {"Authorization": f"Bearer {credentials.token}"}

    # Time Range (Last 7 days)
    days = request.args.get("days", 7, type=int)
    end_time = int(time.time() * 1000)
    start_time = end_time - (days * 86400000)

    # Request Body for Google Fit API
    body = {
        "aggregateBy": [
            {"dataTypeName": "com.google.step_count.delta"},
            {"dataTypeName": "com.google.heart_rate.bpm"},
            {"dataTypeName": "com.google.calories.expended"},
            {"dataTypeName": "com.google.distance.delta"},
            {"dataTypeName": "com.google.weight"},
            {"dataTypeName": "com.google.sleep.segment"}
        ],
        "bucketByTime": {"durationMillis": 86400000},
        "startTimeMillis": start_time,
        "endTimeMillis": end_time
    }

    response = requests.post("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", json=body, headers=headers)

    if response.status_code == 200:
        data = response.json()
        health_data = {}

        # Parsing Google Fit Data
        for bucket in data.get("bucket", []):
            date = time.strftime('%Y-%m-%d', time.gmtime(int(bucket["startTimeMillis"]) / 1000))

            if date not in health_data:
                health_data[date] = {
                    "steps": 0,
                    "heart_rate": [],
                    "calories_burned": 0,
                    "distance": 0,
                    "weight": None,
                    "sleep_duration": 0
                }

            for dataset in bucket.get("dataset", []):
                for point in dataset.get("point", []):
                    data_type = point["dataTypeName"]
                    values = point["value"]

                    if data_type == "com.google.step_count.delta":
                        health_data[date]["steps"] += values[0].get("intVal", 0)

                    elif data_type == "com.google.heart_rate.bpm":
                        health_data[date]["heart_rate"].append(values[0].get("fpVal", 0))

                    elif data_type == "com.google.calories.expended":
                        health_data[date]["calories_burned"] += values[0].get("fpVal", 0)

                    elif data_type == "com.google.distance.delta":
                        health_data[date]["distance"] += values[0].get("fpVal", 0)

                    elif data_type == "com.google.weight":
                        health_data[date]["weight"] = values[0].get("fpVal", None)

                    elif data_type == "com.google.sleep.segment":
                        health_data[date]["sleep_duration"] += values[0].get("intVal", 0)

        # AI Health Analysis (Using Gemini)
        analysis = analyze_health_data(health_data)

        # Create response with CORS headers
        response = make_response(jsonify({"health_data": health_data, "analysis": analysis}))
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"

        return response

    return jsonify({"error": "Failed to fetch data", "details": response.json()}), response.status_code

def analyze_health_data(health_data):
    """Generate AI-based health insights using Gemini"""
    prompt = f"""
    Analyze the following health data trends:
    {json.dumps(health_data, indent=2)}

    Provide structured insights about:
    - Overall health trends (steps, calories burned, distance, sleep)
    - Areas of improvement
    - Personalized health tips
    - Potential health risks

    Output should be structured and concise.
    """

    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content(prompt)
    return response.text

# Step 4: Logout & Clear Session
@app.route("/logout")
def logout():
    session.clear()
    return "Logged out successfully. <a href='/'>Go Home</a>"

# Run Flask App
if __name__ == "_main_":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)