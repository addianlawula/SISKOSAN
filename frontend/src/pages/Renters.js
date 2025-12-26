import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { Plus, XCircle, Calendar, Home, User, Phone, Mail, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const Renters = () => {
  const [rentals, setRentals] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const isAdmin = user?.role === 'admin';

  const [useExistingTenant, setUseExistingTenant] = useState(false);
  const [formData, setFormData] = useState({
    room_id: location.state?.selectedRoomId || '',
    harga: '',
    tanggal_mulai: new Date().toISOString().split('T')[0],
    tenant_id: '',
    // New tenant data
    nama: '',
    telepon: '',
    email: '',
    ktp: '',
    alamat: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (location.state?.selectedRoomId) {
      const room = rooms.find(r => r.id === location.state.selectedRoomId);
      if (room) {
        setFormData(prev => ({ ...prev, room_id: room.id, harga: room.harga.toString() }));
        setDialogOpen(true);
      }
    }
  }, [location.state, rooms]);

  const fetchData = async () => {
    try {
      const [rentalsRes, roomsRes, tenantsRes] = await Promise.all([
        axios.get(`${API}/rentals`),
        axios.get(`${API}/rooms`),
        axios.get(`${API}/tenants`),
      ]);
      setRentals(rentalsRes.data);
      setRooms(roomsRes.data);
      setTenants(tenantsRes.data);
    } catch (error) {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      room_id: formData.room_id,
      harga: parseFloat(formData.harga),
      tanggal_mulai: new Date(formData.tanggal_mulai).toISOString(),
    };

    if (useExistingTenant) {
      payload.tenant_id = formData.tenant_id;
    } else {
      payload.tenant = {
        nama: formData.nama,
        telepon: formData.telepon,
        email: formData.email || undefined,
        ktp: formData.ktp,
        alamat: formData.alamat,
      };
    }

    try {
      await axios.post(`${API}/rentals`, payload);
      toast.success('Penyewa berhasil ditambahkan');
      fetchData();
      handleCloseDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menambahkan penyewa');
    }
  };

  const handleEndRental = async (rentalId) => {
    if (!window.confirm('Yakin ingin mengakhiri sewa ini?')) return;

    try {
      await axios.post(`${API}/rentals/${rentalId}/end`);
      toast.success('Sewa berhasil diakhiri');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal mengakhiri sewa');
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setUseExistingTenant(false);
    setFormData({
      room_id: '',
      harga: '',
      tanggal_mulai: new Date().toISOString().split('T')[0],
      tenant_id: '',
      nama: '',
      telepon: '',
      email: '',
      ktp: '',
      alamat: '',
    });
  };

  const getRoomName = (roomId) => {
    const room = rooms.find((r) => r.id === roomId);
    return room ? room.nomor_kamar : '-';
  };

  const getTenantData = (tenantId) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    return tenant || null;
  };

  const availableRooms = rooms.filter((r) => r.status === 'kosong');
  const activeRentals = rentals.filter((r) => r.status === 'aktif');
  const endedRentals = rentals.filter((r) => r.status === 'selesai');

  if (loading) {
    return <div className="flex items-center justify-center min-h-96"><div className="text-gray-600">Loading...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Penyewa</h1>
          <p className="text-gray-600 mt-1">Kelola data penyewa dan kontrak sewa</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-renter-button"className="bg-black hover:bg-gray-800">
                <Plus size={16} className="mr-2"/>
                Tambah Penyewa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tambah Penyewa Baru</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                {/* Room Selection */}
                <div>
                  <Label htmlFor=\"room_id">Pilih Kamar</Label>
                  <Select
                    value={formData.room_id}
                    onValueChange={(value) => {
                      const room = rooms.find(r => r.id === value);
                      setFormData({ ...formData, room_id: value, harga: room ? room.harga.toString() : '' });
                    }}
                    required
                  >
                    <SelectTrigger data-testid="rental-room-select"className="mt-1">
                      <SelectValue placeholder=\"Pilih kamar"/>
                    </SelectTrigger>
                    <SelectContent>
                      {availableRooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          Kamar {room.nomor_kamar} - Rp {room.harga.toLocaleString('id-ID')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price */}
                <div>
                  <Label htmlFor=\"harga">Harga per Bulan (Rp)</Label>
                  <Input
                    data-testid="rental-price-input\"
                    id=\"harga\"
                    type=\"number\"
                    value={formData.harga}
                    onChange={(e) => setFormData({ ...formData, harga: e.target.value })}
                    placeholder=\"1000000\"
                    required
                    className="mt-1\"
                  />
                </div>

                {/* Start Date */}
                <div>
                  <Label htmlFor=\"tanggal_mulai">Tanggal Mulai</Label>
                  <input
                    data-testid="rental-start-date-input\"
                    id=\"tanggal_mulai\"
                    type=\"date\"
                    value={formData.tanggal_mulai}
                    onChange={(e) => setFormData({ ...formData, tanggal_mulai: e.target.value })}
                    required
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm\"
                  />
                </div>

                {/* Tenant Selection Mode */}
                <div className="border-t pt-4">
                  <div className="flex items-center space-x-4 mb-4">
                    <Button
                      type=\"button\"
                      variant={!useExistingTenant ? \"default": \"outline\"}
                      onClick={() => setUseExistingTenant(false)}
                      className={!useExistingTenant ? \"bg-black": \"\"}
                    >
                      Penyewa Baru
                    </Button>
                    <Button
                      type=\"button\"
                      variant={useExistingTenant ? \"default": \"outline\"}
                      onClick={() => setUseExistingTenant(true)}
                      className={useExistingTenant ? \"bg-black": \"\"}
                    >
                      Pilih Penyewa Lama
                    </Button>
                  </div>

                  {useExistingTenant ? (
                    <div>
                      <Label htmlFor=\"tenant_id">Pilih Penyewa</Label>
                      <Select
                        value={formData.tenant_id}
                        onValueChange={(value) => setFormData({ ...formData, tenant_id: value })}
                        required
                      >
                        <SelectTrigger data-testid="existing-tenant-select"className="mt-1">
                          <SelectValue placeholder=\"Pilih penyewa"/>
                        </SelectTrigger>
                        <SelectContent>
                          {tenants.map((tenant) => (
                            <SelectItem key={tenant.id} value={tenant.id}>
                              {tenant.nama} - {tenant.telepon}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor=\"nama">Nama Lengkap</Label>
                        <Input
                          data-testid="new-tenant-name-input\"
                          id=\"nama\"
                          value={formData.nama}
                          onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                          placeholder=\"John Doe\"
                          required
                          className="mt-1\"
                        />
                      </div>

                      <div>
                        <Label htmlFor=\"telepon">Telepon</Label>
                        <Input
                          data-testid="new-tenant-phone-input\"
                          id=\"telepon\"
                          value={formData.telepon}
                          onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                          placeholder=\"08123456789\"
                          required
                          className="mt-1\"
                        />
                      </div>

                      <div>
                        <Label htmlFor=\"email">Email (Opsional)</Label>
                        <Input
                          data-testid="new-tenant-email-input\"
                          id=\"email\"
                          type=\"email\"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder=\"john@example.com\"
                          className="mt-1\"
                        />
                      </div>

                      <div>
                        <Label htmlFor=\"ktp">Nomor KTP</Label>
                        <Input
                          data-testid="new-tenant-ktp-input\"
                          id=\"ktp\"
                          value={formData.ktp}
                          onChange={(e) => setFormData({ ...formData, ktp: e.target.value })}
                          placeholder=\"3201234567890001\"
                          required
                          className="mt-1\"
                        />
                      </div>

                      <div>
                        <Label htmlFor=\"alamat">Alamat</Label>
                        <Textarea
                          data-testid="new-tenant-address-input\"
                          id=\"alamat\"
                          value={formData.alamat}
                          onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                          placeholder=\"Jl. Contoh No. 123\"
                          required
                          className="mt-1\"
                          rows={3}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button type=\"button"variant=\"outline"onClick={handleCloseDialog} className="flex-1">
                    Batal
                  </Button>
                  <Button data-testid="save-renter-button"type=\"submit"className="flex-1 bg-black hover:bg-gray-800">
                    Simpan
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabs for Active and Ended Rentals */}
      <Tabs defaultValue=\"aktif"className="w-full">
        <TabsList>
          <TabsTrigger value=\"aktif">Aktif ({activeRentals.length})</TabsTrigger>
          <TabsTrigger value=\"selesai">Riwayat ({endedRentals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value=\"aktif"className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeRentals.map((rental) => {
              const tenant = getTenantData(rental.tenant_id);
              if (!tenant) return null;

              return (
                <Card key={rental.id} data-testid={`rental-card-${rental.id}`} className="border border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{tenant.nama}</h3>
                        <p className="text-sm text-gray-600">Kamar {getRoomName(rental.room_id)}</p>
                      </div>
                      <span className="px-3 py-1 bg-black text-white text-xs font-medium rounded-full">
                        Aktif
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar size={14} className="mr-2"/>
                        Mulai: {format(new Date(rental.tanggal_mulai), 'dd MMM yyyy', { locale: id })}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone size={14} className="mr-2"/>
                        {tenant.telepon}
                      </div>
                      {tenant.email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail size={14} className="mr-2"/>
                          {tenant.email}
                        </div>
                      )}
                      <div className="flex items-center text-sm font-semibold text-gray-900 mt-3">
                        Rp {rental.harga.toLocaleString('id-ID')}/bulan
                      </div>
                    </div>

                    {isAdmin && (
                      <Button
                        data-testid={`end-rental-${rental.id}`}
                        variant=\"outline\"
                        size=\"sm\"
                        onClick={() => handleEndRental(rental.id)}
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50\"
                      >
                        <XCircle size={14} className="mr-1"/>
                        Akhiri Sewa
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {activeRentals.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>Belum ada penyewa aktif</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value=\"selesai"className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {endedRentals.map((rental) => {
              const tenant = getTenantData(rental.tenant_id);
              if (!tenant) return null;

              return (
                <Card key={rental.id} data-testid={`ended-rental-card-${rental.id}`} className="border border-gray-200 opacity-75">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{tenant.nama}</h3>
                        <p className="text-sm text-gray-600">Kamar {getRoomName(rental.room_id)}</p>
                      </div>
                      <span className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded-full">
                        Selesai
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar size={14} className="mr-2"/>
                        {format(new Date(rental.tanggal_mulai), 'dd MMM yyyy', { locale: id })}
                      </div>
                      <div className="flex items-center text-sm font-semibold text-gray-900 mt-3">
                        Rp {rental.harga.toLocaleString('id-ID')}/bulan
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {endedRentals.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>Belum ada riwayat sewa</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Renters;
