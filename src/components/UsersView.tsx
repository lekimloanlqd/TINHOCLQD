import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { User, Role, ClassItem } from '../types.ts';
import { UserCheck, Plus, Edit2, KeyRound, Lock, Unlock, Search, Shield, Users, GraduationCap, X, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

export const UsersView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'LPHT' as Role,
    class_id: '12A1',
    password: '123456',
    status: 'ACTIVE' as 'ACTIVE' | 'LOCKED',
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [uList, cList] = await Promise.all([api.getUsers(), api.getClasses()]);
      setUsers(uList);
      setClasses(cList);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Lỗi khi tải danh sách người dùng.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      role: 'LPHT',
      class_id: classes[0]?.id || '12A1',
      password: '123456',
      status: 'ACTIVE',
    });
    setEditingUser(null);
    setShowModal(true);
  };

  const handleOpenEdit = (u: User) => {
    setFormData({
      full_name: u.full_name,
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      class_id: u.class_id || (classes[0]?.id || '12A1'),
      password: '',
      status: u.status,
    });
    setEditingUser(u);
    setShowModal(true);
  };

  const handleResetPassword = async (u: User) => {
    const newPass = prompt(`Đặt lại mật khẩu cho ${u.full_name}:`, '123456');
    if (!newPass) return;
    try {
      const res = await api.resetPassword(u.id, newPass);
      setFeedback({ type: 'success', message: res.message });
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Lỗi đặt lại mật khẩu.' });
    }
  };

  const handleToggleLock = async (u: User) => {
    const newStatus = u.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    try {
      await api.updateUser(u.id, { status: newStatus });
      setFeedback({
        type: 'success',
        message: `Đã ${newStatus === 'LOCKED' ? 'khóa' : 'mở khóa'} tài khoản ${u.full_name}`,
      });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Lỗi cập nhật trạng thái.' });
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (u.id === 'usr-admin' || u.email.toLowerCase() === 'admin') {
      setFeedback({ type: 'error', message: 'Không thể xóa tài khoản Quản trị viên mặc định (Admin).' });
      return;
    }
    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản ${u.full_name} (${u.email})?`);
    if (!confirmed) return;

    try {
      await api.deleteUser(u.id);
      setFeedback({ type: 'success', message: `Đã xóa tài khoản ${u.full_name} thành công.` });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Lỗi khi xóa tài khoản người dùng.' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, formData);
        setFeedback({ type: 'success', message: 'Cập nhật tài khoản thành công!' });
      } else {
        await api.createUser(formData);
        setFeedback({ type: 'success', message: 'Tạo tài khoản người dùng mới thành công!' });
      }
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Lỗi khi lưu người dùng.' });
    }
  };

  const filtered = users.filter((u) => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(t) ||
      u.email.toLowerCase().includes(t) ||
      (u.class_id && u.class_id.toLowerCase().includes(t))
    );
  });

  const getRoleBadge = (role: Role, classId?: string | null) => {
    if (role === 'ADMIN') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          <Shield className="w-3 h-3 text-rose-600" />
          Quản trị viên (ADMIN)
        </span>
      );
    }
    if (role === 'CAN_BO_DOAN') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          <Users className="w-3 h-3 text-blue-600" />
          Cán bộ Đoàn
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <GraduationCap className="w-3 h-3 text-emerald-600" />
        Lớp phó học tập ({classId || 'Chưa gán'})
      </span>
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300 max-w-6xl mx-auto">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            QUẢN LÝ NGƯỜI DÙNG & PHÂN QUYỀN (RBAC)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Khu vực dành riêng cho Quản trị viên: quản lý tài khoản Admin, Cán bộ Đoàn và Lớp phó học tập
          </p>
        </div>

        <button
          id="btn-add-user"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo tài khoản mới</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs sm:text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center">
        <div className="relative w-full max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo họ tên, email, lớp phụ trách..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden text-xs"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-4">Tài khoản / Email</th>
                <th className="py-3 px-3">Số điện thoại</th>
                <th className="py-3 px-4">Vai trò (Role)</th>
                <th className="py-3 px-3 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{u.full_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                    <td className="py-3 px-3 text-slate-600">{u.phone || '-'}</td>
                    <td className="py-3 px-4">{getRoleBadge(u.role, u.class_id)}</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleResetPassword(u)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Đặt lại mật khẩu"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleLock(u)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title={u.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa'}
                        >
                          {u.status === 'ACTIVE' ? (
                            <Unlock className="w-3.5 h-3.5" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-rose-600" />
                          )}
                        </button>
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== 'usr-admin' && u.email.toLowerCase() !== 'admin' && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa tài khoản"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingUser ? 'CẬP NHẬT NGƯỜI DÙNG' : 'TẠO TÀI KHOẢN MỚI'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tài khoản / Email đăng nhập <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingUser}
                  placeholder="user@phanboichau.edu.vn hoặc SĐT"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0905xxxxxx"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vai trò hệ thống (Role) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 font-bold"
                >
                  <option value="LPHT">Lớp phó học tập (LPHT)</option>
                  <option value="CAN_BO_DOAN">Cán bộ Đoàn trường</option>
                  <option value="ADMIN">Quản trị viên (ADMIN)</option>
                </select>
              </div>

              {formData.role === 'LPHT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lớp được phân công quản lý <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 font-bold text-emerald-700"
                    required
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.class_name} (Khối {c.grade})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {editingUser ? 'Mật khẩu mới (Để trống nếu giữ nguyên)' : 'Mật khẩu ban đầu'} {!editingUser && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? 'Nhập mật khẩu mới nếu muốn đổi' : '123456'}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                  required={!editingUser}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingUser ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
