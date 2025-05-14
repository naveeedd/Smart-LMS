import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Assignment } from "@/types";
import { GraduationCap, BookOpen, CalendarCheck, ClipboardList, ArrowRight } from "lucide-react";

const StudentDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalAssignments: 0,
    submittedAssignments: 0,
    pendingAssignments: 0,
  });
  const [upcomingAssignments, setUpcomingAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      setIsLoading(true);

      try {
        // Count enrolled classes
        const { count: classCount, error: classError } = await supabase
          .from('class_students')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', user.id);

        if (classError) throw classError;

        // Get all assignments for student's classes
        const { data: classData, error: classDataError } = await supabase
          .from('class_students')
          .select('class_id')
          .eq('student_id', user.id);

        if (classDataError) throw classDataError;
        
        const classIds = classData.map(c => c.class_id);
        
        if (classIds.length > 0) {
          // Count assignments
          const { count: assignmentCount, error: assignmentError } = await supabase
            .from('assignments')
            .select('*', { count: 'exact', head: true })
            .in('class_id', classIds);

          if (assignmentError) throw assignmentError;

          // Count submitted assignments
          const { count: submittedCount, error: submittedError } = await supabase
            .from('assignment_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', user.id)
            .eq('status', 'submitted');

          if (submittedError) throw submittedError;

          // Count pending assignments
          const { count: pendingCount, error: pendingError } = await supabase
            .from('assignment_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', user.id)
            .eq('status', 'pending');

          if (pendingError) throw pendingError;

          setStats({
            totalClasses: classCount || 0,
            totalAssignments: assignmentCount || 0,
            submittedAssignments: submittedCount || 0,
            pendingAssignments: pendingCount || 0,
          });

          // Fetch upcoming assignments
          const { data: assignments, error: fetchError } = await supabase
            .from('assignments')
            .select('*')
            .in('class_id', classIds)
            .gte('due_date', new Date().toISOString())
            .order('due_date', { ascending: true })
            .limit(5);

          if (fetchError) throw fetchError;
          setUpcomingAssignments(assignments || []);
        }
      } catch (error) {
        console.error('Error fetching student stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  return (
    <MainLayout requiredRole="student">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Student Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.first_name}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Link to="/student/classes">
          <StatCard 
            title="Enrolled Classes" 
            value={stats.totalClasses} 
            description="Your classes"
            icon={<GraduationCap className="h-5 w-5 text-blue-600" />}
            color="blue"
          />
        </Link>
        <Link to="/student/assignments">
          <StatCard 
            title="Total Assignments" 
            value={stats.totalAssignments}
            description="All assignments" 
            icon={<ClipboardList className="h-5 w-5 text-purple-600" />}
            color="purple"
          />
        </Link>
        <Link to="/student/assignments">
          <StatCard 
            title="Submitted" 
            value={stats.submittedAssignments} 
            description="Submitted work"
            icon={<BookOpen className="h-5 w-5 text-emerald-600" />}
            color="emerald"
          />
        </Link>
        <Link to="/student/attendance">
          <StatCard 
            title="Pending" 
            value={stats.pendingAssignments}
            description="Pending submissions" 
            icon={<CalendarCheck className="h-5 w-5 text-amber-600" />}
            color="amber"
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6">
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
              <Link to="/student/assignments" className="w-full">
                <Button variant="outline" className="w-full">
                  View All Assignments
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to="/student/classes">
                <Button variant="outline" className="w-full justify-start">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  View Classes
                </Button>
              </Link>
              <Link to="/student/assignments">
                <Button variant="outline" className="w-full justify-start">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  View Assignments
                </Button>
              </Link>
              <Link to="/student/attendance">
                <Button variant="outline" className="w-full justify-start">
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  Check Attendance
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

export default StudentDashboard;
