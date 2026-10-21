import { expect, type APIRequestContext } from "@playwright/test";
export async function emailLink(
  request: APIRequestContext,
  email: string,
  subject: string
): Promise<string> {
  let html = "";
  await expect
    .poll(
      async () => {
        const response = await request.get(
          `http://127.0.0.1:54324/view/latest.html?query=${encodeURIComponent(`to:${email} subject:${subject}`)}`
        );
        if (response.ok()) html = await response.text();
        return /href="http[^\"]+\/auth\/v1\/verify\?/.test(html);
      },
      { timeout: 30000 }
    )
    .toBe(true);
  const link = html.match(/href="(http[^\"]+\/auth\/v1\/verify\?[^\"]+)"/)?.[1];
  if (!link) throw new Error("Captured email has no confirmation link.");
  return link.replaceAll("&amp;", "&");
}
