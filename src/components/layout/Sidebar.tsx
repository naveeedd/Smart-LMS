import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { 
  Layout, 
  Users, 
  BookOpen, 
  FileText, 
  ClipboardCheck, 
  Calendar, 
  Settings,
  UserPlus
} from "lucide-react";

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  
  if (!user) return null;

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };
  
  const renderAdminLinks = () => {
    return (
      <>
        <SidebarLink 
          to="/admin" 
          icon={<Layout size={20} />} 
          label="Dashboard" 
          active={location.pathname === "/admin"} 
        />
        <SidebarLink 
          to="/admin/users" 
          icon={<Users size={20} />} 
          label="Users" 
          active={isActive("/admin/users") && !isActive("/admin/users/register")} 
        />
        <SidebarLink 
          to="/admin/users/register" 
          icon={<UserPlus size={20} />} 
          label="Register User" 
          active={isActive("/admin/users/register")} 
        />
        <SidebarLink 
          to="/admin/teachers" 
          icon={<UserPlus size={20} />} 
          label="Manage Teachers" 
          active={isActive("/admin/teachers")} 
        />
        <SidebarLink 
          to="/admin/classes" 
          icon={<Calendar size={20} />} 
          label="Classes" 
          active={isActive("/admin/classes")} 
        />
        <SidebarLink 
          to="/admin/courses" 
          icon={<BookOpen size={20} />} 
          label="Courses" 
          active={isActive("/admin/courses")} 
        />
        <SidebarLink 
          to="/admin/settings" 
          icon={<Settings size={20} />} 
          label="Settings" 
          active={isActive("/admin/settings")} 
        />
      </>
    );
  };
  
  const renderTeacherLinks = () => {
    return (
      <>
        <SidebarLink 
          to="/teacher" 
          icon={<Layout size={20} />} 
          label="Dashboard" 
          active={location.pathname === "/teacher"} 
        />
        <SidebarLink 
          to="/teacher/classes" 
          icon={<Calendar size={20} />} 
          label="My Classes" 
          active={isActive("/teacher/classes")} 
        />
        <SidebarLink 
          to="/teacher/courses" 
          icon={<BookOpen size={20} />} 
          label="My Courses" 
          active={isActive("/teacher/courses")} 
        />
        <SidebarLink 
          to="/teacher/assignments" 
          icon={<FileText size={20} />} 
          label="Assignments" 
          active={isActive("/teacher/assignments")} 
        />
        <SidebarLink 
          to="/teacher/attendance" 
          icon={<ClipboardCheck size={20} />} 
          label="Attendance" 
          active={isActive("/teacher/attendance")} 
        />
      </>
    );
  };
  
  const renderStudentLinks = () => {
    return (
      <>
        <SidebarLink 
          to="/student" 
          icon={<Layout size={20} />} 
          label="Dashboard" 
          active={location.pathname === "/student"} 
        />
        <SidebarLink 
          to="/student/classes" 
          icon={<Calendar size={20} />} 
          label="My Classes" 
          active={isActive("/student/classes")} 
        />
        <SidebarLink 
          to="/student/assignments" 
          icon={<FileText size={20} />} 
          label="Assignments" 
          active={isActive("/student/assignments")} 
        />
        <SidebarLink 
          to="/student/attendance" 
          icon={<ClipboardCheck size={20} />} 
          label="My Attendance" 
          active={isActive("/student/attendance")} 
        />
      </>
    );
  };
  
  return (
    <aside className="flex flex-col w-64 bg-white shadow-md">
      <div className="p-6">
        <h1 className="text-xl font-bold text-primary">School LMS</h1>
      </div>
      
      <nav className="flex-1 px-4 pb-4">
        <ul className="space-y-1">
          {user.role === 'admin' && renderAdminLinks()}
          {user.role === 'teacher' && renderTeacherLinks()}
          {user.role === 'student' && renderStudentLinks()}
        </ul>
      </nav>
      
      <div className="border-t p-4">
        <div className="text-xs text-gray-500">
          <p>Logged in as:</p>
          <p className="font-semibold">{user.first_name} {user.last_name}</p>
          <p>{user.role}</p>
        </div>
      </div>
    </aside>
  );
};

interface SidebarLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}

const SidebarLink = ({ to, icon, label, active }: SidebarLinkProps) => {
  return (
    <li>
      <Link
        to={to}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all",
          active
            ? "bg-primary text-primary-foreground"
            : "text-gray-600 hover:bg-gray-100"
        )}
      >
        {icon}
        <span>{label}</span>
      </Link>
    </li>
  );
};

export default Sidebar;
