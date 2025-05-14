import { useEffect, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Class, Course } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface ClassWithDetails extends Class {
  studentCount: number;
  assignmentCount: number;
  courses: Course[];
}

const TeacherClasses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classesWithDetails, setClassesWithDetails] = useState<ClassWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchClasses = async () => {
      if (!user) return;
      setIsLoading(true);

      try {
        // Fetch all classes taught by the teacher
        const { data: teacherClasses, error: classesError } = await supabase
          .from('class_teachers')
          .select('class_id')
          .eq('teacher_id', user.id);

        if (classesError) throw classesError;
        
        const classIds = teacherClasses.map(tc => tc.class_id);
        
        if (classIds.length === 0) {
          setClassesWithDetails([]);
          setIsLoading(false);
          return;
        }

        // Fetch basic class information
        const { data: classes, error: classFetchError } = await supabase
          .from('classes')
          .select('*')
          .in('id', classIds);

        if (classFetchError) throw classFetchError;

        // Fetch student count for each class
        const classesWithStudentCount = await Promise.all(
          classes.map(async (cls) => {
            // Count students in class
            const { count: studentCount, error: studentCountError } = await supabase
              .from('class_students')
              .select('*', { count: 'exact', head: true })
              .eq('class_id', cls.id);

            if (studentCountError) throw studentCountError;

            // Count assignments for class
            const { count: assignmentCount, error: assignmentCountError } = await supabase
              .from('assignments')
              .select('*', { count: 'exact', head: true })
              .eq('class_id', cls.id)
              .eq('teacher_id', user.id);

            if (assignmentCountError) throw assignmentCountError;

            // Fetch courses associated with this class (through course_classes table)
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
              courses = coursesData;
            }

            return {
              ...cls,
              studentCount: studentCount || 0,
              assignmentCount: assignmentCount || 0,
              courses: courses || [],
            };
          })
        );

        setClassesWithDetails(classesWithStudentCount);
      } catch (error) {
        console.error('Error fetching teacher classes:', error);
        toast({
          variant: "destructive",
          title: "Error fetching classes",
          description: "Could not load your classes. Please try again later.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClasses();
  }, [user, toast]);

  const filteredClasses = classesWithDetails.filter(cls => 
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cls.description && cls.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <MainLayout requiredRole="teacher">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Classes</h1>
        <p className="text-gray-500 mt-1">Manage your assigned classes and students</p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Input
            placeholder="Search classes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
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
                <CardTitle>{cls.name}</CardTitle>
                <p className="text-sm text-gray-500">{cls.year}</p>
              </CardHeader>
              
              <CardContent>
                {cls.description && <p className="text-sm mb-4">{cls.description}</p>}
                
                <Tabs defaultValue="info">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="info">Info</TabsTrigger>
                    <TabsTrigger value="courses">Courses</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="info" className="space-y-2 mt-2">
                    <div className="flex justify-between text-sm py-1 border-b">
                      <span className="text-gray-600">Students</span>
                      <span className="font-medium">{cls.studentCount}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1 border-b">
                      <span className="text-gray-600">Assignments</span>
                      <span className="font-medium">{cls.assignmentCount}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1">
                      <span className="text-gray-600">Year</span>
                      <span className="font-medium">{cls.year}</span>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="courses" className="mt-2">
                    {cls.courses.length > 0 ? (
                      <ul className="space-y-1">
                        {cls.courses.map(course => (
                          <li key={course.id} className="text-sm py-1.5 px-2 bg-gray-50 rounded">
                            {course.title}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-2">
                        No courses assigned
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
              
              <CardFooter className="flex justify-between pt-2">
                <Button variant="outline" size="sm">View Students</Button>
                <Button variant="outline" size="sm">View Assignments</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">
            {searchTerm ? "No classes match your search" : "You have no assigned classes yet"}
          </p>
          {!searchTerm && (
            <p className="text-sm text-gray-400">
              Classes will appear here once they are assigned to you by an administrator
            </p>
          )}
        </div>
      )}
    </MainLayout>
  );
};

export default TeacherClasses; 