import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import StudentDashboard from "./pages/student/StudentDashboard";
import UserRegistration from "./pages/admin/UserRegistration";
import CourseManagement from "./pages/admin/CourseManagement";
import StudentManagement from "./pages/admin/StudentManagement";
import TeacherManagement from "./pages/admin/TeacherManagement";
import Users from "./pages/admin/Users";
import Settings from "./pages/admin/Settings";
import ClassManagement from "./pages/admin/ClassManagement";
import TeacherAssignments from "./pages/teacher/TeacherAssignments";
import TeacherClasses from "./pages/teacher/TeacherClasses";
import TeacherCourses from "./pages/teacher/TeacherCourses";
import AttendanceManagement from "./pages/teacher/AttendanceManagement";
import StudentClasses from "./pages/student/StudentClasses";
import StudentAssignments from "./pages/student/StudentAssignments";
import StudentAttendance from "./pages/student/StudentAttendance";

const queryClient = new QueryClient();

const App = () => (
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              
              {/* Admin routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<Users />} />
              <Route path="/admin/users/register" element={<UserRegistration />} />
              <Route path="/admin/courses" element={<CourseManagement />} />
              <Route path="/admin/students" element={<StudentManagement />} />
              <Route path="/admin/teachers" element={<TeacherManagement />} />
              <Route path="/admin/classes" element={<ClassManagement />} />
              <Route path="/admin/settings" element={<Settings />} />
              
              {/* Teacher routes */}
              <Route path="/teacher" element={<TeacherDashboard />} />
              <Route path="/teacher/assignments" element={<TeacherAssignments />} />
              <Route path="/teacher/classes" element={<TeacherClasses />} />
              <Route path="/teacher/courses" element={<TeacherCourses />} />
              <Route path="/teacher/attendance" element={<AttendanceManagement />} />
              
              {/* Student routes */}
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/classes" element={<StudentClasses />} />
              <Route path="/student/assignments" element={<StudentAssignments />} />
              <Route path="/student/attendance" element={<StudentAttendance />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

export default App;
