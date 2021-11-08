import { chromium } from 'playwright'
import { headless } from '../config.js'
import { tryCatch } from './util.js'
import { browser } from '../index.js'

const resolvePath = (url) => (path) => new URL(path, url).href

const removeDuplicates = (arr) => [...new Set(arr)]

const formatBase64Image = (base64) => `data:image/png;base64,${base64}`

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const isImage = (link) => {
    const imageRegex = /(?<=\.)(png|jpe?g|gif|svg)($|\?.*)/
    // Return false if there is no href attribute.
    if (typeof link === 'undefined') return false

    return imageRegex.test(link)
}

const openPage = async () => {
    const page = await browser.newPage({
        viewport: { width: 1680, height: 1050 },
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36',
    })
    return page
}

const screenshotPage = async (page) => {
    // hope this doesn't throw
    const screenshotBuffer = await page.screenshot()
    const screenshot = screenshotBuffer.toString('base64')

    return formatBase64Image(screenshot)
}

const extractImages = async (page, url, opts = { timeout: 3000 }) => {
    // this throws an error if the page doesn't load within the timeout
    const [elements, err] = await tryCatch(async () =>
        page.waitForSelector('img', {
            state: 'attached',
            strict: false,
            ...opts,
        })
    )

    // if error, assume no images in page
    if (err) {
        return []
    }

    const images = await page.$$eval('img', (imgs) => imgs.map((img) => img.getAttribute('src')))

    return removeDuplicates(images)
}

export const scraper = async (url, opts = {}) => {
    console.log(`Starting scraper with url ${url} and options ${JSON.stringify(opts)}`)
    const page = await openPage()

    const close = async () => {
        page.close()
    }

    const scrape = async () => {
        // rewrite the default error message
        await tryCatch(
            () => page.goto(url, { waitUntil: 'load', timeout: 5000 }),
            (err) => {
                throw new Error('Page load timed out')
            }
        )

        // delay 500ms
        await sleep(500)

        const tasks = []

        tasks.push(screenshotPage(page))

        if (opts.scrapeImages) tasks.push(extractImages(page))

        const [screenshot, images] = await Promise.all(tasks)

        const scrapedImages = images?.map(resolvePath(url)).filter(isImage) ?? []

        await close()

        return { screenshot, scrapedImages }
    }

    return { close, scrape }
}
