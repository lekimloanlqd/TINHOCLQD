import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { LessonRecord, ClassItem, SubjectItem } from '../types.ts';
import { BarChart3, Filter, PieChart as PieIcon, Layers, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export const AnalyticsView: React.FC = () => {
  const [records, setRecords] = useState<LessonRecord[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSemester, setSelectedSemester] = useState<string>('1');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [recs, cls, subs] = await Promise.all([
          api.getRecords({ semester: selectedSemester ? Number(selectedSemester) : undefined }),
          api.getClasses(),
          api.getSubjects(),
        ]);
        setRecords(recs);
        setClasses(cls);
        setSubjects(subs);
      } catch (err) {
        console.error('Failed to load analytics data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedSemester]);

  // Compute Grade-level comparisons (10 vs 11 vs 12)
  const gradeComparison = [10, 11, 12].map((g) => {
    const classIds = classes.filter((c) => c.grade === g).map((c) => c.id);
    const recs = records.filter((r) => classIds.includes(r.class_id));
    const total = recs.length;
    const avg = total > 0 ? Number((recs.reduce((s, r) => s + r.total_score, 0) / total).toFixed(2)) : 0;
    const studyAvg = total > 0 ? Number((recs.reduce((s, r) => s + r.study_score, 0) / total).toFixed(2)) : 0;
    const discAvg = total > 0 ? Number((recs.reduce((s, r) => s + r.discipline_score, 0) / total).toFixed(2)) : 0;
    const hygAvg = total > 0 ? Number((recs.reduce((s, r) => s + r.hygiene_score, 0) / total).toFixed(2)) : 0;
    const attAvg = total > 0 ? Number((recs.reduce((s, r) => s + r.attendance_score, 0) / total).toFixed(2)) : 0;

    return {
      grade: `Khối ${g}`,
      totalPeriods: total,
      avgScore: avg,
      studyAvg,
      discAvg,
      hygAvg,
      attAvg,
    };
  });

  // Compute Subject-level scores
  const subjectStats = subjects.map((sub) => {
    const recs = records.filter((r) => r.subject_id === sub.id);
    const total = recs.length;
    const avg = total > 0 ? Number((recs.reduce((s, r) => s + r.total_score, 0) / total).toFixed(2)) : 0;
    const studyAvg = total > 0 ? Number((recs.reduce((s, r) => s + r.study_score, 0) / total).toFixed(2)) : 0;
    const discAvg = total > 0 ? Number((recs.reduce((s, r) => s + r.discipline_score, 0) / total).toFixed(2)) : 0;

    return {
      subject: sub.subject_code,
      name: sub.subject_name,
      total,
      avg,
      studyAvg,
      discAvg,
    };
  }).filter((s) => s.total > 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            PHÂN TÍCH CHUYÊN SÂU THI ĐUA
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            So sánh toàn diện giữa các khối lớp, môn học và từng tiêu chí thi đua
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
          <span className="font-semibold text-slate-600">Học kỳ:</span>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="bg-transparent font-semibold text-slate-800 focus:outline-hidden"
          >
            <option value="1">Học kỳ 1</option>
            <option value="2">Học kỳ 2</option>
          </select>
        </div>
      </div>

      {/* Grade Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {gradeComparison.map((gc, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-extrabold text-slate-900">{gc.grade}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                {gc.totalPeriods} tiết
              </span>
            </div>

            <div className="text-3xl font-black text-blue-600 mb-3">
              {gc.avgScore} <span className="text-xs text-slate-400 font-normal">/ 10đ</span>
            </div>

            <div className="space-y-1.5 text-xs pt-3 border-t border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">Học tập TB:</span>
                <span className="font-bold text-slate-800">{gc.studyAvg}/3.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kỉ luật TB:</span>
                <span className="font-bold text-slate-800">{gc.discAvg}/3.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vệ sinh TB:</span>
                <span className="font-bold text-slate-800">{gc.hygAvg}/2.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Chuyên cần TB:</span>
                <span className="font-bold text-slate-800">{gc.attAvg}/2.0</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart: Grade Criteria Comparison */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-1">
          SO SÁNH 4 TIÊU CHÍ GIỮA CÁC KHỐI LỚP
        </h3>
        <p className="text-xs text-slate-500 mb-4">Điểm số trung bình từng tiêu chí của Khối 10, 11 và 12</p>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gradeComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="grade" stroke="#94a3b8" fontSize={12} />
              <YAxis domain={[0, 3]} stroke="#94a3b8" fontSize={11} />
              <Tooltip formatter={(val: any) => [`${val} điểm`, '']} />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="studyAvg" name="Học tập (3đ)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="discAvg" name="Kỉ luật (3đ)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="hygAvg" name="Vệ sinh (2đ)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="attAvg" name="Chuyên cần (2đ)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart: Subject Performance */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-1">
          ĐIỂM THI ĐUA THEO MÔN HỌC
        </h3>
        <p className="text-xs text-slate-500 mb-4">Mức độ tích cực và kỉ luật của học sinh qua từng môn</p>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subjectStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis domain={[0, 10]} stroke="#94a3b8" fontSize={11} />
              <Tooltip formatter={(val: any) => [`${val} điểm`, 'Điểm TB']} />
              <Bar dataKey="avg" name="Điểm trung bình tiết học" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
