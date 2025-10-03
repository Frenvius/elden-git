import { defineConfig } from 'vite'

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    build: {
        minify: false,
        lib: {
            name: 'Elden Git',
            entry: {
                background: resolve(__dirname, 'src/background.ts'),
                content: resolve(__dirname, 'src/content.ts')
            },
            formats: ['cjs'],
            fileName: (_format, entryName) => `${entryName}.js`
        }
    }
})
