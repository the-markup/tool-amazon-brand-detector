console.log("popup.js", window.location.href);

// This is needed to open links from popup.html
window.onclick = function(e) {
    if (e.target.href && e.target.href.startsWith("http"))
        chrome.tabs.create({ url: e.target.href });
}
document.getElementById('clear-storage-link').onclick = function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, "clear_storage");
    });
}
document.getElementById('log-storage-link').onclick = function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, "log_storage");
    });
}

// status for ON-OFF toggle.
var enabled = true;
// Check Button status (once)
chrome.storage.sync.get('toggleisExtensionActive', data => {
    enabled = data.toggleisExtensionActive;
    if (enabled === undefined) {
        enabled = true;
    }
    console.log("Logged status", enabled)
    // What is the status?
    document.getElementById('togBtn').checked = enabled;
});

/**
 * This kicks things off in popup.js
 * Query for the active tab in the browser and then decide what to do.
 */
function fetchContent() {
    console.log("fetchContent()");
    chrome.tabs.query({ active: true, currentWindow: true }, async function(tabs) {

        if (tabs[0].url.match(/amazon.(com|co.uk|co.jp|de|ca|com.mx|it|in|com.au|fr|es)\/s/)) {
            // This is State 2
            console.log("Seach page")
            document.body.className = 'enabled loading';
            document.getElementById('theContent').innerHTML = '<img src="assets/ajax-loader.gif" />';

            // Here's where we send the "get_content" message that is received by content.js
            chrome.tabs.sendMessage(tabs[0].id, "get_content", onContent);
        } else {
            // This is State 1
            console.log("not search page")
            document.body.className = 'disabled';
            document.getElementById('theContent').innerHTML = `
            This is not an Amazon search page. Brand Buster only works for Amazon pages.
            `;
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
    if (chrome.runtime.lastError &&
        chrome.runtime.lastError.message.includes("Receiving end does not exist")) {
        setTimeout(fetchContent, 500);
        return;
    }

    var html = '';
    var select = '';
    try {
        if (chrome.runtime.lastError)
            throw new Error("Chrome Runtime Error: " + chrome.runtime.lastError.message);

        if (content.error)
            throw new Error("Extension Error: " + content.error)
        // This is "State 3"
        html += `Found Amazon brands and exclusive products on the page.`;
        document.body.className = 'enabled loaded';
    } catch (e) {
        // Not enabled.
        if (e.message == "Extension Error: problem getting content. Not enabled.") {
            html += "<p>Extension not enabled.</p>"
        } else {
            // This is State 4
            html += `<h3>error rendering content</h3>`;
            html += `<p>${e.message}</p>`
        }
    }
    document.getElementById('theContent').innerHTML = html;
};


document.addEventListener('DOMContentLoaded', function() {
    // Collect data
    fetchContent();

    // Check the extension slider (persistent)
    document.getElementById('togBtn').onclick = function() {
        enabled = !enabled;
        // document.getElementById('togBtn').checked = enabled;
        console.log("Toggled to", enabled);
        var isChecked = this.checked;
        console.log(isChecked);
        chrome.storage.sync.set({'toggleisExtensionActive': enabled},function() {});
    };

    // check accordions (persistent)
    document.querySelectorAll(".accordion").forEach((element) =>
        element.onclick = function() {
            console.log("click");
            if (this.nextElementSibling.style.maxHeight) {
                hidePanels();
            } else {
                showPanel(this);
            } 
        }  
    );
});


/**
 * Function to show a specific panel
 * @param {*} elem 
 */
function showPanel(elem) {
    hidePanels();
    elem.classList.add("active");
    elem.nextElementSibling.style.maxHeight = elem.nextElementSibling.scrollHeight + "px";
}
/**
 * Function to Hide all shown Panels
 */
function hidePanels() {
    let accPanel = document.querySelectorAll(".accordion-panel");
    let accHeading = document.querySelectorAll(".accordion");
    for (let i = 0; i < accPanel.length; i++) {
        accPanel[i].style.maxHeight = null;
        accHeading[i].classList.remove("active");
    }
}