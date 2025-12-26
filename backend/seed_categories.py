import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def seed_categories():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Default categories
    default_categories = [
        {"nama": "sewa", "tipe": "pemasukan"},
        {"nama": "listrik", "tipe": "pengeluaran"},
        {"nama": "air", "tipe": "pengeluaran"},
        {"nama": "internet", "tipe": "pengeluaran"},
        {"nama": "perbaikan", "tipe": "pengeluaran"},
        {"nama": "gaji", "tipe": "pengeluaran"},
        {"nama": "kebersihan", "tipe": "pengeluaran"},
        {"nama": "keamanan", "tipe": "pengeluaran"},
        {"nama": "lainnya", "tipe": "both"},
    ]
    
    for cat in default_categories:
        existing = await db.categories.find_one({"nama": cat["nama"]}, {"_id": 0})
        if not existing:
            doc = {
                "id": str(uuid.uuid4()),
                "nama": cat["nama"],
                "tipe": cat["tipe"],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.categories.insert_one(doc)
            print(f"✓ Added category: {cat['nama']} ({cat['tipe']})")
        else:
            print(f"- Category already exists: {cat['nama']}")
    
    print("\n✓ Default categories seeded successfully!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_categories())
