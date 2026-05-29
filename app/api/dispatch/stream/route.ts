import { dispatchSalaryUploadWithProgress } from "@/services/dispatchService";

const encoder = new TextEncoder();

function formatEvent(event: string, data: Record<string, unknown>) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(formatEvent(event, data)));
      };

      const run = async () => {
        try {
          const body = await request.json();
          const rows = Array.isArray(body?.rows) ? body.rows : null;

          if (!rows) {
            send("error", { message: "rows must be an array." });
            controller.close();
            return;
          }

          send("init", { total: rows.length });

          const result = await dispatchSalaryUploadWithProgress(
            rows,
            ({ processed, total, result }) => {
              send("progress", { processed, total, result });
            }
          );

          const successCount = result.results.filter((item) => item.success).length;
          const failedCount = result.results.length - successCount;

          send("complete", {
            successCount,
            failedCount,
            matchedEmployees: result.matchedEmployees,
            salaryRecordsInserted: result.salaryRecordsInserted,
          });
          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Dispatch failed";
          send("error", { message });
          controller.close();
        }
      };

      void run();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
