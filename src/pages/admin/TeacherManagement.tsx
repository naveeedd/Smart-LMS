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

interface Teacher {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  assigned_courses: string[];
}

interface Course {
  id: string;
  title: string;
}

const TeacherManagement = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    email: "",
    full_name: "",
    password: "",
  });

  useEffect(() => {
    fetchTeachers();
    fetchCourses();
  }, []);

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "teacher")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch assigned courses for each teacher
      const teachersWithCourses = await Promise.all(
        (data || []).map(async (teacher) => {
          const { data: assignments } = await supabase
            .from("course_teachers")
            .select("course_id")
            .eq("teacher_id", teacher.id);

          return {
            ...teacher,
            assigned_courses: assignments?.map((a) => a.course_id) || [],
          };
        })
      );

      setTeachers(teachersWithCourses);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast.error("Failed to fetch teachers");
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

  const handleCreateTeacher = async () => {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newTeacher.email,
        password: newTeacher.password,
      });

      if (authError) throw authError;

      // Create profile
      const { error: profileError } = await supabase.from("profiles").insert([
        {
          id: authData.user?.id,
          email: newTeacher.email,
          full_name: newTeacher.full_name,
          role: "teacher",
        },
      ]);

      if (profileError) throw profileError;

      toast.success("Teacher created successfully");
      setIsDialogOpen(false);
      setNewTeacher({ email: "", full_name: "", password: "" });
      fetchTeachers();
    } catch (error) {
      console.error("Error creating teacher:", error);
      toast.error("Failed to create teacher");
    }
  };

  const handleAssignCourse = async (teacherId: string, courseId: string) => {
    try {
      const { error } = await supabase.from("course_teachers").insert([
        {
          teacher_id: teacherId,
          course_id: courseId,
        },
      ]);

      if (error) throw error;

      toast.success("Course assigned successfully");
      fetchTeachers();
    } catch (error) {
      console.error("Error assigning course:", error);
      toast.error("Failed to assign course");
    }
  };

  return (
    <MainLayout requiredRole="admin">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Teacher Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add New Teacher</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Teacher</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newTeacher.email}
                  onChange={(e) =>
                    setNewTeacher({ ...newTeacher, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={newTeacher.full_name}
                  onChange={(e) =>
                    setNewTeacher({ ...newTeacher, full_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newTeacher.password}
                  onChange={(e) =>
                    setNewTeacher({ ...newTeacher, password: e.target.value })
                  }
                />
              </div>
              <Button onClick={handleCreateTeacher} className="w-full">
                Create Teacher
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
              <TableHead>Assigned Courses</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.map((teacher) => (
              <TableRow key={teacher.id}>
                <TableCell>{teacher.full_name}</TableCell>
                <TableCell>{teacher.email}</TableCell>
                <TableCell>
                  {teacher.assigned_courses.length > 0
                    ? teacher.assigned_courses
                        .map(
                          (courseId) =>
                            courses.find((c) => c.id === courseId)?.title
                        )
                        .join(", ")
                    : "No courses assigned"}
                </TableCell>
                <TableCell>
                  <Select
                    onValueChange={(courseId) =>
                      handleAssignCourse(teacher.id, courseId)
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Assign course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses
                        .filter(
                          (course) =>
                            !teacher.assigned_courses.includes(course.id)
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

export default TeacherManagement; 