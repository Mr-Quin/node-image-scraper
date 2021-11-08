import express from 'express'
import { scraper } from './src/scrape.js'
import { getLinkPreview } from 'link-preview-js'
import { tryCatch } from './src/util.js'
import { chromium } from 'playwright'

const app = express()
const port = process.env.PORT || 3000

// logs the ip of the requester
const logRequest = (req, res, next) => {
    console.log(
        `${req.ip} requested ${req.url} with query ${JSON.stringify(
            req.query
        )} and body ${JSON.stringify(req.body)}`
    )
    next()
}

const getMeta = async (url) => {
    return getLinkPreview(url, { headers: { 'User-Agent': 'googlebot', timeout: 1000 } })
}

const checkUrl = (req, res, next) => {
    if (!req.body.url) return res.status(400).json({ msg: 'missing url' })
    next()
}

const allowPost = (req, res, next) => {
    if (req.method !== 'POST') {
        return res.status(400).json({ msg: 'only post requests allowed' })
    }
    next()
}

app.use(express.urlencoded({ extended: true }))
    .use(express.json())
    .use(allowPost)
    .use(logRequest)

const entry = async (req, res) => {
    const { url, scrapeImages } = req.body

    const opts = scrapeImages === true || scrapeImages === 'true' ? { scrapeImages: true } : {}
    const scrape = await scraper(url, opts)

    const [scrapedData, scrapeErr] = await tryCatch(scrape.scrape, scrape.close)

    if (scrapeErr) throw scrapeErr

    const metadata = await getMeta(url)

    return res.json({ data: { ...scrapedData, ...metadata }, msg: 'success' })
}

app.post('/', checkUrl, entry)

app.use((err, req, res, next) => {
    console.error(err)
    res.status(500).json({ msg: err.message })
})

// keep browser instance open
export const browser = await chromium.launch({ headless: false })

app.listen(port, () => console.log(`Listening on port ${port}`))
