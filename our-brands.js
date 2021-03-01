
// Endpoint to send the response from the "our-brands" endpoint for Markup research
const MRKP_ENDPOINT = "http://localhost:1773";


/**
 * Gets a list of ASINs of Amazon-owned products
 */
async function getOurBrands(page_url) {

    // Parse URL and get the important bits.
    const url = new URL(page_url); 
    const query = encodeURIComponent(url.searchParams.get("k"));
    //let page = url.searchParams.get("page") || 1;
    const qid = url.searchParams.get("qid");
 
    let page = 1;
    let asins = [];
    let totalResultCount = 0;
    let asinOnPageCount = 0;
    do {
        // Construct the endpoint for the request
        const endpoint = `https://www.amazon.com/s/query?dc&k=${query}&page=${page}&qid=${qid}&ref=sr_nr_p_n_feature_forty-seven_browse-bin_1&rh=p_n_feature_forty-seven_browse-bin%3A21180942011&rnid=21180941011`;
        
        // Assemble the headers
        let headers = `
        accept: text/html,*/*
        x-amazon-s-mismatch-behavior: FALLBACK
        downlink: 3.8
        accept-language: en-US,en;q=0.9
        x-amazon-s-swrs-version: 64CA74525CCE3ACE0B0A7551DBB2B458,D41D8CD98F00B204E9800998ECF8427E
        x-amazon-s-fallback-url: https://www.amazon.com/s?k=${query}&rh=p_n_feature_forty-seven_browse-bin%3A21180942011&dc&qid=${qid}&rnid=21180941011&ref=sr_nr_p_n_feature_forty-seven_browse-bin_1
        rtt: 150
        x-amazon-rush-fingerprints: 
        ect: 4g
        x-requested-with: XMLHttpRequest
        authority: www.amazon.com
        content-type: application/json`;

        console.log(`requesting ${endpoint}`);
        let response = await get(endpoint, headers);
        console.log(`response ${response.length}`);
        await submitResponse(response);

        let objects = parse(response);
        console.log(`found ${objects.length} objects in response`);
        console.log(objects);

        asins = asins.concat(getASINs(objects))
        console.log(`asins.length = ${asins.length}`)

        const metadata = getMetadata(objects);
        console.log(`metadata`, metadata);

        if(!("totalResultCount" in metadata) || !("asinOnPageCount" in metadata)) {
            throw "couldn't find totalResultCount or asinOnPageCount in metadata"
        }
        totalResultCount = metadata.totalResultCount;
        asinOnPageCount = metadata.asinOnPageCount;
        page++;

    } while(totalResultCount > asins.length);

    return asins;
}



/**
 * Turn the response from the XHR request into an array of objects.
 * @param {string} text The raw text from the XHR request
 */
function parse(text) {
    const objects = [];
    text.split("&&&").forEach(json => {
        if((typeof json) !== "string") return;
        try {
            const obj = JSON.parse(json);
            objects.push(obj);
        } catch(e) {
            if (e instanceof SyntaxError) {
                console.log("error parsing a response object:", json)
            } else {
                console.log("unknown error in getASINS", e);
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
function getASINs(objects) {
    let search_results = [];
    objects.forEach(obj => {
        if(obj.length > 1
            && obj[0] == "dispatch" 
            && obj[1].match(/^data-main-slot:search-result/) 
            && "asin" in obj[2] ) {
                search_results.push(obj[2].asin);
        }
    });
    return search_results;
}


/**
 * 
 */
async function submitResponse(data) {
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