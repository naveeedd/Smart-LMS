import { useEffect, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Class, Course } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, BookOpen, Calendar } from "lucide-react";

interface ClassWithDetails extends Class {
  courses: Course[];
  assignmentCount: number;
  teacherNames: string[];
}

const StudentClasses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchClasses = async () => {
      if (!user) return;
      setIsLoading(true);

      try {
        // Fetch classes the student is enrolled in
        const { data: studentClasses, error: classesError } = await supabase
          .from('class_students')
          .select('class_id')
          .eq('student_id', user.id);

        if (classesError) throw classesError;
        
        const classIds = studentClasses.map(sc => sc.class_id);
        
        if (classIds.length === 0) {
          setClasses([]);
          setIsLoading(false);
          return;
        }

        // Fetch basic class information
        const { data: classesData, error: classFetchError } = await supabase
          .from('classes')
          .select('*')
          .in('id', classIds);

        if (classFetchError) throw classFetchError;

        // Get additional details for each class
        const classesWithDetails = await Promise.all(
          classesData.map(async (cls) => {
            // Get courses for this class
            const { data: courseClasses, error: courseClassesError } = await supabase
              .from('course_classes')
              .select('course_id')
              .eq('class_id', cls.id);

            if (courseClassesError) throw courseClassesError;
            
            const courseIds = courseClasses.map(cc => cc.course_id);
            let courses: Course[] = [];
            
            if (courseIds.length > 0) {
              const { data: coursesData, error: coursesError } = await supabase
                .from('courses')
                .select('*')
                .in('id', courseIds);

              if (coursesError) throw coursesError;
              courses = coursesData || [];
            }

            // Count assignments for this class
            const { count: assignmentCount, error: assignmentCountError } = await supabase
              .from('assignments')
              .select('*', { count: 'exact', head: true })
              .eq('class_id', cls.id);

            if (assignmentCountError) throw assignmentCountError;

            // Get teacher names
            const { data: classTeachers, error: teachersError } = await supabase
              .from('class_teachers')
              .select('teacher_id')
              .eq('class_id', cls.id);

            if (teachersError) throw teachersError;
            
            const teacherIds = classTeachers.map(ct => ct.teacher_id);
            let teacherNames: string[] = [];
            
            if (teacherIds.length > 0) {
              const { data: teachersData, error: teachersFetchError } = await supabase
                .from('users')
                .select('first_name, last_name')
                .in('id', teacherIds)
                .eq('role', 'teacher');

              if (teachersFetchError) throw teachersFetchError;
              teacherNames = teachersData.map(t => `${t.first_name} ${t.last_name}`);
            }

            return {
              ...cls,
              courses,
              assignmentCount: assignmentCount || 0,
              teacherNames,
            };
          })
        );

        setClasses(classesWithDetails);
      } catch (error) {
        console.error('Error fetching student classes:', error);
        toast({
          variant: "destructive",
          title: "Error fetching classes",
          description: "Could not load your enrolled classes. Please try again later.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClasses();
  }, [user, toast]);

  const filteredClasses = classes.filter(cls => 
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cls.description && cls.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    cls.courses.some(course => course.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    cls.teacherNames.some(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <MainLayout requiredRole="student">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Classes</h1>
        <p className="text-gray-500 mt-1">View your enrolled classes and related courses</p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Input
            placeholder="Search classes by name, course, or teacher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-lg"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center my-12">
          <p>Loading your classes...</p>
        </div>
      ) : filteredClasses.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.map((cls) => (
            <Card key={cls.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>{cls.name}</CardTitle>
                  <GraduationCap className="h-5 w-5 text-blue-500" />
                </div>
                <CardDescription>Year: {cls.year}</CardDescription>
                {cls.description && <p className="text-sm mt-1">{cls.description}</p>}
              </CardHeader>
              
              <CardContent>
                <Tabs defaultValue="courses" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="courses">Courses</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="courses" className="space-y-2 mt-2">
                    {cls.courses.length > 0 ? (
                      <div className="space-y-2">
                        {cls.courses.map(course => (
                          <div key={course.id} className="flex items-center p-2 bg-gray-50 rounded">
                            <BookOpen className="h-4 w-4 text-blue-500 mr-2" />
                            <span className="text-sm">{course.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-2">
                        No courses assigned to this class yet
                      </p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="details" className="mt-2">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-gray-600">Assignments</span>
                        <span className="font-medium">{cls.assignmentCount}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-gray-600">Year</span>
                        <span className="font-medium">{cls.year}</span>
                      </div>
                      <div className="pt-1">
                        <span className="text-gray-600 block mb-1">Teachers:</span>
                        {cls.teacherNames.length > 0 ? (
                          <div className="space-y-1">
                            {cls.teacherNames.map((name, index) => (
                              <div key={index} className="text-sm bg-gray-50 p-1 rounded">
                                {name}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500">No teachers assigned yet</span>
                        )}
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
            {searchTerm ? "No classes match your search" : "You are not enrolled in any classes yet"}
          </p>
          {!searchTerm && (
            <p className="text-sm text-gray-400">
              Classes will appear here once you're enrolled by an administrator
            </p>
          )}
        </div>
      )}
    </MainLayout>
  );
};

export default StudentClasses; 