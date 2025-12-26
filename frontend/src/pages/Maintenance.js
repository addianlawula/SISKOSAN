import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { Plus, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const Maintenance = () => {
  const [maintenances, setMaintenances] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [formData, setFormData] = useState({
    room_id: '',
    deskripsi: '',
  });

  const [updateData, setUpdateData] = useState({
    petugas: '',
    status: '',
    biaya: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [maintenancesRes, roomsRes] = await Promise.all([
        axios.get(`${API}/maintenance`),
        axios.get(`${API}/rooms`),
      ]);
      setMaintenances(maintenancesRes.data);
      setRooms(roomsRes.data);
    } catch (error) {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`${API}/maintenance`, formData);
      toast.success('Laporan perbaikan berhasil dibuat');
      fetchData();
      handleCloseDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal membuat laporan');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    const payload = {
      petugas: updateData.petugas || undefined,
      status: updateData.status || undefined,
      biaya: updateData.biaya ? parseFloat(updateData.biaya) : undefined,
    };

    try {
      await axios.put(`${API}/maintenance/${selectedMaintenance.id}`, payload);
      toast.success('Laporan berhasil diperbarui');
      fetchData();
      handleCloseUpdateDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal memperbarui laporan');
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData({
      room_id: '',
      deskripsi: '',
    });
  };

  const handleCloseUpdateDialog = () => {
    setUpdateDialogOpen(false);
    setSelectedMaintenance(null);
    setUpdateData({
      petugas: '',
      status: '',
      biaya: '',
    });
  };

  const handleEditMaintenance = (maintenance) => {
    setSelectedMaintenance(maintenance);
    setUpdateData({
      petugas: maintenance.petugas || '',
      status: maintenance.status,
      biaya: maintenance.biaya ? maintenance.biaya.toString() : '',
    });
    setUpdateDialogOpen(true);
  };

  const getRoomName = (roomId) => {
    const room = rooms.find((r) => r.id === roomId);
    return room ? room.nomor_kamar : '-';
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-96"><div className="text-gray-600">Loading...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Perbaikan</h1>
          <p className="text-gray-600 mt-1">Kelola laporan perbaikan kamar</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-maintenance-button" className="bg-black hover:bg-gray-800">
                <Plus size={16} className="mr-2" />
                Buat Laporan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Buat Laporan Perbaikan</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="room_id">Kamar</Label>
                  <Select value={formData.room_id} onValueChange={(value) => setFormData({ ...formData, room_id: value })} required>
                    <SelectTrigger data-testid="maintenance-room-select" className="mt-1">
                      <SelectValue placeholder="Pilih kamar" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          Kamar {room.nomor_kamar}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="deskripsi">Deskripsi Kerusakan</Label>
                  <Textarea
                    data-testid="maintenance-description-input"
                    id="deskripsi"
                    value={formData.deskripsi}
                    onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                    placeholder="Jelaskan kerusakan yang ditemukan..."
                    required
                    className="mt-1"
                    rows={4}
                  />
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                    Batal
                  </Button>
                  <Button data-testid="save-maintenance-button" type="submit" className="flex-1 bg-black hover:bg-gray-800">
                    Simpan
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {maintenances.map((maintenance) => (
          <Card key={maintenance.id} data-testid={`maintenance-card-${maintenance.id}`} className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Kamar {getRoomName(maintenance.room_id)}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(maintenance.created_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                  </p>
                </div>
                <span className={`status-badge status-${maintenance.status}`}>
                  {maintenance.status}
                </span>
              </div>

              <p className="text-sm text-gray-700 mb-4">{maintenance.deskripsi}</p>

              {maintenance.petugas && (
                <div className="mb-2">
                  <span className="text-xs text-gray-600">Petugas: </span>
                  <span className="text-xs font-medium text-gray-900">{maintenance.petugas}</span>
                </div>
              )}

              {maintenance.biaya > 0 && (
                <div className="mb-4">
                  <span className="text-xs text-gray-600">Biaya: </span>
                  <span className="text-sm font-semibold text-gray-900">
                    Rp {maintenance.biaya.toLocaleString('id-ID')}
                  </span>
                </div>
              )}

              {isAdmin && maintenance.status !== 'selesai' && (
                <Button
                  data-testid={`update-maintenance-${maintenance.id}`}
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditMaintenance(maintenance)}
                  className="w-full"
                >
                  <Edit size={14} className="mr-1" />
                  Update Status
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {maintenances.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>Belum ada laporan perbaikan</p>
        </div>
      )}

      {/* Update Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Laporan Perbaikan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="petugas">Petugas</Label>
              <input
                data-testid="maintenance-officer-input"
                id="petugas"
                type="text"
                value={updateData.petugas}
                onChange={(e) => setUpdateData({ ...updateData, petugas: e.target.value })}
                placeholder="Nama petugas"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={updateData.status} onValueChange={(value) => setUpdateData({ ...updateData, status: value })}>
                <SelectTrigger data-testid="maintenance-status-select" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dibuka">Dibuka</SelectItem>
                  <SelectItem value="dikerjakan">Dikerjakan</SelectItem>
                  <SelectItem value="selesai">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="biaya">Biaya (Rp)</Label>
              <input
                data-testid="maintenance-cost-input"
                id="biaya"
                type="number"
                value={updateData.biaya}
                onChange={(e) => setUpdateData({ ...updateData, biaya: e.target.value })}
                placeholder="100000"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="flex space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseUpdateDialog} className="flex-1">
                Batal
              </Button>
              <Button data-testid="update-maintenance-submit-button" type="submit" className="flex-1 bg-black hover:bg-gray-800">
                Update
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Maintenance;