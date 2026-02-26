// Local dev server — serves static files + API routes (mirrors Vercel edge locally)
require('dotenv').config({ path: '.env.local' })

const express = require('express')
const path = require('path')
const fs = require('fs')

const app = express()
app.use(express.json())

// Serve static files from project root
app.use(express.static(path.join(__dirname)))

// Mount all API routes from /api directory
const apiDir = path.join(__dirname, 'api')
fs.readdirSync(apiDir).forEach((file) => {
    if (!file.endsWith('.js')) return
    const routeName = file.replace('.js', '')
    const handler = require(path.join(apiDir, file))
    app.post(`/api/${routeName}`, handler)
    app.get(`/api/${routeName}`, handler)
    console.log(`  ✓ Mounted /api/${routeName}`)
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`\n🚀 AXO dev server running at http://localhost:${PORT}`)
    console.log(`   Live demo: http://localhost:${PORT}/demo.html\n`)
})
