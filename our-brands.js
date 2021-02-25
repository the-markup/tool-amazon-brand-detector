
// Endpoint to send the response from the "our-brands" endpoint for Markup research
const ENDPOINT = "http://localhost:1773";

/**
 * Gets a list of ASINs of Amazon-owned products
 */
async function getOurBrands(page_url) {
    return new Promise(function (resolve, reject) {
      
        const url = new URL(page_url); 
        const query = encodeURIComponent(url.searchParams.get("k"));
        const page = url.searchParams.get("page") || 1;
        const qid = url.searchParams.get("qid");

        const endpoint = `https://www.amazon.com/s/query?dc&k=${query}&page=${page}&qid=${qid}&ref=sr_nr_p_n_feature_forty-seven_browse-bin_1&rh=p_n_feature_forty-seven_browse-bin%3A21180942011&rnid=21180941011`;
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
        content-type: application/json
        `;


        let xhr = new XMLHttpRequest();
        xhr.open("GET", endpoint);
        headers.split("\n").forEach(line => {
            if(!line.trim()) return;
            let parts = line.split(":");
            let name = parts[0].trim();
            let value = parts[1].trim();
            xhr.setRequestHeader(name, value);
        });

        xhr.onreadystatechange = function() {
            if (xhr.readyState == XMLHttpRequest.DONE) { 
                var status = xhr.status;
                if (status === 0 || (status >= 200 && status < 400)) {
                    const asins = getASINs(xhr.responseText);
                    submitResponse(xhr.responseText);
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
function getASINs(response) {
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
 * Submit the text from Amazon to an arbitrary endpoint.
 * @param {*} text 
 */
function submitResponse(text) {
    return new Promise(function (resolve, reject) {
      var data = new FormData();
      data.append('data', text);
    
      var xhr = new XMLHttpRequest();
      xhr.open('POST', ENDPOINT, true);
      xhr.onload = function () {
        console.log(this.responseText);
        if (xhr.status == 200) { 
          resolve(xhr.status);
        } else { 
          reject(xhr.status);
        }
      };
      xhr.send(data);
    });
}
  
  