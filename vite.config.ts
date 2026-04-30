import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { resolve } from 'path'
import fs from 'fs'



export default defineConfig({
    base: '/',
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                ...getSketchEntries()
            },

        },
    },
    plugins: [
        basicSsl()
    ],
    server: {
        host: true
    }
})

// ルートディレクトリにある「00」から始まるディレクトリを取得
function getSketchEntries() {
    const entries: Record<string, string> = {}
    const folders = fs.readdirSync(__dirname, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('00'))
        .map(dirent => dirent.name)
    folders.forEach(folder => {
        entries[folder] = resolve(__dirname, folder, 'index.html')
    })
    return entries
}