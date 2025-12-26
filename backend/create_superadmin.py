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

async def create_superadmin():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Check if super admin exists
    existing = await db.users.find_one({"role": "super_admin"}, {"_id": 0})
    if existing:
        print("Super Admin already exists:")
        print(f"Email: {existing['email']}")
        client.close()
        return
    
    # Create super admin
    hashed_password = pwd_context.hash("superadmin123")
    superadmin = {
        "id": str(uuid.uuid4()),
        "email": "superadmin@siskosan.com",
        "password": hashed_password,
        "role": "super_admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(superadmin)
    print("✓ Super Admin created successfully!")
    print("Email: superadmin@siskosan.com")
    print("Password: superadmin123")
    print("\nSuper Admin dapat:")
    print("- Full akses semua fitur")
    print("- Tambah/hapus user (Admin & Owner)")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_superadmin())
