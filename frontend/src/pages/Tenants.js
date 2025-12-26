import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Mail, Phone, CreditCard } from 'lucide-react';

const Tenants = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';

  const [formData, setFormData] = useState({
    nama: '',
    telepon: '',
    email: '',
    ktp: '',
    alamat: '',
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await axios.get(`${API}/tenants`);
      setTenants(response.data);
    } catch (error) {
      toast.error('Gagal memuat data penghuni');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingTenant) {
        await axios.put(`${API}/tenants/${editingTenant.id}`, formData);
        toast.success('Penghuni berhasil diperbarui');
      } else {
        await axios.post(`${API}/tenants`, formData);
        toast.success('Penghuni berhasil ditambahkan');
      }
      fetchTenants();
      handleCloseDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menyimpan penghuni');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus penghuni ini?')) return;

    try {
      await axios.delete(`${API}/tenants/${id}`);
      toast.success('Penghuni berhasil dihapus');
      fetchTenants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menghapus penghuni');
    }
  };

  const handleEdit = (tenant) => {
    setEditingTenant(tenant);
    setFormData({
      nama: tenant.nama,
      telepon: tenant.telepon,
      email: tenant.email || '',
      ktp: tenant.ktp,
      alamat: tenant.alamat,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTenant(null);
    setFormData({
      nama: '',
      telepon: '',
      email: '',
      ktp: '',
      alamat: '',
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-96"><div className="text-gray-600">Loading...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Penghuni</h1>
          <p className="text-gray-600 mt-1">Kelola data penghuni kost</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-tenant-button" className="bg-black hover:bg-gray-800">
                <Plus size={16} className="mr-2" />
                Tambah Penghuni
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTenant ? 'Edit Penghuni' : 'Tambah Penghuni Baru'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="nama">Nama Lengkap</Label>
                  <Input
                    data-testid="tenant-name-input"
                    id="nama"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    placeholder="John Doe"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="telepon">Telepon</Label>
                  <Input
                    data-testid="tenant-phone-input"
                    id="telepon"
                    value={formData.telepon}
                    onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                    placeholder="08123456789"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email (Opsional)</Label>
                  <Input
                    data-testid="tenant-email-input"
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="ktp">Nomor KTP</Label>
                  <Input
                    data-testid="tenant-ktp-input"
                    id="ktp"
                    value={formData.ktp}
                    onChange={(e) => setFormData({ ...formData, ktp: e.target.value })}
                    placeholder="3201234567890001"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="alamat">Alamat</Label>
                  <Textarea
                    data-testid="tenant-address-input"
                    id="alamat"
                    value={formData.alamat}
                    onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                    placeholder="Jl. Contoh No. 123"
                    required
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                    Batal
                  </Button>
                  <Button data-testid="save-tenant-button" type="submit" className="flex-1 bg-black hover:bg-gray-800">
                    Simpan
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tenants.map((tenant) => (
          <Card key={tenant.id} data-testid={`tenant-card-${tenant.id}`} className="border border-gray-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">{tenant.nama}</h3>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Phone size={14} className="mr-2" />
                  {tenant.telepon}
                </div>
                {tenant.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail size={14} className="mr-2" />
                    {tenant.email}
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-600">
                  <CreditCard size={14} className="mr-2" />
                  {tenant.ktp}
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">{tenant.alamat}</p>

              {isAdmin && (
                <div className="flex space-x-2">
                  <Button
                    data-testid={`edit-tenant-${tenant.id}`}
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(tenant)}
                    className="flex-1"
                  >
                    <Pencil size={14} className="mr-1" />
                    Edit
                  </Button>
                  <Button
                    data-testid={`delete-tenant-${tenant.id}`}
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(tenant.id)}
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={14} className="mr-1" />
                    Hapus
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {tenants.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>Belum ada data penghuni</p>
        </div>
      )}
    </div>
  );
};

export default Tenants;