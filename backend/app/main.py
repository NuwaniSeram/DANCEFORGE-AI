from fastapi import FastAPI
from app.database.mongodb import users_collection

app = FastAPI()

@app.get("/")
def test_db():
    users_collection.insert_one({"test": "MongoDB Connected"})
    return {"message": "MongoDB connection successful"}
