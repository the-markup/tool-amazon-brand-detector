console.log("popup.js", window.location.href);


/**
 * This kicks things off in popup.js
 * Query for the active tab in the browser and then decide what to do.
 */
function initialize() {
    console.log("initialize()");

    // This is needed to open links from popup.html
    window.onclick = function(e) {
        if(e.target.href && e.target.href.startsWith("http")) 
            chrome.tabs.create({url: e.target.href});
    }

    chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {

        if(tabs[0].url.match(/amazon.(com|co.uk|co.jp|de|ca|com.mx|it|in|com.au|fr|es)\/s/)) {
            console.log("Seach page")
            document.body.className = 'enabled';
            // Here's where we send the "get_content" message that is received by content.js
            chrome.tabs.sendMessage(tabs[0].id, "get_content", onContent);
        } else {
            console.log("not search page")
            document.body.className = 'disabled';
            document.body.innerHTML = 'Not an Amazon search page';
        }
    });
}

function truncate(str, len) {
    return (str.length <= len) ? str : str.slice(0, len) + '...'
}

function log_storage() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, "log_storage");
    });
    //chrome.storage.sync.get(null, (obj) => console.log(obj));
}

function clear_storage() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, "clear_storage");
    });
    //chrome.storage.sync.clear();
}

/**
 * Render the content
 * @param {object} content 
 * If content contains an "error" key, use the value to render an error message.
 * Otherwise, there should be 2 keys:
 * num_on_page: the total number of products on the current page
 * products: an array of "Our Brand" objects with "asin", "title", and "link" properties
 */
function onContent(content) {
    console.log("onContent", content);
   
    const data = {};
    try {
        data.error = content.error;
        data.num_on_page = content.num_on_page;
        data.num_products = content.products.length;
        data.products = content.products.map(p => {
            return {
                "title": truncate(p.title, 50),
                "link": p.link,
                "method": p.detection_method,
                "src": p.image_src
            }
        });
    } catch(e) {
        data.error = "Error parsing content. "+ e.message;
    }

    document.body.innerHTML = Handlebars.templates.popup(data);
};


document.addEventListener('DOMContentLoaded', initialize);