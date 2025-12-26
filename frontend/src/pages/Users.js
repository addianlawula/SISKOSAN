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
import { Plus, Trash2, Shield, User, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'admin',
  });

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [user, navigate]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      toast.error('Gagal memuat data user');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`${API}/auth/register`, formData);
      toast.success('User berhasil ditambahkan');
      fetchUsers();
      handleCloseDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menambahkan user');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Yakin ingin menghapus user ini?')) return;

    try {
      await axios.delete(`${API}/users/${userId}`);
      toast.success('User berhasil dihapus');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menghapus user');
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData({
      email: '',
      password: '',
      role: 'admin',
    });
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'super_admin':
        return <Shield size={20} className="text-red-600" />;
      case 'admin':
        return <User size={20} className="text-blue-600" />;
      case 'owner':
        return <Eye size={20} className="text-gray-600" />;
      default:
        return <User size={20} />;
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'owner':
        return 'Owner';
      default:
        return role;
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-700';
      case 'admin':
        return 'bg-blue-100 text-blue-700';
      case 'owner':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-96"><div className="text-gray-600">Loading...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kelola User</h1>
          <p className="text-gray-600 mt-1">Tambah dan kelola user sistem</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-user-button" className="bg-black hover:bg-gray-800">
              <Plus size={16} className="mr-2" />
              Tambah User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah User Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label>Email</Label>
                <Input
                  data-testid="user-email-input"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Password</Label>
                <Input
                  data-testid="user-password-input"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min. 8 karakter"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })} required>
                  <SelectTrigger data-testid="user-role-select" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin (Full akses, tidak bisa kelola user)</SelectItem>
                    <SelectItem value="owner">Owner (Read-only semua data)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-gray-50 p-3 rounded text-xs text-gray-600">
                <p className="font-medium mb-1">Perbedaan Role:</p>
                <ul className="space-y-1">
                  <li>• <strong>Admin:</strong> Tambah, edit, hapus semua data</li>
                  <li>• <strong>Owner:</strong> Hanya lihat laporan & dashboard</li>
                </ul>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                  Batal
                </Button>
                <Button data-testid="save-user-button" type="submit" className="flex-1 bg-black hover:bg-gray-800">
                  Simpan
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => (
          <Card key={u.id} data-testid={`user-card-${u.id}`} className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getRoleIcon(u.role)}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{u.email}</h3>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getRoleBadge(u.role)}`}>
                      {getRoleLabel(u.role)}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-4">
                Dibuat: {format(new Date(u.created_at), 'dd MMM yyyy', { locale: id })}
              </p>

              {u.id !== user.id && u.role !== 'super_admin' && (
                <Button
                  data-testid={`delete-user-${u.id}`}
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(u.id)}
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 size={14} className="mr-1" />
                  Hapus User
                </Button>
              )}

              {u.id === user.id && (
                <div className="text-xs text-gray-500 text-center py-2">
                  (Akun Anda)
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>Belum ada user</p>
        </div>
      )}
    </div>
  );
};

export default Users;
