import "dotenv/config";
import { db, pool } from "@/db";
import bcrypt from "bcryptjs";
import {
  users,
  educationSystems,
  academicYears,
  educationalStages,
  grades,
  subjects,
  gradeSubjects,
  courses,
  courseModules,
  lessons,
  assessments,
  assessmentQuestions,
  assessmentOptions,
  assignments,
  enrollments,
  historicalTimelines,
  historicalEvents,
  historicalCharacters,
  geographyResources,
  announcements,
} from "@/db/schema";
import { slugify } from "@/lib/utils";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🌱 Seeding منصة إسناد ...");

  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0) {
    console.log("قاعدة البيانات تحتوي على بيانات بالفعل. تخطي الـ seed.");
    return;
  }

  const passwordHash = await bcrypt.hash("password123", 10);

  // Fixed single-teacher account — override via ENV in production.
  // TEACHER_EMAIL / TEACHER_PASSWORD / TEACHER_NAME
  const teacherEmail = process.env.TEACHER_EMAIL || "teacher@esnad.com";
  const teacherPassword = process.env.TEACHER_PASSWORD || "password123";
  const teacherName = process.env.TEACHER_NAME || "أ. محمد الأثري";
  const teacherPasswordHash = await bcrypt.hash(teacherPassword, 10);

  const [admin] = await db
    .insert(users)
    .values({ name: "مدير المنصة", email: "admin@esnad.com", passwordHash, role: "ADMIN" })
    .returning();

  const [teacher] = await db
    .insert(users)
    .values({ name: teacherName, email: teacherEmail, passwordHash: teacherPasswordHash, role: "TEACHER", bio: "مدرس الدراسات الاجتماعية والتاريخ والجغرافيا — الحساب الرسمي الوحيد للمنصة" })
    .returning();

  const [student] = await db
    .insert(users)
    .values({ name: "سارة أحمد", email: "student@esnad.com", passwordHash, role: "STUDENT" })
    .returning();

  const [system] = await db
    .insert(educationSystems)
    .values({ name: "نظام التعليم المصري", description: "النظام التعليمي العام لجمهورية مصر العربية", order: 0 })
    .returning();

  const [year] = await db
    .insert(academicYears)
    .values({ systemId: system.id, name: "العام الدراسي 2025 / 2026", order: 0 })
    .returning();

  const [preparatory] = await db
    .insert(educationalStages)
    .values({ yearId: year.id, name: "المرحلة الإعدادية", order: 0 })
    .returning();

  const [secondary] = await db
    .insert(educationalStages)
    .values({ yearId: year.id, name: "المرحلة الثانوية", order: 1 })
    .returning();

  const gradeNames: Array<{ name: string; stage: string }> = [
    { name: "الصف الأول الإعدادي", stage: "prep" },
    { name: "الصف الثاني الإعدادي", stage: "prep" },
    { name: "الصف الثالث الإعدادي", stage: "prep" },
    { name: "الصف الأول الثانوي", stage: "sec" },
    { name: "الصف الثاني الثانوي", stage: "sec" },
    { name: "الصف الثالث الثانوي", stage: "sec" },
    { name: "الأولى بكالوريا", stage: "sec" },
    { name: "الثانية بكالوريا", stage: "sec" },
  ];

  const createdGrades = [];
  for (let i = 0; i < gradeNames.length; i++) {
    const g = gradeNames[i];
    const [row] = await db
      .insert(grades)
      .values({
        stageId: g.stage === "prep" ? preparatory.id : secondary.id,
        name: g.name,
        slug: slugify(g.name),
        order: i,
      })
      .returning();
    createdGrades.push(row);
  }

  const subjectDefs = [
    { name: "الدراسات الاجتماعية", icon: "landmark", color: "primary", description: "مادة الدراسات الاجتماعية المتكاملة" },
    { name: "التاريخ", icon: "scroll", color: "gold", description: "تاريخ مصر والعالم القديم والحديث" },
    { name: "الجغرافيا", icon: "map", color: "primary", description: "الجغرافيا الطبيعية والبشرية والاقتصادية" },
  ];

  const createdSubjects = [];
  for (const s of subjectDefs) {
    const [row] = await db.insert(subjects).values({ ...s, slug: slugify(s.name) }).returning();
    createdSubjects.push(row);
  }

  const gradeSubjectRows = [];
  for (const grade of createdGrades) {
    for (const subject of createdSubjects) {
      const [row] = await db.insert(gradeSubjects).values({ gradeId: grade.id, subjectId: subject.id }).returning();
      gradeSubjectRows.push(row);
    }
  }

  // Sample published course: أولى إعدادي - الدراسات الاجتماعية
  const firstPrep = createdGrades[0];
  const socialStudies = createdSubjects[0];
  const historySubject = createdSubjects[1];
  const geoSubject = createdSubjects[2];

  const gsLink = gradeSubjectRows.find((r) => r.gradeId === firstPrep.id && r.subjectId === socialStudies.id)!;

  const [course] = await db
    .insert(courses)
    .values({
      teacherId: teacher.id,
      gradeId: firstPrep.id,
      subjectId: socialStudies.id,
      title: "شرح منهج الدراسات الاجتماعية - الصف الأول الإعدادي",
      slug: slugify("شرح منهج الدراسات الاجتماعية الصف الأول الإعدادي"),
      description: "شرح تفصيلي كامل لمنهج الدراسات الاجتماعية للصف الأول الإعدادي يشمل التاريخ القديم والجغرافيا الطبيعية مع مراجعات واختبارات دورية.",
      price: "199",
      currency: "EGP",
      status: "PUBLISHED",
    })
    .returning();

  const [freeCourse] = await db
    .insert(courses)
    .values({
      teacherId: teacher.id,
      gradeId: firstPrep.id,
      subjectId: historySubject.id,
      title: "مقدمة في تاريخ مصر القديمة (مجانًا)",
      slug: slugify("مقدمة في تاريخ مصر القديمة مجانا"),
      description: "كورس تمهيدي مجاني يقدم لمحة عامة عن أهم عصور التاريخ المصري القديم.",
      price: "0",
      currency: "EGP",
      status: "PUBLISHED",
    })
    .returning();

  await db.insert(courses).values({
    teacherId: teacher.id,
    gradeId: createdGrades[3].id,
    subjectId: geoSubject.id,
    title: "جغرافيا الوطن العربي - الصف الأول الثانوي",
    slug: slugify("جغرافيا الوطن العربي الصف الأول الثانوي"),
    description: "دراسة شاملة لجغرافيا الوطن العربي: المناخ، السكان، والموارد الطبيعية.",
    price: "249",
    currency: "EGP",
    status: "DRAFT",
  });

  const [module1] = await db
    .insert(courseModules)
    .values({ courseId: course.id, title: "الوحدة الأولى: مصر الفرعونية", order: 0 })
    .returning();

  const [module2] = await db
    .insert(courseModules)
    .values({ courseId: course.id, title: "الوحدة الثانية: الجغرافيا الطبيعية لمصر", order: 1 })
    .returning();

  const [lesson1] = await db
    .insert(lessons)
    .values({
      moduleId: module1.id,
      title: "الدرس الأول: قدماء المصريين ونشأة الحضارة",
      description: "تعرف على أسباب نشأة الحضارة المصرية القديمة على ضفاف النيل.",
      type: "VIDEO",
      order: 0,
      status: "PUBLISHED",
      isFreePreview: true,
      textContent: "في هذا الدرس نتعرف على أهم عوامل قيام الحضارة المصرية القديمة، ودور نهر النيل في ذلك.",
    })
    .returning();

  const [lesson2] = await db
    .insert(lessons)
    .values({
      moduleId: module1.id,
      title: "الدرس الثاني: عصر الدولة القديمة وبناء الأهرامات",
      type: "VIDEO",
      order: 1,
      status: "PUBLISHED",
      isFreePreview: false,
    })
    .returning();

  await db.insert(lessons).values({
    moduleId: module2.id,
    title: "الدرس الأول: مظاهر السطح في مصر",
    type: "TEXT",
    order: 0,
    status: "PUBLISHED",
    textContent: "تنقسم مظاهر السطح في مصر إلى: وادي النيل ودلتاه، الصحراء الغربية، الصحراء الشرقية، وشبه جزيرة سيناء.",
  });

  const [quiz] = await db
    .insert(assessments)
    .values({
      kind: "QUIZ",
      courseId: course.id,
      moduleId: module1.id,
      lessonId: lesson1.id,
      title: "اختبار الدرس الأول: نشأة الحضارة المصرية",
      description: "اختبار قصير لتثبيت المعلومات",
      passingPercentage: 60,
      timeLimitMinutes: 10,
      maxAttempts: 3,
      status: "PUBLISHED",
    })
    .returning();

  const [q1] = await db
    .insert(assessmentQuestions)
    .values({ assessmentId: quiz.id, questionText: "ما هو النهر الذي قامت حوله الحضارة المصرية القديمة؟", type: "SINGLE_CHOICE", points: 1, order: 0 })
    .returning();
  await db.insert(assessmentOptions).values([
    { questionId: q1.id, optionText: "نهر النيل", isCorrect: true, order: 0 },
    { questionId: q1.id, optionText: "نهر الفرات", isCorrect: false, order: 1 },
    { questionId: q1.id, optionText: "نهر دجلة", isCorrect: false, order: 2 },
  ]);

  const [q2] = await db
    .insert(assessmentQuestions)
    .values({ assessmentId: quiz.id, questionText: "توحدت مصر في عهد الملك مينا.", type: "TRUE_FALSE", points: 1, order: 1 })
    .returning();
  await db.insert(assessmentOptions).values([
    { questionId: q2.id, optionText: "صح", isCorrect: true, order: 0 },
    { questionId: q2.id, optionText: "خطأ", isCorrect: false, order: 1 },
  ]);

  await db.insert(assessments).values({
    kind: "EXAM",
    examType: "UNIT",
    courseId: course.id,
    moduleId: module1.id,
    title: "امتحان الوحدة الأولى: مصر الفرعونية",
    description: "امتحان شامل على الوحدة الأولى",
    passingPercentage: 50,
    timeLimitMinutes: 30,
    maxAttempts: 2,
    status: "PUBLISHED",
  });

  await db.insert(assignments).values({
    courseId: course.id,
    moduleId: module1.id,
    title: "واجب: ارسم خريطة ذهنية عن عوامل قيام الحضارة المصرية",
    instructions: "قم برسم خريطة ذهنية توضح أهم 5 عوامل ساعدت على قيام الحضارة المصرية القديمة، وارفعها كملف صورة أو PDF.",
    passingScore: 50,
    maxScore: 100,
    status: "PUBLISHED",
  });

  await db.insert(enrollments).values({ studentId: student.id, courseId: course.id, source: "MANUAL" });
  await db.insert(enrollments).values({ studentId: student.id, courseId: freeCourse.id, source: "FREE" });

  const [timeline] = await db
    .insert(historicalTimelines)
    .values({ subjectId: historySubject.id, gradeId: firstPrep.id, title: "الخط الزمني لمصر الفرعونية", order: 0 })
    .returning();

  await db.insert(historicalEvents).values([
    {
      timelineId: timeline.id,
      title: "توحيد القطرين",
      periodLabel: "بداية عصر الأسرات",
      eventDate: "حوالي 3200 ق.م",
      description: "قام الملك مينا (نارمر) بتوحيد مصر العليا والسفلى تحت حكم واحد.",
      causes: "الرغبة في توحيد الموارد وتأمين حدود البلاد",
      effects: "قيام أول دولة مركزية موحدة في التاريخ",
      order: 0,
    },
    {
      timelineId: timeline.id,
      title: "بناء هرم خوفو",
      periodLabel: "عصر الدولة القديمة",
      eventDate: "حوالي 2560 ق.م",
      description: "تم بناء الهرم الأكبر بالجيزة في عهد الملك خوفو.",
      order: 1,
    },
  ]);

  await db.insert(historicalCharacters).values([
    {
      subjectId: historySubject.id,
      gradeId: firstPrep.id,
      name: "الملك مينا (نارمر)",
      title: "موحد القطرين",
      era: "بداية عصر الأسرات",
      bio: "أول ملك وحّد مصر العليا والسفلى وأسس أول أسرة حاكمة في التاريخ المصري.",
      order: 0,
    },
  ]);

  await db.insert(geographyResources).values([
    {
      subjectId: geoSubject.id,
      gradeId: firstPrep.id,
      category: "region",
      title: "وادي النيل ودلتاه",
      content: "يمثل وادي النيل ودلتاه الشريان الرئيسي للحياة في مصر، حيث يتركز به أغلب السكان والأنشطة الزراعية.",
      order: 0,
    },
  ]);

  await db.insert(announcements).values({
    authorId: teacher.id,
    title: "مرحبًا بكم في كورس الدراسات الاجتماعية",
    body: "أهلًا بجميع الطلاب، تم نشر الوحدة الأولى كاملة مع الاختبارات، بالتوفيق للجميع!",
    targetType: "COURSE",
    targetCourseId: course.id,
  });

  console.log("✅ تم إنشاء بيانات تجريبية بنجاح");
  console.log("----------------------------------------");
  console.log("Admin:   admin@esnad.com   / password123");
  console.log(`Teacher (fixed): ${teacherEmail} / ${process.env.TEACHER_PASSWORD ? "*** from ENV ***" : "password123"}`);
  console.log("Student: student@esnad.com / password123");
  console.log("----------------------------------------");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
