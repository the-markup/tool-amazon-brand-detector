// We want to immediately load content when the content script loads
// Keep the promise returned from loadContent
// This can either be chained to a then() when popup.js requests the content
// Or it can be set to another promise when background tells the script
// that the URL has changed. 
let contentPromise = loadContent();



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

    // reassign the promise 
    if(request == "url_changed") {
        if(contentPromise) contentPromise.reject();
        contentPromise = loadContent();
    }

    // If the content is already loaded, this will be resolved and return immediately
    // If it's still working, it will finish and then rend the content back to popup.js
    if(request === "get_content") {
        contentPromise.then(sendResponse)
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
async function loadContent() {
    console.log(`loadContent(${window.location.href})`);
    try {
        // First find the "Our Brands" link on the page
        const ob_link = document.querySelector('[aria-label="Our Brands"] a')
        if(!ob_link) {
            console.log("WARNING: Our Brands link not found.  Returning nothing.")
            return {"products": []};
        }

        const href = ob_link.getAttribute("href");
        const amazon_products = await getOurBrandsProducts(href);    // objects like  {"asin": "", "title": "", "link": ""}
        const page_products = getProductsOnPage();                  // objects like  {"asin": "", "title": "", "link": ""}
        const ob_products = [];                                     // overlap products

        console.log('amazon_products', amazon_products);
        console.log('page_products', page_products);

        // Which products have the honor of going into the ob_products array?
        for(const p of page_products) {
            if(first_ob_check(p, amazon_products) || await second_ob_check(p)) {
                ob_products.push(p);
                
                // TODO: sometimes this doesn't work.  WHY??
                document.querySelector(`[data-asin="${p.asin}"]`).style.cssText += 'border:1px dashed red;background-color:rgba(255,0,0,0.5)';
            }
        }
        
        const content = {
            "products": ob_products, 
            "num_on_page": page_products.length,
        };

        console.log("returning content", content)
        return content;

    } catch(e) {
        return {"error": `problem getting content. ${e.message}`};
    }
}


/**
 * Finds the overlap between the amazon_products and the page_products
 * @param {*} product 
 * @param {*} amazon_products 
 */
function first_ob_check(product, amazon_products) {
    for(const p of amazon_products) {
        if(product.asin == p.asin) return true;
    }
    return false;
}

/**
 * Arbitrary test for products that might be Amazon-brand.
 * I made it async just to set up the structure for a possible xhr request or something.
 * @param {*} product 
 */
async function second_ob_check(product) {
    return new Promise(function (resolve, reject) {
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
 * Returns an array of objects like  {"asin": "", "title": "", "link": ""}
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
