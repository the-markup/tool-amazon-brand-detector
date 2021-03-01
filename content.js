console.log("content.js", window.location.href)



/**
 * Called when a message is received through the chrome runtime
 * Popup.js will send a "get_content" request and that will kick off the whold process
 * Learned the hard way: this can't be an async function.
 * It's very important to return true from this. 
 * https://stackoverflow.com/questions/20077487/chrome-extension-message-passing-response-not-sent
 * 
 * @param {*} request 
 * @param {*} sender 
 * @param {*} sendResponse 
 */
function onMessage(request, sender, sendResponse) {
    console.log("onMessage request", request);

    if(request === "get_content") {
        getContent().then(sendResponse)
    }

    return true;
}





/**
 * Gets all the data that popup.js needs to render the page.
 * 1. get the list of ASINS that are Amazon products
 * 2. get all of the products on the page
 * 3. see where the overlap is
 * 4. and send that back to popup.js
 */
async function getContent() {
    try {
        const our_brands = await getOurBrands(window.location.href);  // list of ASINs
        const all_products = getProductsOnPage(); // objects like  {"asin": "", "title": "", "link": ""}
        const ob_products = [];                   // overlap

        console.log('our_brands', our_brands);
        console.log('all_products', all_products);

        // Which products have the honor of going into the ob_products array?
        for(const p of all_products) {
            if(our_brands.includes(p.asin)) {
                ob_products.push(p);
                continue;
            }
            if(await second_ob_check(p)) {
                ob_products.push(p);
                continue;
            }
        }

        return {
            "products": ob_products, 
            "total_products": all_products.length, 
            "our_brands": our_brands.length
        };

    } catch(e) {
        return {"error": `problem getting content. ${e.message}`};
    }
}



/**
 * Arbitrary test for products that might be Amazon-brand.
 * I made it async just to set up the structure for a possible xhr request or something.
 * @param {*} product 
 */
async function second_ob_check(product) {
    return new Promise(function (resolve, reject) {
        //console.log(`doing some crazy check for (${product.asin}) ${product.title}`)
        
        if(product.title.match(/Echo/) 
            || product.title.match(/Kindle/)
            || product.title.match(/Fire.+tablet/i)) {
                resolve(true);
        }   
        else resolve(false);
    });
}




/**
 * Gets all of the products on the current page. 
 */
function getProductsOnPage() {
    const products = [];
    let elements = document.querySelectorAll("div[data-asin]");
    elements.forEach(ele => {
        const asin = ele.getAttribute("data-asin");
        if(!asin) return;
        
        products.push({
            "asin": asin, 
            "title": getTitle(ele), 
            "link": getLink(ele)
        });
    });

    //console.log('returning all_products', products);
    return products;
}



/**
 * Gets the product link from a single ASIN div.
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
 * Gets the product title from a single ASIN div.
 * @param {Element} ele 
 */
function getTitle(ele) {
    let header = ele.querySelector("h2, span[class~='a-truncate-full']");
    if(header) 
        return header.textContent.trim();
    let image = ele.querySelector("img");
    if(image) 
        return image.getAttribute("alt");
    return "Unknown";
}



chrome.runtime.onMessage.addListener(onMessage);
