import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments, paymentTransactions, enrollments, courses } from "@/db/schema";
import { notifyUser } from "@/lib/notifications";
import { getMockProvider } from "@/lib/payments";

export async function grantEnrollment(studentId: string, courseId: string, source: string) {
  const existing = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.studentId, studentId), eq(enrollments.courseId, courseId)))
    .limit(1);

  if (existing.length) {
    if (existing[0].status !== "ACTIVE") {
      await db.update(enrollments).set({ status: "ACTIVE" }).where(eq(enrollments.id, existing[0].id));
    }
    return existing[0].id;
  }

  const [created] = await db
    .insert(enrollments)
    .values({ studentId, courseId, source })
    .returning({ id: enrollments.id });

  await notifyUser(studentId, "ENROLLMENT", "تم تفعيل اشتراكك", "يمكنك الآن بدء التعلم في الكورس", `/dashboard/student/courses/${courseId}`);
  return created.id;
}

export async function createOrderForCourse(studentId: string, courseId: string) {
  const courseRows = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!courseRows.length) throw new Error("الكورس غير موجود");
  const course = courseRows[0];
  if (course.status !== "PUBLISHED") throw new Error("هذا الكورس غير متاح حاليًا");

  const [order] = await db
    .insert(orders)
    .values({ studentId, courseId, amount: course.price, currency: course.currency })
    .returning();

  const provider = getMockProvider();
  const checkout = await provider.createCheckout({
    orderId: order.id,
    amount: Number(course.price),
    currency: course.currency,
    customerEmail: "",
    customerName: "",
    courseTitle: course.title,
  });

  const [payment] = await db
    .insert(payments)
    .values({
      orderId: order.id,
      provider: provider.name,
      providerPaymentId: checkout.providerReference,
      amount: course.price,
      currency: course.currency,
    })
    .returning();

  return { order, payment, checkoutUrl: checkout.checkoutUrl, providerReference: checkout.providerReference };
}

export async function confirmPayment(orderId: string, paymentId: string, providerReference: string) {
  const idempotencyKey = `webhook_${providerReference}`;

  const existingTx = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.idempotencyKey, idempotencyKey))
    .limit(1);
  if (existingTx.length) {
    return { alreadyProcessed: true };
  }

  const orderRows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const paymentRows = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!orderRows.length || !paymentRows.length) throw new Error("الطلب غير موجود");
  const order = orderRows[0];
  const payment = paymentRows[0];

  await db.insert(paymentTransactions).values({
    paymentId,
    type: "CHARGE",
    amount: payment.amount,
    status: "SUCCEEDED",
    providerRef: providerReference,
    idempotencyKey,
  });

  await db.update(payments).set({ status: "SUCCEEDED" }).where(eq(payments.id, paymentId));
  await db.update(orders).set({ status: "PAID", updatedAt: new Date() }).where(eq(orders.id, orderId));

  await grantEnrollment(order.studentId, order.courseId, "PAYMENT");
  await notifyUser(order.studentId, "PAYMENT", "تم تأكيد الدفع", "تم تفعيل اشتراكك في الكورس بنجاح");

  return { alreadyProcessed: false };
}
