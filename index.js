const express = require('express')
const { JSDOM } = require('jsdom')
const got = require('got')
const app = express()
const port = process.env.PORT || 3000

app.use(express.urlencoded({ extended: true })).use(express.json())

const imageRegex = /(?<=\.)(png|jpe?g|gif|svg)$/
const parensRegex = /^((?!\().)*$/

const isImage = (link) => {
    // Return false if there is no href attribute.
    if (typeof link === 'undefined') return false

    return imageRegex.test(link)
}

const noParens = (link) => {
    return parensRegex.test(link)
}

const scrape = async (url) => {
    const response = await got(url)
    const dom = new JSDOM(response.body)

    // Create an Array out of the HTML Elements for filtering using spread syntax.
    const nodeList = dom.window.document.querySelectorAll('img')
    const nodeArray = [...nodeList]

    console.log(nodeList)

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
