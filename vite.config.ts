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
                content: resolve(__dirname, 'src/content.ts'),
                background: resolve(__dirname, 'src/background.ts'),
                'inject-azure': resolve(__dirname, 'src/inject-azure.ts')
            },
            formats: ['cjs'],
            fileName: (_format, entryName) => `${entryName}.js`
        }
    }
})
