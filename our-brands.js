
// Endpoint to send the response from the "our-brands" endpoint for Markup research
const MRKP_ENDPOINT = "http://localhost:1773";


/**
 * Gets a list of Amazon-owned products
 * Returns an array of objects like  {"asin": "", "title": "", "link": ""}
 */
async function getOurBrandsProducts(api_url) {
    console.log(`getOurBrandsProducts(${api_url})`);

    // Construct the endpoint for the request
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

        // This is where the data is posted to the MRKP_ENDPOINT
        //await submitData({"data": response, "query": window.location.href}); 

        // The XHR request returns a list of JSON objects, so let's separate them out into a list.
        const objects = parse(response);

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

    } while(metadata.totalResultCount > products.length && metadata.asinOnPageCount > 0 && page < 5);

    return products;
}



/**
 * Turn the response from the XHR request into an array of objects.
 * @param {string} text The raw text from the XHR request
 */
function parse(text) {
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
                const ele = parser.parseFromString(obj[2].html, "text/xml");
                search_results.push({
                    "asin": obj[2].asin, 
                    "title": getTitle(ele),
                    "link": getLink(ele)
                });
        }
    }
    return search_results;
}


/**
 * Post some stuff to MRKP_ENDPOINT.  
 * If it fails, don't freak out. Just console.out the error and move on. 
 */
async function submitData(data) {
    try {
        await post(MRKP_ENDPOINT, data);
        console.log(`posted data to ${MRKP_ENDPOINT}`)
    } catch(e) {
        console.log(e);
    }
}


// If this isn't loaded in a browser, export some stuff.
if (typeof window === 'undefined') {
    module.exports = { getOurBrands };
}