
console.log("content.js", window.location.href)


// cache results... but we need to bust the cache if the url changes...
// because content.js doesn't seem to reload???
let products = null; 


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log(request);

  const page_url = window.location.href;
  if(request == "get_content") {
    const all_products = getProductsOnPage(page_url);
    getOurBrands(page_url).then(our_brands => {
      products = all_products.filter( p => {
          return our_brands.includes(p.asin);
      });
      console.log("returning", products)
      sendResponse({"products": products, "total_products": all_products.length, "our_brands": our_brands.length});
    });
  }

  // return true is very important. it tells the comm channel to stay open.
  // https://stackoverflow.com/questions/20077487/chrome-extension-message-passing-response-not-sent
  return true;
});




/**
 * 
 * @param {string} page_url 
 */
async function getOurBrands(page_url) {
  return new Promise(function (resolve, reject) {
    
    const parsed_url = new URL(page_url); 
    const query = encodeURIComponent(parsed_url.searchParams.get("k"));
    const page = parsed_url.searchParams.get("page") || 1;
    const qid = parsed_url.searchParams.get("qid");

    const asinreq = `https://www.amazon.com/s/query?dc&k=${query}&page=${page}&qid=${qid}&ref=sr_nr_p_n_feature_forty-seven_browse-bin_1&rh=p_n_feature_forty-seven_browse-bin%3A21180942011&rnid=21180941011`;
    let headers = `
    authority: www.amazon.com
    x-amazon-s-swrs-version: 64CA74525CCE3ACE0B0A7551DBB2B458,D41D8CD98F00B204E9800998ECF8427E
    x-amazon-s-fallback-url: https://www.amazon.com/s?k=${query}&rh=p_n_feature_forty-seven_browse-bin%3A21180942011&dc&qid=${qid}&rnid=21180941011&ref=sr_nr_p_n_feature_forty-seven_browse-bin_1
    rtt: 150
    x-amazon-rush-fingerprints: 
    content-type: application/json
    accept: text/html,*/*
    x-amazon-s-mismatch-behavior: FALLBACK
    x-requested-with: XMLHttpRequest
    downlink: 3.8
    ect: 4g
    accept-language: en-US,en;q=0.9`;

    let xhr = new XMLHttpRequest();
    xhr.open("GET", asinreq);
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
 * 
 * 
 */
function getProductsOnPage(page_url) {
  const root = new URL(page_url).origin; 
  console.log("ROOT", root);

  const products = [];
  let elements = document.querySelectorAll("div[data-asin]");
  elements.forEach(ele => {
    const asin = ele.getAttribute("data-asin");
    if(!asin) return;

    const title = ele.querySelector("h2, span[class~='a-truncate-full']").textContent;
    let link = ele.querySelector("a").getAttribute("href");
    if(!link.match(/^http/)) link = new URL(link, root).href;

    products.push({"asin": asin, "title": title.trim(), "link": link});
  })

  return products;
}





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