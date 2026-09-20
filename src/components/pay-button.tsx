"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Alert } from "@/components/ui";

export function PayButton({
  payload,
  signature,
  successRedirect,
}: {
  payload: string;
  signature: string;
  successRedirect: string;
}) {
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function handlePay() {
    setStatus("processing");
    try {
      const res = await fetch("/api/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-signature": signature },
        body: payload,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت عملية الدفع");
      setStatus("success");
      setMessage("تم تأكيد الدفع بنجاح من الخادم، جارٍ تفعيل اشتراكك...");
      setTimeout(() => router.push(successRedirect), 1500);
    } catch (e) {
      setStatus("error");
      setMessage((e as Error).message);
    }
  }

  return (
    <div className="space-y-3">
      <Button size="lg" className="w-full" onClick={handlePay} disabled={status === "processing" || status === "success"}>
        {status === "processing" ? "جارٍ التحقق من الدفع..." : status === "success" ? "تم الدفع بنجاح" : "تأكيد الدفع الآن"}
      </Button>
      {status === "success" && <Alert tone="success">{message}</Alert>}
      {status === "error" && <Alert tone="error">{message}</Alert>}
    </div>
  );
}
