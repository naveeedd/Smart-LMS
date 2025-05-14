import { useEffect, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Assignment, AssignmentSubmission } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, AlertCircle } from "lucide-react";

interface AssignmentWithDetails extends Assignment {
  className: string;
  courseName: string;
  submission?: AssignmentSubmission;
}

type SubmissionStatus = 'pending' | 'submitted' | 'graded';

const getStatusColor = (status: SubmissionStatus) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'submitted': return 'bg-blue-100 text-blue-800';
    case 'graded': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const StudentAssignments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithDetails | null>(null);
  const [isSubmissionDialogOpen, setIsSubmissionDialogOpen] = useState(false);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!user) return;
      setIsLoading(true);

      try {
        // First, get all classes the student is enrolled in
        const { data: studentClasses, error: classesError } = await supabase
          .from('class_students')
          .select('class_id')
          .eq('student_id', user.id);

        if (classesError) throw classesError;
        
        const classIds = studentClasses.map(sc => sc.class_id);
        
        if (classIds.length === 0) {
          setAssignments([]);
          setIsLoading(false);
          return;
        }

        // Fetch assignments for these classes
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('assignments')
          .select('*')
          .in('class_id', classIds)
          .order('due_date', { ascending: false });

        if (assignmentsError) throw assignmentsError;

        // Get class and course names for each assignment
        const assignmentsWithClassAndCourse = await Promise.all(
          assignmentsData.map(async (assignment) => {
            // Get class name
            const { data: classData, error: classFetchError } = await supabase
              .from('classes')
              .select('name')
              .eq('id', assignment.class_id)
              .single();

            if (classFetchError) throw classFetchError;

            // Get course name
            const { data: courseData, error: courseFetchError } = await supabase
              .from('courses')
              .select('name')
              .eq('id', assignment.course_id)
              .single();

            if (courseFetchError) throw courseFetchError;

            // Check if student has submitted this assignment
            const { data: submissionData, error: submissionError } = await supabase
              .from('assignment_submissions')
              .select('*')
              .eq('assignment_id', assignment.id)
              .eq('student_id', user.id)
              .maybeSingle();

            if (submissionError) throw submissionError;

            return {
              ...assignment,
              className: classData?.name || 'Unknown Class',
              courseName: courseData?.name || 'Unknown Course',
              submission: submissionData || undefined,
            };
          })
        );

        setAssignments(assignmentsWithClassAndCourse);
      } catch (error) {
        console.error('Error fetching student assignments:', error);
        toast({
          variant: "destructive",
          title: "Error fetching assignments",
          description: "Could not load your assignments. Please try again later.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignments();
  }, [user, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedAssignment) return;
    setIsSubmitting(true);

    try {
      const submission = {
        assignment_id: selectedAssignment.id,
        student_id: user.id,
        submission_text: submissionText || null,
        submission_url: submissionUrl || null,
        status: 'submitted',
        marks: null,
        feedback: null,
      };

      // If there's an existing submission, update it
      if (selectedAssignment.submission) {
        const { data, error } = await supabase
          .from('assignment_submissions')
          .update({
            submission_text: submissionText || null,
            submission_url: submissionUrl || null,
            status: 'submitted',
          })
          .eq('id', selectedAssignment.submission.id)
          .select()
          .single();

        if (error) throw error;

        // Update the assignments list with the updated submission
        setAssignments(prev => 
          prev.map(assignment => 
            assignment.id === selectedAssignment.id 
              ? { ...assignment, submission: data } 
              : assignment
          )
        );
      } else {
        // Create a new submission
        const { data, error } = await supabase
          .from('assignment_submissions')
          .insert([submission])
          .select()
          .single();

        if (error) throw error;

        // Update the assignments list with the new submission
        setAssignments(prev => 
          prev.map(assignment => 
            assignment.id === selectedAssignment.id 
              ? { ...assignment, submission: data } 
              : assignment
          )
        );
      }

      setIsSubmissionDialogOpen(false);
      setSubmissionText("");
      setSubmissionUrl("");
      
      toast({
        title: "Assignment submitted",
        description: "Your assignment has been submitted successfully.",
      });
    } catch (error) {
      console.error('Error submitting assignment:', error);
      toast({
        variant: "destructive",
        title: "Error submitting assignment",
        description: "Could not submit your assignment. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openSubmissionDialog = (assignment: AssignmentWithDetails) => {
    setSelectedAssignment(assignment);
    if (assignment.submission) {
      setSubmissionText(assignment.submission.submission_text || "");
      setSubmissionUrl(assignment.submission.submission_url || "");
    } else {
      setSubmissionText("");
      setSubmissionUrl("");
    }
    setIsSubmissionDialogOpen(true);
  };

  const filteredAssignments = assignments.filter(assignment => {
    const searchLower = searchTerm.toLowerCase();
    return (
      assignment.title.toLowerCase().includes(searchLower) ||
      assignment.className.toLowerCase().includes(searchLower) ||
      assignment.courseName.toLowerCase().includes(searchLower) ||
      (assignment.description && assignment.description.toLowerCase().includes(searchLower))
    );
  });

  // Group assignments by status
  const pendingAssignments = filteredAssignments.filter(a => 
    !a.submission || a.submission.status === 'pending'
  );
  
  const submittedAssignments = filteredAssignments.filter(a => 
    a.submission && a.submission.status === 'submitted'
  );
  
  const gradedAssignments = filteredAssignments.filter(a => 
    a.submission && a.submission.status === 'graded'
  );

  const isAssignmentOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const renderAssignmentTable = (assignments: AssignmentWithDetails[]) => (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Total Marks</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((assignment) => (
              <TableRow key={assignment.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{assignment.title}</span>
                    {isAssignmentOverdue(assignment.due_date) && 
                      !assignment.submission && (
                      <Badge variant="destructive" className="w-fit mt-1">Overdue</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{assignment.className}</TableCell>
                <TableCell>{assignment.courseName}</TableCell>
                <TableCell>
                  {new Date(assignment.due_date).toLocaleDateString()}
                </TableCell>
                <TableCell>{assignment.total_marks}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2">
                    {assignment.submission && assignment.submission.status === 'graded' ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Grade: {assignment.submission.marks}/{assignment.total_marks}
                      </Badge>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => openSubmissionDialog(assignment)}
                        disabled={isAssignmentOverdue(assignment.due_date) && !assignment.submission}
                        variant={assignment.submission ? "outline" : "default"}
                      >
                        {assignment.submission ? "Edit Submission" : "Submit"}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <MainLayout requiredRole="student">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Assignments</h1>
        <p className="text-gray-500 mt-1">View and submit your assignments</p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Input
            placeholder="Search assignments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-lg"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center my-12">
          <p>Loading your assignments...</p>
        </div>
      ) : filteredAssignments.length > 0 ? (
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="pending" className="relative">
              Pending
              {pendingAssignments.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingAssignments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="submitted">
              Submitted
              {submittedAssignments.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {submittedAssignments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="graded">
              Graded
              {gradedAssignments.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {gradedAssignments.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending">
            {pendingAssignments.length > 0 ? (
              renderAssignmentTable(pendingAssignments)
            ) : (
              <div className="text-center p-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No pending assignments</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="submitted">
            {submittedAssignments.length > 0 ? (
              renderAssignmentTable(submittedAssignments)
            ) : (
              <div className="text-center p-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No submitted assignments</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="graded">
            {gradedAssignments.length > 0 ? (
              renderAssignmentTable(gradedAssignments)
            ) : (
              <div className="text-center p-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No graded assignments yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="text-center p-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">
            {searchTerm ? "No assignments match your search" : "You have no assignments yet"}
          </p>
          {!searchTerm && (
            <p className="text-sm text-gray-400">
              Assignments will appear here once they are assigned to your classes
            </p>
          )}
        </div>
      )}

      <Dialog open={isSubmissionDialogOpen} onOpenChange={setIsSubmissionDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {selectedAssignment?.submission ? "Edit Submission" : "Submit Assignment"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAssignment && (
            <div className="mb-4">
              <h3 className="font-medium text-lg">{selectedAssignment.title}</h3>
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <Calendar className="h-4 w-4 mr-1" />
                Due: {new Date(selectedAssignment.due_date).toLocaleDateString()}
              </div>
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <Clock className="h-4 w-4 mr-1" />
                Total Marks: {selectedAssignment.total_marks}
              </div>
              {selectedAssignment.description && (
                <p className="mt-2 text-sm">
                  {selectedAssignment.description}
                </p>
              )}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid w-full items-center gap-2">
              <label htmlFor="submissionText" className="text-sm font-medium">
                Answer or Notes
              </label>
              <Textarea
                id="submissionText"
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                placeholder="Enter your answer or notes here"
                rows={6}
              />
            </div>
            
            <div className="grid w-full items-center gap-2">
              <label htmlFor="submissionUrl" className="text-sm font-medium">
                Submission URL (Optional)
              </label>
              <Input
                id="submissionUrl"
                value={submissionUrl}
                onChange={(e) => setSubmissionUrl(e.target.value)}
                placeholder="e.g., Google Drive or GitHub link"
              />
              <p className="text-xs text-gray-500">
                Include a link to your work if it's stored externally
              </p>
            </div>
            
            <div className="flex justify-between mt-4">
              <p className="text-sm text-gray-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {selectedAssignment?.submission
                  ? "You can edit your submission until it's graded"
                  : "Ensure you've included all required information"}
              </p>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsSubmissionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting 
                    ? "Submitting..." 
                    : selectedAssignment?.submission 
                      ? "Update Submission" 
                      : "Submit Assignment"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default StudentAssignments; 