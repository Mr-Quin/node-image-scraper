const express = require('express')
const { JSDOM } = require('jsdom')
const got = require('got')
const app = express()
const port = process.env.PORT || 3000

app.use(express.urlencoded({ extended: true })).use(express.json())

const imageRegex = /(?<=\.)(png|jpe?g|gif|svg)$/
const parensRegex = /^((?!\().)*$/

const tryCatch = async (action) => {
    try {
        const result = await action()
        return [result, null]
    } catch (error) {
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

const scrape = async (url) => {
    const { origin } = new URL(url)

    const [response, err] = await tryCatch(async () => {
        const request = got(url, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36',
                Referer: origin,
            },
        })
        return await request
    })

    if (err) return err

    const dom = new JSDOM(response.body, {
        url: url,
        referrer: origin,
    })

    const nodeList = dom.window.document.querySelectorAll('img')
    const nodeArray = [...nodeList]

    return nodeArray
        .map((link) => {
            return new URL(link.src, url).href
        })
        .filter(isImage)
        .filter(noParens)
}

const entry = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(400).json({ msg: 'Bad request', reason: 'Method not allowed' })
    }

    const { url } = req.body

    if (!url) {
        return res.status(400).json({ msg: 'Bad request', reason: 'No URL' })
    }

    const result = await scrape(url)

    return res.json(result)
}

app.post('/', entry)

app.listen(port, () => console.log(`Listening on port ${port}`))
