import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const Rooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';

  const [formData, setFormData] = useState({
    nomor_kamar: '',
    harga: '',
    fasilitas: '',
    status: 'kosong',
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${API}/rooms`);
      setRooms(response.data);
    } catch (error) {
      toast.error('Gagal memuat data kamar');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingRoom) {
        await axios.put(`${API}/rooms/${editingRoom.id}`, formData);
        toast.success('Kamar berhasil diperbarui');
      } else {
        await axios.post(`${API}/rooms`, formData);
        toast.success('Kamar berhasil ditambahkan');
      }
      fetchRooms();
      handleCloseDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menyimpan kamar');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus kamar ini?')) return;

    try {
      await axios.delete(`${API}/rooms/${id}`);
      toast.success('Kamar berhasil dihapus');
      fetchRooms();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menghapus kamar');
    }
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setFormData({
      nomor_kamar: room.nomor_kamar,
      harga: room.harga,
      fasilitas: room.fasilitas,
      status: room.status,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRoom(null);
    setFormData({
      nomor_kamar: '',
      harga: '',
      fasilitas: '',
      status: 'kosong',
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-96"><div className="text-gray-600">Loading...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kamar</h1>
          <p className="text-gray-600 mt-1">Kelola data kamar kost</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-room-button" className="bg-black hover:bg-gray-800">
                <Plus size={16} className="mr-2" />
                Tambah Kamar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingRoom ? 'Edit Kamar' : 'Tambah Kamar Baru'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="nomor_kamar">Nomor Kamar</Label>
                  <Input
                    data-testid="room-number-input"
                    id="nomor_kamar"
                    value={formData.nomor_kamar}
                    onChange={(e) => setFormData({ ...formData, nomor_kamar: e.target.value })}
                    placeholder="A1"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="harga">Harga (Rp)</Label>
                  <Input
                    data-testid="room-price-input"
                    id="harga"
                    type="number"
                    value={formData.harga}
                    onChange={(e) => setFormData({ ...formData, harga: e.target.value })}
                    placeholder="1000000"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="fasilitas">Fasilitas</Label>
                  <Input
                    data-testid="room-facilities-input"
                    id="fasilitas"
                    value={formData.fasilitas}
                    onChange={(e) => setFormData({ ...formData, fasilitas: e.target.value })}
                    placeholder="Kamar mandi dalam, AC, WiFi"
                    required
                    className="mt-1"
                  />
                </div>

                {editingRoom && (
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger data-testid="room-status-select" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kosong">Kosong</SelectItem>
                        <SelectItem value="terisi">Terisi</SelectItem>
                        <SelectItem value="perbaikan">Perbaikan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                    Batal
                  </Button>
                  <Button data-testid="save-room-button" type="submit" className="flex-1 bg-black hover:bg-gray-800">
                    Simpan
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room) => (
          <Card key={room.id} data-testid={`room-card-${room.id}`} className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Kamar {room.nomor_kamar}</h3>
                  <p className="text-lg font-semibold text-gray-700 mt-1">
                    Rp {room.harga.toLocaleString('id-ID')}/bulan
                  </p>
                </div>
                <span className={`status-badge status-${room.status}`}>
                  {room.status}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-4">{room.fasilitas}</p>

              {isAdmin && (
                <div className="flex space-x-2">
                  <Button
                    data-testid={`edit-room-${room.id}`}
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(room)}
                    className="flex-1"
                  >
                    <Pencil size={14} className="mr-1" />
                    Edit
                  </Button>
                  <Button
                    data-testid={`delete-room-${room.id}`}
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(room.id)}
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

      {rooms.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>Belum ada data kamar</p>
        </div>
      )}
    </div>
  );
};

export default Rooms;