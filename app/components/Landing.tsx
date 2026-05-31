"use client";

import React from "react";

type LandingProps = {
  previewRef: React.RefObject<HTMLDivElement | null>;
};

export default function Landing({ previewRef }: LandingProps) {
  const handleCTAClick = () => {
    if (previewRef?.current) {
      previewRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 600, behavior: "smooth" });
    }
  };

  return (
    <section className="flex w-full min-h-[90vh] items-center bg-linear-to-b from-sky-200 via-sky-100 to-white">
      <div className="mx-auto max-w-6xl px-6 py-12 text-slate-900 md:py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <h1 className="text-4xl font-display font-bold tracking-tight text-slate-900">
              Nippon Toyota Salary Slip Dispatch Office
            </h1>
            <p className="text-lg font-semibold text-slate-700">
              Official payroll dispatch for employee salary slips.
            </p>
            <p className="text-base text-slate-700">
              Upload payroll records, verify employee details, generate branded salary slips, and release them through the office dispatch workflow.
            </p>
            <p className="mt-3 text-sm text-slate-600 font-medium">
              Prepared with office-level consistency. Dispatched with care. Archived for payroll records.
            </p>

            <div className="flex items-start gap-6">
              <div>
                <button
                  onClick={handleCTAClick}
                  className="inline-flex items-center gap-3 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02]"
                >
                  Open dispatch desk
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

            </div>

            
          </div>

          <div className="hidden md:flex w-full items-center justify-center">
            <div className="w-full max-w-md">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">
                Office dispatch workflow
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3 rounded-lg border border-sky-100 bg-white p-4 shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-700 font-bold">1</div>
                  <div>
                    <div className="font-semibold">Receive</div>
                    <div className="text-sm text-slate-600">Payroll CSV or XLSX files are accepted from the upload desk.</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-sky-100 bg-white p-4 shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-700 font-bold">2</div>
                  <div>
                    <div className="font-semibold">Review</div>
                    <div className="text-sm text-slate-600">Mandatory fields and employee references are checked before release.</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-sky-100 bg-white p-4 shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-700 font-bold">3</div>
                  <div>
                    <div className="font-semibold">Release</div>
                    <div className="text-sm text-slate-600">Salary slips are generated, attached, and sent from the dispatch section.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
