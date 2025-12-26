import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Plus, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [formData, setFormData] = useState({
    tipe: 'pengeluaran',
    jumlah: '',
    sumber: '',
    kategori: '',
  });

  const [newCategory, setNewCategory] = useState({
    nama: '',
    tipe: 'both',
  });

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    try {
      const [transactionsRes, summaryRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/transactions`),
        axios.get(`${API}/transactions/summary?bulan=${selectedMonth}&tahun=${selectedYear}`),
        axios.get(`${API}/categories`),
      ]);
      setTransactions(transactionsRes.data);
      setSummary(summaryRes.data);
      setCategories(categoriesRes.data);
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
      jumlah: parseFloat(formData.jumlah),
    };

    try {
      await axios.post(`${API}/transactions`, payload);
      toast.success('Transaksi berhasil ditambahkan');
      fetchData();
      handleCloseDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menambahkan transaksi');
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData({
      tipe: 'pengeluaran',
      jumlah: '',
      sumber: '',
      kategori: '',
    });
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`${API}/categories`, newCategory);
      toast.success('Kategori berhasil ditambahkan');
      
      const categoriesRes = await axios.get(`${API}/categories`);
      setCategories(categoriesRes.data);
      
      setFormData({ ...formData, kategori: newCategory.nama });
      setCategoryDialogOpen(false);
      setNewCategory({ nama: '', tipe: 'both' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menambahkan kategori');
    }
  };

  const getFilteredCategories = () => {
    return categories.filter(cat => 
      cat.tipe === formData.tipe || cat.tipe === 'both'
    );
  };

  const exportToCSV = () => {
    const headers = ['Tanggal', 'Tipe', 'Sumber', 'Kategori', 'Jumlah'];
    const rows = transactions.map((t) => [
      format(new Date(t.tanggal), 'dd/MM/yyyy HH:mm'),
      t.tipe,
      t.sumber,
      t.kategori,
      t.jumlah,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaksi-${selectedMonth}-${selectedYear}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Laporan berhasil diexport');
  };

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  if (loading) {
    return <div className="flex items-center justify-center min-h-96"><div className="text-gray-600">Loading...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Keuangan</h1>
          <p className="text-gray-600 mt-1">Kelola transaksi keuangan</p>
        </div>
        <div className="flex space-x-2">
          <Button
            data-testid="export-csv-button"
            variant="outline"
            onClick={exportToCSV}
          >
            <Download size={16} className="mr-2" />
            Export CSV
          </Button>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-transaction-button" className="bg-black hover:bg-gray-800">
                  <Plus size={16} className="mr-2" />
                  Tambah Transaksi
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Transaksi Manual</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="tipe">Tipe</Label>
                    <Select value={formData.tipe} onValueChange={(value) => setFormData({ ...formData, tipe: value })} required>
                      <SelectTrigger data-testid="transaction-type-select" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pemasukan">Pemasukan</SelectItem>
                        <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="jumlah">Jumlah (Rp)</Label>
                    <input
                      data-testid="transaction-amount-input"
                      id="jumlah"
                      type="number"
                      value={formData.jumlah}
                      onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })}
                      placeholder="100000"
                      required
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="sumber">Sumber</Label>
                    <input
                      data-testid="transaction-source-input"
                      id="sumber"
                      type="text"
                      value={formData.sumber}
                      onChange={(e) => setFormData({ ...formData, sumber: e.target.value })}
                      placeholder="Contoh: Listrik, Air, dll"
                      required
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <Label>Kategori</Label>
                    <div className="flex space-x-2 mt-1">
                      <Select 
                        value={formData.kategori} 
                        onValueChange={(value) => {
                          if (value === '__add_new__') {
                            setCategoryDialogOpen(true);
                          } else {
                            setFormData({ ...formData, kategori: value });
                          }
                        }} 
                        required
                      >
                        <SelectTrigger data-testid="transaction-category-select" className="flex-1">
                          <SelectValue placeholder="Pilih kategori" />
                        </SelectTrigger>
                        <SelectContent>
                          {getFilteredCategories().map((cat) => (
                            <SelectItem key={cat.id} value={cat.nama}>
                              {cat.nama.charAt(0).toUpperCase() + cat.nama.slice(1)}
                            </SelectItem>
                          ))}
                          <SelectItem value="__add_new__" className="text-blue-600 font-medium">
                            + Tambah Kategori Baru
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                      Batal
                    </Button>
                    <Button data-testid="save-transaction-button" type="submit" className="flex-1 bg-black hover:bg-gray-800">
                      Simpan
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary Filter */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Label>Bulan:</Label>
          <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
            <SelectTrigger data-testid="summary-month-select" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthNames.map((month, index) => (
                <SelectItem key={index} value={(index + 1).toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Label>Tahun:</Label>
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger data-testid="summary-year-select" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2023, 2024, 2025, 2026].map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card data-testid="summary-income-card" className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pemasukan</p>
                  <p className="text-2xl font-bold text-gray-900">
                    Rp {summary.pemasukan.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                  <ArrowUp size={24} className="text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="summary-expense-card" className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pengeluaran</p>
                  <p className="text-2xl font-bold text-gray-900">
                    Rp {summary.pengeluaran.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                  <ArrowDown size={24} className="text-gray-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="summary-profit-card" className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Laba</p>
                  <p className={`text-2xl font-bold ${summary.laba >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                    Rp {summary.laba.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  summary.laba >= 0 ? 'bg-black' : 'bg-red-100'
                }`}>
                  <span className={`text-lg font-bold ${
                    summary.laba >= 0 ? 'text-white' : 'text-red-600'
                  }`}>
                    {summary.laba >= 0 ? '+' : '-'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transactions List */}
      <Card className="border border-gray-200">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="text-lg font-semibold">Riwayat Transaksi</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  data-testid={`transaction-item-${transaction.id}`}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        transaction.tipe === 'pemasukan' ? 'bg-black' : 'bg-gray-200'
                      }`}>
                        {transaction.tipe === 'pemasukan' ? (
                          <ArrowUp size={16} className="text-white" />
                        ) : (
                          <ArrowDown size={16} className="text-gray-700" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{transaction.sumber}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {transaction.kategori} • {format(new Date(transaction.tanggal), 'dd MMM yyyy, HH:mm', { locale: id })}
                        </p>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold ml-2 ${
                      transaction.tipe === 'pemasukan' ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {transaction.tipe === 'pemasukan' ? '+' : '-'}Rp {transaction.jumlah.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>Belum ada transaksi</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Transactions;