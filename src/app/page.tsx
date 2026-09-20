import Link from "next/link";
import { eq, and, desc, sql, count } from "drizzle-orm";
import {
  BookOpen,
  Landmark,
  Map as MapIcon,
  ScrollText,
  PlayCircle,
  FileCheck2,
  Trophy,
  Users,
  ShieldCheck,
  Clock,
  BarChart3,
  MessageCircleQuestion,
} from "lucide-react";
import { db } from "@/db";
import { grades, subjects, courses, users, lessons, enrollments, educationalStages } from "@/db/schema";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CourseCover } from "@/components/course-cover";
import { Button, Card, Badge, SectionHeading, StatCard } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const subjectIcon: Record<string, React.ElementType> = {
  landmark: Landmark,
  scroll: ScrollText,
  map: MapIcon,
};

export default async function HomePage() {
  const [activeGrades, activeSubjects, featuredCourses, stats] = await Promise.all([
    db
      .select({ id: grades.id, name: grades.name, slug: grades.slug, stageName: educationalStages.name })
      .from(grades)
      .innerJoin(educationalStages, eq(grades.stageId, educationalStages.id))
      .where(eq(grades.isActive, true))
      .orderBy(grades.order),
    db.select().from(subjects).where(eq(subjects.isActive, true)).orderBy(subjects.order),
    db
      .select({
        id: courses.id,
        title: courses.title,
        slug: courses.slug,
        description: courses.description,
        price: courses.price,
        currency: courses.currency,
        thumbnailUrl: courses.thumbnailUrl,
        gradeName: grades.name,
        subjectName: subjects.name,
        teacherName: users.name,
      })
      .from(courses)
      .innerJoin(grades, eq(courses.gradeId, grades.id))
      .innerJoin(subjects, eq(courses.subjectId, subjects.id))
      .innerJoin(users, eq(courses.teacherId, users.id))
      .where(eq(courses.status, "PUBLISHED"))
      .orderBy(desc(courses.createdAt))
      .limit(6),
    Promise.all([
      db.select({ c: count() }).from(users).where(eq(users.role, "STUDENT")),
      db.select({ c: count() }).from(courses).where(eq(courses.status, "PUBLISHED")),
      db.select({ c: count() }).from(lessons).where(eq(lessons.status, "PUBLISHED")),
      db.select({ c: count() }).from(enrollments),
    ]),
  ]);

  const [studentsCount, coursesCount, lessonsCount, enrollmentsCount] = stats;

  return (
    <div className="pattern-motif">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "EducationalOrganization",
                name: "منصة إسناد",
                description:
                  "منصة تعليمية عربية متخصصة في الدراسات الاجتماعية والتاريخ والجغرافيا.",
                url: process.env.NEXT_PUBLIC_APP_URL ?? undefined,
              },
              {
                "@type": "WebSite",
                name: "منصة إسناد",
                inLanguage: "ar",
              },
              {
                "@type": "FAQPage",
                mainEntity: [
                  {
                    "@type": "Question",
                    name: "هل يمكنني مشاهدة الدروس أكثر من مرة؟",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "نعم، بعد الاشتراك يمكنك مشاهدة الدروس في أي وقت وعدد مرات غير محدود.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "هل تعمل المنصة على الموبايل؟",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "المنصة متجاوبة بالكامل وتعمل على المتصفح من الموبايل والتابلت وأجهزة الكمبيوتر.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "كيف يتم الدفع مقابل الكورسات المدفوعة؟",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "عبر بوابة دفع آمنة، ويتم تفعيل اشتراكك تلقائيًا فور تأكيد عملية الدفع من الخادم.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "ماذا لو فشلت في اختبار إلزامي لفتح الدرس التالي؟",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "يمكنك إعادة المحاولة حسب عدد المحاولات المسموح، أو تقديم طلب إعادة فتح للمستر.",
                    },
                  },
                ],
              },
            ],
          }),
        }}
      />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-ink-200/60 bg-gradient-to-b from-papyrus-100 to-papyrus-50 px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div className="animate-fade-in">
            <Badge tone="gold">منصة عربية متخصصة 100%</Badge>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-ink-900 sm:text-5xl">
              منصة متخصصة في <span className="text-primary-600">الدراسات والتاريخ</span> <br />
              من الإعدادي إلى البكالوريا
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-600">
              دروس فيديو حقيقية، اختبارات وامتحانات تفاعلية، واجبات، وخطوط زمنية تاريخية — كل ما يحتاجه الطالب
              للتفوق في الدراسات الاجتماعية والتاريخ والجغرافيا، مع متابعة دقيقة لتقدمه خطوة بخطوة.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/register" size="lg">ابدأ التعلم</Button>
              <Button href="/explore" size="lg" variant="outline">استكشف الكورسات</Button>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-ink-200 pt-6">
              <div>
                <p className="font-display text-2xl font-bold text-primary-700">{studentsCount[0].c}+</p>
                <p className="text-xs text-ink-500">طالب مسجل</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-primary-700">{coursesCount[0].c}</p>
                <p className="text-xs text-ink-500">كورس منشور</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-primary-700">{lessonsCount[0].c}</p>
                <p className="text-xs text-ink-500">درس تفاعلي</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="timeline-rail absolute right-6 top-0 h-full w-1 rounded-full opacity-30" />
            <div className="space-y-4">
              <Card className="mr-10 p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-700"><ScrollText className="h-5 w-5" /></span>
                  <div>
                    <p className="font-bold text-ink-800">3200 ق.م</p>
                    <p className="text-sm text-ink-500">توحيد القطرين على يد الملك مينا</p>
                  </div>
                </div>
              </Card>
              <Card className="mr-20 p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-gold-50 text-gold-700"><Landmark className="h-5 w-5" /></span>
                  <div>
                    <p className="font-bold text-ink-800">2560 ق.م</p>
                    <p className="text-sm text-ink-500">بناء هرم خوفو الأكبر بالجيزة</p>
                  </div>
                </div>
              </Card>
              <Card className="mr-6 p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-700"><MapIcon className="h-5 w-5" /></span>
                  <div>
                    <p className="font-bold text-ink-800">جغرافيا</p>
                    <p className="text-sm text-ink-500">خرائط تفاعلية لمظاهر السطح والمناخ</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ACADEMIC LEVELS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" id="levels">
        <SectionHeading eyebrow="المراحل الدراسية" title="اختر صفك الدراسي وابدأ فورًا" description="محتوى مصمم خصيصًا لكل مرحلة من الإعدادية وحتى البكالوريا." />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {activeGrades.map((g) => (
            <Link key={g.id} href={`/explore/${g.slug}`} className="group">
              <Card className="flex h-full flex-col justify-between p-5 transition hover:-translate-y-1 hover:shadow-lg">
                <span className="mb-3 inline-block w-fit rounded-lg bg-primary-50 px-2.5 py-1 text-[11px] font-bold text-primary-700">
                  {g.stageName}
                </span>
                <p className="font-display text-lg font-bold text-ink-900 group-hover:text-primary-700">{g.name}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* SUBJECTS */}
      <section className="border-y border-ink-200/60 bg-white px-4 py-16 sm:px-6" id="subjects">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="المواد الدراسية" title="ثلاث مواد، شغف واحد بالمعرفة" description="نغطي المنهج بالكامل بأسلوب شيّق ومنظم." />
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {activeSubjects.map((s) => {
              const Icon = subjectIcon[s.icon || "book"] || BookOpen;
              return (
                <Card key={s.id} className="p-6">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white">
                    <Icon className="h-6 w-6" />
                  </span>
                  <p className="mt-4 font-display text-xl font-bold text-ink-900">{s.name}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading eyebrow="لماذا منصة إسناد" title="تجربة تعليمية متكاملة من الألف إلى الياء" align="center" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: PlayCircle, title: "فيديوهات حقيقية", desc: "شرح مصور عالي الجودة لكل درس مع إمكانية المتابعة من أي جهاز." },
            { icon: FileCheck2, title: "اختبارات وامتحانات", desc: "أسئلة متنوعة وتصحيح فوري من الخادم بدون تلاعب." },
            { icon: BarChart3, title: "متابعة تقدم دقيقة", desc: "تعرف بالضبط أين وصلت في كل مادة وكل وحدة." },
            { icon: ShieldCheck, title: "وصول آمن ومنظم", desc: "فتح تدريجي للدروس بعد إتمام السابق لها لضمان الفهم." },
          ].map((f) => (
            <Card key={f.title} className="p-6">
              <f.icon className="h-8 w-8 text-gold-600" />
              <p className="mt-4 font-bold text-ink-800">{f.title}</p>
              <p className="mt-2 text-sm text-ink-500">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* FEATURED COURSES */}
      <section className="border-y border-ink-200/60 bg-papyrus-100/60 px-4 py-16 sm:px-6" id="courses">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="الكورسات المميزة" title="أحدث الكورسات المنشورة على المنصة" />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCourses.map((c) => (
              <Card key={c.id} className="flex flex-col overflow-hidden">
                <CourseCover thumbnailUrl={c.thumbnailUrl} title={c.title} />
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-2 flex gap-2">
                    <Badge tone="primary">{c.subjectName}</Badge>
                    <Badge tone="neutral">{c.gradeName}</Badge>
                  </div>
                  <p className="font-display text-lg font-bold text-ink-900">{c.title}</p>
                  <p className="mt-2 line-clamp-2 flex-1 text-sm text-ink-500">{c.description}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4">
                    <span className="text-sm text-ink-500">{c.teacherName}</span>
                    <span className="font-display text-lg font-bold text-primary-700">
                      {Number(c.price) === 0 ? "مجانًا" : formatCurrency(c.price, c.currency)}
                    </span>
                  </div>
                  <Button href={`/courses/${c.slug}`} className="mt-4 w-full">عرض الكورس</Button>
                </div>
              </Card>
            ))}
            {featuredCourses.length === 0 && (
              <p className="col-span-full text-center text-ink-500">لا توجد كورسات منشورة بعد.</p>
            )}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" id="how-it-works">
        <SectionHeading eyebrow="كيف تعمل المنصة" title="4 خطوات بسيطة نحو التفوق" align="center" />
        <div className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { n: "1", title: "اختر صفك ومادتك", desc: "تصفح الصفوف الدراسية واختر المادة المناسبة." },
            { n: "2", title: "اشترك في الكورس", desc: "سجل في الكورس المجاني أو ادفع بأمان لفتح الكورس المدفوع." },
            { n: "3", title: "تعلم بالفيديو والملفات", desc: "شاهد الدروس، حمّل الملفات، وتابع تقدمك أولًا بأول." },
            { n: "4", title: "اختبر نفسك وتقدم", desc: "حل الاختبارات والامتحانات والواجبات وانتقل للدرس التالي." },
          ].map((s) => (
            <div key={s.n} className="text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-600 font-display text-xl font-bold text-white">
                {s.n}
              </span>
              <p className="mt-4 font-bold text-ink-800">{s.title}</p>
              <p className="mt-2 text-sm text-ink-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TEACHER SECTION */}
      <section className="border-y border-ink-200/60 bg-ink-900 px-4 py-16 text-papyrus-50 sm:px-6">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
          <div>
            <Badge tone="gold">بإشراف مستر واحد</Badge>
            <h2 className="mt-4 font-display text-3xl font-bold">هتذاكر مباشرة مع مستر المادة</h2>
            <p className="mt-4 text-papyrus-200/90">
              المنصة دي لمدرس واحد متخصص في الدراسات والتاريخ والجغرافيا —
              كل الكورسات والفيديوهات والاختبارات من إعداد ومتابعة المستر بنفسه.
            </p>
            <Button href="/register" size="lg" variant="gold" className="mt-6">سجل كطالب الآن</Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Users, label: "إدارة الطلاب" },
              { icon: PlayCircle, label: "رفع فيديوهات" },
              { icon: FileCheck2, label: "إنشاء اختبارات" },
              { icon: BarChart3, label: "تحليلات حقيقية" },
            ].map((f) => (
              <div key={f.label} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
                <f.icon className="mx-auto h-7 w-7 text-gold-300" />
                <p className="mt-3 text-sm font-semibold">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STUDENT PROGRESS / EXAM PREP */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2">
          <Card className="p-8">
            <Trophy className="h-8 w-8 text-gold-600" />
            <p className="mt-4 font-display text-xl font-bold text-ink-900">متابعة تقدم الطالب</p>
            <p className="mt-2 text-sm text-ink-500">
              كل طالب يمتلك لوحة تحكم توضح نسبة إنجازه في كل كورس، آخر درس شاهده، ونتائج اختباراته أولًا بأول —
              وتتزامن البيانات تلقائيًا بين جميع أجهزته.
            </p>
          </Card>
          <Card className="p-8">
            <Clock className="h-8 w-8 text-primary-600" />
            <p className="mt-4 font-display text-xl font-bold text-ink-900">الاستعداد للامتحانات</p>
            <p className="mt-2 text-sm text-ink-500">
              امتحانات دورية وشهرية ونهائية بنظام مؤقت وعشوائية للأسئلة، مع نتيجة فورية ومراجعة كاملة للإجابات.
            </p>
          </Card>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-y border-ink-200/60 bg-papyrus-100/60 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="آراء الطلاب" title="ماذا يقول طلابنا عن المنصة" align="center" />
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              { name: "يوسف عبد الله", grade: "الصف الثالث الإعدادي", text: "الشرح بسيط جدًا والاختبارات بعد كل درس ساعدتني أثبت المعلومة." },
              { name: "منة الله كمال", grade: "الصف الأول الثانوي", text: "بحب طريقة عرض الخطوط الزمنية والخرائط، بتفرق معايا جدًا في المذاكرة." },
              { name: "أحمد ماهر", grade: "الثانية بكالوريا", text: "المتابعة من الموبايل والكمبيوتر بيرجع بنفس المكان اللي وقفت عنده، حاجة ممتازة." },
            ].map((t) => (
              <Card key={t.name} className="p-6">
                <p className="text-sm leading-relaxed text-ink-600">&ldquo;{t.text}&rdquo;</p>
                <p className="mt-4 font-bold text-ink-800">{t.name}</p>
                <p className="text-xs text-ink-500">{t.grade}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6" id="faq">
        <SectionHeading eyebrow="الأسئلة الشائعة" title="أسئلة قد تدور في ذهنك" align="center" />
        <div className="mt-8 space-y-4">
          {[
            { q: "هل يمكنني مشاهدة الدروس أكثر من مرة؟", a: "نعم، بعد الاشتراك يمكنك مشاهدة الدروس في أي وقت وعدد مرات غير محدود." },
            { q: "هل تعمل المنصة على الموبايل؟", a: "المنصة متجاوبة بالكامل وتعمل على المتصفح من الموبايل والتابلت وأجهزة الكمبيوتر." },
            { q: "كيف يتم الدفع مقابل الكورسات المدفوعة؟", a: "عبر بوابة دفع آمنة، ويتم تفعيل اشتراكك تلقائيًا فور تأكيد عملية الدفع من الخادم." },
            { q: "ماذا لو فشلت في اختبار إلزامي لفتح الدرس التالي؟", a: "يمكنك إعادة المحاولة حسب عدد المحاولات المسموح، أو تقديم طلب إعادة فتح للمستر." },
          ].map((f) => (
            <details key={f.q} className="group rounded-2xl border border-ink-200 bg-white p-5 open:shadow-md">
              <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-ink-800">
                {f.q}
                <MessageCircleQuestion className="h-5 w-5 text-primary-500 group-open:rotate-12" />
              </summary>
              <p className="mt-3 text-sm text-ink-500">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-l from-primary-700 to-primary-900 px-8 py-14 text-center text-white shadow-xl">
          <h2 className="font-display text-3xl font-bold">جاهز تبدأ رحلتك التعليمية؟</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-100">
            انضم الآن إلى {enrollmentsCount[0].c}+ عملية تسجيل واستفد من محتوى تعليمي متخصص في الدراسات والتاريخ
            والجغرافيا.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button href="/register" size="lg" variant="gold">ابدأ التعلم الآن</Button>
            <Button href="/explore" size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10">
              استكشف الكورسات
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
