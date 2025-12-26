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
    
    # Collections to clear (keep users)
    collections = ['rooms', 'tenants', 'contracts', 'bills', 'maintenance', 'transactions']
    
    for collection in collections:
        result = await db[collection].delete_many({})
        print(f"✓ Deleted {result.deleted_count} documents from {collection}")
    
    print("\n✓ All data cleared successfully (users kept)")
    print("You can now test with fresh data!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(clear_all_data())
