export interface Teacher {
  id: string;
  name: string;
  color: string;
}

export interface Subject {
  id: string;
  name: string;
  type: 'main' | 'activity' | 'break';
  periods_per_week: number;
}

export interface Room {
  id: string;
  name: string;
  type: 'main' | 'special';
}

export interface Group {
  id: string;
  name: string;
}

export interface Assignment {
  id: string;
  group_id: string;
  subject_id: string;
  teacher_id: string;
  room_id: string;
  backup_room_id?: string;
  periods_per_week: number;
}

export interface TimetableSlot {
  assignment_id: string;
  teacher_id: string;
  room_id: string;
  group_id: string;
  subject_id: string;
  is_backup_room?: boolean;
}

export interface GlobalActivity {
  id: string;
  name: string;
  day: number;
  period: number;
}

export interface Schedule {
  [day: number]: {
    [period: number]: TimetableSlot | null;
  };
}

export interface SystemSettings {
  academicYear: string;
  semester: string;
  periodsPerDay: number;
  periodDuration: number;
  startTime: string;
  lunchPeriod: number;
  workingDays: number[]; // 0 for Monday, 4 for Friday
  globalActivities: GlobalActivity[];
}
