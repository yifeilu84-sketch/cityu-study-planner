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
  area?: string;
  geArea?: string;
  offeringUnit?: string;
  geLevel?: string;
  geTerms?: string[];
  geWithExam?: 'Yes' | 'No' | string;
  geSource?: string;
  geSourceUrl?: string;
  catalogue?: 'ug' | 'pg' | string;
  detailStatus?: 'parsed' | 'linked-unparsed' | 'needs-review' | string;
  sourceUrl?: string;
}

export interface MajorCourse {
  code: string;
  title: string;
  credits: number;
  remarks?: string;
  sourceOnly?: boolean;
  sourceUrl?: string;
  category?: 'ge' | 'college' | 'majorCore' | 'majorElective' | 'freeElective' | 'other';
}

export interface StudyPlanSemester {
  courses: { code: string; title: string; credits: number }[];
  credits: number;
}

export interface StudyPlan {
  [year: string]: { semA: StudyPlanSemester; semB: StudyPlanSemester; summer?: StudyPlanSemester };
}

export interface PostgraduateSourceStatus {
  kind: 'official-sample' | 'requirements-diy' | 'research-diy';
  label: string;
  description: string;
}

export interface PostgraduateCourseListStatus {
  kind: 'official-course-list' | 'official-title-list' | 'course-list-unconfirmed' | 'research-not-course-based';
  label: string;
  description: string;
  sourceUrl?: string;
}

export interface PostgraduateRequirementSection {
  key: string;
  title: string;
  credits?: number;
  chooseCredits?: number;
  courses?: MajorCourse[];
  note?: string;
}

export interface PostgraduateRequirements {
  summary: string;
  sections: PostgraduateRequirementSection[];
  notes?: string[];
}

export interface PostgraduateStudyPlanVariant {
  code: string;
  title: string;
  mode: string;
  sourceStatus: PostgraduateSourceStatus;
  studyPlan: StudyPlan;
}

export interface PostgraduateProgramme {
  code: string;
  title: string;
  award: string;
  type: 'taught-master' | 'research-degree' | 'professional-doctorate';
  college: string;
  department: string;
  mode: string;
  totalCredits?: number | null;
  url: string;
  curriculumUrl?: string;
  sampleScheduleUrl?: string;
  courseCatalogueUrl?: string;
  sourceStatus: PostgraduateSourceStatus;
  courseListStatus?: PostgraduateCourseListStatus;
  requirements: PostgraduateRequirements;
  allCourses: string[];
  studyPlan: StudyPlan;
  studyPlanVariants: PostgraduateStudyPlanVariant[];
  researchAreas?: string[];
  notes?: string[];
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
  studyPlanStatus?: 'official' | 'structure' | 'derived' | 'diy';
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
  studyPlanStatus?: 'official' | 'structure' | 'derived' | 'diy';
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
