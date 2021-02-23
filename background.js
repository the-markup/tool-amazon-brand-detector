
const content = {}

chrome.runtime.onInstalled.addListener(() => {
    console.log(`onInstalled`);
});

console.log("background.js", window.location.href);

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    //console.log(`tab ${tabId} updated`, changeInfo)
    if (changeInfo.url) {
        const message =  {"type": "urlchange", "url": changeInfo.url};
        console.log(`sending message to tab ${tabId}`, message);
        chrome.tabs.sendMessage(tabId, message);
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(request);
    if(!request.type) return;

    if(request.type=="our_brands" || request.type=="all_products") {
        if(!content[request.url]) 
            content[request.url] = {};
        content[request.url][request.type] = request.info;
    }

    if(request.type=="popup") {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            var current_url = tabs[0].url
            if(content[current_url])
        });
    }
});




/*
setInterval(() => {
    var now = Date.now();
    chrome.runtime.sendMessage({"type": "heartbeat", "message": `background.js: ${now}`});

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        var activeTab = tabs[0];
        chrome.tabs.sendMessage(activeTab.id, {"type": "heartbeat", "message": `background.js to active tab: ${now}`});
    });
}, 1000);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(request);
});




var now = Date.now();
chrome.runtime.sendMessage({"message": "add_stuff", "stuff": `<p>From background.js: ${now}</p>`});


// Fires when icon is clicked.
chrome.browserAction.onClicked.addListener(function(tab) {
    console.log("browserAction.onClicked", tab);
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      var activeTab = tabs[0];
      chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_browser_action"});
    });
});

chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {greeting: "hello"}, function(response) {
        console.log(response.farewell);
    });
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("got a message", request)
    if( request.message === "this_url" ) {
        console.log("this_url", request.url);

    }
    if(request.message === 'get_products') {
        
    }
});
*/