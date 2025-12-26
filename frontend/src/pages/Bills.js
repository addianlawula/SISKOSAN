import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Plus, CheckCircle, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const Bills = () => {
  const [bills, setBills] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [caraBayar, setCaraBayar] = useState('tunai');
  const [uploadFile, setUploadFile] = useState(null);
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';

  const [formData, setFormData] = useState({
    rental_id: '',
    bulan: '',
    tahun: '',
    jumlah: '',
    keterangan: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [billsRes, rentalsRes, roomsRes, tenantsRes] = await Promise.all([
        axios.get(`${API}/bills`),
        axios.get(`${API}/rentals`),
        axios.get(`${API}/rooms`),
        axios.get(`${API}/tenants`),
      ]);
      setBills(billsRes.data);
      setRentals(rentalsRes.data);
      setRooms(roomsRes.data);
      setTenants(tenantsRes.data);
    } catch (error) {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMonthly = async () => {
    setGenerating(true);
    try {
      const response = await axios.post(`${API}/bills/generate-monthly`);
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal generate tagihan');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      rental_id: formData.rental_id,
      bulan: parseInt(formData.bulan),
      tahun: parseInt(formData.tahun),
      jumlah: parseFloat(formData.jumlah),
      tipe: 'tambahan',
      keterangan: formData.keterangan,
    };

    try {
      await axios.post(`${API}/bills`, payload);
      toast.success('Tagihan tambahan berhasil dibuat');
      fetchData();
      handleCloseDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal membuat tagihan');
    }
  };

  const handleMarkPaid = async (billId) => {
    setSelectedBill(billId);
    setPaymentDialogOpen(true);
  };

  const confirmMarkPaid = async () => {
    try {
      await axios.post(`${API}/bills/${selectedBill}/mark-paid?cara_bayar=${caraBayar}`);
      toast.success('Tagihan berhasil ditandai lunas');
      
      if (caraBayar === 'non_tunai') {
        setPaymentDialogOpen(false);
        setUploadDialogOpen(true);
      } else {
        setPaymentDialogOpen(false);
        setSelectedBill(null);
        setCaraBayar('tunai');
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menandai tagihan lunas');
    }
  };

  const handleUploadProof = async () => {
    if (!uploadFile || !selectedBill) return;

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      await axios.post(`${API}/bills/${selectedBill}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Bukti bayar berhasil diupload');
      setUploadDialogOpen(false);
      setUploadFile(null);
      setSelectedBill(null);
      setCaraBayar('tunai');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal upload bukti bayar');
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData({
      rental_id: '',
      bulan: '',
      tahun: '',
      jumlah: '',
      keterangan: '',
    });
  };

  const getRentalInfo = (rentalId) => {
    const rental = rentals.find((c) => c.id === rentalId);
    if (!rental) return { tenant: '-', room: '-' };
    const tenant = tenants.find((t) => t.id === rental.tenant_id);
    const room = rooms.find((r) => r.id === rental.room_id);
    return {
      tenant: tenant ? tenant.nama : '-',
      room: room ? room.nomor_kamar : '-',
    };
  };

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const activeRentals = rentals.filter((c) => c.status === 'aktif');

  if (loading) {
    return <div className="flex items-center justify-center min-h-96"><div className="text-gray-600">Loading...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tagihan</h1>
          <p className="text-gray-600 mt-1">Kelola tagihan pembayaran sewa</p>
        </div>
        {isAdmin && (
          <div className="flex space-x-2">
            <Button
              data-testid="generate-monthly-button"
              onClick={handleGenerateMonthly}
              disabled={generating}
              className="bg-black hover:bg-gray-800"
            >
              <Zap size={16} className="mr-2" />
              {generating ? 'Generating...' : 'Generate Tagihan Bulan Ini'}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-bill-button" variant="outline">
                  <Plus size={16} className="mr-2" />
                  Tagihan Tambahan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Buat Tagihan Tambahan</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div>
                    <Label>Penyewa</Label>
                    <Select value={formData.rental_id} onValueChange={(value) => {
                      const rental = rentals.find(c => c.id === value);
                      setFormData({ ...formData, rental_id: value, jumlah: rental ? rental.harga.toString() : '' });
                    }} required>
                      <SelectTrigger data-testid="bill-rental-select" className="mt-1">
                        <SelectValue placeholder="Pilih penyewa" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeRentals.map((rental) => {
                          const info = getRentalInfo(rental.id);
                          return (
                            <SelectItem key={rental.id} value={rental.id}>
                              {info.tenant} - Kamar {info.room}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Bulan</Label>
                      <Select value={formData.bulan} onValueChange={(value) => setFormData({ ...formData, bulan: value })} required>
                        <SelectTrigger data-testid="bill-month-select" className="mt-1">
                          <SelectValue placeholder="Pilih bulan" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                            <SelectItem key={m} value={m.toString()}>
                              {monthNames[m - 1]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Tahun</Label>
                      <input
                        data-testid="bill-year-input"
                        type="number"
                        value={formData.tahun}
                        onChange={(e) => setFormData({ ...formData, tahun: e.target.value })}
                        placeholder="2025"
                        required
                        className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Jumlah (Rp)</Label>
                    <input
                      data-testid="bill-amount-input"
                      type="number"
                      value={formData.jumlah}
                      onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })}
                      placeholder="100000"
                      required
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <Label>Keterangan</Label>
                    <input
                      data-testid="bill-note-input"
                      type="text"
                      value={formData.keterangan}
                      onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                      placeholder="Contoh: Biaya listrik tambahan"
                      required
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="flex space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                      Batal
                    </Button>
                    <Button data-testid="save-bill-button" type="submit" className="flex-1 bg-black hover:bg-gray-800">
                      Simpan
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {bills.map((bill) => {
          const info = getRentalInfo(bill.rental_id);
          return (
            <Card key={bill.id} data-testid={`bill-card-${bill.id}`} className="border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{info.tenant}</h3>
                    <p className="text-sm text-gray-600">Kamar {info.room}</p>
                    {bill.tipe === 'tambahan' && (
                      <p className="text-xs text-gray-500 mt-1">Tagihan Tambahan</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    bill.status === 'lunas' ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {bill.status === 'belum_bayar' ? 'Belum Bayar' : 'Lunas'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Periode</span>
                    <span className="text-sm font-medium text-gray-900">
                      {monthNames[bill.bulan - 1]} {bill.tahun}
                    </span>
                  </div>
                  {bill.keterangan && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Keterangan</span>
                      <span className="text-sm text-gray-700">{bill.keterangan}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Jumlah</span>
                    <span className="text-sm font-semibold text-gray-900">
                      Rp {bill.jumlah.toLocaleString('id-ID')}
                    </span>
                  </div>
                  {bill.tanggal_bayar && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Dibayar</span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(bill.tanggal_bayar), 'dd MMM yyyy', { locale: id })}
                      </span>
                    </div>
                  )}
                  {bill.cara_bayar && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Cara Bayar</span>
                      <span className="text-xs text-gray-700 capitalize">{bill.cara_bayar.replace('_', ' ')}</span>
                    </div>
                  )}
                </div>

                {isAdmin && bill.status === 'belum_bayar' && (
                  <Button
                    data-testid={`mark-paid-${bill.id}`}
                    size="sm"
                    onClick={() => handleMarkPaid(bill.id)}
                    className="w-full bg-black hover:bg-gray-800"
                  >
                    <CheckCircle size={14} className="mr-1" />
                    Tandai Lunas
                  </Button>
                )}

                {bill.bukti_bayar && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <a
                      href={`${process.env.REACT_APP_BACKEND_URL}/uploads/${bill.bukti_bayar}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-600 hover:text-gray-900 underline"
                    >
                      Lihat bukti bayar
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {bills.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>Belum ada tagihan</p>
        </div>
      )}

      {/* Payment Method Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pilih Cara Bayar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="cara_bayar"
                  value="tunai"
                  checked={caraBayar === 'tunai'}
                  onChange={(e) => setCaraBayar(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Tunai</span>
              </label>
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="cara_bayar"
                  value="non_tunai"
                  checked={caraBayar === 'non_tunai'}
                  onChange={(e) => setCaraBayar(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Transfer / Non Tunai</span>
              </label>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPaymentDialogOpen(false);
                  setSelectedBill(null);
                  setCaraBayar('tunai');
                }}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                data-testid="confirm-payment-button"
                onClick={confirmMarkPaid}
                className="flex-1 bg-black hover:bg-gray-800"
              >
                Konfirmasi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Proof Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Bukti Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Pilih File (Opsional)</Label>
              <input
                data-testid="upload-proof-input"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Format: JPG, PNG, PDF (Max 5MB)</p>
            </div>
            <div className="flex space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setUploadDialogOpen(false);
                  setUploadFile(null);
                  setSelectedBill(null);
                  setCaraBayar('tunai');
                  fetchData();
                }}
                className="flex-1"
              >
                Lewati
              </Button>
              <Button
                data-testid="confirm-upload-button"
                onClick={handleUploadProof}
                disabled={!uploadFile}
                className="flex-1 bg-black hover:bg-gray-800"
              >
                Upload
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Bills;