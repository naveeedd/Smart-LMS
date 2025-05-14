import { useEffect, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Settings {
  allow_student_registration: boolean;
  allow_teacher_registration: boolean;
  max_students_per_course: number;
  max_courses_per_teacher: number;
  system_name: string;
  system_email: string;
}

const Settings = () => {
  const [settings, setSettings] = useState<Settings>({
    allow_student_registration: true,
    allow_teacher_registration: true,
    max_students_per_course: 30,
    max_courses_per_teacher: 5,
    system_name: "Learning Management System",
    system_email: "admin@example.com",
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .single();

      if (error) throw error;
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to fetch settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const { error } = await supabase
        .from("settings")
        .upsert([settings], { onConflict: "id" });

      if (error) throw error;

      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    }
  };

  if (isLoading) {
    return (
      <MainLayout requiredRole="admin">
        <div>Loading...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout requiredRole="admin">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">System Settings</h1>
        <Button onClick={handleSaveSettings}>Save Changes</Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Registration Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="student-registration">Allow Student Registration</Label>
              <Switch
                id="student-registration"
                checked={settings.allow_student_registration}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, allow_student_registration: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="teacher-registration">Allow Teacher Registration</Label>
              <Switch
                id="teacher-registration"
                checked={settings.allow_teacher_registration}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, allow_teacher_registration: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Course Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="max-students">Maximum Students per Course</Label>
              <Input
                id="max-students"
                type="number"
                value={settings.max_students_per_course}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    max_students_per_course: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-courses">Maximum Courses per Teacher</Label>
              <Input
                id="max-courses"
                type="number"
                value={settings.max_courses_per_teacher}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    max_courses_per_teacher: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="system-name">System Name</Label>
              <Input
                id="system-name"
                value={settings.system_name}
                onChange={(e) =>
                  setSettings({ ...settings, system_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="system-email">System Email</Label>
              <Input
                id="system-email"
                type="email"
                value={settings.system_email}
                onChange={(e) =>
                  setSettings({ ...settings, system_email: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Settings; 