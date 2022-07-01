import { assert } from "./deps.ts";

/** Turns a set-cookie header into a useable cookie header value */
function getSetCookie(headers: Headers): string {
  return headers.get("set-cookie")!
    .split(", ")
    .flatMap((cookie) => cookie.split("; ")[0])
    .join("; ");
}

// deno-lint-ignore no-explicit-any
function postJSONInit(data: any): RequestInit {
  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(data),
  };
}

export interface ClientInit {
  origin: string;
  version?: "v1" | "v2" | "v3" | "v4" | "v5" | "v6" | "v7";
  username?: string;
  password?: string;
}

export class Client {
  #username: string;
  #password: string;
  #baseURL: string;
  #cookie?: string;

  constructor(init: ClientInit) {
    const version = init.version ??
      Deno.env.get("ARUBAOS_SWITCH_VERSION") ?? "v1";
    this.#username = init.username ??
      Deno.env.get("ARUBAOS_SWITCH_USERNAME") ?? "manager";
    this.#password = init.password ??
      Deno.env.get("ARUBAOS_SWITCH_PASSWORD") ?? "";
    this.#baseURL = init.origin + "/rest/" + version;
  }

  async request(path: string, init?: RequestInit): Promise<Response> {
    const url = new URL(path, this.#baseURL);
    const request = new Request(url.toString(), init);
    request.headers.set("cookie", this.#cookie!);
    return await fetch(request);
  }

  async run(command: string): Promise<string> {
    const response = await this.request("/cli", postJSONInit({ cmd: command }));
    const { result_base64_encoded } = await response.json();
    assert(response.ok);
    return atob(result_base64_encoded).trim();
  }

  async login(): Promise<void> {
    const response = await this.request(
      "/login-sessions",
      postJSONInit({
        userName: this.#username,
        password: this.#password,
      }),
    );
    const { message } = await response.json();
    assert(response.ok, message);
    this.#cookie = getSetCookie(response.headers);
  }

  async logout(): Promise<void> {
    const response = await this.request("/login-sessions", {
      method: "DELETE",
    });
    await response.body?.cancel();
    assert(response.ok);
    this.#cookie = undefined;
  }

  async requestOnce(path: string, init?: RequestInit): Promise<Response> {
    await this.login();
    const response = await this.request(path, init);
    await this.logout();
    return response;
  }

  async runOnce(command: string): Promise<string> {
    await this.login();
    const output = await this.run(command);
    await this.logout();
    return output;
  }
}

export async function requestOnce(
  clientInit: ClientInit,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const client = new Client(clientInit);
  return await client.requestOnce(path, init);
}

export async function runOnce(
  clientInit: ClientInit,
  command: string,
): Promise<string> {
  const client = new Client(clientInit);
  return await client.runOnce(command);
}
