const headless = process.env.HEADLESS?.toLocaleLowerCase() === 'true' ? true : false;

export const PUPPETEER_OPTIONS = {
    headless,
    args: [
        // '--disable-gpu',
        '--disable-dev-shm-usage',
        // '--disable-setuid-sandbox',
        // '--timeout=30000',
        // '--no-first-run',
        '--no-sandbox',
        // '--no-zygote',
        // '--single-process',
        // "--proxy-server='direct://'",
        // '--proxy-bypass-list=*',
        // '--deterministic-fetch',
    ],
}