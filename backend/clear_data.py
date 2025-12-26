import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def clear_all_data():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Collections to clear
    collections = ['rooms', 'tenants', 'rentals', 'bills', 'maintenance', 'transactions']
    
    for collection in collections:
        result = await db[collection].delete_many({})
        print(f"✓ Deleted {result.deleted_count} documents from {collection}")
    
    # Delete users except super admin
    result = await db.users.delete_many({"role": {"$ne": "super_admin"}})
    print(f"✓ Deleted {result.deleted_count} users (kept super admin)")
    
    print("\n✓ All data cleared successfully!")
    print("✓ Super Admin (superadmin@siskosan.com) kept")
    print("\nReady for fresh testing!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(clear_all_data())
