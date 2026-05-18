"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileImage, Loader2, Send, Sparkles, Upload, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { generateLetterDetailed } from "@/lib/ai/generate";
import { summarizeTextDetailed } from "@/lib/ai/summarize";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { requestToRow } from "@/lib/supabase-mappers";
import type { AiPolicyStatus, ApprovalEvent, Request, RequestType } from "@/lib/types";

const TYPES: { value: RequestType; label: string; ph: string }[] = [
  { value: "LEAVE", label: "Leave", ph: "Reason, dates…" },
  { value: "EVENT", label: "Event", ph: "Event name, budget…" },
  { value: "PROJECT", label: "Project", ph: "Scope, mentor, timeline…" },
];

const schema = z.object({
  type: z.enum(["LEAVE", "EVENT", "PROJECT"]),
  title: z.string().min(5).max(120),
  description: z.string().min(20).max(8000),
});
type FV = z.infer<typeof schema>;

function newId(p: string) { const g = globalThis as { crypto?: { randomUUID?: () => string } }; return g.crypto?.randomUUID ? `${p}_${g.crypto.randomUUID()}` : `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
function toB64(f: File): Promise<string> { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = () => rej(); r.readAsDataURL(f); }); }

export function StudentForm() {
  const router = useRouter();
  const { addRequest } = useAppStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [sName, setSName] = useState<string | null>(null);
  const [sId, setSId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [gen, setGen] = useState(false);
  const [sub, setSub] = useState(false);
  const [phase, setPhase] = useState("");
  const [doc, setDoc] = useState<string | null>(null);
  const [docName, setDocName] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FV>({ resolver: zodResolver(schema), defaultValues: { type: "LEAVE", title: "", description: "" } });
  const selType = watch("type");

  useEffect(() => { const s = getSession(); if (!s || s.role !== "STUDENT") { router.replace("/"); return; } setSName(s.name); setSId(`student_${s.name.toLowerCase().replace(/\s+/g, "_")}`); }, [router]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; if (!f.type.startsWith("image/")) { toast.error("Image only."); return; } if (f.size > 10e6) { toast.error("Max 10MB."); return; } try { setDoc(await toB64(f)); setDocName(f.name); } catch { toast.error("Read failed."); } };
  const rmDoc = () => { setDoc(null); setDocName(null); if (fileRef.current) fileRef.current.value = ""; };

  const doGen = async () => { if (!prompt.trim()) { toast.error("Type a prompt."); return; } setGen(true); const t = toast.loading("Drafting…"); try { const { letter } = await generateLetterDetailed(prompt.trim()); if (!letter) { toast.error("Failed.", { id: t }); return; } setValue("description", letter, { shouldValidate: true, shouldDirty: true }); toast.success("Draft ready", { id: t }); } finally { setGen(false); } };

  const onSubmit = async (v: FV) => {
    if (!sName || !sId) return;
    setSub(true); const t = toast.loading("🤖 Analyzing…");
    try {
      setPhase("Summary…"); const { summary } = await summarizeTextDetailed(v.description);
      setPhase("Policy audit…"); let ps: AiPolicyStatus | undefined; let pr: string | undefined;
      try { const r = await fetch("/api/ai/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: v.title, type: v.type, description: v.description }) }); if (r.ok) { const d = await r.json() as { status?: string; reason?: string }; if (d.status) { ps = d.status as AiPolicyStatus; pr = d.reason; } } } catch {}
      let ocr: boolean | undefined;
      if (doc) { setPhase("OCR…"); try { const r = await fetch("/api/ai/ocr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: doc, description: v.description }) }); if (r.ok) { const d = await r.json() as { verified?: boolean }; ocr = Boolean(d.verified); } } catch {} }
      setPhase("Saving…"); const now = new Date().toISOString();
      const evt: ApprovalEvent = { id: newId("evt"), timestamp: now, actorId: sId, actorRole: "STUDENT", action: "SUBMITTED" };
      const req: Request = { id: newId("req"), studentId: sId, studentName: sName, type: v.type, title: v.title.trim(), description: v.description.trim(), aiSummary: summary || undefined, aiPolicyStatus: ps, aiPolicyReason: pr, documentBase64: doc ?? undefined, aiOcrVerified: ocr, status: "PENDING_ADVISOR", createdAt: now, updatedAt: now, history: [evt] };
      const { error } = await supabase.from("requests").insert(requestToRow(req)); if (error) throw error;
      addRequest(req); toast.success("Submitted!", { id: t, description: "Now with your Advisor." }); reset({ type: v.type, title: "", description: "" }); setPrompt(""); rmDoc();
    } catch (e) { toast.error("Failed", { id: t, description: e instanceof Error ? e.message : "" }); } finally { setSub(false); setPhase(""); }
  };

  return (
    <div className="bg-surface border border-border rounded-[20px] p-5 md:p-6 shadow-[var(--shadow-1)]">
      <h2 className="text-base font-bold text-text-primary flex items-center gap-2 mb-1"><Sparkles className="h-4 w-4 text-accent" /> New Request</h2>
      <p className="text-xs text-text-secondary mb-5">AI drafts your letter and audits compliance.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {/* AI Magic */}
        <div className="rounded-xl bg-accent-light/50 border border-accent/20 p-4">
          <label className="text-[10px] font-bold uppercase tracking-wide text-accent flex items-center gap-1 mb-2"><Wand2 className="h-3 w-3" /> AI Magic</label>
          <div className="flex gap-2">
            <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder='"Need 2 days for hackathon"' disabled={gen || sub} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void doGen(); } }} className="flex-1 h-10 rounded-xl border border-border bg-white px-3 text-sm placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20" />
            <button type="button" onClick={doGen} disabled={gen || sub || !prompt.trim()} className="h-10 px-4 rounded-full bg-accent text-white text-sm font-semibold hover:bg-accent-hover active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5">
              {gen ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}<span className="hidden sm:inline">Draft</span>
            </button>
          </div>
        </div>

        {/* Type */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">Type</label>
          <select {...register("type")} disabled={sub} className="h-10 rounded-xl border border-border bg-white px-3 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 appearance-none">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">Title</label>
          <input {...register("title")} placeholder="e.g. 2-day leave for hackathon" disabled={sub} className="h-10 rounded-xl border border-border bg-white px-3 text-sm placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20" />
          {errors.title && <p className="text-[11px] text-danger">{errors.title.message}</p>}
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">Description</label>
          <textarea {...register("description")} rows={6} placeholder={TYPES.find((t) => t.value === selType)?.ph} disabled={sub} className="rounded-xl border border-border bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20 resize-none" />
          {errors.description && <p className="text-[11px] text-danger">{errors.description.message}</p>}
        </div>

        {/* Document */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wide text-text-secondary flex items-center gap-1"><FileImage className="h-3 w-3" /> Document (optional)</label>
          {docName ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm"><FileImage className="h-4 w-4 text-slate-400" /><span className="flex-1 truncate text-text-secondary">{docName}</span><button type="button" onClick={rmDoc} className="text-slate-400 hover:text-danger"><X className="h-4 w-4" /></button></div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-accent/50 bg-white p-5 text-center transition-all">
              <Upload className="h-5 w-5 text-slate-400" /><span className="text-xs text-text-secondary">Drop or click to upload</span>
              <input ref={fileRef} type="file" accept="image/*" onChange={onFile} disabled={sub} className="hidden" />
            </label>
          )}
        </div>

        {/* Submit */}
        <div className="flex flex-col items-end gap-2 pt-2">
          {sub && phase && <p className="text-[11px] text-accent font-medium">🤖 {phase}</p>}
          <button type="submit" disabled={sub} className="flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-hover active:scale-95 transition-all disabled:opacity-50">
            {sub ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sub ? "Analyzing…" : "Submit Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
