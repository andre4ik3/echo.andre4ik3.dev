import Handlebars from 'handlebars/runtime.js';
import '../generated/template.mjs';
import { hbsAsyncRender, registerAsyncHelper } from 'hbs-async-render';

async function makeHTML(request: Request) {
    const params = makeJSON(request);
    return await hbsAsyncRender(Handlebars, 'template.html', params);
}

function makeJSON(request: Request) {
    return {
        method: request.method,
        url: request.url,
        protocol: request.cf.httpProtocol,
        tlsVersion: request.cf.tlsVersion,
        headers: request.headers.entries().filter(([name, _]) => !name.startsWith('cf-')),
        geo: {
            ip: request.headers.get('CF-Connecting-IP'),
            rtt: request.cf.clientTcpRtt,
            country: request.cf.country,
            region: request.cf.region,
            city: request.cf.city,
            timezone: request.cf.timezone,
            latitude: request.cf.latitude,
            longitude: request.cf.longitude,
        },
    };
}

export default {
    async fetch(request, env, ctx): Promise<Response> {
        const accept = request.headers.get('accept').split(',');
        const html = accept.some((x) => x.startsWith('text/html'));

        console.log(request);

        let body;
        let contentType;

        if (accept.some((x) => x.startsWith('text/html'))) {
            body = await makeHTML(request);
            contentType = 'text/html';
        } else {
            body = JSON.stringify(makeJSON(request));
            contentType = 'application/json';
        }

        return new Response(body, { headers: { 'Content-Type': contentType } });
    },
} satisfies ExportedHandler<Env>;
