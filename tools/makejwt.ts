import * as jose from "@panva/jose";

const der64 = Deno.env.get("GITHUB_PKEY")!;
const der = Uint8Array.fromBase64(der64);
const clientid = Deno.env.get("GITHUB_CLIENTID")!;

const now = Math.floor(Date.now() / 1000);
const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, true, ["sign"]);

const jwt = await new jose.SignJWT({
	iat: now - 60,
	exp: now + 60,
	iss: clientid,
})
	.setProtectedHeader({ alg: "RS256" })
	.sign(key);

console.log(jwt);
