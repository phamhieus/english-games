import { availableProviders, currentUser, handleAuth } from './auth';
import { getData, putData } from './data';
import { error, json, sameOrigin } from './http';
import { handleTts } from './tts';

/**
 * Word Shooter Worker. Static assets (the built app) are served by the assets binding;
 * only /api/* reaches this code (see `run_worker_first` in wrangler.jsonc).
 */
export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean); // ['api', ...]
    if (parts[0] !== 'api') return error(404, 'Not found.');
    if (request.method !== 'GET' && !sameOrigin(request, env)) return error(403, 'Cross-site request blocked.');

    try {
      switch (parts[1]) {
        case 'auth':
          return await handleAuth(request, env, ctx, parts.slice(2));

        case 'me': {
          const user = await currentUser(request, env);
          if (request.method === 'GET') return json({ user, providers: availableProviders(env) });
          if (request.method === 'DELETE') {
            if (!user) return error(401, 'Not signed in.');
            // Cascades to sessions and saved data.
            await env.DB.prepare('DELETE FROM users WHERE id = ?1').bind(user.id).run();
            return new Response(null, { status: 204, headers: { 'Set-Cookie': 'ws_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax' } });
          }
          return error(405, 'Method not allowed.');
        }

        case 'data': {
          const user = await currentUser(request, env);
          if (!user) return error(401, 'Not signed in.');
          if (request.method === 'GET') return await getData(env, user);
          if (request.method === 'PUT') return await putData(request, env, user);
          return error(405, 'Method not allowed.');
        }

        case 'tts':
          return await handleTts(request, env, ctx);

        default:
          return error(404, 'Not found.');
      }
    } catch (e) {
      console.error(JSON.stringify({ msg: 'api error', path: url.pathname, error: e instanceof Error ? e.message : String(e) }));
      return error(500, 'Something went wrong. Please try again.');
    }
  },
} satisfies ExportedHandler<Env>;
