# Screenshots — صور مميزات منصة إسناد

مجلد `screenshoot/pages/` فيه لقطات شاشة حقيقية لكل مميزات الموقع (متصفح Chromium حقيقي على `http://localhost:3000`).

## الصور

| # | الملف | الميزة |
|---|-------|--------|
| 1 | `01-home.png` | الرئيسية (Hero + المراحل + المواد + الكورسات) |
| 2 | `02-explore.png` | استكشاف الصفوف والكورسات |
| 3 | `03-login.png` | تسجيل الدخول (إيميل + جوجل + موبايل OTP) |
| 4 | `04-register-step1.png` | التسجيل خطوة 1 (اسم + سنة + إيميل + موبايل + باسورد) |
| 5 | `05-register-otp.png` | التسجيل خطوة 2 (كود OTP) |
| 6 | `06-course-public.png` | صفحة الكورس العامة والاشتراك |
| 7 | `07-complete-profile.png` | استكمال بيانات دخول جوجل |
| 8 | `08-student-overview.png` | لوحة الطالب الرئيسية + التقدم |
| 9 | `09-student-courses.png` | كورساتي |
| 10 | `10-student-course-detail.png` | محتوى الكورس (دروس مقفولة/مفتوحة + اختبارات + واجبات) |
| 11 | `11-student-lesson.png` | صفحة الدرس (فيديو + إتمام + طلب إعادة فتح) |
| 12 | `12-student-quiz.png` | صفحة الاختبار (تايمر + محاولات + مراجعة) |
| 13 | `13-student-reopen.png` | طلبات إعادة الفتح (طالب) |
| 14 | `14-student-updates.png` | الإشعارات والإعلانات |
| 15 | `15-student-profile.png` | الملف الشخصي |
| 16 | `16-teacher-overview.png` | لوحة المستر |
| 17 | `17-teacher-courses.png` | إدارة الكورسات + إنشاء كورس |
| 18 | `18-teacher-course-manage.png` | إدارة محتوى الكورس (وحدات + دروس + فيديو + PDF + نشر) |
| 19 | `19-teacher-gradebook.png` | دفتر الدرجات (تقدم + تصحيح واجبات) |
| 20 | `20-teacher-reopen.png` | مراجعة طلبات إعادة الفتح |
| 21 | `21-not-found.png` | صفحة 404 |

## إعادة التصوير

```bash
# السيرفر المحلي لازم يكون شغال + قاعدة البيانات فيها seed
npm run dev
node screenshoot/capture.mjs
# أو ضد رابط تاني:
SITE_URL=https://your-domain.vercel.app node screenshoot/capture.mjs
```

السكريبت بيدخل بحسابات الـ seed (`student@esnad.com` / `teacher@esnad.com` — باسورد `password123`) لذلك النتائج تعتمد على بيانات التجربة.
