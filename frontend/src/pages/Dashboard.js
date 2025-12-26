import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Home, Receipt, DollarSign, Wrench, CheckCircle, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [caraBayar, setCaraBayar] = useState('tunai');
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats', error);
    } finally {
      setLoading(false);
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
      setPaymentDialogOpen(false);
      setSelectedBill(null);
      setCaraBayar('tunai');
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menandai tagihan lunas');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Kamar Terisi',
      value: stats?.jumlah_kamar_terisi || 0,
      icon: Home,
      color: 'black',
    },
    {
      title: 'Kamar Kosong',
      value: stats?.jumlah_kamar_kosong || 0,
      icon: Home,
      color: 'gray',
    },
    {
      title: 'Tagihan Belum Bayar',
      value: stats?.jumlah_tagihan_belum_bayar || 0,
      icon: Receipt,
      color: 'gray',
    },
    {
      title: 'Pemasukan Bulan Ini',
      value: `Rp ${(stats?.pemasukan_bulan_ini || 0).toLocaleString('id-ID')}`,
      icon: DollarSign,
      color: 'black',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Selamat datang, {user?.email}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} data-testid={`stat-card-${index}`} className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  stat.color === 'black' ? 'bg-black' : 'bg-gray-100'
                }`}>
                  <stat.icon size={24} className={stat.color === 'black' ? 'text-white' : 'text-gray-700'} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actionable Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tagihan Belum Bayar */}
        <Card className="border border-gray-200">
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Tagihan Belum Bayar</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/bills')}
                className="text-sm"
              >
                Lihat Semua
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {stats?.tagihan_belum_bayar && stats.tagihan_belum_bayar.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {stats.tagihan_belum_bayar.map((tagihan, index) => (
                  <div
                    key={index}
                    data-testid={`unpaid-bill-${index}`}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{tagihan.tenant_nama}</p>
                        <p className="text-xs text-gray-500">Kamar {tagihan.room_nomor}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        Rp {tagihan.jumlah.toLocaleString('id-ID')}
                      </p>
                    </div>
                    {isAdmin && (
                      <Button
                        data-testid={`quick-mark-paid-${index}`}
                        size="sm"
                        onClick={() => handleMarkPaid(tagihan.bill_id)}
                        className="w-full bg-black hover:bg-gray-800"
                      >
                        <CheckCircle size={14} className="mr-1" />
                        Tandai Lunas
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Receipt size={32} className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Semua tagihan sudah lunas</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kamar Kosong */}
        <Card className="border border-gray-200">
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Kamar Kosong</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/rooms')}
                className="text-sm"
              >
                Lihat Semua
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {stats?.kamar_kosong && stats.kamar_kosong.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {stats.kamar_kosong.slice(0, 5).map((kamar, index) => (
                  <div
                    key={index}
                    data-testid={`empty-room-${index}`}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Kamar {kamar.nomor_kamar}</p>
                        <p className="text-xs text-gray-500">{kamar.fasilitas}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        Rp {kamar.harga.toLocaleString('id-ID')}
                      </p>
                    </div>
                    {isAdmin && (
                      <Button
                        data-testid={`quick-add-renter-${index}`}
                        size="sm"
                        onClick={() => navigate('/renters', { state: { selectedRoomId: kamar.room_id } })}
                        className="w-full bg-black hover:bg-gray-800"
                      >
                        <UserPlus size={14} className="mr-1" />
                        Tambah Penyewa
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Home size={32} className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Semua kamar terisi</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
                onClick={confirmMarkPaid}
                className="flex-1 bg-black hover:bg-gray-800"
              >
                Konfirmasi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;