// Endpoint to send the response from the "our-brands" endpoint for Markup research
// This happens in submtiData()

const MAX_API_PAGES = 5;
const TITLE_PATTERNS = [];
const SUBTITLE_MATCHES = [];
const KNOWN_ASINS = [];

// We want to immediately load content when the content script loads
// Keep the promise returned from loadContent
// This can either be chained to a then() when popup.js requests the content
// Or it can be set to another promise when background tells the script
// that the URL has changed. 
let promises = { };
promises[window.location.href] = loadContent()

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
    console.log("onMessage request", request);

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

        await submitToMarkup(overlap);

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
 * 
 */
var inited = false;
async function init() {
    if(inited) return;

    const asins = await loadYAML("asins.yaml");
    Array.prototype.push.apply(KNOWN_ASINS, Object.keys(asins));
    //console.log("KNOWN_ASINS", KNOWN_ASINS);

    const subtitles = await loadYAML("subtitles.yaml");
    Array.prototype.push.apply(SUBTITLE_MATCHES, subtitles);
    //console.log("SUBTITLE_MATCHES", SUBTITLE_MATCHES);

    const titles = await loadYAML("titles.yaml");
    titles.forEach(t => TITLE_PATTERNS.push(new RegExp(t, "i")) )
    //console.log("TITLE_PATTERNS", TITLE_PATTERNS);

    inited = true;
    return;
}
 

 /**
  * 
  * @param {*} filename 
  * @returns 
  */
async function loadYAML(filename) {
    const url = chrome.runtime.getURL(filename);
    const str = await get(url);
    return jsyaml.load(str);
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
 * 
 */
function stain(asin) {
    document.querySelectorAll(`div[data-asin='${asin}']`).forEach( p => {
        p.style.cssText += 'border:1px dashed #fc345c; background-color:#ff990095;';
    });
}


/**
 * Returns true if ele is an "Our Brand" product, which is determined using a few tests.
 * NOTE: This is where you can add more checks. 
 * It should be trivial to make this async and throw an "await" in front of the call above.
 */
function isAmazonBrand(ele, api_results, carousel_asins) {

    if(isInAPIResults(ele, api_results))
        return "api";

    const title = getTitle(ele);
    for(const pattern of TITLE_PATTERNS) {
        if(title.match(pattern)) 
            return "title pattern match";
    }

    const subtitle = getSubtitle(ele);
    for(const str of SUBTITLE_MATCHES) {
        if(subtitle == str)
            return "subtitle pattern match";
    }

    if(ele.textContent.match(/Featured from our brands/))
        return "featured our brands";

    if( KNOWN_ASINS.includes(getASIN(ele)))
        return "known ASIN";
        
    console.log(carousel_asins);
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
    //let header = ele.querySelector("h2, span[class~='a-truncate-full']");
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
async function queryWaitFor(q, timeout=2000) {
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
    try {
        const ele = await queryWaitFor('[aria-label="Our Brands"] a');
        console.log(`Using Our Brands link to construct api endpoint`);
        return ele.getAttribute("href").replace("/s?", "/s/query?dc&");
    } catch(e) {
        console.log(`Didn't find Our Brands link. Using fallback method.`);
        var url = new URL(window.location.href.replace("/s?", "/s/query?")); 
        url.searchParams.set("ref", "sr_nr_p_n_feature_forty-seven_browse-bin_1");
        url.searchParams.set("rh", "p_n_feature_forty-seven_browse-bin:21180942011");
        //url.searchParams.set("dc", "");
        return url.href;
    }
}

/**
 * Gets a list of ASINs in featured from our brands carousel
 * Returns an array of ASINs
 */
async function getCarouselProducts() {
    console.log(`getCarouselProducts()`);
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
    console.log(`getOurBrandsProducts()`);

    // Construct the endpoint for the request
    const api_url = await getAPIEndpoint();

    let endpoint = new URL(api_url, "https://www.amazon.com"); 
    let page = 1;
    let products = [];
    let metadata = null;

    // Call the API endpoint repeatedly while increasing page number until there are no more products.
    do {
        // Set the page number of results we want.
        console.log(`page ${page}`)
        endpoint.searchParams.set("page", page);

        // Assemble the headers
        let headers = `
        accept: text/html,*/*
        x-amazon-s-mismatch-behavior: FALLBACK
        downlink: 3.8
        accept-language: en-US,en;q=0.9
        x-amazon-s-swrs-version: 64CA74525CCE3ACE0B0A7551DBB2B458,D41D8CD98F00B204E9800998ECF8427E
        x-amazon-s-fallback-url: ${window.location.href}
        rtt: 150
        x-amazon-rush-fingerprints: 
        ect: 4g
        x-requested-with: XMLHttpRequest
        authority: www.amazon.com
        content-type: application/json`;

        console.log(`requesting ${endpoint.href}`);
        const start = Date.now();
        let response = await get(endpoint.href, headers);
        const elapsed = Date.now() - start;
        console.log(`query took ${(elapsed/1000).toFixed(2)} seconds and returned ${response.length} bytes`)

        // The XHR request returns a list of JSON objects, so let's separate them out into a list.
        const objects = parseAPIResponse(response);

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

    } while(metadata.totalResultCount > products.length && metadata.asinOnPageCount > 0 && page < MAX_API_PAGES);

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

/**
 * Post some stuff to MRKP_ENDPOINT.  
 * If it fails, don't freak out. Just console.out the error and move on. 
 */
async function submitToMarkup(products) {
    try {
        const devMode = await isDev();
        const endpoint = (devMode)
            ? "https://asin-collector.editorial-sandbox.themarkup.org/upload"
            : "https://asin-collector.editorial.themarkup.org/upload";
    
        // Filter out any products that we've seen before (that are in the "seen_asins" array)
        const store = await storage.load({"seen_asins": []});
        const data = products.filter(p => !store.seen_asins.includes(p.asin));

        if(data.length > 0) {
            console.log(`posting data to ${endpoint}`, data)
            await post(endpoint, JSON.stringify(data));
            
            // Add the new ASINS to the seen_asins list and save it back to storage.
            for(const p of data) {
                store.seen_asins.push( p.asin )
            }
            //console.log("store", store);
            await storage.save(store);

        } else {
            console.log("No new products to post to the Markup")
        }
    } catch(e) {
        console.log("error in submitToMarkup", e, response);
    }
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
