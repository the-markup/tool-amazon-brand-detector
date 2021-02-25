console.log("content.js", window.location.href)




/**
 * Called when a message is received through the chrome runtime
 * Popup.js will send a "get_content" request and that will kick off the whold process
 * Learned the hard way: this can't be an async function.
 * 
 * @param {*} request 
 * @param {*} sender 
 * @param {*} sendResponse 
 */
function onMessage(request, sender, sendResponse) {
  console.log(request);

  if(request === "get_content") {
    getContent().then(sendResponse)
  }

  // return true is very important. it tells the comm channel to stay open.
  // https://stackoverflow.com/questions/20077487/chrome-extension-message-passing-response-not-sent
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
    const our_brands = await getOurBrands();  // list of ASINs
    const all_products = getProductsOnPage(); // objects like  {"asin": "", "title": "", "link": ""}
    const ob_products = [];                   // overlap

    all_products.forEach(async function(p) {
      if(our_brands.includes(p.asin)) {
        ob_products.push(p);
      }
    });

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
 * Gets a list of ASINs of Amazon-owned products
 */

async function getOurBrands() {
  return new Promise(function (resolve, reject) {
    
    const url = new URL(window.location.href); 
    const query = encodeURIComponent(url.searchParams.get("k"));
    const page = url.searchParams.get("page") || 1;
    const qid = url.searchParams.get("qid");

    const endpoint = `https://www.amazon.com/s/query?dc&k=${query}&page=${page}&qid=${qid}&ref=sr_nr_p_n_feature_forty-seven_browse-bin_1&rh=p_n_feature_forty-seven_browse-bin%3A21180942011&rnid=21180941011`;
    let headers = `
    accept: text/html,*/*
    x-amazon-s-mismatch-behavior: FALLBACK
    downlink: 3.8
    accept-language: en-US,en;q=0.9`;
  // x-amazon-s-swrs-version: 64CA74525CCE3ACE0B0A7551DBB2B458,D41D8CD98F00B204E9800998ECF8427E
  // x-amazon-s-fallback-url: https://www.amazon.com/s?k=${query}&rh=p_n_feature_forty-seven_browse-bin%3A21180942011&dc&qid=${qid}&rnid=21180941011&ref=sr_nr_p_n_feature_forty-seven_browse-bin_1
  // rtt: 150
  // x-amazon-rush-fingerprints: 
  // ect: 4g
  // x-requested-with: XMLHttpRequest
  // authority: www.amazon.com
  // content-type: application/json

    let xhr = new XMLHttpRequest();
    xhr.open("GET", endpoint);
    headers.split("\n").forEach(line => {
      if(!line.trim()) return;
      let parts = line.split(":");
      let name = parts[0].trim();
      let value = parts[1].trim();
      xhr.setRequestHeader(name, value);
    })

    xhr.onreadystatechange = function() {
      if (xhr.readyState == XMLHttpRequest.DONE) { 
        var status = xhr.status;
        if (status === 0 || (status >= 200 && status < 400)) {
          const asins = getASINS(xhr.responseText);
          resolve(asins);
        } else {
          reject(status);
        }
      }
    };

    xhr.send();
  });
}


/**
 * 
 * @param {string} response The full response text from the "Our Brands" JSON response
 */
function getASINS(response) {
  let asins = [];
 response.split("&&&").forEach(json => {
    try {
      const obj = JSON.parse(json);
      if(obj.length > 1
        && obj[0] == "dispatch" 
        && obj[1].match(/^data-main-slot:search-result/) 
        && obj[2].hasOwnProperty("asin") ) {
          asins.push(obj[2].asin);
      }
    } catch(e) {
      if (e instanceof SyntaxError) {
       console.log("error parsing a response object:", json)
      } else {
        console.log("unknown error in getASINS", e);
      }
    }
  });
  return asins;
}


/**
 * 
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
  })
  console.log(products);
  return products;
}



/**
 * 
 * @param {*} ele 
 */
function getLink(ele) {
  const root = new URL(window.location.href).origin; 
  let link = ele.querySelector("a");
  if(link)
    link = link.getAttribute("href");
  else 
    link = window.location.href;
  if(!link.match(/^http/)) 
    link = new URL(link, root).href;
  return link;
}



/**
 * 
 * @param {*} ele 
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






/*
xhr.onload = function() {
  if (xhr.status != 200) { // analyze HTTP status of the response
    console.log(`Error ${xhr.status}: ${xhr.statusText}`); // e.g. 404: Not Found
  } else { // show the result
    console.log(`Done, got ${xhr.response.length} bytes`); // response is the server response
  }
};

xhr.onprogress = function(event) {
  if (event.lengthComputable) {
    console.log(`Received ${event.loaded} of ${event.total} bytes`);
  } else {
    console.log(`Received ${event.loaded} bytes`); // no Content-Length
  }
};

xhr.onerror = function() {
  console.log("Request failed");
  reject()
};
*/