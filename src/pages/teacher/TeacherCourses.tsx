import { useEffect, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Course } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen } from "lucide-react";

interface CourseWithClasses extends Course {
  classCount: number;
  studentCount: number;
  assignmentCount: number;
}

const TeacherCourses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<CourseWithClasses[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;
      setIsLoading(true);

      try {
        // Fetch all courses taught by the teacher
        const { data: teacherCourses, error: coursesError } = await supabase
          .from('course_teachers')
          .select('course_id')
          .eq('teacher_id', user.id);

        if (coursesError) throw coursesError;
        
        const courseIds = teacherCourses.map(tc => tc.course_id);
        
        if (courseIds.length === 0) {
          setCourses([]);
          setIsLoading(false);
          return;
        }

        // Fetch basic course information
        const { data: coursesData, error: coursesFetchError } = await supabase
          .from('courses')
          .select('*')
          .in('id', courseIds);

        if (coursesFetchError) throw coursesFetchError;

        // Enhance courses with additional data
        const coursesWithDetails = await Promise.all(
          coursesData.map(async (course) => {
            // Count classes for this course
            const { count: classCount, error: classCountError } = await supabase
              .from('class_courses')
              .select('*', { count: 'exact', head: true })
              .eq('course_id', course.id);

            if (classCountError) throw classCountError;

            // Get class IDs for this course
            const { data: courseClasses, error: courseClassesError } = await supabase
              .from('class_courses')
              .select('class_id')
              .eq('course_id', course.id);

            if (courseClassesError) throw courseClassesError;
            
            const classIds = courseClasses.map(cc => cc.class_id);
            let studentCount = 0;
            
            if (classIds.length > 0) {
              // Count unique students across all classes for this course
              const { data: classStudents, error: classStudentsError } = await supabase
                .from('class_students')
                .select('student_id')
                .in('class_id', classIds);

              if (classStudentsError) throw classStudentsError;
              
              // Count unique students
              const uniqueStudentIds = new Set(classStudents.map(cs => cs.student_id));
              studentCount = uniqueStudentIds.size;
            }

            // Count assignments for this course
            const { count: assignmentCount, error: assignmentCountError } = await supabase
              .from('assignments')
              .select('*', { count: 'exact', head: true })
              .eq('course_id', course.id)
              .eq('teacher_id', user.id);

            if (assignmentCountError) throw assignmentCountError;

            return {
              ...course,
              classCount: classCount || 0,
              studentCount,
              assignmentCount: assignmentCount || 0,
            };
          })
        );

        setCourses(coursesWithDetails);
      } catch (error) {
        console.error('Error fetching teacher courses:', error);
        toast({
          variant: "destructive",
          title: "Error fetching courses",
          description: "Could not load your courses. Please try again later.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, [user, toast]);

  const filteredCourses = courses.filter(course => 
    (course.name?.toLowerCase() || '').includes((searchTerm || '').toLowerCase()) ||
    ((course.description?.toLowerCase() || '').includes((searchTerm || '').toLowerCase()))
  );

  return (
    <MainLayout requiredRole="teacher">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Courses</h1>
        <p className="text-gray-500 mt-1">Manage your assigned courses and content</p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Input
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center my-12">
          <p>Loading your courses...</p>
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="overflow-hidden border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>{course.name}</CardTitle>
                  <BookOpen className="h-5 w-5 text-blue-500" />
                </div>
                {course.description && (
                  <CardDescription className="line-clamp-2">
                    {course.description}
                  </CardDescription>
                )}
              </CardHeader>
              
              <CardContent>
                <Tabs defaultValue="info" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="info">Overview</TabsTrigger>
                    <TabsTrigger value="stats">Stats</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="info" className="space-y-2 mt-2">
                    <div className="text-sm">
                      <p>This course is taught across <span className="font-medium">{course.classCount}</span> classes with a total of <span className="font-medium">{course.studentCount}</span> students enrolled.</p>
                      <p className="mt-1">You have created <span className="font-medium">{course.assignmentCount}</span> assignments for this course.</p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="stats" className="mt-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-blue-50 rounded p-2 text-center">
                        <p className="text-xs text-gray-500">Classes</p>
                        <p className="text-lg font-bold">{course.classCount}</p>
                      </div>
                      <div className="bg-green-50 rounded p-2 text-center">
                        <p className="text-xs text-gray-500">Students</p>
                        <p className="text-lg font-bold">{course.studentCount}</p>
                      </div>
                      <div className="bg-purple-50 rounded p-2 text-center">
                        <p className="text-xs text-gray-500">Assignments</p>
                        <p className="text-lg font-bold">{course.assignmentCount}</p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">
            {searchTerm ? "No courses match your search" : "You have no assigned courses yet"}
          </p>
          {!searchTerm && (
            <p className="text-sm text-gray-400">
              Courses will appear here once they are assigned to you by an administrator
            </p>
          )}
        </div>
      )}
    </MainLayout>
  );
};

export default TeacherCourses; 