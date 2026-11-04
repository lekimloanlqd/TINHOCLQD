import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { SubjectItem } from '../types.ts';
import { BookMarked, Plus, Edit2, Trash2, Search, CheckCircle2, AlertCircle, X } from 'lucide-react';

export const SubjectsView: React.FC = () => {
  const { isAdmin, isDoan } = useAuth();
  const canManage = isAdmin || isDoan;

  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);

  const [formData, setFormData] = useState({
    subject_code: '',
    subject_name: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const res = await api.getSubjects();
      setSubjects(res);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Không thể tải danh sách môn học.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      subject_code: '',
      subject_name: '',
      status: 'ACTIVE',
    });
    setEditingSubject(null);
    setShowModal(true);
  };

  const handleOpenEdit = (s: SubjectItem) => {
    setFormData({
      subject_code: s.subject_code,
      subject_name: s.subject_name,
      status: s.status,
    });
    setEditingSubject(s);
    setShowModal(true);
  };

  const handleDelete = async (s: SubjectItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn vô hiệu hóa môn ${s.subject_name}?`)) return;
    try {
      const res = await api.deleteSubject(s.id);
      setFeedback({ type: 'success', message: res.message });
      loadSubjects();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Thao tác thất bại.' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSubject) {
        await api.updateSubject(editingSubject.id, formData);
        setFeedback({ type: 'success', message: 'Cập nhật môn học thành công!' });
      } else {
        await api.createSubject(formData);
        setFeedback({ type: 'success', message: 'Thêm môn học mới thành công!' });
      }
      setShowModal(false);
      loadSubjects();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Lỗi khi lưu môn học.' });
    }
  };

  const filtered = subjects.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return s.subject_name.toLowerCase().includes(term) || s.subject_code.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-blue-600" />
            {canManage ? 'QUẢN LÝ MÔN HỌC' : 'DANH SÁCH MÔN HỌC'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Danh mục các môn học giảng dạy và phát sinh điểm tiết Sổ đầu bài
          </p>
        </div>

        {canManage && (
          <button
            id="btn-add-subject"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm môn học</span>
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

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center">
        <div className="relative w-full max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm kiếm môn học theo tên hoặc mã môn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden text-xs"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((s) => (
          <div
            key={s.id}
            className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-200 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                  {s.subject_code}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    s.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {s.status === 'ACTIVE' ? 'Đang dạy' : 'Vô hiệu hóa'}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm mt-1">{s.subject_name}</h3>
            </div>

            {canManage && (
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-end gap-1.5">
                <button
                  onClick={() => handleOpenEdit(s)}
                  className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Sửa</span>
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Vô hiệu hóa</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingSubject ? 'CẬP NHẬT MÔN HỌC' : 'THÊM MÔN HỌC MỚI'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã môn (ví dụ: TOAN, VAN, ANH, TIN) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.subject_code}
                  onChange={(e) => setFormData({ ...formData, subject_code: e.target.value.toUpperCase() })}
                  disabled={!!editingSubject}
                  placeholder="TOAN"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 font-mono font-bold uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên môn học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.subject_name}
                  onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                  placeholder="Toán học"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 font-semibold"
                  required
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
                  <option value="INACTIVE">Vô hiệu hóa</option>
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
                  {editingSubject ? 'Lưu cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
