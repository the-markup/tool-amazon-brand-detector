
// Endpoint to send the response from the "our-brands" endpoint for Markup research
const MRKP_ENDPOINT = "http://localhost:1773";


/**
 * Gets a list of Amazon-owned products
 * Returns an array of objects like  {"asin": "", "title": "", "link": ""}
 */
async function getOurBrandsProducts(ob_link) {
    console.log(`getOurBrandsProducts(${ob_link})`);

    let page = 1;
    let products = [];
    let totalResultCount = 0;
    let asinOnPageCount = 0;

    // Call the API endpoint repeatedly while increasing page number until there are no more products.
    do {
        // Construct the endpoint for the request
        const api_url = ob_link.replace("https://www.amazon.com/s?", "https://www.amazon.com/s/query?dc&");
        const endpoint = new URL(api_url); 
        endpoint.searchParams.set("page", page);

        // Assemble the headers
        let headers = `
        accept: text/html,*/*
        x-amazon-s-mismatch-behavior: FALLBACK
        downlink: 3.8
        accept-language: en-US,en;q=0.9
        x-amazon-s-swrs-version: 64CA74525CCE3ACE0B0A7551DBB2B458,D41D8CD98F00B204E9800998ECF8427E
        x-amazon-s-fallback-url: ${ob_link}
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

        // TODO: Uncomment me to submit data to MRKP_ENDPOINT!
        await submitData({"data": response, "query": window.location.href}); 

        // The XHR request returns a list of JSON objects, so let's separate them out into a list.
        const objects = parse(response);

        products = products.concat(getProducts(objects))
        console.log(`products.length ${products.length}`)

        const metadata = getMetadata(objects);
        console.log(`metadata`, metadata);

        if(!("totalResultCount" in metadata) || !("asinOnPageCount" in metadata)) {
            throw "couldn't find totalResultCount or asinOnPageCount in metadata"
        }

        totalResultCount = metadata.totalResultCount;
        asinOnPageCount = metadata.asinOnPageCount;
        page++;

    } while(totalResultCount > products.length && asinOnPageCount>0);

    console.log(`products.length = ${products.length}`)
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
        if(json.trim()=="") return;

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
 * 
 */
async function submitData(data) {
    try {
        await post(MRKP_ENDPOINT, data);
        console.log(`posted data to ${MRKP_ENDPOINT}`)
    } catch(e) {
        console.log(e);
    }
}

  
if (typeof window === 'undefined') {
    module.exports = { getOurBrands };
}