import { useEffect, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Assignment, Course, Class } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const TeacherAssignments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    course_id: "",
    class_id: "",
    due_date: "",
    total_marks: 100,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);

      try {
        // Fetch assignments created by the teacher
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('assignments')
          .select('*')
          .eq('teacher_id', user.id)
          .order('due_date', { ascending: false });

        if (assignmentsError) throw assignmentsError;
        setAssignments(assignmentsData || []);

        // Fetch courses taught by the teacher
        const { data: teacherCourses, error: coursesError } = await supabase
          .from('course_teachers')
          .select('course_id')
          .eq('teacher_id', user.id);

        if (coursesError) throw coursesError;
        
        const courseIds = teacherCourses.map(tc => tc.course_id);
        
        if (courseIds.length > 0) {
          const { data: coursesData, error: coursesFetchError } = await supabase
            .from('courses')
            .select('*')
            .in('id', courseIds);

          if (coursesFetchError) throw coursesFetchError;
          setCourses(coursesData || []);
        }

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
            .in('id', classIds);

          if (classesFetchError) throw classesFetchError;
          setClasses(classesData || []);
        }
      } catch (error) {
        console.error('Error fetching teacher data:', error);
        toast({
          variant: "destructive",
          title: "Error fetching data",
          description: "Could not load assignments and related data.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const newAssignment = {
        ...formData,
        teacher_id: user.id,
        total_marks: Number(formData.total_marks),
      };

      const { data, error } = await supabase
        .from('assignments')
        .insert([newAssignment])
        .select()
        .single();

      if (error) throw error;

      setAssignments(prev => [data, ...prev]);
      setIsOpen(false);
      setFormData({
        title: "",
        description: "",
        course_id: "",
        class_id: "",
        due_date: "",
        total_marks: 100,
      });

      toast({
        title: "Assignment created",
        description: "The assignment has been created successfully.",
      });
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        variant: "destructive",
        title: "Error creating assignment",
        description: "Could not create the assignment. Please try again.",
      });
    }
  };

  return (
    <MainLayout requiredRole="teacher">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Assignments</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>Create Assignment</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Create New Assignment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid w-full items-center gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="grid w-full items-center gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description || ""}
                  onChange={handleChange}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid w-full items-center gap-2">
                  <Label htmlFor="course">Course</Label>
                  <Select 
                    name="course_id" 
                    value={formData.course_id} 
                    onValueChange={(value) => handleSelectChange("course_id", value)}
                  >
                    <SelectTrigger id="course">
                      <SelectValue placeholder="Select Course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map(course => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid w-full items-center gap-2">
                  <Label htmlFor="class">Class</Label>
                  <Select 
                    name="class_id" 
                    value={formData.class_id} 
                    onValueChange={(value) => handleSelectChange("class_id", value)}
                  >
                    <SelectTrigger id="class">
                      <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid w-full items-center gap-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    name="due_date"
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="grid w-full items-center gap-2">
                  <Label htmlFor="total_marks">Total Marks</Label>
                  <Input
                    id="total_marks"
                    name="total_marks"
                    type="number"
                    min="1"
                    value={formData.total_marks}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Assignment</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center my-12">
          <p>Loading assignments...</p>
        </div>
      ) : assignments.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Total Marks</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => {
                  const course = courses.find(c => c.id === assignment.course_id);
                  const classItem = classes.find(c => c.id === assignment.class_id);
                  
                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">{assignment.title}</TableCell>
                      <TableCell>{course?.name || "-"}</TableCell>
                      <TableCell>{classItem?.name || "-"}</TableCell>
                      <TableCell>
                        {new Date(assignment.due_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{assignment.total_marks}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">View Submissions</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center p-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">No assignments created yet</p>
          <Button onClick={() => setIsOpen(true)}>Create Your First Assignment</Button>
        </div>
      )}
    </MainLayout>
  );
};

export default TeacherAssignments; 