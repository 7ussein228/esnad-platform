import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-200 bg-ink-900 text-papyrus-100">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold-400 font-display text-xl font-bold text-ink-900">
              إ
            </span>
            <span className="font-display text-lg font-bold text-white">منصة إسناد</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-papyrus-200/80">
            منصة تعليمية عربية متخصصة في الدراسات الاجتماعية والتاريخ والجغرافيا، من الصف الأول الإعدادي وحتى
            الثانية بكالوريا.
          </p>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold text-gold-300">روابط سريعة</h4>
          <ul className="space-y-2.5 text-sm text-papyrus-200/80">
            <li><Link href="/explore" className="hover:text-white">استكشف الصفوف</Link></li>
            <li><Link href="/#courses" className="hover:text-white">الكورسات المميزة</Link></li>
            <li><Link href="/#how-it-works" className="hover:text-white">كيف تعمل المنصة</Link></li>
            <li><Link href="/register" className="hover:text-white">ابدأ التعلم الآن</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold text-gold-300">للمعلمين</h4>
          <ul className="space-y-2.5 text-sm text-papyrus-200/80">
            <li><Link href="/register" className="hover:text-white">انضم كمستر</Link></li>
            <li><Link href="/login" className="hover:text-white">تسجيل الدخول</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold text-gold-300">تواصل معنا</h4>
          <ul className="space-y-2.5 text-sm text-papyrus-200/80">
            <li>support@esnad-edu.com</li>
            <li>+20 100 000 0000</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-papyrus-300/70">
        © {new Date().getFullYear()} منصة إسناد للدراسات الاجتماعية والتاريخ والجغرافيا. جميع الحقوق محفوظة.
      </div>
    </footer>
  );
}
