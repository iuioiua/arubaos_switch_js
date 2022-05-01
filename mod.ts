export interface ClientInit {
  origin: string;
  version?: string;
  username?: string;
  password?: string;
}

export class Client {
  #origin: string;
  #version: string;
  #username: string;
  #password: string;
  #cookie?: string;

  constructor({ origin, version, username, password }: ClientInit) {
    this.#origin = origin;
    this.#version = version ?? "v1";
    this.#username = username ?? "manager";
    this.#password = password ?? "";
  }

  request(path: string, init?: RequestInit): Promise<Response> {
    const request = new Request(
      this.#origin + "/rest/" + this.#version + path,
      init,
    );
    request.headers.set("cookie", this.#cookie!);
    return fetch(request);
  }

  async login(): Promise<void> {
    const response = await this.request("/login-sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        userName: this.#username,
        password: this.#password,
      }),
    });
    const { cookie, message } = await response.json();
    console.assert(response.ok, message);
    this.#cookie = cookie;
  }

  async logout(): Promise<void> {
    const response = await this.request("/login-sessions", {
      method: "DELETE",
    });
    console.assert(response.ok);
    this.#cookie = undefined;
  }
}

export async function request(
  clientInit: ClientInit,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const client = new Client(clientInit);
  await client.login();
  const response = await client.request(path, init);
  await client.logout();
  return response;
}
