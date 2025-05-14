import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Class, Course, Assignment, AttendanceRecord } from "@/types";
import { CalendarCheck, GraduationCap, Inbox, BookOpen, ArrowRight } from "lucide-react";

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalCourses: 0,
    totalAssignments: 0,
    totalAttendanceToday: 0
  });
  const [upcomingAssignments, setUpcomingAssignments] = useState<Assignment[]>([]);
  const [recentClasses, setRecentClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      setIsLoading(true);

      try {
        // Count classes taught
        const { count: classCount, error: classError } = await supabase
          .from('class_teachers')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', user.id);

        if (classError) throw classError;

        // Count courses taught
        const { count: courseCount, error: courseError } = await supabase
          .from('course_teachers')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', user.id);

        if (courseError) throw courseError;

        // Count assignments created
        const { count: assignmentCount, error: assignmentError } = await supabase
          .from('assignments')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', user.id);

        if (assignmentError) throw assignmentError;

        // Count attendance records marked today
        const today = new Date().toISOString().split('T')[0];
        const { count: attendanceCount, error: attendanceError } = await supabase
          .from('attendance_records')
          .select('*', { count: 'exact', head: true })
          .eq('marked_by', user.id)
          .like('date', `${today}%`);

        if (attendanceError) throw attendanceError;

        setStats({
          totalClasses: classCount || 0,
          totalCourses: courseCount || 0,
          totalAssignments: assignmentCount || 0,
          totalAttendanceToday: attendanceCount || 0
        });

        // Fetch upcoming assignments
        const { data: assignments, error: fetchError } = await supabase
          .from('assignments')
          .select('*')
          .eq('teacher_id', user.id)
          .gte('due_date', new Date().toISOString())
          .order('due_date', { ascending: true })
          .limit(5);

        if (fetchError) throw fetchError;
        setUpcomingAssignments(assignments || []);

        // Fetch classes taught by the teacher
        const { data: teacherClasses, error: classesError } = await supabase
          .from('class_teachers')
          .select('class_id')
          .eq('teacher_id', user.id);

        if (classesError) throw classesError;
        
        const classIds = teacherClasses.map(tc => tc.class_id);
        
        if (classIds.length > 0) {
          const { data: classesData, error: classesFetchError } = await supabase
            .from('classes')
            .select('*')
            .in('id', classIds)
            .limit(3);

          if (classesFetchError) throw classesFetchError;
          setRecentClasses(classesData || []);
        }

      } catch (error) {
        console.error('Error fetching teacher stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  return (
    <MainLayout requiredRole="teacher">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.first_name}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Link to="/teacher/classes">
          <StatCard 
            title="Classes" 
            value={stats.totalClasses} 
            description="Classes you teach"
            icon={<GraduationCap className="h-5 w-5 text-blue-600" />}
            color="blue"
          />
        </Link>
        <Link to="/teacher/assignments">
          <StatCard 
            title="Assignments" 
            value={stats.totalAssignments}
            description="Total assignments" 
            icon={<Inbox className="h-5 w-5 text-purple-600" />}
            color="purple"
          />
        </Link>
        <Link to="/teacher/courses">
          <StatCard 
            title="Courses" 
            value={stats.totalCourses} 
            description="Courses you teach"
            icon={<BookOpen className="h-5 w-5 text-emerald-600" />}
            color="emerald"
          />
        </Link>
        <Link to="/teacher/attendance">
          <StatCard 
            title="Attendance Today" 
            value={stats.totalAttendanceToday}
            description="Records marked today" 
            icon={<CalendarCheck className="h-5 w-5 text-amber-600" />}
            color="amber"
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Assignments</CardTitle>
            <CardDescription>Assignments with approaching due dates</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingAssignments.length > 0 ? (
              <div className="divide-y">
                {upcomingAssignments.map(assignment => (
                  <div key={assignment.id} className="p-4">
                    <h3 className="font-medium">{assignment.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Due: {new Date(assignment.due_date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                No upcoming assignments
              </div>
            )}
          </CardContent>
          {upcomingAssignments.length > 0 && (
            <CardFooter className="border-t p-4">
              <Link to="/teacher/assignments" className="w-full">
                <Button variant="outline" className="w-full">
                  View All Assignments
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardFooter>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Classes</CardTitle>
            <CardDescription>Classes you are teaching</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentClasses.length > 0 ? (
              <div className="divide-y">
                {recentClasses.map(cls => (
                  <div key={cls.id} className="p-4">
                    <h3 className="font-medium">{cls.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Year: {cls.year}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                No classes assigned yet
              </div>
            )}
          </CardContent>
          {recentClasses.length > 0 && (
            <CardFooter className="border-t p-4">
              <Link to="/teacher/classes" className="w-full">
                <Button variant="outline" className="w-full">
                  View All Classes
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardFooter>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-6">
        <Card className="col-span-1 md:col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Link to="/teacher/assignments">
                <Button variant="outline" className="w-full justify-start">
                  <Inbox className="mr-2 h-4 w-4" />
                  Create Assignment
                </Button>
              </Link>
              <Link to="/teacher/attendance">
                <Button variant="outline" className="w-full justify-start">
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  Mark Attendance
                </Button>
              </Link>
              <Link to="/teacher/classes">
                <Button variant="outline" className="w-full justify-start">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  View Classes
                </Button>
              </Link>
              <Link to="/teacher/courses">
                <Button variant="outline" className="w-full justify-start">
                  <BookOpen className="mr-2 h-4 w-4" />
                  View Courses
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

interface StatCardProps {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  color: 'blue' | 'purple' | 'emerald' | 'amber';
}

const StatCard = ({ title, value, description, icon, color }: StatCardProps) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-100',
    purple: 'bg-purple-50 border-purple-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    amber: 'bg-amber-50 border-amber-100',
  };

  return (
    <Card className={`${colorClasses[color]} hover:shadow-md transition-shadow`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </CardContent>
    </Card>
  );
};

export default TeacherDashboard;
