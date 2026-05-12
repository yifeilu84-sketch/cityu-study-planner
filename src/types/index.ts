export interface Course {
  code: string;
  title: string;
  credits: number;
  department: string;
  prerequisites: string[];
  prerequisitesRaw?: string;
  semester: string;
  assessment: {
    continuous?: string;
    exam?: string;
    examDuration?: string;
    details?: string;
    minCAPass?: string;
    minExamPass?: string;
    breakdown?: string;
  };
  pdfUrl: string;
  courseUrl: string;
  description?: string;
}

export interface MajorCourse {
  code: string;
  title: string;
  credits: number;
  remarks?: string;
  category?: 'ge' | 'college' | 'majorCore' | 'majorElective' | 'freeElective' | 'other';
}

export interface StudyPlanSemester {
  courses: { code: string; title: string; credits: number }[];
  credits: number;
}

export interface StudyPlan {
  year1: { semA: StudyPlanSemester; semB: StudyPlanSemester; summer?: StudyPlanSemester };
  year2: { semA: StudyPlanSemester; semB: StudyPlanSemester; summer?: StudyPlanSemester };
  year3: { semA: StudyPlanSemester; semB: StudyPlanSemester; summer?: StudyPlanSemester };
  year4: { semA: StudyPlanSemester; semB: StudyPlanSemester; summer?: StudyPlanSemester };
}

export interface MajorRequirements {
  // Nested structure (official PDF majors)
  gatewayEducation?: { credits: number; courses: MajorCourse[] } | number;
  college?: { credits: number; courses: MajorCourse[] } | number;
  collegeRequirement?: { credits: number; courses: MajorCourse[] } | number;
  majorCore?: { credits: number; courses: MajorCourse[] } | number;
  majorElectives?: { credits: number; courses: MajorCourse[]; choose?: number; chooseCredits?: number } | number;
  majorElective?: { credits: number; courses: MajorCourse[] } | number;
  freeElectives?: { credits: number; note?: string } | number;
}

export interface Stream {
  code: string;
  name: string;
  description?: string;
  requirements?: MajorRequirements;
  studyPlan?: StudyPlan;
  allCourses?: string[];
  notes?: string[];
  totalCredits?: number;
}

export interface Major {
  code: string;
  title: string;
  degree: string;
  totalCredits: number;
  department: string;
  college: string;
  url: string;
  requirements: MajorRequirements;
  studyPlan?: StudyPlan;
  allCourses: string[];
  streams?: Stream[];
  notes?: string[];
}

export interface Department {
  id: string;
  name: string;
  majors: Major[];
}

export interface College {
  id: string;
  name: string;
  type?: 'college' | 'school';
  departments: Department[];
  majors?: { code: string; title: string; url: string; degree: string }[];
}

export interface CourseCatalog {
  [code: string]: Course;
}

export interface MajorIndex {
  colleges: College[];
}
