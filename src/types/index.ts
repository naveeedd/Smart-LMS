
export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
}

export interface Class {
  id: string;
  name: string;
  description: string | null;
  year: number;
}

export interface Course {
  id: string;
  name: string;
  description: string | null;
}

export interface Assignment {
  id: string;
  title: string;
  description: string | null;
  course_id: string;
  class_id: string;
  teacher_id: string;
  due_date: string;
  total_marks: number;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  submission_text: string | null;
  submission_url: string | null;
  status: 'pending' | 'submitted' | 'graded';
  marks: number | null;
  feedback: string | null;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  marked_by: string | null;
}
