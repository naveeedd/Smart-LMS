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

interface Class {
  id: string;
  name: string;
  course_id: string;
  teacher_id: string;
  schedule: string;
  room: string;
  created_at: string;
  course?: {
    title: string;
  };
  teacher?: {
    full_name: string;
  };
}

interface Course {
  id: string;
  title: string;
}

interface Teacher {
  id: string;
  full_name: string;
}

const ClassManagement = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newClass, setNewClass] = useState({
    name: "",
    course_id: "",
    teacher_id: "",
    schedule: "",
    room: "",
  });

  useEffect(() => {
    fetchClasses();
    fetchCourses();
    fetchTeachers();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select(`
          *,
          course:course_id (title),
          teacher:teacher_id (first_name, last_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Transform the data to include proper full_name for teacher
      const classesWithTeacherNames = data?.map(classItem => ({
        ...classItem,
        teacher: classItem.teacher 
          ? { full_name: `${classItem.teacher.first_name} ${classItem.teacher.last_name}` }
          : undefined
      })) || [];
      
      setClasses(classesWithTeacherNames);
    } catch (error) {
      console.error("Error fetching classes:", error);
      toast.error("Failed to fetch classes");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title");

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to fetch courses");
    }
  };

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("role", "teacher");

      if (error) throw error;
      
      // Map the data to include full_name
      const teachersWithFullName = data?.map(teacher => ({
        id: teacher.id,
        full_name: `${teacher.first_name} ${teacher.last_name}`
      })) || [];
      
      setTeachers(teachersWithFullName);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast.error("Failed to fetch teachers");
    }
  };

  const handleCreateClass = async () => {
    try {
      // Validate inputs
      if (!newClass.name.trim() || !newClass.course_id || !newClass.teacher_id || !newClass.schedule.trim() || !newClass.room.trim()) {
        toast.error("All fields are required");
        return;
      }

      const { error } = await supabase.from("classes").insert([
        {
          name: newClass.name.trim(),
          course_id: newClass.course_id,
          teacher_id: newClass.teacher_id,
          schedule: newClass.schedule.trim(),
          room: newClass.room.trim(),
        },
      ]);

      if (error) throw error;

      toast.success("Class created successfully");
      setIsDialogOpen(false);
      setNewClass({
        name: "",
        course_id: "",
        teacher_id: "",
        schedule: "",
        room: "",
      });
      fetchClasses();
    } catch (error) {
      console.error("Error creating class:", error);
      toast.error("Failed to create class");
    }
  };

  const handleDeleteClass = async (id: string) => {
    try {
      const { error } = await supabase.from("classes").delete().eq("id", id);

      if (error) throw error;

      toast.success("Class deleted successfully");
      fetchClasses();
    } catch (error) {
      console.error("Error deleting class:", error);
      toast.error("Failed to delete class");
    }
  };

  return (
    <MainLayout requiredRole="admin">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Class Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add New Class</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Class Name</Label>
                <Input
                  id="name"
                  value={newClass.name}
                  onChange={(e) =>
                    setNewClass({ ...newClass, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course">Course</Label>
                <Select
                  value={newClass.course_id}
                  onValueChange={(value) =>
                    setNewClass({ ...newClass, course_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacher">Teacher</Label>
                <Select
                  value={newClass.teacher_id}
                  onValueChange={(value) =>
                    setNewClass({ ...newClass, teacher_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule">Schedule</Label>
                <Input
                  id="schedule"
                  placeholder="e.g., Monday 10:00 AM - 12:00 PM"
                  value={newClass.schedule}
                  onChange={(e) =>
                    setNewClass({ ...newClass, schedule: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room">Room</Label>
                <Input
                  id="room"
                  value={newClass.room}
                  onChange={(e) =>
                    setNewClass({ ...newClass, room: e.target.value })
                  }
                />
              </div>
              <Button onClick={handleCreateClass} className="w-full">
                Create Class
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
              <TableHead>Course</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.map((classItem) => (
              <TableRow key={classItem.id}>
                <TableCell>{classItem.name}</TableCell>
                <TableCell>{classItem.course?.title}</TableCell>
                <TableCell>{classItem.teacher?.full_name}</TableCell>
                <TableCell>{classItem.schedule}</TableCell>
                <TableCell>{classItem.room}</TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClass(classItem.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </MainLayout>
  );
};

export default ClassManagement; 