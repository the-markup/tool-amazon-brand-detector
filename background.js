
const content = {}

chrome.runtime.onInstalled.addListener(() => {
    console.log(`onInstalled`);
});

console.log("background.js", window.location.href);



// Content.js doesn't automatically reload every time the URL changes, so 
// we need to tell it to re-parse the page.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    //console.log(`tab ${tabId} updated`, changeInfo)
    if (changeInfo.url) {
        const message =  {"type": "urlchange", "url": changeInfo.url};
        console.log(`sending message to tab ${tabId}`, message);
        chrome.tabs.sendMessage(tabId, message);
    }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log(request);
    if(!request.type) return false;

    if(request.type=="our_brands" || request.type=="all_products") {
        if(!content[request.url]) 
            content[request.url] = {};
        content[request.url][request.type] = request.info;
    }

    if(request.type=="popup") {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            var url = tabs[0].url;
            var c = content[url];
            var products = c.all_products.filter( p => {
                return c.our_brands.includes(p.asin);
            });
            sendResponse(products);
            console.log("sent response to popup", content[url]);
        });
    }

    // return true is very important. it tells the comm channel to stay open.
    // https://stackoverflow.com/questions/20077487/chrome-extension-message-passing-response-not-sent
    return true; 
});




// Fired when a browser action icon is clicked. Does not fire if the browser action has a popup.
// chrome.browserAction.onClicked.addListener(function(tab) {
//     console.log("browserAction.onClicked", tab);
// });
