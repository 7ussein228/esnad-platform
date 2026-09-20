"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase-client";
import { registerWithOtpAction, type ActionState } from "@/server/actions/firebase-auth";
import { PENDING_REGISTRATION_KEY, type PendingRegistration } from "../register-form";
import { Button, Input, Label, Alert, Card } from "@/components/ui";

// Step 2 of registration: verify the phone with Firebase OTP,
// then create the STUDENT account via registerWithOtpAction.
export function VerifyForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(registerWithOtpAction, null);
  const [data, setData] = useState<PendingRegistration | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmObj, setConfirmObj] = useState<unknown>(null);
  const [verified, setVerified] = useState<{ idToken: string; firebaseUid: string } | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const recaptchaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PENDING_REGISTRATION_KEY);
      if (raw) setData(JSON.parse(raw));
    } catch {
      setData(null);
    }
    setLoaded(true);
  }, []);

  if (!loaded) return <p className="text-sm text-ink-500">جارٍ التحميل...</p>;

  if (!data) {
    return (
      <Card className="p-6 text-center">
        <p className="font-bold text-ink-800">مفيش بيانات تسجيل</p>
        <p className="mt-2 text-sm text-ink-500">املى بياناتك الأول وبعدها هتيجي هنا للتحقق.</p>
        <Button href="/register" className="mt-4">ارجع لصفحة التسجيل</Button>
      </Card>
    );
  }

  if (!isFirebaseConfigured()) {
    return <Alert tone="error">التحقق بالموبايل غير مفعل — ضيف إعدادات Firebase في البيئة.</Alert>;
  }

  async function sendCode() {
    setError(null);
    setStatus(null);
    setBusy(true);
    try {
      const phone = data?.phone;
      if (!phone) throw new Error("املى بياناتك الأول من صفحة التسجيل");
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase غير مهيأ");
      if (!recaptchaRef.current) throw new Error("عنصر التحقق غير جاهز");
      const verifier = new RecaptchaVerifier(auth, recaptchaRef.current, { size: "invisible" });
      const confirmation = await signInWithPhoneNumber(auth, phone, verifier);
      setConfirmObj(confirmation);
      setStatus(`اتبعث كود على ${phone} — اكتبه تحت`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "فشل إرسال الكود");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode() {
    setError(null);
    setBusy(true);
    try {
      const c = confirmObj as {
        confirm: (code: string) => Promise<{ user: { uid: string; getIdToken: () => Promise<string> } }>;
      } | null;
      if (!c) throw new Error("ابعت الكود الأول");
      const result = await c.confirm(otp);
      const idToken = await result.user.getIdToken();
      setVerified({ idToken, firebaseUid: result.user.uid });
      setStatus("رقمك اتأكد بنجاح — دوس تأكيد إنشاء الحساب");
      sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
    } catch {
      setError("الكود غلط أو انتهت صلاحيته. حاول تاني");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {(state?.error || error) && <Alert tone="error">{state?.error ?? error}</Alert>}
      {status && <Alert tone="success">{status}</Alert>}

      <Card className="p-4 text-sm">
        <p><span className="text-ink-400">الاسم:</span> <b>{data.name}</b></p>
        <p><span className="text-ink-400">السنة:</span> <b>{data.gradeName}</b></p>
        <p><span className="text-ink-400">الإيميل:</span> <b dir="ltr">{data.email}</b></p>
        <p><span className="text-ink-400">الموبايل:</span> <b dir="ltr">{data.phone}</b></p>
        <Link href="/register" className="mt-2 inline-block text-xs font-bold text-primary-700 hover:underline">تعديل البيانات</Link>
      </Card>

      {!verified ? (
        <div className="space-y-4">
          {!confirmObj ? (
            <Button type="button" className="w-full" size="lg" onClick={sendCode} disabled={busy}>
              {busy ? "جارٍ الإرسال..." : "ابعت كود التحقق"}
            </Button>
          ) : (
            <div>
              <Label>كود التحقق (6 أرقام)</Label>
              <div className="mt-2 flex gap-2" dir="ltr">
                <Input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" maxLength={6} inputMode="numeric" />
                <Button type="button" onClick={confirmCode} disabled={busy || otp.length < 6}>
                  تحقق
                </Button>
              </div>
              <button type="button" onClick={sendCode} disabled={busy} className="mt-2 text-xs font-bold text-primary-700 hover:underline">
                ابعت الكود تاني
              </button>
            </div>
          )}
          <div ref={recaptchaRef} />
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="name" value={data.name} />
          <input type="hidden" name="gradeId" value={data.gradeId} />
          <input type="hidden" name="email" value={data.email} />
          <input type="hidden" name="phone" value={data.phone} />
          <input type="hidden" name="password" value={data.password} />
          <input type="hidden" name="idToken" value={verified.idToken} />
          <input type="hidden" name="firebaseUid" value={verified.firebaseUid} />
          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending ? "جارٍ إنشاء الحساب..." : "تأكيد وإنشاء الحساب"}
          </Button>
        </form>
      )}
    </div>
  );
}
