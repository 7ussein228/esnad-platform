import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { orders, payments, courses } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getMockProvider, isMockSimulationAllowed } from "@/lib/payments";
import type { Metadata } from "next";
import { Card, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { PayButton } from "@/components/pay-button";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const student = await requireRole("STUDENT");

  const orderRows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!orderRows.length) notFound();
  const order = orderRows[0];
  if (order.studentId !== student.id) notFound();

  if (order.status === "PAID") {
    redirect(`/dashboard/student`);
  }

  const paymentRows = await db.select().from(payments).where(eq(payments.orderId, order.id)).limit(1);
  if (!paymentRows.length) notFound();
  const payment = paymentRows[0];

  const courseRows = await db.select().from(courses).where(eq(courses.id, order.courseId)).limit(1);
  const course = courseRows[0];

  // Production without a real payment provider: never simulate success.
  if (!isMockSimulationAllowed()) {
    return (
      <div className="pattern-motif flex min-h-screen items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-ink-900">الدفع غير متاح حاليًا</h1>
          <p className="mt-2 text-sm text-ink-500">
            بوابة الدفع الحقيقية لسه بتتجهز. تواصل مع المستر لتفعيل اشتراكك يدويًا.
          </p>
        </Card>
      </div>
    );
  }

  const provider = getMockProvider();
  const payload = JSON.stringify({
    orderId: order.id,
    paymentId: payment.id,
    providerReference: payment.providerPaymentId,
    status: "SUCCESS",
  });
  const signature = provider.signPayload(payload);

  return (
    <div className="pattern-motif flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg p-8">
        <Badge tone="gold">بوابة الدفع الآمنة (محاكاة)</Badge>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink-900">إتمام عملية الدفع</h1>
        <p className="mt-2 text-sm text-ink-500">
          سيتم التحقق من عملية الدفع عبر الخادم مباشرة (Webhook موقّع رقميًا) قبل تفعيل اشتراكك — لا يتم الاعتماد على المتصفح أبدًا.
        </p>

        <div className="mt-6 space-y-3 rounded-xl bg-papyrus-100 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-ink-500">الكورس</span>
            <span className="font-bold text-ink-800">{course?.title}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-500">رقم الطلب</span>
            <span className="font-mono text-xs text-ink-600">{order.id}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-500">الإجمالي</span>
            <span className="font-display text-xl font-bold text-primary-700">{formatCurrency(order.amount, order.currency)}</span>
          </div>
        </div>

        <div className="mt-6">
          <PayButton payload={payload} signature={signature} successRedirect={`/dashboard/student`} />
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-ink-400">
          <ShieldCheck className="h-4 w-4" /> عملية دفع محمية ومشفّرة
        </p>
      </Card>
    </div>
  );
}
