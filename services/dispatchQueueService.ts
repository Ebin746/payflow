const QSTASH_PUBLISH_URL = "https://qstash.upstash.io/v2/publish";

function getQstashToken() {
  return process.env.QSTASH_TOKEN ?? process.env.UPSTASH_QSTASH_TOKEN ?? "";
}

export async function enqueueDispatchJob(jobId: string, destinationUrl: string) {
  const token = getQstashToken();
  if (!token) {
    throw new Error("QStash token is missing.");
  }

  if (!destinationUrl) {
    throw new Error("Dispatch destination is missing.");
  }

  const response = await fetch(
    `${QSTASH_PUBLISH_URL}/${encodeURIComponent(destinationUrl)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobId }),
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Failed to enqueue dispatch job in QStash. ${response.status}: ${message}`
    );
  }
}