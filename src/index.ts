import Handlebars from "handlebars/runtime.js";
import "../generated/template.mjs";
import { hbsAsyncRender, registerAsyncHelper } from "hbs-async-render";
import { capitalize } from "lodash";

function titleCase(str) {
    return str.replace(/\w+/g, capitalize);
}

Handlebars.registerHelper("title", titleCase);

async function makeHTML(request: Request) {
    const params = await makeJSON(request);
    return await hbsAsyncRender(Handlebars, "template.html", params);
}

async function makeRaw(request: Request) {
    const params = await makeJSON(request);
    const url = new URL(request.url);
    let data = `${params.method} ${url.pathname} ${params.protocol}\n`;

    request.headers.forEach((value, key) => {
        data += `${titleCase(key)}: ${value}\n`;
    });

    data += "\n";
    data += params.body;

    return data;
}

async function makeJSON(request: Request) {
    return {
        method: request.method,
        url: request.url,
        protocol: request.cf.httpProtocol,
        tlsVersion: request.cf.tlsVersion,
        headers: Object.fromEntries(Array.from(request.headers.entries())),
        body: await request.text(),
        date: new Date(),
        geo: {
            ip: request.headers.get("CF-Connecting-IP"),
            rtt: request.cf.clientTcpRtt,
            country: request.cf.country,
            region: request.cf.region,
            city: request.cf.city,
            timezone: request.cf.timezone,
            latitude: request.cf.latitude,
            longitude: request.cf.longitude,
            asNumber: request.cf.asn,
            asOrganization: request.cf.asOrganization,
        },
    };
}

export default {
    async fetch(request, env, ctx): Promise<Response> {
        const accept = request.headers.get("accept").split(",");

        let body;
        let contentType;

        const extension = request.url.split(".").at(-1);
        const acceptsHTML = accept.some(x => x.startsWith("text/html"));
        const knownExtension = ["html", "raw", "json"].includes(extension);

        if (extension === "html" || (!knownExtension && acceptsHTML)) {
            body = await makeHTML(request);
            contentType = "text/html";
        } else if (extension === "raw") {
            body = await makeRaw(request);
            contentType = "text/plain";
        } else {
            body = JSON.stringify(await makeJSON(request));
            contentType = "application/json";
        }

        return new Response(body, {
            headers: {
                "Content-Type": contentType,
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
        });
    },
} satisfies ExportedHandler<Env>;
