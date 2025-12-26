from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import shutil
from calendar import monthrange
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib import colors

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

SECRET_KEY = os.environ.get('SECRET_KEY', 'siskosan-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 43200
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

app = FastAPI()
api_router = APIRouter(prefix="/api")

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# ==================== MODELS ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    role: Literal["owner", "admin"]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: Literal["owner", "admin"]

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Room(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nomor_kamar: str
    harga: float
    fasilitas: str
    status: Literal["kosong", "terisi"] = "kosong"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RoomCreate(BaseModel):
    nomor_kamar: str
    harga: float
    fasilitas: str

class RoomUpdate(BaseModel):
    nomor_kamar: Optional[str] = None
    harga: Optional[float] = None
    fasilitas: Optional[str] = None
    status: Optional[Literal["kosong", "terisi"]] = None

class Tenant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nama: str
    telepon: str
    email: Optional[str] = None
    ktp: str
    alamat: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TenantCreate(BaseModel):
    nama: str
    telepon: str
    email: Optional[str] = None
    ktp: str
    alamat: str

class TenantUpdate(BaseModel):
    nama: Optional[str] = None
    telepon: Optional[str] = None
    email: Optional[str] = None
    ktp: Optional[str] = None
    alamat: Optional[str] = None

class Rental(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    room_id: str
    tanggal_mulai: datetime
    harga: float
    status: Literal["aktif", "selesai"] = "aktif"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RentalCreate(BaseModel):
    room_id: str
    harga: float
    tanggal_mulai: Optional[datetime] = None
    tenant: Optional[TenantCreate] = None
    tenant_id: Optional[str] = None

class Bill(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rental_id: str
    bulan: int
    tahun: int
    jumlah: float
    tipe: Literal["sewa", "tambahan"] = "sewa"
    keterangan: Optional[str] = None
    status: Literal["belum_bayar", "lunas"] = "belum_bayar"
    cara_bayar: Optional[Literal["tunai", "non_tunai"]] = None
    bukti_bayar: Optional[str] = None
    tanggal_bayar: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BillCreate(BaseModel):
    rental_id: str
    bulan: int
    tahun: int
    jumlah: float
    tipe: Literal["sewa", "tambahan"] = "sewa"
    keterangan: Optional[str] = None

class Maintenance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lokasi: str
    room_id: Optional[str] = None
    deskripsi: str
    petugas: Optional[str] = None
    status: Literal["dibuka", "dikerjakan", "selesai"] = "dibuka"
    biaya: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MaintenanceCreate(BaseModel):
    lokasi: str
    room_id: Optional[str] = None
    deskripsi: str

class MaintenanceUpdate(BaseModel):
    petugas: Optional[str] = None
    status: Optional[Literal["dibuka", "dikerjakan", "selesai"]] = None
    biaya: Optional[float] = None

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tipe: Literal["pemasukan", "pengeluaran"]
    jumlah: float
    sumber: str
    kategori: str
    tanggal: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionCreate(BaseModel):
    tipe: Literal["pemasukan", "pengeluaran"]
    jumlah: float
    sumber: str
    kategori: str

class DashboardStats(BaseModel):
    jumlah_kamar_terisi: int
    jumlah_kamar_kosong: int
    jumlah_tagihan_belum_bayar: int
    pemasukan_bulan_ini: float
    jumlah_laporan_kerusakan: int
    tagihan_belum_bayar: List[dict]
    kamar_kosong: List[dict]

# ==================== AUTH HELPERS ====================

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user is None:
        raise credentials_exception
    return User(**user)

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=User)
async def register(user_input: UserCreate):
    existing_user = await db.users.find_one({"email": user_input.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user_input.password)
    user_dict = user_input.model_dump()
    user_obj = User(email=user_dict["email"], role=user_dict["role"])
    
    doc = user_obj.model_dump()
    doc['password'] = hashed_password
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    return user_obj

@api_router.post("/auth/login", response_model=Token)
async def login(user_input: UserLogin):
    user = await db.users.find_one({"email": user_input.email}, {"_id": 0})
    if not user or not verify_password(user_input.password, user['password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(data={"sub": user['email']})
    user_obj = User(**user)
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ==================== ROOM ENDPOINTS ====================

@api_router.post("/rooms", response_model=Room)
async def create_room(room_input: RoomCreate, current_user: User = Depends(require_admin)):
    existing = await db.rooms.find_one({"nomor_kamar": room_input.nomor_kamar}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Nomor kamar sudah ada")
    
    room_dict = room_input.model_dump()
    room_obj = Room(**room_dict)
    doc = room_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.rooms.insert_one(doc)
    return room_obj

@api_router.get("/rooms", response_model=List[Room])
async def get_rooms(current_user: User = Depends(get_current_user)):
    rooms = await db.rooms.find({}, {"_id": 0}).to_list(1000)
    for room in rooms:
        if isinstance(room['created_at'], str):
            room['created_at'] = datetime.fromisoformat(room['created_at'])
    return rooms

@api_router.get("/rooms/{room_id}", response_model=Room)
async def get_room(room_id: str, current_user: User = Depends(get_current_user)):
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Kamar tidak ditemukan")
    if isinstance(room['created_at'], str):
        room['created_at'] = datetime.fromisoformat(room['created_at'])
    return Room(**room)

@api_router.put("/rooms/{room_id}", response_model=Room)
async def update_room(room_id: str, room_input: RoomUpdate, current_user: User = Depends(require_admin)):
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Kamar tidak ditemukan")
    
    update_data = {k: v for k, v in room_input.model_dump().items() if v is not None}
    if update_data:
        await db.rooms.update_one({"id": room_id}, {"$set": update_data})
    
    updated_room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if isinstance(updated_room['created_at'], str):
        updated_room['created_at'] = datetime.fromisoformat(updated_room['created_at'])
    return Room(**updated_room)

@api_router.delete("/rooms/{room_id}")
async def delete_room(room_id: str, current_user: User = Depends(require_admin)):
    active_rental = await db.rentals.find_one({"room_id": room_id, "status": "aktif"}, {"_id": 0})
    if active_rental:
        raise HTTPException(status_code=400, detail="Tidak bisa hapus kamar yang sedang disewa")
    
    result = await db.rooms.delete_one({"id": room_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kamar tidak ditemukan")
    return {"message": "Kamar berhasil dihapus"}

# ==================== TENANT ENDPOINTS ====================

@api_router.post("/tenants", response_model=Tenant)
async def create_tenant(tenant_input: TenantCreate, current_user: User = Depends(require_admin)):
    tenant_dict = tenant_input.model_dump()
    tenant_obj = Tenant(**tenant_dict)
    doc = tenant_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.tenants.insert_one(doc)
    return tenant_obj

@api_router.get("/tenants", response_model=List[Tenant])
async def get_tenants(current_user: User = Depends(get_current_user)):
    tenants = await db.tenants.find({}, {"_id": 0}).to_list(1000)
    for tenant in tenants:
        if isinstance(tenant['created_at'], str):
            tenant['created_at'] = datetime.fromisoformat(tenant['created_at'])
    return tenants

@api_router.get("/tenants/{tenant_id}", response_model=Tenant)
async def get_tenant(tenant_id: str, current_user: User = Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Penghuni tidak ditemukan")
    if isinstance(tenant['created_at'], str):
        tenant['created_at'] = datetime.fromisoformat(tenant['created_at'])
    return Tenant(**tenant)

@api_router.put("/tenants/{tenant_id}", response_model=Tenant)
async def update_tenant(tenant_id: str, tenant_input: TenantUpdate, current_user: User = Depends(require_admin)):
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Penghuni tidak ditemukan")
    
    update_data = {k: v for k, v in tenant_input.model_dump().items() if v is not None}
    if update_data:
        await db.tenants.update_one({"id": tenant_id}, {"$set": update_data})
    
    updated_tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if isinstance(updated_tenant['created_at'], str):
        updated_tenant['created_at'] = datetime.fromisoformat(updated_tenant['created_at'])
    return Tenant(**updated_tenant)

@api_router.delete("/tenants/{tenant_id}")
async def delete_tenant(tenant_id: str, current_user: User = Depends(require_admin)):
    active_rental = await db.rentals.find_one({"tenant_id": tenant_id, "status": "aktif"}, {"_id": 0})
    if active_rental:
        raise HTTPException(status_code=400, detail="Tidak bisa hapus penghuni yang sedang menyewa")
    
    result = await db.tenants.delete_one({"id": tenant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Penghuni tidak ditemukan")
    return {"message": "Penghuni berhasil dihapus"}

# ==================== RENTAL ENDPOINTS ====================

@api_router.post("/rentals", response_model=Rental)
async def create_rental(rental_input: RentalCreate, current_user: User = Depends(require_admin)):
    room = await db.rooms.find_one({"id": rental_input.room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Kamar tidak ditemukan")
    
    active_rental = await db.rentals.find_one({"room_id": rental_input.room_id, "status": "aktif"}, {"_id": 0})
    if active_rental:
        raise HTTPException(status_code=400, detail="Kamar sudah disewa")
    
    tenant_id = rental_input.tenant_id
    
    if rental_input.tenant and not tenant_id:
        tenant_obj = Tenant(**rental_input.tenant.model_dump())
        tenant_doc = tenant_obj.model_dump()
        tenant_doc['created_at'] = tenant_doc['created_at'].isoformat()
        await db.tenants.insert_one(tenant_doc)
        tenant_id = tenant_obj.id
    
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID atau data tenant baru harus diisi")
    
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Penghuni tidak ditemukan")
    
    tanggal_mulai = rental_input.tanggal_mulai or datetime.now(timezone.utc)
    
    rental_obj = Rental(
        tenant_id=tenant_id,
        room_id=rental_input.room_id,
        tanggal_mulai=tanggal_mulai,
        harga=rental_input.harga
    )
    
    doc = rental_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['tanggal_mulai'] = doc['tanggal_mulai'].isoformat()
    
    await db.rentals.insert_one(doc)
    await db.rooms.update_one({"id": rental_input.room_id}, {"$set": {"status": "terisi"}})
    
    # Auto-generate tagihan bulan pertama
    start_month = tanggal_mulai.month
    start_year = tanggal_mulai.year
    
    bill = Bill(
        rental_id=rental_obj.id,
        bulan=start_month,
        tahun=start_year,
        jumlah=rental_input.harga,
        tipe="sewa"
    )
    bill_doc = bill.model_dump()
    bill_doc['created_at'] = bill_doc['created_at'].isoformat()
    await db.bills.insert_one(bill_doc)
    
    return rental_obj

@api_router.get("/rentals", response_model=List[Rental])
async def get_rentals(current_user: User = Depends(get_current_user)):
    rentals = await db.rentals.find({}, {"_id": 0}).to_list(1000)
    for rental in rentals:
        if isinstance(rental['created_at'], str):
            rental['created_at'] = datetime.fromisoformat(rental['created_at'])
        if isinstance(rental['tanggal_mulai'], str):
            rental['tanggal_mulai'] = datetime.fromisoformat(rental['tanggal_mulai'])
    return rentals

@api_router.get("/rentals/{rental_id}", response_model=Rental)
async def get_rental(rental_id: str, current_user: User = Depends(get_current_user)):
    rental = await db.rentals.find_one({"id": rental_id}, {"_id": 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Data sewa tidak ditemukan")
    if isinstance(rental['created_at'], str):
        rental['created_at'] = datetime.fromisoformat(rental['created_at'])
    if isinstance(rental['tanggal_mulai'], str):
        rental['tanggal_mulai'] = datetime.fromisoformat(rental['tanggal_mulai'])
    return Rental(**rental)

@api_router.post("/rentals/{rental_id}/end")
async def end_rental(rental_id: str, current_user: User = Depends(require_admin)):
    rental = await db.rentals.find_one({"id": rental_id}, {"_id": 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Data sewa tidak ditemukan")
    
    if rental['status'] == "selesai":
        raise HTTPException(status_code=400, detail="Sewa sudah selesai")
    
    await db.rentals.update_one({"id": rental_id}, {"$set": {"status": "selesai"}})
    await db.rooms.update_one({"id": rental['room_id']}, {"$set": {"status": "kosong"}})
    
    return {"message": "Sewa berhasil diakhiri"}

# ==================== BILL ENDPOINTS ====================

@api_router.post("/bills/generate-monthly")
async def generate_monthly_bills(current_user: User = Depends(require_admin)):
    now = datetime.now(timezone.utc)
    current_month = now.month
    current_year = now.year
    
    active_rentals = await db.rentals.find({"status": "aktif"}, {"_id": 0}).to_list(1000)
    
    created_count = 0
    for rental in active_rentals:
        existing_bill = await db.bills.find_one({
            "rental_id": rental['id'],
            "bulan": current_month,
            "tahun": current_year,
            "tipe": "sewa"
        }, {"_id": 0})
        
        if not existing_bill:
            bill = Bill(
                rental_id=rental['id'],
                bulan=current_month,
                tahun=current_year,
                jumlah=rental['harga'],
                tipe="sewa"
            )
            bill_doc = bill.model_dump()
            bill_doc['created_at'] = bill_doc['created_at'].isoformat()
            await db.bills.insert_one(bill_doc)
            created_count += 1
    
    return {"message": f"Berhasil membuat {created_count} tagihan", "count": created_count}

@api_router.post("/bills", response_model=Bill)
async def create_bill(bill_input: BillCreate, current_user: User = Depends(require_admin)):
    rental = await db.rentals.find_one({"id": bill_input.rental_id}, {"_id": 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Data sewa tidak ditemukan")
    
    existing_bill = await db.bills.find_one({
        "rental_id": bill_input.rental_id,
        "bulan": bill_input.bulan,
        "tahun": bill_input.tahun,
        "tipe": bill_input.tipe
    }, {"_id": 0})
    if existing_bill:
        raise HTTPException(status_code=400, detail="Tagihan untuk periode ini sudah ada")
    
    bill_dict = bill_input.model_dump()
    bill_obj = Bill(**bill_dict)
    doc = bill_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.bills.insert_one(doc)
    return bill_obj

@api_router.get("/bills", response_model=List[Bill])
async def get_bills(current_user: User = Depends(get_current_user)):
    bills = await db.bills.find({}, {"_id": 0}).to_list(1000)
    for bill in bills:
        if isinstance(bill['created_at'], str):
            bill['created_at'] = datetime.fromisoformat(bill['created_at'])
        if bill.get('tanggal_bayar') and isinstance(bill['tanggal_bayar'], str):
            bill['tanggal_bayar'] = datetime.fromisoformat(bill['tanggal_bayar'])
    return bills

@api_router.get("/bills/{bill_id}", response_model=Bill)
async def get_bill(bill_id: str, current_user: User = Depends(get_current_user)):
    bill = await db.bills.find_one({"id": bill_id}, {"_id": 0})
    if not bill:
        raise HTTPException(status_code=404, detail="Tagihan tidak ditemukan")
    if isinstance(bill['created_at'], str):
        bill['created_at'] = datetime.fromisoformat(bill['created_at'])
    if bill.get('tanggal_bayar') and isinstance(bill['tanggal_bayar'], str):
        bill['tanggal_bayar'] = datetime.fromisoformat(bill['tanggal_bayar'])
    return Bill(**bill)

@api_router.post("/bills/{bill_id}/upload")
async def upload_payment_proof(bill_id: str, file: UploadFile = File(...), current_user: User = Depends(require_admin)):
    bill = await db.bills.find_one({"id": bill_id}, {"_id": 0})
    if not bill:
        raise HTTPException(status_code=404, detail="Tagihan tidak ditemukan")
    
    file_ext = file.filename.split('.')[-1]
    filename = f"{bill_id}_{uuid.uuid4()}.{file_ext}"
    file_path = UPLOADS_DIR / filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    await db.bills.update_one({"id": bill_id}, {"$set": {"bukti_bayar": filename}})
    
    return {"filename": filename, "message": "Bukti bayar berhasil diupload"}

@api_router.post("/bills/{bill_id}/mark-paid")
async def mark_bill_paid(bill_id: str, cara_bayar: Literal["tunai", "non_tunai"], current_user: User = Depends(require_admin)):
    bill = await db.bills.find_one({"id": bill_id}, {"_id": 0})
    if not bill:
        raise HTTPException(status_code=404, detail="Tagihan tidak ditemukan")
    
    if bill['status'] == "lunas":
        raise HTTPException(status_code=400, detail="Tagihan sudah lunas")
    
    now = datetime.now(timezone.utc)
    await db.bills.update_one({"id": bill_id}, {
        "$set": {
            "status": "lunas",
            "cara_bayar": cara_bayar,
            "tanggal_bayar": now.isoformat()
        }
    })
    
    rental = await db.rentals.find_one({"id": bill['rental_id']}, {"_id": 0})
    room = await db.rooms.find_one({"id": rental['room_id']}, {"_id": 0})
    tenant = await db.tenants.find_one({"id": rental['tenant_id']}, {"_id": 0})
    
    sumber = f"Pembayaran {bill.get('keterangan', 'sewa')} - {tenant['nama']} (Kamar {room['nomor_kamar']})"
    
    transaction = Transaction(
        tipe="pemasukan",
        jumlah=bill['jumlah'],
        sumber=sumber,
        kategori="sewa" if bill['tipe'] == "sewa" else "lainnya"
    )
    trans_doc = transaction.model_dump()
    trans_doc['tanggal'] = trans_doc['tanggal'].isoformat()
    await db.transactions.insert_one(trans_doc)
    
    return {"message": "Tagihan berhasil ditandai lunas"}

@api_router.get("/bills/{bill_id}/kwitansi")
async def generate_kwitansi(bill_id: str, current_user: User = Depends(get_current_user)):
    bill = await db.bills.find_one({"id": bill_id}, {"_id": 0})
    if not bill:
        raise HTTPException(status_code=404, detail="Tagihan tidak ditemukan")
    
    if bill['status'] != "lunas":
        raise HTTPException(status_code=400, detail="Kwitansi hanya untuk tagihan yang sudah lunas")
    
    rental = await db.rentals.find_one({"id": bill['rental_id']}, {"_id": 0})
    room = await db.rooms.find_one({"id": rental['room_id']}, {"_id": 0})
    tenant = await db.tenants.find_one({"id": rental['tenant_id']}, {"_id": 0})
    
    # Generate PDF
    pdf_path = UPLOADS_DIR / f"kwitansi_{bill_id}.pdf"
    c = canvas.Canvas(str(pdf_path), pagesize=A4)
    width, height = A4
    
    # Header
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(width / 2, height - 50, "KWITANSI PEMBAYARAN")
    
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(width / 2, height - 75, "SISKOSAN")
    
    # Line
    c.setStrokeColor(colors.black)
    c.setLineWidth(2)
    c.line(50, height - 90, width - 50, height - 90)
    
    # Details
    y_position = height - 130
    c.setFont("Helvetica", 11)
    
    # Left column
    details = [
        f"No. Kwitansi: KWT-{bill_id[:8].upper()}",
        f"Tanggal: {datetime.fromisoformat(bill['tanggal_bayar']).strftime('%d %B %Y')}",
        "",
        "Telah terima dari:",
        f"Nama: {tenant['nama']}",
        f"Alamat: {tenant['alamat']}",
        f"Telepon: {tenant['telepon']}",
        "",
        "Untuk pembayaran:",
        f"Sewa Kamar: {room['nomor_kamar']}",
        f"Periode: {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][bill['bulan']-1]} {bill['tahun']}",
    ]
    
    if bill.get('keterangan'):
        details.append(f"Keterangan: {bill['keterangan']}")
    
    for line in details:
        if line == "":
            y_position -= 10
        else:
            if line.startswith("Telah terima") or line.startswith("Untuk pembayaran"):
                c.setFont("Helvetica-Bold", 11)
            else:
                c.setFont("Helvetica", 11)
            c.drawString(60, y_position, line)
            y_position -= 20
    
    # Amount box
    y_position -= 10
    c.setStrokeColor(colors.black)
    c.setLineWidth(1)
    c.rect(60, y_position - 40, width - 120, 60)
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(70, y_position - 15, "Jumlah Dibayar:")
    c.setFont("Helvetica-Bold", 16)
    c.drawString(70, y_position - 35, f"Rp {bill['jumlah']:,.0f}".replace(",", "."))
    
    # Payment method
    y_position -= 80
    c.setFont("Helvetica", 10)
    cara_bayar_text = "Tunai" if bill.get('cara_bayar') == 'tunai' else "Transfer/Non Tunai"
    c.drawString(60, y_position, f"Cara Bayar: {cara_bayar_text}")
    
    # Signature
    y_position -= 60
    c.setFont("Helvetica", 10)
    c.drawString(width - 200, y_position, "Penerima,")
    
    y_position -= 60
    c.line(width - 200, y_position, width - 60, y_position)
    y_position -= 15
    c.drawString(width - 200, y_position, "(Admin)")
    
    # Footer
    c.setFont("Helvetica-Oblique", 8)
    c.setFillColor(colors.grey)
    c.drawCentredString(width / 2, 30, "Kwitansi ini sah tanpa tanda tangan dan stempel")
    c.drawCentredString(width / 2, 20, "Terima kasih atas pembayaran Anda")
    
    c.save()
    
    return FileResponse(
        path=str(pdf_path),
        media_type='application/pdf',
        filename=f"kwitansi_{tenant['nama'].replace(' ', '_')}_{bill['bulan']}_{bill['tahun']}.pdf"
    )

# ==================== MAINTENANCE ENDPOINTS ====================

@api_router.post("/maintenance", response_model=Maintenance)
async def create_maintenance(maint_input: MaintenanceCreate, current_user: User = Depends(require_admin)):
    if maint_input.room_id:
        room = await db.rooms.find_one({"id": maint_input.room_id}, {"_id": 0})
        if not room:
            raise HTTPException(status_code=404, detail="Kamar tidak ditemukan")
    
    maint_dict = maint_input.model_dump()
    maint_obj = Maintenance(**maint_dict)
    doc = maint_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.maintenance.insert_one(doc)
    
    return maint_obj

@api_router.get("/maintenance", response_model=List[Maintenance])
async def get_maintenance(current_user: User = Depends(get_current_user)):
    maintenances = await db.maintenance.find({}, {"_id": 0}).to_list(1000)
    for maint in maintenances:
        if isinstance(maint['created_at'], str):
            maint['created_at'] = datetime.fromisoformat(maint['created_at'])
        if isinstance(maint['updated_at'], str):
            maint['updated_at'] = datetime.fromisoformat(maint['updated_at'])
    return maintenances

@api_router.get("/maintenance/{maint_id}", response_model=Maintenance)
async def get_maintenance_detail(maint_id: str, current_user: User = Depends(get_current_user)):
    maint = await db.maintenance.find_one({"id": maint_id}, {"_id": 0})
    if not maint:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan")
    if isinstance(maint['created_at'], str):
        maint['created_at'] = datetime.fromisoformat(maint['created_at'])
    if isinstance(maint['updated_at'], str):
        maint['updated_at'] = datetime.fromisoformat(maint['updated_at'])
    return Maintenance(**maint)

@api_router.put("/maintenance/{maint_id}", response_model=Maintenance)
async def update_maintenance(maint_id: str, maint_input: MaintenanceUpdate, current_user: User = Depends(require_admin)):
    maint = await db.maintenance.find_one({"id": maint_id}, {"_id": 0})
    if not maint:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan")
    
    update_data = {k: v for k, v in maint_input.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    if maint_input.status == "selesai" and maint_input.biaya and maint_input.biaya > 0:
        lokasi_str = maint['lokasi']
        transaction = Transaction(
            tipe="pengeluaran",
            jumlah=maint_input.biaya,
            sumber=f"Perbaikan {lokasi_str}",
            kategori="perbaikan"
        )
        trans_doc = transaction.model_dump()
        trans_doc['tanggal'] = trans_doc['tanggal'].isoformat()
        await db.transactions.insert_one(trans_doc)
    
    if update_data:
        await db.maintenance.update_one({"id": maint_id}, {"$set": update_data})
    
    updated_maint = await db.maintenance.find_one({"id": maint_id}, {"_id": 0})
    if isinstance(updated_maint['created_at'], str):
        updated_maint['created_at'] = datetime.fromisoformat(updated_maint['created_at'])
    if isinstance(updated_maint['updated_at'], str):
        updated_maint['updated_at'] = datetime.fromisoformat(updated_maint['updated_at'])
    return Maintenance(**updated_maint)

# ==================== TRANSACTION ENDPOINTS ====================

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(trans_input: TransactionCreate, current_user: User = Depends(require_admin)):
    trans_dict = trans_input.model_dump()
    trans_obj = Transaction(**trans_dict)
    doc = trans_obj.model_dump()
    doc['tanggal'] = doc['tanggal'].isoformat()
    
    await db.transactions.insert_one(doc)
    return trans_obj

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(current_user: User = Depends(get_current_user)):
    transactions = await db.transactions.find({}, {"_id": 0}).sort("tanggal", -1).to_list(1000)
    for trans in transactions:
        if isinstance(trans['tanggal'], str):
            trans['tanggal'] = datetime.fromisoformat(trans['tanggal'])
    return transactions

@api_router.get("/transactions/summary")
async def get_transaction_summary(bulan: Optional[int] = None, tahun: Optional[int] = None, current_user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    target_month = bulan or now.month
    target_year = tahun or now.year
    
    start_date = datetime(target_year, target_month, 1, tzinfo=timezone.utc)
    last_day = monthrange(target_year, target_month)[1]
    end_date = datetime(target_year, target_month, last_day, 23, 59, 59, tzinfo=timezone.utc)
    
    transactions = await db.transactions.find({}, {"_id": 0}).to_list(1000)
    
    pemasukan = 0
    pengeluaran = 0
    
    for trans in transactions:
        trans_date = trans['tanggal']
        if isinstance(trans_date, str):
            trans_date = datetime.fromisoformat(trans_date)
        
        if start_date <= trans_date <= end_date:
            if trans['tipe'] == "pemasukan":
                pemasukan += trans['jumlah']
            else:
                pengeluaran += trans['jumlah']
    
    laba = pemasukan - pengeluaran
    
    return {
        "bulan": target_month,
        "tahun": target_year,
        "pemasukan": pemasukan,
        "pengeluaran": pengeluaran,
        "laba": laba
    }

# ==================== DASHBOARD ENDPOINTS ====================

@api_router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(current_user: User = Depends(get_current_user)):
    rooms = await db.rooms.find({}, {"_id": 0}).to_list(1000)
    jumlah_kamar_terisi = sum(1 for r in rooms if r['status'] == 'terisi')
    jumlah_kamar_kosong = sum(1 for r in rooms if r['status'] == 'kosong')
    
    bills = await db.bills.find({"status": "belum_bayar"}, {"_id": 0}).to_list(1000)
    jumlah_tagihan_belum_bayar = len(bills)
    
    now = datetime.now(timezone.utc)
    start_date = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    last_day = monthrange(now.year, now.month)[1]
    end_date = datetime(now.year, now.month, last_day, 23, 59, 59, tzinfo=timezone.utc)
    
    transactions = await db.transactions.find({"tipe": "pemasukan"}, {"_id": 0}).to_list(1000)
    pemasukan_bulan_ini = 0
    for trans in transactions:
        trans_date = trans['tanggal']
        if isinstance(trans_date, str):
            trans_date = datetime.fromisoformat(trans_date)
        if start_date <= trans_date <= end_date:
            pemasukan_bulan_ini += trans['jumlah']
    
    maintenances = await db.maintenance.find({"status": {"$ne": "selesai"}}, {"_id": 0}).to_list(1000)
    jumlah_laporan_kerusakan = len(maintenances)
    
    tagihan_belum_bayar_list = []
    for bill in bills[:10]:
        rental = await db.rentals.find_one({"id": bill['rental_id']}, {"_id": 0})
        if rental:
            tenant = await db.tenants.find_one({"id": rental['tenant_id']}, {"_id": 0})
            room = await db.rooms.find_one({"id": rental['room_id']}, {"_id": 0})
            if tenant and room:
                tagihan_belum_bayar_list.append({
                    "bill_id": bill['id'],
                    "tenant_nama": tenant['nama'],
                    "room_nomor": room['nomor_kamar'],
                    "jumlah": bill['jumlah'],
                    "bulan": bill['bulan'],
                    "tahun": bill['tahun']
                })
    
    kamar_kosong_list = []
    for room in rooms:
        if room['status'] == 'kosong':
            kamar_kosong_list.append({
                "room_id": room['id'],
                "nomor_kamar": room['nomor_kamar'],
                "harga": room['harga'],
                "fasilitas": room['fasilitas']
            })
    
    return DashboardStats(
        jumlah_kamar_terisi=jumlah_kamar_terisi,
        jumlah_kamar_kosong=jumlah_kamar_kosong,
        jumlah_tagihan_belum_bayar=jumlah_tagihan_belum_bayar,
        pemasukan_bulan_ini=pemasukan_bulan_ini,
        jumlah_laporan_kerusakan=jumlah_laporan_kerusakan,
        tagihan_belum_bayar=tagihan_belum_bayar_list,
        kamar_kosong=kamar_kosong_list
    )

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()