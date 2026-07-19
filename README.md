# React + TypeScript + Vite

## Menjalankan lokal dengan Neon branch `dev`

Frontend selalu berbicara ke API lokal pada `http://localhost:3000`; browser
tidak pernah terhubung langsung ke Neon. Siapkan file yang diabaikan Git di
workspace backend (`../kataloka-main-be/.env.neon`) dari template backend, lalu
isi `DATABASE_URL` dengan connection string Neon untuk branch `dev` (termasuk
`sslmode=require`). Jangan menaruh URL tersebut pada file `.env` di frontend
atau pada variabel `VITE_*`.

Jalankan seluruh stack dengan satu perintah dari repository ini:

```sh
make neon-dev
```

Saat startup, backend memvalidasi file environment dan `DATABASE_URL`, lalu
berjalan pada `http://localhost:3000`; frontend berjalan pada
`http://localhost:3001`. Tidak ada migration yang dijalankan.
Gunakan `Ctrl+C` untuk menghentikan keduanya, atau `make stop` dari repository
ini. Untuk database lokal/default, gunakan `make local`.

Untuk menerapkan schema atau seed ke Neon branch `dev`, jalankan dari root
frontend dengan target `make db-neon-dev-migrate`, `make db-neon-dev-seed`,
atau `make db-neon-dev-provision-admin`. Semua meneruskan ke backend dan
memerlukan konfirmasi eksplisit; lihat
`../kataloka-main-be/docs/neon-dev-schema-seed.md` untuk nilai konfirmasi dan
prasyarat URL direct Neon.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x';
import reactDom from 'eslint-plugin-react-dom';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
