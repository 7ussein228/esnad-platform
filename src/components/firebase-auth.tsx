"use client";

import { useActionState, useRef, useState } from "react";
import {
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from "firebase/auth";
import { getFirebaseAuth, getGoogleProvider, getAppleProvider, isFirebaseConfigured } from "@/lib/firebase-client";
import { firebaseLoginAction, type ActionState } from "@/server/actions/firebase-auth";
import { Button, Input, Label, Alert } from "@/components/ui";

export function FirebaseAuthButtons() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(firebaseLoginAction, null);
  const [socialProfile, setSocialProfile] = useState<{
    email?: string;
    phone?: string;
    name?: string;
    firebaseUid?: string;
    provider?: string;
    idToken?: string;
  } | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmObj, setConfirmObj] = useState<unknown>(null);
  const recaptchaRef = useRef<HTMLDivElement>(null);

  if (!isFirebaseConfigured()) {
    return (
      <div className="rounded-xl border border-dashed border-ink-200 bg-papyrus-50 p-4 text-xs leading-relaxed text-ink-500">
        <p className="font-bold text-ink-700">تسجيل الدخول الاجتماعي غير مفعل بعد</p>
        <p className="mt-1">
          ضيف متغيرات <code dir="ltr">NEXT_PUBLIC_FIREBASE_*</code> في ملف <code dir="ltr">.env.local</code> بعد إنشاء
          مشروع Firebase عشان تشغل جوجل والموبايل وآبل.
        </p>
      </div>
    );
  }

  async function handleSocial(kind: "google" | "apple") {
    setSocialError(null);
    setBusy(kind);
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase غير مهيأ");
      const provider = kind === "google" ? getGoogleProvider() : getAppleProvider();
      const cred = await signInWithPopup(auth, provider as never);
      const idToken = await cred.user.getIdToken();
      setSocialProfile({
        email: cred.user.email ?? undefined,
        phone: cred.user.phoneNumber ?? undefined,
        name: cred.user.displayName ?? "طالب جديد",
        firebaseUid: cred.user.uid,
        provider: kind,
        idToken,
      });
    } catch (e: unknown) {
      setSocialError(e instanceof Error ? e.message : "فشل تسجيل الدخول");
    } finally {
      setBusy(null);
    }
  }

  async function sendOtp() {
    setSocialError(null);
    setBusy("phone");
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase غير مهيأ");
      if (!recaptchaRef.current) throw new Error("عنصر التحقق غير جاهز");
      const verifier = new RecaptchaVerifier(auth, recaptchaRef.current, { size: "invisible" });
      const confirmation = await signInWithPhoneNumber(auth, phone, verifier);
      setConfirmObj(confirmation);
    } catch (e: unknown) {
      setSocialError(e instanceof Error ? e.message : "فشل إرسال الكود");
    } finally {
      setBusy(null);
    }
  }

  async function verifyOtp() {
    setSocialError(null);
    setBusy("otp");
    try {
      const c = confirmObj as { confirm: (code: string) => Promise<{ user: { uid: string; phoneNumber: string | null; getIdToken: () => Promise<string> } }> } | null;
      if (!c) throw new Error("ابعت الكود الأول");
      const result = await c.confirm(otp);
      const idToken = await result.user.getIdToken();
      setSocialProfile({
        phone: result.user.phoneNumber ?? phone,
        name: "طالب جديد",
        firebaseUid: result.user.uid,
        provider: "phone",
        idToken,
      });
    } catch (e: unknown) {
      setSocialError(e instanceof Error ? e.message : "الكود غلط");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {(state?.error || socialError) && <Alert tone="error">{state?.error ?? socialError}</Alert>}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleSocial("google")}
          disabled={busy !== null}
          className="rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 transition hover:border-primary-400 hover:text-primary-700"
        >
          {busy === "google" ? "جارٍ..." : "جوجل G"}
        </button>
        <button
          type="button"
          onClick={() => handleSocial("apple")}
          disabled={busy !== null}
          className="rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 transition hover:border-ink-900"
        >
          {busy === "apple" ? "جارٍ..." : "آبل "}
        </button>
      </div>

      <div className="rounded-2xl border border-ink-200 p-4">
        <Label>الدخول برقم الموبايل (OTP)</Label>
        <div className="mt-2 flex gap-2" dir="ltr">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2010xxxxxxx" />
          <Button type="button" variant="outline" onClick={sendOtp} disabled={busy !== null || !phone}>
            ابعت الكود
          </Button>
        </div>
        {confirmObj ? (
          <div className="mt-2 flex gap-2" dir="ltr">
            <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" maxLength={6} />
            <Button type="button" onClick={verifyOtp} disabled={busy !== null || !otp}>
              تأكيد
            </Button>
          </div>
        ) : null}
        <div ref={recaptchaRef} />
        <p className="mt-2 text-[11px] text-ink-400">بيتبعت كود SMS من Firebase ويتأكد تلقائيًا.</p>
      </div>

      {socialProfile ? (
        <form action={formAction} className="rounded-2xl border border-primary-200 bg-primary-50/50 p-4">
          <p className="text-sm font-bold text-primary-800">
            تم التحقق بنجاح {socialProfile.email ?? socialProfile.phone} — دوس تأكيد الدخول
          </p>
          <input type="hidden" name="idToken" value={socialProfile.idToken ?? ""} />
          {socialProfile.email ? <input type="hidden" name="email" value={socialProfile.email} /> : null}
          {socialProfile.phone ? <input type="hidden" name="phone" value={socialProfile.phone} /> : null}
          <input type="hidden" name="name" value={socialProfile.name ?? "طالب جديد"} />
          {socialProfile.firebaseUid ? <input type="hidden" name="firebaseUid" value={socialProfile.firebaseUid} /> : null}
          <input type="hidden" name="provider" value={socialProfile.provider ?? "firebase"} />
          <Button type="submit" className="mt-3 w-full" disabled={pending}>
            {pending ? "جارٍ الدخول..." : "تأكيد الدخول وإنشاء حساب طالب"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
