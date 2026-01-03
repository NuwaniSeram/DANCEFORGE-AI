from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(MONGO_URI)
db = client["danceforge"]

# collections
users_collection = db["users"]
videos_collection = db["videos"]
results_collection = db["results"]
