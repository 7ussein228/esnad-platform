import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ==========================================================================
// ENUMS
// ==========================================================================
export const roleEnum = pgEnum("role", ["STUDENT", "TEACHER", "ADMIN"]);
export const statusEnum = pgEnum("content_status", ["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const lessonTypeEnum = pgEnum("lesson_type", ["VIDEO", "TEXT", "PDF", "MIXED"]);
export const videoStatusEnum = pgEnum("video_status", ["UPLOADING", "PROCESSING", "READY", "ERROR"]);
export const assessmentKindEnum = pgEnum("assessment_kind", ["QUIZ", "EXAM"]);
export const examTypeEnum = pgEnum("exam_type", [
  "PRACTICE",
  "MONTHLY",
  "UNIT",
  "FINAL_REVISION",
  "MOCK",
]);
export const questionTypeEnum = pgEnum("question_type", [
  "SINGLE_CHOICE",
  "TRUE_FALSE",
  "MULTIPLE_ANSWER",
]);
export const assignmentStatusEnum = pgEnum("assignment_submission_status", [
  "SUBMITTED",
  "GRADED",
  "PASSED",
  "FAILED",
]);
export const enrollmentStatusEnum = pgEnum("enrollment_status", ["ACTIVE", "REVOKED", "EXPIRED"]);
export const orderStatusEnum = pgEnum("order_status", ["PENDING", "PAID", "FAILED", "CANCELLED"]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "SUCCEEDED",
  "FAILED",
  "REFUNDED",
]);
export const reopenStatusEnum = pgEnum("reopen_status", ["PENDING", "APPROVED", "REJECTED"]);
export const announcementTargetEnum = pgEnum("announcement_target", [
  "ALL",
  "COURSE",
  "GRADE",
  "SUBJECT",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "NEW_LESSON",
  "NEW_VIDEO",
  "NEW_QUIZ",
  "NEW_EXAM",
  "NEW_ASSIGNMENT",
  "GRADE",
  "ANNOUNCEMENT",
  "ENROLLMENT",
  "PAYMENT",
  "REOPEN_REQUEST",
]);

// ==========================================================================
// USERS / AUTH
// ==========================================================================
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("STUDENT"),
  avatarUrl: text("avatar_url"),
  phone: varchar("phone", { length: 40 }),
  bio: text("bio"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  emailIdx: uniqueIndex("users_email_idx").on(t.email),
}));

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tokenIdx: uniqueIndex("password_reset_token_idx").on(t.token),
}));

// ==========================================================================
// ACADEMIC STRUCTURE (fully dynamic, admin-managed)
// ==========================================================================
export const educationSystems = pgTable("education_systems", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const academicYears = pgTable("academic_years", {
  id: uuid("id").primaryKey().defaultRandom(),
  systemId: uuid("system_id").notNull().references(() => educationSystems.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const educationalStages = pgTable("educational_stages", {
  id: uuid("id").primaryKey().defaultRandom(),
  yearId: uuid("year_id").notNull().references(() => academicYears.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const grades = pgTable("grades", {
  id: uuid("id").primaryKey().defaultRandom(),
  stageId: uuid("stage_id").notNull().references(() => educationalStages.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 160 }).notNull(),
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  slugIdx: uniqueIndex("grades_slug_idx").on(t.slug),
}));

export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 160 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 60 }).default("book"),
  color: varchar("color", { length: 30 }).default("primary"),
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  slugIdx: uniqueIndex("subjects_slug_idx").on(t.slug),
}));

export const gradeSubjects = pgTable("grade_subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  gradeId: uuid("grade_id").notNull().references(() => grades.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pairIdx: uniqueIndex("grade_subject_pair_idx").on(t.gradeId, t.subjectId),
}));

export const teacherSubjectOfferings = pgTable("teacher_subject_offerings", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: uuid("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  gradeId: uuid("grade_id").notNull().references(() => grades.id, { onDelete: "cascade" }),
  bio: text("bio"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================================================
// COURSES / MODULES / LESSONS / CONTENT
// ==========================================================================
export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: uuid("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  gradeId: uuid("grade_id").notNull().references(() => grades.id, { onDelete: "restrict" }),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "restrict" }),
  title: varchar("title", { length: 220 }).notNull(),
  slug: varchar("slug", { length: 220 }).notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  currency: varchar("currency", { length: 10 }).notNull().default("EGP"),
  status: statusEnum("status").notNull().default("DRAFT"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  slugIdx: uniqueIndex("courses_slug_idx").on(t.slug),
}));

export const courseModules = pgTable("course_modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lessons = pgTable("lessons", {
  id: uuid("id").primaryKey().defaultRandom(),
  moduleId: uuid("module_id").notNull().references(() => courseModules.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description"),
  type: lessonTypeEnum("type").notNull().default("VIDEO"),
  order: integer("order").notNull().default(0),
  status: statusEnum("status").notNull().default("DRAFT"),
  isFreePreview: boolean("is_free_preview").notNull().default(false),
  requiresPreviousCompletion: boolean("requires_previous_completion").notNull().default(true),
  textContent: text("text_content"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const videoAssets = pgTable("video_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 40 }).notNull().default("local"),
  storageKey: text("storage_key").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  originalFileName: text("original_file_name"),
  durationSeconds: integer("duration_seconds").default(0),
  sizeBytes: numeric("size_bytes", { precision: 14, scale: 0 }).default("0"),
  status: videoStatusEnum("status").notNull().default("READY"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lessonFiles = pgTable("lesson_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 220 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: varchar("file_type", { length: 40 }).notNull().default("pdf"),
  sizeBytes: numeric("size_bytes", { precision: 14, scale: 0 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const videoProgress = pgTable("video_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  positionSeconds: integer("position_seconds").notNull().default(0),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  percentage: integer("percentage").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  lastWatchedAt: timestamp("last_watched_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pairIdx: uniqueIndex("video_progress_pair_idx").on(t.userId, t.lessonId),
}));

// ==========================================================================
// ASSESSMENTS (shared model for QUIZ + EXAM)
// ==========================================================================
export const assessments = pgTable("assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: assessmentKindEnum("kind").notNull().default("QUIZ"),
  examType: examTypeEnum("exam_type"),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  moduleId: uuid("module_id").references(() => courseModules.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description"),
  passingPercentage: integer("passing_percentage").notNull().default(50),
  timeLimitMinutes: integer("time_limit_minutes").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(1),
  randomizeQuestions: boolean("randomize_questions").notNull().default(false),
  order: integer("order").notNull().default(0),
  status: statusEnum("status").notNull().default("DRAFT"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assessmentQuestions = pgTable("assessment_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  assessmentId: uuid("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  type: questionTypeEnum("type").notNull().default("SINGLE_CHOICE"),
  points: integer("points").notNull().default(1),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assessmentOptions = pgTable("assessment_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  questionId: uuid("question_id").notNull().references(() => assessmentQuestions.id, { onDelete: "cascade" }),
  optionText: text("option_text").notNull(),
  isCorrect: boolean("is_correct").notNull().default(false),
  order: integer("order").notNull().default(0),
});

export const assessmentAttempts = pgTable("assessment_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  assessmentId: uuid("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  attemptNumber: integer("attempt_number").notNull().default(1),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  score: integer("score").notNull().default(0),
  maxScore: integer("max_score").notNull().default(0),
  percentage: integer("percentage").notNull().default(0),
  passed: boolean("passed").notNull().default(false),
});

export const assessmentAnswers = pgTable("assessment_answers", {
  id: uuid("id").primaryKey().defaultRandom(),
  attemptId: uuid("attempt_id").notNull().references(() => assessmentAttempts.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").notNull().references(() => assessmentQuestions.id, { onDelete: "cascade" }),
  selectedOptionIds: jsonb("selected_option_ids").notNull().default([]),
  isCorrect: boolean("is_correct").notNull().default(false),
});

// ==========================================================================
// ASSIGNMENTS
// ==========================================================================
export const assignments = pgTable("assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  moduleId: uuid("module_id").references(() => courseModules.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 220 }).notNull(),
  instructions: text("instructions").notNull(),
  attachmentUrl: text("attachment_url"),
  deadline: timestamp("deadline", { withTimezone: true }),
  passingScore: integer("passing_score").notNull().default(50),
  maxScore: integer("max_score").notNull().default(100),
  order: integer("order").notNull().default(0),
  status: statusEnum("status").notNull().default("DRAFT"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assignmentSubmissions = pgTable("assignment_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  assignmentId: uuid("assignment_id").notNull().references(() => assignments.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  textSubmission: text("text_submission"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  grade: integer("grade"),
  feedback: text("feedback"),
  status: assignmentStatusEnum("status").notNull().default("SUBMITTED"),
  gradedAt: timestamp("graded_at", { withTimezone: true }),
  gradedBy: uuid("graded_by").references(() => users.id),
}, (t) => ({
  pairIdx: uniqueIndex("assignment_submission_pair_idx").on(t.assignmentId, t.studentId),
}));

// ==========================================================================
// ENROLLMENT / PROGRESS
// ==========================================================================
export const enrollments = pgTable("enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  status: enrollmentStatusEnum("status").notNull().default("ACTIVE"),
  source: varchar("source", { length: 30 }).notNull().default("PAYMENT"),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pairIdx: uniqueIndex("enrollment_pair_idx").on(t.studentId, t.courseId),
}));

export const studentProgress = pgTable("student_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (t) => ({
  pairIdx: uniqueIndex("student_progress_pair_idx").on(t.studentId, t.lessonId),
}));

// ==========================================================================
// REOPEN REQUESTS / ACCESS OVERRIDES
// ==========================================================================
export const reopenRequests = pgTable("reopen_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  moduleId: uuid("module_id").references(() => courseModules.id),
  lessonId: uuid("lesson_id").references(() => lessons.id),
  contentType: varchar("content_type", { length: 30 }).notNull().default("LESSON"),
  contentId: uuid("content_id").notNull(),
  reason: text("reason").notNull(),
  status: reopenStatusEnum("status").notNull().default("PENDING"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contentAccessOverrides = pgTable("content_access_overrides", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contentType: varchar("content_type", { length: 30 }).notNull().default("LESSON"),
  contentId: uuid("content_id").notNull(),
  grantedBy: uuid("granted_by").references(() => users.id),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
}, (t) => ({
  pairIdx: uniqueIndex("access_override_pair_idx").on(t.studentId, t.contentId),
}));

// ==========================================================================
// PAYMENTS (provider-agnostic)
// ==========================================================================
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("EGP"),
  status: orderStatusEnum("status").notNull().default("PENDING"),
  provider: varchar("provider", { length: 40 }).notNull().default("mock"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 40 }).notNull().default("mock"),
  providerPaymentId: text("provider_payment_id"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("EGP"),
  status: paymentStatusEnum("status").notNull().default("PENDING"),
  rawPayload: jsonb("raw_payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentTransactions = pgTable("payment_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("payment_id").notNull().references(() => payments.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull().default("CHARGE"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("PENDING"),
  providerRef: text("provider_ref"),
  idempotencyKey: varchar("idempotency_key", { length: 160 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idemIdx: uniqueIndex("payment_tx_idem_idx").on(t.idempotencyKey),
}));

// ==========================================================================
// ANNOUNCEMENTS / NOTIFICATIONS
// ==========================================================================
export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 220 }).notNull(),
  body: text("body").notNull(),
  targetType: announcementTargetEnum("target_type").notNull().default("ALL"),
  targetCourseId: uuid("target_course_id").references(() => courses.id),
  targetGradeId: uuid("target_grade_id").references(() => grades.id),
  targetSubjectId: uuid("target_subject_id").references(() => subjects.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  body: text("body"),
  link: text("link"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================================================
// HISTORICAL LEARNING FEATURES
// ==========================================================================
export const historicalTimelines = pgTable("historical_timelines", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  gradeId: uuid("grade_id").notNull().references(() => grades.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const historicalEvents = pgTable("historical_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  timelineId: uuid("timeline_id").notNull().references(() => historicalTimelines.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 220 }).notNull(),
  periodLabel: varchar("period_label", { length: 120 }),
  eventDate: varchar("event_date", { length: 120 }),
  description: text("description"),
  causes: text("causes"),
  effects: text("effects"),
  relatedLessonId: uuid("related_lesson_id").references(() => lessons.id),
  imageUrl: text("image_url"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const historicalCharacters = pgTable("historical_characters", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  gradeId: uuid("grade_id").notNull().references(() => grades.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  title: varchar("title", { length: 220 }),
  era: varchar("era", { length: 120 }),
  bio: text("bio"),
  achievements: text("achievements"),
  imageUrl: text("image_url"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const historicalDocuments = pgTable("historical_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  gradeId: uuid("grade_id").notNull().references(() => grades.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileType: varchar("file_type", { length: 40 }).notNull().default("pdf"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const historicalMaps = pgTable("historical_maps", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  gradeId: uuid("grade_id").notNull().references(() => grades.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  era: varchar("era", { length: 120 }),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================================================
// GEOGRAPHY RESOURCES
// ==========================================================================
export const geographyResources = pgTable("geography_resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  gradeId: uuid("grade_id").notNull().references(() => grades.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 40 }).notNull().default("region"),
  title: varchar("title", { length: 220 }).notNull(),
  content: text("content"),
  imageUrl: text("image_url"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================================================
// PLATFORM SETTINGS (singleton key/value store, admin managed)
// ==========================================================================
export const platformSettings = pgTable("platform_settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================================================
// AUDIT LOG
// ==========================================================================
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entity_type", { length: 60 }).notNull(),
  entityId: text("entity_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
