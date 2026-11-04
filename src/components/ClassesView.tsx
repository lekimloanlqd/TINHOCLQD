import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { ClassItem } from '../types.ts';
import { GraduationCap, Plus, Edit2, Trash2, Search, CheckCircle2, AlertCircle, X, Users } from 'lucide-react';

export const ClassesView: React.FC = () => {
  const { isAdmin, isDoan } = useAuth();
  const canManage = isAdmin || isDoan;

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGrade, setFilterGrade] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);

  const [formData, setFormData] = useState({
    class_name: '',
    grade: 12,
    homeroom_teacher: '',
    student_count: 42,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const res = await api.getClasses();
      setClasses(res);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Không thể tải danh sách lớp.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      class_name: '',
      grade: 12,
      homeroom_teacher: '',
      student_count: 42,
      status: 'ACTIVE',
    });
    setEditingClass(null);
    setShowModal(true);
  };

  const handleOpenEdit = (c: ClassItem) => {
    setFormData({
      class_name: c.class_name,
      grade: c.grade,
      homeroom_teacher: c.homeroom_teacher || '',
      student_count: c.student_count || 40,
      status: c.status,
    });
    setEditingClass(c);
    setShowModal(true);
  };

  const handleDelete = async (c: ClassItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa/lưu trữ lớp ${c.class_name}?`)) return;
    try {
      const res = await api.deleteClass(c.id);
      setFeedback({ type: 'success', message: res.message });
      loadClasses();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Xóa lớp thất bại.' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClass) {
        await api.updateClass(editingClass.id, formData);
        setFeedback({ type: 'success', message: 'Cập nhật thông tin lớp thành công!' });
      } else {
        await api.createClass(formData);
        setFeedback({ type: 'success', message: 'Thêm lớp mới thành công!' });
      }
      setShowModal(false);
      loadClasses();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Lỗi khi lưu lớp học.' });
    }
  };

  const filtered = classes.filter((c) => {
    if (filterGrade && c.grade !== Number(filterGrade)) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        c.class_name.toLowerCase().includes(term) ||
        (c.homeroom_teacher && c.homeroom_teacher.toLowerCase().includes(term))
      );
    }
    return true;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            {canManage ? 'QUẢN LÝ LỚP HỌC' : 'DANH SÁCH LỚP HỌC'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Thông tin các lớp học, khối, giáo viên chủ nhiệm và sĩ số học sinh
          </p>
        </div>

        {canManage && (
          <button
            id="btn-add-class"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm lớp mới</span>
          </button>
        )}
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

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
          <span className="font-semibold text-slate-600">Khối:</span>
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
          >
            <option value="">Tất cả khối</option>
            <option value="12">Khối 12</option>
            <option value="11">Khối 11</option>
            <option value="10">Khối 10</option>
          </select>
        </div>

        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo tên lớp, giáo viên chủ nhiệm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden text-xs"
          />
        </div>
      </div>

      {/* Classes Grid / Table */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-200 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-extrabold text-base flex items-center justify-center border border-blue-100">
                    {c.class_name}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{c.class_name}</h3>
                    <span className="text-[11px] font-semibold text-blue-600">
                      Khối {c.grade} • Năm học {c.school_year}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    c.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {c.status === 'ACTIVE' ? 'Hoạt động' : 'Lưu trữ'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">GV Chủ nhiệm:</span>
                  <span className="font-semibold text-slate-800">
                    {c.homeroom_teacher || 'Chưa phân công'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Sĩ số học sinh:</span>
                  <span className="font-semibold text-slate-800">{c.student_count} em</span>
                </div>
              </div>
            </div>

            {canManage && (
              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(c)}
                  className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Sửa</span>
                </button>
                <button
                  onClick={() => handleDelete(c)}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal Add / Edit Class */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingClass ? 'CẬP NHẬT THÔNG TIN LỚP HỌC' : 'THÊM LỚP HỌC MỚI'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên lớp (ví dụ: 12A1, 11/1, 10/2) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.class_name}
                  onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                  disabled={!!editingClass}
                  placeholder="12A1"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Khối <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={12}>Khối 12</option>
                    <option value={11}>Khối 11</option>
                    <option value={10}>Khối 10</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sĩ số học sinh
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={formData.student_count}
                    onChange={(e) => setFormData({ ...formData, student_count: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Giáo viên chủ nhiệm
                </label>
                <input
                  type="text"
                  placeholder="Thầy/Cô Nguyễn Văn A"
                  value={formData.homeroom_teacher}
                  onChange={(e) => setFormData({ ...formData, homeroom_teacher: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="INACTIVE">Lưu trữ / Vô hiệu hóa</option>
                </select>
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
                  {editingClass ? 'Lưu cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
