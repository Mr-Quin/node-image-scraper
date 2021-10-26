// Imports the Google Cloud client library
const {Translate} = require('@google-cloud/translate').v2;
const got = require('got');
const { JSDOM } = require("jsdom");

const imageRegex = /(?<=\.)(png|jpe?g|gif)/
const parensRegex = /^((?!\().)*$/;

const isImage = (link) => {
  // Return false if there is no href attribute.
  if(typeof link.href === 'undefined')  return false 

  return imageRegex.test(link.href.includes)
};

const noParens = (link) => {
  return parensRegex.test(link.textContent);
};

const scrape = async (url) => {
  const response = await got(url);
  const dom = new JSDOM(response.body);

  // Create an Array out of the HTML Elements for filtering using spread syntax.
  const nodeList = [...dom.window.document.querySelectorAll('a')];

  return nodeList.filter(isImage).filter(noParens).map(link => 
    link.href
  )
}

// Creates a client
const translate = new Translate();

async function translateText(text, target='ja') {
  // Translates the text into the target language. "text" can be a string for
  // translating a single piece of text, or an array of strings for translating
  // multiple texts.
  const [translations] = await translate.translate(text, target);
  return Array.isArray(translations) ? translations : [translations];
}

exports.entry = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(400).json({msg: 'Bad request', reason: 'Method not allowed'})
  }

  const {text, lang, target, url} = req.body

  const result = await scrape(url)

  return res.json(result)

  // if (!text || !target) {
  //   return res.status(400).json({msg: 'Bad request', reason: 'Missing required parameters'})
  // }

  // const translation = await translateText(text, target)

  res.json(translation)
};
