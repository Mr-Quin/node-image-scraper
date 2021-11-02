const express = require('express')
const app = express()
const port = process.env.PORT || 3000
const puppeteer = require('puppeteer')
const { getLinkPreview } = require('link-preview-js')

const PUPPETEER_OPTIONS = {
    headless: false,
    args: [
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--timeout=30000',
        '--no-first-run',
        '--no-sandbox',
        '--no-zygote',
        '--single-process',
        "--proxy-server='direct://'",
        '--proxy-bypass-list=*',
        '--deterministic-fetch',
    ],
}

const openConnection = async () => {
    const browser = await puppeteer.launch(PUPPETEER_OPTIONS)
    const page = await browser.newPage()
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36'
    )
    await page.setViewport({ width: 1680, height: 1050 })
    return { browser, page }
}

const closeConnection = async (page, browser) => {
    page && (await page.close())
    browser && (await browser.close())
}

const sleep = async (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

const imageRegex = /(?<=\.)(png|jpe?g|gif|svg)$/
const parensRegex = /^((?!\().)*$/

const tryCatch = async (action, onError) => {
    try {
        const result = await action()
        return [result, null]
    } catch (error) {
        if (onError) {
            await onError(error)
        }
        return [null, error]
    }
}

const isImage = (link) => {
    // Return false if there is no href attribute.
    if (typeof link === 'undefined') return false

    return imageRegex.test(link)
}

const noParens = (link) => {
    return parensRegex.test(link)
}

const allowPost = (req, res, next) => {
    if (req.method !== 'POST') {
        return res.status(400).json({ msg: 'only post requests allowed' })
    }
    next()
}

const getMeta = async (url) => {
    return getLinkPreview(url, { headers: { 'User-Agent': 'googlebot', timeout: 1000 } })
}

const scrapePage = async (url) => {
    const { page, browser } = await openConnection()

    const destroy = async () => {
        await closeConnection(page, browser)
    }

    const get = async () => {
        await page.goto(url, { waitUntil: 'load' })
        const [selectorResult, err] = await tryCatch(() =>
            page.waitForSelector('img', { timeout: 4000 })
        )
        // wait an extra second for more images
        await page.waitForTimeout(1000)

        const screenshot = await page.screenshot({ encoding: 'base64', type: 'jpeg' })
        const imageNodes = await page.evaluate(() => document.querySelectorAll('img'))

        console.debug(imageNodes)

        const imageArray = Array.from(imageNodes).map((node) => {
            return new URL(node.src, url).href
        })
        // .filter(isImage)
        // .filter(noParens)

        await destroy()

        return { scrapedImages: imageArray, screenshot:`data:image/png;base64,${screenshot}` }
    }

    return {
        get,
        destroy,
    }
}

const checkUrl = (req, res, next) => {
    if (!req.body.url) return res.status(400).json({ msg: 'missing url' })
    next()
}

app.use(express.urlencoded({ extended: true }))
    .use(express.json())
    .use(allowPost)

const entry = async (req, res) => {
    const { url } = req.body
    const scraper = await scrapePage(url)
    const [scrapedData, error] = await tryCatch(scraper.get)

    if (error) return res.status(400).json({ msg: error.message })

    const metadata = await getMeta(url)

    return res.json({ data: { ...scrapedData, ...metadata }, msg: 'success' })
}

app.post('/', checkUrl, entry)

app.listen(port, () => console.log(`Listening on port ${port}`))
