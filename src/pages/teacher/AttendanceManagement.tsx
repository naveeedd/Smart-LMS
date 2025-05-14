import { useEffect, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Class, User, AttendanceRecord } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CalendarIcon, CheckIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type AttendanceStatus = 'present' | 'absent' | 'late';

interface StudentWithAttendance extends User {
  attendanceStatus: AttendanceStatus;
  attendanceRecordId?: string;
}

const AttendanceManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [students, setStudents] = useState<StudentWithAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [existingAttendance, setExistingAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!user) return;
      setIsLoading(true);

      try {
        // Fetch teacher's classes
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
          
          if (classesData && classesData.length > 0 && !selectedClassId) {
            setSelectedClassId(classesData[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
        toast({
          variant: "destructive",
          title: "Error loading classes",
          description: "Could not load your classes. Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClasses();
  }, [user, toast, selectedClassId]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClassId) return;
      setIsLoading(true);

      try {
        // Fetch students in selected class
        const { data: classStudents, error: studentsError } = await supabase
          .from('class_students')
          .select('student_id')
          .eq('class_id', selectedClassId);

        if (studentsError) throw studentsError;
        
        const studentIds = classStudents.map(cs => cs.student_id);
        
        if (studentIds.length > 0) {
          // Fetch student details
          const { data: studentsData, error: studentsFetchError } = await supabase
            .from('users')
            .select('*')
            .in('id', studentIds)
            .eq('role', 'student');

          if (studentsFetchError) throw studentsFetchError;
          
          // Fetch existing attendance records for selected date
          const formattedDate = format(selectedDate, 'yyyy-MM-dd');
          
          const { data: attendanceData, error: attendanceError } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('class_id', selectedClassId)
            .like('date', `${formattedDate}%`);

          if (attendanceError) throw attendanceError;
          setExistingAttendance(attendanceData || []);
          
          // Combine student data with attendance status
          const studentsWithAttendance = studentsData.map(student => {
            const attendance = attendanceData?.find(a => a.student_id === student.id);
            return {
              ...student,
              attendanceStatus: attendance?.status || 'present',
              attendanceRecordId: attendance?.id
            };
          });
          
          setStudents(studentsWithAttendance);
        } else {
          setStudents([]);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        toast({
          variant: "destructive",
          title: "Error loading students",
          description: "Could not load students for this class. Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [selectedClassId, selectedDate, toast]);

  const updateAttendance = (studentId: string, status: AttendanceStatus) => {
    setStudents(prev => 
      prev.map(student => 
        student.id === studentId 
          ? { ...student, attendanceStatus: status } 
          : student
      )
    );
  };

  const saveAttendance = async () => {
    if (!user || !selectedClassId) return;
    setIsSaving(true);

    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      // Process each student's attendance
      for (const student of students) {
        // If there's an existing record, update it
        if (student.attendanceRecordId) {
          await supabase
            .from('attendance_records')
            .update({
              status: student.attendanceStatus,
              marked_by: user.id
            })
            .eq('id', student.attendanceRecordId);
        } else {
          // Create a new attendance record
          await supabase
            .from('attendance_records')
            .insert([{
              student_id: student.id,
              class_id: selectedClassId,
              date: formattedDate,
              status: student.attendanceStatus,
              marked_by: user.id
            }]);
        }
      }

      toast({
        title: "Attendance saved",
        description: `Attendance for ${formattedDate} has been saved successfully.`,
      });
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast({
        variant: "destructive",
        title: "Error saving attendance",
        description: "Could not save attendance records. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MainLayout requiredRole="teacher">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Attendance Management</h1>
        <p className="text-gray-500 mt-1">Track and manage student attendance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Class</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedClassId}
              onValueChange={setSelectedClassId}
              disabled={classes.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">{students.length}</p>
              <Button 
                onClick={saveAttendance} 
                disabled={isSaving || students.length === 0}
              >
                Save Attendance
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center my-12">
          <p>Loading attendance data...</p>
        </div>
      ) : students.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Present</TableHead>
                  <TableHead>Absent</TableHead>
                  <TableHead>Late</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(student => (
                  <TableRow key={student.id}>
                    <TableCell>{student.first_name} {student.last_name}</TableCell>
                    <TableCell>
                      <RadioGroup 
                        value={student.attendanceStatus} 
                        onValueChange={(value: string) => updateAttendance(student.id, value as AttendanceStatus)}
                        className="flex items-center space-x-1"
                      >
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="present" id={`present-${student.id}`} />
                          <Label htmlFor={`present-${student.id}`}>Present</Label>
                        </div>
                      </RadioGroup>
                    </TableCell>
                    <TableCell>
                      <RadioGroup 
                        value={student.attendanceStatus} 
                        onValueChange={(value: string) => updateAttendance(student.id, value as AttendanceStatus)}
                        className="flex items-center space-x-1"
                      >
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="absent" id={`absent-${student.id}`} />
                          <Label htmlFor={`absent-${student.id}`}>Absent</Label>
                        </div>
                      </RadioGroup>
                    </TableCell>
                    <TableCell>
                      <RadioGroup 
                        value={student.attendanceStatus} 
                        onValueChange={(value: string) => updateAttendance(student.id, value as AttendanceStatus)}
                        className="flex items-center space-x-1"
                      >
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="late" id={`late-${student.id}`} />
                          <Label htmlFor={`late-${student.id}`}>Late</Label>
                        </div>
                      </RadioGroup>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center p-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-2">
            {selectedClassId 
              ? "No students found in this class" 
              : "Please select a class to view students"}
          </p>
          {selectedClassId && (
            <p className="text-sm text-gray-400">
              Students will appear here once they're enrolled in this class
            </p>
          )}
        </div>
      )}
    </MainLayout>
  );
};

export default AttendanceManagement; 