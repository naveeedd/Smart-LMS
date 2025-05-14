import { useEffect, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Student {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  enrolled_courses: string[];
}

interface Course {
  id: string;
  title: string;
}

const StudentManagement = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    email: "",
    full_name: "",
    password: "",
  });

  useEffect(() => {
    fetchStudents();
    fetchCourses();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "student")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch enrolled courses for each student
      const studentsWithCourses = await Promise.all(
        (data || []).map(async (student) => {
          const { data: enrollments } = await supabase
            .from("enrollments")
            .select("course_id")
            .eq("student_id", student.id);

          return {
            ...student,
            enrolled_courses: enrollments?.map((e) => e.course_id) || [],
          };
        })
      );

      setStudents(studentsWithCourses);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to fetch students");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase.from("courses").select("id, title");
      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to fetch courses");
    }
  };

  const handleCreateStudent = async () => {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newStudent.email,
        password: newStudent.password,
      });

      if (authError) throw authError;

      // Create profile
      const { error: profileError } = await supabase.from("profiles").insert([
        {
          id: authData.user?.id,
          email: newStudent.email,
          full_name: newStudent.full_name,
          role: "student",
        },
      ]);

      if (profileError) throw profileError;

      toast.success("Student created successfully");
      setIsDialogOpen(false);
      setNewStudent({ email: "", full_name: "", password: "" });
      fetchStudents();
    } catch (error) {
      console.error("Error creating student:", error);
      toast.error("Failed to create student");
    }
  };

  const handleEnrollStudent = async (studentId: string, courseId: string) => {
    try {
      const { error } = await supabase.from("enrollments").insert([
        {
          student_id: studentId,
          course_id: courseId,
        },
      ]);

      if (error) throw error;

      toast.success("Student enrolled successfully");
      fetchStudents();
    } catch (error) {
      console.error("Error enrolling student:", error);
      toast.error("Failed to enroll student");
    }
  };

  return (
    <MainLayout requiredRole="admin">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Student Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add New Student</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Student</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newStudent.email}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={newStudent.full_name}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, full_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newStudent.password}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, password: e.target.value })
                  }
                />
              </div>
              <Button onClick={handleCreateStudent} className="w-full">
                Create Student
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Enrolled Courses</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell>{student.full_name}</TableCell>
                <TableCell>{student.email}</TableCell>
                <TableCell>
                  {student.enrolled_courses.length > 0
                    ? student.enrolled_courses
                        .map(
                          (courseId) =>
                            courses.find((c) => c.id === courseId)?.title
                        )
                        .join(", ")
                    : "No courses enrolled"}
                </TableCell>
                <TableCell>
                  <Select
                    onValueChange={(courseId) =>
                      handleEnrollStudent(student.id, courseId)
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Enroll in course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses
                        .filter(
                          (course) =>
                            !student.enrolled_courses.includes(course.id)
                        )
                        .map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </MainLayout>
  );
};

export default StudentManagement; 