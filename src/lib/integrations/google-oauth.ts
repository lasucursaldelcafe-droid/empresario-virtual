import { google } from "googleapis";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db, schema } from "../db";
import { encrypt, decrypt } from "../crypto/tokens";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    "http://localhost:3000/api/oauth/google/callback";

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET requeridos en .env.local");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(state: string): string {
  const oauth2 = getOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export async function exchangeCodeForTokens(code: string, companyId: string) {
  const oauth2 = getOAuth2Client();
  const { tokens } = await oauth2.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error("No se recibió refresh_token. Revoca acceso previo y reintenta con prompt=consent.");
  }

  oauth2.setCredentials(tokens);
  const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 });
  const userInfo = await oauth2Api.userinfo.get();
  const email = userInfo.data.email ?? process.env.MAIN_EMAIL ?? "";

  const encrypted = encrypt(tokens.refresh_token);

  const existing = await db
    .select()
    .from(schema.oauthTokens)
    .where(
      and(
        eq(schema.oauthTokens.companyId, companyId),
        eq(schema.oauthTokens.provider, "google"),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(schema.oauthTokens)
      .set({
        encryptedRefreshToken: encrypted,
        email,
        scopes: SCOPES.join(","),
        updatedAt: new Date(),
      })
      .where(eq(schema.oauthTokens.id, existing[0].id));
  } else {
    await db.insert(schema.oauthTokens).values({
      id: uuidv4(),
      companyId,
      provider: "google",
      encryptedRefreshToken: encrypted,
      email,
      scopes: SCOPES.join(","),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return { email, scopes: SCOPES };
}

export async function getAuthenticatedClient(companyId: string) {
  const rows = await db
    .select()
    .from(schema.oauthTokens)
    .where(
      and(
        eq(schema.oauthTokens.companyId, companyId),
        eq(schema.oauthTokens.provider, "google"),
      ),
    )
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  const refreshToken = decrypt(rows[0].encryptedRefreshToken);
  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({ refresh_token: refreshToken });
  return { oauth2, email: rows[0].email };
}

export async function sendEmail(
  companyId: string,
  to: string,
  subject: string,
  body: string,
): Promise<boolean> {
  const auth = await getAuthenticatedClient(companyId);
  if (!auth) return false;

  const gmail = google.gmail({ version: "v1", auth: auth.oauth2 });
  const from = auth.email ?? process.env.MAIN_EMAIL ?? "me";

  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    body,
  ].join("\r\n");

  const encoded = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded },
  });

  return true;
}

export async function getIntegrationStatus(companyId: string) {
  const rows = await db
    .select()
    .from(schema.oauthTokens)
    .where(
      and(
        eq(schema.oauthTokens.companyId, companyId),
        eq(schema.oauthTokens.provider, "google"),
      ),
    )
    .limit(1);

  if (rows.length === 0) {
    return { connected: false, email: null, provider: "google" };
  }

  return {
    connected: true,
    email: rows[0].email,
    provider: "google",
    scopes: rows[0].scopes?.split(",") ?? [],
    updatedAt: rows[0].updatedAt,
  };
}
