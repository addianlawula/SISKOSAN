import requests
import json
from datetime import datetime

def test_siskosan_basic():
    base_url = "https://kosman-app.preview.emergentagent.com/api"
    
    print("🚀 Testing SISKOSAN Basic Functionality...")
    
    # Test 1: Login with Super Admin
    print("\n1. Testing Super Admin Login...")
    try:
        response = requests.post(f"{base_url}/auth/login", json={
            "email": "superadmin@siskosan.com",
            "password": "superadmin123"
        })
        
        if response.status_code == 200:
            data = response.json()
            token = data['access_token']
            user = data['user']
            print(f"✅ Super Admin login successful")
            print(f"   User: {user['email']} ({user['role']})")
            
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test 2: Dashboard
            print("\n2. Testing Dashboard...")
            dash_response = requests.get(f"{base_url}/dashboard", headers=headers)
            if dash_response.status_code == 200:
                dashboard = dash_response.json()
                print(f"✅ Dashboard loaded successfully")
                print(f"   Kamar terisi: {dashboard.get('jumlah_kamar_terisi', 0)}")
                print(f"   Kamar kosong: {dashboard.get('jumlah_kamar_kosong', 0)}")
                print(f"   Tagihan belum bayar: {dashboard.get('jumlah_tagihan_belum_bayar', 0)}")
                print(f"   Pemasukan bulan ini: Rp {dashboard.get('pemasukan_bulan_ini', 0):,.0f}")
            else:
                print(f"❌ Dashboard failed: {dash_response.status_code}")
            
            # Test 3: Check existing data
            print("\n3. Checking existing data...")
            
            # Rooms
            rooms_response = requests.get(f"{base_url}/rooms", headers=headers)
            if rooms_response.status_code == 200:
                rooms = rooms_response.json()
                print(f"✅ Found {len(rooms)} rooms")
                for room in rooms[:3]:  # Show first 3
                    print(f"   - Kamar {room['nomor_kamar']}: Rp {room['harga']:,.0f} ({room['status']})")
            
            # Tenants
            tenants_response = requests.get(f"{base_url}/tenants", headers=headers)
            if tenants_response.status_code == 200:
                tenants = tenants_response.json()
                print(f"✅ Found {len(tenants)} tenants")
            
            # Rentals
            rentals_response = requests.get(f"{base_url}/rentals", headers=headers)
            if rentals_response.status_code == 200:
                rentals = rentals_response.json()
                active_rentals = [r for r in rentals if r['status'] == 'aktif']
                print(f"✅ Found {len(rentals)} rentals ({len(active_rentals)} active)")
            
            # Bills
            bills_response = requests.get(f"{base_url}/bills", headers=headers)
            if bills_response.status_code == 200:
                bills = bills_response.json()
                unpaid_bills = [b for b in bills if b['status'] == 'belum_bayar']
                print(f"✅ Found {len(bills)} bills ({len(unpaid_bills)} unpaid)")
            
            # Test 4: Admin Login
            print("\n4. Testing Admin Login...")
            admin_response = requests.post(f"{base_url}/auth/login", json={
                "email": "admin@siskosan.com",
                "password": "password123"
            })
            
            if admin_response.status_code == 200:
                admin_data = admin_response.json()
                admin_user = admin_data['user']
                print(f"✅ Admin login successful")
                print(f"   User: {admin_user['email']} ({admin_user['role']})")
            else:
                print(f"❌ Admin login failed: {admin_response.status_code}")
                print(f"   Response: {admin_response.text}")
            
            return True
            
        else:
            print(f"❌ Super Admin login failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    test_siskosan_basic()