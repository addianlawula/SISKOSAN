import requests
import sys
import json
from datetime import datetime, timedelta

class SiskosanAPITester:
    def __init__(self, base_url="https://kosman-app.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_ids = {
            'users': [],
            'rooms': [],
            'tenants': [],
            'rentals': [],
            'bills': [],
            'maintenance': [],
            'transactions': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for file uploads
                    headers.pop('Content-Type', None)
                    response = requests.post(url, data=data, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")

            return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_auth(self):
        """Test authentication endpoints"""
        print("\n=== TESTING AUTHENTICATION ===")
        
        # Test login with super admin credentials
        success, response = self.run_test(
            "Super Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "superadmin@siskosan.com", "password": "superadmin123"}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"✅ Token obtained: {self.token[:20]}...")
            
            # Test get current user
            self.run_test(
                "Get Current User",
                "GET",
                "auth/me",
                200
            )
            
            # Test admin login
            self.run_test(
                "Admin Login Test",
                "POST",
                "auth/login",
                200,
                data={"email": "admin@siskosan.com", "password": "password123"}
            )
            
            return True
        else:
            print("❌ Failed to get authentication token")
            return False

    def test_users(self):
        """Test user management (Super Admin only)"""
        print("\n=== TESTING USER MANAGEMENT ===")
        
        # Create new admin user
        user_data = {
            "email": "testadmin@siskosan.com",
            "password": "testpass123",
            "role": "admin"
        }
        success, response = self.run_test(
            "Create Admin User",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success and 'id' in response:
            user_id = response['id']
            self.created_ids['users'].append(user_id)
            
            # Get all users
            self.run_test(
                "Get All Users",
                "GET",
                "users",
                200
            )
            
            # Create owner user
            owner_data = {
                "email": "testowner@siskosan.com",
                "password": "testpass123",
                "role": "owner"
            }
            success2, response2 = self.run_test(
                "Create Owner User",
                "POST",
                "auth/register",
                200,
                data=owner_data
            )
            
            if success2 and 'id' in response2:
                self.created_ids['users'].append(response2['id'])
            
            # Test validation - cannot delete own account
            # This should fail since we're trying to delete our own account
            # We'll skip this test for now
            
            return True
        return False
    def test_rooms(self):
        """Test room CRUD operations"""
        print("\n=== TESTING ROOMS ===")
        
        # Create room
        room_data = {
            "nomor_kamar": "A1",
            "harga": 1000000,
            "fasilitas": "AC, WiFi, Kamar mandi dalam"
        }
        success, response = self.run_test(
            "Create Room",
            "POST",
            "rooms",
            200,
            data=room_data
        )
        
        if success and 'id' in response:
            room_id = response['id']
            self.created_ids['rooms'].append(room_id)
            
            # Get all rooms
            self.run_test(
                "Get All Rooms",
                "GET",
                "rooms",
                200
            )
            
            # Get specific room
            self.run_test(
                "Get Room by ID",
                "GET",
                f"rooms/{room_id}",
                200
            )
            
            # Update room
            update_data = {"harga": 1200000}
            self.run_test(
                "Update Room",
                "PUT",
                f"rooms/{room_id}",
                200,
                data=update_data
            )
            
            # Test duplicate room number validation
            self.run_test(
                "Create Duplicate Room (should fail)",
                "POST",
                "rooms",
                400,
                data=room_data
            )
            
            return True
        return False

    def test_tenants(self):
        """Test tenant CRUD operations"""
        print("\n=== TESTING TENANTS ===")
        
        # Create tenant
        tenant_data = {
            "nama": "John Doe",
            "telepon": "08123456789",
            "email": "john@example.com",
            "ktp": "3201234567890001",
            "alamat": "Jl. Contoh No. 123"
        }
        success, response = self.run_test(
            "Create Tenant",
            "POST",
            "tenants",
            200,
            data=tenant_data
        )
        
        if success and 'id' in response:
            tenant_id = response['id']
            self.created_ids['tenants'].append(tenant_id)
            
            # Get all tenants
            self.run_test(
                "Get All Tenants",
                "GET",
                "tenants",
                200
            )
            
            # Get specific tenant
            self.run_test(
                "Get Tenant by ID",
                "GET",
                f"tenants/{tenant_id}",
                200
            )
            
            # Update tenant
            update_data = {"telepon": "08987654321"}
            self.run_test(
                "Update Tenant",
                "PUT",
                f"tenants/{tenant_id}",
                200,
                data=update_data
            )
            
            return True
        return False

    def test_rentals(self):
        """Test rental operations and business logic"""
        print("\n=== TESTING RENTALS ===")
        
        if not self.created_ids['rooms'] or not self.created_ids['tenants']:
            print("❌ Need rooms and tenants to test rentals")
            return False
        
        # Create rental with new tenant (inline create)
        rental_data = {
            "room_id": self.created_ids['rooms'][0],
            "harga": 1000000,
            "tanggal_mulai": datetime.now().isoformat(),
            "tenant": {
                "nama": "Jane Doe",
                "telepon": "08987654321",
                "email": "jane@example.com",
                "ktp": "3201234567890002",
                "alamat": "Jl. Test No. 456"
            }
        }
        
        success, response = self.run_test(
            "Create Rental with New Tenant",
            "POST",
            "rentals",
            200,
            data=rental_data
        )
        
        if success and 'id' in response:
            rental_id = response['id']
            self.created_ids['rentals'].append(rental_id)
            
            # Get all rentals
            self.run_test(
                "Get All Rentals",
                "GET",
                "rentals",
                200
            )
            
            # Test duplicate rental validation (same room)
            rental_data2 = {
                "room_id": self.created_ids['rooms'][0],
                "tenant_id": self.created_ids['tenants'][0],
                "harga": 1000000
            }
            self.run_test(
                "Create Duplicate Rental (should fail)",
                "POST",
                "rentals",
                400,
                data=rental_data2
            )
            
            # Test end rental
            self.run_test(
                "End Rental",
                "POST",
                f"rentals/{rental_id}/end",
                200
            )
            
            return True
        return False

    def test_bills(self):
        """Test bill operations"""
        print("\n=== TESTING BILLS ===")
        
        # Get all bills (should include auto-created ones from contract)
        success, response = self.run_test(
            "Get All Bills",
            "GET",
            "bills",
            200
        )
        
        if success and response:
            bills = response
            if bills:
                bill_id = bills[0]['id']
                self.created_ids['bills'].append(bill_id)
                
                # Test mark bill as paid
                self.run_test(
                    "Mark Bill as Paid",
                    "POST",
                    f"bills/{bill_id}/mark-paid",
                    200
                )
                
                return True
        
        # Create manual bill if no auto bills exist
        if self.created_ids['contracts']:
            bill_data = {
                "contract_id": self.created_ids['contracts'][0],
                "bulan": 12,
                "tahun": 2024,
                "jumlah": 1000000
            }
            
            success, response = self.run_test(
                "Create Manual Bill",
                "POST",
                "bills",
                200,
                data=bill_data
            )
            
            if success and 'id' in response:
                self.created_ids['bills'].append(response['id'])
                return True
        
        return False

    def test_maintenance(self):
        """Test maintenance operations"""
        print("\n=== TESTING MAINTENANCE ===")
        
        if not self.created_ids['rooms']:
            print("❌ Need rooms to test maintenance")
            return False
        
        # Create maintenance report
        maintenance_data = {
            "room_id": self.created_ids['rooms'][0],
            "deskripsi": "AC tidak dingin"
        }
        
        success, response = self.run_test(
            "Create Maintenance Report",
            "POST",
            "maintenance",
            200,
            data=maintenance_data
        )
        
        if success and 'id' in response:
            maintenance_id = response['id']
            self.created_ids['maintenance'].append(maintenance_id)
            
            # Get all maintenance
            self.run_test(
                "Get All Maintenance",
                "GET",
                "maintenance",
                200
            )
            
            # Update maintenance status
            update_data = {
                "petugas": "Teknisi A",
                "status": "selesai",
                "biaya": 150000
            }
            
            self.run_test(
                "Update Maintenance Status",
                "PUT",
                f"maintenance/{maintenance_id}",
                200,
                data=update_data
            )
            
            return True
        return False

    def test_transactions(self):
        """Test transaction operations"""
        print("\n=== TESTING TRANSACTIONS ===")
        
        # Create manual transaction
        transaction_data = {
            "tipe": "pengeluaran",
            "jumlah": 50000,
            "sumber": "Listrik",
            "kategori": "utilitas"
        }
        
        success, response = self.run_test(
            "Create Manual Transaction",
            "POST",
            "transactions",
            200,
            data=transaction_data
        )
        
        if success and 'id' in response:
            self.created_ids['transactions'].append(response['id'])
            
            # Get all transactions
            self.run_test(
                "Get All Transactions",
                "GET",
                "transactions",
                200
            )
            
            # Get transaction summary
            self.run_test(
                "Get Transaction Summary",
                "GET",
                "transactions/summary",
                200
            )
            
            return True
        return False

    def test_dashboard(self):
        """Test dashboard endpoint"""
        print("\n=== TESTING DASHBOARD ===")
        
        success, response = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "dashboard",
            200
        )
        
        if success and response:
            required_fields = [
                'jumlah_kamar_terisi',
                'jumlah_tagihan_belum_bayar', 
                'pemasukan_bulan_ini',
                'jumlah_laporan_kerusakan',
                'aktivitas_terbaru'
            ]
            
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing field in dashboard: {field}")
                    return False
            
            print("✅ Dashboard contains all required fields")
            return True
        
        return False

    def cleanup(self):
        """Clean up created test data"""
        print("\n=== CLEANUP ===")
        
        # Delete in reverse order to handle dependencies
        for maintenance_id in self.created_ids['maintenance']:
            self.run_test(f"Delete Maintenance {maintenance_id}", "DELETE", f"maintenance/{maintenance_id}", 200)
        
        for contract_id in self.created_ids['contracts']:
            self.run_test(f"Delete Contract {contract_id}", "DELETE", f"contracts/{contract_id}", 200)
        
        for tenant_id in self.created_ids['tenants']:
            self.run_test(f"Delete Tenant {tenant_id}", "DELETE", f"tenants/{tenant_id}", 200)
        
        for room_id in self.created_ids['rooms']:
            self.run_test(f"Delete Room {room_id}", "DELETE", f"rooms/{room_id}", 200)

def main():
    print("🚀 Starting KOSMAN API Testing...")
    tester = KosmanAPITester()
    
    # Test authentication first
    if not tester.test_auth():
        print("❌ Authentication failed, stopping tests")
        return 1
    
    # Run all tests
    test_results = {
        'auth': True,  # Already passed
        'rooms': tester.test_rooms(),
        'tenants': tester.test_tenants(),
        'contracts': tester.test_contracts(),
        'bills': tester.test_bills(),
        'maintenance': tester.test_maintenance(),
        'transactions': tester.test_transactions(),
        'dashboard': tester.test_dashboard()
    }
    
    # Print results
    print(f"\n📊 Test Results:")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    for module, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{module.upper()}: {status}")
    
    # Cleanup (optional, comment out if you want to keep test data)
    # tester.cleanup()
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"\nOverall Success Rate: {success_rate:.1f}%")
    
    return 0 if success_rate >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())