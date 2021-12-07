const MAX_API_PAGES = 1;
const TITLE_PATTERNS = [];
const SUBTITLE_MATCHES = [];
const KNOWN_ASINS = [];
const TODAY = new Date().toJSON().slice(0,10).replace(/-/g,'/');
const PUBLIC_FILE = "https://cdn.jsdelivr.net/gh/the-markup/tool-amazon-brand-detector@main/extension/data/api_params.json";
var MARKET2APIPARAMS = {};    // always default to const if you can. 

// The storage API is weird to me... 
// It seems to encourage getting/setting the entire storage object
// instead of updating particular keys. 
// https://developer.chrome.com/docs/extensions/reference/storage/
const storage = {
    load: async function(key) {
        return new Promise(function (resolve, reject) {
            chrome.storage.sync.get(key, (obj) => chrome.runtime.lastError
                ? reject(chrome.runtime.lastError)
                : resolve(obj));
        });
    },
    save: async function(obj) {
        return new Promise(function (resolve, reject) {
            chrome.storage.sync.set(obj, () => chrome.runtime.lastError
                ? reject(chrome.runtime.lastError)
                : resolve());
        });
    }
}

// We want to immediately load content when the content script loads
// Keep the promise returned from loadContent
// This can either be chained to a then() when popup.js requests the content
// Or it can be set to another promise when background tells the script
// that the URL has changed. 
let promises = { };
promises[window.location.href] = loadContent()

/**
 * Load API params from the cloud once daily
 */ 
async function updateApiParams() {
    console.log("getting latest params from the WWW");
    let resp = await get(PUBLIC_FILE)
    try {
        MARKET2APIPARAMS = JSON.parse(resp);
        await storage.save({"MARKET2APIPARAMS": MARKET2APIPARAMS});
        await storage.save({"lastChecked": TODAY});
    } catch(e) {
        console.log("Failed to parse API params", e.message);
        MARKET2APIPARAMS = await loadJSON("data/api_params.json")
        await storage.save({"MARKET2APIPARAMS": MARKET2APIPARAMS});
    }
}


async function getApiParams() {
    let lastChecked = await storage.load("lastChecked");
    lastChecked = lastChecked["lastChecked"];
    if (lastChecked !== TODAY) {
        // update old keys
        await updateApiParams();
    } else {
        // get today's keys from storage
        console.log("loading todays params from storage")
        MARKET2APIPARAMS = await storage.load("MARKET2APIPARAMS");
        MARKET2APIPARAMS = MARKET2APIPARAMS["MARKET2APIPARAMS"];
    }
}

/**
 * Called when a message is received through the chrome runtime
 * 
 * Learned the hard way: this can't be an async function.
 * It's very important to return true from this. 
 * https://stackoverflow.com/questions/20077487/chrome-extension-message-passing-response-not-sent
 * 
 * @param {*} request 
 * @param {*} sender 
 * @param {*} sendResponse 
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // console.log("onMessage request", request);

    // reassign the promise in response to a message from background.js saying that the URL has changed.
    if(request === "url_changed") {
        promises[window.location.href] = loadContent();
    }

    // Popup.js will send a "get_content" request when it is loaded
    // If the content is already loaded, this will be resolved and return immediately
    // If it's still working, it will finish and then rend the content back to popup.js
    if(request === "get_content") {
        promises[window.location.href].then(sendResponse)
    }

    if(request === "clear_storage") {
        console.log("clearing storage!");
        chrome.storage.sync.clear();
    }

    if(request === "log_storage") {
        chrome.storage.sync.get(null, (obj) => console.log(obj));
    }
    return true;
});

/**
 * Gets all the data that popup.js needs to render the page.
 * 1. get the list of Our Brand products
 * 2. get all of the products on the page
 * 3. find and return the overlap
 * 4. and send that back to popup.js
 */
async function loadContent() {
    console.log(`loadContent(${window.location.href})`);
    try {
        let enabled = await storage.load('toggleisExtensionActive');
        enabled = enabled.toggleisExtensionActive;
        if (enabled === undefined) { enabled = true};
        if (enabled === false) {
            console.log("ending");
            throw new Error("Not enabled.")
        }

        await init();
        
        // The following arrays will both contain DOM elements like div[data-asin]
        const api_results = await getOurBrandsProducts();     // DOM elements that represent Our Brands products
        const page_products = getProductsOnPage();            // DOM elements of all prodiucts on the current page
        const carousel_asins = await getCarouselProducts();   // Array of ASIN strings from products in Our Brands carousel

        // For debugging purposes...
        output_products('API Results', api_results);
        output_products('Products on page', page_products);

        // Which products have the honor of going into the overlap array?
        const overlap = [];
        const now = Date.now();
        for(const p of page_products) {
            const detection_method = isAmazonBrand(p, api_results, carousel_asins);
            if(detection_method) {
                const obj = { 
                    title: getTitle(p), 
                    asin: getASIN(p), 
                    link: getLink(p), 
                    date_seen: now,
                    detection_method
                };

                overlap.push(obj);
                stain(obj.asin);
            }
        }

        console.log('overlap', overlap.length);

        // This is what gets parsed by the popup.js to create the content
        const content = {
            "products": overlap, 
            "num_on_page": page_products.length,
        };

        console.log("returning content", content)
        return content;

    } catch(e) {
        console.log(e.stack)
        return {"error": `problem getting content. ${e.message}`};
    }
}


/**
 * Read YAML files to create constants used in the extension.
 * Also gets API params from the cloud.
 */
var inited = false;
async function init() {
    if(inited) return;

    const asins = await loadYAML("data/asins.yaml");
    Array.prototype.push.apply(KNOWN_ASINS, Object.keys(asins));

    const subtitles = await loadYAML("data/subtitles.yaml");
    Array.prototype.push.apply(SUBTITLE_MATCHES, subtitles);

    const titles = await loadYAML("data/titles.yaml");
    titles.forEach(t => TITLE_PATTERNS.push(new RegExp(t, "i")) )

    await getApiParams();

    inited = true;
    return;
}
 /**
  * Loads local YAML file.
  * @param {*} filename 
  * @returns 
  */
async function loadYAML(filename) {
    const url = chrome.runtime.getURL(filename);
    const str = await get(url);
    return jsyaml.load(str);
}

async function loadJSON(filename) {
    const url = chrome.runtime.getURL(filename);
    const str = await get(url);
    return JSON.parse(str);
}

/**
 * Print a list of products to the console for debugging purposes
 * @param {*} title 
 * @param {*} products 
 */
function output_products(title, products) {
    console.log(`======== ${title}`, products.map(p => {
        return { title: getTitle(p), asin: getASIN(p), link: getLink(p), dom: p };
    }));
}

/**
 * For a given ASIN, stains the product listing box.
 * Additional selectors are for UI elements like colors of clothing
 * and whitespace for badges
 */
function stain(asin) {   
    // stain
    document.querySelectorAll(`div[data-asin='${asin}']`).forEach( p => {
        p.style.cssText += 'background:#ff990095; transition:all 0.5s linear; opacity: 1 !important;';
    });
    // bounding boxes around images.
    document.querySelectorAll(`div[data-asin='${asin}'] img.s-image`).forEach( p => {
        p.style.cssText += 'border: 4px solid #ff990095 !important;';
    });
    // remove opaque elements
    let opaqueElements = [
        "s-color-swatch-container", 
        "s-grid-status-badge-container-dark", 
        "s-image-elevated-grid-grey-overlay"
    ].map(t => `div[data-asin='${asin}'] div.${t}`).join(", ");
    document.querySelectorAll(opaqueElements).forEach( p => {
        p.style.cssText += 'background-color: transparent !important;';
    });
    // remove grey overlays
    let greyClasses = [
        "s-image-overlay-grey", 
        "s-image-elevated-grid-grey-overlay",
    ]
    let greyElements = greyClasses.map(t => `div[data-asin='${asin}'] div.${t}`).join(", ");
    document.querySelectorAll(greyElements).forEach( p => {
        greyClasses.forEach(toRemove => p.classList.remove(toRemove))
    });
}

/**
 * Returns a string if ele is an "Our Brand" product, false otherwise
 * This is determined using a few tests.
 * NOTE: This is where you can add more checks. 
 * It should be trivial to make this async and throw an "await" in front of the call above.
 * @returns a string describing how it was determined that the product was recognized as an Amazon product
 */
function isAmazonBrand(ele, api_results, carousel_asins) {
    // OPTIONAL refactoring for readability...
    const phrases = [
        "Featured from our brands",
        "Präsentiert von unseren Marken",
        "In evidenza dai nostri marchi",
        "Suggestions parmi nos marques",
        "Destacado de nuestras marcas" ];
    const re = new RegExp(`(${phrases.join("|")})`);

    if(ele.textContent.match(re))
        return "featured our brands";
    
    if(isInAPIResults(ele, api_results))
        return "api";

    const title = getTitle(ele);
    for(const pattern of TITLE_PATTERNS) {
        if(title.match(pattern)) 
            return "title pattern match";
    }

    const subtitle = getSubtitle(ele);
    for(const str of SUBTITLE_MATCHES) {
        if(subtitle.toUpperCase() == str.toUpperCase())
            return "subtitle pattern match";
        else if (subtitle.match("Amazon Brand"))
            return "subtitle pattern match";
    }

    if( KNOWN_ASINS.includes(getASIN(ele)))
        return "proprietary electronic ASIN";
        
    if( carousel_asins.includes(getASIN(ele)))
        return "Our Brands Carousel";

    return false;
}


/**
 * Does p appear in the api_results?
 * @param {DOM element} p 
 * @param {Array of DOM elements} api_results 
 */
function isInAPIResults(p, api_results) {
    const asin1 = getASIN(p);
    for(const ap of api_results) {
        const asin2 = getASIN(ap);
        if(asin1 == asin2) 
            return true;
    }
    return false;
}


/**
 * Gets all of the products on the current page. 
 * Returns an array of DOM objects
 */
function getProductsOnPage() {
    // We can't look on the whole page because sometimes that includes the user's shipping cart.
    const results = document.querySelector('[data-component-type="s-search-results"]');
    const asindivs = results.querySelectorAll("div[data-asin]");
    // There are some divs on the page that have a data-asin attribute but it has no value. 
    // So we have to filter those out. 
    return [...asindivs].filter( ele => ele.getAttribute("data-asin") );
}


/**
 * Gets the ASIN from a single ASIN div element.
 * @param {*} ele 
 */
function getASIN(ele) {
    if(!ele.hasAttribute("data-asin"))
        ele = ele.querySelector("div[data-asin]");
    return ele.getAttribute("data-asin");
}



/**
 * Gets the product link from a single ASIN div element.
 * @param {Element} ele 
 */
function getLink(ele) {
    let link = ele.querySelector("a");
    link = link 
        ? link.getAttribute("href")
        :window.location.href

    // Many of the links are relative. Let's fix that.
    if(!link.match(/^http/)) {
        const root = new URL(window.location.href).origin;
        link = new URL(link, root).href;
    }
        
    return link;
}


/**
 * Gets the product title from a single ASIN div element.
 * @param {Element} ele 
 */
function getTitle(ele) {
    //console.log("getting title", ele);
    let header = ele.querySelector("h2");
    if(header) 
        return header.textContent.trim();

    let image = ele.querySelector("img");
    if(image) 
        return image.getAttribute("alt");
    
    return "Unknown";
}

/**
 * 
 * Gets the subtitle of a product. This is used to text-match known brand names.
 * @param {*} ele 
 */
function getSubtitle(ele) {
    let header = ele.querySelector("h5");
    if(header) 
        return header.textContent.trim();

    return "Unknown";
}


/**
 * Returns a promise that will keep querying for an object until it is found, 
 * or until the timeout is up.
 * @param {*} q 
 * @param {*} timeout 
 */
async function queryWaitFor(q, timeout=800) {
    return new Promise(function (resolve, reject) {
        function find() {
            ele = document.querySelector(q);
            if(ele) {
                resolve(ele);
            } else {
                timeout -= 100;
                if(timeout > 0) {
                    setTimeout(find, 100);
                } else {
                    reject();
                }       
            }
        };
        find();
    });
}


/**
 * Tries to find the Our Brands link to construct the API endpoint URL
 * If not, it tries to construct it manually. 
 */
async function getAPIEndpoint() {
    let host = window.location.host.replace('smile.', 'www.');
    // console.log(host)
    try {
        // API params are on the page.
        // OPTIONAL refactoring for readability
        const our_brands_query = [
            "Our Brands",
            "Unsere Marken",
            "Nuestras Marcas",
            "Made for Amazon",
            "Nos marques",
            "Nuestras marcas",
            "I nostri brand"
        ].map(t => `[aria-label="${t}"] a`).join(", ");

        const ele = await queryWaitFor(our_brands_query);

        console.log(`Using Our Brands link to construct api endpoint`);
        let url = ele.getAttribute("href").replace("/s?", "/s/query?dc&");
        let regex = new RegExp('/s/query|k=|rh=|ref=', 'i');
        url = url.split('&').filter(param => param.match(regex)).join('&')
        return url;

    } catch(e) {
        console.log(e)
        if (host == "www.amazon.in") {
            return null
        }
        // Construct API based on dictionary and current link.
        console.log(`Didn't find Our Brands link. Using fallback method.`);
        var url = new URL(window.location.href.replace("/s?", "/s/query?"));
        if (MARKET2APIPARAMS.hasOwnProperty(host)) {
            apiParams = MARKET2APIPARAMS[host];
            for (const [key, value] of Object.entries(apiParams)) {
                url.searchParams.set(key, value);
            }
            return url.href;
        } else {
            console.log(host + " is a top-level domain, or Market that we don't have data on.");
            await updateApiParams();
        }
    }
}

/**
 * Gets a list of ASINs in featured from our brands carousel
 * Returns an array of ASINs
 */
async function getCarouselProducts() {
    // console.log(`getCarouselProducts()`);
    var carousel_asins = []
    const items = document.evaluate(
        `.//div[@data-asin and ./ancestor::*[contains(@cel_widget_id, "MAIN-FEATURED_ASINS_LIST")]
        //span[contains(text(), "from our brands") or contains(text(), "Amazon Device")]]`, 
        document, null, XPathResult.ANY_TYPE, null);
    while (item = items.iterateNext()) {
        var asin = item.getAttribute('data-asin')
        carousel_asins.push(asin);
    };
    return carousel_asins

}

/**
 * Gets a list of Amazon-owned products
 * Returns an array of DOM elements
 */
async function getOurBrandsProducts() {
    // Construct the endpoint for the request
    const api_url = await getAPIEndpoint();
    var startingUrl = window.location;
    // get base URL so smile.amazon.com works.
    var getUrl = window.location;
    var baseUrl = getUrl.protocol + "//" + getUrl.host + "/" + getUrl.pathname.split('/')[1];
    let endpoint = new URL(api_url, baseUrl); 

    let currentPage = new URL(getUrl, baseUrl).searchParams.get("page") || 1
    console.log("current page", currentPage)
    let page = 1;
    let products = [];
    let metadata = null;

    if (api_url === null) {
        return products
    }

    // Assemble the headers
    let headers = `
    accept: text/html,*/*
    downlink: 3.8
    accept-language: en-US,en;q=0.9
    x-amazon-s-swrs-version: 64CA74525CCE3ACE0B0A7551DBB2B458,D41D8CD98F00B204E9800998ECF8427E
    x-amazon-s-fallback-url: ${window.location.href}
    rtt: 100
    ect: 4g
    x-requested-with: XMLHttpRequest
    authority: www.amazon.com
    content-type: application/json
    `;

    // Call the API endpoint repeatedly while increasing page number until there are no more products.
    do {
        // Set the page number of results we want.
        console.log(`page ${page}`)
        endpoint.searchParams.set("page", page);
        console.log(`requesting ${endpoint.href}`);
        const start = Date.now();
        let response = await get(endpoint.href, headers);
        const elapsed = Date.now() - start;
        console.log(`query took ${(elapsed/1000).toFixed(2)} seconds and returned ${response.length} bytes`)

        // The XHR request returns a list of JSON objects, so let's separate them out into a list.
        const objects = parseAPIResponse(response);
        console.log(response);
        // add all of the product objects to the growing product list.
        getProducts(objects).forEach( p => products.push(p) );
        console.log(`products.length ${products.length}`)

        // Get the metadata object from the API response
        metadata = getMetadata(objects);
        console.log(`metadata`, metadata);

        // If we don't have certain keys, we can't decide if we're done looping, so that's bad.
        if(!("totalResultCount" in metadata) || !("asinOnPageCount" in metadata)) {
            throw "couldn't find totalResultCount or asinOnPageCount in metadata"
        }

        page++;

    } while(metadata.totalResultCount > products.length && metadata.asinOnPageCount > 0 && page <= MAX_API_PAGES + (currentPage - 1));
    // remove the filters
    get(startingUrl, headers);
    return products;
}


/**
 * Turn the response from the XHR request into an array of objects.
 * @param {string} text The raw text from the XHR request
 */
function parseAPIResponse(text) {
    const objects = [];
    text.split("&&&").forEach(json => {
        if((typeof json) !== "string") return;
        if(json.trim() == "") return;

        try {
            const obj = JSON.parse(json);
            objects.push(obj);
        } catch(e) {
            if (e instanceof SyntaxError) {
                console.log("error parsing a response object:", json)
            } else {
                console.log("unknown error while parsing JSON", e);
            }
        }
    });
    return objects;
}


/**
 * Gets the metadata object from the parsed XHR response.
 * @param {array} objects An array of objects returned from the parsed XHR response
 */
function getMetadata(objects) {
    for (const obj of objects){
        if(obj.length > 1 
            && obj[0] == "dispatch" 
            && obj[1].match(/^data-search-metadata/) 
            && "metadata" in obj[2])
                return obj[2].metadata;
    }
    return null;
}


/**
 * Gets all of the product objects from the parsed XHR request
 * @param {array} objects An array of objects returned from the response XHR response
 */
function getProducts(objects) {
    let search_results = [];
    let parser = new DOMParser();
    for (const obj of objects){
        if(obj.length > 1
            && obj[0] == "dispatch" 
            && obj[1].match(/^data-main-slot:search-result/) 
            && "asin" in obj[2] ) {
                const ele = parser.parseFromString(obj[2].html, "text/html").firstChild;

                search_results.push(ele);
        }
    }
    return search_results;
}


/**
 * https://stackoverflow.com/questions/12830649/check-if-chrome-extension-installed-in-unpacked-mode
 * @returns Ask the back end if we're in development mode or not. 
 */
 async function isDev() {
    return new Promise(function (resolve, reject) {
        //resolve(!('update_url' in chrome.runtime.getManifest())); // Alternative way to check
        chrome.runtime.sendMessage("isDev", resolve);
    });
}