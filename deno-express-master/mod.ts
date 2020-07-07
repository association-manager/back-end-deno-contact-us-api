const {stat, open, readFile} = Deno;

type Reader = Deno.Reader;
type Closer = Deno.Closer;
import {bodyReader} from "https://deno.land/x/std/http/_io.ts";
import { lookup } from "https://deno.land/x/media_types/mod.ts";
import {path, http, red, yellow, cyan, green} from "./deps.ts";

type Method = "HEAD" | "OPTIONS" | "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type Next = () => Promise<void>;
type Handler = (req: Request, res: Response, next: Next) => Promise<void>;
type EndHandler = (req: Request, res: Response) => Promise<void>;
type Middleware = Handler | PathHandler;
type Query = { [key: string]: string | string[] };
type Params = { [key: string]: string };
type PathMatcher = (pattern: string) => (path: string) => Params;

export const simplePathMatcher: PathMatcher = _pattern => {
    const pattern = _pattern.split("/");
    const names = new Set();
    for (let i = 0; i < pattern.length; i++) {
        const p = pattern[i];
        if (p[0] === "{" && p[p.length - 1] === "}") {
            const name = p.slice(1, -1).trim();
            if (!name) {
                throw new Error("invalid param name");
            }
            if (names.has(name)) {
                throw new Error("duplicated param name");
            }
            names.add(name);
        } else if (!p.trim() && i > 0 && i < pattern.length - 1) {
            throw new Error("invalid path segment");
        }
    }
    return _path => {
        const path = _path.split("/");
        if (pattern.length !== path.length) {
            return null;
        }
        const params: any = {};
        for (let i = 0; i < pattern.length; i++) {
            const p = pattern[i];
            if (p[0] === "{" && p[p.length - 1] === "}") {
                const name = p.slice(1, -1).trim();
                params[name] = path[i];
            } else if (p !== path[i]) {
                return null;
            }
        }
        return params;
    };
};

export interface PathHandler {
    method: Method;
    pattern: string;
    match: (path: string) => any;
    handle: EndHandler;
}

export class App {
    middlewares: Middleware[] = [];

    use(m: Middleware) {
        this.middlewares.push(m);
    }

    async listen(port: number, host = "127.0.0.1") {
        const s = http.serve(`${host}:${port}`);
        let self = this;
        let abort = false;

        async function start() {
            for await (const httpRequest of s) {
                if (abort) {
                    break;
                }
                const req = new Request(httpRequest);
                const res = new Response();
                try {
                    await runMiddlewares(self.middlewares, req, res);
                } catch (e) {
                    console.error("runMiddlewar: ", e.message);
                    if (!res.status) {
                        res.status = 500;
                    } else {
                    }
                }
                try {
                    await httpRequest.respond(res.toHttpResponse());
                } finally {
                    // console.log(await resources());
                }
            }
        }

        async function close() {
            abort = true;
        }

        start();
        return {
            port,
            close
        };
    }

    private addPathHandler(method: Method, pattern: string, handle: EndHandler) {
        this.middlewares.push({
            method,
            pattern,
            match: simplePathMatcher(pattern),
            handle
        });
    }

    get(pattern: any, handle: EndHandler): void {
        this.addPathHandler("GET", pattern, handle);
    }

    post(pattern: any, handle: EndHandler): void {
        this.addPathHandler("POST", pattern, handle);
    }

    put(pattern: any, handle: EndHandler): void {
        this.addPathHandler("PUT", pattern, handle);
    }

    patch(pattern: any, handle: EndHandler): void {
        this.addPathHandler("PATCH", pattern, handle);
    }

    delete(pattern: any, handle: EndHandler): void {
        this.addPathHandler("DELETE", pattern, handle);
    }
}

export class Request {
    get method(): Method {
        return this.raw.method;
    }

    get url(): string {
        return this.raw.url;
    }

    get headers(): Headers {
        return this.raw.headers;
    }

    get body(): Uint8Array {
        return this.raw.r.buf
    }

    path: string;
    search: string;
    query: Query;
    params!: Params;
    data: any;
    error?: Error;
    extra: any = {};

    constructor(public raw: any) {
        const url = new URL("http://a.b" + raw.url);
        this.path = url.pathname;
        this.search = url.search;
        const query: Query = {};
        for (let [k, v] of new URLSearchParams(url.search) as any) {
            if (Array.isArray(query[k])) {
                query[k] = [...query[k], v];
            } else if (typeof query[k] === "string") {
                query[k] = [query[k], v];
            } else {
                query[k] = v;
            }
        }
        this.query = query;
    }
}

export class Response {
    status = 200;
    headers = new Headers();
    body?: string | Uint8Array | Reader;
    resources: Closer[] = [];

    toHttpResponse(): http.Response {
        let {status, headers, body = new Uint8Array(0)} = this;
        if (typeof body === "string") {
            body = new TextEncoder().encode(body);
            if (!headers.has("Content-Type")) {
                headers.append("Content-Type", "text/plain");
            }
        }
        return {status, headers, body};
    }

    close() {
        for (let resource of this.resources) {
            resource.close();
        }
    }

    async empty(status: number): Promise<void> {
        this.status = status;
    }

    async json(json: any): Promise<void> {
        this.status = 205;
        this.headers.append("Content-Type", "application/json");
        this.body = JSON.stringify(json);
        this.close();
    }

    async file(
        filePath: string,
        transform?: (src: string) => string
    ): Promise<void> {
        const notModified = false;
        if (notModified) {
            this.status = 304;
            return;
        }
        const extname: string = path.extname(filePath);
        const contentType: any = lookup(extname.slice(1)) || '';
        const fileInfo = await stat(filePath);
        if (!fileInfo.isFile) {
            return;
        }
        this.headers.append("Content-Type", contentType);
        if (transform) {
            const bytes = await readFile(filePath);
            let str = new TextDecoder().decode(bytes);
            str = transform(str);
            this.body = new TextEncoder().encode(str);
        } else {
            const file = await open(filePath);
            this.resources.push(file);
            this.body = file;
        }
    }
}

async function runMiddlewares(
    ms: Middleware[],
    req: Request,
    res: Response
): Promise<void> {
    if (ms.length) {
        const [m, ...rest] = ms;
        await runMiddleware(m, ms.length, req, res, () => {
            return runMiddlewares(rest, req, res);
        });
    }
}

async function runMiddleware(
    m: Middleware,
    length: number,
    req: Request,
    res: Response,
    next: Next
): Promise<void> {
    if (isPathHandler(m)) {
        if (m.method !== req.method) {
            next();
        } else {
            const params = m.match(req.url);
            if (params) {
                req.extra.matchedPattern = m.pattern;
                req.params = params;
                await m.handle(req, res);
            } else {
                if (length === 1)
                    // if is last next and no route is found the route does not exist
                    res.status = 404;
                next();
            }
        }
    } else {
        await m(req, res, next);
    }
}

function isPathHandler(m: Middleware): m is PathHandler {
    return typeof m !== "function";
}

export function static_(dir: string): Middleware {
    return async (req, res, next) => {
        const filePath = path.join(dir, req.url.slice(1) || "index.html");
        try {
            await res.file(filePath);
        } catch (e) {
            console.log("static: ", e.message);
            await next();
        }
    };
}

export const bodyParser = {
    json(): Middleware {
        return async (req, res, next) => {
            if (req.headers.get("Content-Type") === "application/json") {
                try {
                    // get full body content
                    const bodyText = new TextDecoder().decode(req.body)
                    // remove null chars
                    const clearBodyText = bodyText.replace(/\0/g, '')
                    // get only data content
                    const content = clearBodyText.split("\r\n\r\n")[1]
                    req.data = JSON.parse(content);
                } catch (e) {
                    console.error("json: ", e.message);
                    res.status = 400;
                    req.error = e.message;
                    return;
                }
            }
            await next();
        };
    },
    urlencoded(): Middleware {
        return async (req, res, next) => {
            if (
                req.headers.get("Content-Type") === "application/x-www-form-urlencoded"
            ) {
                try {
                    const body: any = await req.body;
                    const text: any = new TextDecoder().decode(body);
                    const data: any = {};
                    for (let s of text.split("&")) {
                        const result = /^(.+?)=(.*)$/.exec(s);
                        if (result !== null && result.length < 3) {
                            continue;
                        } else if (result !== null) {
                            const key = decodeURIComponent(result[1].replace("+", " "));
                            const value = decodeURIComponent(result[2].replace("+", " "));
                            if (Array.isArray(data[key])) {
                                data[key] = [...data[key], value];
                            } else if (data[key]) {
                                data[key] = [data[key], value];
                            } else {
                                data[key] = value;
                            }
                        }
                    }
                    req.data = data;
                } catch (e) {
                    console.error("urlencoded: ", e.message);
                    res.status = 400;
                    req.error = e.message;
                    return;
                }
            }
            await next();
        };
    }
};

export function simpleLog(): Handler {
    return async (req, res, next) => {
        await next();
        if (!res) {
            console.log(req.method, req.url);
        } else if (res.status >= 500) {
            console.log(red(res.status + ""), req.method, req.url);
            if (req.error) {
                console.log(red(req.error + ""));
            }
        } else if (res.status >= 400) {
            console.log(yellow(res.status + ""), req.method, req.url);
        } else if (res.status >= 300) {
            console.log(cyan(res.status + ""), req.method, req.url);
        } else if (res.status >= 200) {
            console.log(green(res.status + ""), req.method, req.url);
        }
    };
}
