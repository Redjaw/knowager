import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
<<<<<<< codex/implement-project-as-described-in-plans.md-vbkc00
    env: {
      publicPrefix: 'VITE_'
    },
=======
>>>>>>> main
    adapter: adapter({
      fallback: '404.html'
    }),
    paths: {
      base: process.env.BASE_PATH || ''
    }
  }
};

export default config;
