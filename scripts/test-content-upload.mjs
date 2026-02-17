// Run: node scripts/test-content-upload.mjs
// Requires: npm run dev (Next server running on http://localhost:3000)

const url = process.env.TEST_UPLOAD_URL || "http://localhost:3000/api/content/upload";

async function main() {
  const fd = new FormData();
  fd.append("title", "test-upload");
  fd.append("folder", "content");
  fd.append(
    "file",
    new File([new Blob(["hello world"], { type: "text/plain" })], "hello.txt", {
      type: "text/plain",
    })
  );

  const res = await fetch(url, { method: "POST", body: fd });
  const text = await res.text();
  console.log("STATUS", res.status);
  console.log(text);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
