import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useCallback, useState } from "react";
import { TextInput } from "react-native-gesture-handler";
import { v4 as uuidv4 } from "uuid";
import { Config } from "@/appKeys";
import { useAuthRelay } from "@/hooks/useAuthRelayer";
import { useKokio } from "@/hooks/useKokio";
import { useAppState } from "@/hooks/useAppState";
import { generateKeyPair, SignJWT, calculateJwkThumbprint, exportJWK } from "jose";
import { logger } from "@/utils/logger";

const isValidEmail = (email: string | undefined) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export default function TestScreen() {
  const appState = useAppState(true);
  logger.debug('TEST_APPSTATE', { appState });

  const { signUpWithPasskey, loginWithPasskey } = useAuthRelay();
  const { kokio, clearKokioUser } = useKokio();

  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");

  const [dpopResult, setDpopResult] = useState<string | null>(null);

  // ─── Redirect spike state ────────────────────────────────────────────────
  const [redirectLog, setRedirectLog] = useState<string>("");
  const [redirectUrl, setRedirectUrl] = useState<string>(
    `${Config.AUTH_SERVER_BASE_URL ?? ""}/v1/auth/authorize?response_type=code&redirect_uri=kokio%3A%2F%2Fcallback&code_challenge=SPIKE_CHALLENGE&code_challenge_method=S256&device_wallet_address=0x0000000000000000000000000000000000000000&auth_time=0`
  );

  const appendLog = (line: string) =>
    setRedirectLog((prev) => (prev ? prev + "\n" + line : line));

  const runFetchManual = useCallback(async () => {
    setRedirectLog("── fetch/manual ──────────────────");
    try {
      const res = await fetch(redirectUrl, {
        method: "GET",
        headers: { "x-correlation-id": uuidv4() },
        redirect: "manual",
      });

      appendLog(`status : ${res.status}`);
      appendLog(`type   : ${(res as any).type ?? "(no type)"}`);
      appendLog(`url    : ${(res as any).url ?? "(empty)"}`);
      appendLog(`Location (header): ${res.headers.get("location") ?? res.headers.get("Location") ?? "null"}`);

      const isRedirect =
        res.status === 302 ||
        res.status === 0 ||
        (res as any).type === "opaqueredirect";

      if (isRedirect) {
        const extracted =
          res.headers.get("location") ??
          res.headers.get("Location") ??
          (res as unknown as { url?: string }).url ??
          null;
        const via =
          (res.headers.get("location") || res.headers.get("Location"))
            ? "Location header"
            : (res as any).url
            ? "res.url"
            : "NOTHING";
        appendLog(`→ extracted via: ${via}`);
        appendLog(`→ target: ${extracted ?? "(null)"}`);

        const code = extracted ? new URL(extracted).searchParams.get("code") : null;
        appendLog(`→ code param: ${code ?? "(none — expected for spike dummy URL)"}`);
      } else {
        appendLog("→ NOT a redirect response");
        try {
          const body = await res.text();
          appendLog(`body: ${body.slice(0, 200)}`);
        } catch {
          appendLog("(body unreadable)");
        }
      }
    } catch (e: any) {
      appendLog(`EXCEPTION: ${e?.message ?? String(e)}`);
    }
    appendLog(`platform: ${Platform.OS}`);
  }, [redirectUrl]);

  const runXhr = useCallback(() => {
    setRedirectLog("── XMLHttpRequest ───────────────────────");
    const xhr = new XMLHttpRequest();

    xhr.onreadystatechange = () => {
      appendLog(`readyState ${xhr.readyState} status: ${xhr.status}`);
      if (xhr.readyState === 2) {
        appendLog(`  Location (HEADERS_RECEIVED): ${xhr.getResponseHeader("Location") ?? "null"}`);
        appendLog(`  responseURL: ${xhr.responseURL ?? "(empty)"}`);
      }
    };

    xhr.onload = () => {
      appendLog(`onload — status: ${xhr.status}`);
      appendLog(`responseURL: ${xhr.responseURL ?? "(empty)"}`);
      appendLog(`Location: ${xhr.getResponseHeader("Location") ?? "null"}`);
    };

    xhr.onerror = () => {
      appendLog("onerror fired (expected — kokio:// not fetchable)");
      appendLog(`responseURL on error: ${xhr.responseURL ?? "(empty)"}`);
      appendLog(`status on error: ${xhr.status}`);
      appendLog("→ NO redirect URL extractable via XHR ✗");
    };

    xhr.open("GET", redirectUrl);
    xhr.setRequestHeader("x-correlation-id", uuidv4());
    xhr.send();
    appendLog(`platform: ${Platform.OS}`);
  }, [redirectUrl]);

  const runDpopSmokeTest = useCallback(async () => {
    setDpopResult("Running…");
    try {
      const { privateKey, publicKey } = await generateKeyPair("ES256", {
        extractable: true,
      });

      const jwk = await exportJWK(publicKey);
      const thumbprint = await calculateJwkThumbprint(jwk, "sha256");

      const token = await new SignJWT({ htu: "https://example.com/token", htm: "POST" })
        .setProtectedHeader({ alg: "ES256", typ: "dpop+jwt", jwk })
        .setIssuedAt()
        .setJti(thumbprint)
        .sign(privateKey);

      setDpopResult(`OK\nthumbprint: ${thumbprint}\ntoken (first 60): ${token.slice(0, 60)}…`);
    } catch (e: any) {
      setDpopResult(`FAIL: ${e?.message ?? e}`);
    }
  }, []);

  const onSignIn = useCallback(async () => {
    try {
      await loginWithPasskey();
    } catch (e) {
      logger.error('TEST_SIGNIN_FAILED', { err: e });
    }
  }, [loginWithPasskey]);

  const onSignUp = useCallback(async () => {
    if (email.length > 0 && !isValidEmail(email))
      return alert("Invalid email address");
    try {
      const response = await signUpWithPasskey({ username, email });
      logger.debug('TEST_SIGNUP_RESULT', { response });
    } catch (e) {
      logger.error('TEST_SIGNUP_FAILED', { err: e });
    }
  }, [email, username, signUpWithPasskey]);

  return (
    <ScrollView
      style={{
        paddingTop: insets.top,
        backgroundColor: "#fccefe",
        paddingBottom: insets.bottom,
        flex: 1,
      }}
      contentContainerStyle={styles.scrollContainer}
    >
      <Text style={styles.title}>Testing Passkeys and Smart Accounts</Text>

      {kokio.userData && (
        <Text style={styles.userText}>
          Welcome User: Placeholder 
        </Text>
      )}

      <View style={styles.textInputContainer}>
        {!kokio.userData && (
          <>
            <TextInput
              style={styles.textInput}
              value={username}
              onChangeText={(val) => setUsername(val)}
              placeholder="John Doe"
            />
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={(val) => setEmail(val.toLowerCase())}
              placeholder="john@doe.com"
            />
            <Pressable onPress={onSignUp}>
              {({ pressed }) => (
                <View style={[styles.button, { opacity: pressed ? 0.5 : 1 }]}>
                  <Text style={styles.buttonText}>Sign Up with Passkey</Text>
                </View>
              )}
            </Pressable>
          </>
        )}

        <Pressable onPress={onSignIn}>
          {({ pressed }) => (
            <View style={[styles.button, { opacity: pressed ? 0.5 : 1 }]}>
              <Text style={styles.buttonText}>Sign In with Passkey</Text>
            </View>
          )}
        </Pressable>

        {kokio.userData && (
          <Pressable onPress={() => clearKokioUser()}>
            {({ pressed }) => (
              <View style={[styles.button, { opacity: pressed ? 0.5 : 1 }]}>
                <Text style={styles.buttonText}>Clear User Data</Text>
              </View>
            )}
          </Pressable>
        )}
      </View>

      <View style={styles.separator} />

      <Pressable style={styles.button} onPress={runDpopSmokeTest}>
        <Text style={styles.buttonText}>DPoP Smoke Test (ES256)</Text>
      </Pressable>

      {dpopResult && (
        <Text style={[styles.userText, { marginTop: 8 }]}>{dpopResult}</Text>
      )}

      <View style={styles.separator} />

      {/* ── Redirect spike ──────────────────────────────────────────────── */}
      <Text style={[styles.title, { fontSize: 14 }]}>
        Redirect Spike (AUTH-502)
      </Text>
      <Text style={[styles.userText, { marginBottom: 8, color: "#666" }]}>
        Edit URL then run each approach. Check docs/auth-redirect-handling.md
        for expected output per platform.
      </Text>

      <TextInput
        style={[styles.textInput, { height: 60, fontSize: 10 }]}
        value={redirectUrl}
        onChangeText={setRedirectUrl}
        multiline
        placeholder="authorize URL"
      />

      <Pressable style={styles.button} onPress={runFetchManual}>
        <Text style={styles.buttonText}>1 — fetch / redirect:manual</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={runXhr}>
        <Text style={styles.buttonText}>2 — XMLHttpRequest (expect ✗)</Text>
      </Pressable>

      <Pressable
        style={[styles.button, { backgroundColor: "#555" }]}
        onPress={() => setRedirectLog("")}
      >
        <Text style={styles.buttonText}>Clear log</Text>
      </Pressable>

      {redirectLog !== "" && (
        <View
          style={{
            width: "100%",
            backgroundColor: "#111",
            borderRadius: 8,
            padding: 10,
            marginTop: 8,
          }}
        >
          <Text
            style={[styles.userText, { color: "#0f0", fontSize: 10, lineHeight: 16 }]}
            selectable
          >
            {redirectLog}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    marginHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: "5%",
  },
  separator: {
    marginVertical: 10,
    height: 1,
    width: "100%",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "black",
  },
  userText: {
    marginBottom: 5,
    fontSize: 12,
    fontFamily: "SpaceMono",
  },
  textInputContainer: {
    marginTop: 10,
    width: "100%",
  },
  textInput: {
    width: "100%",
    height: 40,
    borderColor: "rgba(0,0,0,0.095)",
    borderWidth: 1,
    paddingHorizontal: 10,
    backgroundColor: "rgba(0,0,0,0.025)",
    marginBottom: 10,
    borderRadius: 10,
  },
  button: {
    width: "100%",
    padding: 8,
    marginVertical: 5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgb(0, 0, 0)",
  },
  buttonText: {
    color: "white",
    fontFamily: "SpaceMono",
  },
});
