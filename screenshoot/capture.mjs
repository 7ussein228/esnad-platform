import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "pages");
const BASE = process.env.SITE_URL || "http://localhost:3000";

const STUDENT = { email: "student@esnad.com", password: "password123" };
const TEACHER = { email: "teacher@esnad.com", password: "password123" };

async function shot(page, name, url) {
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, name), fullPage: true });
    console.log("OK", name);
  } catch (e) {
    console.log("FAIL", name, String(e).split("\n")[0]);
  }
}

async function loginAs(page, creds) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 45000 });
  await page.fill('input[name="email"]', creds.email);
  await page.fill('input[name="password"]', creds.password);
  await Promise.all([
    page.waitForURL("**/dashboard**", { timeout: 20000 }).catch(() => {}),
    page.click('form[action] button[type="submit"], form button[type="submit"]'),
  ]);
  await page.waitForTimeout(1500);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // ---------- Public pages (no login) ----------
  await shot(page, "01-home.png", `${BASE}/`);
  await shot(page, "02-explore.png", `${BASE}/explore`);
  await shot(page, "03-login.png", `${BASE}/login`);
  await shot(page, "04-register-step1.png", `${BASE}/register`);

  // Register step 2 (OTP) with staged demo data
  await page.goto(`${BASE}/register/verify`, { waitUntil: "networkidle" }).catch(() => {});
  await page.evaluate(() => {
    sessionStorage.setItem(
      "esnad_pending_registration",
      JSON.stringify({
        name: "طالب تجريبي",
        gradeId: "00000000-0000-0000-0000-000000000000",
        gradeName: "الصف الأول الإعدادي",
        email: "demo-student@mail.com",
        phone: "+201000000000",
        password: "password123",
      })
    );
  });
  await shot(page, "05-register-otp.png", `${BASE}/register/verify`);

  // Public course page (first featured course on home)
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" }).catch(() => {});
  const courseHref = await page.getAttribute('a[href^="/courses/"]', "href").catch(() => null);
  if (courseHref) await shot(page, "06-course-public.png", `${BASE}${courseHref}`);

  // ---------- Student flow ----------
  await loginAs(page, STUDENT);
  const studentUrl = page.url();
  if (studentUrl.includes("complete-profile")) {
    await shot(page, "07-complete-profile.png", studentUrl);
    // Complete the profile so the rest of the tour works
    try {
      const firstGrade = await page.$eval('select[name="gradeId"] option[value]:not([value=""])', (el) => el.value).catch(() => null);
      if (firstGrade) await page.selectOption('select[name="gradeId"]', firstGrade);
      await page.fill('input[name="phone"]', "+201055500001");
      await Promise.all([
        page.waitForURL("**/dashboard**", { timeout: 20000 }).catch(() => {}),
        page.click('form button[type="submit"]'),
      ]);
      await page.waitForTimeout(1500);
    } catch (e) {
      console.log("complete-profile fill skipped:", String(e).split("\n")[0]);
    }
  }
  await shot(page, "08-student-overview.png", `${BASE}/dashboard/student`);
  await shot(page, "09-student-courses.png", `${BASE}/dashboard/student/courses`);

  // First enrolled course that actually has lessons/quizzes
  await page.goto(`${BASE}/dashboard/student/courses`, { waitUntil: "networkidle" }).catch(() => {});
  const courseHrefs = await page.$$eval('a[href^="/dashboard/student/courses/"]', (els) => els.map((e) => e.href)).catch(() => []);
  let lessonHref = null;
  let quizHref = null;
  let detailUrl = null;
  for (const href of courseHrefs) {
    await page.goto(href, { waitUntil: "networkidle" }).catch(() => {});
    const found = await page.evaluate(() => ({
      lesson: document.querySelector('a[href*="/lessons/"]')?.href || null,
      quiz: document.querySelector('a[href^="/dashboard/student/assessments/"]')?.href || null,
    })).catch(() => ({ lesson: null, quiz: null }));
    if (found.lesson || found.quiz) {
      detailUrl = href;
      lessonHref = found.lesson;
      quizHref = found.quiz;
      break;
    }
  }
  if (detailUrl) {
    await shot(page, "10-student-course-detail.png", detailUrl);
    if (lessonHref) await shot(page, "11-student-lesson.png", lessonHref);
    if (quizHref) await shot(page, "12-student-quiz.png", quizHref);
  }
  await shot(page, "13-student-reopen.png", `${BASE}/dashboard/student/reopen-requests`);
  await shot(page, "14-student-updates.png", `${BASE}/dashboard/updates`);
  await shot(page, "15-student-profile.png", `${BASE}/dashboard/profile`);

  // ---------- Teacher flow ----------
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" }).catch(() => {});
  await page.evaluate(() => { document.cookie.split(";").forEach(() => {}); });
  await page.context().clearCookies();
  await loginAs(page, TEACHER);
  await shot(page, "16-teacher-overview.png", `${BASE}/dashboard/teacher`);
  await shot(page, "17-teacher-courses.png", `${BASE}/dashboard/teacher/courses`);

  // First teacher course management page
  await page.goto(`${BASE}/dashboard/teacher/courses`, { waitUntil: "networkidle" }).catch(() => {});
  const teacherCourseHref = await page.getAttribute('a[href^="/dashboard/teacher/courses/"]', "href").catch(() => null);
  if (teacherCourseHref) await shot(page, "18-teacher-course-manage.png", `${BASE}${teacherCourseHref}`);

  await shot(page, "19-teacher-gradebook.png", `${BASE}/dashboard/teacher/students`);
  await shot(page, "20-teacher-reopen.png", `${BASE}/dashboard/teacher/reopen-requests`);

  // ---------- 404 ----------
  await shot(page, "21-not-found.png", `${BASE}/no-such-page-xyz`);

  await browser.close();
  console.log("DONE ->", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
