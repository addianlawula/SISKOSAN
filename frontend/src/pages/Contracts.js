import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { Plus, XCircle, Calendar, Home, User } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const Contracts = () => {
  const [contracts, setContracts] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [formData, setFormData] = useState({
    tenant_id: '',
    room_id: '',
    tanggal_mulai: '',
    tanggal_selesai: '',
    harga: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [contractsRes, roomsRes, tenantsRes] = await Promise.all([
        axios.get(`${API}/contracts`),
        axios.get(`${API}/rooms`),
        axios.get(`${API}/tenants`),
      ]);
      setContracts(contractsRes.data);
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
      ...formData,
      tanggal_mulai: new Date(formData.tanggal_mulai).toISOString(),
      tanggal_selesai: new Date(formData.tanggal_selesai).toISOString(),
      harga: parseFloat(formData.harga),
    };

    try {
      await axios.post(`${API}/contracts`, payload);
      toast.success('Kontrak berhasil dibuat dan tagihan otomatis dibuat');
      fetchData();
      handleCloseDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal membuat kontrak');
    }
  };

  const handleEndContract = async (contractId) => {
    if (!window.confirm('Yakin ingin mengakhiri kontrak ini?')) return;

    try {
      await axios.post(`${API}/contracts/${contractId}/end`);
      toast.success('Kontrak berhasil diakhiri');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal mengakhiri kontrak');
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData({
      tenant_id: '',
      room_id: '',
      tanggal_mulai: '',
      tanggal_selesai: '',
      harga: '',
    });
  };

  const getRoomName = (roomId) => {
    const room = rooms.find((r) => r.id === roomId);
    return room ? room.nomor_kamar : '-';
  };

  const getTenantName = (tenantId) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    return tenant ? tenant.nama : '-';
  };

  const availableRooms = rooms.filter((r) => r.status === 'kosong');

  if (loading) {
    return <div className="flex items-center justify-center min-h-96"><div className="text-gray-600">Loading...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kontrak Sewa</h1>
          <p className="text-gray-600 mt-1">Kelola kontrak sewa kamar</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-contract-button" className="bg-black hover:bg-gray-800">
                <Plus size={16} className="mr-2" />
                Buat Kontrak
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Buat Kontrak Baru</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="tenant_id">Penghuni</Label>
                  <Select value={formData.tenant_id} onValueChange={(value) => setFormData({ ...formData, tenant_id: value })} required>
                    <SelectTrigger data-testid="contract-tenant-select" className="mt-1">
                      <SelectValue placeholder="Pilih penghuni" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="room_id">Kamar</Label>
                  <Select value={formData.room_id} onValueChange={(value) => {
                    const room = rooms.find(r => r.id === value);
                    setFormData({ ...formData, room_id: value, harga: room ? room.harga.toString() : '' });
                  }} required>
                    <SelectTrigger data-testid="contract-room-select" className="mt-1">
                      <SelectValue placeholder="Pilih kamar" />
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

                <div>
                  <Label htmlFor="tanggal_mulai">Tanggal Mulai</Label>
                  <input
                    data-testid="contract-start-date-input"
                    id="tanggal_mulai"
                    type="date"
                    value={formData.tanggal_mulai}
                    onChange={(e) => setFormData({ ...formData, tanggal_mulai: e.target.value })}
                    required
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="tanggal_selesai">Tanggal Selesai</Label>
                  <input
                    data-testid="contract-end-date-input"
                    id="tanggal_selesai"
                    type="date"
                    value={formData.tanggal_selesai}
                    onChange={(e) => setFormData({ ...formData, tanggal_selesai: e.target.value })}
                    required
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="harga">Harga per Bulan (Rp)</Label>
                  <input
                    data-testid="contract-price-input"
                    id="harga"
                    type="number"
                    value={formData.harga}
                    onChange={(e) => setFormData({ ...formData, harga: e.target.value })}
                    placeholder="1000000"
                    required
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                    Batal
                  </Button>
                  <Button data-testid="save-contract-button" type="submit" className="flex-1 bg-black hover:bg-gray-800">
                    Simpan
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {contracts.map((contract) => (
          <Card key={contract.id} data-testid={`contract-card-${contract.id}`} className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{getTenantName(contract.tenant_id)}</h3>
                  <p className="text-sm text-gray-600">Kamar {getRoomName(contract.room_id)}</p>
                </div>
                <span className={`status-badge status-${contract.status}`}>
                  {contract.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar size={14} className="mr-2" />
                  {format(new Date(contract.tanggal_mulai), 'dd MMM yyyy', { locale: id })} - {format(new Date(contract.tanggal_selesai), 'dd MMM yyyy', { locale: id })}
                </div>
                <div className="flex items-center text-sm font-semibold text-gray-900">
                  Rp {contract.harga.toLocaleString('id-ID')}/bulan
                </div>
              </div>

              {isAdmin && contract.status === 'aktif' && (
                <Button
                  data-testid={`end-contract-${contract.id}`}
                  variant="outline"
                  size="sm"
                  onClick={() => handleEndContract(contract.id)}
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <XCircle size={14} className="mr-1" />
                  Akhiri Kontrak
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {contracts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>Belum ada kontrak</p>
        </div>
      )}
    </div>
  );
};

export default Contracts;