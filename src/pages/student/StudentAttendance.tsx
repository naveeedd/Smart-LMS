import { useEffect, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AttendanceRecord, Class } from "@/types";
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
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { CalendarIcon, CheckCircle, XCircle, Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";

interface AttendanceWithDetails extends AttendanceRecord {
  className: string;
}

const StudentAttendance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceWithDetails[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const recordsPerPage = 10;
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    total: 0,
  });
  
  useEffect(() => {
    const fetchClasses = async () => {
      if (!user) return;
      
      try {
        // Get classes student is enrolled in
        const { data: studentClasses, error: classesError } = await supabase
          .from('class_students')
          .select('class_id')
          .eq('student_id', user.id);

        if (classesError) throw classesError;
        
        const classIds = studentClasses.map(sc => sc.class_id);
        
        if (classIds.length > 0) {
          const { data: classesData, error: classFetchError } = await supabase
            .from('classes')
            .select('*')
            .in('id', classIds);

          if (classFetchError) throw classFetchError;
          setClasses(classesData || []);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
        toast({
          variant: "destructive",
          title: "Error loading classes",
          description: "Could not load your classes. Please try again.",
        });
      }
    };

    fetchClasses();
  }, [user, toast]);

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!user) return;
      setIsLoading(true);

      try {
        let query = supabase
          .from('attendance_records')
          .select('*')
          .eq('student_id', user.id);
        
        // Apply class filter if not "all"
        if (selectedClassId !== "all") {
          query = query.eq('class_id', selectedClassId);
        }
        
        // Apply month filter
        const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
        const endOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
        
        query = query
          .gte('date', startOfMonth.toISOString().split('T')[0])
          .lte('date', endOfMonth.toISOString().split('T')[0]);
          
        // Execute query
        const { data: records, error: recordsError } = await query
          .order('date', { ascending: false });

        if (recordsError) throw recordsError;
        
        // Get classes for each attendance record
        const recordsWithClassNames = await Promise.all(
          records.map(async (record) => {
            const { data: classData, error: classFetchError } = await supabase
              .from('classes')
              .select('name')
              .eq('id', record.class_id)
              .single();

            if (classFetchError) throw classFetchError;
            
            return {
              ...record,
              className: classData?.name || 'Unknown Class',
            };
          })
        );
        
        setAttendanceRecords(recordsWithClassNames);
        setTotalPages(Math.max(1, Math.ceil(recordsWithClassNames.length / recordsPerPage)));
        
        // Reset to first page when filters change
        setPage(1);
        
        // Calculate stats
        const presentCount = recordsWithClassNames.filter(r => r.status === 'present').length;
        const absentCount = recordsWithClassNames.filter(r => r.status === 'absent').length;
        const lateCount = recordsWithClassNames.filter(r => r.status === 'late').length;
        
        setStats({
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          total: recordsWithClassNames.length,
        });
      } catch (error) {
        console.error('Error fetching attendance records:', error);
        toast({
          variant: "destructive",
          title: "Error loading attendance",
          description: "Could not load your attendance records. Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendance();
  }, [user, selectedClassId, selectedMonth, toast]);

  const paginatedRecords = attendanceRecords.slice(
    (page - 1) * recordsPerPage,
    page * recordsPerPage
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Present</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      case 'late':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Late</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getAttendancePercentage = () => {
    if (stats.total === 0) return 0;
    // Count present and half for late
    const effectivePresent = stats.present + (stats.late * 0.5);
    return Math.round((effectivePresent / stats.total) * 100);
  };

  return (
    <MainLayout requiredRole="student">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Attendance</h1>
        <p className="text-gray-500 mt-1">View your attendance records</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
                <SelectItem value="all">All Classes</SelectItem>
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
            <CardTitle className="text-base">Select Month</CardTitle>
          </CardHeader>
          <CardContent>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedMonth, "MMMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="month"
                  selected={selectedMonth}
                  onSelect={(date) => date && setSelectedMonth(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attendance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress value={getAttendancePercentage()} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>{getAttendancePercentage()}%</span>
                <span>100%</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Present: {stats.present}</span>
                </div>
                <div className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Absent: {stats.absent}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Late: {stats.late}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center my-12">
          <p>Loading attendance records...</p>
        </div>
      ) : paginatedRecords.length > 0 ? (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {new Date(record.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{record.className}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .map((p, i, arr) => {
                      // Add ellipsis if there are skipped pages
                      if (i > 0 && p - arr[i - 1] > 1) {
                        return (
                          <React.Fragment key={`ellipsis-${p}`}>
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                            <PaginationItem>
                              <PaginationLink 
                                onClick={() => setPage(p)}
                                isActive={page === p}
                              >
                                {p}
                              </PaginationLink>
                            </PaginationItem>
                          </React.Fragment>
                        );
                      }
                      return (
                        <PaginationItem key={p}>
                          <PaginationLink 
                            onClick={() => setPage(p)}
                            isActive={page === p}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      ) : (
        <div className="text-center p-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">
            No attendance records found for the selected filters
          </p>
          <p className="text-sm text-gray-400">
            Try selecting a different class or month, or check back later when your attendance has been recorded
          </p>
        </div>
      )}
    </MainLayout>
  );
};

export default StudentAttendance; 