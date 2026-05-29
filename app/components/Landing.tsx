"use client";

import React from "react";

type LandingProps = {
  previewRef: React.RefObject<HTMLDivElement>;
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
    <section className="w-full bg-gradient-to-b from-sky-200 via-sky-100 to-white">
      <div className="mx-auto max-w-6xl px-6 py-20 text-slate-900">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <h1 className="text-4xl font-display font-bold tracking-tight text-slate-900">
              Payflow Console
            </h1>
            <p className="text-lg font-semibold text-slate-700">
              Payflow processing made effortless.
            </p>
            <p className="text-base text-slate-700">
              Upload Payflow data, verify records, generate salary slips, and email employees automatically—all in a few clicks.
            </p>
            <p className="mt-3 text-sm text-slate-600 font-medium">
              Accurate payflow. Automated delivery. Zero hassle.
            </p>

            <div className="flex items-start gap-6">
              <div>
                <button
                  onClick={handleCTAClick}
                  className="inline-flex items-center gap-3 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02]"
                >
                  Get started — Preview data
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
                Automate Payflow uploads & dispatch
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3 rounded-lg border border-sky-100 bg-white p-4 shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-700 font-bold">1</div>
                  <div>
                    <div className="font-semibold">Upload</div>
                    <div className="text-sm text-slate-600">CSV or XLSX — first sheet is extracted.</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-sky-100 bg-white p-4 shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-700 font-bold">2</div>
                  <div>
                    <div className="font-semibold">Validate</div>
                    <div className="text-sm text-slate-600">Required columns are checked before preview.</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-sky-100 bg-white p-4 shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-700 font-bold">3</div>
                  <div>
                    <div className="font-semibold">Dispatch</div>
                    <div className="text-sm text-slate-600">Generate PDFs and email slips from the preview section.</div>
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
