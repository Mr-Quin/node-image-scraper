import express from 'express'
import puppeteer from 'puppeteer'
import { getLinkPreview } from 'link-preview-js'
import { PUPPETEER_OPTIONS } from './config.js'

const app = express()
const port = process.env.PORT || 3000


const openConnection = async () => {
    const browser = await puppeteer.launch(PUPPETEER_OPTIONS)

    console.log('setting page');
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

const tryCatch = async (action, onError) => {
    try {
        const result = await action()
        return [result, null]
    } catch (error) {
        console.error(error)
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



const getMeta = async (url) => {
    return getLinkPreview(url, { headers: { 'User-Agent': 'googlebot', timeout: 1000 } })
}

const scrapePage = async (url) => {
    console.log('openning browser');
    const { page, browser } = await openConnection()
    console.log('browser opened');

    let destroyed = false

    const destroy = async () => {
        console.log('closing browser');
        if (destroyed) return
        destroyed = true
        await closeConnection(page, browser)
    }

    const get = async () => {
        console.log(`navigating to ${url}`);

        await page.goto(url, { waitUntil: 'load' })

        console.log(`page loaded`);
        console.log('waiting for images');

        const [selectorResult, err] = await tryCatch(() =>
            page.waitForSelector('img', { timeout: 4000 })
        )
        // wait an extra second for more images
        await page.waitForTimeout(1000)

        console.log('screenshotting page');

        const screenshot = await page.screenshot({ encoding: 'base64', type: 'jpeg' })
        const images  = await page.$$eval('img', (imgs) => imgs.map((img) => img.getAttribute('src')))        

        console.log('screenshot taken');

        // remove duplicates from images
        const imageArray = [...new Set(images)].map((img) => {
            return new URL(img, url).href
        })
        // .filter(isImage)
        // .filter(noParens)

        await destroy()

        console.log('success');

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

const allowPost = (req, res, next) => {
    if (req.method !== 'POST') {
        return res.status(400).json({ msg: 'only post requests allowed' })
    }
    next()
}

app.use(express.urlencoded({ extended: true }))
    .use(express.json())
    .use(allowPost)

const entry = async (req, res) => {
    const { url } = req.body
    console.log(`Received ${url}`);
    console.log('starting scraper');
    const scraper = await scrapePage(url)
    const [scrapedData, error] = await tryCatch(scraper.get, scraper.destroy)

    if (error) return res.status(400).json({ msg: error.message })

    const metadata = await getMeta(url)

    return res.json({ data: { ...scrapedData, ...metadata }, msg: 'success' })
}

app.post('/', checkUrl, entry)

app.listen(port, () => console.log(`Listening on port ${port}`))
