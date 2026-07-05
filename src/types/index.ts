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

export interface AcademicStudent {
  name: string;
  topic?: string;
}

export interface AcademicPublication {
  title: string;
  journal?: string;
  year?: number | null;
  cites?: number | null;
  url?: string;
}

export interface AcademicProfile {
  id: string;
  sourceKey: string;
  name: string;
  nameCN?: string;
  title?: string;
  background?: string;
  interests: string[];
  ugWelcome: boolean;
  students: AcademicStudent[];
  studentCount: number;
  phdStudents?: string[];
  topPublications: AcademicPublication[];
  publicationCount: number;
  scholarUrl?: string;
  googleScholar?: string;
  url?: string;
  collegeId: string;
  collegeName: string;
  collegeNameEn: string;
  departmentId: string;
  departmentName: string;
  departmentNameEn: string;
  departmentUrl?: string;
  searchText?: string;
}

export interface AcademicDepartmentDirectory {
  id: string;
  name: string;
  nameEn: string;
  url?: string;
  profileIds: string[];
}

export interface AcademicCollegeDirectory {
  id: string;
  name: string;
  nameEn: string;
  icon?: string;
  url?: string;
  departments: AcademicDepartmentDirectory[];
}

export interface AcademicProfilesData {
  summary: {
    sourceRepository: string;
    sourceUrl: string;
    sourceFile: string;
    collegeCount: number;
    departmentCount: number;
    professorCount: number;
    studentCount: number;
    publicationCount: number;
  };
  colleges: AcademicCollegeDirectory[];
  profiles: AcademicProfile[];
}

export interface MajorRequirements {
  // Nested structure (official PDF majors)
  gatewayEducation?: { credits: number | string; courses: MajorCourse[] } | number | string;
  college?: { credits: number | string; courses: MajorCourse[] } | number | string;
  collegeRequirement?: { credits: number | string; courses: MajorCourse[] } | number | string;
  majorCore?: { credits: number | string; courses: MajorCourse[] } | number | string;
  majorElectives?: { credits: number | string; courses: MajorCourse[]; choose?: number; chooseCredits?: number } | number | string;
  majorElective?: { credits: number | string; courses: MajorCourse[] } | number | string;
  freeElectives?: { credits: number | string; note?: string } | number | string;
  freeElective?: { credits: number | string; note?: string } | number | string;
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
