import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Home, Receipt, DollarSign, Wrench, ArrowUp, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);

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
    },
    {
      title: 'Tagihan Belum Bayar',
      value: stats?.jumlah_tagihan_belum_bayar || 0,
      icon: Receipt,
    },
    {
      title: 'Pemasukan Bulan Ini',
      value: `Rp ${(stats?.pemasukan_bulan_ini || 0).toLocaleString('id-ID')}`,
      icon: DollarSign,
    },
    {
      title: 'Laporan Kerusakan',
      value: stats?.jumlah_laporan_kerusakan || 0,
      icon: Wrench,
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
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <stat.icon size={24} className="text-gray-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activities */}
      <Card className="border border-gray-200">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="text-lg font-semibold">Aktivitas Terbaru</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stats?.aktivitas_terbaru && stats.aktivitas_terbaru.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {stats.aktivitas_terbaru.map((activity, index) => (
                <div
                  key={index}
                  data-testid={`activity-${index}`}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {activity.tipe === 'transaksi' ? (
                        activity.jumlah > 0 ? (
                          <div className="w-8 h-8 bg-black rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                            <ArrowUp size={16} className="text-white" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                            <ArrowDown size={16} className="text-gray-700" />
                          </div>
                        )
                      ) : (
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Wrench size={16} className="text-gray-700" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.deskripsi}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(activity.tanggal), 'dd MMM yyyy, HH:mm', { locale: id })}
                        </p>
                      </div>
                    </div>
                    {activity.jumlah !== undefined && (
                      <p className="text-sm font-semibold text-gray-900 ml-2">
                        Rp {activity.jumlah.toLocaleString('id-ID')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>Belum ada aktivitas</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;