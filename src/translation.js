// Imports the Google Cloud client library
const {Translate} = require('@google-cloud/translate').v2;

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

  const {text, lang, target} = req.body

  if (!text || !target) {
    return res.status(400).json({msg: 'Bad request', reason: 'Missing required parameters'})
  }

  const translation = await translateText(text, target)

  res.json(translation)
};
