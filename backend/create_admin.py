import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Check if admin exists
    existing = await db.users.find_one({"email": "admin@kosman.com"}, {"_id": 0})
    if existing:
        print("Admin user already exists")
        return
    
    # Create admin
    hashed_password = pwd_context.hash("password123")
    admin = {
        "id": str(uuid.uuid4()),
        "email": "admin@kosman.com",
        "password": hashed_password,
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(admin)
    print("Admin user created successfully!")
    print("Email: admin@kosman.com")
    print("Password: password123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_admin())
