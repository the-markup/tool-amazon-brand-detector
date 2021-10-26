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

    document.getElementById('clear-storage-link').onclick = function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, "clear_storage");
        });
        //chrome.storage.sync.clear();
    }

    document.getElementById('log-storage-link').onclick = function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, "log_storage");
        });
        //chrome.storage.sync.get(null, (obj) => console.log(obj));
    }

    chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {

        if(tabs[0].url.match(/amazon.(com|co.uk|co.jp|de|ca|com.mx|it|in)\/s/)) {
            console.log("Seach page")
            document.body.className = 'enabled';
            document.getElementById('theContent').innerHTML = '<img src="assets/ajax-loader.gif" />';
    
            // Here's where we send the "get_content" message that is received by content.js
            chrome.tabs.sendMessage(tabs[0].id, "get_content", onContent);
        } else {
            console.log("not search page")
            document.body.className = 'disabled';
            document.getElementById('theContent').innerHTML = 'Not an Amazon search page';
        }
    });
}

function truncate(str, len) {
    return (str.length <= len) ? str : str.slice(0, len) + '...'
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
    var html;

    try {
        if(content.error) {
            html = '<h2>Error</h2>';
            html += content.error;
        } else if(content.products.length > 0) {
            html = '<h2>Amazon Brands</h2>';
            html += `<p>${content.num_on_page} products total. ${content.products.length} are Amazon.</p>`;
            html += `<ol>`;
            content.products.forEach(p => {
                html += '<li>';
                html += `<a href="${p.link}">${truncate(p.title, 50)}</a> (${p.detection_method})<br>`;
                html +=  `<img src="${p.image_src}" style="width:100px;"/>`
                html += '</li>';
            });
            html += '</ol>';


        } else {
            html += '<h2>There are no Amazon brands on this page</h2>';
        }

    } catch(e) {
        html = "error rendering content: " + e;
    }

    document.getElementById('theContent').innerHTML = html;
};


document.addEventListener('DOMContentLoaded', initialize);