/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  Home, 
  Calendar, 
  Layers, 
  Settings as SettingsIcon,
  Layout as LayoutIcon,
  ChevronRight,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Printer,
  Bell,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './services/api';
import { cn } from './lib/utils';
import type { Teacher, Subject, Room, Group, Assignment, SystemSettings, Schedule } from './types';

// Mock/Initial Settings
const DEFAULT_SETTINGS: SystemSettings = {
  academicYear: '2567',
  semester: '1',
  periodsPerDay: 8,
  periodDuration: 50,
  startTime: '08:30',
  lunchPeriod: 4,
  workingDays: [0, 1, 2, 3, 4], // Mon-Fri
  globalActivities: []
};

type View = 'dashboard' | 'teachers' | 'subjects' | 'rooms' | 'groups' | 'assignments' | 'scheduler' | 'settings';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [latestSchedule, setLatestSchedule] = useState<Record<string, Schedule>>({}); // group_id -> Schedule

  const fetchData = async () => {
    try {
      const [t, s, r, g, a, sett, sched] = await Promise.all([
        api.get('teachers'),
        api.get('subjects'),
        api.get('rooms'),
        api.get('groups'),
        api.get('assignments'),
        api.getSettings(),
        api.getSchedule()
      ]);
      setTeachers(t || []);
      setSubjects(s || []);
      setRooms(r || []);
      setGroups(g || []);
      setAssignments(a || []);
      if (sett.main) setSettings(sett.main);
      if (sched) setLatestSchedule(sched);
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'หน้าแรก', icon: Home },
    { id: 'teachers', label: 'ข้อมูลครู', icon: Users },
    { id: 'subjects', label: 'รายวิชา', icon: BookOpen },
    { id: 'rooms', label: 'ห้องเรียน', icon: LayoutIcon },
    { id: 'groups', label: 'ชั้นเรียน/กลุ่ม', icon: Layers },
    { id: 'assignments', label: 'จัดภาระงาน', icon: LayoutIcon },
    { id: 'scheduler', label: 'จัดตารางสอน', icon: Calendar },
    { id: 'settings', label: 'ตั้งค่าระบบ', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-600 text-white flex flex-col no-print p-6 shrink-0 z-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shrink-0">
             <div className="w-6 h-6 bg-indigo-500 rounded-sm transform rotate-45"></div>
          </div>
          <span className="text-white font-black text-xl tracking-tighter">EduFlow</span>
        </div>
        
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={cn(
                "sidebar-item w-full",
                currentView === item.id 
                  ? "sidebar-active" 
                  : "sidebar-hover"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-4 bg-indigo-700 rounded-2xl">
          <p className="text-indigo-200 text-[10px] uppercase font-black mb-1 leading-none tracking-widest">Academic Year</p>
          <p className="text-white text-base font-bold leading-tight">{settings.academicYear} / Semester {settings.semester}</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 no-print shrink-0">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <span>Management</span>
            <ChevronRight size={14} />
            <span className="text-slate-900 font-medium capitalize">
              {navItems.find(i => i.id === currentView)?.label}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-medium">
              ปีการศึกษา {settings.academicYear} / {settings.semester}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <ViewRenderer 
                view={currentView}
                data={{ teachers, subjects, rooms, groups, assignments, settings, latestSchedule }}
                refresh={fetchData}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function ViewRenderer({ view, data, refresh }: { view: View, data: any, refresh: () => void }) {
  switch(view) {
    case 'dashboard': return <DashboardView data={data} />;
    case 'teachers': return <EntityView type="teachers" data={data.teachers} refresh={refresh} />;
    case 'subjects': return <EntityView type="subjects" data={data.subjects} refresh={refresh} />;
    case 'rooms': return <EntityView type="rooms" data={data.rooms} refresh={refresh} />;
    case 'groups': return <EntityView type="groups" data={data.groups} refresh={refresh} />;
    case 'assignments': return <AssignmentsView data={data} refresh={refresh} />;
    case 'scheduler': return <SchedulerView data={data} refresh={refresh} />;
    case 'settings': return <SettingsView settings={data.settings} refresh={refresh} />;
    default: return <div>Coming Soon</div>;
  }
}

function DashboardView({ data }: { data: any }) {
  const stats = [
    { label: 'ครูทั้งหมด', count: data.teachers.length, color: 'bg-blue-500' },
    { label: 'รายวิชา', count: data.subjects.length, color: 'bg-emerald-500' },
    { label: 'ห้องเรียน', count: data.rooms.length, color: 'bg-amber-500' },
    { label: 'ชั้นเรียน', count: data.groups.length, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white p-6 rounded-2xl border-2 border-slate-100 flex items-center justify-between shadow-sm transition-transform hover:scale-[1.02]">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-3xl font-black text-slate-900 leading-none">{s.count}</p>
            </div>
            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg", s.color)}>
              <Plus size={24} />
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <h3 className="font-bold text-lg mb-4">สถานะตารางสอนปัจจุบัน</h3>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400">
            {Object.keys(data.latestSchedule).length > 0 
              ? "พบข้อมูลตารางสอนล่าสุด" 
              : "ยังไม่มีการสร้างตารางสอนหลัก"}
          </div>
        </div>
        <div className="card p-6">
          <h3 className="font-bold text-lg mb-4">ข้อมูลเบื้องต้น</h3>
          <div className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">ปีการศึกษา</span>
              <span className="font-medium text-slate-900">{data.settings.academicYear}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">ภาคเรียน</span>
              <span className="font-medium text-slate-900">{data.settings.semester}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">จำนวนคาบ/วัน</span>
              <span className="font-medium text-slate-900">{data.settings.periodsPerDay}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">พักเที่ยงคาบที่</span>
              <span className="font-medium text-slate-900">{data.settings.lunchPeriod}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EntityView({ type, data, refresh }: { type: string, data: any[], refresh: () => void }) {
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post(type, { ...formData, id: isEditing === 'new' ? Date.now().toString() : isEditing });
    setIsEditing(null);
    setFormData({});
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ยืนยันตัวการลบ?')) return;
    await api.delete(type, id);
    refresh();
  };

  return (
    <div className="card-vibrant h-full flex flex-col overflow-hidden">
       <div className="p-8 border-b flex justify-between items-center bg-slate-50/30">
          <div>
            <h3 className="font-black text-2xl tracking-tighter text-slate-900">จัดการ{
              type === 'teachers' ? 'ข้อมูลครูผู้สอน' : 
              type === 'subjects' ? 'หลักสูตรรายวิชา' :
              type === 'rooms' ? 'ข้อมูลห้องเรียน' : 'รายชื่อชั้นเรียน'
            }</h3>
            {type === 'teachers' && <p className="text-slate-400 text-sm font-medium">จัดการบุคลากรและภาระหน้าที่</p>}
          </div>
          <button 
            onClick={() => { setIsEditing('new'); setFormData({}); }}
            className="btn-action bg-emerald-500 text-white shadow-emerald-200/50"
          >
            <Plus size={20} />
            เพิ่มข้อมูลใหม่
          </button>
       </div>
       
       <div className="p-6 flex-1 overflow-y-auto">
          <table className="w-full text-left">
            <thead className="text-xs text-slate-500 uppercase tracking-wider border-b">
              <tr>
                <th className="pb-3 px-4 font-semibold italic text-slate-400">ID</th>
                <th className="pb-3 px-4 font-semibold italic">ชื่อ/รายละเอียด</th>
                {type === 'subjects' && <th className="pb-3 px-4 font-semibold italic">คาบ/สัปดาห์</th>}
                <th className="pb-3 px-4 font-semibold italic text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition group">
                  <td className="py-3 px-4 font-mono text-[10px] text-slate-400">{item.id.toString().slice(-6)}</td>
                  <td className="py-3 px-4 text-sm font-medium">
                    <div className="flex items-center gap-2">
                       {type === 'teachers' && (
                         <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                       )}
                       {item.name}
                       {item.type && <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">{item.type}</span>}
                    </div>
                  </td>
                  {type === 'subjects' && <td className="py-3 px-4 text-sm font-mono">{item.periods_per_week}</td>}
                  <td className="py-3 px-4 text-right space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setIsEditing(item.id); setFormData(item); }} className="text-blue-600 hover:underline text-xs font-medium">แก้ไข</button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:underline text-xs font-medium">ลบ</button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">ไม่พบข้อมูล</td>
                </tr>
              )}
            </tbody>
          </table>
       </div>

       {isEditing && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSave} className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />
              <h4 className="text-xl font-bold mb-6 text-slate-800">{isEditing === 'new' ? 'เพิ่ม' : 'แก้ไข'}ข้อมูล</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">ชื่อเรียก</label>
                  <input 
                    required
                    value={formData.name || ''} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
                {type === 'subjects' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">จำนวนคาบต่อสัปดาห์</label>
                    <input 
                      type="number"
                      min="1"
                      max="40"
                      value={formData.periods_per_week || 1} 
                      onChange={e => setFormData({...formData, periods_per_week: parseInt(e.target.value)})}
                      className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
                    />
                  </div>
                )}
                 {type === 'teachers' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">สีประจำตัวครู (สำหรับการแสดงผล)</label>
                    <div className="flex gap-2">
                       <input 
                        type="color"
                        value={formData.color || '#3b82f6'} 
                        onChange={e => setFormData({...formData, color: e.target.value})}
                        className="w-14 h-12 border border-slate-200 rounded-xl p-1 outline-none cursor-pointer"
                      />
                      <input 
                        value={formData.color || '#3b82f6'} 
                        onChange={e => setFormData({...formData, color: e.target.value})}
                        className="flex-1 border border-slate-200 rounded-xl p-3 font-mono text-sm uppercase"
                      />
                    </div>
                  </div>
                )}
                {type === 'rooms' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">ประเภทห้อง</label>
                    <select 
                      value={formData.type || 'main'} 
                      onChange={e => setFormData({...formData, type: e.target.value})}
                      className="w-full border border-slate-200 rounded-xl p-3 outline-none"
                    >
                      <option value="main">ห้องหลัก</option>
                      <option value="lab">ห้องปฎิบัติการ</option>
                      <option value="hall">หอประชุม/ลานกิจกรรม</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="mt-10 flex justify-end gap-3">
                <button type="button" onClick={() => setIsEditing(null)} className="px-6 py-2.5 text-slate-500 font-bold text-sm uppercase tracking-wider">ยกเลิก</button>
                <button type="submit" className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg shadow-blue-200 hover:bg-blue-700 transition active:scale-95">บันทึก</button>
              </div>
            </form>
         </div>
       )}
    </div>
  );
}

function SettingsView({ settings, refresh }: { settings: SystemSettings, refresh: () => void }) {
  const [formData, setFormData] = useState(settings);

  const handleSave = async () => {
    await api.saveSettings('main', formData);
    refresh();
    alert('บันทึกการตั้งค่าแล้ว');
  };

  const addGlobalActivity = () => {
    const newAct = { id: Date.now().toString(), name: 'กิจกรรมใหม่', day: 0, period: 1 };
    setFormData({ ...formData, globalActivities: [...(formData.globalActivities || []), newAct] });
  };

  const removeGlobalActivity = (id: string) => {
    setFormData({ ...formData, globalActivities: formData.globalActivities.filter(a => a.id !== id) });
  };

  const updateGlobalActivity = (id: string, updates: any) => {
    setFormData({ 
      ...formData, 
      globalActivities: formData.globalActivities.map(a => a.id === id ? { ...a, ...updates } : a) 
    });
  };

  return (
    <div className="card p-10 max-w-4xl mx-auto space-y-10">
      <div className="text-center border-b border-slate-100 pb-8">
        <h3 className="text-3xl font-black text-slate-800 mb-2">ตั้งค่าระบบ</h3>
        <p className="text-slate-400 font-medium tracking-wide">โครงสร้างพื้นฐานสำหรับตารางสอน</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <div className="space-y-1">
           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">ปีการศึกษา</label>
           <input className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.academicYear} onChange={e => setFormData({...formData, academicYear: e.target.value})} />
        </div>
        <div className="space-y-1">
           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">ภาคเรียน</label>
           <input className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.semester} onChange={e => setFormData({...formData, semester: e.target.value})} />
        </div>
        <div className="space-y-1">
           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">เวลาเริ่มเรียน</label>
           <input type="time" className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
        </div>
        <div className="space-y-1">
           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">ระยะเวลาต่อคาบ (นาที)</label>
           <input type="number" className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.periodDuration} onChange={e => setFormData({...formData, periodDuration: parseInt(e.target.value)})} />
        </div>
        <div className="space-y-1">
           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">จำนวนคาบต่อวัน</label>
           <input type="number" max="12" className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.periodsPerDay} onChange={e => setFormData({...formData, periodsPerDay: parseInt(e.target.value)})} />
        </div>
        <div className="space-y-1">
           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">พักเที่ยง (คาบที่)</label>
           <input type="number" className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.lunchPeriod} onChange={e => setFormData({...formData, lunchPeriod: parseInt(e.target.value)})} />
        </div>
      </div>

      <div className="pt-8 border-t border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-xl font-bold text-slate-800">คาบกิจกรรมพร้อมกันทั้งโรงเรียน</h4>
          <button onClick={addGlobalActivity} className="btn-action bg-indigo-500 text-white shadow-none text-xs px-4 py-2">เพิ่มกิจกรรม</button>
        </div>
        
        <div className="space-y-3">
          {(formData.globalActivities || []).map(act => (
            <div key={act.id} className="flex gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <input 
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
                value={act.name}
                onChange={e => updateGlobalActivity(act.id, { name: e.target.value })}
                placeholder="ชื่อกิจกรรม (เช่น ลูกเสือ, โฮมรูม)"
              />
              <select 
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none w-32"
                value={act.day}
                onChange={e => updateGlobalActivity(act.id, { day: parseInt(e.target.value) })}
              >
                {['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'].map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
              <input 
                type="number"
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none w-20"
                value={act.period}
                onChange={e => updateGlobalActivity(act.id, { period: parseInt(e.target.value) })}
                placeholder="คาบที่"
              />
              <button onClick={() => removeGlobalActivity(act.id)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg"><Trash2 size={18} /></button>
            </div>
          ))}
          {(!formData.globalActivities || formData.globalActivities.length === 0) && (
            <p className="text-center text-slate-400 text-sm py-4 italic">ยังไม่มีกิจกรรมที่กำหนดพร้อมกัน</p>
          )}
        </div>
      </div>

      <div className="pt-8 flex justify-center">
        <button onClick={handleSave} className="bg-slate-900 text-white px-10 py-3 rounded-2xl font-bold uppercase tracking-wider flex items-center gap-3 shadow-xl hover:bg-black transition active:scale-95">
           <Save size={20} />
           บันทึกข้อมูลทั้งหมด
        </button>
      </div>
    </div>
  );
}

function AssignmentsView({ data, refresh }: { data: any, refresh: () => void }) {
  const [selectedGroup, setSelectedGroup] = useState<string>(data.groups[0]?.id || '');
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<Assignment>>({});

  const groupAssignments = data.assignments.filter((a: any) => a.group_id === selectedGroup);

  const handleSave = async () => {
    if (!formData.subject_id || !formData.teacher_id) return;
    const subject = data.subjects.find((s: any) => s.id === formData.subject_id);
    await api.post('assignments', {
      ...formData,
      id: Date.now().toString(),
      group_id: selectedGroup,
      periods_per_week: subject?.periods_per_week || 1
    });
    setIsAdding(false);
    refresh();
  };

  const handleDelete = async (id: string) => {
    await api.delete('assignments', id);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-center justify-between no-print">
        <div className="flex items-center gap-4">
           <div className="flex flex-col">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Grade / Section</label>
             <select 
              className="bg-white border-2 border-slate-100 rounded-2xl px-6 py-3 outline-none font-black text-indigo-600 min-w-[280px] shadow-sm focus:border-indigo-400 transition-all"
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
            >
              {data.groups.map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
           </div>
        </div>
        <button onClick={() => setIsAdding(true)} className="btn-action bg-indigo-600 text-white shadow-indigo-200">
          <Plus size={20} /> จัดสรรงานสอน
        </button>
      </div>

      <div className="card-vibrant h-[calc(100vh-280px)] overflow-hidden">
         <div className="p-10 overflow-y-auto h-full">
            <table className="w-full border-separate border-spacing-y-3">
               <thead className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                 <tr>
                    <th className="pb-4 text-left px-4 italic">วิชาที่สอน</th>
                    <th className="pb-4 text-left px-4 italic">ครูผู้สอน</th>
                    <th className="pb-4 text-left px-4 italic">ห้องเรียนเจาะจง</th>
                    <th className="pb-4 text-center px-4 italic">ภาระงาน (คาบ)</th>
                    <th className="pb-4 text-right px-4 italic"></th>
                 </tr>
               </thead>
               <tbody>
                  {groupAssignments.map((a: any) => {
                    const sub = data.subjects.find((s: any) => s.id === a.subject_id);
                    const tea = data.teachers.find((t: any) => t.id === a.teacher_id);
                    const rom = data.rooms.find((r: any) => r.id === a.room_id);
                    return (
                      <tr key={a.id} className="group bg-slate-50/50 hover:bg-blue-50/50 transition-colors">
                        <td className="py-4 px-4 font-bold text-slate-800 rounded-l-xl">{sub?.name}</td>
                        <td className="py-4 px-4 text-sm font-medium">
                          <div className="flex items-center gap-2.5">
                             <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ background: tea?.color }} />
                             {tea?.name}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-xs font-semibold text-slate-500 font-mono uppercase italic">{rom?.name || '---'}</td>
                        <td className="py-4 px-4 text-center">
                           <span className="bg-slate-200 text-slate-700 px-3 py-1 rounded-full text-xs font-black">{a.periods_per_week}</span>
                        </td>
                        <td className="py-4 px-4 text-right rounded-r-xl">
                          <button onClick={() => handleDelete(a.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2"><Trash2 size={18} /></button>
                        </td>
                      </tr>
                    );
                  })}
                  {groupAssignments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-32 text-center text-slate-300 flex flex-col items-center gap-4">
                         <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                            <BookOpen size={24} />
                         </div>
                         <p className="font-medium">ยังไม่มีการเพิ่มวิชาให้กับห้องเรียนนี้</p>
                      </td>
                    </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {isAdding && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-10 w-full max-w-md shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600" />
              <h4 className="text-2xl font-black mb-1 text-slate-800">จัดภาระงาน</h4>
              <p className="text-slate-400 text-sm mb-8">ห้องเรียน: <span className="text-blue-600 font-bold">{data.groups.find((g: any) => g.id === selectedGroup)?.name}</span></p>
              
              <div className="space-y-5">
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">เลือกวิชา</label>
                   <select 
                    className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 font-medium"
                    onChange={e => setFormData({...formData, subject_id: e.target.value})}
                   >
                      <option value="">-- ระบุวิชา --</option>
                      {data.subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.periods_per_week} คาบ)</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">เลือกครูผู้สอน</label>
                   <select 
                    className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 font-medium"
                    onChange={e => setFormData({...formData, teacher_id: e.target.value})}
                   >
                      <option value="">-- ระบุครู --</option>
                      {data.teachers.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ระบุห้องเรียนหลัก</label>
                   <select 
                    className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 font-medium italic"
                    value={formData.room_id || ''}
                    onChange={e => setFormData({...formData, room_id: e.target.value})}
                   >
                      <option value="">-- ห้องประจำชั้น --</option>
                      {data.rooms.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ระบุห้องเรียนสำรอง (ถ้ามี)</label>
                   <select 
                    className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 font-medium italic"
                    value={formData.backup_room_id || ''}
                    onChange={e => setFormData({...formData, backup_room_id: e.target.value})}
                   >
                      <option value="">-- ไม่มีห้องสำรอง --</option>
                      {data.rooms.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                   </select>
                </div>
              </div>
              <div className="mt-10 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2.5 text-slate-400 font-bold uppercase tracking-wider text-xs">ยกเลิก</button>
                <button onClick={handleSave} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-blue-700 active:scale-95 transition">บันทึกภาระงาน</button>
              </div>
            </div>
         </div>
      )}
    </div>
  );
}

function SchedulerView({ data, refresh }: { data: any, refresh: () => void }) {
  const [selectedGroup, setSelectedGroup] = useState<string>(data.groups[0]?.id || '');
  const [viewMode, setViewMode] = useState<'group' | 'teacher' | 'room'>('group');
  const [selectedTeacher, setSelectedTeacher] = useState<string>(data.teachers[0]?.id || '');
  const [selectedRoom, setSelectedRoom] = useState<string>(data.rooms[0]?.id || '');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [tempSchedule, setTempSchedule] = useState<Record<string, Schedule>>(data.latestSchedule || {});
  const [editingSlot, setEditingSlot] = useState<{ day: number, period: number } | null>(null);
  const [generationAlerts, setGenerationAlerts] = useState<string[]>([]);
  const [showNotification, setShowNotification] = useState(false);

  const generateSimpleSchedule = async () => {
    setIsGenerating(true);
    setGenerationAlerts([]);
    
    const newSchedule: Record<string, Schedule> = {};
    const alerts: string[] = [];
    
    // Initialize schedules
    data.groups.forEach((g: any) => {
      newSchedule[g.id] = {};
      for (let day = 0; day < 5; day++) {
        newSchedule[g.id][day] = {};
        for (let p = 1; p <= (data.settings.periodsPerDay || 8); p++) {
          newSchedule[g.id][day][p] = null;
        }
      }
    });

    const teacherUsage: Record<string, Set<string>> = {}; 
    const roomUsage: Record<string, Set<string>> = {}; 

    const shuffledGroups = [...data.groups].sort(() => Math.random() - 0.5);

    shuffledGroups.forEach(g => {
      const gAssignments = data.assignments.filter((a: any) => a.group_id === g.id);
      const tasks = gAssignments.flatMap((a: any) => Array(a.periods_per_week).fill(a)).sort(() => Math.random() - 0.5);
      
      const sched = newSchedule[g.id];
      
      tasks.forEach(task => {
        let placed = false;
        let pool = [];
        for (let d = 0; d < 5; d++) {
          for (let p = 1; p <= (data.settings.periodsPerDay || 8); p++) {
            if (p === data.settings.lunchPeriod) continue;
            
            const isGlobal = (data.settings.globalActivities || []).some((act: any) => act.day === d && act.period === p);
            if (isGlobal) continue;

            pool.push({d, p});
          }
        }
        pool.sort(() => Math.random() - 0.5);

        for (const slot of pool) {
          const timeKey = `${slot.d}_${slot.p}`;
          if (!sched[slot.d][slot.p]) {
             const busyTeachers = teacherUsage[timeKey] || new Set();
             const busyRooms = roomUsage[timeKey] || new Set();
             
             if (busyTeachers.has(task.teacher_id)) continue;

             let targetRoomId = task.room_id;
             let isBackup = false;

             if (targetRoomId && busyRooms.has(targetRoomId)) {
                if (task.backup_room_id && !busyRooms.has(task.backup_room_id)) {
                   targetRoomId = task.backup_room_id;
                   isBackup = true;
                } else {
                   continue;
                }
             }

             sched[slot.d][slot.p] = {
                assignment_id: task.id,
                teacher_id: task.teacher_id,
                room_id: targetRoomId,
                group_id: task.group_id,
                subject_id: task.subject_id,
                is_backup_room: isBackup
             };
             busyTeachers.add(task.teacher_id);
             if (targetRoomId) busyRooms.add(targetRoomId);
             teacherUsage[timeKey] = busyTeachers;
             roomUsage[timeKey] = busyRooms;
             placed = true;
             break;
          }
        }
        if (!placed) {
          const teacher = data.teachers.find((t: any) => t.id === task.teacher_id);
          const subject = data.subjects.find((s: any) => s.id === task.subject_id);
          alerts.push(`[${g.name}] ไม่สามารถจัดคาบวิชา ${subject?.name} (ครู ${teacher?.name}) ได้เนื่องจากทรัพยากรติดขัด`);
        }
      });
    });

    setTimeout(() => {
      setTempSchedule(newSchedule);
      setIsGenerating(false);
      setGenerationAlerts(alerts);
      if (alerts.length > 0) setShowNotification(true);
    }, 800);
  };

  const handleManualAssignment = (assignment_id: string | null) => {
    if (!editingSlot) return;
    
    const { day, period } = editingSlot;
    const newSchedule = { ...tempSchedule };
    const currentGroupSched = { ...newSchedule[selectedGroup] };
    
    if (!assignment_id) {
       currentGroupSched[day][period] = null;
    } else {
       const assignment = data.assignments.find((a: any) => a.id === assignment_id);
       if (assignment) {
          const conflicts = Object.keys(newSchedule).filter(gid => 
            gid !== selectedGroup && newSchedule[gid][day][period]?.teacher_id === assignment.teacher_id
          );

          if (conflicts.length > 0) {
             const groupNames = conflicts.map(id => data.groups.find((g: any) => g.id === id)?.name).join(', ');
             if (!confirm(`Warning: Teacher ${data.teachers.find((t: any) => t.id === assignment.teacher_id)?.name} is already assigned to ${groupNames} during this period. Proceed anyway?`)) {
                return;
             }
          }

          currentGroupSched[day][period] = {
             assignment_id: assignment.id,
             teacher_id: assignment.teacher_id,
             room_id: assignment.room_id,
             group_id: assignment.group_id,
             subject_id: assignment.subject_id
          };
       }
    }

    newSchedule[selectedGroup] = currentGroupSched;
    setTempSchedule(newSchedule);
    setEditingSlot(null);
  };

  const handleSaveSchedule = async () => {
    await api.saveSchedule(tempSchedule);
    refresh();
    alert('บันทึกตารางสอนหลักสำเร็จ');
  };

  const getDisplaySchedule = () => {
    const dArr = [0, 1, 2, 3, 4];
    const pArr = Array.from({ length: (data.settings.periodsPerDay || 8) }).map((_, i) => i + 1);
    
    const display: any = {};
    dArr.forEach(d => {
      display[d] = {};
      pArr.forEach(p => {
        const global = (data.settings.globalActivities || []).find((act: any) => act.day === d && act.period === p);
        if (global) {
           display[d][p] = { type: 'global', name: global.name };
           return;
        }

        if (p === data.settings.lunchPeriod) {
           display[d][p] = { type: 'break', name: 'พักกลางวัน' };
           return;
        }

        if (viewMode === 'group') {
           display[d][p] = tempSchedule[selectedGroup]?.[d]?.[p];
        } else if (viewMode === 'teacher') {
           let found = null;
           Object.keys(tempSchedule).forEach(gid => {
             const slot = tempSchedule[gid]?.[d]?.[p];
             if (slot?.teacher_id === selectedTeacher) {
               found = { ...slot, display_info: `ห้อง ${data.groups.find((g: any) => g.id === gid)?.name}` };
             }
           });
           display[d][p] = found;
        } else if (viewMode === 'room') {
           let found = null;
           Object.keys(tempSchedule).forEach(gid => {
             const slot = tempSchedule[gid]?.[d]?.[p];
             if (slot?.room_id === selectedRoom) {
               found = { ...slot, display_info: `${data.groups.find((g: any) => g.id === gid)?.name} - ครู ${data.teachers.find((t: any) => t.id === slot.teacher_id)?.name}` };
             }
           });
           display[d][p] = found;
        }
      });
    });
    return display;
  };

  const currentDisplay = getDisplaySchedule();
  const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 no-print">
        <div className="flex flex-wrap gap-4 items-end bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm">
           <div className="flex flex-col">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">สับเปลี่ยนมุมมอง</label>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                 {(['group', 'teacher', 'room'] as const).map(m => (
                   <button 
                    key={m}
                    onClick={() => setViewMode(m)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all",
                      viewMode === m ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                   >
                     {m === 'group' ? 'รายห้อง' : m === 'teacher' ? 'รายครู' : 'รายห้องเรียน'}
                   </button>
                 ))}
              </div>
           </div>

           {viewMode === 'group' && (
             <div className="flex flex-col">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">เลือกชั้นเรียน</label>
               <select className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none w-48" value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
                 {data.groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
               </select>
             </div>
           )}

           {viewMode === 'teacher' && (
             <div className="flex flex-col">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">เลือกครูผู้สอน</label>
               <select className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none w-48" value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}>
                 {data.teachers.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
               </select>
             </div>
           )}

           {viewMode === 'room' && (
             <div className="flex flex-col">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">เลือกห้องเรียน</label>
               <select className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none w-48" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>
                 {data.rooms.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
               </select>
             </div>
           )}

           <div className="ml-auto flex gap-3">
             <button onClick={generateSimpleSchedule} className="btn-action bg-rose-500 text-white text-xs px-6 py-2.5 shadow-rose-100">
               <RotateCcw size={16} className={isGenerating ? 'animate-spin' : ''} /> สร้างตารางอัตโนมัติ
             </button>
             <button onClick={handleSaveSchedule} className="btn-action bg-emerald-500 text-white text-xs px-6 py-2.5 shadow-emerald-100">
                <Save size={16} /> บันทึกตาราง
             </button>
             <button onClick={() => window.print()} className="btn-action bg-white text-slate-700 border border-slate-200 text-xs px-6 py-2.5 shadow-none">
                <Printer size={16} /> พิมพ์/PDF
             </button>
           </div>
        </div>
      </div>

      <div className="print-area card-vibrant p-10 min-h-[850px] relative overflow-hidden flex flex-col">
         <div className="absolute top-0 left-0 w-full h-3 bg-indigo-600 no-print" />
         
         <div className="mb-12 flex justify-between items-end">
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                 {viewMode === 'group' ? `ตารางสอนห้อง ${data.groups.find((g: any) => g.id === selectedGroup)?.name}` : 
                  viewMode === 'teacher' ? `ตารางสอนครู ${data.teachers.find((t: any) => t.id === selectedTeacher)?.name}` : 
                  `ตารางการใช้ห้อง ${data.rooms.find((r: any) => r.id === selectedRoom)?.name}`}
              </h2>
              <p className="text-slate-500 font-bold bg-slate-100 px-4 py-1.5 rounded-full inline-block uppercase text-[10px] tracking-widest">
                ปีการศึกษา {data.settings.academicYear} • ภาคเรียน {data.settings.semester}
              </p>
            </div>
            
            <div className="flex items-center gap-4 no-print relative">
               {generationAlerts.length > 0 && (
                 <button 
                  onClick={() => setShowNotification(!showNotification)}
                  className="w-10 h-10 bg-rose-50 border-2 border-rose-200 rounded-xl flex items-center justify-center text-rose-500 relative transition-transform active:scale-95"
                 >
                    <Bell size={18} />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                      {generationAlerts.length}
                    </span>
                    
                    {showNotification && (
                      <div className="absolute top-full right-0 mt-3 w-80 bg-white border-2 border-slate-100 rounded-[28px] shadow-2xl p-7 z-[60] cursor-default text-left">
                        <div className="flex justify-between items-center mb-5">
                           <div className="flex items-center gap-2">
                             <AlertCircle size={16} className="text-rose-500" />
                             <h4 className="font-black text-xs uppercase tracking-widest text-slate-800">System Alerts</h4>
                           </div>
                           <button onClick={() => setShowNotification(false)} className="text-slate-300 hover:text-slate-500 transition-colors">×</button>
                        </div>
                        <div className="space-y-4 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                           {generationAlerts.map((alert, idx) => (
                             <div key={idx} className="p-4 bg-slate-50 rounded-2xl text-[11px] font-bold text-slate-600 leading-snug border border-slate-100 italic">
                                {alert}
                             </div>
                           ))}
                        </div>
                        <div className="mt-6 pt-5 border-t border-slate-50">
                           <p className="text-[10px] text-slate-400 font-bold text-center leading-relaxed">
                              พบข้อขัดแย้งทรัพยากร: <span className="text-rose-500">{generationAlerts.length}</span><br/>
                              โปรดตรวจสอบข้อมูลการจัดสรรหรือเพิ่มห้องเรียนหลัก/สำรอง
                           </p>
                        </div>
                      </div>
                    )}
                 </button>
               )}
               <div className="text-right">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">สถานะระบบ</p>
                  <p className="text-emerald-500 font-bold flex items-center gap-2 justify-end">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 
                      {generationAlerts.length > 0 ? 'Review Needed' : 'Optimized'}
                  </p>
               </div>
            </div>
         </div>

         <div className="flex-1 overflow-x-auto">
            <table className="w-full border-separate border-spacing-2 min-w-[1000px]">
              <thead>
                 <tr>
                   <th className="p-3 bg-slate-100/50 rounded-xl text-[11px] font-black uppercase text-slate-400 tracking-tighter w-24">คาบ / เวลา</th>
                   {days.map((dayName) => (
                     <th key={dayName} className="p-3 bg-indigo-50 rounded-xl text-[11px] font-black uppercase text-indigo-600 tracking-widest">
                        {dayName}
                     </th>
                   ))}
                 </tr>
              </thead>
              <tbody>
                 {(() => {
                   const periods = Array.from({ length: (data.settings.periodsPerDay || 8) }).map((_, pIndex) => pIndex + 1);
                   return periods.map(p => {
                     return (
                       <tr key={p} className="h-28">
                          <td className="bg-slate-50/50 border border-slate-100 rounded-xl text-center flex flex-col justify-center items-center h-full">
                             <div className="text-[10px] font-black text-slate-300 uppercase leading-none mb-1">คาบ {p}</div>
                             <div className="text-[10px] font-mono font-bold text-slate-400">
                                {(() => {
                                   const start = (data.settings.startTime || '08:30').split(':');
                                   const date = new Date();
                                   date.setHours(parseInt(start[0]), parseInt(start[1]), 0);
                                   date.setMinutes(date.getMinutes() + ((p-1) * (data.settings.periodDuration || 50)));
                                   const end = new Date(date);
                                   end.setMinutes(end.getMinutes() + (data.settings.periodDuration || 50));
                                   return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
                                })()}
                             </div>
                          </td>
                          
                          {days.map((_, dIndex) => {
                             const slot = currentDisplay[dIndex]?.[p];
                             
                             if (slot?.type === 'break' || slot?.type === 'global') {
                                return (
                                  <td key={dIndex} className="bg-slate-50 rounded-xl border border-slate-100/50 text-center align-middle">
                                     <span className="font-black text-slate-300 uppercase tracking-widest text-[9px] block">
                                       {slot.name}
                                     </span>
                                  </td>
                                );
                             }

                             if (!slot) return (
                               <td key={dIndex} className="p-1">
                                 {viewMode === 'group' && (
                                   <button 
                                     onClick={() => setEditingSlot({ day: dIndex, period: p })}
                                     className="w-full h-full min-h-[80px] bg-slate-50/20 border-2 border-dashed border-slate-100 rounded-xl hover:bg-slate-50 hover:border-indigo-200 transition-all flex items-center justify-center text-slate-200 hover:text-indigo-300 no-print"
                                   >
                                     <Plus size={16} />
                                   </button>
                                 )}
                               </td>
                             );

                             const sub = data.subjects.find((s: any) => s.id === slot.subject_id);
                             const tea = data.teachers.find((t: any) => t.id === slot.teacher_id);
                             const rom = data.rooms.find((r: any) => r.id === slot.room_id);
                             
                             return (
                               <td key={dIndex} className="p-1 align-top">
                                 <button 
                                    onClick={() => viewMode === 'group' && setEditingSlot({ day: dIndex, period: p })}
                                    className={cn(
                                      "w-full h-full min-h-[80px] flex flex-col justify-center border-l-4 p-4 rounded-xl shadow-sm transition-all text-left relative overflow-hidden group/cell",
                                      viewMode === 'group' ? "hover:brightness-95" : "cursor-default"
                                    )}
                                    style={{ 
                                      backgroundColor: `${tea?.color || '#cbd5e1'}15`, 
                                      borderLeftColor: tea?.color || '#cbd5e1'
                                    }}
                                 >
                                    {viewMode === 'group' && (
                                      <div className="absolute top-2 right-2 opacity-0 group-hover/cell:opacity-100 transition-opacity bg-white/80 p-1 rounded-md shadow-sm no-print">
                                         <SettingsIcon size={10} className="text-slate-400" />
                                      </div>
                                    )}
                                    <span className="text-[13px] font-black text-slate-800 leading-tight truncate mb-1">
                                      {sub?.name || '---'}
                                    </span>
                                    
                                    <div className="flex flex-col gap-0.5 mt-1 border-t border-slate-100/50 pt-2">
                                       <span className="text-[10px] text-slate-600 font-bold truncate">
                                          {viewMode === 'teacher' ? slot.display_info : (tea?.name || '---')}
                                       </span>
                                       <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter truncate italic text-[8px]">
                                          {viewMode === 'room' ? slot.display_info : (rom?.name || '---')}
                                          {slot.is_backup_room && <span className="ml-1 text-rose-500 font-black tracking-widest">(ห้องสำรอง)</span>}
                                       </span>
                                    </div>
                                 </button>
                               </td>
                             );
                          })}
                       </tr>
                     );
                   });
                 })()}
              </tbody>
            </table>
         </div>

         <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-end gap-6 text-[10px] text-slate-400 px-4">
            <div className="space-y-1">
               <p className="font-bold text-slate-800 uppercase tracking-widest">EduFlow • Intelligent School Scheduler</p>
               <p>ปีการศึกษา: {data.settings.academicYear} / ภาคเรียน {data.settings.semester}</p>
               <p>พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH')}</p>
            </div>
            
            <div className="flex flex-wrap gap-2 items-center justify-end max-w-sm">
               {data.teachers.slice(0, 15).map((t: any) => (
                 <div key={t.id} className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                   <div className="w-1.5 h-1.5 rounded-full" style={{ background: t.color }} />
                   <span className="font-black text-slate-500 uppercase tracking-tighter text-[8px]">{t.name}</span>
                 </div>
               ))}
            </div>
         </div>
      </div>

      {/* Manual Edit Modal */}
      <AnimatePresence>
        {editingSlot && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-[100] no-print">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] p-10 w-full max-w-lg shadow-2xl relative border-t-8 border-indigo-600"
            >
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">แก้ไขคาบสอน</h3>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8 flex items-center gap-2">
                <Calendar size={14} /> {days[editingSlot.day]} • คาบ {editingSlot.period}
              </p>
              
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">เลือกงานสอนสำหรับห้องนี้</label>
                    <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                       <button 
                        onClick={() => handleManualAssignment(null)}
                        className="w-full p-4 rounded-2xl border-2 border-dashed border-slate-100 text-slate-400 font-bold text-sm hover:border-rose-200 hover:text-rose-500 transition-all text-left flex items-center justify-between"
                       >
                          <span>ว่าง / ล้างข้อมูลคาบนี้</span>
                          <Trash2 size={16} />
                       </button>
                       
                       {data.assignments.filter((a: any) => a.group_id === selectedGroup).map((a: any) => {
                         const sub = data.subjects.find((s: any) => s.id === a.subject_id);
                         const tea = data.teachers.find((t: any) => t.id === a.teacher_id);
                         const isCurrent = tempSchedule[selectedGroup]?.[editingSlot.day]?.[editingSlot.period]?.assignment_id === a.id;
                         
                         return (
                           <button
                             key={a.id}
                             onClick={() => handleManualAssignment(a.id)}
                             className={cn(
                               "w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between",
                               isCurrent ? "border-indigo-600 bg-indigo-50" : "border-slate-50 bg-slate-50 hover:border-indigo-200 transition"
                             )}
                           >
                              <div className="flex items-center gap-4">
                                 <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm" style={{ background: tea?.color }} />
                                 <div>
                                    <p className="text-sm font-black text-slate-800 leading-none">{sub?.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">ครู {tea?.name}</p>
                                 </div>
                              </div>
                              {isCurrent && <div className="w-2 h-2 rounded-full bg-indigo-600 shadow-sm" />}
                           </button>
                         );
                       })}
                    </div>
                 </div>
              </div>

              <div className="mt-10 pt-4 text-right">
                 <button 
                  onClick={() => setEditingSlot(null)}
                  className="px-6 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
                 >
                   ยกเลิก
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
