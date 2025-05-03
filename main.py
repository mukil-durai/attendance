from flask import Flask, request
from flask_cors import CORS
from pymongo import MongoClient
import base64
import numpy as np
import cv2
import face_recognition
from datetime import datetime

app = Flask(__name__)
# Update CORS configuration
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# MongoDB connection
client = MongoClient("mongodb://localhost:27017/")
db = client["faceAuth"]
users_collection = db["users"]

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.json
        print("Received registration data:", data)  # Debug log
        
        if not data or 'image' not in data or 'studentId' not in data or 'classId' not in data:
            return {
                "status": "⚠️ Invalid input: Missing required fields",
                "success": False
            }, 400

        # Remove data URL prefix if present
        image_data = data['image']
        if 'base64,' in image_data:
            image_data = image_data.split('base64,')[1]
            
        # Decode and process the image
        image_bytes = base64.b64decode(image_data)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            return {
                "status": "⚠️ Invalid image data",
                "success": False
            }, 400

        # Get face encodings
        encodings = face_recognition.face_encodings(img)
        if len(encodings) == 0:
            return {
                "status": "⚠️ No face detected in the image",
                "success": False
            }, 400

        # Store with student and class information
        user_data = {
            "studentId": data['studentId'],
            "classId": data['classId'],
            "name": f"Student {data['studentId']}",
            "encoding": encodings[0].tolist(),
            "registered_at": datetime.now()
        }

        # Update or insert
        users_collection.update_one(
            {"studentId": data['studentId'], "classId": data['classId']},
            {"$set": user_data},
            upsert=True
        )

        return {
            "status": f"✅ Successfully registered student {data['studentId']}",
            "success": True
        }

    except Exception as e:
        print("Registration error:", str(e))  # Debug log
        return {
            "status": f"⚠️ Error: {str(e)}",
            "success": False
        }, 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        if 'image' not in data:
            return {"status": "⚠️ Invalid input: No image data provided"}, 400

        # Decode and process the image
        image_data = base64.b64decode(data['image'].split(',')[1])
        np_img = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

        encodings = face_recognition.face_encodings(img)
        if len(encodings) == 0:
            return {"status": "⚠️ No face detected in the image"}, 400

        current_encoding = encodings[0]

        # Compare with stored users
        users = users_collection.find()
        best_match = None
        best_distance = float('inf')

        for user in users:
            stored_encoding = np.array(user['encoding'])
            distance = face_recognition.face_distance([stored_encoding], current_encoding)[0]
            if distance < 0.5 and distance < best_distance:  # Stricter threshold
                best_match = user
                best_distance = distance

        if best_match:
            return {"status": f"✅ Hello, {best_match['name']}"}

        return {"status": "❌ Face not recognized"}, 401
    except Exception as e:
        return {"status": f"⚠️ Error: {str(e)}"}, 500

@app.route('/api/verify', methods=['POST', 'OPTIONS'])
def verify():
    if request.method == 'OPTIONS':
        return {}, 200
        
    try:
        data = request.json
        if 'image' not in data or 'classId' not in data:
            return {"status": "⚠️ Invalid input: Missing image or classId"}, 400

        # Decode image
        image_data = base64.b64decode(data['image'].split(',')[1])
        np_img = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

        # Get face encodings
        encodings = face_recognition.face_encodings(img)
        if len(encodings) == 0:
            return {"status": "⚠️ No face detected"}, 400

        current_encoding = encodings[0]

        # Find students in the specified class
        students = users_collection.find({"classId": data['classId']})
        best_match = None
        best_distance = float('inf')

        for student in students:
            if 'encoding' not in student:
                continue
            stored_encoding = np.array(student['encoding'])
            distance = face_recognition.face_distance([stored_encoding], current_encoding)[0]
            if distance < 0.5 and distance < best_distance:
                best_match = student
                best_distance = distance

        if best_match:
            return {
                "success": True,
                "status": "✅ Face verified",
                "data": {
                    "studentId": best_match['studentId'],
                    "name": best_match.get('name', best_match['studentId'])
                }
            }

        return {
            "success": False,
            "status": "❌ No matching student found in this class"
        }, 401

    except Exception as e:
        print("Verification error:", str(e))
        return {
            "success": False,
            "status": f"⚠️ Error: {str(e)}"
        }, 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
